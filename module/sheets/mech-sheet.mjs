import { HEAT_LEVELS, MECH_LOCATIONS, MECH_RANGES, SYSTEM_ID, WEIGHT_CLASSES } from "../config.mjs";
import { toggleDamagePip } from "../rules/condition.mjs";
import { rangeModifier } from "../rules/tests.mjs";
import { getPilot, pilotParts, pilotUnconscious } from "../documents/mech.mjs";
import { TEMPLATES } from "./person-sheet.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const STATUSES = ["prone", "jumped", "shutdown", "disengaged", "destroyed"];

/** Armor Diagram layout (p. 45): arms either side of head and torso, legs below. */
const DIAGRAM = ["rightArm", "head", "leftArm", "rightLeg", "torso", "leftLeg"];

/**
 * BattleMech sheet: Hardware stats, Armor Diagram, Heat, critical hits, weapons and the pilot.
 */
export class MechSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "mwd-sheet", "actor", "mech"],
    position: { width: 860, height: 880 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      fire: MechSheet.#onFire,
      physical: MechSheet.#onPhysical,
      piloting: MechSheet.#onPiloting,
      fall: MechSheet.#onFall,
      jump: MechSheet.#onJump,
      endNarration: MechSheet.#onEndNarration,
      armorPip: MechSheet.#onArmorPip,
      heatPip: MechSheet.#onHeatPip,
      critPip: MechSheet.#onCritPip,
      toggleStatus: MechSheet.#onToggleStatus,
      toggleDestroyed: MechSheet.#onToggleDestroyed,
      createItem: MechSheet.#onCreateItem,
      editItem: MechSheet.#onEditItem,
      deleteItem: MechSheet.#onDeleteItem,
      openPilot: MechSheet.#onOpenPilot,
      leavePilot: MechSheet.#onLeavePilot,
      conCheck: MechSheet.#onConCheck
    }
  };

  static PARTS = {
    header: { template: `${TEMPLATES}/actor/mech-header.hbs` },
    body: { template: `${TEMPLATES}/actor/mech-body.hbs`, scrollable: [""] }
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system;
    const pilot = getPilot(actor);
    const localize = key => game.i18n.localize(key);

    Object.assign(context, {
      actor,
      system,
      editable: this.isEditable,
      weightClasses: Object.fromEntries(Object.entries(WEIGHT_CLASSES).map(([k, v]) => [k, localize(v.label)])),
      pilot: pilot ? this.#pilotContext(pilot) : null,
      pilotChoices: this.#pilotChoices(pilot),
      locations: DIAGRAM.map(key => {
        const loc = system.locations[key];
        return {
          key,
          label: localize(MECH_LOCATIONS[key].label),
          rolls: MECH_LOCATIONS[key].rolls,
          armor: loc.armor,
          structure: loc.structure,
          armorLeft: loc.armorLeft,
          structureLeft: loc.structureLeft,
          destroyed: loc.destroyed,
          armorPips: Array.from({ length: loc.armor }, (_v, i) => ({ index: i, filled: i < loc.armorDamage })),
          structurePips: Array.from({ length: loc.structure }, (_v, i) => ({ index: i, filled: i < loc.structureDamage }))
        };
      }),
      heatPips: Array.from({ length: Math.max(6, system.heat.value) }, (_v, i) => ({
        index: i, filled: i < system.heat.value, level: HEAT_LEVELS[Math.min(i + 1, HEAT_LEVELS.length - 1)].key
      })),
      heatLevelLabel: localize(`MWD.Mech.Heat.Level.${system.heatEffects.level}`),
      crits: {
        gyro: [0, 1].map(i => ({ index: i, filled: i < system.crits.gyro })),
        engine: [0, 1].map(i => ({ index: i, filled: i < system.crits.engine })),
        legs: system.crits.legs
      },
      statuses: STATUSES.map(key => ({ key, label: localize(`MWD.Mech.Status.${key}`), active: system.status[key] })),
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
          return mod === null ? "—" : (mod === 0 ? "OK" : `–${Math.abs(mod)}`);
        }),
        destroyed: item.system.destroyed
      })).sort((a, b) => Number(b.primary) - Number(a.primary)),
      rangeLabels: Object.values(MECH_RANGES).map(localize),
      equipment: actor.itemTypes.mechEquipment.map(item => ({
        id: item.id,
        name: item.name,
        location: item.system.location ? localize(MECH_LOCATIONS[item.system.location].label) : "",
        destroyed: item.system.destroyed
      })),
      notesHTML: await foundry.applications.ux.TextEditor.implementation.enrichHTML(system.notes ?? "", {
        secrets: actor.isOwner, relativeTo: actor
      })
    });
    return context;
  }

  #pilotContext(pilot) {
    const bonus = key => pilotParts(pilot, key).parts.reduce((n, p) => n + p.value, 0);
    const physical = pilot.system.condition.physical;
    return {
      uuid: pilot.uuid,
      name: pilot.name,
      img: pilot.img,
      gunnery: bonus("gunnery"),
      piloting: bonus("piloting"),
      plotPoints: pilot.system.plotPoints?.value ?? null,
      edge: pilot.system.edge ? `${pilot.system.edge.remaining}/${pilot.system.edge.max}` : null,
      wounds: pilot.system.woundModifier,
      physical: `${physical.track.damage}/${physical.track.capacity}`,
      conCheck: physical.track.conCheck,
      unconscious: pilotUnconscious(pilot),
      owner: pilot.isOwner
    };
  }

  /** People this user may put in the cockpit. */
  #pilotChoices(pilot) {
    const people = game.actors.filter(a => a.isPerson && (a.isOwner || (a === pilot)))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    return Object.fromEntries([["", "—"], ...people.map(a => [a.uuid, a.name])]);
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("select[data-pilot-select]")?.addEventListener("change", this.#onPilotSelect.bind(this));
  }

  async #onPilotSelect(event) {
    event.stopPropagation();
    const uuid = event.currentTarget.value;
    if ( !uuid ) return this.document.update({ "system.pilot": "" });
    const person = await fromUuid(uuid);
    return person?.boardHardware(this.document);
  }

  /** Dropping a character or NPC on the sheet puts them in the cockpit. @override */
  async _onDropActor(event, actor) {
    if ( !this.isEditable || !actor?.isPerson ) return null;
    await actor.boardHardware(this.document);
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
    if ( weapon ) return this.document.rollMechAttack(weapon);
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

  static async #onOpenPilot() {
    getPilot(this.document)?.sheet.render(true);
  }

  static async #onLeavePilot() {
    return this.document.update({ "system.pilot": "" });
  }

  static async #onConCheck() {
    return getPilot(this.document)?.rollConCheck();
  }
}
