import {
  ATTRIBUTES, DAMAGE_TYPES, MECH_EQUIPMENT_KINDS, MECH_RANGES, RANGE_CODES, SKILLS, SPECIALTIES, TRAIT_EFFECTS,
  TRAIT_POLARITIES, UNIT_LOCATIONS, UNIT_TYPES
} from "../config.mjs";
import { meleeStrBonus } from "../rules/tests.mjs";
import { counter } from "./actor-base.mjs";

const { fields } = foundry.data;

const labels = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v.label ?? v]));

function description() {
  return new fields.HTMLField({ required: true, initial: "" });
}

function rangeField(initial) {
  return new fields.StringField({ required: true, initial, choices: () => ({ ...RANGE_CODES }) });
}

/* -------------------------------------------- */

/**
 * A Skill: rating plus the linked Attribute gives the Skill Bonus (p. 32).
 */
export class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      key: new fields.StringField({ required: true, initial: "custom" }),
      rank: counter(1, { max: 10 }),
      attribute: new fields.StringField({ required: true, initial: "int", choices: () => labels(ATTRIBUTES) }),
      specialty: new fields.StringField({ required: true, blank: true, initial: "",
        choices: () => ({ "": "MWD.Specialty.none", ...SPECIALTIES }) }),
      description: description()
    };
  }

  /** Rating of the linked attribute on the owning actor. */
  get attributeValue() {
    return this.parent.actor?.system.attributes?.[this.attribute]?.total ?? 0;
  }

  /** Skill Bonus: rating + linked attribute. */
  get bonus() {
    return this.rank + this.attributeValue;
  }

  /** Whether the skill is one of the book's combat skills. */
  get isCombat() {
    return !!SKILLS[this.key]?.combat;
  }
}

/* -------------------------------------------- */

/**
 * A positive or negative Trait (p. 72). The modifier can be applied to a Test from the roll dialog.
 */
export class TraitData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      polarity: new fields.StringField({ required: true, initial: "positive", choices: () => ({ ...TRAIT_POLARITIES }) }),
      modifier: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -3, max: 3 }),
      appliesTo: new fields.StringField({ required: true, initial: "" }),
      effect: new fields.StringField({ required: true, blank: true, initial: "", choices: () => ({ ...TRAIT_EFFECTS }) }),
      initiative: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -3, max: 3 }),
      description: description()
    };
  }
}

/* -------------------------------------------- */

/**
 * A personal-scale weapon (p. 34, Warrior's Catalog p. 155).
 */
export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      skill: new fields.StringField({ required: true, initial: "smallArms" }),
      damage: counter(1),
      damageType: new fields.StringField({ required: true, blank: true, initial: "", choices: () => ({ ...DAMAGE_TYPES }) }),
      fatigue: new fields.BooleanField({ initial: false }),
      strBonus: new fields.BooleanField({ initial: false }),
      support: new fields.BooleanField({ initial: false }),
      ranges: new fields.SchemaField({
        close: rangeField("0"),
        near: rangeField("x"),
        far: rangeField("x")
      }),
      special: new fields.StringField({ required: true, initial: "" }),
      description: description()
    };
  }

  /** Damage bonus from the owner's STR for melee weapons. */
  get strDamageBonus() {
    if ( !this.strBonus ) return 0;
    return meleeStrBonus(this.parent.actor?.system.attributes?.str?.value ?? 0);
  }

  /** Damage including the STR bonus. */
  get totalDamage() {
    return this.damage + this.strDamageBonus;
  }

  /** Compact damage code as printed in the book, e.g. "2(+1)F" or "4". */
  get damageLabel() {
    const bonus = this.strDamageBonus;
    return `${this.damage}${bonus ? `(+${bonus})` : ""}${this.fatigue ? "F" : ""}`;
  }
}

/* -------------------------------------------- */

/**
 * Personal armor: pips absorb damage first; some types reduce B or E damage (p. 36, 156).
 */
export class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      pips: counter(10),
      damage: counter(0),
      reduceB: counter(0),
      reduceE: counter(0),
      rflPenalty: counter(0),
      concealed: new fields.BooleanField({ initial: false }),
      equipped: new fields.BooleanField({ initial: true }),
      description: description()
    };
  }

  /** Short effect summary, e.g. "–2 B, –1 E". */
  get effectLabel() {
    const parts = [];
    if ( this.reduceB ) parts.push(`–${this.reduceB} B`);
    if ( this.reduceE ) parts.push(`–${this.reduceE} E`);
    if ( this.rflPenalty ) parts.push(`–${this.rflPenalty} RFL`);
    return parts.join(", ");
  }
}

/* -------------------------------------------- */

/**
 * An Inventory item. Items have no stats; they are Cues for Narrations (p. 29).
 */
export class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: description()
    };
  }
}

/* -------------------------------------------- */
/*  'Mech items                                 */
/* -------------------------------------------- */

/**
 * A Primary Weapon or Weapon Group on a 'Mech (p. 41–44): weapons in a group fire together and
 * hit or miss together. Damage code "4+M (Max 6)" is base 4, one Missile die, Max 6.
 */
export class MechWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      primary: new fields.BooleanField({ initial: false }),
      damage: counter(1),
      missiles: counter(0, { max: 4 }),
      maxDamage: counter(0),
      heatAlternative: new fields.BooleanField({ initial: false }),
      types: new fields.StringField({ required: true, initial: "E" }),
      heat: counter(0, { max: 6 }),
      count: counter(1, { min: 1 }),
      bomb: new fields.BooleanField({ initial: false }),
      mounts: new fields.SchemaField(Object.fromEntries(Object.keys(UNIT_LOCATIONS).map(k => [k,
        new fields.BooleanField({ initial: k === "torso" })]))),
      ranges: new fields.SchemaField(Object.fromEntries(Object.keys(MECH_RANGES).map(k => [k,
        rangeField(["pointblank", "short"].includes(k) ? "0" : "x")]))),
      destroyed: new fields.BooleanField({ initial: false }),
      description: description()
    };
  }

  /** Mount new weapons where that kind of unit usually carries them. @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if ( allowed === false ) return false;
    const type = UNIT_TYPES[this.parent?.parent?.type];
    if ( type && !foundry.utils.hasProperty(data, "system.mounts") ) {
      this.updateSource({ mounts: Object.fromEntries(Object.keys(UNIT_LOCATIONS).map(k => [k, k === type.defaultMount])) });
    }
  }

  /** Location keys of the unit carrying this weapon, or every location when it is not on a unit. */
  get unitLocations() {
    return UNIT_TYPES[this.parent?.parent?.type]?.locations ?? Object.keys(UNIT_LOCATIONS);
  }

  /** Locations the group's weapons are mounted in. */
  get locations() {
    return this.unitLocations.filter(k => this.mounts[k]);
  }

  /** Whether the group contains Ballistic or Missile weapons (ammo explosions, p. 48). */
  get usesAmmo() {
    return /[BM]/.test(this.types);
  }

  /** Damage code as printed, e.g. "4+M (Max 6)" or "1 (or H)". */
  get damageLabel() {
    let label = String(this.damage);
    if ( this.missiles ) label += `+${"M".repeat(this.missiles)}`;
    if ( this.missiles && this.maxDamage ) label += ` (Max ${this.maxDamage})`;
    if ( this.heatAlternative ) label += " (or H)";
    return label;
  }

  /** Heat column as printed, e.g. "HH" or "—". */
  get heatLabel() {
    return this.heat ? "H".repeat(this.heat) : "—";
  }

  /** Location abbreviation keys, e.g. ["MWD.Mech.Location.rightArmAbbr"]. */
  get locationAbbrs() {
    return this.locations.map(k => UNIT_LOCATIONS[k].abbr);
  }
}

/* -------------------------------------------- */

/**
 * 'Mech-Scale equipment (p. 158): ammo bins matter for ammo explosion critical hits; jump jets allow
 * jumping. Vehicles and fighters list ammo without a location.
 */
export class MechEquipmentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      kind: new fields.StringField({ required: true, initial: "ammo", choices: () => ({ ...MECH_EQUIPMENT_KINDS }) }),
      location: new fields.StringField({ required: true, blank: true, initial: "torso",
        choices: () => ({ "": "MWD.Mech.Location.none", ...labels(UNIT_LOCATIONS) }) }),
      destroyed: new fields.BooleanField({ initial: false }),
      description: description()
    };
  }
}
