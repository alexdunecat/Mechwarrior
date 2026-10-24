import { SYSTEM_ID } from "./config.mjs";

const CHANNEL = `system.${SYSTEM_ID}`;

/**
 * Requests players may ask the active GM to carry out on their behalf.
 * Each handler re-checks what it is allowed to touch.
 */
const HANDLERS = {
  /** Update a test card that the requesting user does not own (e.g. a defender spending Edge). */
  async updateMessage({ messageId, update }) {
    const message = game.messages.get(messageId);
    if ( !message?.getFlag(SYSTEM_ID, "test") ) return;
    const allowed = {};
    if ( "content" in update ) allowed.content = update.content;
    const key = `flags.${SYSTEM_ID}.test`;
    if ( key in update ) allowed[key] = update[key];
    await message.update(allowed);
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
