import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers/foundry-mock.mjs";

/*
 * Runs the 'Mech-Scale damage flows end to end against a minimal stand-in for Foundry documents,
 * dice and chat, with the dice results scripted.
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

test("a vehicle hit: armor, structure, critical hit and motive damage", async () => {
  const tank = makeUnit("vehicle", {
    details: { tonnage: 50, movement: 3, motive: "tracked", turret: true },
    locations: { front: loc(2, 2), rightSide: loc(4, 2), leftSide: loc(4, 2), rear: loc(3, 2), turret: loc(4, 2) }
  }, [["mechWeapon", "AC/5", { damage: 3, types: "B", mounts: { turret: true } }]]);
  // Location 7 (front) for 3: 2 Armor, 1 Structure. Crit check 9, D6 5: front Weapon Group, but the
  // only weapon is in the turret, so reroll: 2 = crew stunned. Then motive check 8: –2 Movement.
  script({ sum: 7 }, { sum: 9 }, 5, 2, 1, 1, 1, 1, { sum: 8 });
  await applyVehicleHit(tank, { base: 3, source: "PPC" });
  assert.equal(tank.system.locations.front.armorDamage, 2);
  assert.equal(tank.system.locations.front.structureDamage, 1);
  assert.equal(tank.system.status.stunned, true);
  assert.equal(tank.system.crits.movement, 2);
  assert.equal(tank.system.maxMovement, 1);
  assert.equal(tank.system.status.destroyed, false);

  // Turret takes 6: all Armor and Structure gone, the vehicle is destroyed.
  script({ sum: 10 });
  await applyVehicleHit(tank, { base: 6, source: "AC/20" });
  assert.equal(tank.system.status.destroyed, true);
});

test("a fighter hit: shared Structure and a 2+ damage critical hit check", async () => {
  const fighter = makeUnit("fighter", {
    details: { movement: 5, heatDissipation: 2 },
    locations: { nose: { armor: 2 }, rightWing: { armor: 2 }, leftWing: { armor: 2 }, aft: { armor: 2 } },
    structure: { max: 3 }
  }, [["mechWeapon", "Medium Laser", { damage: 2, types: "E", mounts: { nose: true } }]]);
  // Location 7 (nose) for 3: 2 Armor, 1 Structure. Crit check 8, crit roll 2: nose Weapon Group.
  script({ sum: 7 }, { sum: 8 }, { sum: 2 });
  await applyFighterHit(fighter, { base: 3, source: "PPC" });
  assert.equal(fighter.system.locations.nose.armorDamage, 2);
  assert.equal(fighter.system.structure.damage, 1);
  assert.equal(fighter.items[0].system.destroyed, true);
  // Nose again for 2: straight to Structure, which is then gone.
  script({ sum: 12 }, { sum: 3 });
  await applyFighterHit(fighter, { base: 2, source: "PPC" });
  assert.equal(fighter.system.structure.damage, 3);
  assert.equal(fighter.system.status.destroyed, true);
});

test("a 'Mech hit still transfers through a destroyed arm", async () => {
  const mech = makeUnit("mech", {
    details: { tonnage: 20, movement: 4 },
    locations: { head: loc(1, 1), torso: loc(2, 2), rightArm: loc(1, 1), leftArm: loc(1, 1), rightLeg: loc(2, 1), leftLeg: loc(2, 1) }
  }, [["mechWeapon", "Medium Laser", { damage: 3, types: "E", mounts: { rightArm: true, torso: false } }]]);
  // Location 3 (right arm) for 4 → arm gone, 2 to torso Armor. Crit checks: arm 5, torso none (no
  // Structure damage there).
  script({ sum: 3 }, { sum: 5 });
  await applyMechHit(mech, { base: 4, source: "PPC" });
  assert.equal(mech.system.locations.rightArm.destroyed, true);
  assert.equal(mech.system.locations.torso.armorDamage, 2);
  assert.equal(mech.items[0].system.destroyed, true);
});

test("people wear a unit down 20 damage at a time", async () => {
  const tank = makeUnit("vehicle", {
    details: { movement: 2, motive: "wheeled", turret: false },
    locations: { front: loc(5, 1), rightSide: loc(5, 1), leftSide: loc(5, 1), rear: loc(5, 1) }
  });
  await applySmallArms(tank, { value: 12, source: "Rifle" });
  assert.equal(tank.system.smallArms, 12);
  // 12 + 9 = 21: 1 damage at location 11, which without a turret hits the front; motive check 4.
  script({ sum: 11 }, { sum: 4 });
  await applySmallArms(tank, { value: 9, source: "Rifle" });
  assert.equal(tank.system.smallArms, 1);
  assert.equal(tank.system.locations.front.armorDamage, 1);
});
