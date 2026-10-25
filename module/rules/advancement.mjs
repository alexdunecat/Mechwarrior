/**
 * Character Advancement with XP (p. 77–78). Pure functions only.
 */
import { ADVANCEMENT, RANGE_CODES } from "../config.mjs";
import { hardwareCost } from "./creation.mjs";

/**
 * XP to raise an Attribute to a new rank (p. 77): ×1.5 rounded up for ranks 2–3, ×3 for 4–5,
 * ×6 for 6.
 * @param {number} newRank
 * @returns {number|null}  Null above the maximum of 6.
 */
export function attributeXpCost(newRank) {
  if ( (newRank < 2) || (newRank > ADVANCEMENT.attributeMax) ) return null;
  if ( newRank <= 3 ) return Math.ceil(newRank * 1.5);
  if ( newRank <= 5 ) return newRank * 3;
  return newRank * 6;
}

/**
 * XP to raise a Skill to a new rating (p. 77): the new rating ×1.5 rounded up; a new Skill at 1
 * costs 2.
 * @param {number} newRank
 * @returns {number|null}  Null above the maximum of 6.
 */
export function skillXpCost(newRank) {
  if ( (newRank < 1) || (newRank > ADVANCEMENT.skillMax) ) return null;
  if ( newRank === 1 ) return ADVANCEMENT.newSkill;
  return Math.ceil(newRank * 1.5);
}

/**
 * XP to acquire a unit (p. 78): purchase costs its Hardware Points, +2 for a 'Mech; salvage costs
 * its Hardware Points –1 (minimum 0), with repair or rebuild paid separately.
 * @param {"buy"|"salvage"} how
 * @param {string} type
 * @param {string} weightClass
 * @returns {number}
 */
export function hardwareXpCost(how, type, weightClass) {
  const base = hardwareCost(type, weightClass);
  if ( how === "salvage" ) return Math.max(0, base - ADVANCEMENT.salvageDiscount);
  return base + ((type === "mech") ? ADVANCEMENT.mechPurchase : 0);
}

/**
 * Hardware Points a Dispossessed MechWarrior pays for their first 'Mech during play (p. 76).
 * @param {string} weightClass
 * @returns {number}
 */
export function dispossessedCost(weightClass) {
  return Math.max(0, hardwareCost("mech", weightClass) - ADVANCEMENT.dispossessedDiscount);
}

/**
 * XP to fix a unit (p. 78): 1 to repair functional Hardware, 2 to rebuild destroyed Hardware.
 * @param {boolean} destroyed
 * @returns {number}
 */
export function repairXpCost(destroyed) {
  return destroyed ? ADVANCEMENT.rebuild : ADVANCEMENT.repair;
}

/**
 * The range code one step better than this one (p. 78): "–1" becomes "OK"; "—" stays.
 * @param {string} code  Key of RANGE_CODES.
 * @returns {string}
 */
export function improveRange(code) {
  if ( (code === "x") || !(code in RANGE_CODES) || (Number(code) >= 0) ) return code;
  return String(Math.min(0, Number(code) + 1));
}

/**
 * Whether a weapon can take a customization (p. 78): each once, not on weapons invented at
 * character creation, and Range only where some bracket has a penalty.
 * @param {object} weapon  Weapon item system data.
 * @param {"accuracy"|"lethality"|"range"} mod
 * @returns {boolean}
 */
export function canCustomize(weapon, mod) {
  if ( weapon.unique ) return false;
  if ( mod === "range" ) {
    if ( weapon.mods?.range ) return false;
    return Object.values(weapon.ranges ?? {}).some(code => (code !== "x") && (Number(code) < 0));
  }
  return !weapon.mods?.[mod];
}

/* -------------------------------------------- */
/*  Hardware condition                          */
/* -------------------------------------------- */

/**
 * How a unit stands, from its system data.
 * @param {string} type
 * @param {object} system
 * @returns {{damaged: boolean, destroyed: boolean}}
 */
export function unitCondition(type, system) {
  const destroyed = !!system.status?.destroyed;
  const locations = Object.values(system.locations ?? {});
  let damaged = locations.some(l => (l.armorDamage > 0) || (l.structureDamage > 0));
  if ( type === "fighter" ) damaged ||= (system.structure?.damage ?? 0) > 0;
  damaged ||= Object.entries(system.crits ?? {}).some(([k, v]) => (k !== "engineFresh") && (Number(v) > 0));
  damaged ||= (system.smallArms ?? 0) > 0;
  return { damaged: damaged || destroyed, destroyed };
}

/**
 * The update that repairs or rebuilds a unit to full condition: all Armor and Structure back,
 * critical hits cleared, Heat and statuses reset.
 * @param {string} type
 * @param {object} system
 * @returns {object}  Update data for the unit actor.
 */
export function repairUpdate(type, system) {
  const update = { "system.smallArms": 0 };
  for ( const key of Object.keys(system.locations ?? {}) ) {
    update[`system.locations.${key}.armorDamage`] = 0;
    if ( type !== "fighter" ) update[`system.locations.${key}.structureDamage`] = 0;
  }
  if ( type === "fighter" ) update["system.structure.damage"] = 0;
  for ( const [key, value] of Object.entries(system.crits ?? {}) ) {
    update[`system.crits.${key}`] = (typeof value === "boolean") ? false : 0;
  }
  if ( system.heat ) {
    update["system.heat.value"] = 0;
    update["system.heat.level"] = 0;
  }
  for ( const key of Object.keys(system.status ?? {}) ) update[`system.status.${key}`] = false;
  return update;
}
