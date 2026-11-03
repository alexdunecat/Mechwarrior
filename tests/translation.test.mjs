import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./helpers/foundry-mock.mjs";

/*
 * The compendium content is translated through lang/content/<lang>.json. These tests check the
 * translation functions and that every piece of book text in the packs has a Russian entry.
 */

const { buildPacks } = await import("../tools/pack-builder.mjs");
const { translateHtml, translateLines, translateList, translateText, translatedFields } = await import("../module/i18n/content.mjs");

const ru = JSON.parse(readFileSync(new URL("../lang/content/ru.json", import.meta.url)));
const packs = buildPacks();

test("translateText looks up the trimmed string and keeps unknown text", () => {
  const dict = { Scout: "Разведчик" };
  assert.equal(translateText(dict, " Scout "), "Разведчик");
  assert.equal(translateText(dict, "Atlas"), "Atlas");
  assert.equal(translateText(null, "Scout"), "Scout");
});

test("translateHtml translates paragraph by paragraph", () => {
  const dict = { One: "Один", Two: "Два" };
  assert.equal(translateHtml(dict, "<p>One</p><p>Three</p><p>Two</p>"), "<p>Один</p><p>Three</p><p>Два</p>");
  assert.equal(translateHtml(dict, "One"), "Один");
});

test("translateLines and translateList split Cues and Tags", () => {
  const dict = { "Hi.": "Привет.", Scout: "Разведчик", Quick: "Быстрый" };
  assert.equal(translateLines(dict, "Hi.\nBye."), "Привет.\nBye.");
  assert.equal(translateList(dict, "Scout, Quick; Odd"), "Разведчик, Быстрый, Odd");
});

test("translatedFields returns only what changed", () => {
  const dict = { Knife: "Нож", "A blade.": "Клинок." };
  const changes = translatedFields(dict, { name: "Knife", system: { description: "<p>A blade.</p>", appliesTo: "" } }, "Item");
  assert.deepEqual(changes, { name: "Нож", "system.description": "<p>Клинок.</p>" });
  assert.deepEqual(translatedFields(dict, { name: "Atlas", system: {} }, "Actor"), {});
});

/** Every translatable string in the packs, as the content translation splits it. */
function bookStrings() {
  const out = new Set();
  const add = s => { if ( s && /[A-Za-z]/.test(s) ) out.add(s.trim()); };
  const paras = html => (html ?? "").split(/<\/?p>/).map(s => s.trim()).filter(Boolean);
  const lines = s => (s ?? "").split("\n").map(x => x.trim()).filter(Boolean);
  const tags = s => (s ?? "").split(/\s*[,;]\s*/).map(x => x.trim()).filter(Boolean);
  const translatedItems = ["weapon", "gear", "trait", "armor", "mechEquipment"];
  for ( const docs of Object.values(packs) ) {
    for ( const doc of docs ) {
      const sys = doc.system;
      if ( !sys ) { add(doc.name); continue; }
      if ( translatedItems.includes(doc.type) && !doc.flags?.["mechwarrior-destiny"]?.bookName ) add(doc.name);
      paras(sys.description).forEach(add);
      paras(sys.notes).forEach(add);
      tags(sys.tags ?? sys.details?.tags).forEach(add);
      if ( sys.biography ) {
        paras(sys.biography.history).forEach(add);
        paras(sys.biography.personality).forEach(add);
        lines(sys.biography.disposition).forEach(add);
      }
      lines(sys.cues).forEach(add);
      if ( sys.details?.rank ) add(sys.details.rank);
      if ( (doc.type === "character") && sys.details?.faction ) add(sys.details.faction);
      for ( const value of Object.values(sys.lifeModules ?? {}) ) add(value);
      for ( const item of doc.items ?? [] ) {
        if ( translatedItems.includes(item.type) && !item.flags?.["mechwarrior-destiny"]?.bookName ) add(item.name);
        paras(item.system?.description).forEach(add);
        add(item.system?.appliesTo);
        const subject = item.flags?.["mechwarrior-destiny"]?.bookName?.skill?.subject;
        if ( subject ) add(subject);
      }
    }
  }
  return out;
}

test("every piece of book text in the compendiums has a Russian translation", () => {
  const missing = [...bookStrings()].filter(s => !(s in ru));
  assert.deepEqual(missing, []);
});

test("the Russian content dictionary has no empty entries", () => {
  for ( const [key, value] of Object.entries(ru) ) assert.ok(value.trim(), key);
});

test("the packs carry no stray glyphs from the PDF", () => {
  assert.ok(!JSON.stringify(packs).includes(""));
});
