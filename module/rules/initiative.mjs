/**
 * Turn order (p. 30, 55). Pure functions only.
 */

/**
 * Fixed Initiative value for narrative turn order (p. 30): each round starts with the GM's
 * characters, then players go in seating order.
 * @param {object} combatant
 * @param {boolean} combatant.isPlayer  Whether a player owns the combatant.
 * @param {number} [combatant.seat=0]   Player's position at the table, 0 = first after the GM.
 * @returns {number}
 */
export function narrativeInitiative({ isPlayer, seat = 0 }) {
  if ( !isPlayer ) return 100;
  return 50 - Math.max(0, seat);
}

/**
 * Sort combatants for rolled Initiative (p. 55): highest result first, ties to the higher EDG,
 * then the higher RFL, then seating order. Combatants without Initiative go last.
 * @param {{initiative: number|null, edg?: number, rfl?: number, seat?: number}} a
 * @param {{initiative: number|null, edg?: number, rfl?: number, seat?: number}} b
 * @returns {number}
 */
export function compareInitiative(a, b) {
  const ia = Number.isFinite(a.initiative) ? a.initiative : -Infinity;
  const ib = Number.isFinite(b.initiative) ? b.initiative : -Infinity;
  if ( ia !== ib ) return ib - ia;
  if ( (a.edg ?? 0) !== (b.edg ?? 0) ) return (b.edg ?? 0) - (a.edg ?? 0);
  if ( (a.rfl ?? 0) !== (b.rfl ?? 0) ) return (b.rfl ?? 0) - (a.rfl ?? 0);
  const sa = a.seat ?? 0;
  const sb = b.seat ?? 0;
  if ( sa === sb ) return 0;
  return (sa < sb) ? -1 : 1;
}
