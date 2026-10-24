import { SYSTEM_ID } from "../config.mjs";
import { accumulateSmallArms, hitTypeOptions, indirectPersonalDamage, weaponDamageTypes } from "../rules/mixed.mjs";
import { resolveState, rollTest, updateCard } from "../dice/test-roll.mjs";
import { executeAsGM } from "../socket.mjs";
import { postDamageCard, t, warn } from "./unit.mjs";

/**
 * Mixed-scale combat (p. 65–66): 'Mech-Scale weapons against people on foot, and people wearing
 * down 'Mech-Scale units 20 damage at a time.
 */

/**
 * Whether a person counts as a player character for Plot Point spending.
 * @param {Actor} person
 */
function isPlayerCharacter(person) {
  return (person?.type === "character") && person.hasPlayerOwner;
}

/**
 * After a 'Mech-Scale weapon hits a person, roll the attack again with the same modifiers: success
 * is a direct hit, failure an indirect hit (p. 65).
 * @param {object} state  The stored state of the hitting attack card.
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollHitType(state) {
  const attacker = await fromUuid(state.actorUuid);
  const target = await fromUuid(state.targetUuid);
  if ( !attacker || !target ) return null;
  const damage = state.damage;
  const speaker = damage.attackerUuid ? await fromUuid(damage.attackerUuid) : attacker;
  return rollTest(attacker, {
    kind: "attack",
    label: t("MWD.Mixed.HitTypeTitle", { source: damage.source }),
    parts: state.parts,
    dice: 2,
    target,
    speaker,
    untrained: state.untrained,
    opposingLabel: state.opposingLabel,
    opposingParts: state.opposingParts,
    damage: { ...damage, kind: "hitType", applyOn: "always", playerCharacter: isPlayerCharacter(target) }
  });
}

/**
 * The hit type a hit-type card ends with: direct, indirect, or none when avoided with Plot Points.
 * @param {object} state
 * @param {boolean} success  Whether the second attack roll succeeded.
 * @returns {"direct"|"indirect"|"none"}
 */
export function effectiveHit(state, success) {
  return state.hitOverride ?? (success ? "direct" : "indirect");
}

/**
 * Template data for the Plot Point buttons of a hit-type card.
 * @param {object} state
 * @param {boolean} success
 */
export function hitTypeContext(state, success) {
  const hit = effectiveHit(state, success);
  const options = (state.hitOverride || state.applied) ? []
    : hitTypeOptions(hit, !!state.damage.playerCharacter).map(o => ({
      ...o, label: t(`MWD.Mixed.Option.${hit}.${o.key}`, { n: o.cost })
    }));
  return {
    hitType: hit,
    hitTypeLabel: t(`MWD.Mixed.Hit.${hit}`),
    hitTypeOptions: options,
    indirectDamage: indirectPersonalDamage(state.damage)
  };
}

/**
 * Spend Plot Points to downgrade or avoid a 'Mech-Scale hit (p. 65). Players spend their
 * character's points, which go to the GM pool; the GM spends from the pool for NPCs.
 * @param {ChatMessage} message
 * @param {"avoid"|"downgrade"} key
 */
export async function spendOnHit(message, key) {
  const state = foundry.utils.deepClone(message.getFlag(SYSTEM_ID, "test"));
  if ( state.hitOverride || state.applied ) return;
  const success = resolveState(state).success;
  const hit = effectiveHit(state, success);
  const option = hitTypeOptions(hit, !!state.damage.playerCharacter).find(o => o.key === key);
  if ( !option ) return;

  const target = await fromUuid(state.targetUuid);
  if ( state.damage.playerCharacter ) {
    const pp = target?.system.plotPoints?.value ?? 0;
    if ( !target?.isOwner || (pp < option.cost) ) return warn("MWD.PlotPoints.NoneLeft");
    await target.update({ "system.plotPoints.value": pp - option.cost });
    await executeAsGM("adjustGmPool", { delta: option.cost });
  }
  else {
    if ( !game.user.isGM ) return;
    const pool = game.settings.get(SYSTEM_ID, "gmPlotPoints");
    if ( pool < option.cost ) return warn("MWD.PlotPoints.NoneLeft");
    await game.settings.set(SYSTEM_ID, "gmPlotPoints", pool - option.cost);
  }
  state.hitOverride = ((hit === "direct") && (key === "downgrade")) ? "indirect" : "none";
  return updateCard(message, state);
}

/**
 * Apply a hit-type card: a direct hit kills outright, an indirect hit deals its group damage × 10
 * through the target's armor (p. 66).
 * @param {object} state
 * @param {Actor} target
 * @param {boolean} success
 */
export async function applyHitType(state, target, success) {
  const hit = effectiveHit(state, success);
  if ( hit === "none" ) return null;
  if ( hit === "direct" ) return target.killInAction(state.damage.source);
  const types = weaponDamageTypes(state.damage.types);
  const type = types.length ? types[Math.floor(Math.random() * types.length)] : "";
  return target.applyPersonalDamage({ value: indirectPersonalDamage(state.damage), type }, {
    source: t("MWD.Mixed.IndirectSource", { source: state.damage.source })
  });
}

/**
 * A person's hit on a 'Mech-Scale unit (p. 66): the damage adds to a running total, and at 20 the
 * unit takes 1 point of 'Mech-Scale damage at a random location.
 * @param {Actor} unit
 * @param {{value: number, source?: string}} damage
 * @returns {Promise<ChatMessage>}
 */
export async function applySmallArms(unit, damage) {
  const before = unit.system.smallArms;
  const result = accumulateSmallArms(before, damage.value);
  await unit.update({ "system.smallArms": result.total });
  const line = t("MWD.Mixed.SmallArmsTotal", { before, add: damage.value, total: before + damage.value });
  if ( !result.mechDamage ) return postDamageCard(unit, { damage, lines: [line, t("MWD.Mixed.SmallArmsNoDamage")], rolls: [] });
  return unit.applyUnitHit({ base: result.mechDamage, table: "standard", source: `${damage.source ?? ""} · ${line}` });
}
