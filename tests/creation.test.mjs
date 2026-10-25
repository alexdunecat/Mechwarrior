import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attributePointsSpent, creationBudget, finalSkills, hardwareCost, hasHardwareSkills, itemLimits, lifeModuleAllowed,
  lifeModuleSkills, unspentHardware, validateCreation
} from "../module/rules/creation.mjs";
import {
  attributeXpCost, canCustomize, dispossessedCost, hardwareXpCost, improveRange, repairUpdate, repairXpCost, skillXpCost,
  unitCondition
} from "../module/rules/advancement.mjs";

/** Sergeant Edwin Mendoza, the book's worked example (p. 68–76). */
function mendoza() {
  return {
    experience: "regular",
    attributes: { str: 2, rfl: 3, int: 1, wil: 2, cha: 2, edg: 1 },
    skills: [
      { key: "piloting", specialty: "vehicle", rank: 2 },
      { key: "gunnery", specialty: "vehicle", rank: 3 },
      { key: "smallArms", rank: 2 },
      { key: "leadership", rank: 2 },
      { key: "survival", rank: 2 },
      { key: "knowledge", subject: "Parliamentary Law", rank: 1 }
    ],
    traits: [
      { key: "equipped", polarity: "positive" },
      { key: "poorHearing", polarity: "negative", modifier: -1 }
    ],
    lifeModules: {
      childhood: { key: "warOrphan", skill: { key: "survival" } },
      education: { key: "militaryEnlistment", skill: { key: "supportWeapons" } },
      realLife: { key: "tourOfDuty", skill: { key: "gunnery", specialty: "vehicle" } }
    },
    armor: "flak",
    weapons: [{ data: { name: "Auto-Pistol" } }, { data: { name: "Vibroblade" } }],
    inventory: ["Armor Crew Kit", "Micro-Recorder", "Four-Card Drax", "Expensive Cigar", "Box of Matches", "Mother's Dog Tags"],
    hardware: { type: "vehicle", weightClass: "medium" },
    dispossessed: false,
    hardwarePool: false,
    conversion: { xp: 0, skills: 0, edge: 0 }
  };
}

/* -------------------------------------------- */
/*  Character creation                          */
/* -------------------------------------------- */

test("the book's example character passes every check", () => {
  assert.deepEqual(validateCreation(mendoza()), []);
});

test("Attribute points: 1 per point, 2 per point of EDG (p. 70)", () => {
  assert.equal(attributePointsSpent(mendoza().attributes), 5);
  assert.equal(attributePointsSpent({ str: 1, rfl: 1, int: 1, wil: 1, cha: 1, edg: 3 }), 4);
  const draft = { ...mendoza(), attributes: { str: 5, rfl: 1, int: 1, wil: 1, cha: 1, edg: 1 } };
  const codes = validateCreation(draft).map(i => i.code);
  assert.ok(codes.includes("attributeMax"));
  assert.ok(!codes.includes("attributesOver"), "4 points spent of 5");
  assert.ok(codes.includes("attributesLeft"));
});

test("Life Modules add 1 or grant the Skill at 1 (p. 73)", () => {
  const skills = finalSkills(mendoza());
  const find = (key, specialty = "") => skills.find(s => (s.key === key) && (s.specialty === specialty));
  assert.equal(find("survival").rank, 3);
  assert.equal(find("supportWeapons").rank, 1);
  assert.equal(find("supportWeapons").base, 0);
  assert.equal(find("gunnery", "vehicle").rank, 4);
  assert.equal(find("piloting", "vehicle").rank, 2);
  // Solaris VII Games is for BattleMechs whatever the player picked.
  const solaris = { ...mendoza(), lifeModules: { realLife: { key: "solarisGames", skill: { key: "piloting", specialty: "vehicle" } } } };
  assert.equal(finalSkills(solaris).find(s => s.key === "piloting" && s.specialty === "mech").rank, 1);
});

test("Life Module prerequisites and Skill choices (p. 74–75)", () => {
  assert.equal(lifeModuleAllowed("realLife", "tourOfDuty", { education: { key: "militaryAcademy" } }), true);
  assert.equal(lifeModuleAllowed("realLife", "tourOfDuty", { education: { key: "university" } }), false);
  assert.equal(lifeModuleAllowed("education", "familyTraining", { childhood: { key: "nobility" } }), true);
  assert.deepEqual(lifeModuleSkills("childhood", "backwoods"), ["tracking", "projectileWeapons"]);
  const travel = lifeModuleSkills("realLife", "travel");
  assert.ok(travel.includes("stealth") && !travel.includes("gunnery") && !travel.includes("artillery"));
  const draft = mendoza();
  draft.lifeModules.education = null;
  assert.ok(validateCreation(draft).some(i => i.code === "lifeModuleRequires"));
});

test("Skill rules: points, ranks 1–4, a Knowledge Skill, specialties (p. 70–71)", () => {
  const draft = mendoza();
  draft.skills = draft.skills.filter(s => s.key !== "knowledge");
  draft.skills[0].rank = 5;
  draft.skills.push({ key: "piloting", rank: 1 });
  const codes = validateCreation(draft).map(i => i.code);
  for ( const code of ["knowledgeNeeded", "skillMax", "skillSpecialty"] ) assert.ok(codes.includes(code), code);
});

test("Traits come in matching pairs, at most two of each (p. 72)", () => {
  const draft = mendoza();
  draft.traits.push({ key: "toughness", polarity: "positive" });
  assert.ok(validateCreation(draft).some(i => i.code === "traitsBalance"));
  draft.traits.push({ key: "", name: "Lucky Charm", polarity: "negative", modifier: -2 });
  assert.ok(validateCreation(draft).some(i => i.code === "traitModifier"));
  const prosthetic = { ...mendoza(), traits: [{ key: "prosthetic", polarity: "positive" }, { key: "enemy", polarity: "negative" }] };
  assert.ok(validateCreation(prosthetic).some(i => i.code === "traitRequires"));
});

test("Equipped gives one more weapon or two more Inventory items (p. 72)", () => {
  assert.deepEqual(itemLimits(mendoza()), { weapons: 3, inventory: 6 });
  const armed = { ...mendoza(), weapons: [{}, {}, {}] };
  assert.deepEqual(itemLimits(armed), { weapons: 3, inventory: 4 });
  assert.ok(validateCreation(armed).some(i => i.code === "inventoryOver"));
});

test("Poor and Wealthy change the creation budget (p. 72–73)", () => {
  const poor = { experience: "veteran", traits: [{ key: "poor", polarity: "negative" }] };
  assert.deepEqual(
    { ...creationBudget(poor), equipped: undefined },
    { attributes: 7, skills: 16, weapons: 1, inventory: 2, hardware: 1, equipped: undefined }
  );
  assert.equal(creationBudget({ experience: "green", traits: [{ key: "poor" }] }).hardware, 1);
  assert.equal(creationBudget({ experience: "regular", traits: [{ key: "wealthy" }] }).hardware, 3);
});

test("Hardware: costs, skills and unspent points (p. 76)", () => {
  assert.equal(hardwareCost("mech", "light"), 1);
  assert.equal(hardwareCost("vehicle", "medium"), 2);
  assert.equal(hardwareCost("fighter", "light"), 2);
  assert.equal(hardwareCost("fighter", "heavy"), 4);
  assert.equal(hasHardwareSkills("vehicle", [{ key: "piloting", specialty: "vehicle", rank: 1 }]), true);
  assert.equal(hasHardwareSkills("mech", [{ key: "piloting", specialty: "mech", rank: 1 }]), false);
  assert.equal(hasHardwareSkills("mech", [{ key: "piloting", specialty: "mech" }, { key: "gunnery", specialty: "mech" }]), true);
  assert.equal(hasHardwareSkills("mech", [{ key: "piloting", specialty: "vehicle" }, { key: "gunnery", specialty: "vehicle" }]), false);

  // A Veteran in a medium 'Mech keeps 1 point, which must be converted.
  const veteran = { ...mendoza(), experience: "veteran", hardware: { type: "vehicle", weightClass: "medium" } };
  assert.equal(unspentHardware(veteran), 1);
  assert.ok(validateCreation(veteran).some(i => i.code === "conversion"));
  veteran.conversion = { xp: 0, skills: 1, edge: 0 };
  assert.equal(creationBudget(veteran).skills, 18);
  // Dispossessed: no unit and nothing to convert.
  const dispossessed = { ...mendoza(), dispossessed: true, hardware: null };
  assert.ok(!validateCreation(dispossessed).some(i => i.step === "hardware"));
  // Too expensive unless the group pools its points.
  const heavy = { ...mendoza(), hardware: { type: "vehicle", weightClass: "heavy" } };
  assert.ok(validateCreation(heavy).some(i => i.code === "hardwareOver"));
  assert.ok(!validateCreation({ ...heavy, hardwarePool: true }).some(i => i.code === "hardwareOver"));
});

/* -------------------------------------------- */
/*  Advancement                                 */
/* -------------------------------------------- */

test("XP costs for Attributes and Skills (p. 77)", () => {
  assert.equal(attributeXpCost(2), 3);
  assert.equal(attributeXpCost(3), 5, "Mendoza's CHA 2 → 3");
  assert.equal(attributeXpCost(4), 12);
  assert.equal(attributeXpCost(5), 15);
  assert.equal(attributeXpCost(6), 36);
  assert.equal(attributeXpCost(7), null);
  assert.equal(skillXpCost(1), 2);
  assert.equal(skillXpCost(3), 5, "Demolitions 2 → 3");
  assert.equal(skillXpCost(6), 9);
  assert.equal(skillXpCost(7), null);
});

test("XP costs for Hardware (p. 76, 78)", () => {
  // Marco Maki's options: rebuild the Griffin, salvage a Warhammer, or buy a Marauder.
  assert.equal(repairXpCost(true), 2);
  assert.equal(repairXpCost(false), 1);
  assert.equal(hardwareXpCost("salvage", "mech", "heavy") + repairXpCost(true), 4);
  assert.equal(hardwareXpCost("buy", "mech", "heavy"), 5);
  assert.equal(hardwareXpCost("buy", "vehicle", "heavy"), 3);
  assert.equal(hardwareXpCost("salvage", "mech", "light"), 0);
  assert.equal(dispossessedCost("heavy"), 2);
});

test("weapon customization (p. 78)", () => {
  assert.equal(improveRange("-1"), "0");
  assert.equal(improveRange("-2"), "-1");
  assert.equal(improveRange("0"), "0");
  assert.equal(improveRange("x"), "x");
  const rifle = { ranges: { close: "0", near: "0", far: "-2" }, mods: { accuracy: false, lethality: false, range: "" } };
  assert.equal(canCustomize(rifle, "range"), true);
  assert.equal(canCustomize({ ...rifle, mods: { ...rifle.mods, range: "far" } }, "range"), false);
  assert.equal(canCustomize({ ...rifle, ranges: { close: "0", near: "0", far: "0" } }, "range"), false);
  assert.equal(canCustomize({ ...rifle, mods: { ...rifle.mods, lethality: true } }, "lethality"), false);
  assert.equal(canCustomize({ ...rifle, unique: true }, "accuracy"), false);
});

test("repairs restore a unit completely", () => {
  const tank = {
    status: { stunned: true, destroyed: true, disengaged: false },
    locations: { front: { armorDamage: 3, structureDamage: 1 }, rear: { armorDamage: 0, structureDamage: 0 } },
    crits: { movement: 2 },
    smallArms: 7
  };
  assert.deepEqual(unitCondition("vehicle", tank), { damaged: true, destroyed: true });
  const update = repairUpdate("vehicle", tank);
  assert.equal(update["system.locations.front.armorDamage"], 0);
  assert.equal(update["system.locations.front.structureDamage"], 0);
  assert.equal(update["system.crits.movement"], 0);
  assert.equal(update["system.status.destroyed"], false);
  assert.equal(update["system.smallArms"], 0);

  const fighter = { status: {}, locations: { nose: { armorDamage: 1 } }, structure: { damage: 2 }, heat: { value: 3, level: 2 },
    crits: { avionics: 1, engine: 0, engineFresh: true }, smallArms: 0 };
  const fix = repairUpdate("fighter", fighter);
  assert.equal(fix["system.structure.damage"], 0);
  assert.equal(fix["system.crits.engineFresh"], false);
  assert.equal(fix["system.heat.value"], 0);
  assert.ok(!("system.locations.nose.structureDamage" in fix));
  assert.deepEqual(unitCondition("mech", { status: {}, locations: { head: { armorDamage: 0, structureDamage: 0 } }, crits: { gyro: 0 } }),
    { damaged: false, destroyed: false });
});
