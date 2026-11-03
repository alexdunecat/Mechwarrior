/**
 * Translation of the book content in the system's compendiums (names, descriptions, biographies,
 * Cues, Tags). The packs hold the book's English text; a dictionary per language maps each English
 * string to its translation, in the manner of gettext. Long texts are translated paragraph by
 * paragraph, Cues and Dispositions line by line and Tags one by one, so that shared pieces need
 * one entry. Strings with no entry stay as they are: 'Mech and vehicle names and the names of
 * people are never translated.
 *
 * The functions here are pure; compendium.mjs loads the dictionary and applies them.
 */

/** @typedef {Record<string, string>} Dictionary */

/**
 * One string.
 * @param {Dictionary|null} dict
 * @param {string} text
 * @returns {string}
 */
export function translateText(dict, text) {
  if ( !dict || (typeof text !== "string") ) return text;
  const key = text.trim();
  return key && (key in dict) ? dict[key] : text;
}

/**
 * HTML made of paragraphs: each <p>…</p> is looked up on its own.
 * @param {Dictionary|null} dict
 * @param {string} html
 * @returns {string}
 */
export function translateHtml(dict, html) {
  if ( !dict || !html ) return html;
  if ( !/<p>/.test(html) ) return translateText(dict, html);
  return html.replace(/<p>([\s\S]*?)<\/p>/g, (match, text) => {
    const translated = translateText(dict, text);
    return translated === text ? match : `<p>${translated}</p>`;
  });
}

/**
 * One entry per line (Cues, Dispositions).
 * @param {Dictionary|null} dict
 * @param {string} text
 * @returns {string}
 */
export function translateLines(dict, text) {
  if ( !dict || !text ) return text;
  return text.split("\n").map(line => translateText(dict, line.trim()) ?? line).join("\n");
}

/**
 * A comma-separated list (Tags).
 * @param {Dictionary|null} dict
 * @param {string} text
 * @returns {string}
 */
export function translateList(dict, text) {
  if ( !dict || !text ) return text;
  return text.split(/\s*[,;]\s*/).map(tag => translateText(dict, tag.trim())).join(", ");
}

/** How each translated field of a document is read: path → translator. */
const ITEM_FIELDS = {
  "system.description": translateHtml,
  "system.appliesTo": translateText
};

const ACTOR_FIELDS = {
  "system.notes": translateHtml,
  "system.tags": translateList,
  "system.details.tags": translateList,
  "system.details.rank": translateText,
  "system.details.faction": translateText,
  "system.lifeModules.faction": translateText,
  "system.lifeModules.childhood": translateText,
  "system.lifeModules.education": translateText,
  "system.lifeModules.realLife": translateText,
  "system.cues": translateLines,
  "system.biography.history": translateHtml,
  "system.biography.personality": translateHtml,
  "system.biography.disposition": translateLines
};

const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);

/**
 * Translated values for a document's fields, as a flat {path: value} object holding only what changed.
 * @param {Dictionary|null} dict
 * @param {object} data       Document data or a prepared document.
 * @param {"Actor"|"Item"} documentName
 * @param {string|null} [name]  A name worked out elsewhere (Skills, book Traits), else the dictionary's.
 * @returns {Record<string, string>}
 */
export function translatedFields(dict, data, documentName, name = null) {
  const changes = {};
  if ( !dict ) return changes;
  const newName = name ?? translateText(dict, data.name);
  if ( newName && (newName !== data.name) ) changes.name = newName;
  const fields = documentName === "Actor" ? ACTOR_FIELDS : ITEM_FIELDS;
  for ( const [path, translate] of Object.entries(fields) ) {
    const value = get(data, path);
    if ( typeof value !== "string" || !value ) continue;
    const translated = translate(dict, value);
    if ( translated !== value ) changes[path] = translated;
  }
  return changes;
}
