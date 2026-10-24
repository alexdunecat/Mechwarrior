import { CONDITION_ROWS, PIPS_PER_ROW, STAGGERED_CON_CHECK } from "../config.mjs";

/**
 * Pips crossed off the first two rows of a damage track by a low STR (Physical) or WIL (Fatigue)
 * rating at character creation (p. 70).
 * @param {number} rating
 * @returns {[number, number]} Pips blocked on row 1 and row 2.
 */
export function blockedPipsForRating(rating) {
  if ( rating >= 5 ) return [0, 0];
  if ( rating === 4 ) return [1, 0];
  if ( rating === 3 ) return [1, 1];
  if ( rating === 2 ) return [2, 1];
  return [2, 2];
}

/**
 * Lay out a Condition Monitor track: four rows of three pips plus the Staggered pip.
 * Pips blocked by the governing attribute or permanently lost (p. 37) are crossed off first;
 * damage then fills the remaining pips in reading order.
 *
 * @param {object} options
 * @param {number} options.rating   STR for the Physical track, WIL for the Fatigue track.
 * @param {number} [options.damage] Pips of damage taken.
 * @param {number} [options.lost]   Pips permanently lost ("I'll never be the same").
 * @returns {{
 *   rows: {index: number, modifier: number, conCheck: number, filled: boolean,
 *          pips: {index: number|null, blocked: boolean, filled: boolean}[]}[],
 *   staggeredPip: {index: number|null, blocked: boolean, filled: boolean},
 *   capacity: number, damage: number, overflow: number,
 *   modifier: number, staggered: boolean, beyond: boolean, conCheck: number|null
 * }}
 */
export function buildTrack({ rating, damage = 0, lost = 0 }) {
  const blockedRows = blockedPipsForRating(rating);
  let toLose = Math.max(0, lost);
  let remainingDamage = Math.max(0, damage);
  let damageIndex = 0;

  const makePip = blocked => {
    if ( !blocked && toLose > 0 ) {
      toLose -= 1;
      blocked = true;
    }
    if ( blocked ) return { index: null, blocked: true, filled: true };
    const pip = { index: damageIndex, blocked: false, filled: remainingDamage > 0 };
    damageIndex += 1;
    if ( remainingDamage > 0 ) remainingDamage -= 1;
    return pip;
  };

  const rows = CONDITION_ROWS.map((row, r) => {
    const pips = [];
    for ( let p = 0; p < PIPS_PER_ROW; p++ ) pips.push(makePip(p < (blockedRows[r] ?? 0)));
    return { index: r, modifier: row.modifier, conCheck: row.conCheck, pips, filled: pips.every(p => p.filled) };
  });
  const staggeredPip = makePip(false);

  const capacity = damageIndex;
  const clampedDamage = Math.min(Math.max(0, damage), capacity);
  const overflow = Math.max(0, damage - capacity);
  const filledRows = rows.filter(r => r.filled);
  const deepest = filledRows.at(-1);
  const staggered = staggeredPip.filled;

  return {
    rows,
    staggeredPip,
    capacity,
    damage: clampedDamage,
    overflow,
    modifier: deepest ? deepest.modifier : 0,
    staggered,
    beyond: overflow > 0,
    conCheck: staggered ? STAGGERED_CON_CHECK : (deepest ? deepest.conCheck : null)
  };
}

/**
 * Total wound modifier: the worst modifier on each track, added across tracks (p. 37).
 * @param {...{modifier: number}} tracks
 * @returns {number}
 */
export function woundModifier(...tracks) {
  return tracks.reduce((total, t) => total + (t?.modifier ?? 0), 0);
}

/**
 * New damage value after clicking a pip on the monitor: clicking the last filled pip clears it,
 * clicking any other pip fills the track up to and including it.
 * @param {number} current   Current damage.
 * @param {number} pipIndex  Zero-based damage index of the clicked pip.
 * @returns {number}
 */
export function toggleDamagePip(current, pipIndex) {
  return (pipIndex === current - 1) ? pipIndex : pipIndex + 1;
}

/**
 * Number of opposing dice for the Killed in Action Test (p. 37): starts Easy (2D6) and gets
 * harder each time the character takes more Physical damage while Staggered.
 * @param {number} previousChecks  KIA Tests already made since becoming Staggered.
 * @returns {number}
 */
export function kiaDice(previousChecks) {
  return 2 + Math.max(0, previousChecks);
}
