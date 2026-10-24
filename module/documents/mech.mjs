import {
  ATTRIBUTES, DIFFICULTIES, DISENGAGED_TARGET, MECH_LOCATIONS, MECH_RANGES, MECH_TARGET_NUMBER, MECH_TERRAIN,
  PHYSICAL_ATTACKS, PILOT_HIT_DAMAGE, SYSTEM_ID
} from "../config.mjs";
import {
  clusters, coolDown, damageLocation, heatEffects, hitLocation, missileDamage, physicalDamage, resolveCrit,
  restartCheck, speedModifier
} from "../rules/mech.mjs";
import { rangeModifier } from "../rules/tests.mjs";
import { applyDefaultMode, rollTest } from "../dice/test-roll.mjs";
import { executeAsGM } from "../socket.mjs";

/**
 * 'Mech-Scale Combat for Foundry: attacks, damage, heat and Piloting Tests (p. 38–51).
 * Functions take the 'Mech actor; MWDActor exposes them as methods.
 */

const TEMPLATES = `systems/${SYSTEM_ID}/templates`;

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const abbr = key => t(ATTRIBUTES[key].abbr);
const locLabel = key => t(MECH_LOCATIONS[key].label);

async function roll(formula) {
  const r = await new Roll(formula).evaluate();
  return { roll: r, total: r.total, dice: r.dice.flatMap(d => d.results.map(x => x.result)) };
}

/**
 * The actor piloting a 'Mech, if any.
 * @param {Actor} mech
 * @returns {Actor|null}
 */
export function getPilot(mech) {
  const uuid = mech.system.pilot;
  if ( !uuid ) return null;
  const pilot = fromUuidSync(uuid);
  return pilot?.isPerson ? pilot : null;
}

/** Whether the pilot is unconscious (failed CON Check). */
export function pilotUnconscious(pilot) {
  return !!pilot?.statuses?.has("unconscious");
}

/**
 * Bonus breakdown for a pilot's 'Mech Gunnery or Piloting: Skill + RFL, or RFL alone without the
 * Skill (p. 40–41), plus wounds.
 * @param {Actor|null} pilot
 * @param {"gunnery"|"piloting"} key
 * @returns {{skill: Item|null, parts: {label: string, value: number}[]}}
 */
export function pilotParts(pilot, key) {
  if ( !pilot ) return { skill: null, parts: [] };
  const skill = pilot.findSkill(key, "mech");
  const parts = [];
  if ( skill ) {
    parts.push({ label: skill.name, value: skill.system.rank });
    parts.push({ label: abbr(skill.system.attribute), value: skill.system.attributeValue });
  }
  else parts.push({ label: abbr("rfl"), value: pilot.system.attributes.rfl.total });
  if ( pilot.system.woundModifier ) parts.push({ label: t("MWD.Condition.Wounds"), value: pilot.system.woundModifier });
  return { skill, parts };
}

const sum = parts => parts.reduce((n, p) => n + p.value, 0);

/** Situational modifiers from the target's state (p. 41). */
function targetParts(attacker, target) {
  const parts = [];
  const speed = speedModifier(attacker.system.maxMovement, target.system.maxMovement);
  if ( speed ) parts.push({ label: t("MWD.Mech.Attack.Speed"), value: speed });
  if ( target.system.status.jumped ) parts.push({ label: t("MWD.Mech.Attack.TargetJumped"), value: -1 });
  if ( target.system.status.shutdown || pilotUnconscious(getPilot(target)) ) {
    parts.push({ label: t("MWD.Mech.Attack.Helpless"), value: 2 });
  }
  return parts;
}

/** Check that a 'Mech can act this Narration. */
function canAct(mech, pilot) {
  if ( mech.system.status.destroyed ) return warn("MWD.Mech.Warn.Destroyed");
  if ( !pilot ) return warn("MWD.Mech.Warn.NoPilot");
  if ( mech.system.status.shutdown ) return warn("MWD.Mech.Warn.Shutdown");
  if ( pilotUnconscious(pilot) ) return warn("MWD.Mech.Warn.Unconscious");
  return true;
}

function warn(key) {
  ui.notifications.warn(key, { localize: true });
  return false;
}

function targetedMechs(self) {
  return Array.from(game.user.targets).map(t => t.actor).filter(a => (a?.type === "mech") && (a !== self));
}

async function dialog({ title, icon, template, context, label }) {
  const content = await foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/dialog/${template}`, context);
  return foundry.applications.api.DialogV2.wait({
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
}

/* -------------------------------------------- */
/*  Ranged attacks                              */
/* -------------------------------------------- */

/**
 * Fire a Primary Weapon or Weapon Group (p. 40–41): 2D6 + Gunnery + RFL vs the target pilot's
 * 2D6 + Piloting + RFL. The weapon's Heat is added to the 'Mech when fired. One card per target.
 * @param {Actor} mech
 * @param {Item} weapon  A mechWeapon item.
 * @returns {Promise<ChatMessage[]>}
 */
export async function rollMechAttack(mech, weapon) {
  const pilot = getPilot(mech);
  if ( !canAct(mech, pilot) ) return [];
  if ( weapon.system.destroyed ) {
    warn("MWD.Mech.Warn.WeaponDestroyed");
    return [];
  }

  const targets = targetedMechs(mech);
  const ranges = Object.fromEntries(Object.keys(MECH_RANGES).map(r => [r, rangeModifier(weapon.system.ranges[r])]));
  const context = {
    weapon,
    gunnery: sum(pilotParts(pilot, "gunnery").parts),
    targets: targets.map(target => ({
      id: target.id,
      name: target.name,
      defense: sum(pilotParts(getPilot(target), "piloting").parts),
      disengaged: target.system.status.disengaged
    })),
    ranges: Object.entries(ranges).map(([key, mod]) => ({
      value: key,
      label: `${t(MECH_RANGES[key])} (${mod === null ? "—" : (mod === 0 ? "OK" : mod)})`,
      disabled: mod === null
    })),
    range: Object.entries(ranges).find(([, mod]) => mod !== null)?.[0] ?? "short",
    terrains: Object.entries(MECH_TERRAIN).map(([value, cfg]) => ({ value, label: `${t(cfg.label)} (${cfg.modifier || 0})` })),
    jumped: mech.system.status.jumped,
    heatRanged: mech.system.heatEffects.ranged
  };
  const data = await dialog({
    title: t("MWD.Attack.Title", { weapon: weapon.name }), icon: "fa-solid fa-crosshairs",
    template: "mech-attack.hbs", context, label: "MWD.Attack.Roll"
  });
  if ( !data || (data === "ok") ) return [];

  const rangeMod = ranges[data.range];
  if ( rangeMod === null ) {
    warn("MWD.Attack.OutOfRange");
    return [];
  }
  await mech.update({ "system.heat.value": mech.system.heat.value + weapon.system.heat });

  const gunnery = pilotParts(pilot, "gunnery");
  const terrain = MECH_TERRAIN[data.terrain] ?? MECH_TERRAIN.clear;
  const base = [...gunnery.parts];
  if ( rangeMod ) base.push({ label: t("MWD.Attack.Range"), value: rangeMod });
  if ( mech.system.heatEffects.ranged ) base.push({ label: t("MWD.Mech.Heat.label"), value: mech.system.heatEffects.ranged });
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
    attackerUuid: mech.uuid
  };
  const label = `${weapon.name} · ${t(MECH_RANGES[data.range])}`;
  const defenseMod = Number(data.defenseModifier) || 0;
  const common = { kind: "attack", label, dice: 2, damage, untrained: !gunnery.skill, speaker: mech };

  if ( !targets.length ) {
    return [await rollTest(pilot, {
      ...common, parts: base,
      opposingLabel: t("MWD.Attack.Defense"),
      opposingParts: [{ label: t("MWD.Mech.Attack.ManualDefense"), value: (Number(data.manualDefense) || 0) + defenseMod }]
    })];
  }
  const messages = [];
  for ( const target of targets ) {
    const parts = [...base, ...targetParts(mech, target)];
    if ( mech.system.status.jumped ) {
      parts.push({ label: t("MWD.Mech.Attack.JumpPosition"), value: data.jumpTarget === target.id ? 1 : -1 });
    }
    messages.push(await rollMechOpposed(pilot, target, { ...common, parts }, defenseMod));
  }
  return messages;
}

/**
 * Roll an attack card against a 'Mech defended by its pilot's Piloting.
 * @returns {Promise<ChatMessage>}
 */
async function rollMechOpposed(pilot, target, config, defenseMod) {
  const targetPilot = getPilot(target);
  const opposingParts = pilotParts(targetPilot, "piloting").parts;
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
 * Physical attack at Pointblank range (p. 42–43): Piloting + RFL vs Piloting + RFL.
 * @param {Actor} mech
 * @returns {Promise<ChatMessage[]>}
 */
export async function rollPhysicalAttack(mech) {
  const pilot = getPilot(mech);
  if ( !canAct(mech, pilot) ) return [];
  const targets = targetedMechs(mech);
  const context = {
    types: Object.entries(PHYSICAL_ATTACKS).map(([value, cfg]) => ({
      value, label: t(cfg.label), disabled: ((value === "punch") && !mech.system.details.punch)
        || ((value === "dfa") && !mech.system.details.jumpJets)
    })),
    type: mech.system.details.punch ? "punch" : "kick",
    terrains: Object.entries(MECH_TERRAIN).map(([value, cfg]) => ({ value, label: `${t(cfg.label)} (${cfg.modifier || 0})` })),
    targets: targets.map(target => target.name)
  };
  const data = await dialog({
    title: t("MWD.Mech.Physical.Title", { name: mech.name }), icon: "fa-solid fa-hand-fist",
    template: "mech-physical.hbs", context, label: "MWD.Attack.Roll"
  });
  if ( !data || (data === "ok") ) return [];

  const type = data.type;
  const cfg = PHYSICAL_ATTACKS[type];
  const piloting = pilotParts(pilot, "piloting");
  const terrain = MECH_TERRAIN[data.terrain] ?? MECH_TERRAIN.clear;
  const base = [...piloting.parts];
  if ( terrain.modifier ) base.push({ label: t(terrain.label), value: terrain.modifier });
  const modifier = Number(data.modifier) || 0;
  if ( modifier ) base.push({ label: t("MWD.Test.Modifier"), value: modifier });
  const defenseMod = Number(data.defenseModifier) || 0;
  const movement = Number(data.movement) || 0;
  const label = t(cfg.label);

  const damageFor = target => {
    if ( type === "push" ) return null;
    const dmg = physicalDamage(type, {
      tonnage: mech.system.details.tonnage, targetTonnage: target?.system.details.tonnage ?? 0, movement
    });
    return {
      kind: "mech",
      base: dmg.damage,
      cluster: cfg.movement ? 2 : 0,
      table: cfg.table,
      ignoreLegs: !!terrain.ignoreLegs,
      self: dmg.self ? { base: dmg.self, cluster: 2, table: dmg.selfTable } : null,
      source: label,
      attackerUuid: mech.uuid,
      note: `MWD.Mech.Physical.Note.${type}`
    };
  };

  const common = { kind: "attack", label, dice: 2, untrained: !piloting.skill, speaker: mech };
  if ( !targets.length ) {
    return [await rollTest(pilot, {
      ...common, parts: base, damage: damageFor(null),
      opposingLabel: t("MWD.Attack.Defense"),
      opposingParts: [{ label: t("MWD.Mech.Attack.ManualDefense"), value: (Number(data.manualDefense) || 0) + defenseMod }]
    })];
  }
  const messages = [];
  for ( const target of targets ) {
    const parts = [...base, ...targetParts(mech, target)];
    messages.push(await rollMechOpposed(pilot, target, { ...common, parts, damage: damageFor(target) }, defenseMod));
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
 * @property {"standard"|"punch"|"kick"} [table="standard"]
 * @property {string} [location]       Skip the location roll (full head damage bought with a Plot Point).
 * @property {boolean} [noPilotHit]    The pilot was already hurt by this hit.
 * @property {string} [source]
 * @property {string} [attackerUuid]
 */

/**
 * Resolve a 'Mech-Scale hit (p. 43–47): hit locations, Missile dice, Armor and Structure,
 * critical hits, destroyed locations and MechWarrior damage. Posts a damage card.
 * @param {Actor} mech
 * @param {MechDamage} damage
 * @returns {Promise<ChatMessage|null>}
 */
export async function applyMechHit(mech, damage) {
  const system = mech.system;
  const lines = [];
  const rolls = [];
  const notes = new Set();

  if ( damage.heatInstead ) {
    await mech.update({ "system.heat.value": system.heat.value + damage.base });
    lines.push(t("MWD.Mech.Damage.HeatTokens", { n: damage.base }));
    return postDamageCard(mech, { damage, lines, rolls, notes, pendingHead: 0 });
  }

  // Damage groups: base (or clusters) plus one group per scoring Missile die.
  const groups = damage.cluster ? clusters(damage.base, damage.cluster) : [damage.base];
  if ( damage.missiles ) {
    const missiles = await roll(`${damage.missiles}d6`);
    rolls.push(missiles.roll);
    const extra = missileDamage({ base: damage.base, max: damage.max }, missiles.dice);
    lines.push(t("MWD.Mech.Damage.Missiles", { dice: missiles.dice.join(", "), extra: extra.join(", ") || "0" }));
    groups.push(...extra);
  }

  const state = {
    locations: foundry.utils.deepClone(system._source.locations),
    crits: { ...system._source.crits },
    destroyedItems: new Set(),
    destroyed: system.status.destroyed,
    pilotHits: 0,
    fall: false,
    pilotingTest: false
  };
  let pendingHead = 0;

  for ( const amount of groups ) {
    let location = damage.location;
    let critChance = false;
    if ( !location ) {
      const r = await roll(damage.table === "kick" ? "1d6" : "2d6");
      rolls.push(r.roll);
      const hit = hitLocation(r.total, damage.table);
      location = hit.location;
      critChance = hit.critChance;
      if ( damage.ignoreLegs && MECH_LOCATIONS[location].leg ) {
        lines.push(t("MWD.Mech.Damage.CoverIgnored", { roll: r.total, location: locLabel(location) }));
        continue;
      }
      lines.push(t("MWD.Mech.Damage.Location", { roll: r.total, location: locLabel(location), n: amount }));
    }
    let points = amount;
    if ( location === "head" ) {
      if ( !damage.noPilotHit ) state.pilotHits += 1;
      if ( !damage.primary && !damage.location && (amount > 1) ) {
        pendingHead += amount - 1;
        points = 1;
        lines.push(t("MWD.Mech.Damage.Glancing"));
      }
    }
    await applyToLocation(mech, state, location, points, critChance, lines, rolls);
    if ( state.destroyed ) break;
  }
  return finishDamage(mech, state, { damage, lines, rolls, notes, pendingHead });
}

/**
 * Damage one location and roll any critical hits it causes.
 */
async function applyToLocation(mech, state, location, points, critChance, lines, rolls) {
  const result = damageLocation(state.locations, location, points);
  state.locations = result.locations;
  for ( const step of result.steps ) {
    lines.push(t("MWD.Mech.Damage.Step", {
      location: locLabel(step.location), armor: step.armor, structure: step.structure
    }) + (step.destroyed ? ` ${t("MWD.Mech.Damage.LocationDestroyed")}` : ""));
  }
  for ( const loc of result.destroyed ) destroyLocationItems(mech, state, loc);
  if ( result.mechDestroyed ) state.destroyed = true;
  if ( result.destroyed.some(l => MECH_LOCATIONS[l].leg) ) state.fall = true;

  const critLocations = [...result.structureHit];
  if ( critChance && !critLocations.includes(location) ) critLocations.push(location);
  for ( const loc of critLocations ) {
    if ( state.destroyed ) break;
    const check = await roll("2d6");
    rolls.push(check.roll);
    if ( check.total < MECH_TARGET_NUMBER ) {
      lines.push(t("MWD.Mech.Crit.NoCrit", { location: locLabel(loc), roll: check.total }));
      continue;
    }
    await applyCrit(mech, state, loc, check.total, lines, rolls);
  }
}

/** Mark weapons and equipment in a destroyed location as lost (p. 45). */
function destroyLocationItems(mech, state, location) {
  for ( const item of mech.items ) {
    if ( (item.type === "mechWeapon") && item.system.mounts[location] ) state.destroyedItems.add(item.id);
    if ( (item.type === "mechEquipment") && (item.system.location === location) ) state.destroyedItems.add(item.id);
  }
}

/** Roll and apply a critical hit in a location. */
async function applyCrit(mech, state, location, checkRoll, lines, rolls) {
  const intact = item => !item.system.destroyed && !state.destroyedItems.has(item.id);
  const weaponsIn = loc => mech.itemTypes.mechWeapon.filter(w => w.system.mounts[loc] && intact(w))
    .sort((a, b) => Number(a.system.primary) - Number(b.system.primary));
  const ammoIn = loc => mech.itemTypes.mechEquipment.filter(e => (e.system.kind === "ammo") && (e.system.location === loc) && intact(e));
  const d6s = [];
  for ( let i = 0; i < 6; i++ ) d6s.push(await roll("1d6"));
  let next = 0;
  const crit = resolveCrit(location, () => {
    const r = d6s[next++] ?? d6s[d6s.length - 1];
    return r.total;
  }, {
    hasAmmo: loc => ammoIn(loc).length > 0,
    hasWeapon: loc => weaponsIn(loc).length > 0,
    gyroHits: state.crits.gyro,
    engineHits: state.crits.engine
  });
  rolls.push(...d6s.slice(0, next).map(r => r.roll));
  if ( !crit ) {
    lines.push(t("MWD.Mech.Crit.None", { location: locLabel(location), roll: checkRoll }));
    return;
  }
  const where = locLabel(crit.location);
  const prefix = t("MWD.Mech.Crit.Hit", { location: where, roll: checkRoll });
  switch ( crit.effect ) {
    case "weapon": {
      const weapon = weaponsIn(crit.location)[0];
      state.destroyedItems.add(weapon.id);
      lines.push(`${prefix} ${t("MWD.Mech.Crit.Weapon", { weapon: weapon.name })}`);
      break;
    }
    case "ammo": {
      for ( const ammo of ammoIn(crit.location) ) state.destroyedItems.add(ammo.id);
      state.pilotHits += 1;
      if ( crit.location === "torso" ) {
        state.destroyed = true;
        lines.push(`${prefix} ${t("MWD.Mech.Crit.AmmoTorso")}`);
      }
      else {
        const loc = state.locations[crit.location];
        loc.armorDamage = loc.armor;
        loc.structureDamage = loc.structure;
        destroyLocationItems(mech, state, crit.location);
        if ( MECH_LOCATIONS[crit.location].leg ) state.fall = true;
        lines.push(`${prefix} ${t("MWD.Mech.Crit.AmmoLimb", { location: where })}`);
      }
      break;
    }
    case "gyro":
      state.crits.gyro += 1;
      if ( state.crits.gyro >= 2 ) state.fall = true;
      else state.pilotingTest = true;
      lines.push(`${prefix} ${t(state.crits.gyro >= 2 ? "MWD.Mech.Crit.GyroDestroyed" : "MWD.Mech.Crit.Gyro")}`);
      break;
    case "engine":
      state.crits.engine += 1;
      if ( state.crits.engine >= 2 ) state.destroyed = true;
      lines.push(`${prefix} ${t(state.crits.engine >= 2 ? "MWD.Mech.Crit.EngineDestroyed" : "MWD.Mech.Crit.Engine")}`);
      break;
    case "movement":
      state.crits.legs += 1;
      state.pilotingTest = true;
      lines.push(`${prefix} ${t("MWD.Mech.Crit.Leg")}`);
      break;
  }
}

/** Save the results of a hit, hurt the pilot and post the card. */
async function finishDamage(mech, state, { damage, lines, rolls, notes, pendingHead }) {
  await mech.update({
    "system.locations": state.locations,
    "system.crits": state.crits,
    "system.status.destroyed": state.destroyed
  });
  const itemUpdates = [...state.destroyedItems].map(_id => ({ _id, "system.destroyed": true }));
  if ( itemUpdates.length ) await mech.updateEmbeddedDocuments("Item", itemUpdates);

  if ( state.destroyed ) notes.add("MWD.Mech.Damage.MechDestroyed");
  else {
    if ( state.fall ) notes.add("MWD.Mech.Damage.Falls");
    if ( state.pilotingTest ) notes.add("MWD.Mech.Damage.PilotingTest");
  }
  const message = await postDamageCard(mech, {
    damage, lines, rolls, notes, pendingHead, fall: state.fall && !state.destroyed,
    pilotingTest: state.pilotingTest && !state.fall && !state.destroyed
  });
  const pilot = getPilot(mech);
  if ( state.pilotHits && pilot ) {
    await pilot.applyPersonalDamage({ value: PILOT_HIT_DAMAGE * state.pilotHits }, {
      source: mech.name, mechScale: true, ignoreArmor: true
    });
  }
  return message;
}

async function postDamageCard(mech, { damage, lines, rolls, notes, pendingHead = 0, fall = false, pilotingTest = false }) {
  const content = await foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/chat/mech-damage-card.hbs`, {
    name: mech.name,
    source: damage.source,
    lines,
    notes: [...notes].map(n => t(n)),
    note: damage.note ? t(damage.note) : null,
    pendingHead,
    fall,
    pilotingTest
  });
  return ChatMessage.create(applyDefaultMode({
    speaker: ChatMessage.getSpeaker({ actor: mech }),
    content,
    rolls,
    flags: { [SYSTEM_ID]: { mechDamage: {
      mechUuid: mech.uuid, attackerUuid: damage.attackerUuid ?? null, source: damage.source ?? "", pendingHead
    } } }
  }));
}

/**
 * Spend a Plot Point so a head hit deals full damage (p. 45). A player spends their own;
 * the GM spends from the GM pool.
 * @param {ChatMessage} message  A 'Mech damage card with a pending head hit.
 */
export async function buyFullHeadHit(message) {
  const flag = message.getFlag(SYSTEM_ID, "mechDamage");
  if ( !flag?.pendingHead ) return;
  const mech = await fromUuid(flag.mechUuid);
  if ( !mech ) return;
  if ( game.user.isGM ) {
    const pool = game.settings.get(SYSTEM_ID, "gmPlotPoints");
    if ( pool < 1 ) return warn("MWD.PlotPoints.NoneLeft");
    await game.settings.set(SYSTEM_ID, "gmPlotPoints", pool - 1);
  }
  else {
    const attacker = flag.attackerUuid ? await fromUuid(flag.attackerUuid) : null;
    const pilot = attacker ? getPilot(attacker) : game.user.character;
    const pp = pilot?.system.plotPoints?.value ?? 0;
    if ( !pilot?.isOwner || (pp < 1) ) return warn("MWD.PlotPoints.NoneLeft");
    await pilot.update({ "system.plotPoints.value": pp - 1 });
    await executeAsGM("adjustGmPool", { delta: 1 });
  }
  const update = { [`flags.${SYSTEM_ID}.mechDamage.pendingHead`]: 0 };
  if ( message.isOwner ) await message.update(update);
  else await executeAsGM("updateMessage", { messageId: message.id, update });
  return applyMechHit(mech, {
    base: flag.pendingHead, location: "head", primary: true, noPilotHit: true,
    source: t("MWD.Mech.Damage.FullHead", { source: flag.source }), attackerUuid: flag.attackerUuid
  });
}

/* -------------------------------------------- */
/*  Piloting Tests and falls                    */
/* -------------------------------------------- */

/**
 * Piloting Test (p. 48): a normal Test with the pilot's Piloting. Automatic failure while
 * unconscious or shut down; a damaged gyro gives –2.
 * @param {Actor} mech
 * @param {object} [options]
 * @param {boolean} [options.fallOnFailure=true]  Offer to resolve a fall if the Test fails.
 * @param {boolean} [options.pilotDamageOnFailure=false]  Failing hurts the pilot (after a fall).
 * @param {string} [options.label]
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollPilotingTest(mech, { fallOnFailure = true, pilotDamageOnFailure = false, label } = {}) {
  const pilot = getPilot(mech);
  if ( !pilot ) {
    warn("MWD.Mech.Warn.NoPilot");
    return null;
  }
  label ??= t("MWD.Mech.Piloting.Title");
  const failDamage = pilotDamageOnFailure
    ? { kind: "personal", value: PILOT_HIT_DAMAGE, ignoreArmor: true, mechScale: true, applyOn: "failure", source: label }
    : (fallOnFailure ? { kind: "fall", mechUuid: mech.uuid, applyOn: "failure", source: label } : null);

  if ( mech.system.status.shutdown || pilotUnconscious(pilot) ) {
    const reason = t(mech.system.status.shutdown ? "MWD.Mech.Warn.Shutdown" : "MWD.Mech.Warn.Unconscious");
    await ChatMessage.create(applyDefaultMode({
      speaker: ChatMessage.getSpeaker({ actor: mech }),
      content: `<div class="mwd-card"><header class="mwd-card-header"><h3>${label}</h3></header>`
        + `<p>${t("MWD.Mech.Piloting.AutoFail", { reason })}</p></div>`
    }));
    if ( failDamage?.kind === "fall" ) return resolveFall(mech);
    if ( failDamage ) return pilot.applyPersonalDamage(failDamage, { source: label, mechScale: true, ignoreArmor: true });
    return null;
  }

  const data = await dialog({
    title: label, icon: "fa-solid fa-person-falling",
    template: "mech-piloting.hbs",
    context: {
      difficulties: Object.entries(DIFFICULTIES).map(([value, cfg]) => ({ value, label: `${t(cfg.label)} (${cfg.dice}D6)` })),
      gyro: mech.system.crits.gyro ? -2 : 0
    },
    label: "MWD.Test.Roll"
  });
  if ( !data || (data === "ok") ) return null;
  const piloting = pilotParts(pilot, "piloting");
  const parts = [...piloting.parts];
  if ( mech.system.crits.gyro ) parts.push({ label: t("MWD.Mech.Crit.GyroShort"), value: -2 });
  const modifier = Number(data.modifier) || 0;
  if ( modifier ) parts.push({ label: t("MWD.Test.Modifier"), value: modifier });
  return rollTest(pilot, {
    label, parts, difficulty: data.difficulty, untrained: !piloting.skill, speaker: mech, damage: failDamage
  });
}

/**
 * A 'Mech falls (p. 49): its Punch damage to a random location, it is prone, and the pilot makes a
 * Piloting Test or takes 3 Physical damage and a CON Check.
 * @param {Actor} mech
 */
export async function resolveFall(mech) {
  const damage = Math.ceil(mech.system.details.tonnage / 30);
  await mech.update({ "system.status.prone": true });
  await applyMechHit(mech, { base: damage, table: "standard", source: t("MWD.Mech.Fall.Title") });
  if ( mech.system.status.destroyed ) return null;
  return rollPilotingTest(mech, {
    fallOnFailure: false, pilotDamageOnFailure: true, label: t("MWD.Mech.Fall.PilotTest")
  });
}

/* -------------------------------------------- */
/*  Narration upkeep                            */
/* -------------------------------------------- */

/**
 * Jump (p. 39–40): costs 1 Heat token and marks the 'Mech as having jumped until its next Narration.
 * @param {Actor} mech
 */
export async function jump(mech) {
  if ( !mech.system.details.jumpJets ) return warn("MWD.Mech.Warn.NoJumpJets");
  if ( !canAct(mech, getPilot(mech)) ) return;
  return mech.update({ "system.status.jumped": true, "system.heat.value": mech.system.heat.value + 1 });
}

/**
 * End of a Narration (p. 38, 47–48): CON Check for an unconscious pilot, engine heat, cooling down,
 * shutdown and ammo explosion avoidance rolls, and restarting a shut-down engine.
 * @param {Actor} mech
 * @returns {Promise<ChatMessage>}
 */
export async function endNarration(mech) {
  const system = mech.system;
  const pilot = getPilot(mech);
  const lines = [];
  const rolls = [];
  const wasShutdown = system.status.shutdown;
  let shutdown = wasShutdown;
  let pilotHits = 0;
  const updates = {};

  if ( pilot && pilotUnconscious(pilot) ) await pilot.rollConCheck();

  const heat = coolDown({ heat: system.heat.value, dissipation: system.details.heatDissipation, engineHits: system.crits.engine });
  if ( system.crits.engine ) lines.push(t("MWD.Mech.Heat.Engine"));
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
  const hasAmmoWeapons = mech.itemTypes.mechWeapon.some(w => w.system.usesAmmo && !w.system.destroyed);
  if ( effects.ammoRoll && hasAmmoWeapons ) {
    const r = await roll("2d6");
    rolls.push(r.roll);
    if ( r.total >= MECH_TARGET_NUMBER ) lines.push(t("MWD.Mech.Heat.AmmoAvoided", { roll: r.total }));
    else {
      pilotHits += 1;
      const ammo = mech.itemTypes.mechEquipment.find(e => (e.system.kind === "ammo") && !e.system.destroyed);
      lines.push(t("MWD.Mech.Heat.AmmoExploded", { roll: r.total }));
      if ( ammo ) await explodeAmmo(mech, ammo, lines);
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

  Object.assign(updates, {
    "system.heat.value": heat,
    "system.heat.level": heat,
    "system.status.shutdown": shutdown
  });
  await mech.update(updates);

  const content = await foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/chat/mech-damage-card.hbs`, {
    name: mech.name, title: t("MWD.Mech.EndNarration.Title", { name: mech.name }), lines, notes: []
  });
  const message = await ChatMessage.create(applyDefaultMode({ speaker: ChatMessage.getSpeaker({ actor: mech }), content, rolls }));
  if ( pilotHits && pilot ) {
    await pilot.applyPersonalDamage({ value: PILOT_HIT_DAMAGE * pilotHits }, { source: mech.name, mechScale: true, ignoreArmor: true });
  }
  return message;
}

/** Ammo explosion from heat (p. 48): the same effect as an ammo critical hit in that location. */
async function explodeAmmo(mech, ammo, lines) {
  const location = ammo.system.location || "torso";
  const updates = { [`system.locations.${location}.armorDamage`]: mech.system.locations[location].armor,
    [`system.locations.${location}.structureDamage`]: mech.system.locations[location].structure };
  if ( !MECH_LOCATIONS[location].limb ) updates["system.status.destroyed"] = true;
  if ( MECH_LOCATIONS[location].leg ) lines.push(t("MWD.Mech.Damage.Falls"));
  lines.push(t(MECH_LOCATIONS[location].limb ? "MWD.Mech.Crit.AmmoLimb" : "MWD.Mech.Crit.AmmoTorso", { location: locLabel(location) }));
  await mech.update(updates);
  const lost = mech.items.filter(i => ((i.type === "mechWeapon") && i.system.mounts[location])
    || ((i.type === "mechEquipment") && (i.system.location === location)));
  if ( lost.length ) await mech.updateEmbeddedDocuments("Item", lost.map(i => ({ _id: i.id, "system.destroyed": true })));
}

/* -------------------------------------------- */
/*  Chat                                        */
/* -------------------------------------------- */

/**
 * Wire up the buttons on 'Mech damage cards.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function onRenderMechCard(message, html) {
  const flag = message.getFlag(SYSTEM_ID, "mechDamage");
  if ( !flag ) return;
  const mech = fromUuidSync(flag.mechUuid);
  const attacker = flag.attackerUuid ? fromUuidSync(flag.attackerUuid) : null;
  const attackerPilot = attacker ? getPilot(attacker) : null;
  const bind = (selector, allowed, handler) => {
    const el = html.querySelector(selector);
    if ( !el ) return;
    if ( !allowed ) {
      el.remove();
      return;
    }
    for ( const button of el.querySelectorAll("button") ) {
      button.addEventListener("click", event => {
        event.preventDefault();
        button.disabled = true;
        handler();
      });
    }
  };
  bind(".mwd-head-controls", (flag.pendingHead > 0) && (game.user.isGM || !!attackerPilot?.isOwner),
    () => buyFullHeadHit(message));
  bind(".mwd-fall-controls", !!mech?.isOwner, () => resolveFall(mech));
  bind(".mwd-piloting-controls", !!mech?.isOwner, () => rollPilotingTest(mech));
}
