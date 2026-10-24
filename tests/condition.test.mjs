import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedPipsForRating, buildTrack, kiaDice, toggleDamagePip, woundModifier } from "../module/rules/condition.mjs";

test("low STR/WIL crosses off pips on the first two rows (p. 70)", () => {
  assert.deepEqual(blockedPipsForRating(1), [2, 2]);
  assert.deepEqual(blockedPipsForRating(2), [2, 1]);
  assert.deepEqual(blockedPipsForRating(3), [1, 1]);
  assert.deepEqual(blockedPipsForRating(4), [1, 0]);
  assert.deepEqual(blockedPipsForRating(5), [0, 0]);
  assert.deepEqual(blockedPipsForRating(6), [0, 0]);
});

test("capacity counts the unblocked pips plus Staggered", () => {
  assert.equal(buildTrack({ rating: 5 }).capacity, 13);
  assert.equal(buildTrack({ rating: 4 }).capacity, 12);
  assert.equal(buildTrack({ rating: 2 }).capacity, 10);
  assert.equal(buildTrack({ rating: 1 }).capacity, 9);
});

test("no damage, no modifier", () => {
  const t = buildTrack({ rating: 3, damage: 0 });
  assert.equal(t.modifier, 0);
  assert.equal(t.staggered, false);
  assert.equal(t.conCheck, null);
});

test("filling a row applies its modifier, rows replace each other (p. 36)", () => {
  // STR 2: row 1 has 1 open pip, row 2 has 2 open pips.
  assert.equal(buildTrack({ rating: 2, damage: 1 }).modifier, -1);
  assert.equal(buildTrack({ rating: 2, damage: 2 }).modifier, -1);
  assert.equal(buildTrack({ rating: 2, damage: 3 }).modifier, -2);
  // STR 5: 3 pips per row.
  assert.equal(buildTrack({ rating: 5, damage: 2 }).modifier, 0);
  assert.equal(buildTrack({ rating: 5, damage: 3 }).modifier, -1);
  assert.equal(buildTrack({ rating: 5, damage: 12 }).modifier, -4);
  assert.equal(buildTrack({ rating: 5, damage: 12 }).conCheck, 10);
});

test("Staggered after every row and the Staggered pip; damage beyond flags KIA/KO", () => {
  const t = buildTrack({ rating: 5, damage: 13 });
  assert.equal(t.staggered, true);
  assert.equal(t.beyond, false);
  assert.equal(t.conCheck, 11);
  const over = buildTrack({ rating: 5, damage: 15 });
  assert.equal(over.beyond, true);
  assert.equal(over.overflow, 2);
  assert.equal(over.damage, 13);
});

test("lost pips (I'll never be the same) shrink the track", () => {
  const t = buildTrack({ rating: 5, lost: 1 });
  assert.equal(t.capacity, 12);
  assert.equal(buildTrack({ rating: 5, lost: 1, damage: 2 }).modifier, -1);
});

test("damage indices skip blocked pips", () => {
  const t = buildTrack({ rating: 1, damage: 0 });
  assert.deepEqual(t.rows[0].pips.map(p => p.index), [null, null, 0]);
  assert.deepEqual(t.rows[1].pips.map(p => p.index), [null, null, 1]);
  assert.deepEqual(t.rows[2].pips.map(p => p.index), [2, 3, 4]);
  assert.equal(t.staggeredPip.index, 8);
});

test("wound modifiers add across tracks (p. 37)", () => {
  assert.equal(woundModifier({ modifier: -2 }, { modifier: -1 }), -3);
  assert.equal(woundModifier({ modifier: 0 }, { modifier: 0 }), 0);
});

test("clicking pips fills up to the pip, clicking the last filled one clears it", () => {
  assert.equal(toggleDamagePip(0, 0), 1);
  assert.equal(toggleDamagePip(1, 0), 0);
  assert.equal(toggleDamagePip(2, 5), 6);
  assert.equal(toggleDamagePip(6, 2), 3);
});

test("KIA Test starts Easy and gets harder", () => {
  assert.equal(kiaDice(0), 2);
  assert.equal(kiaDice(1), 3);
  assert.equal(kiaDice(2), 4);
});
