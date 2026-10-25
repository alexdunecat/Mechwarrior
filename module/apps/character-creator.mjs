import {
  ATTRIBUTES, BOOK_TRAITS, CREATION, EXPERIENCE_LEVELS, FACTIONS, FREE_WEAPONS, HARDWARE_CONVERSION, LIFE_MODULES,
  LIFE_MODULE_SLOTS, OPTIONAL_LIFE_MODULES, SKILLS, SPECIALTIES, STARTING_ARMOR, SYSTEM_ID, UNIT_TYPES, WEIGHT_CLASSES
} from "../config.mjs";
import {
  attributePointsSpent, creationBudget, finalSkills, hardwareCost, hasHardwareSkills, itemLimits, lifeModuleAllowed,
  lifeModuleSkills, unspentHardware, validateCreation
} from "../rules/creation.mjs";
import {
  bookTraitData, customTraitData, freeWeaponData, gearData, skillItemData, skillName, startingArmorData
} from "../documents/item-data.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TEMPLATES = `systems/${SYSTEM_ID}/templates/creation`;

/** The 13 steps of character creation (p. 68); the Experience Level comes first so every budget is known from the start. */
export const STEPS = [
  "experience", "theme", "faction", "attributes", "skills", "traits", "lifeModules", "armor", "weapons", "inventory",
  "hardware", "cues", "background"
];

/** Item types the wizard writes; anything else on the actor is left alone. */
const MANAGED_TYPES = ["skill", "trait", "weapon", "armor", "gear"];

const t = key => game.i18n.localize(key);
const f = (key, data) => game.i18n.format(key, data);
const BASE_ATTRIBUTES = ["str", "rfl", "int", "wil", "cha"];

/** Plain text from stored HTML, for the background text boxes. */
function htmlToText(html) {
  return (html ?? "").replace(/<\/p>\s*/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

/** HTML paragraphs from text typed in the wizard. */
function textToHtml(text) {
  const escape = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return (text ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/**
 * Character creation wizard (p. 68–77). It edits a draft and only writes the character when
 * finished, so steps can be revisited freely. Rule problems are shown as warnings because the GM
 * may allow exceptions; finishing anyway asks for confirmation.
 */
export class CharacterCreator extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, ...options } = {}) {
    super({ id: `mwd-creator-${actor.id}`, ...options });
    this.actor = actor;
    this.draft = CharacterCreator.draftFromActor(actor);
    this.pending = { skill: { key: "athletics", specialty: "mech", subject: "" }, trait: { polarity: "positive", modifier: 0 } };
    this.step = STEPS[0];
  }

  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "mwd-sheet", "mwd-creator"],
    window: { icon: "fa-solid fa-wand-magic-sparkles", resizable: true },
    position: { width: 800, height: 740 },
    actions: {
      goto: CharacterCreator.#onGoto,
      prev: CharacterCreator.#onPrev,
      next: CharacterCreator.#onNext,
      finish: CharacterCreator.#onFinish,
      attribute: CharacterCreator.#onAttribute,
      addSkill: CharacterCreator.#onAddSkill,
      removeSkill: CharacterCreator.#onRemoveSkill,
      addBookTrait: CharacterCreator.#onAddBookTrait,
      addCustomTrait: CharacterCreator.#onAddCustomTrait,
      removeTrait: CharacterCreator.#onRemoveTrait,
      addWeapon: CharacterCreator.#onAddWeapon,
      newWeapon: CharacterCreator.#onNewWeapon,
      removeWeapon: CharacterCreator.#onRemoveWeapon,
      addInventory: CharacterCreator.#onAddInventory,
      removeInventory: CharacterCreator.#onRemoveInventory,
      chooseHardware: CharacterCreator.#onChooseHardware
    }
  };

  static PARTS = {
    nav: { template: `${TEMPLATES}/nav.hbs` },
    step: { template: `${TEMPLATES}/step.hbs`, scrollable: [""] },
    footer: { template: `${TEMPLATES}/footer.hbs` }
  };

  /** Step partials, loaded at init. */
  static get partials() {
    return STEPS.map(s => `${TEMPLATES}/${s}.hbs`);
  }

  /**
   * Open the wizard for a character, reusing an open window.
   * @param {Actor} actor
   */
  static open(actor) {
    const existing = foundry.applications.instances.get(`mwd-creator-${actor.id}`);
    return (existing ?? new this({ actor })).render({ force: true });
  }

  /** @override */
  get title() {
    return f("MWD.Creation.Title", { name: this.actor.name });
  }

  /* -------------------------------------------- */
  /*  Draft                                       */
  /* -------------------------------------------- */

  /**
   * The saved draft, or one read from the character as it is.
   * @param {Actor} actor
   * @returns {object}
   */
  static draftFromActor(actor) {
    const saved = actor.getFlag(SYSTEM_ID, "creationDraft");
    if ( saved ) return foundry.utils.deepClone(saved);
    const system = actor.system;
    const armorNames = Object.fromEntries(Object.keys(STARTING_ARMOR).map(k => [t(`MWD.Armor.Type.${k}`), k]));
    const free = actor.itemTypes.weapon.find(w => w.getFlag(SYSTEM_ID, "freeWeapon"));
    const unit = system.hardware.map(uuid => fromUuidSync(uuid)).find(u => u?.isUnit);
    return {
      name: actor.name,
      theme: system.details.theme,
      tags: system.tags,
      faction: system.details.factionKey,
      experience: system.details.experience,
      attributes: Object.fromEntries(Object.keys(ATTRIBUTES).map(k => [k, system.attributes[k].value])),
      skills: actor.itemTypes.skill.filter(s => SKILLS[s.system.key]).map(s => ({
        key: s.system.key,
        specialty: s.system.specialty,
        subject: SKILLS[s.system.key].subject ? (s.name.split(":").slice(1).join(":").trim()) : "",
        rank: s.system.rank
      })),
      traits: actor.itemTypes.trait.map(i => ({
        key: i.system.key, name: i.name, polarity: i.system.polarity, modifier: i.system.modifier, appliesTo: i.system.appliesTo
      })),
      lifeModules: { childhood: null, education: null, realLife: null },
      armor: armorNames[actor.itemTypes.armor[0]?.name] ?? "",
      unarmed: free?.getFlag(SYSTEM_ID, "freeWeapon") ?? "unarmed",
      weapons: actor.itemTypes.weapon.filter(w => w !== free).map(w => ({ data: w.toObject() })),
      inventory: actor.itemTypes.gear.map(g => g.name),
      hardware: unit ? { uuid: unit.uuid, name: unit.name, type: unit.type, weightClass: unit.system.details.weightClass } : null,
      dispossessed: system.creation.dispossessed,
      hardwarePool: false,
      conversion: { xp: 0, skills: 0, edge: 0 },
      appliedXp: 0,
      cues: system.cues,
      bio: {
        rank: system.details.rank,
        age: system.details.age,
        height: system.details.height,
        weight: system.details.weight,
        history: htmlToText(system.biography.history),
        personality: htmlToText(system.biography.personality),
        disposition: system.biography.disposition
      }
    };
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const draft = this.draft;
    const issues = validateCreation(draft);
    const index = STEPS.indexOf(this.step);
    Object.assign(context, {
      draft,
      pending: this.pending,
      step: this.step,
      stepNumber: index + 1,
      isFirst: index === 0,
      isLast: index === (STEPS.length - 1),
      steps: STEPS.map((key, i) => ({
        key,
        number: i + 1,
        label: t(`MWD.Creation.Step.${key}`),
        active: key === this.step,
        warnings: issues.filter(issue => issue.step === key).length
      })),
      stepLabel: t(`MWD.Creation.Step.${this.step}`),
      stepHint: t(`MWD.Creation.Hint.${this.step}`),
      issues: issues.filter(issue => issue.step === this.step).map(issue => this.#issueText(issue)),
      totalIssues: issues.length,
      budget: creationBudget(draft),
      isGM: game.user.isGM
    });
    Object.assign(context, await this.#stepContext(this.step));
    context[`is_${this.step}`] = true;
    return context;
  }

  /** Readable text for a validation problem. */
  #issueText({ code, data }) {
    const named = { ...data };
    if ( data.skill ) named.skill = t(`MWD.Skill.${data.skill}`);
    if ( data.attribute ) named.attribute = t(ATTRIBUTES[data.attribute].abbr);
    if ( data.slot ) named.slot = t(`MWD.LifeModule.${data.slot}`);
    if ( data.trait ) named.trait = t(`MWD.BookTrait.${data.trait}.name`);
    if ( data.requires ) named.requires = t(`MWD.BookTrait.${data.requires}.name`);
    if ( data.module ) named.module = t(`MWD.LifeModules.${data.slot}.${data.module}`);
    if ( data.type ) named.type = t(`TYPES.Actor.${data.type}`);
    return f(`MWD.Creation.Issue.${code}`, named);
  }

  /** Data for one step's template. */
  async #stepContext(step) {
    const draft = this.draft;
    const budget = creationBudget(draft);
    switch ( step ) {
      case "faction": return {
        factionGroups: ["successor", "periphery", "other"].map(group => ({
          label: t(`MWD.Faction.Group.${group}`),
          options: Object.entries(FACTIONS).filter(([, v]) => v.group === group)
            .map(([key]) => ({ value: key, label: t(`MWD.Faction.${key}`), selected: draft.faction === key }))
        }))
      };
      case "experience": return {
        levels: Object.entries(EXPERIENCE_LEVELS).map(([key, v]) => ({
          key, label: t(v.label), selected: draft.experience === key,
          attributes: v.attributes, skills: v.skills, weapons: v.weapons, hardware: v.hardware
        }))
      };
      case "attributes": {
        const spent = attributePointsSpent(draft.attributes);
        const left = budget.attributes - spent;
        return {
          attributePoints: { spent, budget: budget.attributes, left },
          attributeRows: Object.entries(ATTRIBUTES).map(([key, cfg]) => {
            const edge = key === "edg";
            const value = draft.attributes[key];
            const cost = edge ? CREATION.edgeCost : 1;
            return {
              key, label: t(cfg.label), abbr: t(cfg.abbr), value, cost, edge,
              canDec: value > 1,
              canInc: (value < (edge ? CREATION.edgeMax : CREATION.attributeMax)) && (left >= cost)
            };
          })
        };
      }
      case "skills": return this.#skillsContext(budget);
      case "traits": return this.#traitsContext();
      case "lifeModules": return this.#lifeModulesContext();
      case "armor": return {
        armors: Object.entries(STARTING_ARMOR).map(([key, cfg]) => ({
          key, label: t(`MWD.Armor.Type.${key}`), selected: draft.armor === key, pips: cfg.pips,
          effect: [cfg.reduceB && `–${cfg.reduceB} B`, cfg.reduceE && `–${cfg.reduceE} E`, cfg.rflPenalty && `–${cfg.rflPenalty} RFL`]
            .filter(Boolean).join(", ")
        }))
      };
      case "weapons": return this.#weaponsContext();
      case "inventory": return {
        inventoryLimit: itemLimits(draft).inventory,
        inventoryItems: draft.inventory.map((name, index) => ({ name, index }))
      };
      case "hardware": return this.#hardwareContext(budget);
      default: return {};
    }
  }

  #skillsContext(budget) {
    const draft = this.draft;
    const final = finalSkills(draft);
    const spent = draft.skills.reduce((n, s) => n + s.rank, 0);
    const attr = key => draft.attributes[SKILLS[key]?.attribute] ?? 0;
    return {
      skillPoints: { spent, budget: budget.skills, left: budget.skills - spent, converted: draft.conversion.skills },
      skillRows: draft.skills.map((s, index) => {
        const entry = final.find(e => (e.key === s.key) && (e.specialty === (s.specialty ?? ""))
          && (e.subject.trim().toLowerCase() === (s.subject ?? "").trim().toLowerCase()));
        return {
          index, name: skillName(s), rank: s.rank, max: CREATION.skillMax,
          bonus: entry?.bonus ?? 0,
          attribute: t(ATTRIBUTES[SKILLS[s.key].attribute].abbr),
          total: (entry?.rank ?? s.rank) + attr(s.key)
        };
      }),
      lifeModuleOnly: final.filter(e => !e.base).map(e => ({ name: skillName(e), total: e.rank + attr(e.key) })),
      skillChoices: Object.entries(SKILLS).map(([key, cfg]) => ({
        value: key, label: `${t(`MWD.Skill.${key}`)} (${t(ATTRIBUTES[cfg.attribute].abbr)})`
      })).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang)),
      specialties: Object.fromEntries(Object.entries(SPECIALTIES).map(([k, v]) => [k, t(v)])),
      pendingSpecialty: !!SKILLS[this.pending.skill.key]?.specialty,
      pendingSubject: !!SKILLS[this.pending.skill.key]?.subject
    };
  }

  #traitsContext() {
    const draft = this.draft;
    const chosen = new Set(draft.traits.map(tr => tr.key).filter(Boolean));
    const options = polarity => Object.entries(BOOK_TRAITS).filter(([k, v]) => (v.polarity === polarity) && !chosen.has(k))
      .map(([key]) => ({ value: key, label: t(`MWD.BookTrait.${key}.name`) }))
      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    return {
      traitRows: draft.traits.map((tr, index) => ({
        index,
        name: tr.key ? t(`MWD.BookTrait.${tr.key}.name`) : tr.name,
        hint: tr.key ? t(`MWD.BookTrait.${tr.key}.hint`) : tr.appliesTo,
        polarity: t(`MWD.Trait.${tr.polarity}`),
        positive: tr.polarity === "positive"
      })),
      positiveChoices: options("positive"),
      negativeChoices: options("negative"),
      traitCounts: {
        positive: draft.traits.filter(tr => tr.polarity === "positive").length,
        negative: draft.traits.filter(tr => tr.polarity === "negative").length,
        max: CREATION.traitsMax
      },
      polarities: { positive: t("MWD.Trait.positive"), negative: t("MWD.Trait.negative") }
    };
  }

  #lifeModulesContext() {
    const draft = this.draft;
    const subjects = [...new Set(draft.skills.filter(s => SKILLS[s.key]?.subject && s.subject).map(s => s.subject))];
    return {
      factionLabel: draft.faction ? t(`MWD.Faction.${draft.faction}`) : t("MWD.Creation.NoFaction"),
      knowledgeSubjects: subjects,
      specialties: Object.fromEntries(Object.entries(SPECIALTIES).map(([k, v]) => [k, t(v)])),
      slots: LIFE_MODULE_SLOTS.map(slot => {
        const choice = draft.lifeModules[slot];
        const module = choice?.key ? LIFE_MODULES[slot][choice.key] : null;
        const skill = choice?.skill?.key;
        return {
          slot,
          label: t(`MWD.LifeModule.${slot}`),
          optional: OPTIONAL_LIFE_MODULES.includes(slot),
          key: choice?.key ?? "",
          modules: Object.keys(LIFE_MODULES[slot]).map(key => ({
            value: key,
            label: `${t(`MWD.LifeModules.${slot}.${key}`)} — ${this.#moduleSkillsLabel(slot, key)}`,
            selected: choice?.key === key,
            disabled: !lifeModuleAllowed(slot, key, draft.lifeModules)
          })),
          skills: module ? lifeModuleSkills(slot, choice.key).map(k => ({
            value: k, label: t(`MWD.Skill.${k}`), selected: skill === k
          })).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang)) : [],
          needsSubject: !!SKILLS[skill]?.subject,
          subject: choice?.skill?.subject ?? "",
          needsSpecialty: !!SKILLS[skill]?.specialty && !module?.specialty,
          specialty: choice?.skill?.specialty ?? ""
        };
      })
    };
  }

  /** "+1 Tracking or Projectile Weapons". */
  #moduleSkillsLabel(slot, key) {
    const module = LIFE_MODULES[slot][key];
    if ( module.skills === "any" ) return t("MWD.Creation.AnySkill");
    const or = ` ${t("MWD.Creation.Or")} `;
    const fixed = module.specialty ? ` (${t(SPECIALTIES[module.specialty])})` : "";
    return `+1 ${module.skills.map(k => t(`MWD.Skill.${k}`) + fixed).join(or)}`;
  }

  async #weaponsContext() {
    const draft = this.draft;
    const sources = game.items.filter(i => i.type === "weapon").map(i => ({ value: i.uuid, label: i.name }));
    for ( const pack of game.packs.filter(p => p.documentName === "Item") ) {
      const index = await pack.getIndex({ fields: ["type"] });
      for ( const entry of index ) {
        if ( entry.type === "weapon" ) sources.push({ value: entry.uuid, label: `${entry.name} (${pack.title})` });
      }
    }
    sources.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    return {
      weaponLimit: itemLimits(draft).weapons,
      weaponsMax: CREATION.weaponsMax,
      freeWeapons: Object.fromEntries(Object.keys(FREE_WEAPONS).map(k => [k, t(`MWD.Weapon.Free.${k}`)])),
      weaponSources: sources,
      weaponRows: draft.weapons.map((w, index) => ({ index, data: w.data, unique: !!w.data.system?.unique })),
      weaponSkills: Object.fromEntries(Object.entries(SKILLS).filter(([, v]) => v.combat).map(([k]) => [k, t(`MWD.Skill.${k}`)])),
      damageTypes: { "": t("MWD.DamageType.none"), B: "B", E: "E" },
      rangeCodes: { 0: "OK", "-1": "–1", "-2": "–2", "-3": "–3", "-4": "–4", x: "—" },
      equipped: creationBudget(draft).equipped
    };
  }

  #hardwareContext(budget) {
    const draft = this.draft;
    const skills = finalSkills(draft);
    const units = game.actors.filter(a => a.isUnit && a.isOwner)
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
      .map(unit => {
        const cost = hardwareCost(unit.type, unit.system.details.weightClass);
        return {
          uuid: unit.uuid,
          name: unit.name,
          type: t(`TYPES.Actor.${unit.type}`),
          weight: t(WEIGHT_CLASSES[unit.system.details.weightClass]?.label ?? ""),
          cost,
          tooExpensive: cost > budget.hardware,
          skillsOk: hasHardwareSkills(unit.type, skills),
          selected: draft.hardware?.uuid === unit.uuid,
          pilotName: (unit.system.pilot && (unit.system.pilot !== this.actor.uuid)) ? fromUuidSync(unit.system.pilot)?.name : null
        };
      });
    return {
      units,
      unspent: draft.dispossessed ? 0 : unspentHardware(draft),
      hardwareBudget: budget.hardware,
      conversionRates: HARDWARE_CONVERSION,
      requirements: Object.keys(UNIT_TYPES).map(type => ({
        type: t(`TYPES.Actor.${type}`), text: t(`MWD.Creation.HardwareSkills.${type}`)
      }))
    };
  }

  /* -------------------------------------------- */

  /** The window element outlives re-renders, so listen once. @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.element.addEventListener("change", this.#onChange.bind(this));
    this.element.addEventListener("dragover", event => event.preventDefault());
    this.element.addEventListener("drop", this.#onDrop.bind(this));
  }

  /**
   * Inputs are named by their path in the draft, or "pending.*" for the add-a-Skill and custom
   * Trait forms.
   */
  async #onChange(event) {
    const input = event.target;
    if ( !input.name ) return;
    event.stopPropagation();
    let value = input.type === "checkbox" ? input.checked : input.value;
    if ( (input.type === "number") || input.dataset.dtype === "Number" ) value = Number(value) || 0;
    if ( input.name.startsWith("pending.") ) {
      foundry.utils.setProperty(this.pending, input.name.slice(8), value);
      if ( input.name === "pending.skill.key" ) return this.render();
      return;
    }
    // A Life Module slot may be empty (null), so its key is set by #afterChange.
    if ( !/^lifeModules\.\w+\.key$/.test(input.name) ) foundry.utils.setProperty(this.draft, input.name, value);
    this.#afterChange(input.name, value);
    // Plain text changes nothing else on the page; skipping the render keeps a click that follows
    // the edit (the change fires on blur) from landing on a replaced button.
    if ( (input.tagName === "TEXTAREA") || (input.type === "text") ) return;
    return this.render();
  }

  /** Keep the draft consistent after an edit. */
  #afterChange(path, value) {
    const draft = this.draft;
    const slot = path.match(/^lifeModules\.(\w+)\.key$/)?.[1];
    if ( slot ) {
      draft.lifeModules[slot] = value ? { key: value, skill: { key: lifeModuleSkills(slot, value)[0] ?? "", specialty: "", subject: "" } } : null;
      // Modules that needed this one may no longer be allowed.
      for ( const other of LIFE_MODULE_SLOTS ) {
        const choice = draft.lifeModules[other];
        if ( choice?.key && !lifeModuleAllowed(other, choice.key, draft.lifeModules) ) draft.lifeModules[other] = null;
      }
    }
    if ( path === "dispossessed" && value ) draft.hardware = null;
    const changed = path.match(/^conversion\.(\w+)$/)?.[1];
    if ( changed || (path === "dispossessed") || (path === "experience") || (path === "attributes.edg") ) this.#clampConversion(changed);
  }

  /**
   * Keep Hardware conversions within the unspent Hardware Points, and EDG within its starting
   * maximum. The field just edited keeps its value where it can; the others give way.
   * @param {string} [changed]  Key of the conversion just edited.
   */
  #clampConversion(changed) {
    const draft = this.draft;
    const conversion = draft.conversion;
    conversion.edge = Math.min(conversion.edge, Math.max(0, CREATION.edgeMax - draft.attributes.edg));
    let left = draft.dispossessed ? 0 : unspentHardware(draft);
    const order = ["edge", "skills", "xp"].sort((a, b) => (b === changed) - (a === changed));
    for ( const key of order ) {
      conversion[key] = Math.clamp(conversion[key], 0, left);
      left -= conversion[key];
    }
  }

  /** Weapons dropped from the sidebar or a compendium join the draft; Inventory items too. */
  async #onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( data?.type !== "Item" ) return;
    const item = await Item.implementation.fromDropData(data);
    if ( item?.type === "weapon" ) this.#pushWeapon(item);
    else if ( item?.type === "gear" ) this.draft.inventory.push(item.name);
    else return;
    this.render();
  }

  #pushWeapon(item) {
    const data = item.toObject();
    delete data._id;
    this.draft.weapons.push({ data });
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onGoto(_event, target) {
    this.step = target.dataset.step;
    this.render();
  }

  static #onPrev() {
    this.step = STEPS[Math.max(0, STEPS.indexOf(this.step) - 1)];
    this.render();
  }

  static #onNext() {
    this.step = STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(this.step) + 1)];
    this.render();
  }

  static #onAttribute(_event, target) {
    const key = target.dataset.attribute;
    const delta = Number(target.dataset.delta);
    const max = key === "edg" ? CREATION.edgeMax : CREATION.attributeMax;
    const cost = key === "edg" ? CREATION.edgeCost : 1;
    const left = creationBudget(this.draft).attributes - attributePointsSpent(this.draft.attributes);
    if ( (delta > 0) && (cost > left) ) return;
    this.draft.attributes[key] = Math.clamp(this.draft.attributes[key] + delta, 1, max);
    if ( key === "edg" ) this.#clampConversion();
    this.render();
  }

  static #onAddSkill() {
    const { key, specialty, subject } = this.pending.skill;
    const cfg = SKILLS[key];
    if ( !cfg ) return;
    if ( cfg.subject && !subject?.trim() ) return ui.notifications.warn("MWD.Advance.NeedSubject", { localize: true });
    this.draft.skills.push({
      key, rank: 1, specialty: cfg.specialty ? specialty : "", subject: cfg.subject ? subject.trim() : ""
    });
    this.pending.skill.subject = "";
    this.render();
  }

  static #onRemoveSkill(_event, target) {
    this.draft.skills.splice(Number(target.dataset.index), 1);
    this.render();
  }

  static #onAddBookTrait(_event, target) {
    const select = this.element.querySelector(`select[data-trait-choice="${target.dataset.polarity}"]`);
    const key = select?.value;
    const cfg = BOOK_TRAITS[key];
    if ( !cfg ) return;
    this.draft.traits.push({ key, name: t(`MWD.BookTrait.${key}.name`), polarity: cfg.polarity, modifier: cfg.modifier ?? 0 });
    this.#clampConversion();
    this.render();
  }

  static #onAddCustomTrait() {
    const { name, polarity, modifier, appliesTo } = this.pending.trait;
    if ( !name?.trim() ) return;
    const sign = polarity === "positive" ? 1 : -1;
    this.draft.traits.push({
      key: "", name: name.trim(), polarity, modifier: sign * Math.min(CREATION.traitModifierMax, Math.abs(Number(modifier) || 0)),
      appliesTo: appliesTo ?? ""
    });
    this.pending.trait = { polarity, modifier: 0 };
    this.render();
  }

  static #onRemoveTrait(_event, target) {
    this.draft.traits.splice(Number(target.dataset.index), 1);
    this.#clampConversion();
    this.render();
  }

  static async #onAddWeapon() {
    const uuid = this.element.querySelector("select[data-weapon-source]")?.value;
    const item = uuid ? await fromUuid(uuid) : null;
    if ( item?.type !== "weapon" ) return;
    this.#pushWeapon(item);
    this.render();
  }

  static #onNewWeapon() {
    this.draft.weapons.push({
      data: {
        name: t("MWD.Creation.NewWeapon"),
        type: "weapon",
        img: "icons/svg/sword.svg",
        system: { skill: "smallArms", damage: 3, damageType: "B", ranges: { close: "0", near: "-2", far: "x" }, unique: true }
      }
    });
    this.render();
  }

  static #onRemoveWeapon(_event, target) {
    this.draft.weapons.splice(Number(target.dataset.index), 1);
    this.render();
  }

  static #onAddInventory() {
    this.draft.inventory.push("");
    this.render();
  }

  static #onRemoveInventory(_event, target) {
    this.draft.inventory.splice(Number(target.dataset.index), 1);
    this.render();
  }

  static #onChooseHardware(_event, target) {
    const uuid = target.dataset.uuid;
    const unit = uuid ? fromUuidSync(uuid) : null;
    const draft = this.draft;
    if ( !unit || (draft.hardware?.uuid === uuid) ) draft.hardware = null;
    else {
      draft.hardware = { uuid, name: unit.name, type: unit.type, weightClass: unit.system.details.weightClass };
      draft.dispossessed = false;
    }
    this.#clampConversion();
    this.render();
  }

  static async #onFinish() {
    const issues = validateCreation(this.draft);
    const { DialogV2 } = foundry.applications.api;
    if ( issues.length ) {
      const list = issues.map(i => `<li>${this.#issueText(i)}</li>`).join("");
      const go = await DialogV2.confirm({
        window: { title: "MWD.Creation.FinishTitle" },
        content: `<p>${f("MWD.Creation.FinishWithIssues", { n: issues.length })}</p><ul>${list}</ul>`,
        rejectClose: false
      });
      if ( !go ) return;
    }
    const replaced = this.actor.items.filter(i => MANAGED_TYPES.includes(i.type) && !((i.type === "skill") && !SKILLS[i.system.key]));
    if ( replaced.length ) {
      const go = await DialogV2.confirm({
        window: { title: "MWD.Creation.FinishTitle" },
        content: `<p>${f("MWD.Creation.ReplaceItems", { n: replaced.length })}</p>`,
        rejectClose: false
      });
      if ( !go ) return;
    }
    await this.#write(replaced);
    ui.notifications.info(f("MWD.Creation.Done", { name: this.actor.name }));
    await this.close();
    this.actor.sheet.render(true);
  }

  /** Write the draft to the character. */
  async #write(replaced) {
    const actor = this.actor;
    const draft = this.draft;
    const system = actor.system;
    const budget = creationBudget(draft);
    const xp = HARDWARE_CONVERSION.xp * draft.conversion.xp;
    const moduleLabel = slot => {
      const choice = draft.lifeModules[slot];
      if ( !choice?.key ) return "";
      const skill = choice.skill?.key ? skillName({
        ...choice.skill, specialty: LIFE_MODULES[slot][choice.key].specialty ?? choice.skill.specialty
      }) : "";
      return `${t(`MWD.LifeModules.${slot}.${choice.key}`)}${skill ? ` (+1 ${skill})` : ""}`;
    };
    const factionLabel = draft.faction ? t(`MWD.Faction.${draft.faction}`) : system.details.faction;

    const update = {
      name: draft.name?.trim() || actor.name,
      "system.tags": draft.tags,
      "system.details.theme": draft.theme,
      "system.details.factionKey": draft.faction,
      "system.details.faction": factionLabel,
      "system.details.experience": draft.experience,
      "system.details.rank": draft.bio.rank,
      "system.details.age": draft.bio.age,
      "system.details.height": draft.bio.height,
      "system.details.weight": draft.bio.weight,
      "system.lifeModules.faction": factionLabel,
      "system.cues": draft.cues,
      "system.biography.history": textToHtml(draft.bio.history),
      "system.biography.personality": textToHtml(draft.bio.personality),
      "system.biography.disposition": draft.bio.disposition,
      "system.xp.value": Math.max(0, system.xp.value - (draft.appliedXp ?? 0) + xp),
      "system.xp.total": Math.max(0, system.xp.total - (draft.appliedXp ?? 0) + xp),
      "system.creation.complete": true,
      "system.creation.dispossessed": !!draft.dispossessed,
      "system.creation.bankedHardware": draft.dispossessed ? budget.hardware : 0,
      [`flags.${SYSTEM_ID}.creationDraft`]: { ...draft, appliedXp: xp }
    };
    for ( const key of BASE_ATTRIBUTES ) update[`system.attributes.${key}.value`] = draft.attributes[key];
    update["system.attributes.edg.value"] = draft.attributes.edg + draft.conversion.edge;
    for ( const slot of LIFE_MODULE_SLOTS ) update[`system.lifeModules.${slot}`] = moduleLabel(slot);
    if ( draft.hardware && !system.hardware.includes(draft.hardware.uuid) ) {
      update["system.hardware"] = [...system.hardware, draft.hardware.uuid];
    }

    const items = [
      ...finalSkills(draft).map(s => skillItemData(s)).filter(Boolean),
      ...draft.traits.map(tr => (tr.key ? bookTraitData(tr.key) : customTraitData(tr))).filter(Boolean),
      startingArmorData(draft.armor),
      freeWeaponData(draft.unarmed),
      ...draft.weapons.map(w => {
        const data = foundry.utils.deepClone(w.data);
        delete data._id;
        return data;
      }),
      ...draft.inventory.map(name => name?.trim()).filter(Boolean).map(gearData)
    ].filter(Boolean);

    if ( replaced.length ) await actor.deleteEmbeddedDocuments("Item", replaced.map(i => i.id));
    await actor.update(update);
    await actor.createEmbeddedDocuments("Item", items);

    const unit = draft.hardware ? await fromUuid(draft.hardware.uuid) : null;
    if ( unit?.isOwner && !unit.system.pilot ) await actor.boardHardware(unit);
  }
}
