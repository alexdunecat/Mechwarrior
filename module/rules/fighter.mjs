/**
 * Aerospace fighter rules (p. 44–49). Pure functions only.
 */
import { FIGHTER_HIT_TABLE } from "../config.mjs";
import { heatEffects } from "./mech.mjs";

/**
 * Where a hit on an aerospace fighter lands (fighter Armor Diagram).
 * @param {number} roll  2D6 result.
 * @returns {{location: string, critChance: boolean}}
 */
export function fighterHitLocation(roll) {
  return { location: FIGHTER_HIT_TABLE[roll] ?? "nose", critChance: roll === 2 };
}

/**
 * Remaining Armor of a fighter location and of the shared Structure.
 * @param {{armor: number, armorDamage: number}} loc
 */
export function fighterArmorLeft(loc) {
  return Math.max(0, loc.armor - loc.armorDamage);
}

/**
 * Apply damage to an aerospace fighter (p. 44): the location's Armor first, then the Structure all
 * locations share. The fighter is destroyed when its Structure is gone.
 * @param {object} fighter
 * @param {Record<string, {armor: number, armorDamage: number}>} fighter.locations  Not mutated.
 * @param {{max: number, damage: number}} fighter.structure  Not mutated.
 * @param {string} location
 * @param {number} amount
 * @returns {{locations: object, structure: object, armor: number, structureHit: number, destroyed: boolean}}
 */
export function damageFighter({ locations, structure }, location, amount) {
  const locs = Object.fromEntries(Object.entries(locations).map(([k, v]) => [k, { ...v }]));
  const struct = { ...structure };
  const loc = locs[location];
  const points = Math.max(0, amount);
  const armor = Math.min(fighterArmorLeft(loc), points);
  const structureHit = Math.min(Math.max(0, struct.max - struct.damage), points - armor);
  loc.armorDamage += armor;
  struct.damage += structureHit;
  return {
    locations: locs, structure: struct, armor, structureHit,
    destroyed: (struct.max > 0) && (struct.damage >= struct.max)
  };
}

/**
 * Critical hit effect for a fighter's 2D6 critical hit roll (p. 45).
 * @param {number} roll
 * @returns {{effect: string, location?: string}}
 */
export function fighterCritEffect(roll) {
  switch ( roll ) {
    case 2: return { effect: "weapon", location: "nose" };
    case 3: return { effect: "avionics" };
    case 4: return { effect: "fuel" };
    case 5:
    case 6: return { effect: "weapon", location: "rightWing" };
    case 7: return { effect: "engine" };
    case 8:
    case 9: return { effect: "weapon", location: "leftWing" };
    case 10: return { effect: "ammo" };
    case 11: return { effect: "bomb" };
    default: return { effect: "cockpit" };
  }
}

/**
 * Work out one fighter critical hit, rerolling effects that cannot apply (p. 45).
 * @param {() => number} roll2D6
 * @param {object} unit
 * @param {(location: string) => boolean} unit.hasWeapon
 * @param {() => boolean} unit.hasAmmo
 * @param {() => boolean} unit.hasBomb
 * @param {number} [unit.avionicsHits=0]
 * @param {number} [unit.engineHits=0]
 * @returns {{effect: string, location?: string, rolls: number[]}|null}
 */
export function resolveFighterCrit(roll2D6, { hasWeapon, hasAmmo, hasBomb, avionicsHits = 0, engineHits = 0 }) {
  const rolls = [];
  const applicable = ({ effect, location }) => {
    switch ( effect ) {
      case "weapon": return hasWeapon(location);
      case "avionics": return avionicsHits < 1;
      case "engine": return engineHits < 2;
      case "ammo": return hasAmmo();
      case "bomb": return hasBomb();
      default: return true;
    }
  };
  for ( let attempt = 0; attempt < 30; attempt++ ) {
    const r = roll2D6();
    rolls.push(r);
    const crit = fighterCritEffect(r);
    if ( applicable(crit) ) return { ...crit, rolls };
  }
  return null;
}

/**
 * Heat a damaged fighter engine adds at the end of a Narration: +2 at the end of the Narration
 * after the critical hit (critical hit table, p. 45), then 1 per Narration (Heat, p. 47).
 * @param {object} unit
 * @param {number} unit.engineHits
 * @param {boolean} [unit.fresh=false]  The engine was hit since the last Narration ended.
 * @returns {number}
 */
export function fighterEngineHeat({ engineHits, fresh = false }) {
  if ( !engineHits ) return 0;
  return fresh ? 2 : 1;
}

/**
 * A fighter's Maximum Movement: –1 per engine hit and the Heat penalty. A shut-down fighter cannot
 * spend Movement but is not immobile (p. 48), so shutdown does not change it.
 * @param {object} unit
 * @param {number} unit.base
 * @param {number} [unit.heat=0]
 * @param {number} [unit.engineHits=0]
 * @returns {number}
 */
export function fighterMaxMovement({ base, heat = 0, engineHits = 0 }) {
  return Math.max(0, base - engineHits + heatEffects(heat).movement);
}
