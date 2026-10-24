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
