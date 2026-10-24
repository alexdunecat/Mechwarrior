import { MECH_LOCATION_KEYS, MECH_LOCATIONS } from "../config.mjs";
import { heatEffects, maxMovement } from "../rules/mech.mjs";
import { counter } from "./actor-base.mjs";
import { UnitData, locationField } from "./actor-unit.mjs";

const { fields } = foundry.data;

/**
 * A BattleMech (Hardware, p. 38–51 and Warrior's Catalog p. 158). The MechWarrior is a separate
 * character actor linked by UUID, so a pilot can move between machines.
 */
export class MechData extends UnitData {
  static unitType = "mech";

  static defineSchema() {
    return {
      ...super.defineSchema(),
      locations: new fields.SchemaField(Object.fromEntries(MECH_LOCATION_KEYS.map(k => [k, locationField()]))),
      heat: new fields.SchemaField({
        value: counter(0),
        level: counter(0)
      }),
      crits: new fields.SchemaField({
        gyro: counter(0, { max: 2 }),
        engine: counter(0, { max: 2 }),
        legs: counter(0)
      })
    };
  }

  static defineDetails() {
    return {
      ...super.defineDetails(),
      jumpJets: new fields.BooleanField({ initial: false }),
      heatDissipation: counter(2),
      punch: new fields.BooleanField({ initial: true })
    };
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    super.prepareDerivedData();
    this._prepareLocations();
    for ( const loc of Object.values(this.locations) ) loc.leg = !!MECH_LOCATIONS[loc.key].leg;
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
  }
}
