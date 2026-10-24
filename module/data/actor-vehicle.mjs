import { VEHICLE_LOCATIONS, VEHICLE_MOTIVE } from "../config.mjs";
import { vehicleMaxMovement } from "../rules/vehicle.mjs";
import { counter } from "./actor-base.mjs";
import { UnitData, locationField } from "./actor-unit.mjs";

const { fields } = foundry.data;

/**
 * A combat vehicle (p. 44–49, Warrior's Catalog p. 166): tanks, hovercraft, wheeled vehicles and
 * VTOLs. Combat vehicles ignore Heat; their weak point is the motive system.
 */
export class VehicleData extends UnitData {
  static unitType = "vehicle";

  static defineSchema() {
    return {
      ...super.defineSchema(),
      locations: new fields.SchemaField(Object.fromEntries(Object.keys(VEHICLE_LOCATIONS).map(k => [k, locationField()]))),
      crits: new fields.SchemaField({
        movement: counter(0)
      })
    };
  }

  static defineDetails() {
    return {
      ...super.defineDetails(),
      motive: new fields.StringField({ required: true, initial: "tracked", choices: () => ({ ...VEHICLE_MOTIVE }) }),
      turret: new fields.BooleanField({ initial: true })
    };
  }

  /* -------------------------------------------- */

  /** Whether the vehicle is a VTOL (rotor instead of a turret, no motive damage). */
  get vtol() {
    return this.details.motive === "vtol";
  }

  /** @override */
  get locationKeys() {
    return Object.keys(VEHICLE_LOCATIONS).filter(k => {
      if ( k === "rotor" ) return this.vtol;
      if ( k === "turret" ) return !this.vtol && this.details.turret;
      return true;
    });
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this._prepareLocations();
    this.maxMovement = vehicleMaxMovement({ base: this.details.movement, lost: this.crits.movement });
    this.immobile = this.maxMovement === 0;
    this.physical = { ram: Math.ceil((this.details.tonnage / 30) * Math.max(1, this.details.movement)) };
  }
}
