import { ATTRIBUTE_KEYS } from "../config.mjs";
import { buildTrack, woundModifier } from "../rules/condition.mjs";

const { fields } = foundry.data;

/** Integer field with a zero floor. */
export function counter(initial = 0, options = {}) {
  return new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial, ...options });
}

function trackField() {
  return new fields.SchemaField({
    value: counter(0),
    lost: counter(0),
    kiaChecks: counter(0)
  });
}

/**
 * Data shared by every person-scale actor: player characters and NPCs.
 */
export class PersonData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      attributes: new fields.SchemaField(Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key,
        new fields.SchemaField({ value: counter(1, { max: 10 }) })
      ]))),
      condition: new fields.SchemaField({
        physical: trackField(),
        fatigue: trackField()
      }),
      tags: new fields.StringField({ required: true, initial: "" }),
      notes: new fields.HTMLField({ required: true, initial: "" })
    };
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    const items = this.parent.items;

    // Worn armor: the first equipped armor item counts.
    const armor = items.find(i => (i.type === "armor") && i.system.equipped) ?? null;
    this.armor = armor ? {
      id: armor.id,
      name: armor.name,
      max: armor.system.pips,
      value: Math.max(0, armor.system.pips - armor.system.damage),
      reduceB: armor.system.reduceB,
      reduceE: armor.system.reduceE,
      rflPenalty: armor.system.rflPenalty
    } : null;

    for ( const [key, attr] of Object.entries(this.attributes) ) {
      attr.total = attr.value - ((key === "rfl") ? (this.armor?.rflPenalty ?? 0) : 0);
    }

    const traits = items.filter(i => i.type === "trait");
    this.traitEffects = new Set(traits.map(t => t.system.effect).filter(Boolean));
    const ignoreFirst = this.traitEffects.has("painResistance");
    const { physical, fatigue } = this.condition;
    physical.track = buildTrack({ rating: this.attributes.str.value, damage: physical.value, lost: physical.lost, ignoreFirst });
    fatigue.track = buildTrack({ rating: this.attributes.wil.value, damage: fatigue.value, lost: fatigue.lost, ignoreFirst });
    this.woundModifier = woundModifier(physical.track, fatigue.track);

    this.initiativeBonus = traits.reduce((total, t) => total + t.system.initiative, 0);
    this.tagList = this.tags.split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
  }

  /* -------------------------------------------- */

  /** Whether this actor tracks Edge spending (NPCs in the book do not). */
  get usesEdge() {
    return false;
  }
}
