import {
  EXPERIENCE_LEVELS, HEAT_LEVELS, MECH_RANGES, SYSTEM_ID, UNIT_LOCATIONS, VEHICLE_MOTIVE, WEIGHT_CLASSES
} from "../config.mjs";
import { toggleDamagePip } from "../rules/condition.mjs";
import { rangeModifier } from "../rules/tests.mjs";
import { getCrew, getPilot, pilotParts, pilotUnconscious, usesBuiltInCrew } from "../documents/unit.mjs";
import { TEMPLATES } from "./person-sheet.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/** Armor Diagram layouts (p. 45–46): grid order of the locations. */
const DIAGRAMS = {
  mech: ["rightArm", "head", "leftArm", "rightLeg", "torso", "leftLeg"],
  vehicle: ["rightSide", "front", "leftSide", "turret", "rotor", "rear"],
  fighter: ["rightWing", "nose", "leftWing", "aft"]
};

/** Critical hit tracks shown as pips: [crit key, label key, max]. */
const CRIT_PIPS = {
  mech: [["gyro", "MWD.Mech.Crit.GyroShort", 2], ["engine", "MWD.Mech.Crit.EngineShort", 2]],
  vehicle: [],
  fighter: [["avionics", "MWD.Fighter.Crit.AvionicsShort", 1], ["engine", "MWD.Mech.Crit.EngineShort", 2]]
};

/**
 * Sheet for 'Mech-Scale units ('Mechs, combat vehicles and aerospace fighters): Hardware stats,
 * Armor Diagram, Heat, critical hits, weapons, pilot and crew.
 */
export class UnitSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "mwd-sheet", "actor", "unit"],
    position: { width: 860, height: 880 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      fire: UnitSheet.#onFire,
      physical: UnitSheet.#onPhysical,
      piloting: UnitSheet.#onPiloting,
      fall: UnitSheet.#onFall,
      crash: UnitSheet.#onCrash,
      jump: UnitSheet.#onJump,
      endNarration: UnitSheet.#onEndNarration,
      armorPip: UnitSheet.#onArmorPip,
      structurePip: UnitSheet.#onStructurePip,
      heatPip: UnitSheet.#onHeatPip,
      critPip: UnitSheet.#onCritPip,
      toggleStatus: UnitSheet.#onToggleStatus,
      toggleDestroyed: UnitSheet.#onToggleDestroyed,
      createItem: UnitSheet.#onCreateItem,
      editItem: UnitSheet.#onEditItem,
      deleteItem: UnitSheet.#onDeleteItem,
      openPilot: UnitSheet.#onOpenPilot,
      leavePilot: UnitSheet.#onLeavePilot,
      removeCrew: UnitSheet.#onRemoveCrew,
      conCheck: UnitSheet.#onConCheck
    }
  };

  static PARTS = {
    header: { template: `${TEMPLATES}/actor/unit-header.hbs` },
    body: { template: `${TEMPLATES}/actor/unit-body.hbs`, scrollable: [""] }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system;
    const type = actor.type;
    const builtIn = usesBuiltInCrew(actor);
    const pilot = builtIn ? null : getPilot(actor);
    const localize = key => game.i18n.localize(key);
    const specialty = system.unitConfig.specialty;

    Object.assign(context, {
      actor,
      system,
      editable: this.isEditable,
      isMech: type === "mech",
      isVehicle: type === "vehicle",
      isFighter: type === "fighter",
      usesHeat: system.usesHeat,
      physicalLabel: (type === "mech") ? "MWD.Mech.Physical.Button" : "MWD.Mech.Physical.ram",
      diagramHint: { mech: "MWD.Mech.DiagramHint", vehicle: "MWD.Vehicle.DiagramHint", fighter: "MWD.Fighter.DiagramHint" }[type],
      weightClasses: Object.fromEntries(Object.entries(WEIGHT_CLASSES).map(([k, v]) => [k, localize(v.label)])),
      motives: Object.fromEntries(Object.entries(VEHICLE_MOTIVE).map(([k, v]) => [k, localize(v)])),
      pilot: pilot ? this.#personContext(pilot, specialty) : null,
      pilotChoices: this.#pilotChoices(pilot),
      crew: getCrew(actor).filter(p => (p !== pilot) && (p !== actor)).map(p => this.#personContext(p, specialty)),
      builtInCrew: this.#builtInCrewContext(builtIn),
      crewChoices: this.#crewChoices(),
      locations: this.#locations(),
      heatPips: system.usesHeat ? Array.from({ length: Math.max(6, system.heat.value) }, (_v, i) => ({
        index: i, filled: i < system.heat.value, level: HEAT_LEVELS[Math.min(i + 1, HEAT_LEVELS.length - 1)].key
      })) : [],
      heatLevelLabel: system.usesHeat ? localize(`MWD.Mech.Heat.Level.${system.heatEffects.level}`) : "",
      critPips: CRIT_PIPS[type].map(([key, label, max]) => ({
        key, label: localize(label),
        pips: Array.from({ length: max }, (_v, i) => ({ index: i, filled: i < system.crits[key] }))
      })),
      structurePips: (type === "fighter") ? Array.from({ length: system.structure.max }, (_v, i) => ({
        index: i, filled: i < system.structure.damage
      })) : [],
      statuses: system.unitConfig.statuses.map(key => ({
        key, label: localize(`MWD.Unit.Status.${key}`), active: system.status[key]
      })),
      weapons: actor.itemTypes.mechWeapon.map(item => ({
        id: item.id,
        name: item.name,
        primary: item.system.primary,
        damage: item.system.damageLabel,
        types: item.system.types,
        heat: item.system.heatLabel,
        locations: item.system.locationAbbrs.map(localize).join(", "),
        ranges: Object.keys(MECH_RANGES).map(r => {
          const mod = rangeModifier(item.system.ranges[r]);
          return mod === null ? "—" : (mod === 0 ? "OK" : `${mod > 0 ? "+" : "–"}${Math.abs(mod)}`);
        }),
        destroyed: item.system.destroyed
      })).sort((a, b) => Number(b.primary) - Number(a.primary)),
      rangeLabels: Object.values(MECH_RANGES).map(localize),
      equipment: actor.itemTypes.mechEquipment.map(item => ({
        id: item.id,
        name: item.name,
        location: item.system.location ? localize(UNIT_LOCATIONS[item.system.location].label) : "",
        destroyed: item.system.destroyed
      })),
      notesHTML: await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.notes ?? "", {
        secrets: actor.isOwner, relativeTo: actor
      })
    });
    return context;
  }

  /** Locations in Armor Diagram order with their pips. */
  #locations() {
    const system = this.document.system;
    const fighter = this.document.type === "fighter";
    const keys = DIAGRAMS[this.document.type].filter(k => system.locationKeys.includes(k));
    return keys.map(key => {
      const loc = system.locations[key];
      return {
        key,
        label: game.i18n.localize(UNIT_LOCATIONS[key].label),
        rolls: UNIT_LOCATIONS[key].rolls,
        armor: loc.armor,
        structure: loc.structure ?? 0,
        destroyed: !!loc.destroyed,
        hasStructure: !fighter,
        armorPips: Array.from({ length: loc.armor }, (_v, i) => ({ index: i, filled: i < loc.armorDamage })),
        structurePips: fighter ? [] : Array.from({ length: loc.structure }, (_v, i) => ({ index: i, filled: i < loc.structureDamage }))
      };
    });
  }

  #personContext(person, specialty) {
    const bonus = key => pilotParts(person, key, specialty).parts.reduce((n, p) => n + p.value, 0);
    const physical = person.system.condition.physical;
    return {
      uuid: person.uuid,
      name: person.name,
      img: person.img,
      gunnery: bonus("gunnery"),
      piloting: bonus("piloting"),
      plotPoints: person.system.plotPoints?.value ?? null,
      edge: person.system.edge ? `${person.system.edge.remaining}/${person.system.edge.max}` : null,
      wounds: person.system.woundModifier,
      physical: `${physical.track.damage}/${physical.track.capacity}`,
      conCheck: physical.track.conCheck,
      unconscious: pilotUnconscious(person),
      owner: person.isOwner
    };
  }

  /** The unit's built-in crew: its settings, and its state when it is in the seat. */
  #builtInCrewContext(seated) {
    const system = this.document.system;
    const { physical, fatigue } = system.condition;
    return {
      seated,
      standby: system.builtInCrew.active && !seated,
      levels: Object.fromEntries(Object.entries(EXPERIENCE_LEVELS).map(([k, v]) => [k, game.i18n.localize(v.label)])),
      physicalCapacity: physical.track.capacity,
      fatigueCapacity: fatigue.track.capacity,
      wounds: system.woundModifier,
      conCheck: seated ? physical.track.conCheck : 0,
      unconscious: seated && pilotUnconscious(this.document)
    };
  }

  /** People this user may put in the pilot's seat. */
  #pilotChoices(pilot) {
    const people = game.actors.filter(a => a.isPerson && (a.isOwner || (a === pilot)))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    return Object.fromEntries([["", "—"], ...people.map(a => [a.uuid, a.name])]);
  }

  /** People this user may add to the crew. */
  #crewChoices() {
    const aboard = new Set([this.document.system.pilot, ...this.document.system.crew]);
    const people = game.actors.filter(a => a.isPerson && a.isOwner && !aboard.has(a.uuid))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    return Object.fromEntries([["", game.i18n.localize("MWD.Unit.Crew.Add")], ...people.map(a => [a.uuid, a.name])]);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("select[data-pilot-select]")?.addEventListener("change", this.#onPilotSelect.bind(this));
    this.element.querySelector("select[data-crew-select]")?.addEventListener("change", this.#onCrewSelect.bind(this));
  }

  async #onPilotSelect(event) {
    event.stopPropagation();
    const uuid = event.currentTarget.value;
    if ( !uuid ) return this.document.update({ "system.pilot": "" });
    const person = await fromUuid(uuid);
    return person?.boardHardware(this.document);
  }

  async #onCrewSelect(event) {
    event.stopPropagation();
    const person = await fromUuid(event.currentTarget.value);
    if ( person ) return this.document.addCrew(person);
  }

  /** Dropping a character or NPC on the sheet seats them as pilot, or as crew if taken. @override */
  async _onDropActor(event, actor) {
    if ( !this.isEditable || !actor?.isPerson ) return null;
    await this.document.addCrew(actor);
    return actor;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  #item(target) {
    return this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId);
  }

  static async #onFire(_event, target) {
    const weapon = this.#item(target);
    if ( weapon ) return this.document.rollUnitAttack(weapon);
  }

  static async #onPhysical() {
    return this.document.rollPhysicalAttack();
  }

  static async #onPiloting() {
    return this.document.rollPilotingTest();
  }

  static async #onFall() {
    return this.document.resolveFall();
  }

  static async #onCrash() {
    return this.document.resolveCrash();
  }

  static async #onJump() {
    return this.document.jump();
  }

  static async #onEndNarration() {
    return this.document.endNarration();
  }

  static async #onArmorPip(_event, target) {
    const { location, layer, index } = target.dataset;
    const field = layer === "structure" ? "structureDamage" : "armorDamage";
    const current = this.document.system.locations[location][field];
    return this.document.update({ [`system.locations.${location}.${field}`]: toggleDamagePip(current, Number(index)) });
  }

  static async #onStructurePip(_event, target) {
    const damage = toggleDamagePip(this.document.system.structure.damage, Number(target.dataset.index));
    return this.document.update({ "system.structure.damage": damage });
  }

  static async #onHeatPip(_event, target) {
    const heat = toggleDamagePip(this.document.system.heat.value, Number(target.dataset.index));
    return this.document.update({ "system.heat.value": heat });
  }

  static async #onCritPip(_event, target) {
    const key = target.dataset.crit;
    const current = this.document.system.crits[key];
    return this.document.update({ [`system.crits.${key}`]: toggleDamagePip(current, Number(target.dataset.index)) });
  }

  static async #onToggleStatus(_event, target) {
    const key = target.dataset.status;
    return this.document.update({ [`system.status.${key}`]: !this.document.system.status[key] });
  }

  static async #onToggleDestroyed(_event, target) {
    const item = this.#item(target);
    if ( item ) return item.update({ "system.destroyed": !item.system.destroyed });
  }

  static async #onCreateItem(_event, target) {
    const type = target.dataset.type;
    const name = game.i18n.format("MWD.NewItem", { type: game.i18n.localize(`TYPES.Item.${type}`) });
    const [item] = await this.document.createEmbeddedDocuments("Item", [{ name, type }]);
    item?.sheet.render(true);
  }

  static async #onEditItem(_event, target) {
    this.#item(target)?.sheet.render(true);
  }

  static async #onDeleteItem(_event, target) {
    return this.#item(target)?.deleteDialog();
  }

  static async #onOpenPilot(_event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const person = uuid ? fromUuidSync(uuid) : getPilot(this.document);
    person?.sheet.render(true);
  }

  static async #onLeavePilot() {
    return this.document.update({ "system.pilot": "" });
  }

  static async #onRemoveCrew(_event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    if ( uuid ) return this.document.removeCrew(uuid);
  }

  static async #onConCheck(_event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const person = uuid ? fromUuidSync(uuid) : getPilot(this.document);
    return person?.rollConCheck();
  }
}
