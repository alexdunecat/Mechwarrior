import { MECH_LOCATIONS, PILOT_HIT_DAMAGE, SYSTEM_ID } from "../config.mjs";
import { damageLocation, hitLocation, resolveCrit } from "../rules/mech.mjs";
import { executeAsGM } from "../socket.mjs";
import {
  canAct, critCheck, critDice, crewConChecks, damageGroups, destroyLocationItems, getPilot, heatUpkeep, hurtCrew,
  intactItems, locLabel, postDamageCard, postNarrationCard, roll, rollPilotingTest, t, warn
} from "./unit.mjs";

/**
 * BattleMech damage, falls, jumping and Heat (p. 38–51). Shared 'Mech-Scale Combat lives in unit.mjs.
 */

/* -------------------------------------------- */
/*  Damage                                      */
/* -------------------------------------------- */

/**
 * Resolve a 'Mech-Scale hit on a 'Mech (p. 43–47): hit locations, Missile dice, Armor and
 * Structure, critical hits, destroyed locations and MechWarrior damage. Posts a damage card.
 * @param {Actor} mech
 * @param {import("./unit.mjs").MechDamage} damage
 * @returns {Promise<ChatMessage|null>}
 */
export async function applyMechHit(mech, damage) {
  const system = mech.system;
  const lines = [];
  const rolls = [];
  const notes = new Set();

  if ( damage.heatInstead ) {
    await mech.update({ "system.heat.value": system.heat.value + damage.base });
    lines.push(t("MWD.Mech.Damage.HeatTokens", { n: damage.base }));
    return postDamageCard(mech, { damage, lines, rolls, notes });
  }

  const groups = await damageGroups(damage, lines, rolls);
  const state = {
    locations: foundry.utils.deepClone(system._source.locations),
    crits: { ...system._source.crits },
    destroyedItems: new Set(),
    destroyed: system.status.destroyed,
    pilotHits: 0,
    fall: false,
    pilotingTest: false
  };
  let pendingHead = 0;

  for ( const amount of groups ) {
    let location = damage.location;
    let critChance = false;
    if ( !location ) {
      const r = await roll(damage.table === "kick" ? "1d6" : "2d6");
      rolls.push(r.roll);
      const hit = hitLocation(r.total, damage.table);
      location = hit.location;
      critChance = hit.critChance;
      if ( damage.ignoreLegs && MECH_LOCATIONS[location].leg ) {
        lines.push(t("MWD.Mech.Damage.CoverIgnored", { roll: r.total, location: locLabel(location) }));
        continue;
      }
      lines.push(t("MWD.Mech.Damage.Location", { roll: r.total, location: locLabel(location), n: amount }));
    }
    let points = amount;
    if ( location === "head" ) {
      if ( !damage.noPilotHit ) state.pilotHits += 1;
      if ( !damage.primary && !damage.location && (amount > 1) ) {
        pendingHead += amount - 1;
        points = 1;
        lines.push(t("MWD.Mech.Damage.Glancing"));
      }
    }
    await applyToLocation(mech, state, location, points, critChance, lines, rolls);
    if ( state.destroyed ) break;
  }
  return finishDamage(mech, state, { damage, lines, rolls, notes, pendingHead });
}

/**
 * Damage one location and roll any critical hits it causes.
 */
async function applyToLocation(mech, state, location, points, critChance, lines, rolls) {
  const result = damageLocation(state.locations, location, points);
  state.locations = result.locations;
  for ( const step of result.steps ) {
    lines.push(t("MWD.Mech.Damage.Step", {
      location: locLabel(step.location), armor: step.armor, structure: step.structure
    }) + (step.destroyed ? ` ${t("MWD.Mech.Damage.LocationDestroyed")}` : ""));
  }
  for ( const loc of result.destroyed ) destroyLocationItems(mech, state.destroyedItems, loc);
  if ( result.mechDestroyed ) state.destroyed = true;
  if ( result.destroyed.some(l => MECH_LOCATIONS[l].leg) ) state.fall = true;

  const critLocations = [...result.structureHit];
  if ( critChance && !critLocations.includes(location) ) critLocations.push(location);
  for ( const loc of critLocations ) {
    if ( state.destroyed ) break;
    const check = await critCheck(rolls);
    if ( !check.crit ) {
      lines.push(t("MWD.Mech.Crit.NoCrit", { location: locLabel(loc), roll: check.total }));
      continue;
    }
    await applyCrit(mech, state, loc, check.total, lines, rolls);
  }
}

/** Roll and apply a critical hit in a location. */
async function applyCrit(mech, state, location, checkRoll, lines, rolls) {
  const { weaponsIn, ammo } = intactItems(mech, state.destroyedItems);
  const dice = await critDice("1d6");
  const crit = resolveCrit(location, dice.next, {
    hasAmmo: loc => ammo(loc).length > 0,
    hasWeapon: loc => weaponsIn(loc).length > 0,
    gyroHits: state.crits.gyro,
    engineHits: state.crits.engine
  });
  rolls.push(...dice.used());
  if ( !crit ) {
    lines.push(t("MWD.Mech.Crit.None", { location: locLabel(location), roll: checkRoll }));
    return;
  }
  const where = locLabel(crit.location);
  const prefix = t("MWD.Mech.Crit.Hit", { location: where, roll: checkRoll });
  switch ( crit.effect ) {
    case "weapon": {
      const weapon = weaponsIn(crit.location)[0];
      state.destroyedItems.add(weapon.id);
      lines.push(`${prefix} ${t("MWD.Mech.Crit.Weapon", { weapon: weapon.name })}`);
      break;
    }
    case "ammo": {
      for ( const bin of ammo(crit.location) ) state.destroyedItems.add(bin.id);
      state.pilotHits += 1;
      if ( crit.location === "torso" ) {
        state.destroyed = true;
        lines.push(`${prefix} ${t("MWD.Mech.Crit.AmmoTorso")}`);
      }
      else {
        const loc = state.locations[crit.location];
        loc.armorDamage = loc.armor;
        loc.structureDamage = loc.structure;
        destroyLocationItems(mech, state.destroyedItems, crit.location);
        if ( MECH_LOCATIONS[crit.location].leg ) state.fall = true;
        lines.push(`${prefix} ${t("MWD.Mech.Crit.AmmoLimb", { location: where })}`);
      }
      break;
    }
    case "gyro":
      state.crits.gyro += 1;
      if ( state.crits.gyro >= 2 ) state.fall = true;
      else state.pilotingTest = true;
      lines.push(`${prefix} ${t(state.crits.gyro >= 2 ? "MWD.Mech.Crit.GyroDestroyed" : "MWD.Mech.Crit.Gyro")}`);
      break;
    case "engine":
      state.crits.engine += 1;
      if ( state.crits.engine >= 2 ) state.destroyed = true;
      lines.push(`${prefix} ${t(state.crits.engine >= 2 ? "MWD.Mech.Crit.EngineDestroyed" : "MWD.Mech.Crit.Engine")}`);
      break;
    case "movement":
      state.crits.legs += 1;
      state.pilotingTest = true;
      lines.push(`${prefix} ${t("MWD.Mech.Crit.Leg")}`);
      break;
  }
}

/** Save the results of a hit, hurt the pilot and post the card. */
async function finishDamage(mech, state, { damage, lines, rolls, notes, pendingHead }) {
  await mech.update({
    "system.locations": state.locations,
    "system.crits": state.crits,
    "system.status.destroyed": state.destroyed
  });
  const itemUpdates = [...state.destroyedItems].map(_id => ({ _id, "system.destroyed": true }));
  if ( itemUpdates.length ) await mech.updateEmbeddedDocuments("Item", itemUpdates);

  if ( state.destroyed ) notes.add("MWD.Mech.Damage.MechDestroyed");
  else {
    if ( state.fall ) notes.add("MWD.Mech.Damage.Falls");
    if ( state.pilotingTest ) notes.add("MWD.Mech.Damage.PilotingTest");
  }
  const message = await postDamageCard(mech, {
    damage, lines, rolls, notes, pendingHead, fall: state.fall && !state.destroyed,
    pilotingTest: state.pilotingTest && !state.fall && !state.destroyed
  });
  await hurtCrew(mech, PILOT_HIT_DAMAGE * state.pilotHits, { pilotOnly: true });
  return message;
}

/**
 * Spend a Plot Point so a head hit deals full damage (p. 45). A player spends their own;
 * the GM spends from the GM pool.
 * @param {ChatMessage} message  A 'Mech damage card with a pending head hit.
 */
export async function buyFullHeadHit(message) {
  const flag = message.getFlag(SYSTEM_ID, "mechDamage");
  if ( !flag?.pendingHead ) return;
  const mech = await fromUuid(flag.mechUuid);
  if ( !mech ) return;
  if ( game.user.isGM ) {
    const pool = game.settings.get(SYSTEM_ID, "gmPlotPoints");
    if ( pool < 1 ) return warn("MWD.PlotPoints.NoneLeft");
    await game.settings.set(SYSTEM_ID, "gmPlotPoints", pool - 1);
  }
  else {
    const attacker = flag.attackerUuid ? await fromUuid(flag.attackerUuid) : null;
    const pilot = attacker ? getPilot(attacker) : game.user.character;
    const pp = pilot?.system.plotPoints?.value ?? 0;
    if ( !pilot?.isOwner || (pp < 1) ) return warn("MWD.PlotPoints.NoneLeft");
    await pilot.update({ "system.plotPoints.value": pp - 1 });
    await executeAsGM("adjustGmPool", { delta: 1 });
  }
  const update = { [`flags.${SYSTEM_ID}.mechDamage.pendingHead`]: 0 };
  if ( message.isOwner ) await message.update(update);
  else await executeAsGM("updateMessage", { messageId: message.id, update });
  return applyMechHit(mech, {
    base: flag.pendingHead, location: "head", primary: true, noPilotHit: true,
    source: t("MWD.Mech.Damage.FullHead", { source: flag.source }), attackerUuid: flag.attackerUuid
  });
}

/* -------------------------------------------- */
/*  Falls and jumping                           */
/* -------------------------------------------- */

/**
 * A 'Mech falls (p. 49): its Punch damage to a random location, it is prone, and the pilot makes a
 * Piloting Test or takes 3 Physical damage and a CON Check.
 * @param {Actor} mech
 */
export async function resolveFall(mech) {
  const damage = Math.ceil(mech.system.details.tonnage / 30);
  await mech.update({ "system.status.prone": true });
  await applyMechHit(mech, { base: damage, table: "standard", source: t("MWD.Mech.Fall.Title") });
  if ( mech.system.status.destroyed ) return null;
  return rollPilotingTest(mech, { consequence: false, pilotDamageOnFailure: true, label: t("MWD.Mech.Fall.PilotTest") });
}

/**
 * Jump (p. 39–40): costs 1 Heat token and marks the 'Mech as having jumped until its next Narration.
 * @param {Actor} mech
 */
export async function jump(mech) {
  if ( !mech.system.details.jumpJets ) return warn("MWD.Mech.Warn.NoJumpJets");
  if ( !canAct(mech, getPilot(mech)) ) return;
  return mech.update({ "system.status.jumped": true, "system.heat.value": mech.system.heat.value + 1 });
}

/* -------------------------------------------- */
/*  Narration upkeep                            */
/* -------------------------------------------- */

/**
 * End of a 'Mech's Narration (p. 38, 47–48): CON Check for an unconscious pilot, engine heat,
 * cooling down, shutdown and ammo explosion avoidance rolls, and restarting a shut-down engine.
 * @param {Actor} mech
 * @returns {Promise<ChatMessage>}
 */
export async function endNarration(mech) {
  await crewConChecks(mech);
  const upkeep = await heatUpkeep(mech, {
    engineHeat: mech.system.crits.engine ? 1 : 0,
    explode: lines => explodeAmmo(mech, lines)
  });
  await mech.update(upkeep.updates);
  const message = await postNarrationCard(mech, upkeep.lines, upkeep.rolls);
  await hurtCrew(mech, PILOT_HIT_DAMAGE * upkeep.pilotHits, { pilotOnly: true });
  return message;
}

/** Ammo explosion from heat (p. 48): the same effect as an ammo critical hit in that location. */
async function explodeAmmo(mech, lines) {
  const ammo = mech.itemTypes.mechEquipment.find(e => (e.system.kind === "ammo") && !e.system.destroyed);
  if ( !ammo ) return;
  const location = ammo.system.location || "torso";
  const updates = { [`system.locations.${location}.armorDamage`]: mech.system.locations[location].armor,
    [`system.locations.${location}.structureDamage`]: mech.system.locations[location].structure };
  if ( !MECH_LOCATIONS[location]?.limb ) updates["system.status.destroyed"] = true;
  if ( MECH_LOCATIONS[location]?.leg ) lines.push(t("MWD.Mech.Damage.Falls"));
  lines.push(t(MECH_LOCATIONS[location]?.limb ? "MWD.Mech.Crit.AmmoLimb" : "MWD.Mech.Crit.AmmoTorso", { location: locLabel(location) }));
  await mech.update(updates);
  const lost = new Set();
  destroyLocationItems(mech, lost, location);
  if ( lost.size ) await mech.updateEmbeddedDocuments("Item", [...lost].map(_id => ({ _id, "system.destroyed": true })));
}

/* -------------------------------------------- */
/*  Chat                                        */
/* -------------------------------------------- */

/**
 * Wire up the buttons on unit damage cards.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function onRenderMechCard(message, html) {
  const flag = message.getFlag(SYSTEM_ID, "mechDamage");
  if ( !flag ) return;
  const unit = fromUuidSync(flag.mechUuid);
  const attacker = flag.attackerUuid ? fromUuidSync(flag.attackerUuid) : null;
  const attackerPilot = attacker ? getPilot(attacker) : null;
  const bind = (selector, allowed, handler) => {
    const el = html.querySelector(selector);
    if ( !el ) return;
    if ( !allowed ) {
      el.remove();
      return;
    }
    for ( const button of el.querySelectorAll("button") ) {
      button.addEventListener("click", event => {
        event.preventDefault();
        button.disabled = true;
        handler();
      });
    }
  };
  bind(".mwd-head-controls", (flag.pendingHead > 0) && (game.user.isGM || !!attackerPilot?.isOwner),
    () => buyFullHeadHit(message));
  bind(".mwd-fall-controls", !!unit?.isOwner, () => unit.resolveFall());
  bind(".mwd-piloting-controls", !!unit?.isOwner, () => unit.rollPilotingTest());
}
