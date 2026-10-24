/**
 * 'Mech-Scale Combat rules (p. 38–51). Pure functions only.
 */
import { HEAT_LEVELS, MECH_HIT_TABLE, MECH_LOCATIONS } from "../config.mjs";

/* -------------------------------------------- */
/*  Hit locations                               */
/* -------------------------------------------- */

/**
 * Where a hit lands (p. 44–45).
 * @param {number} roll        2D6 (or 1D6 for kicks) result.
 * @param {"standard"|"punch"|"kick"} [table="standard"]  Punches and death from above turn leg hits
 *   into the matching arm; kicks roll 1D6 for a leg (p. 43).
 * @returns {{location: string, critChance: boolean, headHit: boolean}}
 */
export function hitLocation(roll, table = "standard") {
  if ( table === "kick" ) return { location: (roll <= 3) ? "rightLeg" : "leftLeg", critChance: false, headHit: false };
  let location = MECH_HIT_TABLE[roll] ?? "torso";
  if ( table === "punch" ) location = { rightLeg: "rightArm", leftLeg: "leftArm" }[location] ?? location;
  return { location, critChance: roll === 2, headHit: location === "head" };
}

/**
 * Damage from the Missile dice of a Weapon Group (p. 43): 1–3 deals that much, 4–6 nothing, and
 * the total with the base damage may not exceed Max Damage (the last dice are reduced first).
 * @param {object} weapon
 * @param {number} weapon.base
 * @param {number|null} [weapon.max]
 * @param {number[]} dice  One D6 per "M".
 * @returns {number[]}  Damage of each Missile die that still scores, in roll order.
 */
export function missileDamage({ base, max = null }, dice) {
  const values = dice.map(d => (d <= 3 ? d : 0));
  if ( Number.isFinite(max) && (max > 0) ) {
    let excess = base + values.reduce((a, b) => a + b, 0) - max;
    for ( let i = values.length - 1; (i >= 0) && (excess > 0); i-- ) {
      const cut = Math.min(values[i], excess);
      values[i] -= cut;
      excess -= cut;
    }
  }
  return values.filter(v => v > 0);
}

/**
 * Split damage into clusters, e.g. charges and death from above use 2-point clusters (p. 43).
 * @param {number} total
 * @param {number} [size=2]
 * @returns {number[]}
 */
export function clusters(total, size = 2) {
  const out = [];
  let left = Math.max(0, total);
  while ( left > 0 ) {
    out.push(Math.min(size, left));
    left -= size;
  }
  return out;
}

/* -------------------------------------------- */
/*  Armor and Structure                         */
/* -------------------------------------------- */

/**
 * Remaining Armor and Structure of a location.
 * @param {{armor: number, structure: number, armorDamage: number, structureDamage: number}} loc
 */
export function locationState(loc) {
  const armorLeft = Math.max(0, loc.armor - loc.armorDamage);
  const structureLeft = Math.max(0, loc.structure - loc.structureDamage);
  return { armorLeft, structureLeft, destroyed: (loc.armor + loc.structure > 0) && (armorLeft + structureLeft === 0) };
}

/**
 * Apply damage to a 'Mech location (p. 44–45): Armor first, then Structure; damage beyond a
 * destroyed arm or leg moves to the torso. Damage past a destroyed head or torso is lost.
 *
 * @param {Record<string, object>} locations  Location data keyed by MECH_LOCATIONS keys. Not mutated.
 * @param {string} location   Location hit.
 * @param {number} amount     Points of damage.
 * @returns {{
 *   locations: Record<string, object>,
 *   steps: {location: string, armor: number, structure: number, destroyed: boolean}[],
 *   structureHit: string[], destroyed: string[], mechDestroyed: boolean
 * }}
 */
export function damageLocation(locations, location, amount) {
  const locs = Object.fromEntries(Object.entries(locations).map(([k, v]) => [k, { ...v }]));
  const steps = [];
  const structureHit = [];
  const destroyed = [];
  let remaining = Math.max(0, amount);
  let current = location;
  let mechDestroyed = false;

  while ( remaining > 0 ) {
    const loc = locs[current];
    const before = locationState(loc);
    if ( before.destroyed ) {
      if ( !MECH_LOCATIONS[current]?.limb ) break;
      current = "torso";
      continue;
    }
    const armor = Math.min(before.armorLeft, remaining);
    const structure = Math.min(before.structureLeft, remaining - armor);
    loc.armorDamage += armor;
    loc.structureDamage += structure;
    remaining -= armor + structure;
    const after = locationState(loc);
    steps.push({ location: current, armor, structure, destroyed: after.destroyed });
    if ( structure > 0 ) structureHit.push(current);
    if ( after.destroyed ) {
      destroyed.push(current);
      if ( !MECH_LOCATIONS[current]?.limb ) {
        mechDestroyed = true;
        break;
      }
      current = "torso";
    }
  }
  return { locations: locs, steps, structureHit: [...new Set(structureHit)], destroyed, mechDestroyed };
}

/* -------------------------------------------- */
/*  Critical hits                               */
/* -------------------------------------------- */

/**
 * Candidate critical hit effects for a 1D6 roll, in order of preference (p. 45). An effect that
 * cannot apply falls through to the next one; "ammo" needs ammo in that location.
 * @param {string} location
 * @param {number} d6
 * @returns {("ammo"|"weapon"|"gyro"|"engine"|"movement")[]}
 */
export function critCandidates(location, d6) {
  if ( location === "head" ) return [];
  if ( location === "torso" ) {
    if ( d6 === 1 ) return ["ammo", "weapon"];
    if ( d6 === 2 ) return ["weapon"];
    if ( d6 <= 4 ) return ["gyro"];
    return ["engine"];
  }
  if ( MECH_LOCATIONS[location]?.leg ) return (d6 === 1) ? ["ammo", "weapon"] : ["movement"];
  return (d6 === 1) ? ["ammo", "weapon"] : ["weapon"];
}

/**
 * Work out one critical hit, rerolling effects that cannot apply and moving limb criticals that
 * cannot apply to the torso (p. 45).
 *
 * @param {string} location
 * @param {() => number} rollD6  Supplies D6 results.
 * @param {object} unit
 * @param {(location: string) => boolean} unit.hasAmmo
 * @param {(location: string) => boolean} unit.hasWeapon  An intact Weapon Group or Primary Weapon there.
 * @param {number} [unit.gyroHits=0]
 * @param {number} [unit.engineHits=0]
 * @returns {{location: string, effect: string, rolls: number[]}|null}  Null if nothing can apply.
 */
export function resolveCrit(location, rollD6, { hasAmmo, hasWeapon, gyroHits = 0, engineHits = 0 }) {
  if ( location === "head" ) return null;
  const rolls = [];
  const applicable = (loc, effect) => {
    if ( effect === "ammo" ) return hasAmmo(loc);
    if ( effect === "weapon" ) return hasWeapon(loc);
    if ( effect === "gyro" ) return gyroHits < 2;
    if ( effect === "engine" ) return engineHits < 2;
    return true;
  };
  let current = location;
  for ( let attempt = 0; attempt < 30; attempt++ ) {
    const d6 = rollD6();
    rolls.push(d6);
    const effect = critCandidates(current, d6).find(e => applicable(current, e));
    if ( effect ) return { location: current, effect, rolls };
    // Arms and legs: what cannot apply there moves to the torso. The torso rerolls.
    if ( current !== "torso" ) current = "torso";
  }
  return null;
}

/* -------------------------------------------- */
/*  Heat and Movement                           */
/* -------------------------------------------- */

/**
 * Heat Effects for a number of Heat tokens (p. 48). Lower levels are cumulative.
 * @param {number} tokens
 */
export function heatEffects(tokens) {
  const level = [...HEAT_LEVELS].reverse().find(l => tokens >= l.tokens) ?? HEAT_LEVELS[0];
  return {
    level: level.key,
    movement: tokens >= 1 ? -1 : 0,
    ranged: tokens >= 2 ? -1 : 0,
    shutdownRoll: (tokens === 3) || (tokens === 4),
    ammoRoll: tokens >= 4,
    autoShutdown: tokens >= 5
  };
}

/**
 * Heat at the end of a Narration (p. 47): a damaged engine adds a token, then the 'Mech sheds
 * its Heat Dissipation.
 * @param {object} unit
 * @param {number} unit.heat
 * @param {number} unit.dissipation
 * @param {number} [unit.engineHits=0]
 * @param {number} [unit.engineHeat]  Heat from the engine, if not the 'Mech's 1 per damaged engine.
 * @returns {number}
 */
export function coolDown({ heat, dissipation, engineHits = 0, engineHeat = (engineHits >= 1 ? 1 : 0) }) {
  return Math.max(0, heat + engineHeat - dissipation);
}

/**
 * Restarting a shut-down engine (p. 48): automatic at 2 or fewer Heat tokens, 8+ at 3, impossible above.
 * @param {number} heat
 * @returns {"auto"|"roll"|"none"}
 */
export function restartCheck(heat) {
  if ( heat <= 2 ) return "auto";
  if ( heat === 3 ) return "roll";
  return "none";
}

/**
 * Maximum Movement for a Narration.
 * @param {object} unit
 * @param {number} unit.base          Movement from the Hardware listing.
 * @param {number} [unit.heat=0]      Heat tokens carried into this Narration.
 * @param {number} [unit.legHits=0]   Leg critical hits (–1 each).
 * @param {boolean} [unit.legDestroyed=false]  A destroyed leg leaves 1 Movement at most (p. 45).
 * @param {number} [unit.gyroHits=0]  A second gyro hit stops all Movement.
 * @param {boolean} [unit.shutdown=false]
 * @returns {number}
 */
export function maxMovement({ base, heat = 0, legHits = 0, legDestroyed = false, gyroHits = 0, shutdown = false }) {
  if ( shutdown || (gyroHits >= 2) ) return 0;
  const movement = Math.max(0, base - legHits + heatEffects(heat).movement);
  return legDestroyed ? Math.min(1, movement) : movement;
}

/**
 * Speed modifier to ranged and physical attacks (p. 41): my Maximum Movement minus the target's.
 * @param {number} mine
 * @param {number} theirs
 */
export function speedModifier(mine, theirs) {
  return mine - theirs;
}

/* -------------------------------------------- */
/*  Physical attacks                            */
/* -------------------------------------------- */

/**
 * Damage of a physical attack (p. 43), rounded up.
 * @param {"punch"|"kick"|"push"|"charge"|"dfa"|"ram"} type
 * @param {object} data
 * @param {number} data.tonnage        Attacker's tonnage.
 * @param {number} [data.targetTonnage=0]
 * @param {number} [data.movement=0]   Movement spent this Narration (charge, ram, death from above).
 * @returns {{damage: number, self: number, selfTable: string|null}}
 *   Damage to the target, damage to the attacker and the hit table for the attacker's share.
 */
export function physicalDamage(type, { tonnage, targetTonnage = 0, movement = 0 }) {
  const move = Math.max(1, movement);
  switch ( type ) {
    case "punch": return { damage: Math.ceil(tonnage / 30), self: 0, selfTable: null };
    case "kick": return { damage: Math.ceil(tonnage / 15), self: 0, selfTable: null };
    case "charge": return { damage: Math.ceil((tonnage / 30) * move), self: Math.ceil(targetTonnage / 30), selfTable: "standard" };
    case "ram": return { damage: Math.ceil((tonnage / 30) * move), self: Math.ceil(targetTonnage / 30), selfTable: "kick" };
    case "dfa": return { damage: Math.ceil((tonnage / 30) * move), self: Math.ceil(tonnage / 30), selfTable: "kick" };
    default: return { damage: 0, self: 0, selfTable: null };
  }
}
