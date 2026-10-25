/**
 * Builds the compendium packs (LevelDB) from packs-src/: `npm run build:packs`.
 * The packs/ folder is build output; release workflows run this before zipping the system.
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPacks } from "./pack-builder.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "mwd-packs-"));

try {
  for ( const [name, docs] of Object.entries(buildPacks()) ) {
    const src = join(work, name);
    mkdirSync(src);
    for ( const doc of docs ) writeFileSync(join(src, `${doc._id}.json`), JSON.stringify(doc));
    const dest = join(ROOT, "packs", name);
    rmSync(dest, { recursive: true, force: true });
    await compilePack(src, dest);
    console.log(`packs/${name}: ${docs.length} entries`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
