import { ATTRIBUTES, STAGGERED_CON_CHECK, SYSTEM_ID } from "../config.mjs";
import { promptSkill } from "../documents/advancement.mjs";
import { toggleDamagePip } from "../rules/condition.mjs";
import { rangeModifier } from "../rules/tests.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export const TEMPLATES = `systems/${SYSTEM_ID}/templates`;

/**
 * Shared sheet behaviour for characters and NPCs.
 */
export class PersonSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "mwd-sheet", "actor"],
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollAttribute: PersonSheet.#onRollAttribute,
      rollSkill: PersonSheet.#onRollSkill,
      rollWeapon: PersonSheet.#onRollWeapon,
      rollTest: PersonSheet.#onRollTest,
      addSkill: PersonSheet.#onAddSkill,
      createItem: PersonSheet.#onCreateItem,
      editItem: PersonSheet.#onEditItem,
      deleteItem: PersonSheet.#onDeleteItem,
      toggleEquipped: PersonSheet.#onToggleEquipped,
      damagePip: PersonSheet.#onDamagePip,
      armorPip: PersonSheet.#onArmorPip,
      kiaCheck: PersonSheet.#onKiaCheck,
      conCheck: PersonSheet.#onConCheck,
      resetKia: PersonSheet.#onResetKia
    }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system;
    const byName = (a, b) => a.name.localeCompare(b.name, game.i18n.lang);

    Object.assign(context, {
      actor,
      system,
      source: system._source,
      fields: system.schema.fields,
      editable: this.isEditable,
      owner: actor.isOwner,
      attributes: Object.entries(ATTRIBUTES).map(([key, cfg]) => ({
        key,
        label: cfg.label,
        abbr: cfg.abbr,
        value: system.attributes[key].value,
        total: system.attributes[key].total,
        modified: system.attributes[key].total !== system.attributes[key].value
      })),
      skills: [...actor.itemTypes.skill].sort(byName).map(item => ({
        item,
        id: item.id,
        name: item.name,
        rank: item.system.rank,
        attribute: item.system.attribute,
        attributeAbbr: ATTRIBUTES[item.system.attribute]?.abbr,
        bonus: item.system.bonus
      })),
      traits: [...actor.itemTypes.trait].sort(byName),
      weapons: [...actor.itemTypes.weapon].sort(byName).map(item => ({
        item,
        id: item.id,
        name: item.name,
        damage: item.system.damageLabel,
        damageType: item.system.damageType,
        ranges: ["close", "near", "far"].map(r => {
          const mod = rangeModifier(item.system.effectiveRanges[r]);
          return mod === null ? "—" : (mod === 0 ? "OK" : `–${Math.abs(mod)}`);
        }),
        special: item.system.special
      })),
      armors: [...actor.itemTypes.armor].sort(byName),
      armorPips: this.#armorPips(),
      gear: [...actor.itemTypes.gear].sort(byName),
      tracks: {
        physical: system.condition.physical.track,
        fatigue: system.condition.fatigue.track
      },
      woundModifier: system.woundModifier,
      staggeredCon: STAGGERED_CON_CHECK,
      needsKiaCheck: system.condition.physical.track.beyond,
      knockedOut: system.condition.fatigue.track.beyond,
      notesHTML: await this.#enrich(system.notes)
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if ( context.tabs?.[partId] ) context.tab = context.tabs[partId];
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Enrich HTML for display.
   * @param {string} html
   * @returns {Promise<string>}
   */
  async #enrich(html) {
    return foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", {
      secrets: this.document.isOwner, relativeTo: this.document
    });
  }

  /** Allow subclasses to enrich more fields. */
  async _enrich(html) {
    return this.#enrich(html);
  }

  /* -------------------------------------------- */

  #armorPips() {
    const armor = this.document.system.armor;
    if ( !armor ) return [];
    return Array.from({ length: armor.max }, (_v, i) => ({ index: i, filled: i < (armor.max - armor.value) }));
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // Inline edits of embedded items (skill ranks and the like).
    for ( const input of this.element.querySelectorAll("[data-item-field]") ) {
      input.addEventListener("change", this.#onItemFieldChange.bind(this));
    }
  }

  async #onItemFieldChange(event) {
    event.stopPropagation();
    const input = event.currentTarget;
    const item = this.document.items.get(input.closest("[data-item-id]")?.dataset.itemId);
    if ( !item ) return;
    let value = input.type === "checkbox" ? input.checked : input.value;
    if ( input.type === "number" ) value = Number(value) || 0;
    await item.update({ [input.dataset.itemField]: value });
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #itemFrom(target) {
    return this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
  }

  static async #onRollAttribute(_event, target) {
    return this.document.rollAttribute(target.dataset.attribute);
  }

  static async #onRollSkill(_event, target) {
    const item = PersonSheet.#itemFrom.call(this, target);
    if ( item ) return this.document.rollSkill(item);
  }

  static async #onRollWeapon(_event, target) {
    const item = PersonSheet.#itemFrom.call(this, target);
    if ( item ) return this.document.rollAttack(item);
  }

  static async #onRollTest() {
    return this.document.rollTest();
  }

  static async #onAddSkill() {
    const choice = await promptSkill();
    if ( choice ) return this.document.addSkill(choice);
  }

  static async #onCreateItem(_event, target) {
    const type = target.dataset.type;
    const name = game.i18n.format("MWD.NewItem", { type: game.i18n.localize(`TYPES.Item.${type}`) });
    const [item] = await this.document.createEmbeddedDocuments("Item", [{ name, type }]);
    item?.sheet.render(true);
  }

  static async #onEditItem(_event, target) {
    PersonSheet.#itemFrom.call(this, target)?.sheet.render(true);
  }

  static async #onDeleteItem(_event, target) {
    const item = PersonSheet.#itemFrom.call(this, target);
    if ( item ) return item.deleteDialog();
  }

  static async #onToggleEquipped(_event, target) {
    const item = PersonSheet.#itemFrom.call(this, target);
    if ( item ) return item.update({ "system.equipped": !item.system.equipped });
  }

  static async #onDamagePip(_event, target) {
    const track = target.dataset.track;
    const index = Number(target.dataset.index);
    const current = this.document.system.condition[track].value;
    return this.document.update({ [`system.condition.${track}.value`]: toggleDamagePip(current, index) });
  }

  static async #onArmorPip(_event, target) {
    const armorId = this.document.system.armor?.id;
    const item = this.document.items.get(armorId);
    if ( !item ) return;
    return item.update({ "system.damage": toggleDamagePip(item.system.damage, Number(target.dataset.index)) });
  }

  static async #onKiaCheck() {
    return this.document.rollKiaCheck();
  }

  static async #onConCheck() {
    return this.document.rollConCheck();
  }

  static async #onResetKia() {
    return this.document.update({ "system.condition.physical.kiaChecks": 0 });
  }
}
