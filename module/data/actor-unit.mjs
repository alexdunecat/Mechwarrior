import { CREW_PRESETS, EXPERIENCE_LEVELS, INITIATIVE_BY_EXPERIENCE, UNIT_TYPES, WEIGHT_CLASSES } from "../config.mjs";
import { buildTrack, woundModifier } from "../rules/condition.mjs";
import { hardwareCost } from "../rules/creation.mjs";
import { locationState } from "../rules/mech.mjs";
import { counter, trackField } from "./actor-base.mjs";

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
 * An NPC unit can instead carry a built-in crew: Gunnery and Piloting bonuses and a Condition
 * Monitor stored on the unit itself, used whenever nobody is in the pilot's seat.
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
      builtInCrew: new fields.SchemaField({
        active: new fields.BooleanField({ initial: false }),
        experience: new fields.StringField({ required: true, initial: "regular",
          choices: () => Object.fromEntries(Object.entries(EXPERIENCE_LEVELS).map(([k, v]) => [k, v.label])) }),
        gunnery: counter(CREW_PRESETS.regular.gunnery, { max: 20 }),
        piloting: counter(CREW_PRESETS.regular.piloting, { max: 20 }),
        initiative: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -3, max: 3 }),
        str: counter(2, { min: 1, max: 10 }),
        wil: counter(2, { min: 1, max: 10 })
      }),
      condition: new fields.SchemaField({
        physical: trackField(),
        fatigue: trackField()
      }),
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

  /** Choosing the built-in crew's Experience Level fills in its bonuses, unless they are set too. */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if ( allowed === false ) return false;
    const crew = changes.system?.builtInCrew;
    const level = crew?.experience;
    if ( level && (level !== this.builtInCrew.experience) && !("gunnery" in crew) && !("piloting" in crew) ) {
      Object.assign(crew, crewPreset(level));
    }
  }

  prepareDerivedData() {
    // Hardware Points follow from type and weight class (p. 76).
    this.hardwarePoints = hardwareCost(this.constructor.unitType, this.details.weightClass);
    this.tagList = this.details.tags.split(/[,;\n]/).map(t => t.trim()).filter(Boolean);

    // The built-in crew's Condition Monitor works like a person's (p. 36).
    const crew = this.builtInCrew;
    const { physical, fatigue } = this.condition;
    physical.track = buildTrack({ rating: crew.str, damage: physical.value, lost: physical.lost });
    fatigue.track = buildTrack({ rating: crew.wil, damage: fatigue.value, lost: fatigue.lost });
    this.woundModifier = woundModifier(physical.track, fatigue.track);
    this.initiativeBonus = crew.initiative;
    this.traitEffects = new Set();
    this.armor = null;
  }
}

/**
 * Built-in crew values for an Experience Level: Gunnery, Piloting and Initiative.
 * @param {string} level  Key of EXPERIENCE_LEVELS.
 * @returns {{gunnery: number, piloting: number, initiative: number}}
 */
export function crewPreset(level) {
  const preset = CREW_PRESETS[level] ?? CREW_PRESETS.regular;
  return { ...preset, initiative: INITIATIVE_BY_EXPERIENCE[level] ?? 0 };
}
