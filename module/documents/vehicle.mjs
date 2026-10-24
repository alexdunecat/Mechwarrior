import { CREW_HIT_DAMAGE } from "../config.mjs";
import {
  critMovementLoss, damageVehicleLocation, motiveDamage, resolveVehicleCrit, vehicleHitLocation
} from "../rules/vehicle.mjs";
import {
  critCheck, critDice, crewConChecks, damageGroups, hurtCrew, intactItems, locLabel, postDamageCard,
  postNarrationCard, roll, t
} from "./unit.mjs";

/**
 * Combat vehicle damage and upkeep (p. 44–49). Shared 'Mech-Scale Combat lives in unit.mjs.
 */

/**
 * Resolve a 'Mech-Scale hit on a combat vehicle: hit locations, Armor and Structure, critical hits
 * and motive damage. A location losing all of its Armor and Structure destroys the vehicle. Heat
 * attacks (flamers, infernos) roll a critical hit check per Heat token instead (p. 44).
 * @param {Actor} vehicle
 * @param {import("./unit.mjs").MechDamage} damage
 * @returns {Promise<ChatMessage>}
 */
export async function applyVehicleHit(vehicle, damage) {
  const system = vehicle.system;
  const lines = [];
  const rolls = [];
  const notes = new Set();
  const state = {
    locations: foundry.utils.deepClone(system._source.locations),
    movementLost: system.crits.movement,
    stunned: system.status.stunned,
    destroyed: system.status.destroyed,
    destroyedItems: new Set(),
    crewHits: 0,
    damaged: false
  };
  const where = { vtol: system.vtol, turret: system.details.turret };

  if ( damage.heatInstead ) {
    lines.push(t("MWD.Vehicle.Damage.HeatCrits", { n: damage.base }));
    for ( let i = 0; (i < damage.base) && !state.destroyed; i++ ) {
      const r = await roll("2d6");
      rolls.push(r.roll);
      const { location } = vehicleHitLocation(r.total, where);
      await checkCrit(vehicle, state, location, lines, rolls);
    }
  }
  else {
    const groups = await damageGroups(damage, lines, rolls);
    for ( const amount of groups ) {
      const r = await roll("2d6");
      rolls.push(r.roll);
      const hit = vehicleHitLocation(r.total, where);
      lines.push(t("MWD.Mech.Damage.Location", { roll: r.total, location: locLabel(hit.location), n: amount }));
      const result = damageVehicleLocation(state.locations, hit.location, amount);
      state.locations = result.locations;
      state.damaged ||= (result.armor + result.structure) > 0;
      lines.push(t("MWD.Mech.Damage.Step", { location: locLabel(hit.location), armor: result.armor, structure: result.structure })
        + (result.destroyed ? ` ${t("MWD.Mech.Damage.LocationDestroyed")}` : ""));
      if ( result.destroyed ) {
        state.destroyed = true;
        break;
      }
      if ( (result.structure > 0) || hit.critChance ) await checkCrit(vehicle, state, hit.location, lines, rolls);
      if ( state.destroyed ) break;
    }

    // Motive damage: once per hit that damaged the vehicle (p. 44).
    if ( state.damaged && !state.destroyed && !system.vtol ) {
      const r = await roll("2d6");
      rolls.push(r.roll);
      const lost = motiveDamage(r.total, system.vtol);
      state.movementLost += lost;
      lines.push(t(lost ? "MWD.Vehicle.Damage.Motive" : "MWD.Vehicle.Damage.MotiveSafe", { roll: r.total }));
    }
  }

  await vehicle.update({
    "system.locations": state.locations,
    "system.crits.movement": state.movementLost,
    "system.status.stunned": state.stunned,
    "system.status.destroyed": state.destroyed
  });
  const itemUpdates = [...state.destroyedItems].map(_id => ({ _id, "system.destroyed": true }));
  if ( itemUpdates.length ) await vehicle.updateEmbeddedDocuments("Item", itemUpdates);
  if ( state.destroyed ) notes.add("MWD.Vehicle.Damage.Destroyed");
  else if ( vehicle.system.immobile ) notes.add("MWD.Vehicle.Damage.Immobile");
  const message = await postDamageCard(vehicle, { damage, lines, rolls, notes });
  await hurtCrew(vehicle, CREW_HIT_DAMAGE * state.crewHits);
  return message;
}

/** Roll a critical hit check for a vehicle location and apply the result (p. 45). */
async function checkCrit(vehicle, state, location, lines, rolls) {
  const check = await critCheck(rolls);
  if ( !check.crit ) {
    lines.push(t("MWD.Mech.Crit.NoCrit", { location: locLabel(location), roll: check.total }));
    return;
  }
  const { weaponsIn, ammo } = intactItems(vehicle, state.destroyedItems);
  const dice = await critDice("1d6");
  const crit = resolveVehicleCrit(location, dice.next, {
    hasAmmo: () => ammo().length > 0,
    hasWeapon: loc => weaponsIn(loc).length > 0
  });
  rolls.push(...dice.used());
  if ( !crit ) {
    lines.push(t("MWD.Mech.Crit.None", { location: locLabel(location), roll: check.total }));
    return;
  }
  const prefix = t("MWD.Mech.Crit.Hit", { location: locLabel(location), roll: check.total });
  switch ( crit.effect ) {
    case "crew":
      state.crewHits += 1;
      lines.push(`${prefix} ${t("MWD.Vehicle.Crit.Crew")}`);
      break;
    case "stunned":
      state.stunned = true;
      lines.push(`${prefix} ${t("MWD.Vehicle.Crit.Stunned")}`);
      break;
    case "weapon": {
      const weapon = weaponsIn(location)[0];
      state.destroyedItems.add(weapon.id);
      lines.push(`${prefix} ${t("MWD.Mech.Crit.Weapon", { weapon: weapon.name })}`);
      break;
    }
    case "ammo":
      for ( const bin of ammo() ) state.destroyedItems.add(bin.id);
      state.destroyed = true;
      lines.push(`${prefix} ${t("MWD.Vehicle.Crit.Ammo")}`);
      break;
    default:
      state.movementLost += critMovementLoss(crit.effect);
      lines.push(`${prefix} ${t("MWD.Vehicle.Crit.Movement", { n: critMovementLoss(crit.effect) })}`);
  }
}

/**
 * End of a vehicle's Narration: CON Checks for unconscious crew, and a stunned crew recovers (p. 45).
 * Combat vehicles ignore Heat.
 * @param {Actor} vehicle
 */
export async function endVehicleNarration(vehicle) {
  await crewConChecks(vehicle);
  const lines = [];
  if ( vehicle.system.status.stunned ) {
    await vehicle.update({ "system.status.stunned": false });
    lines.push(t("MWD.Vehicle.Crit.StunRecovered"));
  }
  else lines.push(t("MWD.Vehicle.NoUpkeep"));
  return postNarrationCard(vehicle, lines, []);
}
