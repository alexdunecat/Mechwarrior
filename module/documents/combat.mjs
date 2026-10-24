import { SYSTEM_ID } from "../config.mjs";
import { compareInitiative, narrativeInitiative } from "../rules/initiative.mjs";

/** Formula for the optional rolled Initiative (p. 55). */
export const INITIATIVE_FORMULA = "2d6 + @initiativeBonus";

function initiativeMode() {
  return game.settings.get(SYSTEM_ID, "initiativeMode");
}

/**
 * Position of a combatant's owning player at the table: non-GM users in the order Foundry lists them.
 * @param {Combatant} combatant
 * @returns {number}  0-based seat, or -1 for GM-controlled combatants.
 */
function seatOf(combatant) {
  const actor = combatant.actor;
  if ( !actor ) return -1;
  const players = game.users.filter(u => !u.isGM);
  return players.findIndex(u => (u.character === actor) || actor.testUserPermission(u, "OWNER"));
}

function sortKey(combatant) {
  const attrs = combatant.actor?.system.attributes;
  const seat = seatOf(combatant);
  return {
    initiative: combatant.initiative,
    edg: attrs?.edg.total ?? 0,
    rfl: attrs?.rfl.total ?? 0,
    seat: (seat < 0) ? Infinity : seat
  };
}

/**
 * Combat with the book's turn-order modes: narrative (GM first, then players by seat),
 * rolled (2D6 + Initiative bonus, ties by EDG then RFL) and cinematic (order set by hand).
 */
export class MWDCombat extends Combat {

  /** @override */
  async rollInitiative(ids, options = {}) {
    if ( initiativeMode() === "rolled" ) return super.rollInitiative(ids, options);
    ids = (typeof ids === "string") ? [ids] : ids;
    const updates = ids.map(id => this.combatants.get(id)).filter(Boolean).map(c => {
      const seat = seatOf(c);
      return { _id: c.id, initiative: narrativeInitiative({ isPlayer: seat >= 0, seat }) };
    });
    if ( updates.length ) await this.updateEmbeddedDocuments("Combatant", updates);
    return this;
  }

  /**
   * Sort by Initiative, then EDG, RFL and seating order. Called unbound by Combat#setupTurns.
   * @override
   */
  _sortCombatants(a, b) {
    return compareInitiative(sortKey(a), sortKey(b));
  }
}
