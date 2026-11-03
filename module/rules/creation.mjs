/**
 * Character creation (p. 68–77). Pure functions only.
 *
 * A creation draft is a plain object:
 * - `experience`: key of EXPERIENCE_LEVELS.
 * - `attributes`: {str, rfl, int, wil, cha, edg} as bought with Attribute points.
 * - `skills`: [{key, specialty, subject, rank}] as bought with Skill points.
 * - `traits`: [{key, name, polarity, modifier}], `key` empty for a custom Trait.
 * - `lifeModules`: {childhood, education, realLife}, each {key, skill: {key, specialty, subject}} or null.
 * - `armor`: key of STARTING_ARMOR; `weapons`: [{name, ...}] not counting the free melee option.
 * - `faction`: key of FACTIONS.
 * - `inventory`: [string]; `hardware`: {type, weightClass, cost, clan} of the chosen unit or null.
 * - `dispossessed`, `hardwarePool`: the optional Hardware rules (p. 76).
 * - `conversion`: {xp, skills, edge}, how many unspent Hardware Points become each (p. 76).
 */
import {
  CLAN_CREATION, CLAN_HARDWARE, CREATION, EXPERIENCE_LEVELS, FACTIONS, HARDWARE_CONVERSION, HARDWARE_COSTS, HARDWARE_SKILLS, LIFE_MODULES, LIFE_MODULE_SLOTS,
  OPTIONAL_LIFE_MODULES, SKILLS, STARTING_ARMOR, UNIT_TYPES, BOOK_TRAITS
} from "../config.mjs";

const BASE_ATTRIBUTES = ["str", "rfl", "int", "wil", "cha"];

/**
 * Attribute points spent (p. 70): every Attribute starts at 1; each point above costs 1, EDG costs 2.
 * @param {Record<string, number>} attributes
 * @returns {number}
 */
export function attributePointsSpent(attributes) {
  const base = BASE_ATTRIBUTES.reduce((n, k) => n + Math.max(0, (attributes[k] ?? 1) - 1), 0);
  return base + (CREATION.edgeCost * Math.max(0, (attributes.edg ?? 1) - 1));
}

/**
 * Hardware Point cost of a unit (p. 76, Clan technology p. 199).
 * @param {string} type          "mech", "vehicle", "fighter" or "battleArmor".
 * @param {string} weightClass
 * @param {object} [tech]
 * @param {boolean} [tech.clan=false]  Clan technology.
 * @param {boolean} [tech.omni=false]  An OmniMech or OmniFighter.
 * @returns {number}
 */
export function hardwareCost(type, weightClass, { clan = false, omni = false } = {}) {
  const base = HARDWARE_COSTS[type]?.[weightClass] ?? 0;
  if ( !base || !CLAN_HARDWARE.types.includes(type) ) return base;
  if ( omni ) return base + CLAN_HARDWARE.omni;
  return base + (clan ? CLAN_HARDWARE.clan : 0);
}

/**
 * Whether a faction is one of the Clans (p. 198).
 * @param {string} faction  Key of FACTIONS.
 * @returns {boolean}
 */
export function isClanFaction(faction) {
  return !!FACTIONS[faction]?.clan;
}

/** Hardware Point cost of the draft's unit. */
function draftHardwareCost(hardware) {
  return hardware.cost ?? hardwareCost(hardware.type, hardware.weightClass);
}

/** Book Trait keys in the draft. */
function traitKeys(draft) {
  return new Set((draft.traits ?? []).map(t => t.key).filter(Boolean));
}

/**
 * What the experience level and creation Traits give to spend (p. 69–76).
 * @param {object} draft
 * @returns {{attributes: number, skills: number, weapons: number, inventory: number, hardware: number,
 *   equipped: boolean}}  `weapons` and `inventory` are the base allowances; Equipped adds 1 weapon
 *   or 2 Inventory items on top (see itemLimits).
 */
export function creationBudget(draft) {
  const level = EXPERIENCE_LEVELS[draft.experience] ?? EXPERIENCE_LEVELS.regular;
  const traits = traitKeys(draft);
  const poor = traits.has("poor");
  const base = level.hardware + (isClanFaction(draft.faction) ? CLAN_CREATION.hardwareBonus : 0);
  let hardware = poor ? Math.max(1, Math.floor(base / 2)) : base;
  if ( traits.has("wealthy") ) hardware += CREATION.wealthyHardware;
  return {
    attributes: level.attributes,
    skills: level.skills + (HARDWARE_CONVERSION.skills * (draft.conversion?.skills ?? 0)),
    weapons: poor ? CREATION.poorWeapons : level.weapons,
    inventory: poor ? CREATION.poorInventory : CREATION.inventory,
    hardware,
    equipped: traits.has("equipped")
  };
}

/**
 * Weapon and Inventory limits. Equipped gives one extra weapon or two extra Inventory items: taking
 * the extra weapon uses it up.
 * @param {object} draft
 * @returns {{weapons: number, inventory: number}}
 */
export function itemLimits(draft) {
  const budget = creationBudget(draft);
  if ( !budget.equipped ) return { weapons: budget.weapons, inventory: budget.inventory };
  const extraWeapon = (draft.weapons?.length ?? 0) > budget.weapons;
  return {
    weapons: budget.weapons + CREATION.equippedWeapons,
    inventory: budget.inventory + (extraWeapon ? 0 : CREATION.equippedInventory)
  };
}

/**
 * Hardware Points left over after the starting unit. A Dispossessed character keeps them all.
 * @param {object} draft
 * @returns {number}
 */
export function unspentHardware(draft) {
  const { hardware } = creationBudget(draft);
  if ( draft.dispossessed || !draft.hardware ) return hardware;
  return Math.max(0, hardware - draftHardwareCost(draft.hardware));
}

/* -------------------------------------------- */
/*  Skills and Life Modules                     */
/* -------------------------------------------- */

/**
 * A key that tells Skills apart: Gunnery and Piloting by specialty, Knowledge by subject.
 * @param {{key: string, specialty?: string, subject?: string}} skill
 * @returns {string}
 */
export function skillId({ key, specialty = "", subject = "" }) {
  const cfg = SKILLS[key];
  if ( cfg?.specialty ) return `${key}:${specialty}`;
  if ( cfg?.subject ) return `${key}:${subject.trim().toLowerCase()}`;
  return key;
}

/**
 * Skills a Life Module can raise, as Skills List keys.
 * @param {string} slot
 * @param {string} key
 * @returns {string[]}
 */
export function lifeModuleSkills(slot, key) {
  const module = LIFE_MODULES[slot]?.[key];
  if ( !module ) return [];
  if ( module.skills === "any" ) return Object.keys(SKILLS).filter(k => !module.exclude?.includes(k));
  return module.skills;
}

/**
 * Whether a Life Module's prerequisite is met by the modules chosen in the other slots.
 * @param {string} slot
 * @param {string} key
 * @param {object} lifeModules  The draft's Life Modules.
 * @returns {boolean}
 */
export function lifeModuleAllowed(slot, key, lifeModules = {}) {
  const requires = LIFE_MODULES[slot]?.[key]?.requires;
  if ( !requires ) return true;
  const chosen = new Set(LIFE_MODULE_SLOTS.filter(s => s !== slot).map(s => lifeModules[s]?.key).filter(Boolean));
  return requires.some(r => chosen.has(r));
}

/**
 * The Skills after Life Modules (p. 73): each module adds 1 to its Skill, or grants it at 1.
 * @param {object} draft
 * @returns {{key: string, specialty: string, subject: string, rank: number, base: number, bonus: number}[]}
 */
export function finalSkills(draft) {
  const skills = new Map();
  for ( const s of draft.skills ?? [] ) {
    const id = skillId(s);
    const entry = skills.get(id) ?? { key: s.key, specialty: s.specialty ?? "", subject: s.subject ?? "", rank: 0, base: 0, bonus: 0 };
    entry.base += s.rank;
    entry.rank += s.rank;
    skills.set(id, entry);
  }
  for ( const slot of LIFE_MODULE_SLOTS ) {
    const choice = draft.lifeModules?.[slot];
    if ( !choice?.key || !choice.skill?.key ) continue;
    const skill = { specialty: "", subject: "", ...choice.skill };
    const fixed = LIFE_MODULES[slot]?.[choice.key]?.specialty;
    if ( fixed && SKILLS[skill.key]?.specialty ) skill.specialty = fixed;
    const id = skillId(skill);
    const entry = skills.get(id) ?? { key: skill.key, specialty: skill.specialty, subject: skill.subject, rank: 0, base: 0, bonus: 0 };
    entry.bonus += 1;
    entry.rank += 1;
    skills.set(id, entry);
  }
  return [...skills.values()];
}

/**
 * Whether a set of Skills lets a character start with a unit type (p. 76).
 * @param {string} type
 * @param {{key: string, specialty?: string}[]} skills
 * @returns {boolean}
 */
export function hasHardwareSkills(type, skills) {
  const need = HARDWARE_SKILLS[type];
  if ( !need ) return true;
  const specialty = UNIT_TYPES[type]?.specialty;
  const has = key => skills.some(s => (s.key === key) && (s.rank ?? 1) > 0 && (!s.specialty || (s.specialty === specialty)));
  if ( need.all ) return need.all.every(has);
  return need.any.some(has);
}

/* -------------------------------------------- */
/*  Validation                                  */
/* -------------------------------------------- */

/**
 * Check a draft against the creation rules.
 * @param {object} draft
 * @returns {{step: string, code: string, data?: object}[]}  Problems, in step order. The GM may
 *   allow any of them (p. 69, 75–76), so they are warnings rather than hard stops.
 */
export function validateCreation(draft) {
  const issues = [];
  const add = (step, code, data = {}) => issues.push({ step, code, data });
  const budget = creationBudget(draft);
  const attributes = draft.attributes ?? {};
  const clan = isClanFaction(draft.faction);

  // Step 3: Clan characters start at Veteran (p. 198).
  if ( clan && (draft.experience !== CLAN_CREATION.experience) ) add("experience", "clanExperience");

  // Step 4: Attributes.
  const spent = attributePointsSpent(attributes);
  if ( spent > budget.attributes ) add("attributes", "attributesOver", { spent, budget: budget.attributes });
  else if ( spent < budget.attributes ) add("attributes", "attributesLeft", { n: budget.attributes - spent });
  for ( const key of BASE_ATTRIBUTES ) {
    if ( (attributes[key] ?? 1) > CREATION.attributeMax ) add("attributes", "attributeMax", { attribute: key, max: CREATION.attributeMax });
  }
  const edge = (attributes.edg ?? 1) + (draft.conversion?.edge ?? 0);
  if ( edge > CREATION.edgeMax ) add("attributes", "edgeMax", { max: CREATION.edgeMax });

  // Step 5: Skills.
  const skills = draft.skills ?? [];
  const skillPoints = skills.reduce((n, s) => n + s.rank, 0);
  if ( skillPoints > budget.skills ) add("skills", "skillsOver", { spent: skillPoints, budget: budget.skills });
  else if ( skillPoints < budget.skills ) add("skills", "skillsLeft", { n: budget.skills - skillPoints });
  const seen = new Set();
  for ( const s of skills ) {
    if ( s.rank < 1 ) add("skills", "skillMin", { skill: s.key });
    if ( s.rank > CREATION.skillMax ) add("skills", "skillMax", { skill: s.key, max: CREATION.skillMax });
    if ( SKILLS[s.key]?.specialty && !s.specialty ) add("skills", "skillSpecialty", { skill: s.key });
    if ( SKILLS[s.key]?.subject && !s.subject?.trim() ) add("skills", "skillSubject", { skill: s.key });
    const id = skillId(s);
    if ( seen.has(id) ) add("skills", "skillDuplicate", { skill: s.key });
    seen.add(id);
  }
  if ( !skills.some(s => SKILLS[s.key]?.subject) ) add("skills", "knowledgeNeeded");

  // Step 6: Traits.
  const traits = draft.traits ?? [];
  const positive = traits.filter(t => t.polarity === "positive").length;
  const negative = traits.filter(t => t.polarity === "negative").length;
  if ( !positive || !negative ) add("traits", "traitsNeeded");
  if ( (positive > CREATION.traitsMax) || (negative > CREATION.traitsMax) ) add("traits", "traitsMax", { max: CREATION.traitsMax });
  if ( positive !== negative ) add("traits", "traitsBalance", { positive, negative });
  const keys = traitKeys(draft);
  for ( const t of traits ) {
    if ( !t.key && (Math.abs(t.modifier ?? 0) > CREATION.traitModifierMax) ) add("traits", "traitModifier", { name: t.name });
    const requires = BOOK_TRAITS[t.key]?.requires;
    if ( requires && !keys.has(requires) ) add("traits", "traitRequires", { trait: t.key, requires });
  }
  if ( traits.filter(t => t.key).length !== keys.size ) add("traits", "traitDuplicate");

  // Step 7: Life Modules.
  for ( const slot of LIFE_MODULE_SLOTS ) {
    const choice = draft.lifeModules?.[slot];
    if ( !choice?.key ) {
      if ( !OPTIONAL_LIFE_MODULES.includes(slot) ) add("lifeModules", "lifeModuleMissing", { slot });
      continue;
    }
    if ( !lifeModuleAllowed(slot, choice.key, draft.lifeModules) ) add("lifeModules", "lifeModuleRequires", { slot, module: choice.key });
    if ( LIFE_MODULES[slot][choice.key]?.clan && !clan ) add("lifeModules", "lifeModuleClan", { slot, module: choice.key });
    const options = lifeModuleSkills(slot, choice.key);
    const skill = choice.skill;
    if ( !skill?.key || !options.includes(skill.key) ) add("lifeModules", "lifeModuleSkill", { slot });
    else if ( SKILLS[skill.key]?.subject && !skill.subject?.trim() ) add("lifeModules", "lifeModuleSubject", { slot });
    else if ( SKILLS[skill.key]?.specialty && !skill.specialty && !LIFE_MODULES[slot][choice.key].specialty ) {
      add("lifeModules", "lifeModuleSpecialty", { slot });
    }
  }

  // Step 8–10: armor, weapons, Inventory.
  if ( !STARTING_ARMOR[draft.armor] ) add("armor", "armorMissing");
  const limits = itemLimits(draft);
  const weapons = draft.weapons?.length ?? 0;
  if ( weapons > limits.weapons ) add("weapons", "weaponsOver", { n: weapons, max: limits.weapons });
  if ( (weapons + 1) > CREATION.weaponsMax ) add("weapons", "weaponsTotal", { max: CREATION.weaponsMax });
  const inventory = (draft.inventory ?? []).filter(i => i?.trim()).length;
  if ( inventory > limits.inventory ) add("inventory", "inventoryOver", { n: inventory, max: limits.inventory });

  // Step 11: Hardware.
  if ( clan && draft.dispossessed ) add("hardware", "clanDispossessed");
  if ( draft.hardware && !draft.dispossessed ) {
    const cost = draftHardwareCost(draft.hardware);
    if ( draft.hardware.clan && !clan ) add("hardware", "hardwareClan");
    if ( (cost > budget.hardware) && !draft.hardwarePool ) add("hardware", "hardwareOver", { cost, budget: budget.hardware });
    if ( !hasHardwareSkills(draft.hardware.type, finalSkills(draft)) ) add("hardware", "hardwareSkills", { type: draft.hardware.type });
  }
  const conversion = draft.conversion ?? {};
  const converted = (conversion.xp ?? 0) + (conversion.skills ?? 0) + (conversion.edge ?? 0);
  const unspent = draft.dispossessed ? 0 : unspentHardware(draft);
  if ( converted !== unspent ) add("hardware", "conversion", { converted, unspent });

  return issues;
}
