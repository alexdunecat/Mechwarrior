import { DIFFICULTIES, SYSTEM_ID } from "../config.mjs";
import { canSpendEdge, edgeRerollIndices, opposingDice, replaceDice, resolveTest } from "../rules/tests.mjs";

const CARD_TEMPLATE = `systems/${SYSTEM_ID}/templates/chat/test-card.hbs`;

/**
 * @typedef {object} TestConfig
 * @property {string} label                  Title shown on the card, e.g. "Small Arms".
 * @property {{label: string, value: number}[]} parts  Breakdown of the bonus.
 * @property {string|null} [difficulty]       Key of DIFFICULTIES, or null when `dice` is given.
 * @property {number} [dice]                  Opposing dice count when no difficulty applies.
 * @property {string} [opposingLabel]         Caption for the opposing roll.
 * @property {boolean} [untrained=false]
 * @property {string} [kind="test"]           "test" or "kia".
 */

/**
 * Roll a Test for an actor and post it to chat.
 * @param {Actor} actor
 * @param {TestConfig} config
 * @returns {Promise<ChatMessage>}
 */
export async function rollTest(actor, config) {
  const bonus = config.parts.reduce((total, p) => total + p.value, 0);
  const diceCount = config.dice ?? opposingDice(config.difficulty ?? "average");
  const actorRoll = await new Roll("2d6").evaluate();
  const opposingRoll = await new Roll(`${diceCount}d6`).evaluate();

  const state = {
    kind: config.kind ?? "test",
    actorUuid: actor.uuid,
    label: config.label,
    parts: config.parts,
    bonus,
    difficulty: config.difficulty ?? null,
    opposingLabel: config.opposingLabel ?? null,
    untrained: !!config.untrained,
    dice: diceResults(actorRoll),
    opposingDice: diceResults(opposingRoll),
    edge: null
  };

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await renderCard(state),
    rolls: [actorRoll, opposingRoll],
    flags: { [SYSTEM_ID]: { test: state } }
  };
  applyDefaultMode(messageData);
  return ChatMessage.create(messageData);
}

/* -------------------------------------------- */

function diceResults(roll) {
  return roll.dice.flatMap(d => d.results.map(r => r.result));
}

/** Apply the user's current chat visibility mode (V13 rollMode, V14 messageMode). */
function applyDefaultMode(messageData) {
  if ( typeof ChatMessage.applyMode === "function" ) ChatMessage.applyMode(messageData);
  else ChatMessage.applyRollMode(messageData, game.settings.get("core", "rollMode"));
}

/* -------------------------------------------- */

/**
 * Build the card's template context from a stored test state.
 * @param {object} state
 * @returns {object}
 */
export function cardContext(state) {
  const result = resolveTest({
    dice: state.dice,
    bonus: state.bonus,
    opposingDice: state.opposingDice,
    untrained: state.untrained,
    difficulty: state.difficulty
  });
  const difficulty = DIFFICULTIES[state.difficulty];
  return {
    ...state,
    result,
    opposingCaption: state.opposingLabel
      ?? (difficulty ? game.i18n.format("MWD.Chat.Opposing", {
        difficulty: game.i18n.localize(difficulty.label), dice: state.opposingDice.length
      }) : game.i18n.format("MWD.Chat.OpposingDice", { dice: state.opposingDice.length })),
    autoFailLabel: result.autoFail ? game.i18n.localize(`MWD.Chat.AutoFail.${result.autoFail}`) : null,
    edgeLabel: state.edge ? game.i18n.localize(`MWD.Edge.Used.${state.edge}`) : null,
    canEdge: !state.edge,
    isKia: state.kind === "kia"
  };
}

async function renderCard(state) {
  const render = foundry.applications.handlebars.renderTemplate;
  return render(CARD_TEMPLATE, cardContext(state));
}

/* -------------------------------------------- */

/**
 * Wire up Edge buttons on rendered test cards.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function onRenderChatMessage(message, html) {
  const state = message.getFlag(SYSTEM_ID, "test");
  if ( !state ) return;
  const controls = html.querySelector(".mwd-edge-controls");
  if ( !controls ) return;
  const actor = fromUuidSync(state.actorUuid);
  const allowed = actor?.isOwner && actor.system.usesEdge && message.isOwner && canSpendEdge({
    edg: actor.system.attributes.edg.value, spent: actor.system.edge.spent, usedOnRoll: !!state.edge
  });
  if ( !allowed ) {
    controls.remove();
    return;
  }
  for ( const button of controls.querySelectorAll("[data-edge]") ) {
    button.addEventListener("click", event => {
      event.preventDefault();
      spendEdge(message, button.dataset.edge);
    });
  }
}

/**
 * Spend a point of Edge to reroll dice on a test card (p. 34).
 * @param {ChatMessage} message
 * @param {"first"|"second"|"both"|"highest"|"all"} which  The first three reroll the actor's
 *   dice; "highest" and "all" force a reroll of the opposing dice.
 */
export async function spendEdge(message, which) {
  const state = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "test"));
  const actor = await fromUuid(state.actorUuid);
  if ( !actor ) return;
  const { edg } = actor.system.attributes;
  if ( !canSpendEdge({ edg: edg.value, spent: actor.system.edge.spent, usedOnRoll: !!state.edge }) ) {
    ui.notifications.warn("MWD.Edge.NoneLeft", { localize: true });
    return;
  }

  const own = ["first", "second", "both"].includes(which);
  const key = own ? "dice" : "opposingDice";
  const indices = edgeRerollIndices(state[key], which);
  const roll = await new Roll(`${indices.length}d6`).evaluate();
  if ( game.dice3d ) await game.dice3d.showForRoll(roll, game.user, true);
  state[key] = replaceDice(state[key], indices, diceResults(roll));
  state.edge = which;

  await actor.update({ "system.edge.spent": actor.system.edge.spent + 1 });
  await message.update({
    content: await renderCard(state),
    [`flags.${SYSTEM_ID}.test`]: state
  });
}
