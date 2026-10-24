import { MECH_LOCATIONS, MECH_LOCATION_KEYS, WEIGHT_CLASSES } from "../config.mjs";
import { heatEffects, locationState, maxMovement } from "../rules/mech.mjs";
import { counter } from "./actor-base.mjs";

const { fields } = foundry.data;

function locationField() {
  return new fields.SchemaField({
    armor: counter(0),
    structure: counter(0),
    armorDamage: counter(0),
    structureDamage: counter(0)
  });
}

/**
 * A BattleMech (Hardware, p. 38–51 and Warrior's Catalog p. 158). The MechWarrior is a separate
 * character actor linked by UUID, so a pilot can move between machines.
 */
export class MechData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      details: new fields.SchemaField({
        model: new fields.StringField({ required: true, initial: "" }),
        weightClass: new fields.StringField({ required: true, initial: "medium",
          choices: () => Object.fromEntries(Object.entries(WEIGHT_CLASSES).map(([k, v]) => [k, v.label])) }),
        tonnage: counter(50, { max: 100 }),
        hardwarePoints: counter(2),
        movement: counter(3),
        jumpJets: new fields.BooleanField({ initial: false }),
        heatDissipation: counter(2),
        punch: new fields.BooleanField({ initial: true }),
        tags: new fields.StringField({ required: true, initial: "" })
      }),
      locations: new fields.SchemaField(Object.fromEntries(MECH_LOCATION_KEYS.map(k => [k, locationField()]))),
      heat: new fields.SchemaField({
        value: counter(0),
        level: counter(0)
      }),
      crits: new fields.SchemaField({
        gyro: counter(0, { max: 2 }),
        engine: counter(0, { max: 2 }),
        legs: counter(0)
      }),
      status: new fields.SchemaField({
        prone: new fields.BooleanField({ initial: false }),
        jumped: new fields.BooleanField({ initial: false }),
        shutdown: new fields.BooleanField({ initial: false }),
        disengaged: new fields.BooleanField({ initial: false }),
        destroyed: new fields.BooleanField({ initial: false })
      }),
      pilot: new fields.StringField({ required: true, blank: true, initial: "" }),
      notes: new fields.HTMLField({ required: true, initial: "" })
    };
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    let armor = 0;
    let armorMax = 0;
    let structure = 0;
    let structureMax = 0;
    for ( const [key, loc] of Object.entries(this.locations) ) {
      Object.assign(loc, locationState(loc), { key, leg: !!MECH_LOCATIONS[key].leg });
      armor += loc.armorLeft;
      armorMax += loc.armor;
      structure += loc.structureLeft;
      structureMax += loc.structure;
    }
    this.armorTotal = { value: armor, max: armorMax };
    this.structureTotal = { value: structure, max: structureMax };
    this.legDestroyed = this.locations.rightLeg.destroyed || this.locations.leftLeg.destroyed;

    // Heat penalties use the tokens left after the last cool down (p. 48).
    this.heatEffects = heatEffects(this.heat.level);
    this.maxMovement = maxMovement({
      base: this.details.movement,
      heat: this.heat.level,
      legHits: this.crits.legs,
      legDestroyed: this.legDestroyed,
      gyroHits: this.crits.gyro,
      shutdown: this.status.shutdown
    });
    this.physical = {
      punch: this.details.punch ? Math.ceil(this.details.tonnage / 30) : 0,
      kick: Math.ceil(this.details.tonnage / 15)
    };
    this.tagList = this.details.tags.split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
  }
}
