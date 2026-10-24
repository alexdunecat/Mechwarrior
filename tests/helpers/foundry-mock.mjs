/**
 * A very small stand-in for the parts of the Foundry API that the data models touch, so their
 * derived-data logic can run under Node. It is not a Foundry emulator: sheets and documents
 * are not covered.
 */

class DataField {
  constructor(options = {}) {
    this.options = options;
  }

  initialValue() {
    const { initial } = this.options;
    return typeof initial === "function" ? initial() : initial;
  }
}

class SchemaField extends DataField {
  constructor(fields, options = {}) {
    super(options);
    this.fields = fields;
  }

  initialValue() {
    return Object.fromEntries(Object.entries(this.fields).map(([k, f]) => [k, f.initialValue()]));
  }
}

class StringField extends DataField {}
class HTMLField extends StringField {}
class NumberField extends DataField {}
class BooleanField extends DataField {}
class ObjectField extends DataField {}
class ArrayField extends DataField {
  constructor(element, options = {}) {
    super({ initial: () => [], ...options });
    this.element = element;
  }
}

function merge(initial, source) {
  if ( !source || (typeof source !== "object") || Array.isArray(source) ) return source ?? initial;
  const out = { ...initial };
  for ( const [k, v] of Object.entries(source) ) {
    out[k] = (initial && (typeof initial[k] === "object") && (initial[k] !== null)) ? merge(initial[k], v) : v;
  }
  return out;
}

class TypeDataModel {
  constructor(source = {}, { parent = null } = {}) {
    const schema = new SchemaField(this.constructor.defineSchema());
    Object.assign(this, merge(schema.initialValue(), source));
    Object.defineProperty(this, "parent", { value: parent, enumerable: false });
  }

  prepareDerivedData() {}
}

globalThis.foundry = {
  data: { fields: { DataField, SchemaField, StringField, HTMLField, NumberField, BooleanField, ArrayField, ObjectField } },
  abstract: { TypeDataModel }
};

/**
 * Build a fake item with a system model.
 * @param {Function} Model
 * @param {object} data  {type, name, system}
 */
export function makeItem(Model, { type, name = type, system = {} }) {
  const item = { id: `${type}-${Math.random().toString(36).slice(2, 8)}`, type, name, actor: null };
  item.system = new Model(system, { parent: item });
  return item;
}

/**
 * Build a fake actor whose system model can prepare derived data.
 * @param {Function} Model
 * @param {object} system
 * @param {object[]} items
 */
export function makeActor(Model, system, items = []) {
  const actor = { items, type: "character" };
  items.forEach(i => { i.actor = actor; });
  actor.system = new Model(system, { parent: actor });
  actor.system.prepareDerivedData();
  return actor;
}
