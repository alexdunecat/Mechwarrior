/**
 * Combat vehicle rules (p. 44–46, 49). Pure functions only.
 */
import { CRASH_DAMAGE_PER_MOVEMENT, MECH_TARGET_NUMBER, VEHICLE_HIT_TABLE } from "../config.mjs";
import { locationState } from "./mech.mjs";

/**
 * Where a hit on a combat vehicle lands (p. 46). Results of 10–12 hit the rotor of a VTOL or the
 * turret; a vehicle without either takes them on the front.
 * @param {number} roll  2D6 result.
 * @param {object} [unit]
 * @param {boolean} [unit.vtol=false]
 * @param {boolean} [unit.turret=true]
 * @returns {{location: string, critChance: boolean}}  A 2 or 12 may cause a critical hit.
 */
export function vehicleHitLocation(roll, { vtol = false, turret = true } = {}) {
  let location = VEHICLE_HIT_TABLE[roll] ?? "front";
  if ( location === "turret" ) {
    if ( vtol ) location = "rotor";
    else if ( !turret ) location = "front";
  }
  return { location, critChance: (roll === 2) || (roll === 12) };
}

/**
 * Apply damage to a vehicle location (p. 44–45): Armor first, then Structure. Nothing transfers;
 * a location that loses all of its Armor and Structure destroys the vehicle.
 * @param {Record<string, object>} locations  Not mutated.
 * @param {string} location
 * @param {number} amount
 * @returns {{locations: Record<string, object>, armor: number, structure: number, destroyed: boolean}}
 */
export function damageVehicleLocation(locations, location, amount) {
  const locs = Object.fromEntries(Object.entries(locations).map(([k, v]) => [k, { ...v }]));
  const loc = locs[location];
  const before = locationState(loc);
  const armor = Math.min(before.armorLeft, Math.max(0, amount));
  const structure = Math.min(before.structureLeft, Math.max(0, amount) - armor);
  loc.armorDamage += armor;
  loc.structureDamage += structure;
  return { locations: locs, armor, structure, destroyed: locationState(loc).destroyed };
}

/**
 * Motive damage (p. 44): a Tracked, Wheeled or Hover vehicle that takes any damage loses 2
 * Movement on 2D6 8+. VTOLs are exempt.
 * @param {number} roll  2D6 result.
 * @param {boolean} vtol
 * @returns {number}  Movement lost.
 */
export function motiveDamage(roll, vtol) {
  if ( vtol ) return 0;
  return (roll >= MECH_TARGET_NUMBER) ? 2 : 0;
}

/**
 * Candidate critical hit effects for a vehicle location and 1D6 roll, in order of preference
 * (p. 45). "ammo" needs ammo in the Equipment list and "weapon" a Weapon Group in that location.
 * @param {string} location
 * @param {number} d6
 * @returns {("crew"|"stunned"|"weapon"|"motive"|"ammo"|"movement")[]}
 */
export function vehicleCritCandidates(location, d6) {
  switch ( location ) {
    case "front":
    case "turret":
      if ( d6 === 1 ) return ["crew"];
      if ( d6 === 2 ) return ["stunned"];
      return ["weapon"];
    case "rightSide":
    case "leftSide":
      return ["motive"];
    case "rear":
      return (d6 <= 2) ? ["ammo", "movement"] : ["movement"];
    default:
      return [];
  }
}

/**
 * Work out one vehicle critical hit, rerolling effects that cannot apply (p. 45).
 * @param {string} location
 * @param {() => number} rollD6
 * @param {object} unit
 * @param {() => boolean} unit.hasAmmo
 * @param {(location: string) => boolean} unit.hasWeapon
 * @returns {{location: string, effect: string, rolls: number[]}|null}  Null for the rotor.
 */
export function resolveVehicleCrit(location, rollD6, { hasAmmo, hasWeapon }) {
  if ( !vehicleCritCandidates(location, 1).length ) return null;
  const rolls = [];
  const applicable = effect => {
    if ( effect === "ammo" ) return hasAmmo();
    if ( effect === "weapon" ) return hasWeapon(location);
    return true;
  };
  for ( let attempt = 0; attempt < 30; attempt++ ) {
    const d6 = rollD6();
    rolls.push(d6);
    const effect = vehicleCritCandidates(location, d6).find(applicable);
    if ( effect ) return { location, effect, rolls };
  }
  return null;
}

/**
 * Movement lost to a vehicle critical hit effect (p. 45).
 * @param {string} effect
 * @returns {number}
 */
export function critMovementLoss(effect) {
  if ( effect === "motive" ) return 2;
  if ( effect === "movement" ) return 1;
  return 0;
}

/**
 * A combat vehicle's Maximum Movement after motive damage and critical hits.
 * @param {object} unit
 * @param {number} unit.base
 * @param {number} [unit.lost=0]  Movement lost to motive damage and critical hits.
 * @returns {number}
 */
export function vehicleMaxMovement({ base, lost = 0 }) {
  return Math.max(0, base - lost);
}

/**
 * Physical damage to everyone in a crashed vehicle or downed fighter (p. 49): 3 pips per point
 * of Movement spent that Narration, minimum 1 Movement.
 * @param {number} movement
 * @returns {number}
 */
export function crashDamage(movement) {
  return CRASH_DAMAGE_PER_MOVEMENT * Math.max(1, movement);
}
