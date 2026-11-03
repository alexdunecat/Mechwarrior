import { SYSTEM_ID } from "../config.mjs";
import { skillName } from "./item-data.mjs";
import { translateText, translatedFields } from "../i18n/content.mjs";

/**
 * The system's compendiums hold the book's data in English. In another language the content is
 * shown translated: names of things the rules define (Skills, Traits, armor, free melee options)
 * come from the language file, everything else (weapons, Inventory, descriptions, biographies,
 * Cues, Tags, folders) from the content dictionary in lang/content/<lang>.json. Documents are
 * translated when they are created in a world, and shown translated inside the compendiums.
 * A sample character brings their Hardware along.
 */

const t = key => game.i18n.localize(key);

/* -------------------------------------------- */
/*  Dictionary                                  */
/* -------------------------------------------- */

/** @type {Record<string, string>|null} */
let dictionary = null;
/** @type {Promise<void>|null} */
let loading = null;

/**
 * Load the content dictionary for the client's language. English is the source and needs none.
 * @param {string} lang
 * @returns {Promise<void>}
 */
function loadDictionary(lang) {
  if ( !lang || (lang === "en") ) return Promise.resolve();
  loading ??= fetch(`systems/${SYSTEM_ID}/lang/content/${lang}.json`)
    .then(response => (response.ok ? response.json() : null))
    .then(json => { dictionary = json; })
    .catch(err => console.warn(`${SYSTEM_ID} | No content translation for "${lang}"`, err));
  return loading;
}

/**
 * The loaded dictionary, for tests and macros.
 * @returns {Record<string, string>|null}
 */
export function contentDictionary() {
  return dictionary;
}

/* -------------------------------------------- */
/*  Names                                       */
/* -------------------------------------------- */

/**
 * Translated name for an item the book defines, or null for anything else.
 * @param {object} data  Item source data.
 * @returns {string|null}
 */
export function bookItemName(data) {
  const flags = data.flags?.[SYSTEM_ID] ?? {};
  const book = flags.bookName;
  if ( book?.skill ) return skillName({ ...book.skill, subject: translateText(dictionary, book.skill.subject ?? "") });
  if ( book?.trait ) return t(`MWD.BookTrait.${book.trait}.name`);
  if ( book?.armor ) return t(`MWD.Armor.Type.${book.armor}`);
  if ( flags.freeWeapon ) return t(`MWD.Weapon.Free.${flags.freeWeapon}`);
  return null;
}

/**
 * Translated values of a document's fields, as {path: value}.
 * @param {object} data  Source data or a prepared document.
 * @param {"Actor"|"Item"} documentName
 * @returns {Record<string, string>}
 */
export function translationOf(data, documentName) {
  const name = (documentName === "Item") ? bookItemName(data) : null;
  if ( !dictionary ) return name && (name !== data.name) ? { name } : {};
  return translatedFields(dictionary, data, documentName, name);
}

/**
 * Item creation data in the world's language. 'Mech weapons and ammo remember their book name,
 * which is how ammo finds the weapons it feeds.
 * @param {object} item
 * @returns {object}  The same object when nothing changes.
 */
function translatedItemData(item) {
  const changes = translationOf(item, "Item");
  if ( foundry.utils.isEmpty(changes) ) return item;
  const out = foundry.utils.mergeObject(foundry.utils.deepClone(item), changes, { performDeletions: false });
  if ( changes.name && ["mechWeapon", "mechEquipment"].includes(item.type) ) {
    foundry.utils.setProperty(out, `flags.${SYSTEM_ID}.sourceName`, item.flags?.[SYSTEM_ID]?.sourceName ?? item.name);
  }
  return out;
}

/** Translate an actor about to be created, with its items. */
function onPreCreateActor(actor, data) {
  const changes = translationOf(data, "Actor");
  if ( changes.name && (data.prototypeToken?.name === data.name) ) changes["prototypeToken.name"] = changes.name;
  if ( data.items?.length ) {
    const items = data.items.map(translatedItemData);
    if ( items.some((item, i) => item !== data.items[i]) ) changes.items = items;
  }
  if ( !foundry.utils.isEmpty(changes) ) actor.updateSource(changes);
}

/** Translate an item when it is created on its own or dropped on an actor. */
function onPreCreateItem(item, data) {
  const translated = translatedItemData(data);
  if ( translated === data ) return;
  const changes = translationOf(data, "Item");
  const sourceName = foundry.utils.getProperty(translated, `flags.${SYSTEM_ID}.sourceName`);
  if ( sourceName ) changes[`flags.${SYSTEM_ID}.sourceName`] = sourceName;
  item.updateSource(changes);
}

/**
 * Show a document from one of the system's packs in the client's language, without changing its
 * source data (importing it translates the copy). Called while the document prepares its data.
 * @param {Document} doc  An Actor or Item.
 */
export function translateCompendiumDocument(doc) {
  if ( !dictionary && (doc.documentName !== "Item") ) return;
  const pack = doc.pack ?? doc.parent?.pack;
  if ( !pack || !pack.startsWith(`${SYSTEM_ID}.`) ) return;
  const changes = translationOf(doc, doc.documentName);
  for ( const [path, value] of Object.entries(changes) ) {
    try {
      foundry.utils.setProperty(doc, path, value);
    } catch { /* A read-only field: leave it as it is. */ }
  }
}

/* -------------------------------------------- */
/*  Sample characters                           */
/* -------------------------------------------- */

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

/* -------------------------------------------- */
/*  Compendium window                           */
/* -------------------------------------------- */

/** The system's own packs. */
const systemPacks = () => game.packs.filter(pack => pack.metadata.packageName === SYSTEM_ID);

/**
 * Show entries under their translated names in a pack's index, which is what the compendium
 * window lists and searches. 'Mechs, vehicles and people keep their book names.
 * @param {CompendiumCollection} pack
 */
export function translateIndex(pack) {
  for ( const entry of pack.index ) {
    const translated = bookItemName(entry) ?? translateText(dictionary, entry.name);
    if ( translated ) entry.name = translated;
  }
}

/** Folder names inside a pack. */
function translateFolders(pack) {
  if ( !dictionary ) return;
  for ( const folder of pack.folders ?? [] ) {
    const name = translateText(dictionary, folder._source?.name ?? folder.name);
    if ( name !== folder.name ) {
      try {
        folder.name = name;
      } catch { /* Leave the English name. */ }
    }
  }
}

/** Pack labels in system.json are English; show them and the content in the world's language. */
function localizePacks() {
  for ( const pack of systemPacks() ) {
    const key = `MWD.Pack.${pack.metadata.name}`;
    try {
      if ( game.i18n.has(key) ) pack.metadata.label = t(key);
    } catch(err) {
      console.warn(`${SYSTEM_ID} | Could not translate the label of ${pack.collection}`, err);
    }
    // The index is loaded again whenever it needs more fields, so translate every load.
    const getIndex = pack.getIndex.bind(pack);
    pack.getIndex = async (...args) => {
      const index = await getIndex(...args);
      await loading;
      translateIndex(pack);
      return index;
    };
  }
}

/** Once the dictionary is in, translate what the compendium window already shows. */
async function translateLoadedPacks() {
  await loading;
  for ( const pack of systemPacks() ) {
    translateIndex(pack);
    translateFolders(pack);
  }
  ui.compendium?.render();
}

export function registerCompendiumHooks() {
  Hooks.once("init", () => {
    // Index entries need the flags that name book items.
    CONFIG.Item.compendiumIndexFields = [...new Set([...CONFIG.Item.compendiumIndexFields, `flags.${SYSTEM_ID}`])];
  });
  Hooks.once("i18nInit", () => loadDictionary(game.i18n.lang));
  Hooks.once("setup", localizePacks);
  Hooks.once("ready", translateLoadedPacks);
  Hooks.on("preCreateActor", onPreCreateActor);
  Hooks.on("preCreateItem", onPreCreateItem);
  Hooks.on("createActor", onCreateActor);
}
