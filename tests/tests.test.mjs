import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canSpendEdge, edgeRerollIndices, meleeStrBonus, opposingDice, rangeModifier, replaceDice, resolveTest
} from "../module/rules/tests.mjs";

test("difficulty sets the opposing dice (p. 32)", () => {
  assert.equal(opposingDice("easy"), 2);
  assert.equal(opposingDice("average"), 3);
  assert.equal(opposingDice("hard"), 4);
  assert.equal(opposingDice(5), 5);
  assert.equal(opposingDice("unknown"), 3);
});

test("ties go to the actor", () => {
  const r = resolveTest({ dice: [3, 4], bonus: 5, opposingDice: [4, 4, 4] });
  assert.equal(r.total, 12);
  assert.equal(r.opposingTotal, 12);
  assert.equal(r.success, true);
});

test("lower total fails", () => {
  const r = resolveTest({ dice: [3, 4], bonus: 4, opposingDice: [4, 4, 4] });
  assert.equal(r.success, false);
  assert.equal(r.margin, -1);
});

test("natural 2 always fails", () => {
  const r = resolveTest({ dice: [1, 1], bonus: 20, opposingDice: [1, 1] });
  assert.equal(r.success, false);
  assert.equal(r.autoFail, "natural2");
});

test("untrained Hard Test automatically fails (p. 33)", () => {
  const r = resolveTest({ dice: [6, 6], bonus: 4, opposingDice: [1, 1, 1, 1], untrained: true, difficulty: "hard" });
  assert.equal(r.success, false);
  assert.equal(r.autoFail, "untrainedHard");
  const ok = resolveTest({ dice: [6, 6], bonus: 4, opposingDice: [1, 1, 1], untrained: true, difficulty: "average" });
  assert.equal(ok.success, true);
});

test("opposed rolls add the defender's bonus (p. 34 example)", () => {
  // Myoko: 2D6 (2+4) + 5 = 11 vs guard 9 + 3 = 12 -> miss; Edge reroll of the 2 into a 3 -> 12 vs 12 hits.
  const miss = resolveTest({ dice: [2, 4], bonus: 5, opposingDice: [4, 5], opposingBonus: 3 });
  assert.equal(miss.success, false);
  const dice = replaceDice([2, 4], edgeRerollIndices([2, 4], "first"), [3]);
  const hit = resolveTest({ dice, bonus: 5, opposingDice: [4, 5], opposingBonus: 3 });
  assert.equal(hit.success, true);
});

test("Edge reroll selections", () => {
  assert.deepEqual(edgeRerollIndices([2, 5], "first"), [0]);
  assert.deepEqual(edgeRerollIndices([2, 5], "second"), [1]);
  assert.deepEqual(edgeRerollIndices([2, 5], "both"), [0, 1]);
  assert.deepEqual(edgeRerollIndices([2, 6, 4], "highest"), [1]);
  assert.deepEqual(edgeRerollIndices([2, 6, 4], "all"), [0, 1, 2]);
});

test("Edge: once per roll, at most EDG per session", () => {
  assert.equal(canSpendEdge({ edg: 2, spent: 1, usedOnRoll: false }), true);
  assert.equal(canSpendEdge({ edg: 2, spent: 2, usedOnRoll: false }), false);
  assert.equal(canSpendEdge({ edg: 2, spent: 0, usedOnRoll: true }), false);
});

test("melee STR bonus (p. 35)", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(meleeStrBonus), [0, 0, 1, 1, 2, 2]);
});

test("range codes", () => {
  assert.equal(rangeModifier("0"), 0);
  assert.equal(rangeModifier("-2"), -2);
  assert.equal(rangeModifier("x"), null);
});
