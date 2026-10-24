import * as MWD from "./config.mjs";
import { CharacterData } from "./data/actor-character.mjs";
import { NpcData } from "./data/actor-npc.mjs";
import { ArmorData, GearData, SkillData, TraitData, WeaponData } from "./data/items.mjs";
import { MWDActor } from "./documents/actor.mjs";
import { CharacterSheet } from "./sheets/character-sheet.mjs";
import { NpcSheet } from "./sheets/npc-sheet.mjs";
import { MWDItemSheet } from "./sheets/item-sheet.mjs";
import { MWDCombat, INITIATIVE_FORMULA } from "./documents/combat.mjs";
import { onRenderChatMessage } from "./dice/test-roll.mjs";
import { registerSettings } from "./settings.mjs";
import { registerSocket } from "./socket.mjs";
import { PlotPointsPanel, spendPlotPoint, startNewSession } from "./apps/plot-points.mjs";

const { SYSTEM_ID } = MWD;

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initializing MechWarrior: Destiny`);
  CONFIG.MWD = MWD;
  game.mwd = {
    config: MWD,
    plotPoints: null,
    api: { spendPlotPoint, startNewSession }
  };
  registerSettings();
  game.keybindings.register(SYSTEM_ID, "plotPoints", {
    name: "MWD.PlotPoints.Open",
    editable: [{ key: "KeyP", modifiers: ["Shift"] }],
    onDown: () => {
      openPlotPoints();
      return true;
    }
  });

  CONFIG.Actor.documentClass = MWDActor;
  CONFIG.Combat.documentClass = MWDCombat;
  CONFIG.Combat.initiative = { formula: INITIATIVE_FORMULA, decimals: 0 };
  Object.assign(CONFIG.Actor.dataModels, { character: CharacterData, npc: NpcData });
  Object.assign(CONFIG.Item.dataModels, {
    skill: SkillData, trait: TraitData, weapon: WeaponData, armor: ArmorData, gear: GearData
  });
  CONFIG.Actor.trackableAttributes = {
    character: { bar: ["plotPoints"], value: ["edge.spent", "condition.physical.value", "condition.fatigue.value"] },
    npc: { bar: [], value: ["condition.physical.value", "condition.fatigue.value"] }
  };

  const sheets = foundry.applications.apps.DocumentSheetConfig;
  sheets.registerSheet(Actor, SYSTEM_ID, CharacterSheet, {
    types: ["character"], makeDefault: true, label: "MWD.Sheet.Character"
  });
  sheets.registerSheet(Actor, SYSTEM_ID, NpcSheet, {
    types: ["npc"], makeDefault: true, label: "MWD.Sheet.Npc"
  });
  sheets.registerSheet(Item, SYSTEM_ID, MWDItemSheet, { makeDefault: true, label: "MWD.Sheet.Item" });

  registerHandlebarsHelpers();
  return foundry.applications.handlebars.loadTemplates([
    `systems/${SYSTEM_ID}/templates/actor/parts/condition-monitor.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/parts/attributes.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/parts/skills.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/parts/weapons.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/parts/armor.hbs`,
    `systems/${SYSTEM_ID}/templates/actor/parts/item-list.hbs`,
    `systems/${SYSTEM_ID}/templates/item/description.hbs`
  ]);
});

Hooks.once("ready", () => {
  registerSocket();
  game.mwd.plotPoints = new PlotPointsPanel();
  if ( game.settings.get(SYSTEM_ID, "showPlotPoints") ) game.mwd.plotPoints.render({ force: true });
});

Hooks.on("renderChatMessageHTML", onRenderChatMessage);

// A button next to the token tools opens the Plot Points panel.
Hooks.on("getSceneControlButtons", controls => {
  const tokens = controls.tokens;
  if ( !tokens?.tools ) return;
  tokens.tools.mwdPlotPoints = {
    name: "mwdPlotPoints",
    title: "MWD.PlotPoints.Open",
    icon: "fa-solid fa-star",
    order: Object.keys(tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => openPlotPoints()
  };
});

// Keep the Plot Points panel in step with characters' sheets.
Hooks.on("updateActor", actor => {
  if ( actor.type === "character" ) game.mwd.plotPoints?.render();
});

/* -------------------------------------------- */

function openPlotPoints() {
  game.mwd.plotPoints ??= new PlotPointsPanel();
  game.mwd.plotPoints.render({ force: true });
}

function registerHandlebarsHelpers() {
  /** Format a modifier with an explicit sign: +3, –2, 0. */
  Handlebars.registerHelper("mwdSigned", value => {
    const n = Number(value) || 0;
    if ( n > 0 ) return `+${n}`;
    if ( n < 0 ) return `–${Math.abs(n)}`;
    return "0";
  });
}
