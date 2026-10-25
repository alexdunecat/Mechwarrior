import {
  ATTRIBUTES, DIFFICULTIES, DISENGAGED_TARGET, MIXED_LARGE_TARGET, PLOT_POINTS, SKILLS, SYSTEM_ID
} from "../config.mjs";
import { kiaDice } from "../rules/condition.mjs";
import { resolvePersonalDamage } from "../rules/damage.mjs";
import { rangeModifier } from "../rules/tests.mjs";
import { applyDefaultMode, rollTest } from "../dice/test-roll.mjs";
import * as Fighter from "./fighter.mjs";
import { skillItemData } from "./item-data.mjs";
import * as Mech from "./mech.mjs";
import * as Mixed from "./mixed.mjs";
import * as Unit from "./unit.mjs";
import * as Vehicle from "./vehicle.mjs";

const DIALOG_TEMPLATE = `systems/${SYSTEM_ID}/templates/dialog/test-dialog.hbs`;
const ATTACK_TEMPLATE = `systems/${SYSTEM_ID}/templates/dialog/attack-dialog.hbs`;

/**
 * Actor document for MechWarrior: Destiny.
 */
export class MWDActor extends Actor {

  /** @override */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user);
    if ( allowed === false ) return false;
    const pp = foundry.utils.getProperty(changes, "system.plotPoints.value");
    if ( pp !== undefined ) {
      foundry.utils.setProperty(changes, "system.plotPoints.value", Math.clamp(pp, 0, PLOT_POINTS.playerMax));
    }
  }

  /* -------------------------------------------- */

  /** Whether this actor is a person (character or NPC) who makes Tests. */
  get isPerson() {
    return ["character", "npc"].includes(this.type);
  }

  /** Whether this actor has a Condition Monitor: a person, or a unit's built-in crew in the seat. */
  get canBeInjured() {
    return this.isPerson || Unit.usesBuiltInCrew(this);
  }

  /**
   * Option value used by the test dialog for an attribute-only Test.
   * @type {string}
   */
  static ATTRIBUTE_SOURCE = "attributes";

  /* -------------------------------------------- */

  /**
   * Open the Test dialog and roll.
   * @param {object} [preset]
   * @param {string} [preset.source]      An owned skill id, "untrained:<key>" or "attributes".
   * @param {string} [preset.attribute]   First attribute for attribute-only Tests.
   * @param {string} [preset.attribute2]  Second attribute for attribute-only Tests.
   * @returns {Promise<ChatMessage|null>}
   */
  async rollTest(preset = {}) {
    if ( !this.isPerson ) return null;
    const skills = [...this.itemTypes.skill].sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    const owned = new Set(skills.map(s => s.system.key));
    const untrained = Object.entries(SKILLS)
      .filter(([key, cfg]) => !owned.has(key) || cfg.specialty || cfg.subject)
      .map(([key, cfg]) => ({
        value: `untrained:${key}`,
        label: `${game.i18n.localize(`MWD.Skill.${key}`)} (${game.i18n.localize(ATTRIBUTES[cfg.attribute].abbr)})`
      }))
      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

    const firstAttribute = preset.attribute ?? "rfl";
    const context = {
      source: preset.source ?? (skills[0]?.id ?? this.constructor.ATTRIBUTE_SOURCE),
      skills: skills.map(s => ({ value: s.id, label: `${s.name} (+${s.system.bonus})` })),
      untrained,
      attributeSource: this.constructor.ATTRIBUTE_SOURCE,
      attributes: Object.entries(ATTRIBUTES).map(([key, cfg]) => ({
        value: key, label: `${game.i18n.localize(cfg.label)} (${this.system.attributes[key].total})`
      })),
      attribute: firstAttribute,
      attribute2: preset.attribute2 ?? firstAttribute,
      difficulties: Object.entries(DIFFICULTIES).map(([key, cfg]) => ({
        value: key, label: `${game.i18n.localize(cfg.label)} (${cfg.dice}D6)`
      })),
      difficulty: preset.difficulty ?? "average",
      traits: this.itemTypes.trait.filter(t => t.system.modifier !== 0).map(t => ({
        id: t.id, name: t.name, modifier: t.system.modifier, appliesTo: t.system.appliesTo
      })),
      woundModifier: this.system.woundModifier
    };

    const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATE, context);
    const data = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.format("MWD.Test.Title", { name: this.name }), icon: "fa-solid fa-dice" },
      classes: [SYSTEM_ID, "mwd-dialog"],
      position: { width: 420 },
      content,
      buttons: [{
        action: "roll",
        label: "MWD.Test.Roll",
        icon: "fa-solid fa-dice-d6",
        default: true,
        callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      }, {
        action: "cancel",
        label: "Cancel",
        icon: "fa-solid fa-xmark"
      }],
      rejectClose: false
    });
    if ( !data || (data === "cancel") ) return null;
    return rollTest(this, this._buildTestConfig(data));
  }

  /* -------------------------------------------- */

  /**
   * Turn submitted dialog data into a roll configuration.
   * @param {object} data
   * @returns {import("../dice/test-roll.mjs").TestConfig}
   * @protected
   */
  _buildTestConfig(data) {
    const attrs = this.system.attributes;
    const attrLabel = key => game.i18n.localize(ATTRIBUTES[key].abbr);
    const parts = [];
    let label;
    let untrained = false;

    if ( data.source === this.constructor.ATTRIBUTE_SOURCE ) {
      label = `${attrLabel(data.attribute)} + ${attrLabel(data.attribute2)}`;
      parts.push({ label: attrLabel(data.attribute), value: attrs[data.attribute].total });
      parts.push({ label: attrLabel(data.attribute2), value: attrs[data.attribute2].total });
    }
    else if ( data.source?.startsWith("untrained:") ) {
      const key = data.source.slice("untrained:".length);
      const attribute = SKILLS[key].attribute;
      untrained = true;
      label = game.i18n.format("MWD.Test.UntrainedLabel", { skill: game.i18n.localize(`MWD.Skill.${key}`) });
      parts.push({ label: attrLabel(attribute), value: attrs[attribute].total });
    }
    else {
      const skill = this.items.get(data.source);
      label = skill.name;
      parts.push({ label: game.i18n.localize("MWD.Skill.Rank"), value: skill.system.rank });
      parts.push({ label: attrLabel(skill.system.attribute), value: skill.system.attributeValue });
    }

    const modifier = Number(data.modifier) || 0;
    if ( modifier ) parts.push({ label: game.i18n.localize("MWD.Test.Modifier"), value: modifier });
    const helpers = Number(data.helpers) || 0;
    if ( helpers ) parts.push({ label: game.i18n.localize("MWD.Test.Helpers"), value: helpers });
    for ( const trait of this.itemTypes.trait ) {
      if ( data[`trait.${trait.id}`] || data.trait?.[trait.id] ) parts.push({ label: trait.name, value: trait.system.modifier });
    }
    if ( this.system.woundModifier ) {
      parts.push({ label: game.i18n.localize("MWD.Condition.Wounds"), value: this.system.woundModifier });
    }
    return { label, parts, difficulty: data.difficulty, untrained };
  }

  /* -------------------------------------------- */

  /**
   * Roll a Test with an owned skill without opening the dialog's source picker.
   * @param {Item} skill
   */
  async rollSkill(skill) {
    return this.rollTest({ source: skill.id });
  }

  /**
   * Attribute-only Test, e.g. RFL + RFL (p. 33).
   * @param {string} attribute
   */
  async rollAttribute(attribute) {
    return this.rollTest({ source: this.constructor.ATTRIBUTE_SOURCE, attribute, attribute2: attribute });
  }

  /* -------------------------------------------- */

  /**
   * Killed in Action Test (p. 37): EDG + EDG with no modifiers, starting Easy and getting harder
   * each time. Records that a check was made.
   */
  async rollKiaCheck() {
    const physical = this.system.condition.physical;
    // A unit's built-in crew is an NPC with the lowest EDG.
    const edg = this.system.attributes?.edg.total ?? 1;
    const abbr = game.i18n.localize(ATTRIBUTES.edg.abbr);
    const dice = kiaDice(physical.kiaChecks);
    await this.update({ "system.condition.physical.kiaChecks": physical.kiaChecks + 1 });
    return rollTest(this, {
      kind: "kia",
      label: game.i18n.localize("MWD.Condition.KiaTest"),
      parts: [{ label: abbr, value: edg }, { label: abbr, value: edg }],
      dice,
      difficulty: Object.entries(DIFFICULTIES).find(([, cfg]) => cfg.dice === dice)?.[0] ?? null
    });
  }

  /**
   * Consciousness Check (p. 47): a raw 2D6 roll, no modifiers, against the CON number of the
   * deepest completely filled Physical row (11 once Staggered). Failing knocks the character out;
   * a Plot Point can add WIL afterwards ("Fight through it").
   * @returns {Promise<ChatMessage|null>}
   */
  async rollConCheck() {
    const target = this.system.condition.physical.track.conCheck;
    if ( !target ) {
      ui.notifications.info("MWD.Con.NotNeeded", { localize: true });
      return null;
    }
    const label = game.i18n.format("MWD.Con.Label", { n: target });
    return rollTest(this, {
      kind: "con",
      label: game.i18n.localize("MWD.Con.Title"),
      parts: [],
      dice: 0,
      opposingLabel: label,
      opposingParts: [{ label, value: target }]
    });
  }

  /* -------------------------------------------- */

  /**
   * Create a skill from the book's Skills List.
   * @param {object} options
   * @param {string} options.key
   * @param {number} [options.rank=1]
   * @param {string} [options.specialty=""]
   * @param {string} [options.subject=""]
   */
  async addSkill({ key, rank = 1, specialty = "", subject = "" }) {
    const data = skillItemData({ key, rank, specialty, subject });
    if ( !data ) return null;
    const [item] = await this.createEmbeddedDocuments("Item", [data]);
    return item;
  }

  /* -------------------------------------------- */
  /*  Personal Combat                             */
  /* -------------------------------------------- */

  /**
   * The best owned skill for a Skills List key, if any.
   * @param {string} key
   * @param {string|null} [specialty]  For Gunnery and Piloting: "mech", "vehicle" or "aero". Skills
   *   without a recorded specialty count for any.
   * @returns {Item|null}
   */
  findSkill(key, specialty = null) {
    const skills = this.itemTypes.skill.filter(s => (s.system.key === key)
      && (!specialty || !s.system.specialty || (s.system.specialty === specialty)));
    return skills.sort((a, b) => b.system.bonus - a.system.bonus)[0] ?? null;
  }

  /**
   * Bonus breakdown for defending in Personal Combat: RFL + RFL plus wounds (p. 34).
   * @param {number} [modifier=0]  Situational modifier for the defender.
   * @returns {{label: string, value: number}[]}
   */
  getDefenseParts(modifier = 0) {
    const rfl = this.system.attributes.rfl.total;
    const abbr = game.i18n.localize(ATTRIBUTES.rfl.abbr);
    const parts = [{ label: abbr, value: rfl }, { label: abbr, value: rfl }];
    if ( modifier ) parts.push({ label: game.i18n.localize("MWD.Test.Modifier"), value: modifier });
    if ( this.system.woundModifier ) {
      parts.push({ label: game.i18n.localize("MWD.Condition.Wounds"), value: this.system.woundModifier });
    }
    return parts;
  }

  /**
   * Attack with a personal weapon (p. 34): 2D6 + attack skill + attribute vs the target's 2D6 + RFL + RFL.
   * One card is rolled per targeted token; with no target the defence bonus is entered by hand.
   * @param {Item} weapon
   * @returns {Promise<ChatMessage[]>}
   */
  async rollAttack(weapon) {
    const targeted = Array.from(game.user.targets).map(t => t.actor).filter(a => a && (a !== this));
    const targets = targeted.filter(a => a.isPerson);
    const units = targeted.filter(a => a.isUnit);
    const unitDefense = (unit, mod = 0) => {
      const parts = Unit.unitParts(unit, "piloting").parts;
      if ( mod ) parts.push({ label: game.i18n.localize("MWD.Test.Modifier"), value: mod });
      return parts;
    };
    const skillKey = weapon.system.skill;
    const skill = this.findSkill(skillKey);
    const ranges = Object.fromEntries(["close", "near", "far"].map(r => [r, rangeModifier(weapon.system.effectiveRanges[r])]));
    const context = {
      weapon,
      targets: [
        ...targets.map(t => ({ name: t.name, defense: t.getDefenseParts().reduce((n, p) => n + p.value, 0) })),
        ...units.map(u => ({ name: u.name, defense: unitDefense(u).reduce((n, p) => n + p.value, 0) }))
      ],
      skillLabel: skill ? `${skill.name} (${skill.system.bonus >= 0 ? "+" : ""}${skill.system.bonus})`
        : game.i18n.format("MWD.Test.UntrainedLabel", { skill: game.i18n.localize(`MWD.Skill.${skillKey}`) }),
      ranges: Object.entries(ranges).map(([key, mod]) => ({
        value: key,
        label: `${game.i18n.localize(`MWD.Range.${key}`)} (${mod === null ? "—" : (mod === 0 ? "OK" : mod)})`,
        disabled: mod === null
      })),
      range: Object.entries(ranges).find(([, mod]) => mod !== null)?.[0] ?? "close",
      traits: this.itemTypes.trait.filter(t => t.system.modifier !== 0).map(t => ({
        id: t.id, name: t.name, modifier: t.system.modifier, appliesTo: t.system.appliesTo
      })),
      woundModifier: this.system.woundModifier
    };
    const content = await foundry.applications.handlebars.renderTemplate(ATTACK_TEMPLATE, context);
    const data = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.format("MWD.Attack.Title", { weapon: weapon.name }), icon: "fa-solid fa-crosshairs" },
      classes: [SYSTEM_ID, "mwd-dialog"],
      position: { width: 420 },
      content,
      buttons: [{
        action: "attack",
        label: "MWD.Attack.Roll",
        icon: "fa-solid fa-crosshairs",
        default: true,
        callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      }],
      rejectClose: false
    });
    if ( !data || (data === "attack") ) return [];

    const rangeMod = ranges[data.range];
    if ( rangeMod === null ) {
      ui.notifications.warn("MWD.Attack.OutOfRange", { localize: true });
      return [];
    }
    const parts = this._attackParts(skill, skillKey, rangeMod, { ...data, accuracy: weapon.system.mods.accuracy });
    const damage = {
      value: weapon.system.totalDamage,
      type: weapon.system.damageType,
      fatigue: weapon.system.fatigue,
      source: weapon.name
    };
    const label = `${weapon.name} · ${game.i18n.localize(`MWD.Range.${data.range}`)}`;
    const defenseMod = Number(data.defenseModifier) || 0;

    if ( !targets.length && !units.length ) {
      const manual = Number(data.manualDefense) || 0;
      return [await rollTest(this, {
        kind: "attack", label, parts, dice: 2, damage, untrained: !skill,
        opposingLabel: game.i18n.localize("MWD.Attack.Defense"),
        opposingParts: [{ label: game.i18n.localize("MWD.Attack.ManualDefense"), value: manual + defenseMod }]
      })];
    }
    const messages = [];
    for ( const target of targets ) {
      messages.push(await rollTest(this, {
        kind: "attack", label, parts, dice: 2, damage, target, untrained: !skill,
        opposingLabel: game.i18n.format("MWD.Attack.DefenseOf", { name: target.name }),
        opposingParts: target.getDefenseParts(defenseMod)
      }));
    }
    // People against 'Mech-Scale units (p. 66): +2 at Close range, damage adds up 20 at a time.
    for ( const unit of units ) {
      const unitAttackParts = [...parts];
      if ( data.range === "close" ) unitAttackParts.push({ label: game.i18n.localize("MWD.Mixed.LargeTarget"), value: MIXED_LARGE_TARGET });
      messages.push(await rollTest(this, {
        kind: "attack", label, parts: unitAttackParts, dice: 2, untrained: !skill,
        damage: { ...damage, kind: "smallArms" },
        target: unit.pilot, applyTo: unit, targetName: unit.name,
        minNatural: unit.system.status.disengaged ? DISENGAGED_TARGET : 0,
        opposingLabel: game.i18n.format("MWD.Attack.DefenseOf", { name: unit.name }),
        opposingParts: unitDefense(unit, defenseMod)
      }));
    }
    return messages;
  }

  /**
   * @param {Item|null} skill
   * @param {string} skillKey
   * @param {number} rangeMod
   * @param {object} data  Submitted attack dialog data.
   * @returns {{label: string, value: number}[]}
   * @protected
   */
  _attackParts(skill, skillKey, rangeMod, data) {
    const attrLabel = key => game.i18n.localize(ATTRIBUTES[key].abbr);
    const parts = [];
    if ( skill ) {
      parts.push({ label: skill.name, value: skill.system.rank });
      parts.push({ label: attrLabel(skill.system.attribute), value: skill.system.attributeValue });
    }
    else {
      const attribute = SKILLS[skillKey]?.attribute ?? "rfl";
      parts.push({ label: attrLabel(attribute), value: this.system.attributes[attribute].total });
    }
    if ( rangeMod ) parts.push({ label: game.i18n.localize("MWD.Attack.Range"), value: rangeMod });
    const modifier = Number(data.modifier) || 0;
    if ( modifier ) parts.push({ label: game.i18n.localize("MWD.Test.Modifier"), value: modifier });
    // Accuracy cancels one –1 situational modifier (p. 78).
    if ( (modifier < 0) && data.accuracy ) parts.push({ label: game.i18n.localize("MWD.Weapon.Mod.accuracy"), value: 1 });
    for ( const trait of this.itemTypes.trait ) {
      if ( data[`trait.${trait.id}`] ) parts.push({ label: trait.name, value: trait.system.modifier });
    }
    if ( this.system.woundModifier ) {
      parts.push({ label: game.i18n.localize("MWD.Condition.Wounds"), value: this.system.woundModifier });
    }
    return parts;
  }

  /* -------------------------------------------- */

  /**
   * Apply a personal-scale hit (p. 36): armor type reduction, armor pips, then the Condition Monitor.
   * Posts a summary to chat and prompts the KIA Test or reports a knockout when needed.
   * @param {{value: number, type?: string, fatigue?: boolean}} damage
   * @param {object} [options]
   * @param {string} [options.source]  What dealt the damage, for the chat summary.
   * @param {boolean} [options.mechScale=false]  Damage taken in 'Mech-Scale Combat (head hits, ammo
   *   explosions): rolls the CON Check the book requires after any such damage (p. 47).
   * @param {boolean} [options.ignoreArmor=false]  Cockpit injuries ignore personal armor (p. 47).
   * @returns {Promise<object>}  The damage split.
   */
  async applyPersonalDamage(damage, { source, mechScale = false, ignoreArmor = false } = {}) {
    if ( !this.canBeInjured ) return null;
    const system = this.system;
    const wasStaggered = { physical: system.condition.physical.track.staggered, fatigue: system.condition.fatigue.track.staggered };
    const toughness = system.traitEffects.has("toughness") ? 1 : 0;
    const glassJaw = system.traitEffects.has("glassJaw") ? 1 : 0;
    const split = resolvePersonalDamage({ damage: damage.value, type: damage.type, fatigue: damage.fatigue },
      ignoreArmor ? null : system.armor, { toughness, glassJaw });

    if ( split.armor && system.armor ) {
      const armorItem = this.items.get(system.armor.id);
      await armorItem.update({ "system.damage": armorItem.system.damage + split.armor });
    }
    const updates = {};
    if ( split.physical ) updates["system.condition.physical.value"] = system.condition.physical.value + split.physical;
    if ( split.fatigue ) updates["system.condition.fatigue.value"] = system.condition.fatigue.value + split.fatigue;
    if ( !foundry.utils.isEmpty(updates) ) await this.update(updates);

    const kia = (split.physical > 0) && (wasStaggered.physical || this.system.condition.physical.track.beyond);
    const knockedOut = (split.fatigue > 0) && (wasStaggered.fatigue || this.system.condition.fatigue.track.beyond);
    const content = await foundry.applications.handlebars.renderTemplate(
      `systems/${SYSTEM_ID}/templates/chat/damage-card.hbs`, {
        name: this.isUnit ? game.i18n.format("MWD.Crew.NameOf", { name: this.name }) : this.name,
        source, damage, split, kia, knockedOut,
        wounds: this.system.woundModifier,
        staggered: this.system.condition.physical.track.staggered || this.system.condition.fatigue.track.staggered
      });
    await ChatMessage.create(applyDefaultMode({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      flags: { [SYSTEM_ID]: { damage: { actorUuid: this.uuid, kia } } }
    }));
    if ( mechScale && split.physical && !kia ) await this.rollConCheck();
    return split;
  }

  /* -------------------------------------------- */
  /*  Hardware                                    */
  /* -------------------------------------------- */

  /** Whether this actor is a 'Mech-Scale unit ('Mech, combat vehicle or aerospace fighter). */
  get isUnit() {
    return Unit.isUnit(this);
  }

  /**
   * The unit this person is piloting, if any.
   * @type {Actor|null}
   */
  get piloting() {
    if ( !this.isPerson ) return null;
    return game.actors.find(a => a.isUnit && (a.system.pilot === this.uuid)) ?? null;
  }

  /**
   * Take the controls of a unit (a pilot can own several and switch between them). A character
   * leaves any other unit they were piloting and records the machine in their Hardware list; an NPC
   * is a stat line, so the same one may pilot any number of units at once.
   * @param {Actor} unit
   */
  async boardHardware(unit) {
    if ( !this.isPerson || !unit?.isUnit ) return;
    const others = this.type === "npc" ? []
      : game.actors.filter(a => a.isUnit && (a !== unit) && (a.system.pilot === this.uuid));
    for ( const other of others ) await other.update({ "system.pilot": "" });
    await unit.update({ "system.pilot": this.uuid, "system.crew": unit.system.crew.filter(u => u !== this.uuid) });
    if ( (this.type === "character") && !this.system.hardware.includes(unit.uuid) ) {
      await this.update({ "system.hardware": [...this.system.hardware, unit.uuid] });
    }
  }

  /** Leave the unit this person is piloting. */
  async leaveHardware() {
    const unit = this.piloting;
    if ( unit ) await unit.update({ "system.pilot": "" });
  }

  /**
   * Killed in Action outright, e.g. by a direct hit from a 'Mech-Scale weapon (p. 65): no KIA Test
   * or other death-avoidance option applies.
   * @param {string} [source]
   */
  async killInAction(source) {
    if ( !this.canBeInjured ) return null;
    await this.toggleStatusEffect("dead", { active: true, overlay: true });
    return ChatMessage.create(applyDefaultMode({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="mwd-card failure"><header class="mwd-card-header"><h3>${this.name}</h3></header>`
        + `<p>${game.i18n.format("MWD.Mixed.KilledBy", { source: source ?? "" })}</p></div>`
    }));
  }

  /* -------------------------------------------- */
  /*  'Mech-Scale Combat                          */
  /* -------------------------------------------- */

  /** @see Unit.getPilot */
  get pilot() {
    return this.isUnit ? Unit.getPilot(this) : null;
  }

  /**
   * A unit rolls Initiative with its pilot's bonus.
   * @override
   */
  getRollData() {
    const data = super.getRollData();
    if ( !this.isUnit ) return data;
    return { ...data, initiativeBonus: this.pilot?.system.initiativeBonus ?? 0 };
  }

  /** @see Unit.rollUnitAttack */
  async rollUnitAttack(weapon) {
    return Unit.rollUnitAttack(this, weapon);
  }

  /** @see Unit.rollPhysicalAttack */
  async rollPhysicalAttack() {
    return Unit.rollPhysicalAttack(this);
  }

  /**
   * Resolve a 'Mech-Scale hit on this unit.
   * @param {import("./unit.mjs").MechDamage} damage
   * @returns {Promise<ChatMessage|null>}
   */
  async applyUnitHit(damage) {
    switch ( this.type ) {
      case "mech": return Mech.applyMechHit(this, damage);
      case "vehicle": return Vehicle.applyVehicleHit(this, damage);
      case "fighter": return Fighter.applyFighterHit(this, damage);
      default: return null;
    }
  }

  /** @see Mixed.applySmallArms */
  async applySmallArms(damage) {
    return this.isUnit ? Mixed.applySmallArms(this, damage) : null;
  }

  /** @see Unit.rollPilotingTest */
  async rollPilotingTest(options) {
    return Unit.rollPilotingTest(this, options);
  }

  /**
   * What a failed Piloting Test does (p. 49): a 'Mech falls, a vehicle crashes, a fighter goes out
   * of control until its pilot passes a Piloting Test at the end of a later Narration.
   * @param {"fall"|"crash"|"control"} kind
   */
  async pilotingFailure(kind) {
    if ( kind === "fall" ) return this.resolveFall();
    if ( kind === "crash" ) return this.resolveCrash();
    if ( kind === "control" ) {
      await this.update({ "system.status.outOfControl": true });
      return ChatMessage.create(applyDefaultMode({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="mwd-card failure"><p>${game.i18n.format("MWD.Fighter.OutOfControl", { name: this.name })}</p></div>`
      }));
    }
    return null;
  }

  /** @see Mech.resolveFall */
  async resolveFall() {
    return (this.type === "mech") ? Mech.resolveFall(this) : null;
  }

  /** @see Unit.resolveCrash */
  async resolveCrash() {
    return this.isUnit ? Unit.resolveCrash(this) : null;
  }

  /** @see Mech.jump */
  async jump() {
    return Mech.jump(this);
  }

  /** @see Unit.addCrew */
  async addCrew(person) {
    return Unit.addCrew(this, person);
  }

  /** @see Unit.removeCrew */
  async removeCrew(uuid) {
    return Unit.removeCrew(this, uuid);
  }

  /** End of this unit's Narration: Heat, upkeep and recovery. */
  async endNarration() {
    switch ( this.type ) {
      case "mech": return Mech.endNarration(this);
      case "vehicle": return Vehicle.endVehicleNarration(this);
      case "fighter": return Fighter.endFighterNarration(this);
      default: return null;
    }
  }
}
