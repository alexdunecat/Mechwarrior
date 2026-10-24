import { DIFFICULTIES } from "../config.mjs";

/**
 * Sum of an array of die results.
 * @param {number[]} dice
 * @returns {number}
 */
export function sumDice(dice) {
  return dice.reduce((total, d) => total + d, 0);
}

/**
 * Opposing dice for a difficulty key, or a raw dice count.
 * @param {string|number} difficulty
 * @returns {number}
 */
export function opposingDice(difficulty) {
  if ( typeof difficulty === "number" ) return difficulty;
  return DIFFICULTIES[difficulty]?.dice ?? DIFFICULTIES.average.dice;
}

/**
 * Resolve a Test (p. 32): 2D6 + bonus vs the opposing roll. Ties go to the actor, a natural 2
 * always fails, and an untrained character automatically fails a Hard Test (p. 33).
 *
 * @param {object} test
 * @param {number[]} test.dice         The actor's two dice.
 * @param {number} test.bonus          Skill Bonus plus all modifiers.
 * @param {number[]} test.opposingDice The GM's dice or the defender's dice.
 * @param {number} [test.opposingBonus=0] Defender's bonus in opposed rolls.
 * @param {boolean} [test.untrained=false]
 * @param {string|null} [test.difficulty=null]
 * @returns {{natural: number, total: number, opposingTotal: number, success: boolean,
 *            margin: number, autoFail: "natural2"|"untrainedHard"|null}}
 */
export function resolveTest({ dice, bonus, opposingDice, opposingBonus = 0, untrained = false, difficulty = null }) {
  const natural = sumDice(dice);
  const total = natural + bonus;
  const opposingTotal = sumDice(opposingDice) + opposingBonus;
  let autoFail = null;
  if ( natural === 2 ) autoFail = "natural2";
  else if ( untrained && (difficulty === "hard") ) autoFail = "untrainedHard";
  const success = !autoFail && (total >= opposingTotal);
  return { natural, total, opposingTotal, success, margin: total - opposingTotal, autoFail };
}

/**
 * Indices of dice to reroll for an Edge spend (p. 34).
 * @param {number[]} dice
 * @param {"first"|"second"|"both"|"highest"|"lowest"|"all"} which
 * @returns {number[]}
 */
export function edgeRerollIndices(dice, which) {
  switch ( which ) {
    case "first": return [0];
    case "second": return dice.length > 1 ? [1] : [0];
    case "both":
    case "all": return dice.map((_d, i) => i);
    case "highest": return [dice.indexOf(Math.max(...dice))];
    case "lowest": return [dice.indexOf(Math.min(...dice))];
    default: return [];
  }
}

/**
 * Replace selected dice with new results.
 * @param {number[]} dice
 * @param {number[]} indices
 * @param {number[]} results  One new result per index.
 * @returns {number[]}
 */
export function replaceDice(dice, indices, results) {
  const out = [...dice];
  indices.forEach((idx, n) => { out[idx] = results[n]; });
  return out;
}

/**
 * Whether an actor may spend Edge on a roll: once per roll, and no more than EDG per session.
 * @param {object} state
 * @param {number} state.edg     EDG rating.
 * @param {number} state.spent   Edge already spent this session.
 * @param {boolean} state.usedOnRoll
 * @returns {boolean}
 */
export function canSpendEdge({ edg, spent, usedOnRoll }) {
  return !usedOnRoll && (spent < edg);
}

/**
 * Melee Combat damage bonus from STR (p. 35): +1 at STR 3–4, +2 at STR 5–6.
 * @param {number} str
 * @returns {number}
 */
export function meleeStrBonus(str) {
  if ( str >= 5 ) return 2;
  if ( str >= 3 ) return 1;
  return 0;
}

/**
 * Parse a stored weapon range code into a modifier.
 * @param {string} code  "0", "-2", or "x".
 * @returns {number|null}  null when the weapon cannot be used at that range.
 */
export function rangeModifier(code) {
  if ( (code === "x") || (code === null) || (code === undefined) || (code === "") ) return null;
  const n = Number(code);
  return Number.isFinite(n) ? n : null;
}
