/**
 * Turns the book data in packs-src/ into Foundry documents for the system's compendiums. Pure
 * Node code: tests check the output, and build-packs.mjs writes it into LevelDB packs.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOOK_TRAITS, EXPERIENCE_LEVELS, FREE_WEAPONS, MECH_LOCATION_KEYS, SKILLS, SPECIALTIES, SYSTEM_ID, UNIT_TYPES
} from "../module/config.mjs";
import { CHARACTERS } from "../packs-src/characters.mjs";
import { NPC_GROUPS } from "../packs-src/npcs.mjs";
import { ARMOR, INVENTORY, WEAPON_GROUPS } from "../packs-src/personal.mjs";
import { FIGHTERS, MECHS, VEHICLES } from "../packs-src/units.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EN = JSON.parse(readFileSync(join(ROOT, "lang/en.json"), "utf8")).MWD;
const VERSION = JSON.parse(readFileSync(join(ROOT, "system.json"), "utf8")).version;

/** Compendiums the system ships, in sidebar order. */
export const PACKS = [
  { name: "weapons", label: "Personal Weapons", type: "Item" },
  { name: "armor", label: "Armor", type: "Item" },
  { name: "inventory", label: "Inventory", type: "Item" },
  { name: "skills", label: "Skills", type: "Item" },
  { name: "traits", label: "Traits", type: "Item" },
  { name: "mechs", label: "BattleMechs", type: "Actor" },
  { name: "vehicles", label: "Combat Vehicles", type: "Actor" },
  { name: "fighters", label: "Aerospace Fighters", type: "Actor" },
  { name: "npcs", label: "NPCs", type: "Actor" },
  { name: "characters", label: "Sample Characters", type: "Actor" }
];

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * A stable 16-character document id, so rebuilding a pack keeps every id and links stay valid.
 * @param {...string} parts
 * @returns {string}
 */
export function stableId(...parts) {
  const bytes = createHash("sha256").update(parts.join("\u0000")).digest();
  return Array.from(bytes.subarray(0, 16), b => ID_CHARS[b % ID_CHARS.length]).join("");
}

const STATS = { coreVersion: "13.351", systemId: SYSTEM_ID, systemVersion: VERSION };
const flag = data => ({ [SYSTEM_ID]: data });
const html = text => (text ? `<p>${text}</p>` : "");

/**
 * Book range notation to stored range codes: "OK" → "0", "–2" → "-2", "+2" → "2", "—" → "x".
 * @param {string} text
 * @returns {string}
 */
export function rangeCode(text) {
  const t = text.trim().replace(/[–−]/g, "-");
  if ( (t === "OK") || (t === "0") ) return "0";
  if ( /^[—-]$/.test(t) ) return "x";
  const n = Number(t);
  if ( !Number.isInteger(n) ) throw new Error(`Unknown range "${text}"`);
  return String(n);
}

/* -------------------------------------------- */
/*  Personal-scale items                        */
/* -------------------------------------------- */

/**
 * Item data for a personal weapon row (see packs-src/personal.mjs).
 * @param {Array} row     [name, damage, close, near, far, special?, type?, skill?]
 * @param {object} group  The row's weapon group.
 * @returns {object}
 */
export function weaponData(row, group = {}) {
  const [name, code, close, near, far, special = "", type, skill] = row;
  const m = /^(\d+)(S)?(F)?$/.exec(code);
  if ( !m ) throw new Error(`Unknown damage code "${code}" for ${name}`);
  const free = Object.keys(FREE_WEAPONS).find(k => EN.Weapon.Free[k] === name);
  const data = {
    name,
    type: "weapon",
    img: group.skill === "meleeCombat" ? "icons/svg/sword.svg" : "icons/svg/target.svg",
    system: {
      skill: skill ?? group.skill ?? "smallArms",
      damage: Number(m[1]),
      damageType: type ?? group.type ?? "",
      fatigue: !!m[3],
      strBonus: !!m[2],
      support: !!group.support,
      ranges: { close: rangeCode(close), near: rangeCode(near), far: rangeCode(far) },
      special,
      description: html(special)
    }
  };
  if ( free ) data.flags = flag({ freeWeapon: free });
  return data;
}

/** Every catalog weapon by name. */
export const CATALOG_WEAPONS = new Map(WEAPON_GROUPS.flatMap(group => group.rows.map(row => [row[0], weaponData(row, group)])));

/**
 * A weapon carried by a character or NPC: a catalog name, { name, from, special? } for a catalog
 * weapon under another name, or a catalog-style row whose last element may hold { skill, special }.
 * @param {string|object|Array} entry
 * @returns {object}
 */
export function carriedWeapon(entry) {
  if ( typeof entry === "string" ) {
    const weapon = CATALOG_WEAPONS.get(entry);
    if ( !weapon ) throw new Error(`No catalog weapon "${entry}"`);
    return structuredClone(weapon);
  }
  if ( Array.isArray(entry) ) {
    const options = (typeof entry.at(-1) === "object") ? entry.at(-1) : {};
    const row = entry.slice(0, 5);
    const melee = (row[3] === "—") && (row[4] === "—") && !options.skill;
    const group = { skill: options.skill ?? (melee ? "meleeCombat" : "smallArms") };
    return weaponData([...row, options.special ?? ""], group);
  }
  const weapon = CATALOG_WEAPONS.get(entry.from);
  if ( !weapon ) throw new Error(`No catalog weapon "${entry.from}"`);
  const data = structuredClone(weapon);
  data.name = entry.name;
  if ( entry.special ) Object.assign(data.system, { special: entry.special, description: html(entry.special) });
  return data;
}

/**
 * Armor item data by catalog name, or { name, reduceB, reduceE } for natural armor.
 * @param {string|object} entry
 * @returns {object|null}
 */
export function armorData(entry) {
  if ( !entry ) return null;
  if ( typeof entry === "object" ) {
    return {
      name: entry.name, type: "armor", img: "icons/svg/shield.svg",
      system: { pips: 0, reduceB: entry.reduceB ?? 0, reduceE: entry.reduceE ?? 0, natural: true, equipped: true }
    };
  }
  const armor = ARMOR.find(a => a.name === entry);
  if ( !armor ) throw new Error(`No catalog armor "${entry}"`);
  const data = {
    name: armor.name,
    type: "armor",
    img: "icons/svg/shield.svg",
    system: {
      pips: armor.pips,
      reduceB: armor.reduceB ?? 0,
      reduceE: armor.reduceE ?? 0,
      rflPenalty: armor.rflPenalty ?? 0,
      concealed: !!armor.concealed,
      equipped: true
    }
  };
  if ( armor.key ) data.flags = flag({ bookName: { armor: armor.key } });
  return data;
}

/** @param {string} name */
export function gearData(name) {
  return { name, type: "gear", img: "icons/svg/item-bag.svg", system: { description: "" } };
}

/**
 * English Skill name as the wizard builds it, e.g. "Gunnery (BattleMech)".
 * @param {string} key
 * @param {string} [specialty]
 * @param {string} [subject]
 */
function skillName(key, specialty = "", subject = "") {
  let name = EN.Skill[key];
  if ( specialty ) name += ` (${EN.Specialty[specialty]})`;
  if ( subject ) name += `: ${subject}`;
  return name;
}

/**
 * Skill item data from a source tuple.
 * @param {Array} entry  [key, rating, specialty or subject] or ["custom", rating, attribute, name].
 * @returns {object}
 */
export function skillData(entry) {
  const [key, rank] = entry;
  if ( key === "custom" ) {
    return { name: entry[3], type: "skill", img: "icons/svg/book.svg", system: { key: "custom", rank, attribute: entry[2] } };
  }
  const cfg = SKILLS[key];
  if ( !cfg ) throw new Error(`Unknown skill "${key}"`);
  const specialty = cfg.specialty ? (entry[2] ?? "") : "";
  const subject = cfg.subject ? (entry[2] ?? "") : "";
  if ( specialty && !(specialty in SPECIALTIES) ) throw new Error(`Unknown specialty "${specialty}"`);
  return {
    name: skillName(key, specialty, subject),
    type: "skill",
    img: "icons/svg/book.svg",
    system: { key, rank, attribute: cfg.attribute, specialty },
    flags: flag({ bookName: { skill: { key, specialty, subject } } })
  };
}

/**
 * Trait item data. Book Traits keep their rules data; the printed text becomes the description.
 * @param {{key?: string, name: string, polarity: string, text?: string}} trait
 * @returns {object}
 */
export function traitData({ key = "", name, polarity, text = "" }) {
  const cfg = BOOK_TRAITS[key];
  if ( key && !cfg ) throw new Error(`Unknown book trait "${key}"`);
  const data = {
    name: cfg ? EN.BookTrait[key].name : name,
    type: "trait",
    img: polarity === "positive" ? "icons/svg/upgrade.svg" : "icons/svg/downgrade.svg",
    system: {
      key,
      polarity: cfg?.polarity ?? polarity,
      modifier: cfg?.modifier ?? 0,
      appliesTo: cfg?.modifier ? EN.BookTrait[key].hint : "",
      effect: cfg?.effect ?? "",
      description: html(text || (cfg ? EN.BookTrait[key].hint : ""))
    }
  };
  if ( cfg ) data.flags = flag({ bookName: { trait: key } });
  return data;
}

/* -------------------------------------------- */
/*  'Mech-Scale units                           */
/* -------------------------------------------- */

const LOCATION_CODES = {
  H: "head", T: "torso", RA: "rightArm", LA: "leftArm", RL: "rightLeg", LL: "leftLeg",
  Front: "front", Rear: "rear", Turret: "turret", Rotor: "rotor",
  N: "nose", RW: "rightWing", LW: "leftWing", A: "aft"
};

const EQUIPMENT_LOCATIONS = { Torso: "torso", Head: "head", "Left Arm": "leftArm", "Right Arm": "rightArm",
  "Left Leg": "leftLeg", "Right Leg": "rightLeg" };

/**
 * A 'Mech-Scale weapon row: "Name | Damage | Type | Heat | Loc | PB S M L", without Heat for vehicles.
 * @param {string} row
 * @param {string} unitType
 * @returns {object}
 */
export function mechWeaponData(row, unitType) {
  const cells = row.split("|").map(c => c.trim());
  if ( unitType === "vehicle" ) cells.splice(3, 0, "—");
  const [label, code, types, heat, loc, ranges] = cells;
  const primary = label.startsWith("Primary:");
  let name = label.replace(/^Primary:\s*/, "");
  const bomb = name === "Bomb";

  const m = /^(\d+)(?:\+(M+))?(?: \(Max (\d+)\))?( \(or H\))?$/.exec(code);
  if ( !m ) throw new Error(`Unknown damage code "${code}" for ${name}`);

  const mounts = Object.fromEntries(UNIT_TYPES[unitType].locations.map(k => [k, false]));
  let rear = false;
  if ( !bomb ) {
    for ( const part of loc.split(",").map(p => p.trim()) ) {
      const rm = /^(\w+)\s*\(Rear\)$/.exec(part);
      if ( rm ) rear = true;
      const key = LOCATION_CODES[rm ? rm[1] : part];
      if ( !(key in mounts) ) throw new Error(`Unknown location "${part}" for ${name} on a ${unitType}`);
      mounts[key] = true;
    }
  }
  if ( rear ) name += " (Rear)";

  const brackets = ranges.split(/\s+/);
  if ( brackets.length !== 4 ) throw new Error(`Bad ranges "${ranges}" for ${name}`);
  const count = name.split(",").reduce((n, part) => n + Number(/^\s*(\d+) /.exec(part)?.[1] ?? 1), 0);

  return {
    name,
    type: "mechWeapon",
    img: bomb ? "icons/svg/explosion.svg" : "icons/svg/target.svg",
    system: {
      primary,
      damage: Number(m[1]),
      missiles: m[2]?.length ?? 0,
      maxDamage: Number(m[3] ?? 0),
      heatAlternative: !!m[4],
      types: types === "—" ? "" : types,
      heat: heat === "—" ? 0 : heat.length,
      count,
      bomb,
      mounts,
      ranges: Object.fromEntries(["pointblank", "short", "medium", "long"].map((k, i) => [k, rangeCode(brackets[i])]))
    }
  };
}

/**
 * Equipment row: "Ammo: SRM (Torso)", "Jump Jets", or anything else.
 * @param {string} row
 * @returns {object}
 */
export function mechEquipmentData(row) {
  const m = /^(.*?)\s*\(([^)]+)\)$/.exec(row);
  const location = m && EQUIPMENT_LOCATIONS[m[2]] ? EQUIPMENT_LOCATIONS[m[2]] : "";
  const name = location ? m[1] : row;
  const kind = name.startsWith("Ammo:") ? "ammo" : (name === "Jump Jets") ? "jumpJets" : "other";
  return { name, type: "mechEquipment", img: "icons/svg/item-bag.svg", system: { kind, location } };
}

/** Armor Diagram of a 'Mech: head, torso, arms and legs as [Armor, Structure]. */
function mechLocations({ head, torso, arms, legs }) {
  const loc = ([armor, structure]) => ({ armor, structure });
  const map = { head, torso, rightArm: arms, leftArm: arms, rightLeg: legs, leftLeg: legs };
  return Object.fromEntries(MECH_LOCATION_KEYS.map(k => [k, loc(map[k])]));
}

/**
 * Actor data for a unit from packs-src/units.mjs.
 * @param {object} unit
 * @param {"mech"|"vehicle"|"fighter"} type
 * @returns {object}
 */
export function unitData(unit, type) {
  const details = {
    model: unit.model ?? "",
    weightClass: unit.weight,
    tonnage: unit.tonnage,
    movement: unit.movement,
    tags: unit.tags
  };
  // Compendium units come with a regular crew, so the GM can field them as opponents right away.
  const system = { details, builtInCrew: { active: true, experience: "regular", gunnery: 5, piloting: 5, initiative: 0 } };
  if ( type === "mech" ) {
    Object.assign(details, { jumpJets: !!unit.jump, heatDissipation: unit.heat, punch: unit.punch !== false });
    system.locations = mechLocations(unit.armor);
  } else if ( type === "vehicle" ) {
    const { front, sides, rear, turret, rotor } = unit.armor;
    Object.assign(details, { motive: unit.motive, turret: !!turret });
    const loc = pair => (pair ? { armor: pair[0], structure: pair[1] } : { armor: 0, structure: 0 });
    system.locations = {
      front: loc(front), rightSide: loc(sides), leftSide: loc(sides), rear: loc(rear), turret: loc(turret), rotor: loc(rotor)
    };
  } else {
    details.heatDissipation = unit.heat;
    const { nose, wings, aft } = unit.armor;
    system.locations = { nose: { armor: nose }, rightWing: { armor: wings }, leftWing: { armor: wings }, aft: { armor: aft } };
    system.structure = { max: unit.structure };
  }
  const name = unit.model ? `${unit.name} ${unit.model}` : unit.name;
  return {
    name,
    type,
    system,
    prototypeToken: { name: unit.name, actorLink: false },
    items: [
      ...unit.weapons.map(row => mechWeaponData(row, type)),
      ...unit.equipment.map(mechEquipmentData)
    ]
  };
}

/* -------------------------------------------- */
/*  People                                      */
/* -------------------------------------------- */

const attributes = (values, edg = 1) => Object.fromEntries(
  ["str", "rfl", "int", "wil", "cha", "edg"].map((k, i) => [k, { value: values[i] ?? (k === "edg" ? edg : 1) }]));

/**
 * Actor data for a book NPC.
 * @param {object} npc
 * @returns {object}
 */
export function npcData(npc) {
  return {
    name: npc.name,
    type: "npc",
    system: { attributes: attributes(npc.attributes), tags: npc.tags },
    prototypeToken: { name: npc.name, actorLink: false },
    items: [
      ...npc.skills.map(skillData),
      ...npc.weapons.map(carriedWeapon),
      ...[armorData(npc.armor)].filter(Boolean),
      ...npc.inventory.map(gearData)
    ]
  };
}

/** Unit entries by catalog name, for linking a sample character's Hardware. */
const UNIT_INDEX = new Map([
  ...MECHS.map(u => [u.name, ["mechs", u, "mech"]]),
  ...VEHICLES.map(u => [u.name, ["vehicles", u, "vehicle"]]),
  ...FIGHTERS.map(u => [u.name, ["fighters", u, "fighter"]])
]);

/**
 * Actor data for a sample character. Its Hardware is linked by compendium UUID and imported along
 * with the character; personal vehicles are only noted.
 * @param {object} pc
 * @returns {object}
 */
export function characterData(pc) {
  if ( !(pc.details.experience in EXPERIENCE_LEVELS) ) throw new Error(`Unknown experience level for ${pc.name}`);
  const unit = UNIT_INDEX.get(pc.hardware);
  const flags = {};
  let notes = "";
  if ( unit ) {
    const [pack, entry, type] = unit;
    flags.sampleHardware = `Compendium.${SYSTEM_ID}.${pack}.Actor.${stableId(pack, unitData(entry, type).name)}`;
  } else if ( pc.hardware ) notes = html(`Hardware: ${pc.hardware} (personal vehicle, p. 172–174).`);
  return {
    name: pc.name,
    type: "character",
    system: {
      attributes: attributes(pc.attributes),
      tags: pc.tags,
      notes,
      details: { ...pc.details },
      lifeModules: { faction: "", childhood: "", education: "", realLife: "", ...pc.lifeModules },
      cues: pc.cues.join("\n"),
      creation: { complete: true },
      biography: {
        history: html(pc.history),
        personality: html(pc.personality),
        disposition: pc.disposition.join("\n")
      }
    },
    prototypeToken: { name: pc.name, actorLink: true },
    flags: flag(flags),
    items: [
      ...pc.skills.map(skillData),
      ...pc.traits.map(traitData),
      ...pc.weapons.map(carriedWeapon),
      ...[armorData(pc.armor)].filter(Boolean),
      ...pc.inventory.map(gearData)
    ]
  };
}

/* -------------------------------------------- */
/*  Packs                                       */
/* -------------------------------------------- */

/**
 * Give a document, its embedded items and folder the ids and keys the Foundry CLI packs.
 * @param {string} pack
 * @param {object} data
 * @param {object} [options]
 * @param {string|null} [options.folder]
 * @param {number} [options.sort]
 * @returns {object}
 */
function finalize(pack, data, { folder = null, sort = 0 } = {}) {
  const collection = PACKS.find(p => p.name === pack).type === "Actor" ? "actors" : "items";
  const _id = stableId(pack, data.name);
  const doc = { _id, _key: `!${collection}!${_id}`, folder, sort, flags: {}, ownership: { default: 0 }, _stats: STATS, ...data };
  doc.flags = data.flags ?? {};
  if ( collection === "actors" ) {
    doc.img ??= "icons/svg/mystery-man.svg";
    doc.effects = [];
    doc.items = (data.items ?? []).map((item, i) => {
      const itemId = stableId(pack, data.name, String(i), item.name);
      return { _id: itemId, _key: `!actors.items!${_id}.${itemId}`, sort: (i + 1) * 100000, flags: {}, effects: [],
        ownership: { default: 0 }, _stats: STATS, ...item, flags: item.flags ?? {} };
    });
  } else doc.effects = [];
  return doc;
}

/** Folder document for a pack. */
function folderData(pack, name, sort) {
  const type = PACKS.find(p => p.name === pack).type;
  const _id = stableId(pack, "folder", name);
  return { _id, _key: `!folders!${_id}`, name, type, sorting: "a", sort, folder: null, color: null, flags: {},
    description: "", _stats: STATS };
}

/**
 * Documents for one folder per group.
 * @param {string} pack
 * @param {Array<[string, object[]]>} groups  [folder name, document data]
 */
function grouped(pack, groups) {
  return groups.flatMap(([name, docs], i) => {
    const folder = folderData(pack, name, (i + 1) * 100);
    return [folder, ...docs.map((d, j) => finalize(pack, d, { folder: folder._id, sort: (j + 1) * 100 }))];
  });
}

const WEIGHT_FOLDERS = { light: "Light", medium: "Medium", heavy: "Heavy", assault: "Assault" };

/** Units grouped into weight-class folders. */
function unitPack(pack, units, type) {
  return grouped(pack, Object.entries(WEIGHT_FOLDERS)
    .map(([key, label]) => [label, units.filter(u => u.weight === key).map(u => unitData(u, type))])
    .filter(([, docs]) => docs.length));
}

/**
 * Every pack's documents, keyed by pack name.
 * @returns {Record<string, object[]>}
 */
export function buildPacks() {
  const skillEntries = Object.entries(SKILLS).flatMap(([key, cfg]) => (cfg.specialty
    ? Object.keys(SPECIALTIES).map(s => skillData([key, 1, s]))
    : [skillData([key, 1])]));
  const traits = Object.entries(BOOK_TRAITS).map(([key, cfg]) => traitData({ key, polarity: cfg.polarity }));
  return {
    weapons: grouped("weapons", WEAPON_GROUPS.map(g => [g.folder, g.rows.map(row => weaponData(row, g))])),
    armor: ARMOR.map((a, i) => finalize("armor", armorData(a.name), { sort: (i + 1) * 100 })),
    inventory: grouped("inventory", Object.entries(INVENTORY).map(([folder, names]) => [folder, names.map(gearData)])),
    skills: skillEntries.map((s, i) => finalize("skills", s, { sort: (i + 1) * 100 })),
    traits: grouped("traits", [
      ["Positive Traits", traits.filter(t => t.system.polarity === "positive")],
      ["Negative Traits", traits.filter(t => t.system.polarity === "negative")]
    ]),
    mechs: unitPack("mechs", MECHS, "mech"),
    vehicles: unitPack("vehicles", VEHICLES, "vehicle"),
    fighters: unitPack("fighters", FIGHTERS, "fighter"),
    npcs: grouped("npcs", NPC_GROUPS.map(g => [g.folder, g.npcs.map(npcData)])),
    characters: CHARACTERS.map((pc, i) => finalize("characters", characterData(pc), { sort: (i + 1) * 100 }))
  };
}
