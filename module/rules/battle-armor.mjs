/**
 * Battle armor rules (p. 217–220). Pure functions only.
 *
 * A suit's Armor is a number of pips of six segments each. Personal Combat damage fills one segment
 * per point; 'Mech-Scale damage fills six per point, finishing a partly filled pip first. Once
 * every segment is filled the suit is destroyed; damage beyond that reaches the wearer.
 */
import { BATTLE_ARMOR } from "../config.mjs";

const SEGMENTS = BATTLE_ARMOR.segments;

/**
 * Segments of Armor a suit has left.
 * @param {{pips: number, segments: number}} armor  Pips and segments filled in.
 * @returns {number}
 */
export function segmentsLeft({ pips, segments }) {
  return Math.max(0, (pips * SEGMENTS) - segments);
}

/**
 * Personal Combat damage to a suit (p. 217): one segment per point, the rest to the wearer.
 * @param {{pips: number, segments: number}} armor
 * @param {number} damage
 * @returns {{segments: number, overflow: number, destroyed: boolean}}  Segments filled by this hit,
 *   damage left for the wearer's Condition Monitor, and whether the suit is now destroyed.
 */
export function personalSuitDamage(armor, damage) {
  const left = segmentsLeft(armor);
  const segments = Math.min(left, Math.max(0, damage));
  return { segments, overflow: Math.max(0, damage) - segments, destroyed: (left > 0) && (segments >= left) };
}

/**
 * 'Mech-Scale damage to a suit (p. 219): each point fills a whole pip, or the six segments that
 * complete a partly filled pip and spill into the next.
 * @param {{pips: number, segments: number}} armor
 * @param {number} points
 * @returns {{segments: number, overflow: number, destroyed: boolean}}  Segments filled, points of
 *   damage left over once the suit is destroyed, and whether it is destroyed.
 */
export function mechSuitDamage(armor, points) {
  const left = segmentsLeft(armor);
  const needed = Math.ceil(left / SEGMENTS);
  const hit = Math.max(0, points);
  if ( hit < needed ) return { segments: hit * SEGMENTS, overflow: 0, destroyed: false };
  return { segments: left, overflow: hit - needed, destroyed: left > 0 };
}

/**
 * Pips of a suit's Armor for display: each with how many of its six segments are filled.
 * @param {{pips: number, segments: number}} armor
 * @returns {{index: number, filled: number, full: boolean}[]}
 */
export function suitPips({ pips, segments }) {
  return Array.from({ length: pips }, (_v, index) => {
    const filled = Math.min(SEGMENTS, Math.max(0, segments - (index * SEGMENTS)));
    return { index, filled, full: filled === SEGMENTS };
  });
}

/**
 * Maximum Movement of battle armor in 'Mech-Scale Combat (p. 218).
 * @param {boolean} jumpJets
 * @returns {number}
 */
export function suitMaxMovement(jumpJets) {
  return jumpJets ? BATTLE_ARMOR.maxMovement.jump : BATTLE_ARMOR.maxMovement.standard;
}

/**
 * Whether a torso hit on an OmniMech carrying battle armor strikes a suit instead (p. 218): 1D6 of 5–6.
 * @param {number} d6
 * @returns {boolean}
 */
export function mountedSuitHit(d6) {
  return d6 >= BATTLE_ARMOR.mountedHit;
}
