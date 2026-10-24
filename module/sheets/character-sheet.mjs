import { EXPERIENCE_LEVELS, WEIGHT_CLASSES } from "../config.mjs";
import { toggleDamagePip } from "../rules/condition.mjs";
import { CharacterCreator } from "../apps/character-creator.mjs";
import * as Advancement from "../documents/advancement.mjs";
import { PersonSheet, TEMPLATES } from "./person-sheet.mjs";

/**
 * Player character sheet.
 */
export class CharacterSheet extends PersonSheet {
  static DEFAULT_OPTIONS = {
    classes: ["character"],
    position: { width: 820, height: 860 },
    actions: {
      edgePip: CharacterSheet.#onEdgePip,
      plotPoint: CharacterSheet.#onPlotPoint,
      boardHardware: CharacterSheet.#onBoardHardware,
      leaveHardware: CharacterSheet.#onLeaveHardware,
      openHardware: CharacterSheet.#onOpenHardware,
      removeHardware: CharacterSheet.#onRemoveHardware,
      openCreator: CharacterSheet.#onOpenCreator,
      improveAttribute: CharacterSheet.#onImproveAttribute,
      improveSkill: CharacterSheet.#onImproveSkill,
      buyNewSkill: CharacterSheet.#onBuyNewSkill,
      buyTrait: CharacterSheet.#onBuyTrait,
      removeTrait: CharacterSheet.#onRemoveTrait,
      customizeWeapon: CharacterSheet.#onCustomizeWeapon,
      repairHardware: CharacterSheet.#onRepairHardware,
      acquireHardware: CharacterSheet.#onAcquireHardware,
      awardXp: CharacterSheet.#onAwardXp,
      undoAdvance: CharacterSheet.#onUndoAdvance
    }
  };

  static PARTS = {
    header: { template: `${TEMPLATES}/actor/character-header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: `${TEMPLATES}/actor/character-main.hbs`, scrollable: [""] },
    story: { template: `${TEMPLATES}/actor/character-story.hbs`, scrollable: [""] },
    hardware: { template: `${TEMPLATES}/actor/character-hardware.hbs`, scrollable: [""] },
    advancement: { template: `${TEMPLATES}/actor/character-advancement.hbs`, scrollable: [""] },
    bio: { template: `${TEMPLATES}/actor/character-bio.hbs`, scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", icon: "fa-solid fa-user-shield" },
        { id: "story", icon: "fa-solid fa-comment-dots" },
        { id: "hardware", icon: "fa-solid fa-robot" },
        { id: "advancement", icon: "fa-solid fa-arrow-trend-up" },
        { id: "bio", icon: "fa-solid fa-book-open" }
      ],
      initial: "main",
      labelPrefix: "MWD.Tab"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system;
    context.tabs = this._prepareTabs("primary");
    context.experienceLevels = Object.fromEntries(Object.entries(EXPERIENCE_LEVELS).map(([k, v]) => [k, v.label]));
    context.edgePips = Array.from({ length: system.edge.max }, (_v, i) => ({ index: i, spent: i < system.edge.spent }));
    context.plotPointPips = Array.from({ length: system.plotPoints.max }, (_v, i) => ({
      index: i, filled: i < system.plotPoints.value
    }));
    context.lifeModuleKeys = ["faction", "childhood", "education", "realLife"];
    context.history = await this._enrich(system.biography.history);
    context.personality = await this._enrich(system.biography.personality);
    Object.assign(context, this.#hardwareContext());
    context.advance = Advancement.advancementContext(this.document);
    context.isGM = game.user.isGM;
    context.creationComplete = system.creation.complete;
    return context;
  }

  /** The pilot's Hardware: owned machines and the one in use (p. 76–78). */
  #hardwareContext() {
    const actor = this.document;
    const hardware = actor.system.hardware.map(uuid => {
      const mech = fromUuidSync(uuid);
      if ( !mech ) return { uuid, missing: true, name: uuid };
      return {
        uuid,
        name: mech.name,
        img: mech.img,
        model: mech.system.details?.model ?? "",
        weight: game.i18n.localize(WEIGHT_CLASSES[mech.system.details?.weightClass]?.label ?? ""),
        type: game.i18n.localize(`TYPES.Actor.${mech.type}`),
        piloting: mech.system.pilot === actor.uuid,
        pilotName: (mech.system.pilot && (mech.system.pilot !== actor.uuid)) ? fromUuidSync(mech.system.pilot)?.name : null,
        destroyed: mech.system.status?.destroyed
      };
    });
    const owned = new Set(actor.system.hardware);
    const available = game.actors.filter(a => a.isUnit && a.isOwner && !owned.has(a.uuid))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    return {
      hardware,
      availableHardware: Object.fromEntries([["", "—"], ...available.map(a => [a.uuid, a.name])])
    };
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("select[data-add-hardware]")?.addEventListener("change", async event => {
      event.stopPropagation();
      const uuid = event.currentTarget.value;
      if ( uuid ) await this.document.update({ "system.hardware": [...this.document.system.hardware, uuid] });
    });
  }

  /** Dropping a 'Mech, vehicle or fighter on the sheet adds it to the pilot's Hardware. @override */
  async _onDropActor(event, actor) {
    if ( !this.isEditable || !actor?.isUnit ) return null;
    if ( this.document.system.hardware.includes(actor.uuid) ) return null;
    await this.document.update({ "system.hardware": [...this.document.system.hardware, actor.uuid] });
    return actor;
  }

  /* -------------------------------------------- */

  static async #onEdgePip(_event, target) {
    const spent = toggleDamagePip(this.document.system.edge.spent, Number(target.dataset.index));
    return this.document.update({ "system.edge.spent": spent });
  }

  static async #onBoardHardware(_event, target) {
    const mech = await fromUuid(target.closest("[data-uuid]")?.dataset.uuid);
    if ( mech ) return this.document.boardHardware(mech);
  }

  static async #onLeaveHardware() {
    return this.document.leaveHardware();
  }

  static async #onOpenHardware(_event, target) {
    (await fromUuid(target.closest("[data-uuid]")?.dataset.uuid))?.sheet.render(true);
  }

  static async #onRemoveHardware(_event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const mech = fromUuidSync(uuid);
    if ( mech?.system.pilot === this.document.uuid ) await mech.update({ "system.pilot": "" });
    return this.document.update({ "system.hardware": this.document.system.hardware.filter(u => u !== uuid) });
  }

  static async #onPlotPoint(_event, target) {
    const delta = Number(target.dataset.delta);
    return this.document.update({ "system.plotPoints.value": this.document.system.plotPoints.value + delta });
  }

  /* -------------------------------------------- */
  /*  Creation and advancement                    */
  /* -------------------------------------------- */

  static async #onOpenCreator() {
    return CharacterCreator.open(this.document);
  }

  static async #onImproveAttribute(_event, target) {
    return Advancement.improveAttribute(this.document, target.dataset.attribute);
  }

  static async #onImproveSkill(_event, target) {
    const skill = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if ( skill ) return Advancement.improveSkill(this.document, skill);
  }

  static async #onBuyNewSkill() {
    return Advancement.buyNewSkill(this.document);
  }

  static async #onBuyTrait() {
    return Advancement.buyTrait(this.document);
  }

  static async #onRemoveTrait(_event, target) {
    const trait = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if ( trait ) return Advancement.removeTrait(this.document, trait);
  }

  static async #onCustomizeWeapon(_event, target) {
    const weapon = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if ( weapon ) return Advancement.customizeWeapon(this.document, weapon, target.dataset.mod);
  }

  static async #onRepairHardware(_event, target) {
    const unit = await fromUuid(target.closest("[data-uuid]")?.dataset.uuid);
    if ( unit ) return Advancement.repairHardware(this.document, unit);
  }

  static async #onAcquireHardware() {
    return Advancement.acquireHardware(this.document);
  }

  static async #onAwardXp() {
    return Advancement.awardXp(this.document);
  }

  static async #onUndoAdvance() {
    return Advancement.undoLast(this.document);
  }
}
