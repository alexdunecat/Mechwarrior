import { DIFFICULTIES, SYSTEM_ID } from "../config.mjs";
import { executeAsGM } from "../socket.mjs";
import { canSpendEdge, edgeRerollIndices, opposingDice, replaceDice, resolveTest } from "../rules/tests.mjs";

const CARD_TEMPLATE = `systems/${SYSTEM_ID}/templates/chat/test-card.hbs`;

/**
 * @typedef {object} TestConfig
 * @property {string} label                  Title shown on the card, e.g. "Small Arms".
 * @property {{label: string, value: number}[]} parts  Breakdown of the bonus.
 * @property {string|null} [difficulty]       Key of DIFFICULTIES, or null when `dice` is given.
 * @property {number} [dice]                  Opposing dice count when no difficulty applies.
 * @property {string} [opposingLabel]         Caption for the opposing roll.
 * @property {{label: string, value: number}[]} [opposingParts]  Defender's bonus breakdown.
 * @property {Actor|null} [target]            Defending actor in opposed rolls (who may spend Edge).
 * @property {Actor|null} [applyTo]           Actor that takes the damage, if not the target (a 'Mech).
 * @property {string} [targetName]            Name shown for the target, if not the target's own.
 * @property {Actor} [speaker]                Actor the card speaks as, e.g. the 'Mech rather than its pilot.
 * @property {number} [minNatural=0]          Lowest natural roll that can succeed (Disengaged targets).
 * @property {object|null} [damage]           Damage dealt: personal {value, type, fatigue, source},
 *   'Mech-scale {kind: "mech", ...} or a fall {kind: "fall", mechUuid}. `applyOn: "failure"` offers it
 *   when the Test fails instead of when it succeeds.
 * @property {boolean} [untrained=false]
 * @property {string} [kind="test"]           "test", "attack", "kia" or "con".
 */

/**
 * Roll a Test for an actor and post it to chat.
 * @param {Actor} actor
 * @param {TestConfig} config
 * @returns {Promise<ChatMessage>}
 */
export async function rollTest(actor, config) {
  const bonus = sumParts(config.parts);
  const opposingParts = config.opposingParts ?? [];
  const diceCount = config.dice ?? opposingDice(config.difficulty ?? "average");
  const actorRoll = await new Roll("2d6").evaluate();
  const opposingRoll = diceCount ? await new Roll(`${diceCount}d6`).evaluate() : null;

  const state = {
    kind: config.kind ?? "test",
    actorUuid: actor.uuid,
    label: config.label,
    parts: config.parts,
    bonus,
    difficulty: config.difficulty ?? null,
    opposingLabel: config.opposingLabel ?? null,
    opposingParts,
    opposingBonus: sumParts(opposingParts),
    targetUuid: config.target?.uuid ?? null,
    targetName: config.targetName ?? config.target?.name ?? null,
    applyToUuid: config.applyTo?.uuid ?? null,
    minNatural: config.minNatural ?? 0,
    untrained: !!config.untrained,
    damage: config.damage ?? null,
    dice: diceResults(actorRoll),
    opposingDice: opposingRoll ? diceResults(opposingRoll) : [],
    edge: null,
    targetEdge: null,
    applied: false,
    fightThrough: false
  };

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: config.speaker ?? actor }),
    content: await renderCard(state),
    rolls: [actorRoll, opposingRoll].filter(Boolean),
    flags: { [SYSTEM_ID]: { test: state } }
  };
  applyDefaultMode(messageData);
  const message = await ChatMessage.create(messageData);
  if ( state.kind === "con" ) await syncConsciousness(actor, state);
  return message;
}

/* -------------------------------------------- */

function sumParts(parts) {
  return parts.reduce((total, p) => total + p.value, 0);
}

function diceResults(roll) {
  return roll.dice.flatMap(d => d.results.map(r => r.result));
}

/** Apply the user's current chat visibility mode (V13 rollMode, V14 messageMode). */
export function applyDefaultMode(messageData) {
  if ( typeof ChatMessage.applyMode === "function" ) ChatMessage.applyMode(messageData);
  else ChatMessage.applyRollMode(messageData, game.settings.get("core", "rollMode"));
  return messageData;
}

/* -------------------------------------------- */

/**
 * Resolve a stored test state.
 * @param {object} state
 */
export function resolveState(state) {
  return resolveTest({
    dice: state.dice,
    bonus: state.bonus,
    opposingDice: state.opposingDice,
    opposingBonus: state.opposingBonus ?? 0,
    untrained: state.untrained,
    difficulty: state.difficulty,
    minNatural: state.minNatural ?? 0
  });
}

/**
 * Build the card's template context from a stored test state.
 * @param {object} state
 * @returns {object}
 */
export function cardContext(state) {
  const result = resolveState(state);
  const difficulty = DIFFICULTIES[state.difficulty];
  let opposingCaption = state.opposingLabel;
  if ( !opposingCaption ) {
    opposingCaption = difficulty
      ? game.i18n.format("MWD.Chat.Opposing", { difficulty: game.i18n.localize(difficulty.label), dice: state.opposingDice.length })
      : game.i18n.format("MWD.Chat.OpposingDice", { dice: state.opposingDice.length });
  }
  const damage = state.damage;
  return {
    ...state,
    result,
    opposingCaption,
    hasOpposingBonus: !!state.opposingParts?.length,
    autoFailLabel: result.autoFail ? game.i18n.localize(`MWD.Chat.AutoFail.${result.autoFail}`) : null,
    edgeLabel: state.edge ? game.i18n.localize(`MWD.Edge.Used.${state.edge}`) : null,
    targetEdgeLabel: state.targetEdge
      ? game.i18n.format("MWD.Edge.TargetUsed", { name: state.targetName, how: game.i18n.localize(`MWD.Edge.Used.${state.targetEdge}`) })
      : null,
    canEdge: !state.edge,
    canEdgeOpponent: state.opposingDice.length > 0,
    canTargetEdge: !!state.targetUuid && !state.targetEdge,
    isKia: state.kind === "kia",
    isCon: state.kind === "con",
    fightThroughLabel: state.fightThrough ? game.i18n.localize("MWD.Con.FoughtThrough") : null,
    canFightThrough: (state.kind === "con") && !result.success && !state.fightThrough,
    isAttack: state.kind === "attack",
    damageLabel: damageLabel(damage),
    applyLabel: applyLabel(state),
    canApply: !!damage && ((damage.applyOn === "failure") ? !result.success : result.success) && !state.applied
  };
}

/** Damage line on a card: "3 B F" for personal weapons, "4+M (Max 6)" for 'Mech weapons. */
function damageLabel(damage) {
  if ( !damage || (damage.kind === "fall") ) return null;
  if ( damage.kind === "mech" ) {
    if ( damage.heatInstead ) return `${damage.base} H`;
    let label = String(damage.base);
    if ( damage.missiles ) label += `+${"M".repeat(damage.missiles)}${damage.max ? ` (Max ${damage.max})` : ""}`;
    if ( damage.self ) label += ` · ${game.i18n.format("MWD.Mech.Damage.Self", { n: damage.self.base })}`;
    return label;
  }
  return `${damage.value}${damage.type ? ` ${damage.type}` : ""}${damage.fatigue ? " F" : ""}`;
}

/** Caption of the apply button. */
function applyLabel(state) {
  const damage = state.damage;
  if ( damage?.kind === "fall" ) return game.i18n.localize("MWD.Mech.Fall.Resolve");
  if ( damage?.applyOn === "failure" ) return game.i18n.localize("MWD.Mech.Fall.PilotDamage");
  return game.i18n.format("MWD.Damage.Apply", { name: state.targetName ?? "" });
}

export async function renderCard(state) {
  return foundry.applications.handlebars.renderTemplate(CARD_TEMPLATE, cardContext(state));
}

/* -------------------------------------------- */

/**
 * Wire up the buttons on rendered test cards.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function onRenderChatMessage(message, html) {
  const damage = message.getFlag(SYSTEM_ID, "damage");
  if ( damage ) bindKiaButton(damage, html);
  const state = message.getFlag(SYSTEM_ID, "test");
  if ( !state ) return;

  const bind = (selector, allowed, handler) => {
    const el = html.querySelector(selector);
    if ( !el ) return;
    if ( !allowed ) {
      el.remove();
      return;
    }
    for ( const button of el.querySelectorAll("button") ) {
      button.addEventListener("click", event => {
        event.preventDefault();
        handler(button);
      });
    }
  };

  const actor = fromUuidSync(state.actorUuid);
  bind(".mwd-edge-controls", edgeAllowed(actor, state.edge), b => spendEdge(message, b.dataset.edge, "actor"));
  const target = state.targetUuid ? fromUuidSync(state.targetUuid) : null;
  bind(".mwd-target-edge-controls", edgeAllowed(target, state.targetEdge), b => spendEdge(message, b.dataset.edge, "target"));
  bind(".mwd-apply-controls", !!damageRecipient(state)?.isOwner, () => applyCardDamage(message));
  bind(".mwd-fight-controls", !!actor?.isOwner && (actor.system.plotPoints?.value > 0), () => fightThrough(message));
}

/**
 * The KIA Test button on a damage card is only for the wounded actor's owners.
 * @param {{actorUuid: string, kia: boolean}} damage
 * @param {HTMLElement} html
 */
function bindKiaButton(damage, html) {
  const controls = html.querySelector(".mwd-kia-controls");
  if ( !controls ) return;
  const actor = fromUuidSync(damage.actorUuid);
  if ( !actor?.isOwner ) {
    controls.remove();
    return;
  }
  controls.querySelector("button[data-kia]")?.addEventListener("click", event => {
    event.preventDefault();
    actor.rollKiaCheck();
  });
}

function edgeAllowed(actor, usedOnRoll) {
  if ( !actor?.isOwner || !actor.system.usesEdge ) return false;
  return canSpendEdge({ edg: actor.system.attributes.edg.value, spent: actor.system.edge.spent, usedOnRoll: !!usedOnRoll });
}

/**
 * Spend a point of Edge to reroll dice on a test card (p. 34).
 * @param {ChatMessage} message
 * @param {"first"|"second"|"both"|"highest"|"all"} which  The first three reroll the spender's
 *   own dice; "highest" and "all" force a reroll of the other side's dice.
 * @param {"actor"|"target"} role  Who spends the Edge.
 */
export async function spendEdge(message, which, role = "actor") {
  const state = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "test"));
  const flag = role === "actor" ? "edge" : "targetEdge";
  const spender = await fromUuid(role === "actor" ? state.actorUuid : state.targetUuid);
  if ( !spender ) return;
  if ( !canSpendEdge({ edg: spender.system.attributes.edg.value, spent: spender.system.edge.spent, usedOnRoll: !!state[flag] }) ) {
    ui.notifications.warn("MWD.Edge.NoneLeft", { localize: true });
    return;
  }

  const own = ["first", "second", "both"].includes(which);
  const ownKey = role === "actor" ? "dice" : "opposingDice";
  const otherKey = role === "actor" ? "opposingDice" : "dice";
  const key = own ? ownKey : otherKey;
  const indices = edgeRerollIndices(state[key], which);
  const roll = await new Roll(`${indices.length}d6`).evaluate();
  if ( game.dice3d ) await game.dice3d.showForRoll(roll, game.user, true);
  state[key] = replaceDice(state[key], indices, diceResults(roll));
  state[flag] = which;

  await spender.update({ "system.edge.spent": spender.system.edge.spent + 1 });
  await updateCard(message, state);
  if ( state.kind === "con" ) await syncConsciousness(await fromUuid(state.actorUuid), state);
}

/* -------------------------------------------- */

/**
 * Fight through it (p. 31, 47): after a failed CON Check, spend a Plot Point to add WIL to the roll.
 * The Plot Point goes to the GM pool like any other.
 * @param {ChatMessage} message
 */
export async function fightThrough(message) {
  const state = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "test"));
  if ( (state.kind !== "con") || state.fightThrough ) return;
  const actor = await fromUuid(state.actorUuid);
  const pp = actor?.system.plotPoints?.value ?? 0;
  if ( pp < 1 ) {
    ui.notifications.warn("MWD.PlotPoints.NoneLeft", { localize: true });
    return;
  }
  const wil = actor.system.attributes.wil.total;
  state.parts = [...state.parts, { label: game.i18n.localize("MWD.Con.FightThrough"), value: wil }];
  state.bonus += wil;
  state.fightThrough = true;
  await actor.update({ "system.plotPoints.value": pp - 1 });
  await executeAsGM("adjustGmPool", { delta: 1 });
  await updateCard(message, state);
  await syncConsciousness(actor, state);
}

/**
 * Mark the actor unconscious after a failed CON Check, or wake them after a successful one.
 * @param {Actor} actor
 * @param {object} state  A "con" test state.
 */
async function syncConsciousness(actor, state) {
  if ( !actor?.isOwner ) return;
  const conscious = resolveState(state).success;
  await actor.toggleStatusEffect("unconscious", { active: !conscious });
}

/**
 * Re-render a card after its state changed. Users who do not own the message ask the GM to do it.
 * @param {ChatMessage} message
 * @param {object} state
 */
export async function updateCard(message, state) {
  const update = { content: await renderCard(state), [`flags.${SYSTEM_ID}.test`]: state };
  if ( message.isOwner ) return message.update(update);
  return executeAsGM("updateMessage", { messageId: message.id, update });
}

/* -------------------------------------------- */

/**
 * Who takes a card's damage: the 'Mech for 'Mech-scale hits and falls, the actor for damage on a
 * failed Test, otherwise the target.
 * @param {object} state
 * @returns {Actor|null}
 */
function damageRecipient(state) {
  const damage = state.damage;
  if ( !damage ) return null;
  if ( damage.kind === "fall" ) return fromUuidSync(damage.mechUuid);
  if ( damage.applyOn === "failure" ) return fromUuidSync(state.actorUuid);
  return fromUuidSync(state.applyToUuid ?? state.targetUuid);
}

/**
 * Apply a card's damage: a hit to its target, or the consequence of a failed Test.
 * @param {ChatMessage} message
 */
export async function applyCardDamage(message) {
  const state = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "test"));
  if ( state.applied || !state.damage ) return;
  const recipient = damageRecipient(state);
  if ( !recipient ) return;
  state.applied = true;
  await updateCard(message, state);
  const damage = state.damage;
  if ( damage.kind === "fall" ) return recipient.resolveFall();
  if ( damage.kind === "mech" ) {
    await recipient.applyMechHit(damage);
    const attacker = damage.self && damage.attackerUuid ? await fromUuid(damage.attackerUuid) : null;
    if ( attacker ) await attacker.applyMechHit({ ...damage.self, source: damage.source, attackerUuid: damage.attackerUuid });
    return;
  }
  return recipient.applyPersonalDamage(damage, {
    source: damage.source ?? state.label, mechScale: !!damage.mechScale, ignoreArmor: !!damage.ignoreArmor
  });
}
