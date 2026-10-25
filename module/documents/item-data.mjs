import { BOOK_TRAITS, FREE_WEAPONS, SKILLS, SPECIALTIES, STARTING_ARMOR, SYSTEM_ID } from "../config.mjs";

/**
 * Item data for things the rules define: Skills from the Skills List, the book's Traits, starting
 * armor and the free melee option. Used by character creation and advancement.
 */

const t = key => game.i18n.localize(key);

/**
 * Display name of a Skill, e.g. "Gunnery (BattleMech)" or "Knowledge: Parliamentary Law".
 * @param {{key: string, specialty?: string, subject?: string}} skill
 * @returns {string}
 */
export function skillName({ key, specialty = "", subject = "" }) {
  const cfg = SKILLS[key];
  let name = t(`MWD.Skill.${key}`);
  if ( cfg?.specialty && specialty ) name += ` (${t(SPECIALTIES[specialty])})`;
  if ( cfg?.subject && subject ) name += `: ${subject}`;
  return name;
}

/**
 * @param {{key: string, rank?: number, specialty?: string, subject?: string}} skill
 * @returns {object|null}  Item creation data.
 */
export function skillItemData({ key, rank = 1, specialty = "", subject = "" }) {
  const cfg = SKILLS[key];
  if ( !cfg ) return null;
  return {
    name: skillName({ key, specialty, subject }),
    type: "skill",
    img: "icons/svg/book.svg",
    system: { key, rank, attribute: cfg.attribute, specialty: cfg.specialty ? specialty : "" }
  };
}

/**
 * A Trait from the book's list (p. 72–73).
 * @param {string} key
 * @returns {object|null}  Item creation data.
 */
export function bookTraitData(key) {
  const cfg = BOOK_TRAITS[key];
  if ( !cfg ) return null;
  const hint = t(`MWD.BookTrait.${key}.hint`);
  return {
    name: t(`MWD.BookTrait.${key}.name`),
    type: "trait",
    img: cfg.polarity === "positive" ? "icons/svg/upgrade.svg" : "icons/svg/downgrade.svg",
    system: {
      key,
      polarity: cfg.polarity,
      modifier: cfg.modifier ?? 0,
      appliesTo: cfg.modifier ? hint : "",
      effect: cfg.effect ?? "",
      description: `<p>${hint}</p>`
    }
  };
}

/**
 * A custom Trait (p. 72): at most ±1 at character creation.
 * @param {{name: string, polarity: string, modifier?: number, appliesTo?: string}} trait
 * @returns {object}  Item creation data.
 */
export function customTraitData({ name, polarity, modifier = 0, appliesTo = "" }) {
  return {
    name,
    type: "trait",
    img: polarity === "positive" ? "icons/svg/upgrade.svg" : "icons/svg/downgrade.svg",
    system: { key: "", polarity, modifier, appliesTo }
  };
}

/**
 * Starting armor (p. 75).
 * @param {string} key
 * @returns {object|null}  Item creation data.
 */
export function startingArmorData(key) {
  const cfg = STARTING_ARMOR[key];
  if ( !cfg ) return null;
  return {
    name: t(`MWD.Armor.Type.${key}`),
    type: "armor",
    img: "icons/svg/shield.svg",
    system: {
      pips: cfg.pips,
      reduceB: cfg.reduceB ?? 0,
      reduceE: cfg.reduceE ?? 0,
      rflPenalty: cfg.rflPenalty ?? 0,
      concealed: !!cfg.concealed,
      equipped: true
    }
  };
}

/**
 * Unarmed or Martial Arts, which every character has (p. 75).
 * @param {string} key
 * @returns {object|null}  Item creation data.
 */
export function freeWeaponData(key) {
  const cfg = FREE_WEAPONS[key];
  if ( !cfg ) return null;
  return {
    name: t(`MWD.Weapon.Free.${key}`),
    type: "weapon",
    img: "icons/svg/combat.svg",
    system: foundry.utils.deepClone(cfg),
    flags: { [SYSTEM_ID]: { freeWeapon: key } }
  };
}

/**
 * Item data for an Inventory item (p. 75).
 * @param {string} name
 * @returns {object}
 */
export function gearData(name) {
  return { name, type: "gear", img: "icons/svg/item-bag.svg" };
}
