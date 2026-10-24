import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor, makeItem } from "./helpers/foundry-mock.mjs";

const { CharacterData } = await import("../module/data/actor-character.mjs");
const { NpcData } = await import("../module/data/actor-npc.mjs");
const { ArmorData, SkillData, WeaponData } = await import("../module/data/items.mjs");

test("a new character starts with book defaults", () => {
  const actor = makeActor(CharacterData, {});
  const { system } = actor;
  assert.equal(system.attributes.str.value, 1);
  assert.equal(system.plotPoints.value, 3);
  assert.equal(system.plotPoints.max, 5);
  assert.equal(system.details.experience, "regular");
  assert.equal(system.edge.max, 1);
  assert.equal(system.edge.remaining, 1);
  // STR 1 and WIL 1 cross off four pips on each track.
  assert.equal(system.condition.physical.track.capacity, 9);
  assert.equal(system.woundModifier, 0);
  assert.equal(system.usesEdge, true);
});

test("wounds on both tracks add up", () => {
  const actor = makeActor(CharacterData, {
    attributes: { str: { value: 5 }, wil: { value: 5 } },
    condition: { physical: { value: 6 }, fatigue: { value: 3 } }
  });
  assert.equal(actor.system.condition.physical.track.modifier, -2);
  assert.equal(actor.system.condition.fatigue.track.modifier, -1);
  assert.equal(actor.system.woundModifier, -3);
});

test("worn armor feeds pips and its RFL penalty", () => {
  const plate = makeItem(ArmorData, { type: "armor", name: "Ballistic Plate",
    system: { pips: 12, damage: 2, reduceB: 3, rflPenalty: 1 } });
  const actor = makeActor(CharacterData, { attributes: { rfl: { value: 3 } } }, [plate]);
  assert.equal(actor.system.armor.max, 12);
  assert.equal(actor.system.armor.value, 10);
  assert.equal(actor.system.attributes.rfl.total, 2);
  assert.equal(actor.system.attributes.rfl.value, 3);
  assert.equal(plate.system.effectLabel, "–3 B, –1 RFL");
});

test("unworn armor is ignored", () => {
  const vest = makeItem(ArmorData, { type: "armor", system: { equipped: false } });
  const actor = makeActor(CharacterData, {}, [vest]);
  assert.equal(actor.system.armor, null);
});

test("skill bonus is rating plus the linked attribute", () => {
  const skill = makeItem(SkillData, { type: "skill", system: { key: "smallArms", rank: 3, attribute: "rfl" } });
  makeActor(CharacterData, { attributes: { rfl: { value: 4 } } }, [skill]);
  assert.equal(skill.system.bonus, 7);
  assert.equal(skill.system.isCombat, true);
});

test("melee weapons add the STR bonus to damage", () => {
  const sword = makeItem(WeaponData, { type: "weapon", system: { damage: 2, strBonus: true, skill: "meleeCombat" } });
  const fists = makeItem(WeaponData, { type: "weapon", system: { damage: 2, strBonus: true, fatigue: true } });
  makeActor(CharacterData, { attributes: { str: { value: 4 } } }, [sword, fists]);
  assert.equal(sword.system.totalDamage, 3);
  assert.equal(sword.system.damageLabel, "2(+1)");
  assert.equal(fists.system.damageLabel, "2(+1)F");
});

test("tags and cues split into lists", () => {
  const actor = makeActor(CharacterData, { tags: "Scout, Quick;Alert", cues: "One\n\n Two " });
  assert.deepEqual(actor.system.tagList, ["Scout", "Quick", "Alert"]);
  assert.deepEqual(actor.system.cueList, ["One", "Two"]);
});

test("NPCs prepare without Edge", () => {
  const actor = makeActor(NpcData, { attributes: { str: { value: 3 } } });
  assert.equal(actor.system.usesEdge, false);
  assert.equal(actor.system.condition.physical.track.capacity, 11);
  assert.equal(actor.system.edge, undefined);
});

test("traits feed Initiative and rules effects", async () => {
  const { TraitData } = await import("../module/data/items.mjs");
  const sense = makeItem(TraitData, { type: "trait", name: "Combat Sense", system: { initiative: 1 } });
  const pain = makeItem(TraitData, { type: "trait", name: "Pain Resistance", system: { effect: "painResistance" } });
  const actor = makeActor(CharacterData, {
    details: { experience: "veteran" },
    attributes: { str: { value: 5 } },
    condition: { physical: { value: 3 } }
  }, [sense, pain]);
  assert.equal(actor.system.initiativeBonus, 2);
  assert.equal(actor.system.traitEffects.has("painResistance"), true);
  assert.equal(actor.system.woundModifier, 0);
});

test("a 'Mech derives remaining Armor, Movement and physical damage", async () => {
  const { MechData } = await import("../module/data/actor-mech.mjs");
  const loc = (armor, structure, armorDamage = 0, structureDamage = 0) => ({ armor, structure, armorDamage, structureDamage });
  const actor = makeActor(MechData, {
    details: { tonnage: 55, movement: 3, punch: true },
    locations: {
      head: loc(3, 1), torso: loc(7, 6, 2), rightArm: loc(5, 3), leftArm: loc(5, 3),
      rightLeg: loc(5, 4, 5, 4), leftLeg: loc(5, 4)
    },
    heat: { value: 3, level: 2 }
  });
  const { system } = actor;
  assert.equal(system.locations.torso.armorLeft, 5);
  assert.equal(system.locations.rightLeg.destroyed, true);
  assert.equal(system.legDestroyed, true);
  // Heat 2 carried over: –1 Movement; a destroyed leg caps it at 1.
  assert.equal(system.maxMovement, 1);
  assert.equal(system.heatEffects.ranged, -1);
  assert.deepEqual(system.physical, { punch: 2, kick: 4 });
  assert.deepEqual(system.armorTotal, { value: 3 + 5 + 5 + 5 + 0 + 5, max: 30 });
});

test("'Mech weapon damage codes", async () => {
  const { MechWeaponData } = await import("../module/data/items.mjs");
  const srm = makeItem(MechWeaponData, { type: "mechWeapon", system: { damage: 4, missiles: 1, maxDamage: 6, heat: 1, types: "E, M" } });
  assert.equal(srm.system.damageLabel, "4+M (Max 6)");
  assert.equal(srm.system.heatLabel, "H");
  assert.equal(srm.system.usesAmmo, true);
  const flamer = makeItem(MechWeaponData, { type: "mechWeapon", system: { damage: 1, heatAlternative: true, types: "E" } });
  assert.equal(flamer.system.damageLabel, "1 (or H)");
  assert.equal(flamer.system.usesAmmo, false);
  assert.deepEqual(flamer.system.locations, ["torso"]);
});

test("combat vehicle locations and motive damage", async () => {
  const { VehicleData } = await import("../module/data/actor-vehicle.mjs");
  const loc = (armor, structure, armorDamage = 0) => ({ armor, structure, armorDamage, structureDamage: 0 });
  const tank = makeActor(VehicleData, {
    details: { tonnage: 50, movement: 3, motive: "tracked", turret: true },
    locations: { front: loc(5, 2, 1), rightSide: loc(4, 2), leftSide: loc(4, 2), rear: loc(3, 2), turret: loc(4, 2), rotor: loc(9, 9) },
    crits: { movement: 2 }
  });
  assert.deepEqual(tank.system.locationKeys, ["front", "rightSide", "leftSide", "rear", "turret"]);
  assert.deepEqual(tank.system.armorTotal, { value: 4 + 4 + 4 + 3 + 4, max: 20 });
  assert.equal(tank.system.maxMovement, 1);
  assert.equal(tank.system.physical.ram, 5);
  assert.equal(tank.system.usesHeat, false);

  const vtol = makeActor(VehicleData, { details: { motive: "vtol" } });
  assert.deepEqual(vtol.system.locationKeys, ["front", "rightSide", "leftSide", "rear", "rotor"]);
});

test("aerospace fighters share Structure", async () => {
  const { FighterData } = await import("../module/data/actor-fighter.mjs");
  const fighter = makeActor(FighterData, {
    details: { movement: 5 },
    locations: { nose: { armor: 2, armorDamage: 2 }, rightWing: { armor: 2 }, leftWing: { armor: 2 }, aft: { armor: 2 } },
    structure: { max: 3, damage: 1 },
    heat: { value: 1, level: 1 },
    crits: { engine: 1 }
  });
  assert.deepEqual(fighter.system.armorTotal, { value: 6, max: 8 });
  assert.deepEqual(fighter.system.structureTotal, { value: 2, max: 3 });
  // Engine hit –1 and Heat 1 –1.
  assert.equal(fighter.system.maxMovement, 3);
  assert.equal(fighter.system.usesHeat, true);
});
