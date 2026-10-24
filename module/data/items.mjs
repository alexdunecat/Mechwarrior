import { ATTRIBUTES, DAMAGE_TYPES, RANGE_CODES, SKILLS, SPECIALTIES, TRAIT_EFFECTS, TRAIT_POLARITIES } from "../config.mjs";
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
