/**
 * Personal-scale damage (p. 36): armor type reduction, armor pips, then the Condition Monitor.
 * Pure functions only.
 */

/**
 * Work out where a hit's damage goes.
 *
 * @param {object} hit
 * @param {number} hit.damage            Weapon damage including bonuses.
 * @param {""|"B"|"E"} [hit.type=""]     Weapon damage type.
 * @param {boolean} [hit.fatigue=false]  F weapons go to the Fatigue track and skip armor.
 * @param {object|null} [armor]          Worn armor: {value, reduceB, reduceE}.
 * @param {object} [options]
 * @param {number} [options.toughness=0] Subtracted from Condition Monitor damage (Toughness trait).
 * @param {number} [options.glassJaw=0]  Added to Condition Monitor damage (Glass Jaw trait, p. 73).
 * @returns {{armor: number, physical: number, fatigue: number, reduced: number}}
 *   Pips of armor lost, Physical and Fatigue damage taken, and how much armor type stopped.
 */
export function resolvePersonalDamage({ damage, type = "", fatigue = false }, armor = null, { toughness = 0, glassJaw = 0 } = {}) {
  let remaining = Math.max(0, damage);
  const result = { armor: 0, physical: 0, fatigue: 0, reduced: 0 };

  if ( fatigue ) {
    result.fatigue = (remaining > 0) ? Math.max(0, remaining - toughness + glassJaw) : 0;
    return result;
  }

  const armorLeft = armor?.value ?? 0;
  if ( (armorLeft > 0) || armor?.natural ) {
    const reduction = (type === "B") ? (armor.reduceB ?? 0) : (type === "E") ? (armor.reduceE ?? 0) : 0;
    result.reduced = Math.min(reduction, remaining);
    remaining -= result.reduced;
    result.armor = Math.min(armorLeft, remaining);
    remaining -= result.armor;
  }
  result.physical = (remaining > 0) ? Math.max(0, remaining - toughness + glassJaw) : 0;
  return result;
}

/**
 * Personal Combat movement cost between range brackets (p. 35): Close↔Near costs 1, Near↔Far costs 3.
 * @param {"close"|"near"|"far"} from
 * @param {"close"|"near"|"far"} to
 * @returns {number}
 */
export function personalMoveCost(from, to) {
  const steps = { close: 0, near: 1, far: 4 };
  return Math.abs(steps[to] - steps[from]);
}
