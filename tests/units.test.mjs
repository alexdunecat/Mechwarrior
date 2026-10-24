import { test } from "node:test";
import assert from "node:assert/strict";
import { physicalDamage } from "../module/rules/mech.mjs";
import {
  crashDamage, critMovementLoss, damageVehicleLocation, motiveDamage, resolveVehicleCrit, vehicleCritCandidates,
  vehicleHitLocation, vehicleMaxMovement
} from "../module/rules/vehicle.mjs";
import {
  damageFighter, fighterCritEffect, fighterEngineHeat, fighterHitLocation, fighterMaxMovement, resolveFighterCrit
} from "../module/rules/fighter.mjs";
import {
  accumulateSmallArms, hitTypeOptions, indirectMechDamage, indirectPersonalDamage, weaponDamageTypes
} from "../module/rules/mixed.mjs";

const loc = (armor, structure) => ({ armor, structure, armorDamage: 0, structureDamage: 0 });
const sequence = values => () => values.shift();

/** A medium tank. */
function vedette() {
  return { front: loc(13, 3), rightSide: loc(10, 3), leftSide: loc(10, 3), rear: loc(6, 3), turret: loc(9, 3), rotor: loc(0, 0) };
}

/* -------------------------------------------- */
/*  Combat vehicles                             */
/* -------------------------------------------- */

test("vehicle hit locations (p. 46)", () => {
  assert.deepEqual(vehicleHitLocation(2), { location: "front", critChance: true });
  assert.equal(vehicleHitLocation(3).location, "rear");
  assert.equal(vehicleHitLocation(4).location, "front");
  assert.equal(vehicleHitLocation(6).location, "rightSide");
  assert.equal(vehicleHitLocation(7).location, "front");
  assert.equal(vehicleHitLocation(9).location, "leftSide");
  assert.deepEqual(vehicleHitLocation(12), { location: "turret", critChance: true });
  assert.equal(vehicleHitLocation(10, { vtol: true }).location, "rotor");
  assert.deepEqual(vehicleHitLocation(12, { turret: false }), { location: "front", critChance: true });
});

test("vehicle damage stays in the location and destroys the vehicle", () => {
  const hit = damageVehicleLocation(vedette(), "rear", 7);
  assert.equal(hit.armor, 6);
  assert.equal(hit.structure, 1);
  assert.equal(hit.destroyed, false);
  const kill = damageVehicleLocation(hit.locations, "rear", 5);
  assert.equal(kill.structure, 2);
  assert.equal(kill.destroyed, true);
  assert.equal(kill.locations.front.armorDamage, 0, "no transfer to other locations");
});

test("motive damage on 8+ except VTOLs (p. 44)", () => {
  assert.equal(motiveDamage(7, false), 0);
  assert.equal(motiveDamage(8, false), 2);
  assert.equal(motiveDamage(12, true), 0);
  assert.equal(vehicleMaxMovement({ base: 3, lost: 2 }), 1);
  assert.equal(vehicleMaxMovement({ base: 3, lost: 4 }), 0);
});

test("vehicle critical hits (p. 45)", () => {
  assert.deepEqual(vehicleCritCandidates("front", 1), ["crew"]);
  assert.deepEqual(vehicleCritCandidates("turret", 2), ["stunned"]);
  assert.deepEqual(vehicleCritCandidates("front", 5), ["weapon"]);
  assert.deepEqual(vehicleCritCandidates("leftSide", 4), ["motive"]);
  assert.deepEqual(vehicleCritCandidates("rear", 2), ["ammo", "movement"]);
  assert.deepEqual(vehicleCritCandidates("rear", 3), ["movement"]);
  assert.deepEqual(vehicleCritCandidates("rotor", 3), []);

  // No front Weapon Group: a 4 is rerolled.
  const noWeapon = resolveVehicleCrit("front", sequence([4, 2]), { hasAmmo: () => true, hasWeapon: () => false });
  assert.deepEqual(noWeapon, { location: "front", effect: "stunned", rolls: [4, 2] });
  // Rear 1 without ammo: the second effect.
  const rear = resolveVehicleCrit("rear", sequence([1]), { hasAmmo: () => false, hasWeapon: () => false });
  assert.equal(rear.effect, "movement");
  assert.equal(resolveVehicleCrit("rotor", sequence([1]), { hasAmmo: () => true, hasWeapon: () => true }), null);
  assert.equal(critMovementLoss("motive"), 2);
  assert.equal(critMovementLoss("movement"), 1);
});

test("ram and crashes (p. 43, 49)", () => {
  assert.deepEqual(physicalDamage("ram", { tonnage: 50, targetTonnage: 55, movement: 3 }), { damage: 5, self: 2, selfTable: "kick" });
  assert.equal(crashDamage(0), 3);
  assert.equal(crashDamage(4), 12);
});

/* -------------------------------------------- */
/*  Aerospace fighters                          */
/* -------------------------------------------- */

test("fighter hit locations", () => {
  assert.deepEqual(fighterHitLocation(2), { location: "nose", critChance: true });
  assert.equal(fighterHitLocation(3).location, "aft");
  assert.equal(fighterHitLocation(5).location, "rightWing");
  assert.equal(fighterHitLocation(7).location, "nose");
  assert.equal(fighterHitLocation(10).location, "leftWing");
  assert.equal(fighterHitLocation(11).location, "aft");
  assert.equal(fighterHitLocation(12).location, "nose");
});

test("fighters share their Structure (p. 44)", () => {
  const fighter = {
    locations: { nose: { armor: 2, armorDamage: 0 }, rightWing: { armor: 2, armorDamage: 0 } },
    structure: { max: 3, damage: 0 }
  };
  const first = damageFighter(fighter, "nose", 3);
  assert.equal(first.armor, 2);
  assert.equal(first.structureHit, 1);
  const second = damageFighter({ locations: first.locations, structure: first.structure }, "nose", 1);
  assert.equal(second.structureHit, 1, "a stripped location goes straight to Structure");
  const third = damageFighter({ locations: second.locations, structure: second.structure }, "rightWing", 4);
  assert.equal(third.armor, 2);
  assert.equal(third.structureHit, 1);
  assert.equal(third.destroyed, true);
});

test("fighter critical hits (p. 45)", () => {
  assert.deepEqual(fighterCritEffect(2), { effect: "weapon", location: "nose" });
  assert.deepEqual(fighterCritEffect(6), { effect: "weapon", location: "rightWing" });
  assert.deepEqual(fighterCritEffect(9), { effect: "weapon", location: "leftWing" });
  assert.equal(fighterCritEffect(4).effect, "fuel");
  assert.equal(fighterCritEffect(12).effect, "cockpit");
  const unit = { hasWeapon: loc => loc === "nose", hasAmmo: () => false, hasBomb: () => false, avionicsHits: 1 };
  // Right wing (no weapon), ammo (none), avionics (already hit), then the nose weapon.
  assert.deepEqual(resolveFighterCrit(sequence([5, 10, 3, 2]), unit), { effect: "weapon", location: "nose", rolls: [5, 10, 3, 2] });
  assert.equal(resolveFighterCrit(sequence([7]), { ...unit, engineHits: 1 }).effect, "engine");
  assert.equal(resolveFighterCrit(sequence([7, 12]), { ...unit, engineHits: 2 }).effect, "cockpit");
});

test("fighter engine heat and movement", () => {
  assert.equal(fighterEngineHeat({ engineHits: 0, fresh: true }), 0);
  assert.equal(fighterEngineHeat({ engineHits: 1, fresh: true }), 2);
  assert.equal(fighterEngineHeat({ engineHits: 1 }), 1);
  assert.equal(fighterMaxMovement({ base: 5, engineHits: 1, heat: 1 }), 3);
});

/* -------------------------------------------- */
/*  Mixed scale                                 */
/* -------------------------------------------- */

test("indirect hits on people (p. 66)", () => {
  // Three medium lasers dealing 5: 5 ÷ 3 = 1 (the book's example).
  assert.equal(indirectMechDamage({ base: 5, count: 3 }), 1);
  assert.equal(indirectPersonalDamage({ base: 5, count: 3 }), 10);
  // Three weapons, 2+M: (2 + 1) ÷ 3 = 1.
  assert.equal(indirectMechDamage({ base: 2, missiles: 1, count: 3 }), 1);
  // A single SRM launcher counts as 1; a single PPC deals its damage.
  assert.equal(indirectMechDamage({ base: 2, missiles: 1, count: 1 }), 1);
  assert.equal(indirectMechDamage({ base: 4, count: 1 }), 4);
  assert.equal(indirectMechDamage({ base: 1, count: 4 }), 1);
  assert.deepEqual(weaponDamageTypes("E, M"), ["E", "M"]);
  assert.deepEqual(weaponDamageTypes("—"), []);
});

test("Plot Points against 'Mech-Scale hits (p. 65)", () => {
  assert.deepEqual(hitTypeOptions("direct", true), [{ key: "downgrade", cost: 1 }, { key: "avoid", cost: 2 }]);
  assert.deepEqual(hitTypeOptions("indirect", true), [{ key: "avoid", cost: 1 }]);
  assert.deepEqual(hitTypeOptions("direct", false), [{ key: "downgrade", cost: 1 }]);
  assert.deepEqual(hitTypeOptions("indirect", false), []);
});

test("people wear down 'Mech-Scale units 20 damage at a time (p. 66)", () => {
  assert.deepEqual(accumulateSmallArms(0, 12), { total: 12, mechDamage: 0 });
  assert.deepEqual(accumulateSmallArms(12, 10), { total: 2, mechDamage: 1 });
  assert.deepEqual(accumulateSmallArms(0, 45), { total: 25, mechDamage: 1 });
});
