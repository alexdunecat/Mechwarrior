import {
  ADVANCEMENT, ATTRIBUTES, BOOK_TRAITS, PERSONAL_RANGES, SKILLS, SPECIALTIES, SYSTEM_ID, WEIGHT_CLASSES
} from "../config.mjs";
import {
  attributeXpCost, canCustomize, dispossessedCost, hardwareXpCost, improveRange, repairUpdate, repairXpCost, skillXpCost,
  unitCondition
} from "../rules/advancement.mjs";
import { hardwareCost } from "../rules/creation.mjs";
import { bookTraitData, customTraitData, skillItemData } from "./item-data.mjs";

/**
 * Character Advancement (p. 77–78): every purchase spends XP, goes into the advancement log on the
 * character and can be undone from the log while it is the latest entry.
 */

const TEMPLATES = `systems/${SYSTEM_ID}/templates/dialog`;
const t = key => game.i18n.localize(key);
const f = (key, data) => game.i18n.format(key, data);

/**
 * Show a form dialog and return its data, or null when it is closed.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.template
 * @param {object} options.context
 * @param {string} [options.icon]
 * @param {string} [options.label]
 * @returns {Promise<object|null>}
 */
async function formDialog({ title, template, context, icon = "fa-solid fa-arrow-up", label = "MWD.Advance.Confirm" }) {
  const content = await foundry.applications.handlebars.renderTemplate(`${TEMPLATES}/${template}`, context);
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title, icon },
    classes: [SYSTEM_ID, "mwd-dialog"],
    position: { width: 440 },
    content,
    buttons: [{
      action: "ok",
      label,
      icon,
      default: true,
      callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object
    }],
    rejectClose: false
  });
  return (result && (typeof result === "object")) ? result : null;
}

/**
 * Spend XP on an advancement and record it.
 * @param {Actor} actor
 * @param {object} entry
 * @param {string} entry.kind
 * @param {string} entry.label
 * @param {number} entry.cost
 * @param {object|null} [entry.undo]  How to take it back, see undoLast.
 * @param {() => Promise<void>} apply
 * @returns {Promise<boolean>}  Whether it went through.
 */
async function purchase(actor, { kind, label, cost, undo = null }, apply) {
  const xp = actor.system.xp.value;
  if ( cost > xp ) {
    ui.notifications.warn(f("MWD.Advance.NotEnoughXp", { cost, xp }));
    return false;
  }
  await apply();
  await actor.update({
    "system.xp.value": xp - cost,
    "system.advancement": [...actor.system.advancement, { time: Date.now(), kind, label, cost, undo: undo ?? {} }]
  });
  return true;
}

/* -------------------------------------------- */
/*  Attributes and Skills                       */
/* -------------------------------------------- */

/**
 * Raise an Attribute by 1 (p. 77).
 * @param {Actor} actor
 * @param {string} key
 */
export async function improveAttribute(actor, key) {
  const current = actor.system.attributes[key].value;
  const cost = attributeXpCost(current + 1);
  if ( cost === null ) return ui.notifications.warn(f("MWD.Advance.AtMax", { max: ADVANCEMENT.attributeMax }));
  const name = t(ATTRIBUTES[key].abbr);
  return purchase(actor, {
    kind: "attribute",
    label: f("MWD.Advance.Log.attribute", { name, from: current, to: current + 1 }),
    cost,
    undo: { update: { [`system.attributes.${key}.value`]: current } }
  }, () => actor.update({ [`system.attributes.${key}.value`]: current + 1 }));
}

/**
 * Raise a Skill by 1 (p. 77).
 * @param {Actor} actor
 * @param {Item} skill
 */
export async function improveSkill(actor, skill) {
  const current = skill.system.rank;
  const cost = skillXpCost(current + 1);
  if ( cost === null ) return ui.notifications.warn(f("MWD.Advance.AtMax", { max: ADVANCEMENT.skillMax }));
  return purchase(actor, {
    kind: "skill",
    label: f("MWD.Advance.Log.skill", { name: skill.name, from: current, to: current + 1 }),
    cost,
    undo: { items: [{ _id: skill.id, "system.rank": current }] }
  }, () => skill.update({ "system.rank": current + 1 }));
}

/**
 * Ask for a Skill from the Skills List.
 * @param {object} [options]
 * @param {boolean} [options.withRank=true]  Ask for a rank too.
 * @returns {Promise<{key: string, rank: number, specialty: string, subject: string}|null>}
 */
export async function promptSkill({ withRank = true, title = "MWD.Skill.Add" } = {}) {
  const skills = Object.entries(SKILLS).map(([key, cfg]) => ({
    value: key,
    label: `${t(`MWD.Skill.${key}`)} (${t(ATTRIBUTES[cfg.attribute].abbr)})`
  })).sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
  const data = await formDialog({
    title,
    template: "add-skill.hbs",
    icon: "fa-solid fa-plus",
    label: title,
    context: { skills, withRank, specialties: Object.entries(SPECIALTIES).map(([value, label]) => ({ value, label })) }
  });
  if ( !data?.key ) return null;
  return { key: data.key, rank: Number(data.rank) || 1, specialty: data.specialty ?? "", subject: data.subject?.trim() ?? "" };
}

/**
 * Buy a new Skill at rating 1 for 2 XP (p. 77).
 * @param {Actor} actor
 */
export async function buyNewSkill(actor) {
  const choice = await promptSkill({ withRank: false, title: "MWD.Advance.NewSkill" });
  if ( !choice ) return;
  const data = skillItemData({ ...choice, rank: 1 });
  if ( SKILLS[choice.key].specialty && !choice.specialty ) return ui.notifications.warn("MWD.Advance.NeedSpecialty", { localize: true });
  if ( SKILLS[choice.key].subject && !choice.subject ) return ui.notifications.warn("MWD.Advance.NeedSubject", { localize: true });
  if ( actor.itemTypes.skill.some(s => s.name === data.name) ) return ui.notifications.warn("MWD.Advance.HasSkill", { localize: true });
  const id = foundry.utils.randomID();
  return purchase(actor, {
    kind: "newSkill",
    label: f("MWD.Advance.Log.newSkill", { name: data.name }),
    cost: ADVANCEMENT.newSkill,
    undo: { deleteItems: [id] }
  }, () => actor.createEmbeddedDocuments("Item", [{ ...data, _id: id }], { keepId: true }));
}

/* -------------------------------------------- */
/*  Traits                                      */
/* -------------------------------------------- */

/**
 * Buy a positive Trait for 6 XP (p. 77): one from the book the character does not have, or a
 * custom one. Equipped and Wealthy cannot be bought.
 * @param {Actor} actor
 */
export async function buyTrait(actor) {
  const owned = new Set(actor.itemTypes.trait.map(i => i.system.key).filter(Boolean));
  const choices = Object.entries(BOOK_TRAITS)
    .filter(([key, cfg]) => (cfg.polarity === "positive") && !cfg.noXp && !owned.has(key))
    .map(([key]) => ({ value: key, label: t(`MWD.BookTrait.${key}.name`) }))
    .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
  const data = await formDialog({
    title: "MWD.Advance.BuyTrait",
    template: "advance-trait.hbs",
    context: { choices, cost: ADVANCEMENT.trait }
  });
  if ( !data ) return;
  let itemData;
  if ( data.key ) {
    const requires = BOOK_TRAITS[data.key].requires;
    if ( requires && !owned.has(requires) ) {
      return ui.notifications.warn(f("MWD.Advance.TraitRequires", { name: t(`MWD.BookTrait.${requires}.name`) }));
    }
    itemData = bookTraitData(data.key);
  }
  else {
    if ( !data.name?.trim() ) return;
    itemData = customTraitData({
      name: data.name.trim(), polarity: "positive", modifier: Math.clamp(Number(data.modifier) || 0, 0, 1), appliesTo: data.appliesTo ?? ""
    });
  }
  const id = foundry.utils.randomID();
  return purchase(actor, {
    kind: "buyTrait",
    label: f("MWD.Advance.Log.buyTrait", { name: itemData.name }),
    cost: ADVANCEMENT.trait,
    undo: { deleteItems: [id] }
  }, () => actor.createEmbeddedDocuments("Item", [{ ...itemData, _id: id }], { keepId: true }));
}

/**
 * Pay 6 XP to remove a negative Trait (p. 77).
 * @param {Actor} actor
 * @param {Item} trait
 */
export async function removeTrait(actor, trait) {
  if ( trait.system.polarity !== "negative" ) return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "MWD.Advance.RemoveTrait" },
    content: `<p>${f("MWD.Advance.RemoveTraitConfirm", { name: trait.name, cost: ADVANCEMENT.trait })}</p>`,
    rejectClose: false
  });
  if ( !confirmed ) return;
  return purchase(actor, {
    kind: "removeTrait",
    label: f("MWD.Advance.Log.removeTrait", { name: trait.name }),
    cost: ADVANCEMENT.trait,
    undo: { createItems: [trait.toObject()] }
  }, () => trait.delete());
}

/* -------------------------------------------- */
/*  Weapons                                     */
/* -------------------------------------------- */

/**
 * Customize a weapon for 3 XP (p. 78).
 * @param {Actor} actor
 * @param {Item} weapon
 * @param {"accuracy"|"lethality"|"range"} mod
 */
export async function customizeWeapon(actor, weapon, mod) {
  if ( !canCustomize(weapon.system, mod) ) return ui.notifications.warn("MWD.Advance.CannotCustomize", { localize: true });
  let value = true;
  if ( mod === "range" ) {
    const brackets = Object.entries(PERSONAL_RANGES).filter(([key]) => {
      const code = weapon.system.ranges[key];
      return (code !== "x") && (Number(code) < 0);
    });
    value = await foundry.applications.api.DialogV2.wait({
      window: { title: "MWD.Advance.RangeTitle" },
      classes: [SYSTEM_ID, "mwd-dialog"],
      content: `<p>${t("MWD.Advance.RangeHint")}</p>`,
      buttons: brackets.map(([key, label]) => ({
        action: key,
        label: `${t(label)}: ${weapon.system.ranges[key]} → ${improveRange(weapon.system.ranges[key])}`
      })),
      rejectClose: false
    });
    if ( !value || !brackets.some(([key]) => key === value) ) return;
  }
  const modLabel = t(`MWD.Weapon.Mod.${mod}`);
  return purchase(actor, {
    kind: "weaponMod",
    label: f("MWD.Advance.Log.weaponMod", { name: weapon.name, mod: modLabel }),
    cost: ADVANCEMENT.weaponMod,
    undo: { items: [{ _id: weapon.id, [`system.mods.${mod}`]: weapon.system._source.mods[mod] }] }
  }, () => weapon.update({ [`system.mods.${mod}`]: value }));
}

/* -------------------------------------------- */
/*  Hardware                                    */
/* -------------------------------------------- */

/**
 * Repair or rebuild a unit (p. 78): 1 XP for functional Hardware, 2 XP when destroyed. Restores all
 * Armor and Structure and clears critical hits and destroyed Weapon Groups and Equipment.
 * @param {Actor} actor
 * @param {Actor} unit
 */
export async function repairHardware(actor, unit) {
  if ( !unit?.isOwner ) return ui.notifications.warn("MWD.Advance.NotUnitOwner", { localize: true });
  const { damaged, destroyed } = unitCondition(unit.type, unit.system);
  const broken = unit.items.filter(i => i.system.destroyed);
  if ( !damaged && !broken.length ) return ui.notifications.info("MWD.Advance.NotDamaged", { localize: true });
  return purchase(actor, {
    kind: destroyed ? "rebuild" : "repair",
    label: f(destroyed ? "MWD.Advance.Log.rebuild" : "MWD.Advance.Log.repair", { name: unit.name }),
    cost: repairXpCost(destroyed)
  }, async () => {
    await unit.update(repairUpdate(unit.type, unit.system._source));
    if ( broken.length ) await unit.updateEmbeddedDocuments("Item", broken.map(i => ({ _id: i.id, "system.destroyed": false })));
  });
}

/**
 * Acquire a unit during play (p. 76, 78): buy it (Hardware Points in XP, +2 for a 'Mech), salvage
 * it (Hardware Points –1), or pay with banked Hardware Points if the character started
 * Dispossessed (their first 'Mech costs 1 less).
 * @param {Actor} actor
 */
export async function acquireHardware(actor) {
  const owned = new Set(actor.system.hardware);
  const units = game.actors.filter(a => a.isUnit && a.isOwner && !owned.has(a.uuid))
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  if ( !units.length ) return ui.notifications.warn("MWD.Advance.NoUnits", { localize: true });
  const { bankedHardware, dispossessed } = actor.system.creation;
  const data = await formDialog({
    title: "MWD.Advance.AcquireHardware",
    template: "advance-hardware.hbs",
    icon: "fa-solid fa-robot",
    context: {
      units: units.map(u => ({
        uuid: u.uuid,
        label: `${u.name} (${t(`TYPES.Actor.${u.type}`)}, ${t(WEIGHT_CLASSES[u.system.details.weightClass]?.label ?? "")}, `
          + `${f("MWD.Advance.HardwarePoints", { n: hardwareCost(u.type, u.system.details.weightClass) })})`
      })),
      banked: bankedHardware,
      dispossessed,
      costs: { mech: ADVANCEMENT.mechPurchase, salvage: ADVANCEMENT.salvageDiscount }
    }
  });
  if ( !data?.unit ) return;
  const unit = await fromUuid(data.unit);
  if ( !unit ) return;
  const weightClass = unit.system.details.weightClass;
  const hardware = [...actor.system.hardware, unit.uuid];
  const label = f(`MWD.Advance.Log.${data.how}`, { name: unit.name });
  const undo = { update: { "system.hardware": actor.system.hardware } };

  if ( data.how === "banked" ) {
    const cost = (dispossessed && (unit.type === "mech")) ? dispossessedCost(weightClass) : hardwareCost(unit.type, weightClass);
    if ( cost > bankedHardware ) return ui.notifications.warn(f("MWD.Advance.NotEnoughHardware", { cost, banked: bankedHardware }));
    undo.update["system.creation.bankedHardware"] = bankedHardware;
    undo.update["system.creation.dispossessed"] = dispossessed;
    return purchase(actor, { kind: "hardware", label: `${label} (${f("MWD.Advance.HardwarePoints", { n: cost })})`, cost: 0, undo },
      () => actor.update({
        "system.hardware": hardware,
        "system.creation.bankedHardware": bankedHardware - cost,
        "system.creation.dispossessed": dispossessed && (unit.type !== "mech")
      }));
  }
  const cost = hardwareXpCost(data.how === "salvage" ? "salvage" : "buy", unit.type, weightClass);
  return purchase(actor, { kind: "hardware", label, cost, undo }, () => actor.update({ "system.hardware": hardware }));
}

/* -------------------------------------------- */
/*  XP awards and the log                       */
/* -------------------------------------------- */

/**
 * Award XP after a Mission (p. 77). GM only.
 * @param {Actor} actor
 */
export async function awardXp(actor) {
  if ( !game.user.isGM ) return;
  const data = await formDialog({
    title: "MWD.Advance.Award", template: "award-xp.hbs", icon: "fa-solid fa-star", label: "MWD.Advance.Award", context: {}
  });
  const amount = Math.max(0, Math.floor(Number(data?.amount) || 0));
  if ( !amount ) return;
  const reason = data.reason?.trim();
  await actor.update({
    "system.xp.value": actor.system.xp.value + amount,
    "system.xp.total": actor.system.xp.total + amount,
    "system.advancement": [...actor.system.advancement, {
      time: Date.now(),
      kind: "award",
      label: reason ? f("MWD.Advance.Log.awardFor", { n: amount, reason }) : f("MWD.Advance.Log.award", { n: amount }),
      cost: -amount,
      undo: { award: amount }
    }]
  });
}

/**
 * Take back the latest log entry: refund its XP (or remove awarded XP) and undo what it changed
 * where that is recorded. Repairs only refund the XP.
 * @param {Actor} actor
 */
export async function undoLast(actor) {
  const log = actor.system.advancement;
  const entry = log.at(-1);
  if ( !entry ) return;
  const undo = entry.undo ?? {};
  if ( undo.award && !game.user.isGM ) return ui.notifications.warn("MWD.Advance.AwardGmOnly", { localize: true });
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "MWD.Advance.Undo" },
    content: `<p>${f("MWD.Advance.UndoConfirm", { label: entry.label })}</p>`
      + ((["repair", "rebuild"].includes(entry.kind)) ? `<p class="hint">${t("MWD.Advance.UndoRepairHint")}</p>` : ""),
    rejectClose: false
  });
  if ( !confirmed ) return;
  if ( undo.items?.length ) await actor.updateEmbeddedDocuments("Item", undo.items.filter(u => actor.items.has(u._id)));
  if ( undo.deleteItems?.length ) await actor.deleteEmbeddedDocuments("Item", undo.deleteItems.filter(id => actor.items.has(id)));
  if ( undo.createItems?.length ) await actor.createEmbeddedDocuments("Item", undo.createItems, { keepId: true });
  const update = { ...(undo.update ?? {}), "system.advancement": log.slice(0, -1) };
  if ( undo.award ) {
    update["system.xp.value"] = Math.max(0, actor.system.xp.value - undo.award);
    update["system.xp.total"] = Math.max(0, actor.system.xp.total - undo.award);
  }
  else update["system.xp.value"] = actor.system.xp.value + entry.cost;
  await actor.update(update);
}

/* -------------------------------------------- */
/*  Sheet context                               */
/* -------------------------------------------- */

/**
 * What the Advancement tab shows: next-rank costs and which purchases are possible.
 * @param {Actor} actor
 * @returns {object}
 */
export function advancementContext(actor) {
  const system = actor.system;
  const xp = system.xp.value;
  const option = cost => ({ cost, affordable: (cost !== null) && (cost <= xp), max: cost === null });
  const byName = (a, b) => a.name.localeCompare(b.name, game.i18n.lang);
  const hardware = system.hardware.map(uuid => fromUuidSync(uuid)).filter(u => u?.isUnit).map(unit => {
    const { damaged, destroyed } = unitCondition(unit.type, unit.system);
    const broken = unit.items.some(i => i.system.destroyed);
    const cost = repairXpCost(destroyed);
    return {
      uuid: unit.uuid,
      name: unit.name,
      type: t(`TYPES.Actor.${unit.type}`),
      status: t(destroyed ? "MWD.Advance.Status.destroyed" : ((damaged || broken) ? "MWD.Advance.Status.damaged" : "MWD.Advance.Status.intact")),
      canRepair: damaged || broken,
      repairLabel: f(destroyed ? "MWD.Advance.RebuildFor" : "MWD.Advance.RepairFor", { cost }),
      affordable: cost <= xp,
      owner: unit.isOwner
    };
  });
  return {
    xp,
    log: [...system.advancement].reverse().map((e, i) => ({
      ...e,
      date: new Date(e.time).toLocaleDateString(game.i18n.lang),
      costLabel: e.cost < 0 ? `+${-e.cost}` : `–${e.cost}`,
      latest: i === 0
    })),
    attributes: Object.entries(ATTRIBUTES).map(([key, cfg]) => ({
      key, abbr: cfg.abbr, label: cfg.label, value: system.attributes[key].value, next: system.attributes[key].value + 1,
      ...option(attributeXpCost(system.attributes[key].value + 1))
    })),
    skills: [...actor.itemTypes.skill].sort(byName).map(s => ({
      id: s.id, name: s.name, rank: s.system.rank, next: s.system.rank + 1, ...option(skillXpCost(s.system.rank + 1))
    })),
    newSkill: option(ADVANCEMENT.newSkill),
    trait: option(ADVANCEMENT.trait),
    negativeTraits: actor.itemTypes.trait.filter(i => i.system.polarity === "negative").sort(byName)
      .map(i => ({ id: i.id, name: i.name })),
    weaponMod: option(ADVANCEMENT.weaponMod),
    weapons: [...actor.itemTypes.weapon].sort(byName).map(w => ({
      id: w.id,
      name: w.name,
      unique: w.system.unique,
      mods: ["accuracy", "lethality", "range"].map(mod => ({
        mod,
        label: t(`MWD.Weapon.Mod.${mod}`),
        taken: mod === "range" ? !!w.system.mods.range : w.system.mods[mod],
        available: canCustomize(w.system, mod)
      }))
    })),
    hardware,
    banked: system.creation.bankedHardware
  };
}
