import {
  ATTRIBUTES, CREW_HIT_DAMAGE, DIFFICULTIES, DISENGAGED_TARGET, MECH_RANGES, MECH_TARGET_NUMBER, MECH_TERRAIN,
  MIXED_SMALL_TARGET, PHYSICAL_ATTACKS, SYSTEM_ID, UNIT_LOCATIONS, UNIT_TYPES
} from "../config.mjs";
import {
  clusters, coolDown, heatEffects, missileDamage, physicalDamage, restartCheck, speedModifier
} from "../rules/mech.mjs";
import { crashDamage } from "../rules/vehicle.mjs";
import { rangeModifier } from "../rules/tests.mjs";
import { applyDefaultMode, rollTest } from "../dice/test-roll.mjs";

/**
 * 'Mech-Scale Combat shared by 'Mechs, combat vehicles and aerospace fighters (p. 38–51): crews,
 * ranged and physical attacks, damage cards, Piloting Tests and Heat. Unit-specific damage lives in
 * mech.mjs, vehicle.mjs and fighter.mjs; MWDActor exposes these functions as methods.
 */

export const TEMPLATES = `systems/${SYSTEM_ID}/templates`;

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

export const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const abbr = key => t(ATTRIBUTES[key].abbr);
export const locLabel = key => t(UNIT_LOCATIONS[key].label);
export const sum = parts => parts.reduce((n, p) => n + p.value, 0);

/**
 * Roll a formula and return its total and individual die results.
 * @param {string} formula
 */
export async function roll(formula) {
  const r = await new Roll(formula).evaluate();
  return { roll: r, total: r.total, dice: r.dice.flatMap(d => d.results.map(x => x.result)) };
}

export function warn(key) {
  ui.notifications.warn(key, { localize: true });
  return false;
}

/** Whether an actor is a 'Mech-Scale unit. */
export function isUnit(actor) {
  return !!actor && (actor.type in UNIT_TYPES);
}

/**
 * The actor piloting or commanding a unit, if any. With nobody in the seat, a unit with an active
 * built-in crew is its own pilot: it rolls with the crew's bonuses and takes the crew's injuries.
 * @param {Actor} unit
 * @returns {Actor|null}
 */
export function getPilot(unit) {
  const uuid = unit?.system?.pilot;
  const pilot = uuid ? fromUuidSync(uuid) : null;
  if ( pilot?.isPerson ) return pilot;
  return unit?.system?.builtInCrew?.active ? unit : null;
}

/**
 * Whether a unit is crewed by its built-in crew right now.
 * @param {Actor} unit
 * @returns {boolean}
 */
export function usesBuiltInCrew(unit) {
  return !!unit && (getPilot(unit) === unit);
}

/**
 * Everyone aboard a unit: the pilot first, then the rest of the crew.
 * @param {Actor} unit
 * @returns {Actor[]}
 */
export function getCrew(unit) {
  const pilot = getPilot(unit);
  const crew = (unit.system.crew ?? []).map(uuid => fromUuidSync(uuid)).filter(a => a?.isPerson && (a !== pilot));
  return pilot ? [pilot, ...crew] : crew;
}

/** Whether the pilot is unconscious (failed CON Check). */
export function pilotUnconscious(pilot) {
  return !!pilot?.statuses?.has("unconscious");
}

/**
 * Bonus breakdown for a pilot's Gunnery or Piloting with a kind of Hardware: Skill + RFL, or RFL
 * alone without the Skill (p. 40–41), plus wounds. A built-in crew has the bonuses as they are.
 * @param {Actor|null} pilot
 * @param {"gunnery"|"piloting"} key
 * @param {string} [specialty="mech"]  "mech", "vehicle" or "aero".
 * @returns {{skill: Item|null, parts: {label: string, value: number}[]}}
 */
export function pilotParts(pilot, key, specialty = "mech") {
  if ( !pilot ) return { skill: null, parts: [] };
  if ( pilot.isUnit ) {
    const parts = [{ label: t(`MWD.Crew.${key}`), value: pilot.system.builtInCrew[key] }];
    if ( pilot.system.woundModifier ) parts.push({ label: t("MWD.Condition.Wounds"), value: pilot.system.woundModifier });
    return { skill: null, parts };
  }
  const skill = pilot.findSkill(key, specialty);
  const parts = [];
  if ( skill ) {
    parts.push({ label: skill.name, value: skill.system.rank });
    parts.push({ label: abbr(skill.system.attribute), value: skill.system.attributeValue });
  }
  else parts.push({ label: abbr("rfl"), value: pilot.system.attributes.rfl.total });
  if ( pilot.system.woundModifier ) parts.push({ label: t("MWD.Condition.Wounds"), value: pilot.system.woundModifier });
  return { skill, parts };
}

/** Gunnery or Piloting parts for a unit's own pilot. */
export function unitParts(unit, key) {
  return pilotParts(getPilot(unit), key, UNIT_TYPES[unit.type].specialty);
}

/** Situational modifiers from the attacker's and the target's state (p. 41). */
function targetParts(attacker, target) {
  const parts = [];
  const speed = speedModifier(attacker.system.maxMovement, target.system.maxMovement);
  if ( speed ) parts.push({ label: t("MWD.Mech.Attack.Speed"), value: speed });
  if ( target.system.status.jumped ) parts.push({ label: t("MWD.Mech.Attack.TargetJumped"), value: -1 });
  const shutdownMech = (target.type === "mech") && target.system.status.shutdown;
  if ( shutdownMech || pilotUnconscious(getPilot(target)) ) parts.push({ label: t("MWD.Mech.Attack.Helpless"), value: 2 });
  return parts;
}

/** Modifiers from the attacker's own state: stunned crew (p. 45). */
function selfParts(unit) {
  return unit.system.status.stunned ? [{ label: t("MWD.Unit.Status.stunned"), value: -2 }] : [];
}

/**
 * Check that a unit can act this Narration.
 * @param {Actor} unit
 * @param {Actor|null} pilot
 * @returns {boolean}
 */
export function canAct(unit, pilot) {
  const status = unit.system.status;
  if ( status.destroyed ) return warn("MWD.Mech.Warn.Destroyed");
  if ( !pilot ) return warn("MWD.Mech.Warn.NoPilot");
  if ( status.shutdown ) return warn("MWD.Mech.Warn.Shutdown");
  if ( status.outOfControl ) return warn("MWD.Fighter.Warn.OutOfControl");
  if ( pilotUnconscious(pilot) ) return warn("MWD.Mech.Warn.Unconscious");
  return true;
}

/** Targeted units and people, other than the attacker. */
function targetsOf(self) {
  const actors = Array.from(game.user.targets).map(token => token.actor).filter(a => a && (a !== self));
  return { units: actors.filter(isUnit), people: actors.filter(a => a.isPerson) };
}

/**
 * Show a form dialog and return its data, or null when closed.
 * @returns {Promise<object|null>}
 */
export async function dialog({ title, icon, template, context, label }) {
  const content = await foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/dialog/${template}`, context);
  const data = await foundry.applications.api.DialogV2.wait({
    window: { title, icon },
    classes: [SYSTEM_ID, "mwd-dialog"],
    position: { width: 460 },
    content,
    buttons: [{
      action: "ok",
      label,
      icon,
      default: true,
      callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }],
    rejectClose: false
  });
  return (data && (data !== "ok")) ? data : null;
}

const terrainChoices = () => Object.entries(MECH_TERRAIN)
  .map(([value, cfg]) => ({ value, label: `${t(cfg.label)} (${cfg.modifier || 0})` }));

/* -------------------------------------------- */
/*  Ranged attacks                              */
/* -------------------------------------------- */

/**
 * Fire a Primary Weapon or Weapon Group (p. 40–41): 2D6 + Gunnery + RFL vs the target pilot's
 * 2D6 + Piloting + RFL. Heat is added to 'Mechs and fighters when fired. One card per target;
 * a person on foot is a small target (–2) and defends with RFL + RFL (p. 65).
 * @param {Actor} unit
 * @param {Item} weapon  A mechWeapon item.
 * @returns {Promise<ChatMessage[]>}
 */
export async function rollUnitAttack(unit, weapon) {
  const pilot = getPilot(unit);
  if ( !canAct(unit, pilot) ) return [];
  if ( weapon.system.destroyed ) {
    warn("MWD.Mech.Warn.WeaponDestroyed");
    return [];
  }

  const { units, people } = targetsOf(unit);
  const ranges = Object.fromEntries(Object.keys(MECH_RANGES).map(r => [r, rangeModifier(weapon.system.ranges[r])]));
  const heatRanged = unit.system.heatEffects?.ranged ?? 0;
  const context = {
    weapon,
    gunnery: sum(unitParts(unit, "gunnery").parts),
    targets: [
      ...units.map(target => ({
        id: target.id,
        name: target.name,
        defense: sum(unitParts(target, "piloting").parts),
        disengaged: target.system.status.disengaged
      })),
      ...people.map(person => ({
        id: person.id, name: person.name, person: true,
        defense: sum(person.getDefenseParts())
      }))
    ],
    ranges: Object.entries(ranges).map(([key, mod]) => ({
      value: key,
      label: `${t(MECH_RANGES[key])} (${mod === null ? "—" : (mod === 0 ? "OK" : mod)})`,
      disabled: mod === null
    })),
    range: Object.entries(ranges).find(([, mod]) => mod !== null)?.[0] ?? "short",
    terrains: terrainChoices(),
    jumped: !!unit.system.status.jumped,
    heatRanged
  };
  const data = await dialog({
    title: t("MWD.Attack.Title", { weapon: weapon.name }), icon: "fa-solid fa-crosshairs",
    template: "mech-attack.hbs", context, label: "MWD.Attack.Roll"
  });
  if ( !data ) return [];

  const rangeMod = ranges[data.range];
  if ( rangeMod === null ) {
    warn("MWD.Attack.OutOfRange");
    return [];
  }
  if ( unit.system.usesHeat && weapon.system.heat ) {
    await unit.update({ "system.heat.value": unit.system.heat.value + weapon.system.heat });
  }

  const gunnery = unitParts(unit, "gunnery");
  const terrain = MECH_TERRAIN[data.terrain] ?? MECH_TERRAIN.clear;
  const base = [...gunnery.parts, ...selfParts(unit)];
  if ( rangeMod ) base.push({ label: t("MWD.Attack.Range"), value: rangeMod });
  if ( heatRanged ) base.push({ label: t("MWD.Mech.Heat.label"), value: heatRanged });
  if ( terrain.modifier ) base.push({ label: t(terrain.label), value: terrain.modifier });
  const modifier = Number(data.modifier) || 0;
  if ( modifier ) base.push({ label: t("MWD.Test.Modifier"), value: modifier });

  const damage = {
    kind: "mech",
    base: weapon.system.damage,
    missiles: data.heatInstead ? 0 : weapon.system.missiles,
    max: weapon.system.maxDamage || null,
    heatInstead: !!data.heatInstead,
    primary: weapon.system.primary,
    ignoreLegs: !!terrain.ignoreLegs,
    table: "standard",
    source: weapon.name,
    attackerUuid: unit.uuid
  };
  const label = `${weapon.name} · ${t(MECH_RANGES[data.range])}`;
  const defenseMod = Number(data.defenseModifier) || 0;
  const common = { kind: "attack", label, dice: 2, damage, untrained: !gunnery.skill, speaker: unit };
  const jumpPart = id => (unit.system.status.jumped
    ? [{ label: t("MWD.Mech.Attack.JumpPosition"), value: data.jumpTarget === id ? 1 : -1 }] : []);

  if ( !units.length && !people.length ) {
    return [await rollTest(pilot, {
      ...common, parts: base,
      opposingLabel: t("MWD.Attack.Defense"),
      opposingParts: [{ label: t("MWD.Mech.Attack.ManualDefense"), value: (Number(data.manualDefense) || 0) + defenseMod }]
    })];
  }
  const messages = [];
  for ( const target of units ) {
    const parts = [...base, ...targetParts(unit, target), ...jumpPart(target.id)];
    messages.push(await rollUnitOpposed(pilot, target, { ...common, parts }, defenseMod));
  }
  for ( const person of people ) {
    const parts = [...base, { label: t("MWD.Mixed.SmallTarget"), value: MIXED_SMALL_TARGET }, ...jumpPart(person.id)];
    messages.push(await rollTest(pilot, {
      ...common, parts, target: person,
      damage: {
        kind: "mixed", base: weapon.system.damage, missiles: weapon.system.missiles, count: weapon.system.count,
        types: weapon.system.types, source: weapon.name, attackerUuid: unit.uuid
      },
      opposingLabel: t("MWD.Attack.DefenseOf", { name: person.name }),
      opposingParts: person.getDefenseParts(defenseMod)
    }));
  }
  return messages;
}

/**
 * Roll an attack card against a unit defended by its pilot's Piloting.
 * @returns {Promise<ChatMessage>}
 */
export async function rollUnitOpposed(pilot, target, config, defenseMod) {
  const targetPilot = getPilot(target);
  const opposingParts = unitParts(target, "piloting").parts;
  if ( defenseMod ) opposingParts.push({ label: t("MWD.Test.Modifier"), value: defenseMod });
  return rollTest(pilot, {
    ...config,
    target: targetPilot,
    applyTo: target,
    targetName: target.name,
    minNatural: target.system.status.disengaged ? DISENGAGED_TARGET : 0,
    opposingLabel: t("MWD.Mech.Attack.DefenseOf", { name: target.name }),
    opposingParts
  });
}

/* -------------------------------------------- */
/*  Physical attacks                            */
/* -------------------------------------------- */

/**
 * Physical attack at Pointblank range (p. 42–43): Piloting + RFL vs Piloting + RFL. 'Mechs punch,
 * kick, push, charge and jump on their target; combat vehicles can only ram.
 * @param {Actor} unit
 * @returns {Promise<ChatMessage[]>}
 */
export async function rollPhysicalAttack(unit) {
  const pilot = getPilot(unit);
  if ( !canAct(unit, pilot) ) return [];
  if ( unit.type === "fighter" ) {
    warn("MWD.Fighter.Warn.NoPhysical");
    return [];
  }
  const mech = unit.type === "mech";
  const available = mech ? ["punch", "kick", "push", "charge", "dfa"] : ["ram"];
  const { units } = targetsOf(unit);
  const context = {
    types: available.map(value => ({
      value, label: t(PHYSICAL_ATTACKS[value].label),
      disabled: ((value === "punch") && !unit.system.details.punch) || ((value === "dfa") && !unit.system.details.jumpJets)
    })),
    type: mech ? (unit.system.details.punch ? "punch" : "kick") : "ram",
    terrains: terrainChoices(),
    targets: units.map(target => target.name)
  };
  const data = await dialog({
    title: t("MWD.Mech.Physical.Title", { name: unit.name }), icon: "fa-solid fa-hand-fist",
    template: "mech-physical.hbs", context, label: "MWD.Attack.Roll"
  });
  if ( !data ) return [];

  const type = available.includes(data.type) ? data.type : available[0];
  const cfg = PHYSICAL_ATTACKS[type];
  const piloting = unitParts(unit, "piloting");
  const terrain = MECH_TERRAIN[data.terrain] ?? MECH_TERRAIN.clear;
  const base = [...piloting.parts, ...selfParts(unit)];
  if ( terrain.modifier ) base.push({ label: t(terrain.label), value: terrain.modifier });
  const modifier = Number(data.modifier) || 0;
  if ( modifier ) base.push({ label: t("MWD.Test.Modifier"), value: modifier });
  const defenseMod = Number(data.defenseModifier) || 0;
  const movement = Number(data.movement) || 0;
  const label = t(cfg.label);

  const damageFor = target => {
    if ( type === "push" ) return null;
    const dmg = physicalDamage(type, {
      tonnage: unit.system.details.tonnage, targetTonnage: target?.system.details.tonnage ?? 0, movement
    });
    return {
      kind: "mech",
      base: dmg.damage,
      cluster: cfg.movement ? 2 : 0,
      table: cfg.table,
      ignoreLegs: !!terrain.ignoreLegs,
      self: dmg.self ? { base: dmg.self, cluster: 2, table: dmg.selfTable } : null,
      source: label,
      attackerUuid: unit.uuid,
      note: `MWD.Mech.Physical.Note.${type}`
    };
  };

  const common = { kind: "attack", label, dice: 2, untrained: !piloting.skill, speaker: unit };
  if ( !units.length ) {
    return [await rollTest(pilot, {
      ...common, parts: base, damage: damageFor(null),
      opposingLabel: t("MWD.Attack.Defense"),
      opposingParts: [{ label: t("MWD.Mech.Attack.ManualDefense"), value: (Number(data.manualDefense) || 0) + defenseMod }]
    })];
  }
  const messages = [];
  for ( const target of units ) {
    const parts = [...base, ...targetParts(unit, target)];
    messages.push(await rollUnitOpposed(pilot, target, { ...common, parts, damage: damageFor(target) }, defenseMod));
  }
  return messages;
}

/* -------------------------------------------- */
/*  Damage                                      */
/* -------------------------------------------- */

/**
 * @typedef {object} MechDamage
 * @property {number} base             Damage (or Heat tokens with heatInstead).
 * @property {number} [missiles=0]     Missile dice ("M") to roll.
 * @property {number|null} [max]       Max Damage of a missile Weapon Group.
 * @property {boolean} [heatInstead]   Flamer fired for Heat instead of damage.
 * @property {boolean} [primary]       Primary Weapons deal full damage on head hits (p. 45).
 * @property {boolean} [ignoreLegs]    Partial cover: leg hits do nothing.
 * @property {number} [cluster=0]      Split damage into clusters of this size.
 * @property {"standard"|"punch"|"kick"} [table="standard"]  Only 'Mechs use the punch and kick tables.
 * @property {string} [location]       Skip the location roll (full head damage bought with a Plot Point).
 * @property {boolean} [noPilotHit]    The pilot was already hurt by this hit.
 * @property {string} [source]
 * @property {string} [attackerUuid]
 */

/**
 * Hurt everyone aboard a unit with cockpit or crash damage, ignoring personal armor (p. 47).
 * @param {Actor} unit
 * @param {number} value  Physical damage to each of them.
 * @param {object} [options]
 * @param {boolean} [options.pilotOnly=false]
 */
export async function hurtCrew(unit, value, { pilotOnly = false } = {}) {
  if ( !value ) return;
  const crew = pilotOnly ? [getPilot(unit)].filter(Boolean) : getCrew(unit);
  for ( const person of crew ) {
    await person.applyPersonalDamage({ value }, { source: unit.name, mechScale: true, ignoreArmor: true });
  }
}

/**
 * Post a damage card for a unit. Its flags drive the card buttons.
 * @param {Actor} unit
 * @param {object} data
 * @returns {Promise<ChatMessage>}
 */
export async function postDamageCard(unit, {
  damage = {}, lines, rolls, notes = new Set(), title, pendingHead = 0, fall = false, pilotingTest = false
}) {
  const content = await foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/chat/mech-damage-card.hbs`, {
    name: unit.name,
    title,
    source: damage.source,
    lines,
    notes: [...notes].map(n => t(n)),
    note: damage.note ? t(damage.note) : null,
    pendingHead,
    fall,
    pilotingTest
  });
  return ChatMessage.create(applyDefaultMode({
    speaker: ChatMessage.getSpeaker({ actor: unit }),
    content,
    rolls,
    flags: { [SYSTEM_ID]: { mechDamage: {
      mechUuid: unit.uuid, attackerUuid: damage.attackerUuid ?? null, source: damage.source ?? "", pendingHead
    } } }
  }));
}

/**
 * Mark weapons and equipment lost when a location is destroyed (p. 45).
 * @param {Actor} unit
 * @param {Set<string>} destroyedItems  Ids collected so far.
 * @param {string} location
 */
export function destroyLocationItems(unit, destroyedItems, location) {
  for ( const item of unit.items ) {
    if ( (item.type === "mechWeapon") && item.system.mounts[location] ) destroyedItems.add(item.id);
    if ( (item.type === "mechEquipment") && (item.system.location === location) ) destroyedItems.add(item.id);
  }
}

/**
 * Intact weapons and ammo of a unit, ignoring items already lost to this hit.
 * @param {Actor} unit
 * @param {Set<string>} destroyedItems
 */
export function intactItems(unit, destroyedItems) {
  const intact = item => !item.system.destroyed && !destroyedItems.has(item.id);
  return {
    // Weapon Groups before Primary Weapons (p. 45).
    weaponsIn: loc => unit.itemTypes.mechWeapon.filter(w => w.system.mounts[loc] && intact(w))
      .sort((a, b) => Number(a.system.primary) - Number(b.system.primary)),
    ammo: loc => unit.itemTypes.mechEquipment.filter(e => (e.system.kind === "ammo") && intact(e)
      && ((loc === undefined) || (e.system.location === loc))),
    bombs: () => unit.itemTypes.mechWeapon.filter(w => w.system.bomb && intact(w))
  };
}

/**
 * Damage groups of a hit: the base damage (or its clusters) and one group per scoring Missile die.
 * @param {MechDamage} damage
 * @param {string[]} lines
 * @param {Roll[]} rolls
 * @returns {Promise<number[]>}
 */
export async function damageGroups(damage, lines, rolls) {
  const groups = damage.cluster ? clusters(damage.base, damage.cluster) : [damage.base];
  if ( damage.missiles ) {
    const missiles = await roll(`${damage.missiles}d6`);
    rolls.push(missiles.roll);
    const extra = missileDamage({ base: damage.base, max: damage.max }, missiles.dice);
    lines.push(t("MWD.Mech.Damage.Missiles", { dice: missiles.dice.join(", "), extra: extra.join(", ") || "0" }));
    groups.push(...extra);
  }
  return groups;
}

/**
 * Roll D6s for a critical hit up front so they can be shown on the card; the resolver draws from them.
 * @param {string} die  "1d6" or "2d6".
 * @returns {Promise<{next: () => number, used: () => Roll[]}>}
 */
export async function critDice(die) {
  const results = [];
  for ( let i = 0; i < 6; i++ ) results.push(await roll(die));
  let index = 0;
  return {
    next: () => (results[index++] ?? results[results.length - 1]).total,
    used: () => results.slice(0, index).map(r => r.roll)
  };
}

/** 2D6 critical hit check (p. 45): 8+ means a critical hit. */
export async function critCheck(rolls) {
  const check = await roll("2d6");
  rolls.push(check.roll);
  return { total: check.total, crit: check.total >= MECH_TARGET_NUMBER };
}

/* -------------------------------------------- */
/*  Piloting Tests                              */
/* -------------------------------------------- */

/**
 * Piloting Test (p. 48): a normal Test with the pilot's Piloting. Automatic failure while
 * unconscious or shut down. A damaged gyro or avionics, or a stunned crew, gives –2. Failing makes
 * a 'Mech fall, a vehicle crash and a fighter go out of control.
 * @param {Actor} unit
 * @param {object} [options]
 * @param {boolean} [options.consequence=true]  Offer the unit's failure consequence.
 * @param {boolean} [options.pilotDamageOnFailure=false]  Failing hurts the pilot (after a fall).
 * @param {object|null} [options.successEffect]  Effect offered on success, e.g. regaining control.
 * @param {string} [options.label]
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollPilotingTest(unit, { consequence = true, pilotDamageOnFailure = false, successEffect = null, label } = {}) {
  const pilot = getPilot(unit);
  if ( !pilot ) {
    warn("MWD.Mech.Warn.NoPilot");
    return null;
  }
  label ??= t("MWD.Mech.Piloting.Title");
  const kind = { mech: "fall", vehicle: "crash", fighter: "control" }[unit.type];
  const failDamage = pilotDamageOnFailure
    ? { kind: "personal", value: CREW_HIT_DAMAGE, ignoreArmor: true, mechScale: true, applyOn: "failure", source: label }
    : (consequence ? { kind, mechUuid: unit.uuid, applyOn: "failure", source: label } : null);

  const shutdown = !!unit.system.status.shutdown;
  if ( shutdown || pilotUnconscious(pilot) ) {
    const reason = t(shutdown ? "MWD.Mech.Warn.Shutdown" : "MWD.Mech.Warn.Unconscious");
    await ChatMessage.create(applyDefaultMode({
      speaker: ChatMessage.getSpeaker({ actor: unit }),
      content: `<div class="mwd-card"><header class="mwd-card-header"><h3>${label}</h3></header>`
        + `<p>${t("MWD.Mech.Piloting.AutoFail", { reason })}</p></div>`
    }));
    if ( failDamage?.kind === "personal" ) return pilot.applyPersonalDamage(failDamage, { source: label, mechScale: true, ignoreArmor: true });
    if ( failDamage ) return unit.pilotingFailure(failDamage.kind);
    return null;
  }

  const penalty = pilotingPenalty(unit);
  const data = await dialog({
    title: label, icon: "fa-solid fa-person-falling",
    template: "mech-piloting.hbs",
    context: {
      difficulties: Object.entries(DIFFICULTIES).map(([value, cfg]) => ({ value, label: `${t(cfg.label)} (${cfg.dice}D6)` })),
      penalty
    },
    label: "MWD.Test.Roll"
  });
  if ( !data ) return null;
  const piloting = unitParts(unit, "piloting");
  const parts = [...piloting.parts];
  if ( penalty ) parts.push({ label: t(penalty.label), value: penalty.value });
  const modifier = Number(data.modifier) || 0;
  if ( modifier ) parts.push({ label: t("MWD.Test.Modifier"), value: modifier });
  return rollTest(pilot, {
    label, parts, difficulty: data.difficulty, untrained: !piloting.skill, speaker: unit,
    damage: successEffect ?? failDamage
  });
}

/** Penalty to Piloting Tests from damage or a stunned crew. */
function pilotingPenalty(unit) {
  const crits = unit.system.crits ?? {};
  if ( (unit.type === "mech") && crits.gyro ) return { label: "MWD.Mech.Crit.GyroShort", value: -2 };
  if ( (unit.type === "fighter") && crits.avionics ) return { label: "MWD.Fighter.Crit.AvionicsShort", value: -2 };
  if ( unit.system.status.stunned ) return { label: "MWD.Unit.Status.stunned", value: -2 };
  return null;
}

/**
 * A combat vehicle crashes or a fighter goes down (p. 49): treated as a ram, so the unit takes
 * (Tonnage/30) × Movement in 2-point clusters, and everyone aboard takes 3 Physical damage per
 * point of Movement spent (minimum 1).
 * @param {Actor} unit
 * @returns {Promise<ChatMessage|null>}
 */
export async function resolveCrash(unit) {
  const data = await dialog({
    title: t("MWD.Vehicle.Crash.Title", { name: unit.name }), icon: "fa-solid fa-car-burst",
    template: "unit-crash.hbs", context: { movement: unit.system.details.movement }, label: "MWD.Vehicle.Crash.Resolve"
  });
  if ( !data ) return null;
  const movement = Math.max(0, Number(data.movement) || 0);
  const { damage } = physicalDamage("ram", { tonnage: unit.system.details.tonnage, movement });
  const message = await unit.applyUnitHit({ base: damage, cluster: 2, table: "standard", source: t("MWD.Vehicle.Crash.Title", { name: unit.name }) });
  await hurtCrew(unit, crashDamage(movement));
  return message;
}

/* -------------------------------------------- */
/*  Heat                                        */
/* -------------------------------------------- */

/**
 * Cool down and roll Heat effects at the end of a Narration (p. 47–48) for a 'Mech or fighter.
 * @param {Actor} unit
 * @param {object} options
 * @param {number} options.engineHeat  Heat added by a damaged engine before cooling down.
 * @param {(lines: string[]) => Promise<void>} options.explode  Resolve an ammo explosion.
 * @returns {Promise<{updates: object, lines: string[], rolls: Roll[], pilotHits: number}>}
 */
export async function heatUpkeep(unit, { engineHeat, explode }) {
  const system = unit.system;
  const lines = [];
  const rolls = [];
  let pilotHits = 0;
  const wasShutdown = !!system.status.shutdown;
  let shutdown = wasShutdown;

  const heat = coolDown({ heat: system.heat.value, dissipation: system.details.heatDissipation, engineHeat });
  if ( engineHeat ) lines.push(t("MWD.Mech.Heat.Engine", { n: engineHeat }));
  lines.push(t("MWD.Mech.Heat.Cooled", { from: system.heat.value, to: heat, dissipation: system.details.heatDissipation }));
  const effects = heatEffects(heat);
  lines.push(t(`MWD.Mech.Heat.Level.${effects.level}`));

  if ( effects.autoShutdown && !shutdown ) {
    shutdown = true;
    lines.push(t("MWD.Mech.Heat.AutoShutdown"));
  }
  else if ( effects.shutdownRoll && !shutdown ) {
    const r = await roll("2d6");
    rolls.push(r.roll);
    shutdown = r.total < MECH_TARGET_NUMBER;
    lines.push(t(shutdown ? "MWD.Mech.Heat.ShutdownFailed" : "MWD.Mech.Heat.ShutdownAvoided", { roll: r.total }));
  }
  const hasAmmoWeapons = unit.itemTypes.mechWeapon.some(w => w.system.usesAmmo && !w.system.destroyed);
  if ( effects.ammoRoll && hasAmmoWeapons ) {
    const r = await roll("2d6");
    rolls.push(r.roll);
    if ( r.total >= MECH_TARGET_NUMBER ) lines.push(t("MWD.Mech.Heat.AmmoAvoided", { roll: r.total }));
    else {
      pilotHits += 1;
      lines.push(t("MWD.Mech.Heat.AmmoExploded", { roll: r.total }));
      await explode(lines);
    }
  }

  // An engine that shut down before this Narration may restart now.
  if ( wasShutdown && shutdown ) {
    const check = restartCheck(heat);
    if ( check === "auto" ) {
      shutdown = false;
      lines.push(t("MWD.Mech.Heat.Restarted"));
    }
    else if ( check === "roll" ) {
      const r = await roll("2d6");
      rolls.push(r.roll);
      shutdown = r.total < MECH_TARGET_NUMBER;
      lines.push(t(shutdown ? "MWD.Mech.Heat.RestartFailed" : "MWD.Mech.Heat.Restarted", { roll: r.total }));
    }
    else lines.push(t("MWD.Mech.Heat.TooHotToRestart"));
  }
  return {
    updates: { "system.heat.value": heat, "system.heat.level": heat, "system.status.shutdown": shutdown },
    lines, rolls, pilotHits
  };
}

/**
 * CON Checks for unconscious crew at the end of their Narration (p. 47).
 * @param {Actor} unit
 */
export async function crewConChecks(unit) {
  for ( const person of getCrew(unit) ) {
    if ( pilotUnconscious(person) ) await person.rollConCheck();
  }
}

/**
 * Post an end-of-Narration card.
 * @param {Actor} unit
 * @param {string[]} lines
 * @param {Roll[]} rolls
 */
export async function postNarrationCard(unit, lines, rolls) {
  const content = await foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/chat/mech-damage-card.hbs`, {
    name: unit.name, title: t("MWD.Mech.EndNarration.Title", { name: unit.name }), lines, notes: []
  });
  return ChatMessage.create(applyDefaultMode({ speaker: ChatMessage.getSpeaker({ actor: unit }), content, rolls }));
}

/* -------------------------------------------- */
/*  Crew                                        */
/* -------------------------------------------- */

/**
 * Add a person to a unit's crew, or make them the pilot when the seat is empty.
 * @param {Actor} unit
 * @param {Actor} person
 */
export async function addCrew(unit, person) {
  if ( !person?.isPerson ) return;
  if ( !unit.system.pilot ) return person.boardHardware(unit);
  if ( (unit.system.pilot === person.uuid) || unit.system.crew.includes(person.uuid) ) return;
  return unit.update({ "system.crew": [...unit.system.crew, person.uuid] });
}

/**
 * Remove a person from a unit's crew.
 * @param {Actor} unit
 * @param {string} uuid
 */
export async function removeCrew(unit, uuid) {
  return unit.update({ "system.crew": unit.system.crew.filter(u => u !== uuid) });
}
