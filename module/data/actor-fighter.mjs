import { FIGHTER_LOCATIONS } from "../config.mjs";
import { fighterArmorLeft, fighterMaxMovement } from "../rules/fighter.mjs";
import { heatEffects } from "../rules/mech.mjs";
import { counter } from "./actor-base.mjs";
import { UnitData } from "./actor-unit.mjs";

const { fields } = foundry.data;

/**
 * An aerospace fighter (p. 44–49, Warrior's Catalog p. 171). Each location has its own Armor but
 * all of them share one pool of Structure.
 */
export class FighterData extends UnitData {
  static unitType = "fighter";

  static defineSchema() {
    return {
      ...super.defineSchema(),
      locations: new fields.SchemaField(Object.fromEntries(Object.keys(FIGHTER_LOCATIONS).map(k => [k,
        new fields.SchemaField({ armor: counter(0), armorDamage: counter(0) })]))),
      structure: new fields.SchemaField({
        max: counter(0),
        damage: counter(0)
      }),
      heat: new fields.SchemaField({
        value: counter(0),
        level: counter(0)
      }),
      crits: new fields.SchemaField({
        avionics: counter(0, { max: 1 }),
        engine: counter(0, { max: 2 }),
        engineFresh: new fields.BooleanField({ initial: false })
      })
    };
  }

  static defineDetails() {
    return {
      ...super.defineDetails(),
      heatDissipation: counter(2)
    };
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    super.prepareDerivedData();
    let armor = 0;
    let armorMax = 0;
    for ( const [key, loc] of Object.entries(this.locations) ) {
      loc.key = key;
      loc.armorLeft = fighterArmorLeft(loc);
      armor += loc.armorLeft;
      armorMax += loc.armor;
    }
    const structureLeft = Math.max(0, this.structure.max - this.structure.damage);
    this.armorTotal = { value: armor, max: armorMax };
    this.structureTotal = { value: structureLeft, max: this.structure.max };
    this.heatEffects = heatEffects(this.heat.level);
    this.maxMovement = fighterMaxMovement({ base: this.details.movement, heat: this.heat.level, engineHits: this.crits.engine });
  }
}
