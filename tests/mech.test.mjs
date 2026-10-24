import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clusters, coolDown, critCandidates, damageLocation, heatEffects, hitLocation, maxMovement,
  missileDamage, physicalDamage, resolveCrit, restartCheck, speedModifier
} from "../module/rules/mech.mjs";
import { resolveTest } from "../module/rules/tests.mjs";

/** WSP-1A Wasp (p. 160). */
function wasp() {
  const loc = (armor, structure) => ({ armor, structure, armorDamage: 0, structureDamage: 0 });
  return {
    head: loc(1, 1), torso: loc(2, 2), rightArm: loc(1, 1), leftArm: loc(1, 1), rightLeg: loc(2, 1), leftLeg: loc(2, 1)
  };
}

test("hit locations (p. 45)", () => {
  assert.deepEqual(hitLocation(2), { location: "torso", critChance: true, headHit: false });
  assert.equal(hitLocation(4).location, "rightArm");
  assert.equal(hitLocation(5).location, "rightLeg");
  assert.equal(hitLocation(9).location, "leftLeg");
  assert.equal(hitLocation(11).location, "leftArm");
  assert.deepEqual(hitLocation(12), { location: "head", critChance: false, headHit: true });
});

test("punches turn leg hits into arm hits, kicks roll 1D6 for a leg (p. 43)", () => {
  assert.equal(hitLocation(5, "punch").location, "rightArm");
  assert.equal(hitLocation(9, "punch").location, "leftArm");
  assert.equal(hitLocation(3, "kick").location, "rightLeg");
  assert.equal(hitLocation(4, "kick").location, "leftLeg");
});

test("missile dice: 1–3 score, 4–6 miss, capped at Max Damage (p. 43–44)", () => {
  // Archer, 2 LRM 20: 8+MM (Max 14), dice 1 and 3.
  assert.deepEqual(missileDamage({ base: 8, max: 14 }, [1, 3]), [1, 3]);
  // Thunderbolt, 6+M (Max 7), die 3 is cut to 1.
  assert.deepEqual(missileDamage({ base: 6, max: 7 }, [3]), [1]);
  assert.deepEqual(missileDamage({ base: 1, max: 3 }, [4]), []);
});

test("damage clusters", () => {
  assert.deepEqual(clusters(5), [2, 2, 1]);
  assert.deepEqual(clusters(4), [2, 2]);
  assert.deepEqual(clusters(0), []);
});

test("armor, then structure, then the torso (Griffin vs Wasp, p. 47)", () => {
  // LRM: 1 point to the right arm strips its armor.
  let hit = damageLocation(wasp(), "rightArm", 1);
  assert.deepEqual(hit.steps, [{ location: "rightArm", armor: 1, structure: 0, destroyed: false }]);
  // PPC: 4 more points to the right arm.
  hit = damageLocation(hit.locations, "rightArm", 4);
  assert.deepEqual(hit.steps, [
    { location: "rightArm", armor: 0, structure: 1, destroyed: true },
    { location: "torso", armor: 2, structure: 1, destroyed: false }
  ]);
  assert.deepEqual(hit.structureHit, ["rightArm", "torso"]);
  assert.deepEqual(hit.destroyed, ["rightArm"]);
  assert.equal(hit.mechDestroyed, false);
});

test("damage to a destroyed arm goes to the torso; a destroyed torso ends the 'Mech", () => {
  let hit = damageLocation(wasp(), "rightArm", 2);
  hit = damageLocation(hit.locations, "rightArm", 10);
  assert.equal(hit.steps[0].location, "torso");
  assert.equal(hit.mechDestroyed, true);
  assert.deepEqual(hit.destroyed, ["torso"]);
});

test("the original data is not changed", () => {
  const locs = wasp();
  damageLocation(locs, "head", 2);
  assert.equal(locs.head.armorDamage, 0);
});

test("critical hit tables (p. 45)", () => {
  assert.deepEqual(critCandidates("torso", 1), ["ammo", "weapon"]);
  assert.deepEqual(critCandidates("torso", 4), ["gyro"]);
  assert.deepEqual(critCandidates("torso", 6), ["engine"]);
  assert.deepEqual(critCandidates("leftArm", 3), ["weapon"]);
  assert.deepEqual(critCandidates("rightLeg", 5), ["movement"]);
  assert.deepEqual(critCandidates("head", 3), []);
});

test("an ammo explosion needs ammo in the location (Wasp, p. 47)", () => {
  const rolls = [1];
  const crit = resolveCrit("torso", () => rolls.shift(), {
    hasAmmo: loc => loc === "torso", hasWeapon: () => false
  });
  assert.deepEqual(crit, { location: "torso", effect: "ammo", rolls: [1] });
});

test("criticals that cannot apply reroll, and limb criticals move to the torso", () => {
  // Torso without weapons rolls 2 (weapon): reroll, 5 is the engine.
  let rolls = [2, 5];
  let crit = resolveCrit("torso", () => rolls.shift(), { hasAmmo: () => false, hasWeapon: () => false });
  assert.deepEqual(crit, { location: "torso", effect: "engine", rolls: [2, 5] });
  // Arm without weapons: moves to the torso, which rolls 3 (gyro).
  rolls = [4, 3];
  crit = resolveCrit("leftArm", () => rolls.shift(), { hasAmmo: () => false, hasWeapon: () => false });
  assert.deepEqual(crit, { location: "torso", effect: "gyro", rolls: [4, 3] });
  // No crits to the head.
  assert.equal(resolveCrit("head", () => 1, { hasAmmo: () => true, hasWeapon: () => true }), null);
});

test("Heat Effects are cumulative (p. 48)", () => {
  assert.deepEqual(heatEffects(0), { level: "blue", movement: 0, ranged: 0, shutdownRoll: false, ammoRoll: false, autoShutdown: false });
  assert.equal(heatEffects(2).ranged, -1);
  assert.equal(heatEffects(2).movement, -1);
  assert.equal(heatEffects(3).shutdownRoll, true);
  assert.equal(heatEffects(4).ammoRoll, true);
  assert.equal(heatEffects(4).shutdownRoll, true);
  assert.equal(heatEffects(6).autoShutdown, true);
  assert.equal(heatEffects(6).level, "critical");
});

test("cooling down and restarting (p. 47–48)", () => {
  assert.equal(coolDown({ heat: 4, dissipation: 2 }), 2);
  assert.equal(coolDown({ heat: 1, dissipation: 3 }), 0);
  assert.equal(coolDown({ heat: 2, dissipation: 2, engineHits: 1 }), 1);
  assert.equal(restartCheck(2), "auto");
  assert.equal(restartCheck(3), "roll");
  assert.equal(restartCheck(4), "none");
});

test("Maximum Movement", () => {
  assert.equal(maxMovement({ base: 3 }), 3);
  assert.equal(maxMovement({ base: 3, heat: 1 }), 2);
  assert.equal(maxMovement({ base: 3, legHits: 1, heat: 2 }), 1);
  assert.equal(maxMovement({ base: 4, legDestroyed: true }), 1);
  assert.equal(maxMovement({ base: 4, gyroHits: 2 }), 0);
  assert.equal(maxMovement({ base: 4, shutdown: true }), 0);
});

test("speed modifier (Griffin 3 vs Wasp 4 is –1, p. 41)", () => {
  assert.equal(speedModifier(3, 4), -1);
});

test("physical attack damage, rounded up (p. 43)", () => {
  assert.equal(physicalDamage("punch", { tonnage: 55 }).damage, 2);
  assert.equal(physicalDamage("kick", { tonnage: 65 }).damage, 5);
  assert.deepEqual(physicalDamage("charge", { tonnage: 55, targetTonnage: 20, movement: 3 }),
    { damage: 6, self: 1, selfTable: "standard" });
  assert.deepEqual(physicalDamage("dfa", { tonnage: 55, movement: 2 }), { damage: 4, self: 2, selfTable: "kick" });
  assert.equal(physicalDamage("push", { tonnage: 55 }).damage, 0);
});

test("a Disengaged target is only hit on a natural 11+ (p. 41)", () => {
  const roll = dice => resolveTest({ dice, bonus: 6, opposingDice: [1, 1], minNatural: 11 });
  assert.equal(roll([5, 5]).autoFail, "disengaged");
  assert.equal(roll([5, 6]).success, true);
});
