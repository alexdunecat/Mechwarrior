import { PLOT_POINTS, PLOT_POINT_USES, SYSTEM_ID } from "../config.mjs";
import { applyDefaultMode } from "../dice/test-roll.mjs";
import { executeAsGM } from "../socket.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/**
 * Player characters taking part in the session: characters assigned to players, or owned by one.
 * @returns {Actor[]}
 */
export function sessionCharacters() {
  const players = game.users.filter(u => !u.isGM);
  const assigned = players.map(u => u.character).filter(a => a?.type === "character");
  if ( assigned.length ) return [...new Set(assigned)];
  return game.actors.filter(a => (a.type === "character") && players.some(u => a.testUserPermission(u, "OWNER")));
}

/**
 * Spend one of a character's Plot Points on a listed use (p. 31). The point goes to the GM pool.
 * @param {Actor} actor
 * @param {string} use  Key of PLOT_POINT_USES.
 */
export async function spendPlotPoint(actor, use) {
  const current = actor.system.plotPoints.value;
  if ( current < 1 ) {
    ui.notifications.warn("MWD.PlotPoints.NoneLeft", { localize: true });
    return;
  }
  await actor.update({ "system.plotPoints.value": current - 1 });
  await executeAsGM("adjustGmPool", { delta: 1 });
  const label = game.i18n.localize(PLOT_POINT_USES[use]?.label ?? PLOT_POINT_USES.other.label);
  await ChatMessage.create(applyDefaultMode({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="mwd-card mwd-pp-card"><i class="fa-solid fa-star"></i> ${game.i18n.format("MWD.PlotPoints.Spent", { name: actor.name, use: label })}</div>`
  }), {});
}

/**
 * Start a new game session (p. 31, 34): players back to 3 Plot Points, Edge refreshed, GM pool at 1.
 */
export async function startNewSession() {
  if ( !game.user.isGM ) return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "MWD.Session.New" },
    content: `<p>${game.i18n.localize("MWD.Session.Confirm")}</p>`
  });
  if ( !confirmed ) return;
  const characters = game.actors.filter(a => a.type === "character");
  await Actor.updateDocuments(characters.map(a => ({
    _id: a.id,
    "system.plotPoints.value": PLOT_POINTS.playerStart,
    "system.edge.spent": 0
  })));
  await game.settings.set(SYSTEM_ID, "gmPlotPoints", PLOT_POINTS.gmStart);
  await ChatMessage.create({ content: `<div class="mwd-card mwd-pp-card">${game.i18n.localize("MWD.Session.Started")}</div>` });
}

/* -------------------------------------------- */

/**
 * A small always-available panel with every player's Plot Points and the GM pool.
 */
export class PlotPointsPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mwd-plot-points",
    classes: [SYSTEM_ID, "mwd-panel"],
    window: { title: "MWD.PlotPoints.label", icon: "fa-solid fa-star", resizable: false, minimizable: true },
    position: { width: 300, height: "auto", top: 80, left: 120 },
    actions: {
      award: PlotPointsPanel.#onAward,
      take: PlotPointsPanel.#onTake,
      spend: PlotPointsPanel.#onSpend,
      gmSpend: PlotPointsPanel.#onGmSpend,
      gmAdjust: PlotPointsPanel.#onGmAdjust,
      newSession: PlotPointsPanel.#onNewSession,
      openSheet: PlotPointsPanel.#onOpenSheet
    }
  };

  static PARTS = {
    body: { template: `systems/${SYSTEM_ID}/templates/apps/plot-points.hbs` }
  };

  /** @override */
  async _prepareContext() {
    const isGM = game.user.isGM;
    return {
      isGM,
      gmPool: game.settings.get(SYSTEM_ID, "gmPlotPoints"),
      uses: Object.entries(PLOT_POINT_USES).map(([key, cfg]) => ({ key, label: cfg.label, mech: cfg.mech })),
      characters: sessionCharacters().map(actor => ({
        id: actor.id,
        name: actor.name,
        img: actor.img,
        value: actor.system.plotPoints.value,
        pips: Array.from({ length: PLOT_POINTS.playerMax }, (_v, i) => i < actor.system.plotPoints.value),
        edge: `${actor.system.edge.remaining}/${actor.system.edge.max}`,
        owner: actor.isOwner
      }))
    };
  }

  static #actor(target) {
    return game.actors.get(target.closest("[data-actor-id]")?.dataset.actorId);
  }

  static async #onAward(_event, target) {
    const actor = PlotPointsPanel.#actor(target);
    if ( !actor || !game.user.isGM ) return;
    if ( actor.system.plotPoints.value >= PLOT_POINTS.playerMax ) {
      ui.notifications.info("MWD.PlotPoints.AtMax", { localize: true });
      return;
    }
    await actor.update({ "system.plotPoints.value": actor.system.plotPoints.value + 1 });
    await ChatMessage.create({
      content: `<div class="mwd-card mwd-pp-card"><i class="fa-solid fa-star"></i> ${game.i18n.format("MWD.PlotPoints.Awarded", { name: actor.name })}</div>`
    });
  }

  static async #onTake(_event, target) {
    const actor = PlotPointsPanel.#actor(target);
    if ( actor && game.user.isGM ) await actor.update({ "system.plotPoints.value": actor.system.plotPoints.value - 1 });
  }

  static async #onSpend(_event, target) {
    const actor = PlotPointsPanel.#actor(target);
    if ( !actor?.isOwner ) return;
    const select = target.closest("[data-actor-id]").querySelector("select[name=use]");
    return spendPlotPoint(actor, select?.value ?? "other");
  }

  static async #onGmSpend() {
    const pool = game.settings.get(SYSTEM_ID, "gmPlotPoints");
    if ( pool < 1 ) return;
    await game.settings.set(SYSTEM_ID, "gmPlotPoints", pool - 1);
    await ChatMessage.create({
      content: `<div class="mwd-card mwd-pp-card"><i class="fa-solid fa-star"></i> ${game.i18n.localize("MWD.PlotPoints.GmSpent")}</div>`
    });
  }

  static async #onGmAdjust(_event, target) {
    const pool = game.settings.get(SYSTEM_ID, "gmPlotPoints");
    await game.settings.set(SYSTEM_ID, "gmPlotPoints", Math.max(0, pool + Number(target.dataset.delta)));
  }

  static async #onNewSession() {
    return startNewSession();
  }

  static async #onOpenSheet(_event, target) {
    PlotPointsPanel.#actor(target)?.sheet.render(true);
  }
}
