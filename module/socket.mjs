import { SYSTEM_ID } from "./config.mjs";

const CHANNEL = `system.${SYSTEM_ID}`;

/**
 * Requests players may ask the active GM to carry out on their behalf.
 * Each handler re-checks what it is allowed to touch.
 */
const HANDLERS = {
  /**
   * Update a system card that the requesting user does not own (a defender spending Edge, a
   * player buying full head damage). Only the card's content and its own system flag change.
   */
  async updateMessage({ messageId, update }) {
    const message = game.messages.get(messageId);
    const flags = message?.flags[SYSTEM_ID];
    if ( !flags ) return;
    const allowed = {};
    if ( ("content" in update) && flags.test ) allowed.content = update.content;
    for ( const [key, value] of Object.entries(update) ) {
      const [, flag] = key.match(new RegExp(`^flags\\.${SYSTEM_ID}\\.(test|mechDamage)\\b`)) ?? [];
      if ( flag && (flag in flags) ) allowed[key] = value;
    }
    if ( !foundry.utils.isEmpty(allowed) ) await message.update(allowed);
  },

  /** Add to (or take from) the GM's Plot Point pool. */
  async adjustGmPool({ delta }) {
    const current = game.settings.get(SYSTEM_ID, "gmPlotPoints");
    await game.settings.set(SYSTEM_ID, "gmPlotPoints", Math.max(0, current + Number(delta || 0)));
  }
};

export function registerSocket() {
  game.socket.on(CHANNEL, ({ action, data }) => {
    if ( game.user !== game.users.activeGM ) return;
    HANDLERS[action]?.(data);
  });
}

/**
 * Run an action on the active GM's client (or locally when this user is that GM).
 * @param {string} action
 * @param {object} data
 */
export async function executeAsGM(action, data) {
  if ( game.user === game.users.activeGM ) return HANDLERS[action]?.(data);
  if ( !game.users.activeGM ) {
    ui.notifications.warn("MWD.NoActiveGM", { localize: true });
    return;
  }
  game.socket.emit(CHANNEL, { action, data });
}
