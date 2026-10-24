import { ATTRIBUTES, DAMAGE_TYPES, RANGE_CODES, SKILLS, SPECIALTIES, SYSTEM_ID, TRAIT_POLARITIES } from "../config.mjs";
import { TEMPLATES } from "./person-sheet.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * One sheet class for every item type; the body part is chosen by type.
 */
export class MWDItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "mwd-sheet", "item"],
    position: { width: 480, height: "auto" },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    header: { template: `${TEMPLATES}/item/header.hbs` },
    skill: { template: `${TEMPLATES}/item/skill.hbs` },
    trait: { template: `${TEMPLATES}/item/trait.hbs` },
    weapon: { template: `${TEMPLATES}/item/weapon.hbs` },
    armor: { template: `${TEMPLATES}/item/armor.hbs` },
    gear: { template: `${TEMPLATES}/item/gear.hbs` }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    options.parts = ["header", this.document.type];
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    const localizeAll = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, game.i18n.localize(v.label ?? v)]));
    Object.assign(context, {
      item,
      system: item.system,
      source: item.system._source,
      editable: this.isEditable,
      attributes: localizeAll(ATTRIBUTES),
      specialties: { "": game.i18n.localize("MWD.Specialty.none"), ...localizeAll(SPECIALTIES) },
      skillKeys: {
        custom: game.i18n.localize("MWD.Skill.custom"),
        ...Object.fromEntries(Object.keys(SKILLS).map(k => [k, game.i18n.localize(`MWD.Skill.${k}`)]))
      },
      weaponSkills: Object.fromEntries(Object.entries(SKILLS).filter(([, v]) => v.combat)
        .map(([k]) => [k, game.i18n.localize(`MWD.Skill.${k}`)])),
      damageTypes: localizeAll(DAMAGE_TYPES),
      rangeCodes: { ...RANGE_CODES },
      polarities: localizeAll(TRAIT_POLARITIES),
      descriptionHTML: await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description ?? "", {
        secrets: item.isOwner, relativeTo: item
      })
    });
    return context;
  }
}
