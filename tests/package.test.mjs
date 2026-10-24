import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { SKILLS } from "../module/config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, ext) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if ( statSync(path).isDirectory() ) return walk(path, ext);
    return path.endsWith(ext) ? [path] : [];
  });
}

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return (v && (typeof v === "object")) ? flatten(v, key) : [key];
  });
}

const manifest = JSON.parse(readFileSync(join(ROOT, "system.json"), "utf8"));
const lang = Object.fromEntries(manifest.languages.map(l => [l.lang,
  JSON.parse(readFileSync(join(ROOT, l.path), "utf8"))]));

test("manifest points at files that exist", () => {
  for ( const path of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)] ) {
    assert.ok(existsSync(join(ROOT, path)), `${path} is missing`);
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.equal(manifest.version, pkg.version, "system.json and package.json versions differ");
});

test("every module parses", () => {
  for ( const file of walk(join(ROOT, "module"), ".mjs") ) {
    execFileSync(process.execPath, ["--check", file]);
  }
});

test("every template compiles", () => {
  for ( const file of walk(join(ROOT, "templates"), ".hbs") ) {
    assert.doesNotThrow(() => Handlebars.precompile(readFileSync(file, "utf8")), relative(ROOT, file));
  }
});

test("partials referenced by templates exist", () => {
  for ( const file of walk(join(ROOT, "templates"), ".hbs") ) {
    for ( const [, path] of readFileSync(file, "utf8").matchAll(/\{\{>\s*"systems\/mechwarrior-destiny\/([^"]+)"/g) ) {
      assert.ok(existsSync(join(ROOT, path)), `${relative(ROOT, file)} -> ${path}`);
    }
  }
});

test("languages have the same keys", () => {
  const [first, ...rest] = Object.values(lang).map(l => new Set(flatten(l)));
  for ( const other of rest ) {
    assert.deepEqual([...first].filter(k => !other.has(k)), []);
    assert.deepEqual([...other].filter(k => !first.has(k)), []);
  }
});

test("localization keys used in code and templates exist", () => {
  const keys = new Set(flatten(lang.en));
  const dynamic = [
    ...Object.keys(SKILLS).map(k => `MWD.Skill.${k}`),
    ...["natural2", "untrainedHard"].map(k => `MWD.Chat.AutoFail.${k}`),
    ...["first", "second", "both", "highest", "all"].map(k => `MWD.Edge.Used.${k}`),
    ...["physical", "fatigue"].map(k => `MWD.Condition.${k}`),
    ...["faction", "childhood", "education", "realLife"].map(k => `MWD.LifeModule.${k}`),
    ...["main", "story", "bio"].map(k => `MWD.Tab.${k}`),
    ...Object.keys(manifest.documentTypes.Actor).map(k => `TYPES.Actor.${k}`),
    ...Object.keys(manifest.documentTypes.Item).map(k => `TYPES.Item.${k}`)
  ];
  for ( const key of dynamic ) assert.ok(keys.has(key), `missing ${key}`);
  const files = [...walk(join(ROOT, "module"), ".mjs"), ...walk(join(ROOT, "templates"), ".hbs")];
  for ( const file of files ) {
    for ( const [key] of readFileSync(file, "utf8").matchAll(/MWD\.[A-Za-z0-9_.]*[A-Za-z0-9_]/g) ) {
      // Prefixes completed at runtime (template literals, labelPrefix) must still lead somewhere.
      const prefix = [...keys].some(k => k.startsWith(`${key}.`));
      assert.ok(keys.has(key) || prefix, `${relative(ROOT, file)} uses missing key ${key}`);
    }
  }
});
