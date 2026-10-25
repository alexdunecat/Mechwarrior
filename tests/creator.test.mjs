import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import "./helpers/foundry-mock.mjs";

/*
 * Drives the character creation wizard outside Foundry: every step's context is built and rendered
 * through its real template, then the draft is written to a stand-in character.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function setProperty(obj, path, value) {
  const parts = path.split(".");
  let target = obj;
  for ( const part of parts.slice(0, -1) ) target = target[part] ??= {};
  target[parts.at(-1)] = value;
}

class ApplicationV2 {
  constructor(options = {}) {
    this.options = options;
  }

  async _prepareContext() {
    return {};
  }

  async render() {
    return this;
  }

  async _onFirstRender() {}

  async close() {}
}

const unit = {
  uuid: "Actor.vedette", name: "Vedette", type: "vehicle", isUnit: true, isOwner: true,
  system: { details: { weightClass: "medium" }, pilot: "" }
};

Object.assign(globalThis, {
  game: {
    i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d)}`, lang: "en" },
    user: { isGM: true },
    actors: [unit],
    items: [],
    packs: []
  },
  ui: { notifications: { warn: () => {}, info: () => {} } },
  fromUuidSync: uuid => (uuid === unit.uuid ? unit : null),
  fromUuid: async uuid => (uuid === unit.uuid ? unit : null)
});
foundry.utils = { setProperty, deepClone: v => structuredClone(v) };
foundry.applications = {
  api: { ApplicationV2, HandlebarsApplicationMixin: Base => Base, DialogV2: { confirm: async () => true } },
  instances: new Map()
};
Math.clamp ??= (n, min, max) => Math.min(max, Math.max(min, n));

// Foundry's own Handlebars helpers, as far as the templates use them.
Handlebars.registerHelper({
  localize: (key, options) => (options?.hash && Object.keys(options.hash).length ? `${key} ${JSON.stringify(options.hash)}` : key),
  selectOptions: (choices, options) => new Handlebars.SafeString(Object.entries(choices ?? {})
    .map(([v, l]) => `<option value="${v}" ${String(options.hash.selected) === v ? "selected" : ""}>${l}</option>`).join("")),
  checked: v => (v ? "checked" : ""),
  disabled: v => (v ? "disabled" : ""),
  eq: (a, b) => a === b,
  and: (...args) => args.slice(0, -1).every(Boolean),
  not: v => !v,
  mwdSigned: v => (v >= 0 ? `+${v}` : `–${Math.abs(v)}`)
});
const template = path => Handlebars.compile(readFileSync(join(ROOT, path), "utf8"));
for ( const step of ["theme", "faction", "experience", "attributes", "skills", "traits", "lifeModules", "armor",
  "weapons", "inventory", "hardware", "cues", "background"] ) {
  Handlebars.registerPartial(`systems/mechwarrior-destiny/templates/creation/${step}.hbs`,
    readFileSync(join(ROOT, `templates/creation/${step}.hbs`), "utf8"));
}

const { CharacterCreator, STEPS } = await import("../module/apps/character-creator.mjs");
const { CharacterData } = await import("../module/data/actor-character.mjs");

/** A blank character that records what the wizard writes. */
function makeCharacter() {
  const actor = {
    id: "pc", uuid: "Actor.pc", name: "New Character", type: "character", flags: {}, created: [], deleted: [], boarded: null,
    items: [], itemTypes: { skill: [], trait: [], weapon: [], armor: [], gear: [] },
    getFlag: () => undefined,
    update: async changes => { for ( const [k, v] of Object.entries(changes) ) setProperty(actor, k, v); },
    createEmbeddedDocuments: async (_type, list) => { actor.created.push(...list); return list; },
    deleteEmbeddedDocuments: async (_type, ids) => actor.deleted.push(...ids),
    boardHardware: async u => { actor.boarded = u; },
    sheet: { render: () => {} }
  };
  actor.system = new CharacterData({}, { parent: actor });
  return actor;
}

test("every step renders, and finishing writes the character", async () => {
  const actor = makeCharacter();
  const app = new CharacterCreator({ actor });
  const step = template("templates/creation/step.hbs");
  const nav = template("templates/creation/nav.hbs");
  const footer = template("templates/creation/footer.hbs");

  // Fill in Sergeant Mendoza (p. 68–76).
  Object.assign(app.draft, {
    name: "Edwin Mendoza", faction: "fwl", experience: "regular",
    attributes: { str: 2, rfl: 3, int: 1, wil: 2, cha: 2, edg: 1 },
    skills: [
      { key: "piloting", specialty: "vehicle", subject: "", rank: 2 },
      { key: "gunnery", specialty: "vehicle", subject: "", rank: 3 },
      { key: "smallArms", specialty: "", subject: "", rank: 2 },
      { key: "leadership", specialty: "", subject: "", rank: 2 },
      { key: "survival", specialty: "", subject: "", rank: 2 },
      { key: "knowledge", specialty: "", subject: "Parliamentary Law", rank: 1 }
    ],
    traits: [
      { key: "equipped", name: "Equipped", polarity: "positive", modifier: 0 },
      { key: "poorHearing", name: "Poor Hearing", polarity: "negative", modifier: -1 }
    ],
    lifeModules: {
      childhood: { key: "warOrphan", skill: { key: "survival", specialty: "", subject: "" } },
      education: { key: "militaryEnlistment", skill: { key: "supportWeapons", specialty: "", subject: "" } },
      realLife: { key: "tourOfDuty", skill: { key: "gunnery", specialty: "vehicle", subject: "" } }
    },
    armor: "flak",
    weapons: [{ data: { name: "Auto-Pistol", type: "weapon", system: { damage: 4 } } }],
    inventory: ["Armor Crew Kit", "Box of Matches"],
    hardware: { uuid: unit.uuid, name: unit.name, type: "vehicle", weightClass: "medium" },
    cues: "Move it!"
  });

  for ( const key of STEPS ) {
    app.step = key;
    const context = await app._prepareContext({});
    assert.doesNotThrow(() => step(context), key);
    assert.doesNotThrow(() => nav(context), key);
    assert.doesNotThrow(() => footer(context), key);
    assert.equal(context.issues.length, 0, `${key}: ${context.issues.join("; ")}`);
  }

  await CharacterCreator.DEFAULT_OPTIONS.actions.finish.call(app);
  assert.equal(actor.name, "Edwin Mendoza");
  assert.equal(actor.system.details.factionKey, "fwl");
  assert.equal(actor.system.attributes.rfl.value, 3);
  assert.equal(actor.system.creation.complete, true);
  assert.deepEqual(actor.system.hardware, [unit.uuid]);
  assert.equal(actor.boarded, unit);
  const created = name => actor.created.find(i => i.name === name);
  assert.equal(created("MWD.Skill.gunnery (MWD.Specialty.vehicle)").system.rank, 4);
  assert.equal(created("MWD.Skill.supportWeapons").system.rank, 1);
  assert.equal(created("MWD.Skill.knowledge: Parliamentary Law").system.rank, 1);
  assert.equal(created("MWD.Armor.Type.flak").system.reduceB, 2);
  assert.ok(created("MWD.Weapon.Free.unarmed"));
  assert.ok(created("Auto-Pistol"));
  assert.equal(actor.created.filter(i => i.type === "gear").length, 2);
  assert.equal(actor.created.filter(i => i.type === "trait").length, 2);
  assert.match(actor.system.lifeModules.realLife, /tourOfDuty/);
});

test("Hardware conversion stays within the unspent points", async () => {
  const actor = makeCharacter();
  const app = new CharacterCreator({ actor });
  app.draft.experience = "veteran";
  app.step = "hardware";
  // No unit: all 3 Hardware Points are unspent; asking for 5 XP conversions keeps 3.
  const input = { name: "conversion.xp", type: "number", value: "5", dataset: {} };
  const listeners = {};
  app.element = { addEventListener: (type, fn) => { listeners[type] = fn; } };
  await app._onFirstRender({}, {});
  await listeners.change({ target: input, stopPropagation: () => {} });
  assert.equal(app.draft.conversion.xp, 3);
  await listeners.change({ target: { ...input, name: "conversion.edge", value: "2" }, stopPropagation: () => {} });
  assert.deepEqual(app.draft.conversion, { xp: 1, skills: 0, edge: 2 });
});
