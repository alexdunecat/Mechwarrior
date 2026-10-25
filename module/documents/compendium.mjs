import { SYSTEM_ID } from "../config.mjs";
import { skillName } from "./item-data.mjs";

/**
 * The system's compendiums hold the book's data in English. Names of things the rules define
 * (Skills, Traits, armor, free melee options) are translated when they are created in a world, and
 * a sample character brings their Hardware along.
 */

const t = key => game.i18n.localize(key);

/**
 * Translated name for an item the book defines, or null for anything else.
 * @param {object} data  Item source data.
 * @returns {string|null}
 */
export function bookItemName(data) {
  const flags = data.flags?.[SYSTEM_ID] ?? {};
  const book = flags.bookName;
  if ( book?.skill ) return skillName(book.skill);
  if ( book?.trait ) return t(`MWD.BookTrait.${book.trait}.name`);
  if ( book?.armor ) return t(`MWD.Armor.Type.${book.armor}`);
  if ( flags.freeWeapon ) return t(`MWD.Weapon.Free.${flags.freeWeapon}`);
  return null;
}

/** Translate book item names on an actor about to be created. */
function onPreCreateActor(actor, data) {
  if ( !data.items?.length ) return;
  let changed = false;
  const items = data.items.map(item => {
    const name = bookItemName(item);
    if ( !name || (name === item.name) ) return item;
    changed = true;
    return { ...item, name };
  });
  if ( changed ) actor.updateSource({ items });
}

/** Translate a book item's name when it is created on its own or dropped on an actor. */
function onPreCreateItem(item, data) {
  const name = bookItemName(data);
  if ( name && (name !== data.name) ) item.updateSource({ name });
}

/**
 * A sample character imported from the compendium brings their 'Mech, vehicle or fighter: the
 * unit is imported next to them and they take its controls.
 */
async function onCreateActor(actor, _options, userId) {
  if ( (userId !== game.user.id) || (actor.type !== "character") ) return;
  const uuid = actor.getFlag(SYSTEM_ID, "sampleHardware");
  if ( !uuid ) return;
  await actor.unsetFlag(SYSTEM_ID, "sampleHardware");
  if ( actor.system.hardware.length || !Actor.canUserCreate?.(game.user) ) return;
  const source = await fromUuid(uuid);
  if ( !source ) return;
  const unit = await Actor.implementation.create({
    ...game.actors.fromCompendium(source),
    folder: actor.folder?.id ?? null,
    ownership: actor.toObject().ownership
  });
  if ( unit ) await actor.boardHardware(unit);
}

/** The system's own packs. */
const systemPacks = () => game.packs.filter(pack => pack.metadata.packageName === SYSTEM_ID);

/**
 * Show book items under their translated names in a pack's index, which is what the compendium
 * window lists and searches. 'Mechs, vehicles and other proper names keep their book names.
 * @param {CompendiumCollection} pack
 */
export function translateIndex(pack) {
  for ( const entry of pack.index ) {
    const name = bookItemName(entry);
    if ( name ) entry.name = name;
  }
}

/** Pack labels in system.json are English; show them and book item names in the world's language. */
function localizePacks() {
  for ( const pack of systemPacks() ) {
    const key = `MWD.Pack.${pack.metadata.name}`;
    try {
      if ( game.i18n.has(key) ) pack.metadata.label = t(key);
    } catch(err) {
      console.warn(`${SYSTEM_ID} | Could not translate the label of ${pack.collection}`, err);
    }
    if ( pack.documentName !== "Item" ) continue;
    // The index is loaded again whenever it needs more fields, so translate every load.
    const getIndex = pack.getIndex.bind(pack);
    pack.getIndex = async (...args) => {
      const index = await getIndex(...args);
      translateIndex(pack);
      return index;
    };
    translateIndex(pack);
  }
}

export function registerCompendiumHooks() {
  Hooks.once("init", () => {
    // Index entries need the flags that name book items.
    CONFIG.Item.compendiumIndexFields = [...new Set([...CONFIG.Item.compendiumIndexFields, `flags.${SYSTEM_ID}`])];
  });
  Hooks.once("ready", () => systemPacks().filter(p => p.documentName === "Item").forEach(translateIndex));
  Hooks.on("preCreateActor", onPreCreateActor);
  Hooks.on("preCreateItem", onPreCreateItem);
  Hooks.on("createActor", onCreateActor);
  Hooks.once("setup", localizePacks);
}
