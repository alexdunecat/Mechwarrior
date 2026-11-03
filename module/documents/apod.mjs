import { CLAN_EQUIPMENT, SYSTEM_ID } from "../config.mjs";
import { applyDefaultMode } from "../dice/test-roll.mjs";
import { executeAsGM } from "../socket.mjs";
import { canAct, getPilot, roll, t, warn } from "./unit.mjs";

/**
 * Anti-Personnel Pods (Clan Invasion appendix, p. 216): an explosive charge against infantry
 * climbing a 'Mech. Triggering one rolls 1D6: on 1–3 it deals (result × 5) Personal Combat damage
 * to each targeted character, on 4–6 nothing. An A-Pod is one-shot: its pip is marked off even if
 * it deals no damage.
 */

const TEMPLATE = `systems/${SYSTEM_ID}/templates/chat/apod-card.hbs`;

/**
 * Damage of an A-Pod blast for a 1D6 roll.
 * @param {number} d6
 * @returns {number}
 */
export function apodDamage(d6) {
  return d6 <= CLAN_EQUIPMENT.apodMax ? d6 * CLAN_EQUIPMENT.apodMultiplier : 0;
}

/**
 * Trigger an A-Pod against the targeted characters (or battle armor wearers).
 * @param {Actor} unit
 * @param {Item} pod  A mechEquipment item of kind "apod".
 * @returns {Promise<ChatMessage|null>}
 */
export async function fireAPod(unit, pod) {
  if ( !canAct(unit, getPilot(unit)) ) return null;
  if ( pod.system.destroyed ) return warn("MWD.Clan.APod.Destroyed") || null;
  const shots = pod.system.shots;
  if ( pod.system.tracksShots && (shots.spent >= shots.max) ) return warn("MWD.Clan.APod.Empty") || null;
  const targets = Array.from(game.user.targets).map(token => token.actor)
    .filter(a => a && (a.isPerson || (a.type === "battleArmor")));
  if ( pod.system.tracksShots ) await pod.update({ "system.shots.spent": shots.spent + 1 });
  const r = await roll("1d6");
  const state = {
    source: `${unit.name}: ${pod.name}`,
    roll: r.total,
    damage: apodDamage(r.total),
    targets: targets.map(a => ({ uuid: a.uuid, name: a.name, applied: false }))
  };
  return ChatMessage.create(applyDefaultMode({
    speaker: ChatMessage.getSpeaker({ actor: unit }),
    content: await renderAPod(state),
    rolls: [r.roll],
    flags: { [SYSTEM_ID]: { apod: state } }
  }));
}

/** @param {object} state */
async function renderAPod(state) {
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    ...state,
    result: t(state.damage ? "MWD.Clan.APod.Hit" : "MWD.Clan.APod.Miss", { roll: state.roll, n: state.damage })
  });
}

/**
 * Wire up the per-target apply buttons on A-Pod cards: each target's owner applies the damage.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function onRenderAPodCard(message, html) {
  const state = message.getFlag(SYSTEM_ID, "apod");
  if ( !state ) return;
  for ( const button of html.querySelectorAll("[data-apod-target]") ) {
    const uuid = button.dataset.apodTarget;
    const target = fromUuidSync(uuid);
    if ( !target?.isOwner ) {
      button.remove();
      continue;
    }
    button.addEventListener("click", async event => {
      event.preventDefault();
      button.disabled = true;
      const fresh = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "apod"));
      const entry = fresh.targets.find(e => e.uuid === uuid);
      if ( !entry || entry.applied ) return;
      entry.applied = true;
      const update = { content: await renderAPod(fresh), [`flags.${SYSTEM_ID}.apod`]: fresh };
      if ( message.isOwner ) await message.update(update);
      else await executeAsGM("updateMessage", { messageId: message.id, update });
      await target.applyPersonalDamage({ value: fresh.damage }, { source: fresh.source });
    });
  }
}
