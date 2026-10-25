import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./helpers/foundry-mock.mjs";

/*
 * Checks the compendium data built from packs-src/ against the system's data models, so a typo in
 * the book data shows up here rather than as a silently dropped field in Foundry.
 */

const { PACKS, buildPacks } = await import("../tools/pack-builder.mjs");
const { CharacterData } = await import("../module/data/actor-character.mjs");
const { NpcData } = await import("../module/data/actor-npc.mjs");
const { MechData } = await import("../module/data/actor-mech.mjs");
const { VehicleData } = await import("../module/data/actor-vehicle.mjs");
const { FighterData } = await import("../module/data/actor-fighter.mjs");
const items = await import("../module/data/items.mjs");

const ACTOR_MODELS = { character: CharacterData, npc: NpcData, mech: MechData, vehicle: VehicleData, fighter: FighterData };
const ITEM_MODELS = {
  skill: items.SkillData, trait: items.TraitData, weapon: items.WeaponData, armor: items.ArmorData, gear: items.GearData,
  mechWeapon: items.MechWeaponData, mechEquipment: items.MechEquipmentData
};

const packs = buildPacks();
const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url)));

/**
 * Paths in source data that the schema has no field for, or whose value is not one of the choices.
 * @param {object} field   A SchemaField (or other field) from the mock.
 * @param {*} value
 * @param {string} path
 * @returns {string[]}
 */
function schemaProblems(field, value, path = "system") {
  if ( field.fields ) {
    if ( (typeof value !== "object") || (value === null) ) return [`${path} is not an object`];
    return Object.entries(value).flatMap(([k, v]) => (k in field.fields
      ? schemaProblems(field.fields[k], v, `${path}.${k}`)
      : [`${path}.${k} is not in the schema`]));
  }
  if ( field.element ) {
    if ( !Array.isArray(value) ) return [`${path} is not an array`];
    return value.flatMap((v, i) => schemaProblems(field.element, v, `${path}.${i}`));
  }
  let { choices } = field.options;
  if ( typeof choices === "function" ) choices = choices();
  if ( choices && !(value in choices) ) return [`${path} = ${JSON.stringify(value)} is not a choice`];
  return [];
}

const isFolder = doc => doc._key.startsWith("!folders!");
const documents = pack => packs[pack].filter(d => !isFolder(d));

const schemaOf = Model => new foundry.data.fields.SchemaField(Model.defineSchema());

test("system.json declares every pack the builder makes", () => {
  assert.deepEqual(manifest.packs.map(p => [p.name, p.label, p.type, p.path]),
    PACKS.map(p => [p.name, p.label, p.type, `packs/${p.name}`]));
  assert.deepEqual(manifest.packFolders[0].packs.sort(), PACKS.map(p => p.name).sort());
  assert.deepEqual(Object.keys(packs).sort(), PACKS.map(p => p.name).sort());
});

test("the packs hold the book's content", () => {
  const count = (pack, type) => documents(pack).filter(d => !type || (d.type === type)).length;
  assert.equal(count("mechs", "mech"), 18);
  assert.equal(count("vehicles", "vehicle"), 8);
  assert.equal(count("fighters", "fighter"), 6);
  assert.equal(count("npcs", "npc"), 29);
  assert.equal(count("characters", "character"), 22);
  assert.ok(count("weapons") > 50);
  assert.equal(count("armor"), 7);
});

test("ids and keys are unique and folders exist", () => {
  const ids = new Set();
  for ( const [name, docs] of Object.entries(packs) ) {
    const folders = new Set(docs.filter(isFolder).map(d => d._id));
    for ( const doc of docs ) {
      assert.match(doc._id, /^[A-Za-z0-9]{16}$/);
      assert.ok(!ids.has(doc._id), `${name}: duplicate id for ${doc.name}`);
      ids.add(doc._id);
      if ( doc.folder ) assert.ok(folders.has(doc.folder), `${name}: ${doc.name} is in a missing folder`);
      for ( const item of doc.items ?? [] ) {
        assert.equal(item._key, `!actors.items!${doc._id}.${item._id}`);
        assert.ok(!ids.has(item._id), `${name}: duplicate item id on ${doc.name}`);
        ids.add(item._id);
      }
    }
  }
});

test("every document's system data fits its data model", () => {
  const problems = [];
  const check = (doc, models, where) => {
    const Model = models[doc.type];
    if ( !Model ) return problems.push(`${where}: unknown type ${doc.type}`);
    problems.push(...schemaProblems(schemaOf(Model), doc.system ?? {}).map(p => `${where}: ${p}`));
  };
  for ( const [name, docs] of Object.entries(packs) ) {
    for ( const doc of docs ) {
      if ( isFolder(doc) ) continue;
      if ( doc._key.startsWith("!actors!") ) {
        check(doc, ACTOR_MODELS, `${name}/${doc.name}`);
        for ( const item of doc.items ) check(item, ITEM_MODELS, `${name}/${doc.name}/${item.name}`);
      }
      else check(doc, ITEM_MODELS, `${name}/${doc.name}`);
    }
  }
  assert.deepEqual(problems, []);
});

test("compendium units prepare with their armor and a regular crew", () => {
  const battleMaster = documents("mechs").find(d => d.name.startsWith("BattleMaster"));
  const actor = { type: "mech", items: [] };
  actor.system = new MechData(structuredClone(battleMaster.system), { parent: actor });
  actor.system.prepareDerivedData();
  assert.ok(actor.system.armorTotal.max > 0);
  assert.ok(actor.system.structureTotal.max > 0);
  assert.equal(actor.system.builtInCrew.active, true);
  assert.equal(actor.system.builtInCrew.gunnery, 5);
  for ( const pack of ["mechs", "vehicles", "fighters"] ) {
    for ( const doc of documents(pack) ) {
      assert.ok(doc.items.some(i => i.type === "mechWeapon"), `${doc.name} has no weapons`);
    }
  }
});

test("sample characters point at units that exist", () => {
  const units = new Set(["mechs", "vehicles", "fighters"].flatMap(pack => documents(pack)
    .map(d => `Compendium.mechwarrior-destiny.${pack}.Actor.${d._id}`)));
  const linked = packs.characters.map(pc => pc.flags["mechwarrior-destiny"]?.sampleHardware).filter(Boolean);
  assert.ok(linked.length > 10);
  for ( const uuid of linked ) assert.ok(units.has(uuid), `missing unit ${uuid}`);
  for ( const pc of packs.characters ) {
    assert.equal(pc.prototypeToken.actorLink, true);
    assert.equal(pc.system.creation.complete, true);
  }
});

test("compendium lists show book items in the world's language, units keep their names", async () => {
  globalThis.game = { i18n: { localize: key => `ru:${key}` } };
  const { translateIndex } = await import("../module/documents/compendium.mjs");
  const index = [...packs.armor, ...packs.traits].filter(d => !isFolder(d)).map(d => ({ name: d.name, flags: d.flags }));
  const unit = { name: "Wasp WSP-1A", flags: {} };
  translateIndex({ index: [...index, unit] });
  assert.ok(index.every(e => e.name.startsWith("ru:MWD.")), index.find(e => !e.name.startsWith("ru:"))?.name);
  assert.equal(unit.name, "Wasp WSP-1A");
  delete globalThis.game;
});
