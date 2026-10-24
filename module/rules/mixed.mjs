/**
 * Mixed-scale combat between people and 'Mech-Scale units (p. 65–66). Pure functions only.
 */
import { MIXED_DAMAGE_MULTIPLIER, MIXED_DAMAGE_THRESHOLD } from "../config.mjs";

/**
 * 'Mech-Scale damage of an indirect hit on a person (p. 66, step 1). One weapon deals its listed
 * damage (1 if it is variable); a Weapon Group divides its damage, counting each "M" as 1, by
 * the number of weapons, rounding down, minimum 1.
 * @param {object} weapon
 * @param {number} weapon.base      Base damage of the group.
 * @param {number} [weapon.missiles=0]  Number of "M" in the damage code.
 * @param {number} [weapon.count=1]  Weapons in the group.
 * @returns {number}
 */
export function indirectMechDamage({ base, missiles = 0, count = 1 }) {
  if ( count <= 1 ) return missiles ? 1 : Math.max(0, base);
  return Math.max(1, Math.floor((base + missiles) / count));
}

/**
 * Personal-scale damage of an indirect hit (p. 66, step 2).
 * @param {object} weapon  See indirectMechDamage.
 * @returns {number}
 */
export function indirectPersonalDamage(weapon) {
  return indirectMechDamage(weapon) * MIXED_DAMAGE_MULTIPLIER;
}

/**
 * Damage types (B, E, M) of a Weapon Group, in listed order.
 * @param {string} types  e.g. "E, M".
 * @returns {string[]}
 */
export function weaponDamageTypes(types) {
  return [...new Set((types ?? "").toUpperCase().match(/[BEM]/g) ?? [])];
}

/**
 * Plot Point options for a person hit by a 'Mech-Scale weapon (p. 65). Player characters may spend
 * 1 to avoid an indirect hit or downgrade a direct hit, or 2 to avoid a direct hit; the GM may
 * only spend 1 to downgrade an NPC's direct hit.
 * @param {"direct"|"indirect"} hit
 * @param {boolean} playerCharacter
 * @returns {{key: "avoid"|"downgrade", cost: number}[]}
 */
export function hitTypeOptions(hit, playerCharacter) {
  if ( hit === "direct" ) {
    return playerCharacter ? [{ key: "downgrade", cost: 1 }, { key: "avoid", cost: 2 }] : [{ key: "downgrade", cost: 1 }];
  }
  return playerCharacter ? [{ key: "avoid", cost: 1 }] : [];
}

/**
 * Add a person's hit to the running total against a 'Mech-Scale unit (p. 66). At 20 or more the
 * unit takes 1 point of damage and 20 comes off the total.
 * @param {number} total  Running total before this hit.
 * @param {number} damage  Personal-scale damage of this hit.
 * @returns {{total: number, mechDamage: number}}
 */
export function accumulateSmallArms(total, damage) {
  const sum = Math.max(0, total) + Math.max(0, damage);
  if ( sum < MIXED_DAMAGE_THRESHOLD ) return { total: sum, mechDamage: 0 };
  return { total: sum - MIXED_DAMAGE_THRESHOLD, mechDamage: 1 };
}
