import { BATTLE_ARMOR, MECH_TERRAIN } from "../config.mjs";
import { mechSuitDamage, personalSuitDamage } from "../rules/battle-armor.mjs";
import { physicalDamage } from "../rules/mech.mjs";
import { applyDefaultMode } from "../dice/test-roll.mjs";
import {
  canAct, damageGroups, dialog, getPilot, postDamageCard, rollPilotingTest, rollUnitOpposed, t, targetParts,
  unitParts, warn
} from "./unit.mjs";

/**
 * Battle armor in play (p. 217–220): damage at both scales, anti-'Mech attacks, riding OmniMechs.
 */

/* -------------------------------------------- */
/*  Who is where                                */
/* -------------------------------------------- */

/**
 * Suits of battle armor attached to a 'Mech: riding it (an OmniMech) or swarming it.
 * @param {Actor} mech
 * @param {"mounted"|"swarming"} mode
 * @returns {Actor[]}
 */
export function attachedSuits(mech, mode) {
  if ( !mech ) return [];
  const actors = new Set([...(game.actors ?? []), ...(globalThis.canvas?.tokens?.placeables ?? []).map(t => t.actor)]);
  return [...actors].filter(a => (a?.type === "battleArmor") && (a.system.attached.mode === mode)
    && (a.system.attached.target === mech.uuid) && !a.system.status.destroyed);
}

/**
 * The suit a person is wearing, if any.
 * @param {Actor} person
 * @returns {Actor|null}
 */
export function wornSuit(person) {
  if ( !person?.isPerson || !game.actors ) return null;
  return game.actors.find(a => (a.type === "battleArmor") && (a.system.pilot === person.uuid)
    && !a.system.status.destroyed && !a.system.suitDestroyed) ?? null;
}

/* -------------------------------------------- */
/*  Damage                                      */
/* -------------------------------------------- */

/**
 * Personal Combat damage to a suit (p. 217): it fills Armor segments; what is left once the suit
 * is destroyed reaches the wearer's Condition Monitor.
 * @param {Actor} suit
 * @param {{value: number, type?: string, fatigue?: boolean}} damage
 * @param {object} [options]
 * @param {string} [options.source]
 * @returns {Promise<object|null>}  The wearer's damage split, if any damage reached them.
 */
export async function applySuitPersonalDamage(suit, damage, { source } = {}) {
  const result = personalSuitDamage(suit.system.armor, damage.value);
  const lines = [t("MWD.BattleArmor.Damage.Segments", { n: result.segments })];
  await markSuit(suit, result, lines);
  await postDamageCard(suit, { damage: { source }, lines });
  if ( !result.overflow ) return null;
  const wearer = getPilot(suit);
  if ( !wearer ) return null;
  return wearer.applyPersonalDamage({ ...damage, value: result.overflow }, { source, throughSuit: true });
}

/**
 * A 'Mech-Scale hit on a suit (p. 219): no hit location and no critical hits; each point fills an
 * Armor pip. Damage beyond the Armor hits the Structure pip, which is the wearer: their Physical
 * Condition Monitor is filled in. A suit riding an OmniMech instead passes leftover damage back
 * to the 'Mech's torso.
 * @param {Actor} suit
 * @param {import("./unit.mjs").MechDamage} damage
 * @param {object} [options]
 * @param {boolean} [options.mounted=false]  The hit was meant for the carrying OmniMech's torso.
 * @returns {Promise<{message: ChatMessage, overflow: number}>}  Points left over for the carrier.
 */
export async function applyBattleArmorHit(suit, damage, { mounted = false } = {}) {
  const lines = [];
  const rolls = [];
  const groups = damage.heatInstead ? [] : await damageGroups(damage, lines, rolls, suit);
  if ( damage.heatInstead ) lines.push(t("MWD.BattleArmor.Damage.NoHeat"));
  const points = groups.reduce((a, b) => a + b, 0);
  const result = mechSuitDamage(suit.system.armor, points);
  lines.push(t("MWD.BattleArmor.Damage.Pips", { n: points }));
  await markSuit(suit, result, lines);

  let overflow = 0;
  const notes = new Set();
  if ( result.overflow && mounted ) {
    overflow = result.overflow;
    lines.push(t("MWD.BattleArmor.Damage.BackToCarrier", { n: overflow }));
  }
  else if ( result.overflow ) {
    await suit.update({ "system.structure.damage": 1, "system.status.destroyed": true });
    notes.add("MWD.BattleArmor.Damage.WearerKilled");
  }
  const message = await postDamageCard(suit, { damage, lines, rolls, notes });
  if ( result.overflow && !mounted ) await fillWearer(suit, damage.source);
  return { message, overflow };
}

/** Record filled segments and a destroyed suit. */
async function markSuit(suit, result, lines) {
  const update = { "system.armor.segments": suit.system.armor.segments + result.segments };
  if ( result.destroyed ) {
    update["system.attached.mode"] = "";
    update["system.attached.target"] = "";
    lines.push(t("MWD.BattleArmor.Damage.Destroyed"));
  }
  await suit.update(update);
}

/**
 * Structure damage to a suit (p. 219): the wearer's Physical Condition Monitor fills in. They are
 * Killed in Action unless the player uses an option from Character Death (p. 37).
 * @param {Actor} suit
 * @param {string} [source]
 */
async function fillWearer(suit, source) {
  const wearer = getPilot(suit);
  if ( !wearer ) return;
  const physical = wearer.system.condition.physical;
  await wearer.update({ "system.condition.physical.value": physical.track.capacity });
  await ChatMessage.create(applyDefaultMode({
    speaker: ChatMessage.getSpeaker({ actor: wearer }),
    content: `<div class="mwd-card failure"><header class="mwd-card-header"><h3>${wearer.name}</h3></header>`
      + `<p>${t("MWD.BattleArmor.Damage.WearerKia", { name: wearer.name, suit: suit.name, source: source ?? "" })}</p></div>`
  }));
}

/* -------------------------------------------- */
/*  Anti-'Mech attacks                          */
/* -------------------------------------------- */

/** The single targeted 'Mech for an attack or mount, or null with a warning. */
function targetMech(suit, { omni = false } = {}) {
  const mechs = Array.from(game.user.targets).map(token => token.actor)
    .filter(a => (a?.type === "mech") && (a !== suit));
  if ( mechs.length !== 1 ) {
    warn("MWD.BattleArmor.Warn.TargetOneMech");
    return null;
  }
  if ( omni && !mechs[0].system.details.omni ) {
    warn("MWD.BattleArmor.Warn.NotOmni");
    return null;
  }
  return mechs[0];
}

const terrainChoices = () => Object.entries(MECH_TERRAIN)
  .map(([value, cfg]) => ({ value, label: `${t(cfg.label)} (${cfg.modifier || 0})` }));

/**
 * Leg or swarm attack against a 'Mech at Pointblank range (p. 218): a Support Weapons Test with
 * the usual modifiers against the MechWarrior's Piloting. A leg attack deals 1 damage on the kick
 * table and always checks for a critical hit; a swarm attack puts the suit on the 'Mech.
 * @param {Actor} suit
 * @param {"leg"|"swarm"} type
 * @returns {Promise<ChatMessage|null>}
 */
export async function antiMechAttack(suit, type) {
  const pilot = getPilot(suit);
  if ( !canAct(suit, pilot) ) return null;
  if ( !suit.system.details[`${type}Attack`] ) return warn("MWD.BattleArmor.Warn.CannotAttack") || null;
  if ( suit.system.attached.mode ) return warn("MWD.BattleArmor.Warn.Attached") || null;
  const mech = targetMech(suit);
  if ( !mech ) return null;
  const label = t(`MWD.BattleArmor.${type === "leg" ? "LegAttack" : "SwarmAttack"}`);
  const data = await dialog({
    title: `${label}: ${mech.name}`, icon: "fa-solid fa-hand-back-fist",
    template: "anti-mech.hbs", context: { terrains: terrainChoices(), hint: t(`MWD.BattleArmor.${type}Hint`) },
    label: "MWD.Attack.Roll"
  });
  if ( !data ) return null;

  const gunnery = unitParts(suit, "gunnery");
  const terrain = MECH_TERRAIN[data.terrain] ?? MECH_TERRAIN.clear;
  const parts = [...gunnery.parts, ...targetParts(suit, mech)];
  if ( terrain.modifier ) parts.push({ label: t(terrain.label), value: terrain.modifier });
  const modifier = Number(data.modifier) || 0;
  if ( modifier ) parts.push({ label: t("MWD.Test.Modifier"), value: modifier });
  const damage = (type === "leg")
    ? { kind: "mech", base: BATTLE_ARMOR.legDamage, table: "kick", forceCrit: true, source: label, attackerUuid: suit.uuid }
    : { kind: "swarm", suitUuid: suit.uuid, mechUuid: mech.uuid, source: label };
  return rollUnitOpposed(pilot, mech, {
    kind: "attack", label, parts, dice: 2, damage, untrained: !gunnery.skill, speaker: suit
  }, Number(data.defenseModifier) || 0);
}

/**
 * A suit on a swarmed 'Mech fires one weapon (p. 219): the attack hits automatically, rolls on the
 * punch table and always checks for a critical hit. Weapon Groups of more than one weapon cannot
 * be used this way.
 * @param {Actor} suit
 * @param {Item} weapon
 * @returns {Promise<ChatMessage|null>}
 */
export async function swarmFire(suit, weapon) {
  const mech = fromUuidSync(suit.system.swarming);
  if ( !mech || mech.system.status.destroyed ) {
    await suit.update({ "system.attached.mode": "", "system.attached.target": "" });
    return warn("MWD.BattleArmor.Warn.SwarmLost") || null;
  }
  if ( weapon.system.count > 1 ) return warn("MWD.BattleArmor.Warn.SingleWeapon") || null;
  return mech.applyUnitHit({
    base: weapon.system.damage,
    missiles: weapon.system.missiles,
    max: weapon.system.maxDamage || null,
    types: weapon.system.types,
    primary: weapon.system.primary,
    table: "punch",
    forceCrit: true,
    source: t("MWD.BattleArmor.SwarmFire", { weapon: weapon.name, name: suit.name }),
    attackerUuid: suit.uuid
  });
}

/**
 * Brush off swarming battle armor (p. 218): a Piloting Test. Success drops every suit to
 * Pointblank range; failure makes the 'Mech hit itself as with a punch.
 * @param {Actor} mech
 * @returns {Promise<ChatMessage|null>}
 */
export async function dislodge(mech) {
  if ( !attachedSuits(mech, "swarming").length ) return warn("MWD.BattleArmor.Warn.NoSwarm") || null;
  return rollPilotingTest(mech, {
    consequence: false,
    successEffect: { kind: "dislodge", mechUuid: mech.uuid, applyOn: "always", source: t("MWD.BattleArmor.Dislodge") },
    label: t("MWD.BattleArmor.Dislodge")
  });
}

/**
 * Resolve a dislodge card: the suits fall off, or the 'Mech hurts itself.
 * @param {Actor} mech
 * @param {boolean} success
 */
export async function resolveDislodge(mech, success) {
  if ( success ) {
    for ( const suit of attachedSuits(mech, "swarming") ) {
      await suit.update({ "system.attached.mode": "", "system.attached.target": "" });
    }
    return ChatMessage.create(applyDefaultMode({
      speaker: ChatMessage.getSpeaker({ actor: mech }),
      content: `<div class="mwd-card success"><p>${t("MWD.BattleArmor.Dislodged", { name: mech.name })}</p></div>`
    }));
  }
  const { damage } = physicalDamage("punch", { tonnage: mech.system.details.tonnage });
  return mech.applyUnitHit({ base: damage, table: "punch", source: t("MWD.BattleArmor.DislodgeFailed") });
}

/* -------------------------------------------- */
/*  Riding OmniMechs                            */
/* -------------------------------------------- */

/**
 * Climb onto a targeted OmniMech (p. 218): costs 1 Movement, up to one Point (five suits) per 'Mech.
 * @param {Actor} suit
 */
export async function mount(suit) {
  const pilot = getPilot(suit);
  if ( !canAct(suit, pilot) ) return;
  const mech = targetMech(suit, { omni: true });
  if ( !mech ) return;
  if ( attachedSuits(mech, "mounted").length >= BATTLE_ARMOR.pointSize ) return warn("MWD.BattleArmor.Warn.Full");
  return suit.update({ "system.attached.mode": "mounted", "system.attached.target": mech.uuid });
}

/** Climb down, or let go of a swarmed 'Mech. */
export async function release(suit) {
  return suit.update({ "system.attached.mode": "", "system.attached.target": "" });
}

/**
 * A torso hit on an OmniMech carrying battle armor strikes a random suit on a 1D6 of 5–6 (p. 218).
 * @param {Actor} mech
 * @param {number} points       Damage meant for the torso.
 * @param {object} damage       The hit, for its source.
 * @param {(formula: string) => Promise<{total: number, roll: Roll}>} roller
 * @param {string[]} lines
 * @param {Roll[]} rolls
 * @returns {Promise<number>}  Damage still to apply to the torso.
 */
export async function shieldTorso(mech, points, damage, roller, lines, rolls) {
  const suits = attachedSuits(mech, "mounted");
  if ( !suits.length || !points ) return points;
  const r = await roller("1d6");
  rolls.push(r.roll);
  if ( r.total < BATTLE_ARMOR.mountedHit ) {
    lines.push(t("MWD.BattleArmor.Damage.CarrierHit", { roll: r.total }));
    return points;
  }
  const suit = suits[Math.floor(Math.random() * suits.length)];
  lines.push(t("MWD.BattleArmor.Damage.SuitShields", { roll: r.total, name: suit.name, n: points }));
  const { overflow } = await applyBattleArmorHit(suit, { base: points, source: damage.source, attackerUuid: damage.attackerUuid },
    { mounted: true });
  return overflow;
}

/* -------------------------------------------- */
/*  Card buttons                                */
/* -------------------------------------------- */

/**
 * A successful swarm attack: the suit is on the 'Mech.
 * @param {Actor} suit
 * @param {string} mechUuid
 */
export async function startSwarm(suit, mechUuid) {
  await suit.update({ "system.attached.mode": "swarming", "system.attached.target": mechUuid });
  const mech = fromUuidSync(mechUuid);
  return ChatMessage.create(applyDefaultMode({
    speaker: ChatMessage.getSpeaker({ actor: suit }),
    content: `<div class="mwd-card success"><p>${t("MWD.BattleArmor.Swarmed", { name: suit.name, mech: mech?.name ?? "" })}</p></div>`
  }));
}
