import { CREW_HIT_DAMAGE, PILOT_HIT_DAMAGE } from "../config.mjs";
import { damageFighter, fighterEngineHeat, fighterHitLocation, resolveFighterCrit } from "../rules/fighter.mjs";
import {
  critCheck, critDice, crewConChecks, damageGroups, getPilot, heatUpkeep, hurtCrew, intactItems, locLabel,
  postDamageCard, postNarrationCard, roll, rollPilotingTest, t
} from "./unit.mjs";

/**
 * Aerospace fighter damage, loss of control and Heat (p. 44–49). Shared 'Mech-Scale Combat lives in
 * unit.mjs.
 */

/** Fuel tank critical hits explode on 2D6 10+ (p. 45). */
const FUEL_EXPLOSION = 10;

/**
 * Resolve a 'Mech-Scale hit on an aerospace fighter: hit locations, location Armor, shared Structure
 * and critical hits. A location taking 2+ damage from one attack, Structure damage or a location
 * roll of 2 call for a critical hit check (p. 44–45). Damage in atmosphere calls for a Piloting Test.
 * @param {Actor} fighter
 * @param {import("./unit.mjs").MechDamage} damage
 * @returns {Promise<ChatMessage>}
 */
export async function applyFighterHit(fighter, damage) {
  const system = fighter.system;
  const lines = [];
  const rolls = [];
  const notes = new Set();

  if ( damage.heatInstead ) {
    await fighter.update({ "system.heat.value": system.heat.value + damage.base });
    lines.push(t("MWD.Mech.Damage.HeatTokens", { n: damage.base }));
    return postDamageCard(fighter, { damage, lines, rolls, notes });
  }

  const state = {
    locations: foundry.utils.deepClone(system._source.locations),
    structure: { ...system._source.structure },
    crits: { ...system._source.crits },
    destroyed: system.status.destroyed,
    destroyedItems: new Set(),
    pilotHits: 0,
    pilotingTest: false
  };
  const taken = {};
  const critLocations = new Set();
  let damaged = false;

  const groups = await damageGroups(damage, lines, rolls);
  for ( const amount of groups ) {
    const r = await roll("2d6");
    rolls.push(r.roll);
    const hit = fighterHitLocation(r.total);
    lines.push(t("MWD.Mech.Damage.Location", { roll: r.total, location: locLabel(hit.location), n: amount }));
    const result = damageFighter(state, hit.location, amount);
    Object.assign(state, { locations: result.locations, structure: result.structure });
    lines.push(t("MWD.Mech.Damage.Step", { location: locLabel(hit.location), armor: result.armor, structure: result.structureHit }));
    taken[hit.location] = (taken[hit.location] ?? 0) + result.armor + result.structureHit;
    damaged ||= (result.armor + result.structureHit) > 0;
    if ( (result.structureHit > 0) || hit.critChance ) critLocations.add(hit.location);
    if ( result.destroyed ) {
      state.destroyed = true;
      lines.push(t("MWD.Fighter.Damage.StructureGone"));
      break;
    }
  }
  for ( const [location, points] of Object.entries(taken) ) if ( points >= 2 ) critLocations.add(location);
  for ( const location of critLocations ) {
    if ( state.destroyed ) break;
    await checkCrit(fighter, state, location, lines, rolls);
  }

  if ( damaged && system.status.atmosphere ) state.pilotingTest = true;
  await fighter.update({
    "system.locations": state.locations,
    "system.structure": state.structure,
    "system.crits": state.crits,
    "system.status.destroyed": state.destroyed
  });
  const itemUpdates = [...state.destroyedItems].map(_id => ({ _id, "system.destroyed": true }));
  if ( itemUpdates.length ) await fighter.updateEmbeddedDocuments("Item", itemUpdates);

  if ( state.destroyed ) notes.add("MWD.Fighter.Damage.Destroyed");
  else if ( state.pilotingTest ) notes.add("MWD.Fighter.Damage.PilotingTest");
  const message = await postDamageCard(fighter, {
    damage, lines, rolls, notes, pilotingTest: state.pilotingTest && !state.destroyed
  });
  await hurtCrew(fighter, PILOT_HIT_DAMAGE * state.pilotHits, { pilotOnly: true });
  return message;
}

/** Roll a critical hit check for a fighter location and apply the result (p. 45). */
async function checkCrit(fighter, state, location, lines, rolls) {
  const check = await critCheck(rolls);
  if ( !check.crit ) {
    lines.push(t("MWD.Mech.Crit.NoCrit", { location: locLabel(location), roll: check.total }));
    return;
  }
  const { weaponsIn, ammo, bombs } = intactItems(fighter, state.destroyedItems);
  const dice = await critDice("2d6");
  const crit = resolveFighterCrit(dice.next, {
    hasWeapon: loc => weaponsIn(loc).some(w => !w.system.bomb),
    hasAmmo: () => ammo().length > 0,
    hasBomb: () => bombs().length > 0,
    avionicsHits: state.crits.avionics,
    engineHits: state.crits.engine
  });
  rolls.push(...dice.used());
  const prefix = t("MWD.Mech.Crit.Hit", { location: locLabel(location), roll: check.total });
  if ( !crit ) {
    lines.push(t("MWD.Mech.Crit.None", { location: locLabel(location), roll: check.total }));
    return;
  }
  switch ( crit.effect ) {
    case "weapon": {
      const weapon = weaponsIn(crit.location).find(w => !w.system.bomb);
      state.destroyedItems.add(weapon.id);
      lines.push(`${prefix} ${t("MWD.Mech.Crit.Weapon", { weapon: weapon.name })}`);
      break;
    }
    case "avionics":
      state.crits.avionics = 1;
      state.pilotingTest = true;
      lines.push(`${prefix} ${t("MWD.Fighter.Crit.Avionics")}`);
      break;
    case "fuel": {
      const r = await roll("2d6");
      rolls.push(r.roll);
      const boom = r.total >= FUEL_EXPLOSION;
      if ( boom ) state.destroyed = true;
      lines.push(`${prefix} ${t(boom ? "MWD.Fighter.Crit.FuelExploded" : "MWD.Fighter.Crit.FuelHeld", { roll: r.total })}`);
      break;
    }
    case "engine":
      state.crits.engine += 1;
      state.crits.engineFresh = true;
      if ( state.crits.engine >= 2 ) state.destroyed = true;
      lines.push(`${prefix} ${t(state.crits.engine >= 2 ? "MWD.Mech.Crit.EngineDestroyed" : "MWD.Fighter.Crit.Engine")}`);
      break;
    case "ammo":
      for ( const bin of ammo() ) state.destroyedItems.add(bin.id);
      state.destroyed = true;
      lines.push(`${prefix} ${t("MWD.Fighter.Crit.Ammo")}`);
      break;
    case "bomb": {
      const bomb = bombs()[0];
      state.destroyedItems.add(bomb.id);
      lines.push(`${prefix} ${t("MWD.Fighter.Crit.Bomb", { weapon: bomb.name })}`);
      break;
    }
    case "cockpit":
      state.pilotHits += 1;
      lines.push(`${prefix} ${t("MWD.Fighter.Crit.Cockpit")}`);
      break;
  }
}

/**
 * End of a fighter's Narration (p. 47–49): CON Checks, engine heat, cooling down and Heat rolls; an
 * out-of-control fighter's pilot tries to regain control.
 * @param {Actor} fighter
 */
export async function endFighterNarration(fighter) {
  await crewConChecks(fighter);
  const crits = fighter.system.crits;
  let exploded = false;
  const upkeep = await heatUpkeep(fighter, {
    engineHeat: fighterEngineHeat({ engineHits: crits.engine, fresh: crits.engineFresh }),
    explode: async lines => {
      lines.push(t("MWD.Fighter.Crit.Ammo"));
      exploded = true;
    }
  });
  if ( exploded ) upkeep.updates["system.status.destroyed"] = true;
  await fighter.update({ ...upkeep.updates, "system.crits.engineFresh": false });
  const message = await postNarrationCard(fighter, upkeep.lines, upkeep.rolls);
  await hurtCrew(fighter, CREW_HIT_DAMAGE * upkeep.pilotHits, { pilotOnly: true });
  if ( fighter.system.status.outOfControl && !fighter.system.status.destroyed && getPilot(fighter) ) {
    await rollPilotingTest(fighter, {
      label: t("MWD.Fighter.RegainControl"),
      successEffect: { kind: "regainControl", mechUuid: fighter.uuid, source: t("MWD.Fighter.RegainControl") }
    });
  }
  return message;
}
