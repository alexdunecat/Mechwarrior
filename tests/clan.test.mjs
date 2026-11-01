import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers/foundry-mock.mjs";

/*
 * Clan Invasion appendix (p. 195–234): Clan technology, battle armor and Clan characters. The flows
 * run against the same minimal stand-in for Foundry as unit-damage.test.mjs.
 */

const dice = [];
const messages = [];
const actors = new Map();

function setProperty(obj, path, value) {
  const parts = path.split(".");
  let target = obj;
  for ( const part of parts.slice(0, -1) ) target = target[part] ??= {};
  target[parts.at(-1)] = value;
}

class Roll {
  constructor(formula) {
    this.formula = formula;
  }

  async evaluate() {
    const count = Number(this.formula.split("d")[0]);
    const results = [];
    for ( let i = 0; i < count; i++ ) results.push(dice.length ? dice.shift() : 1);
    this.dice = [{ results: results.map(result => ({ result })) }];
    this.total = results.reduce((a, b) => a + b, 0);
    return this;
  }
}

/** Script dice: a number is one die; {sum: n} is a 2D6 total. */
function script(...values) {
  dice.length = 0;
  for ( const v of values ) {
    if ( typeof v === "number" ) dice.push(v);
    else dice.push(Math.min(6, v.sum - 1), v.sum - Math.min(6, v.sum - 1));
  }
}

Object.assign(globalThis, {
  Roll,
  ChatMessage: {
    create: async data => {
      messages.push(data);
      return data;
    },
    getSpeaker: ({ actor }) => ({ alias: actor?.name }),
    applyMode: () => {}
  },
  game: {
    i18n: { localize: k => k, format: (k, d) => `${k} ${JSON.stringify(d)}` },
    settings: { get: () => 0 },
    user: { isGM: true, targets: new Set() }
  },
  ui: { notifications: { warn: () => {} } },
  fromUuidSync: uuid => actors.get(uuid) ?? null,
  fromUuid: async uuid => actors.get(uuid) ?? null
});
foundry.utils = { deepClone: v => structuredClone(v), setProperty };
foundry.applications = { handlebars: { renderTemplate: async (_path, context) => JSON.stringify(context) } };

const { MechData } = await import("../module/data/actor-mech.mjs");
const { VehicleData } = await import("../module/data/actor-vehicle.mjs");
const { FighterData } = await import("../module/data/actor-fighter.mjs");
const { MechWeaponData, MechEquipmentData } = await import("../module/data/items.mjs");
const { applyMechHit } = await import("../module/documents/mech.mjs");
const { applyVehicleHit } = await import("../module/documents/vehicle.mjs");
const { applyFighterHit } = await import("../module/documents/fighter.mjs");
const { applySmallArms } = await import("../module/documents/mixed.mjs");

const MODELS = { mech: MechData, vehicle: VehicleData, fighter: FighterData };
const ITEM_MODELS = { mechWeapon: MechWeaponData, mechEquipment: MechEquipmentData };

/** A unit actor whose update() writes to its source and prepares derived data again. */
function makeUnit(type, source, items = []) {
  const actor = { type, name: type, uuid: `Actor.${type}${actors.size}`, source: structuredClone(source), items: [] };
  const build = () => {
    actor.system = new MODELS[type](structuredClone(actor.source), { parent: actor });
    actor.system._source = JSON.parse(JSON.stringify(actor.system));
    actor.system.prepareDerivedData();
  };
  actor.items = items.map(([itemType, name, system]) => {
    const item = { id: name, name, type: itemType, parent: actor };
    item.system = new ITEM_MODELS[itemType](system, { parent: item });
    item.update = async changes => Object.assign(item.system, { destroyed: changes["system.destroyed"] });
    return item;
  });
  actor.itemTypes = { mechWeapon: actor.items.filter(i => i.type === "mechWeapon"), mechEquipment: actor.items.filter(i => i.type === "mechEquipment") };
  actor.update = async changes => {
    for ( const [key, value] of Object.entries(changes) ) setProperty(actor, key.replace(/^system\./, "source."), structuredClone(value));
    build();
  };
  actor.updateEmbeddedDocuments = async (_type, updates) => {
    for ( const u of updates ) actor.items.find(i => i.id === u._id).system.destroyed = u["system.destroyed"];
  };
  actor.applyUnitHit = damage => ({ mech: applyMechHit, vehicle: applyVehicleHit, fighter: applyFighterHit })[type](actor, damage);
  build();
  actors.set(actor.uuid, actor);
  return actor;
}

const loc = (armor, structure) => ({ armor, structure, armorDamage: 0, structureDamage: 0 });

const { BattleArmorData } = await import("../module/data/actor-battle-armor.mjs");
const { lbxGroups, reduceGroups, forcedCritChecks } = await import("../module/rules/mech.mjs");
const BA = await import("../module/rules/battle-armor.mjs");
const { applyBattleArmorHit } = await import("../module/documents/battle-armor.mjs");
const { apodDamage } = await import("../module/documents/apod.mjs");
const { hardwareCost, creationBudget, validateCreation } = await import("../module/rules/creation.mjs");
const { repairXpCost } = await import("../module/rules/advancement.mjs");

const mechLocations = () => ({
  head: loc(3, 1), torso: loc(1, 2), rightArm: loc(2, 2), leftArm: loc(2, 2), rightLeg: loc(3, 2), leftLeg: loc(3, 2)
});

/* -------------------------------------------- */
/*  Rules                                       */
/* -------------------------------------------- */

test("LB-X cluster rounds and AMS split and trim damage groups (p. 216)", () => {
  // "8 (C4)": 4 as one hit, then four 1-point hits.
  assert.deepEqual(lbxGroups(8, 4), [4, 1, 1, 1, 1]);
  assert.deepEqual(lbxGroups(4, 4), [1, 1, 1, 1]);
  // The AMS takes its roll off the last groups.
  assert.deepEqual(reduceGroups([4, 2, 1], 3), [4]);
  assert.deepEqual(reduceGroups([2], 5), []);
});

test("leg attacks and swarm fire always check for a critical hit, twice through Structure (p. 218)", () => {
  assert.deepEqual(forcedCritChecks("leftLeg", [{ location: "leftLeg", armor: 1, structure: 0 }]), ["leftLeg"]);
  assert.deepEqual(forcedCritChecks("leftLeg", [{ location: "leftLeg", armor: 0, structure: 1 }]), ["leftLeg", "leftLeg"]);
});

test("battle armor fills segments at Personal scale and whole pips at 'Mech scale (p. 217–219)", () => {
  const armor = { pips: 4, segments: 0 };
  assert.equal(BA.segmentsLeft(armor), 24);
  // 4 Personal Combat damage fills four segments of the first pip.
  assert.deepEqual(BA.personalSuitDamage(armor, 4), { segments: 4, overflow: 0, destroyed: false });
  // One 'Mech-Scale point then finishes that pip (2 segments) and fills nothing more.
  assert.deepEqual(BA.mechSuitDamage({ pips: 4, segments: 4 }, 1), { segments: 6, overflow: 0, destroyed: false });
  // Five points on a fresh suit: four pips and one point left for the Structure pip.
  assert.deepEqual(BA.mechSuitDamage(armor, 5), { segments: 24, overflow: 1, destroyed: true });
  assert.deepEqual(BA.personalSuitDamage({ pips: 4, segments: 22 }, 5), { segments: 2, overflow: 3, destroyed: true });
  assert.deepEqual(BA.suitPips({ pips: 2, segments: 8 }).map(p => p.filled), [6, 2]);
  assert.equal(BA.suitMaxMovement(true), 2);
  assert.equal(BA.mountedSuitHit(4), false);
  assert.equal(BA.mountedSuitHit(5), true);
});

test("A-Pods deal (1D6 × 5) on 1–3 (p. 216)", () => {
  assert.equal(apodDamage(3), 15);
  assert.equal(apodDamage(4), 0);
});

test("Clan Hardware costs and repairs (p. 199)", () => {
  assert.equal(hardwareCost("mech", "heavy"), 3);
  assert.equal(hardwareCost("mech", "heavy", { clan: true }), 4);
  assert.equal(hardwareCost("mech", "heavy", { clan: true, omni: true }), 5);
  assert.equal(hardwareCost("vehicle", "heavy", { clan: true }), 3);
  assert.equal(hardwareCost("battleArmor", "medium"), 1);
  assert.equal(repairXpCost(false, { omni: true, clanOwner: true }), 1);
  assert.equal(repairXpCost(true, { omni: true, clanOwner: false }), 4);
});

test("Clan characters: Veteran, +1 Hardware Point, Clan Life Modules, never Dispossessed (p. 198–199)", () => {
  const veteran = creationBudget({ experience: "veteran", faction: "fedsuns" }).hardware;
  assert.equal(creationBudget({ experience: "veteran", faction: "wolf" }).hardware, veteran + 1);
  const codes = draft => validateCreation(draft).map(i => i.code);
  const clan = codes({ experience: "regular", faction: "wolf", dispossessed: true, lifeModules: {} });
  assert.ok(clan.includes("clanExperience"));
  assert.ok(clan.includes("clanDispossessed"));
  const sphere = codes({
    experience: "regular", faction: "fedsuns",
    lifeModules: { childhood: { key: "truebornSibko" } },
    hardware: { uuid: "x", type: "mech", weightClass: "heavy", cost: 5, clan: true }
  });
  assert.ok(sphere.includes("lifeModuleClan"));
  assert.ok(sphere.includes("hardwareClan"));
});

/* -------------------------------------------- */
/*  Flows                                       */
/* -------------------------------------------- */

test("CASE turns a torso ammo explosion into an engine critical hit, and the pilot is not hurt", async () => {
  const mech = makeUnit("mech", { details: { tonnage: 75, movement: 3 }, locations: { ...mechLocations(), torso: loc(2, 3) } },
    [["mechEquipment", "Ammo: LRM", { kind: "ammo", location: "torso", case: true }]]);
  // 3 to the torso: 2 Armor, 1 Structure. Crit check 9, D6 1: ammo.
  script({ sum: 9 }, 1, 1, 1, 1, 1, 1);
  await applyMechHit(mech, { base: 3, location: "torso", source: "PPC" });
  assert.equal(mech.system.status.destroyed, false);
  assert.equal(mech.system.crits.engine, 1);
  assert.equal(mech.items[0].system.destroyed, true);
});

test("Gauss ammo does not explode, but its rifle can no longer fire (p. 216)", async () => {
  const mech = makeUnit("mech", { details: { tonnage: 95, movement: 2 }, locations: mechLocations() }, [
    ["mechEquipment", "Ammo: Gauss Rifle", { kind: "ammo", location: "leftArm", explosive: false, case: true }],
    ["mechWeapon", "Gauss Rifle", { damage: 5, types: "B", mounts: { leftArm: true } }],
    ["mechWeapon", "2 ER Large Lasers", { damage: 7, types: "E", mounts: { rightArm: true } }]
  ]);
  // 3 to the left arm: 2 Armor, 1 Structure. Crit check 10, D6 1: ammo.
  script({ sum: 10 }, 1, 1, 1, 1, 1, 1);
  await applyMechHit(mech, { base: 3, location: "leftArm", source: "AC/10" });
  assert.equal(mech.system.locations.leftArm.destroyed, false);
  assert.deepEqual(mech.items.map(i => i.system.destroyed), [true, true, false]);
});

test("LB-X cluster rounds land as separate hits, and an AMS stops part of a missile hit", async () => {
  const mech = makeUnit("mech", { details: { tonnage: 75, movement: 3 }, locations: mechLocations() });
  // "4 (C4)": four 1-point hits, each with its own hit location: 3, 4, 10, 11 (arms).
  script({ sum: 3 }, { sum: 4 }, { sum: 10 }, { sum: 11 });
  await applyMechHit(mech, { base: 4, lbx: 4, source: "LB 10-X" });
  const s = mech.system.locations;
  assert.equal(s.rightArm.armorDamage + s.leftArm.armorDamage, 4);

  const target = makeUnit("mech", { details: { tonnage: 40, movement: 4 }, locations: mechLocations() },
    [["mechEquipment", "Anti-Missile System", { kind: "ams", location: "torso" }]]);
  // "1+M (Max 4)": missile die 3 → groups [1, 3]; AMS rolls 2 → [1, 1]. Both land on the left leg (9).
  script(3, 2, { sum: 9 }, { sum: 9 });
  await applyMechHit(target, { base: 1, missiles: 1, max: 4, types: "M", source: "SRM" });
  assert.equal(target.system.locations.leftLeg.armorDamage, 2);
});

test("a 'Mech-Scale hit on battle armor fills pips and then the wearer (p. 219)", async () => {
  const wearer = { uuid: "Actor.esau", name: "Esau", isPerson: true, updates: [],
    system: { condition: { physical: { track: { capacity: 8 } } } } };
  wearer.update = async changes => wearer.updates.push(changes);
  actors.set(wearer.uuid, wearer);
  const suit = { type: "battleArmor", name: "Elemental", uuid: "Actor.suit", items: [], itemTypes: { mechEquipment: [] } };
  let source = { pilot: wearer.uuid, armor: { pips: 4, segments: 4 }, details: { movement: 2, jumpJets: true } };
  const build = () => {
    suit.system = new BattleArmorData(structuredClone(source), { parent: suit });
    suit.system.prepareDerivedData();
  };
  suit.update = async changes => {
    for ( const [key, value] of Object.entries(changes) ) setProperty(source, key.replace(/^system\./, ""), value);
    build();
  };
  build();
  actors.set(suit.uuid, suit);
  assert.equal(suit.system.armorTotal.value, 20);

  await applyBattleArmorHit(suit, { base: 2, source: "Medium Laser" });
  assert.equal(suit.system.armor.segments, 16);
  await applyBattleArmorHit(suit, { base: 3, source: "PPC" });
  assert.equal(suit.system.suitDestroyed, true);
  assert.equal(suit.system.status.destroyed, true);
  assert.deepEqual(wearer.updates.at(-1), { "system.condition.physical.value": 8 });
});
