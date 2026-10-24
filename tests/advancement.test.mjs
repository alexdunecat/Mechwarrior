import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers/foundry-mock.mjs";

/*
 * Runs XP purchases and their undo against a minimal stand-in for Foundry documents.
 */

const warnings = [];

function setProperty(obj, path, value) {
  const parts = path.split(".");
  let target = obj;
  for ( const part of parts.slice(0, -1) ) target = target[part] ??= {};
  target[parts.at(-1)] = value;
}

Object.assign(globalThis, {
  game: {
    i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d)}`, lang: "en" },
    user: { isGM: true }
  },
  ui: { notifications: { warn: m => warnings.push(m), info: () => {} } }
});
foundry.utils = { setProperty, deepClone: v => structuredClone(v), randomID: () => Math.random().toString(36).slice(2, 10) };
foundry.applications = { api: { DialogV2: { confirm: async () => true } } };

const Advancement = await import("../module/documents/advancement.mjs");

/** A character whose update() writes straight into its system data. */
function makeCharacter({ xp = 0, attributes = {}, items = [] } = {}) {
  const actor = {
    system: {
      xp: { value: xp, total: xp },
      attributes: Object.fromEntries(["str", "rfl", "int", "wil", "cha", "edg"].map(k => [k, { value: attributes[k] ?? 1 }])),
      advancement: [],
      hardware: [],
      creation: { bankedHardware: 0, dispossessed: false }
    },
    items: new Map()
  };
  const addItem = data => {
    const item = { id: data._id ?? `item${actor.items.size}`, name: data.name, type: data.type, system: structuredClone(data.system ?? {}) };
    item.update = async changes => {
      for ( const [k, v] of Object.entries(changes) ) setProperty(item, k, v);
    };
    item.delete = async () => actor.items.delete(item.id);
    item.toObject = () => ({ _id: item.id, name: item.name, type: item.type, system: structuredClone(item.system) });
    actor.items.set(item.id, item);
    return item;
  };
  actor.items.has = id => Map.prototype.has.call(actor.items, id);
  actor.update = async changes => {
    for ( const [k, v] of Object.entries(changes) ) setProperty(actor, k, structuredClone(v));
  };
  actor.createEmbeddedDocuments = async (_type, list) => list.map(addItem);
  actor.deleteEmbeddedDocuments = async (_type, ids) => ids.forEach(id => actor.items.delete(id));
  actor.updateEmbeddedDocuments = async (_type, updates) => {
    for ( const { _id, ...changes } of updates ) await actor.items.get(_id).update(changes);
  };
  for ( const data of items ) addItem(data);
  return actor;
}

test("raising an Attribute spends XP and can be undone", async () => {
  const actor = makeCharacter({ xp: 8, attributes: { cha: 2 } });
  await Advancement.improveAttribute(actor, "cha");
  assert.equal(actor.system.attributes.cha.value, 3);
  assert.equal(actor.system.xp.value, 3);
  assert.equal(actor.system.advancement.length, 1);
  assert.equal(actor.system.advancement[0].cost, 5);

  await Advancement.undoLast(actor);
  assert.equal(actor.system.attributes.cha.value, 2);
  assert.equal(actor.system.xp.value, 8);
  assert.equal(actor.system.advancement.length, 0);
});

test("purchases need enough XP", async () => {
  const actor = makeCharacter({ xp: 2, attributes: { str: 3 } });
  warnings.length = 0;
  assert.equal(await Advancement.improveAttribute(actor, "str"), false);
  assert.equal(actor.system.attributes.str.value, 3);
  assert.equal(warnings.length, 1);
});

test("raising a Skill and removing a negative Trait", async () => {
  const actor = makeCharacter({ xp: 20, items: [
    { _id: "demo", name: "Demolitions", type: "skill", system: { rank: 2 } },
    { _id: "bad", name: "Poor Vision", type: "trait", system: { polarity: "negative", modifier: -1 } }
  ] });
  await Advancement.improveSkill(actor, actor.items.get("demo"));
  assert.equal(actor.items.get("demo").system.rank, 3);
  assert.equal(actor.system.xp.value, 15);

  await Advancement.removeTrait(actor, actor.items.get("bad"));
  assert.equal(actor.items.has("bad"), false);
  assert.equal(actor.system.xp.value, 9);

  // Undo brings the Trait back, then the Skill rank.
  await Advancement.undoLast(actor);
  assert.equal(actor.items.get("bad").name, "Poor Vision");
  assert.equal(actor.system.xp.value, 15);
  await Advancement.undoLast(actor);
  assert.equal(actor.items.get("demo").system.rank, 2);
  assert.equal(actor.system.xp.value, 20);
});

test("customizing a weapon records the change", async () => {
  const actor = makeCharacter({ xp: 3, items: [
    { _id: "gun", name: "Rifle", type: "weapon", system: { ranges: { close: "0", near: "0", far: "-2" }, mods: { accuracy: false, lethality: false, range: "" } } }
  ] });
  const gun = actor.items.get("gun");
  gun.system._source = structuredClone(gun.system);
  await Advancement.customizeWeapon(actor, gun, "lethality");
  assert.equal(gun.system.mods.lethality, true);
  assert.equal(actor.system.xp.value, 0);
  await Advancement.undoLast(actor);
  assert.equal(gun.system.mods.lethality, false);
});

test("repairing a destroyed unit costs 2 XP and restores it", async () => {
  const actor = makeCharacter({ xp: 3 });
  const unitSystem = {
    status: { destroyed: true, prone: false },
    locations: { torso: { armorDamage: 2, structureDamage: 3 } },
    crits: { gyro: 1, engine: 0, legs: 0 },
    heat: { value: 2, level: 1 },
    smallArms: 0
  };
  const weapon = { id: "ppc", system: { destroyed: true } };
  const unit = {
    type: "mech", name: "Griffin", isOwner: true,
    system: { ...structuredClone(unitSystem), _source: structuredClone(unitSystem) },
    items: [weapon],
    update: async changes => { for ( const [k, v] of Object.entries(changes) ) setProperty(unit, k, v); },
    updateEmbeddedDocuments: async (_type, updates) => updates.forEach(u => { weapon.system.destroyed = u["system.destroyed"]; })
  };
  await Advancement.repairHardware(actor, unit);
  assert.equal(actor.system.xp.value, 1);
  assert.equal(unit.system.status.destroyed, false);
  assert.equal(unit.system.locations.torso.structureDamage, 0);
  assert.equal(unit.system.crits.gyro, 0);
  assert.equal(weapon.system.destroyed, false);
  assert.equal(actor.system.advancement[0].kind, "rebuild");
});
