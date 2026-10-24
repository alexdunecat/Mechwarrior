import { test } from "node:test";
import assert from "node:assert/strict";
import { personalMoveCost, resolvePersonalDamage } from "../module/rules/damage.mjs";
import { compareInitiative, narrativeInitiative } from "../module/rules/initiative.mjs";
import { buildTrack } from "../module/rules/condition.mjs";
import { resolveTest } from "../module/rules/tests.mjs";

const plate = { value: 10, reduceB: 1, reduceE: 0 };

test("armor type reduction, then armor pips, then the Condition Monitor (p. 36)", () => {
  assert.deepEqual(resolvePersonalDamage({ damage: 4, type: "B" }, plate), { armor: 3, physical: 0, fatigue: 0, reduced: 1 });
  assert.deepEqual(resolvePersonalDamage({ damage: 4, type: "E" }, plate), { armor: 4, physical: 0, fatigue: 0, reduced: 0 });
  assert.deepEqual(resolvePersonalDamage({ damage: 5, type: "B" }, { ...plate, value: 2 }), { armor: 2, physical: 2, fatigue: 0, reduced: 1 });
});

test("shredded armor no longer reduces damage", () => {
  assert.deepEqual(resolvePersonalDamage({ damage: 3, type: "B" }, { ...plate, value: 0 }), { armor: 0, physical: 3, fatigue: 0, reduced: 0 });
  assert.deepEqual(resolvePersonalDamage({ damage: 3 }, null), { armor: 0, physical: 3, fatigue: 0, reduced: 0 });
});

test("Fatigue weapons skip armor", () => {
  assert.deepEqual(resolvePersonalDamage({ damage: 3, fatigue: true }, plate), { armor: 0, physical: 0, fatigue: 3, reduced: 0 });
});

test("Toughness takes 1 off damage that reaches the Condition Monitor", () => {
  assert.equal(resolvePersonalDamage({ damage: 3 }, null, { toughness: 1 }).physical, 2);
  assert.equal(resolvePersonalDamage({ damage: 3, type: "B" }, plate, { toughness: 1 }).physical, 0);
  assert.equal(resolvePersonalDamage({ damage: 2, fatigue: true }, null, { toughness: 1 }).fatigue, 1);
});

test("moving between range brackets (p. 35)", () => {
  assert.equal(personalMoveCost("close", "near"), 1);
  assert.equal(personalMoveCost("near", "far"), 3);
  assert.equal(personalMoveCost("far", "close"), 4);
});

test("Pain Resistance ignores only the first row's –1", () => {
  assert.equal(buildTrack({ rating: 5, damage: 3, ignoreFirst: true }).modifier, 0);
  assert.equal(buildTrack({ rating: 5, damage: 6, ignoreFirst: true }).modifier, -2);
});

test("CON Check: raw 2D6 against a fixed number, meeting it is enough (p. 47)", () => {
  const check = dice => resolveTest({ dice, bonus: 0, opposingDice: [], opposingBonus: 7 });
  assert.equal(check([3, 4]).success, true);
  assert.equal(check([3, 3]).success, false);
  assert.equal(check([3, 3]).opposingTotal, 7);
});

test("narrative turn order: GM's side first, then players by seat (p. 30)", () => {
  const gm = narrativeInitiative({ isPlayer: false });
  const first = narrativeInitiative({ isPlayer: true, seat: 0 });
  const second = narrativeInitiative({ isPlayer: true, seat: 1 });
  assert.ok(gm > first && first > second);
});

test("rolled Initiative ties go to EDG, then RFL, then seat (p. 55)", () => {
  const order = list => list.sort(compareInitiative).map(c => c.name);
  assert.deepEqual(order([
    { name: "a", initiative: 8, edg: 2, rfl: 5, seat: 0 },
    { name: "b", initiative: 8, edg: 3, rfl: 1, seat: 1 },
    { name: "c", initiative: 10, edg: 1, rfl: 1, seat: 2 },
    { name: "d", initiative: 8, edg: 2, rfl: 5, seat: Infinity },
    { name: "e", initiative: null }
  ]), ["c", "b", "a", "d", "e"]);
});
