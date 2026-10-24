import { EXPERIENCE_LEVELS } from "../config.mjs";
import { toggleDamagePip } from "../rules/condition.mjs";
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
      plotPoint: CharacterSheet.#onPlotPoint
    }
  };

  static PARTS = {
    header: { template: `${TEMPLATES}/actor/character-header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: `${TEMPLATES}/actor/character-main.hbs`, scrollable: [""] },
    story: { template: `${TEMPLATES}/actor/character-story.hbs`, scrollable: [""] },
    bio: { template: `${TEMPLATES}/actor/character-bio.hbs`, scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", icon: "fa-solid fa-user-shield" },
        { id: "story", icon: "fa-solid fa-comment-dots" },
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
    return context;
  }

  /* -------------------------------------------- */

  static async #onEdgePip(_event, target) {
    const spent = toggleDamagePip(this.document.system.edge.spent, Number(target.dataset.index));
    return this.document.update({ "system.edge.spent": spent });
  }

  static async #onPlotPoint(_event, target) {
    const delta = Number(target.dataset.delta);
    return this.document.update({ "system.plotPoints.value": this.document.system.plotPoints.value + delta });
  }
}
