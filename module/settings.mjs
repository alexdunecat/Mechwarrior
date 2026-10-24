import { INITIATIVE_MODES, PLOT_POINTS, SYSTEM_ID } from "./config.mjs";

export function registerSettings() {
  game.settings.register(SYSTEM_ID, "gmPlotPoints", {
    name: "MWD.Settings.gmPlotPoints.name",
    scope: "world",
    config: false,
    type: Number,
    default: PLOT_POINTS.gmStart,
    onChange: () => game.mwd?.plotPoints?.render()
  });

  game.settings.register(SYSTEM_ID, "initiativeMode", {
    name: "MWD.Settings.initiativeMode.name",
    hint: "MWD.Settings.initiativeMode.hint",
    scope: "world",
    config: true,
    type: String,
    choices: INITIATIVE_MODES,
    default: "narrative"
  });

  game.settings.register(SYSTEM_ID, "showPlotPoints", {
    name: "MWD.Settings.showPlotPoints.name",
    hint: "MWD.Settings.showPlotPoints.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
}
