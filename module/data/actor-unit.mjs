import { UNIT_TYPES, WEIGHT_CLASSES } from "../config.mjs";
import { locationState } from "../rules/mech.mjs";
import { counter } from "./actor-base.mjs";

const { fields } = foundry.data;

/** Armor and Structure pips of one location, and how many of each are marked off. */
export function locationField() {
  return new fields.SchemaField({
    armor: counter(0),
    structure: counter(0),
    armorDamage: counter(0),
    structureDamage: counter(0)
  });
}

/**
 * Shared data of 'Mech-Scale units ('Mechs, combat vehicles, aerospace fighters). The pilot and
 * any other crew are separate person actors linked by UUID, so they can move between machines.
 * @abstract
 */
export class UnitData extends foundry.abstract.TypeDataModel {
  /** Key of UNIT_TYPES. */
  static unitType = "mech";

  static defineSchema() {
    const type = UNIT_TYPES[this.unitType];
    return {
      details: new fields.SchemaField(this.defineDetails()),
      status: new fields.SchemaField(Object.fromEntries(type.statuses.map(k => [k, new fields.BooleanField({ initial: false })]))),
      pilot: new fields.StringField({ required: true, blank: true, initial: "" }),
      crew: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
      smallArms: counter(0),
      notes: new fields.HTMLField({ required: true, initial: "" })
    };
  }

  /** Hardware details from the unit listing (Warrior's Catalog, p. 158). */
  static defineDetails() {
    return {
      model: new fields.StringField({ required: true, initial: "" }),
      weightClass: new fields.StringField({ required: true, initial: "medium",
        choices: () => Object.fromEntries(Object.entries(WEIGHT_CLASSES).map(([k, v]) => [k, v.label])) }),
      tonnage: counter(50, { max: 200 }),
      hardwarePoints: counter(2),
      movement: counter(3),
      tags: new fields.StringField({ required: true, initial: "" })
    };
  }

  /* -------------------------------------------- */

  /** @type {object} */
  get unitConfig() {
    return UNIT_TYPES[this.constructor.unitType];
  }

  /**
   * Locations on this unit's Armor Diagram.
   * @type {string[]}
   */
  get locationKeys() {
    return this.unitConfig.locations;
  }

  /** Whether the unit tracks Heat (combat vehicles ignore it, p. 47). */
  get usesHeat() {
    return this.unitConfig.heat;
  }

  /**
   * Fill in remaining Armor and Structure per location and the totals used by token bars.
   * @protected
   */
  _prepareLocations() {
    let armor = 0;
    let armorMax = 0;
    let structure = 0;
    let structureMax = 0;
    for ( const key of this.locationKeys ) {
      const loc = this.locations[key];
      Object.assign(loc, locationState(loc), { key });
      armor += loc.armorLeft;
      armorMax += loc.armor;
      structure += loc.structureLeft;
      structureMax += loc.structure;
    }
    this.armorTotal = { value: armor, max: armorMax };
    this.structureTotal = { value: structure, max: structureMax };
  }

  prepareDerivedData() {
    this.tagList = this.details.tags.split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
  }
}
