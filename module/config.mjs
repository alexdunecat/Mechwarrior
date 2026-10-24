/**
 * Static rules data for MechWarrior: Destiny.
 * This module must stay free of Foundry globals so it can be unit-tested in Node.
 */

export const SYSTEM_ID = "mechwarrior-destiny";

/** Attributes in sheet order. */
export const ATTRIBUTES = {
  str: { label: "MWD.Attribute.str.long", abbr: "MWD.Attribute.str.abbr" },
  rfl: { label: "MWD.Attribute.rfl.long", abbr: "MWD.Attribute.rfl.abbr" },
  int: { label: "MWD.Attribute.int.long", abbr: "MWD.Attribute.int.abbr" },
  wil: { label: "MWD.Attribute.wil.long", abbr: "MWD.Attribute.wil.abbr" },
  cha: { label: "MWD.Attribute.cha.long", abbr: "MWD.Attribute.cha.abbr" },
  edg: { label: "MWD.Attribute.edg.long", abbr: "MWD.Attribute.edg.abbr" }
};

export const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTES);

/**
 * The Skills List (p. 71). `specialty` skills are taken separately for BattleMech, combat vehicle
 * or aerospace fighter; `subject` skills (Knowledge) carry a free-text topic.
 */
export const SKILLS = {
  athletics: { attribute: "str" },
  supportWeapons: { attribute: "str", combat: true },
  escapeArtist: { attribute: "rfl" },
  gunnery: { attribute: "rfl", specialty: true },
  meleeCombat: { attribute: "rfl", combat: true },
  piloting: { attribute: "rfl", specialty: true },
  projectileWeapons: { attribute: "rfl", combat: true },
  smallArms: { attribute: "rfl", combat: true },
  stealth: { attribute: "rfl" },
  zeroG: { attribute: "rfl" },
  art: { attribute: "int" },
  artillery: { attribute: "int", combat: true },
  communications: { attribute: "int" },
  computers: { attribute: "int" },
  demolitions: { attribute: "int" },
  investigation: { attribute: "int" },
  knowledge: { attribute: "int", subject: true },
  medtech: { attribute: "int" },
  navigation: { attribute: "int" },
  perception: { attribute: "int" },
  science: { attribute: "int" },
  tactics: { attribute: "int" },
  technician: { attribute: "int" },
  tracking: { attribute: "int" },
  animalHandling: { attribute: "wil" },
  survival: { attribute: "wil" },
  acting: { attribute: "cha" },
  disguise: { attribute: "cha" },
  leadership: { attribute: "cha" },
  negotiation: { attribute: "cha" },
  protocol: { attribute: "cha" },
  streetwise: { attribute: "cha" },
  intimidation: { attribute: "cha" }
};

/** Hardware a Gunnery or Piloting skill is trained for. */
export const SPECIALTIES = {
  mech: "MWD.Specialty.mech",
  vehicle: "MWD.Specialty.vehicle",
  aero: "MWD.Specialty.aero"
};

/** Task difficulty and the number of opposing D6 the GM rolls (p. 32). */
export const DIFFICULTIES = {
  easy: { label: "MWD.Difficulty.easy", dice: 2 },
  average: { label: "MWD.Difficulty.average", dice: 3 },
  hard: { label: "MWD.Difficulty.hard", dice: 4 }
};

/** Experience levels and their character-creation budgets (p. 69–70). */
export const EXPERIENCE_LEVELS = {
  green: { label: "MWD.Experience.green", attributes: 3, skills: 8, weapons: 1, hardware: 1 },
  regular: { label: "MWD.Experience.regular", attributes: 5, skills: 12, weapons: 2, hardware: 2 },
  veteran: { label: "MWD.Experience.veteran", attributes: 7, skills: 16, weapons: 3, hardware: 3 },
  elite: { label: "MWD.Experience.elite", attributes: 9, skills: 20, weapons: 4, hardware: 4 }
};

/** Personal weapon damage types that armor can reduce (p. 36). */
export const DAMAGE_TYPES = {
  "": "MWD.DamageType.none",
  B: "MWD.DamageType.B",
  E: "MWD.DamageType.E"
};

/** Personal Combat range brackets (p. 35). */
export const PERSONAL_RANGES = {
  close: "MWD.Range.close",
  near: "MWD.Range.near",
  far: "MWD.Range.far"
};

/**
 * Range notation codes stored on weapons: "0" is OK, negative numbers are penalties,
 * "x" means the weapon cannot be used at that range.
 */
export const RANGE_CODES = {
  0: "OK",
  "-1": "–1",
  "-2": "–2",
  "-3": "–3",
  "-4": "–4",
  x: "—"
};

/** Traits with rules the system automates. Anything else is applied from the Test dialog. */
export const TRAIT_EFFECTS = {
  "": "MWD.Trait.Effect.none",
  toughness: "MWD.Trait.Effect.toughness",
  painResistance: "MWD.Trait.Effect.painResistance"
};

/** Base Initiative modifier by Experience Level for the optional rolled Initiative (p. 55). */
export const INITIATIVE_BY_EXPERIENCE = {
  green: -1,
  regular: 0,
  veteran: 1,
  elite: 2
};

/** Turn-order modes for the combat tracker (p. 30, 55). */
export const INITIATIVE_MODES = {
  narrative: "MWD.Initiative.Mode.narrative",
  rolled: "MWD.Initiative.Mode.rolled",
  cinematic: "MWD.Initiative.Mode.cinematic"
};

export const TRAIT_POLARITIES = {
  positive: "MWD.Trait.positive",
  negative: "MWD.Trait.negative"
};

/** Plot Point limits (p. 31). */
export const PLOT_POINTS = {
  playerStart: 3,
  playerMax: 5,
  gmStart: 1
};

/**
 * Ways to spend a Plot Point (p. 31–32). Each costs one point; ejection costs all of them.
 * `mech` uses are only available in 'Mech-Scale Combat.
 */
export const PLOT_POINT_USES = {
  turnOrder: { label: "MWD.PlotPoints.Use.turnOrder" },
  doubleTime: { label: "MWD.PlotPoints.Use.doubleTime" },
  firstAid: { label: "MWD.PlotPoints.Use.firstAid" },
  takeTheHit: { label: "MWD.PlotPoints.Use.takeTheHit" },
  coldDish: { label: "MWD.PlotPoints.Use.coldDish" },
  twist: { label: "MWD.PlotPoints.Use.twist" },
  headHit: { label: "MWD.PlotPoints.Use.headHit", mech: true },
  pushIt: { label: "MWD.PlotPoints.Use.pushIt", mech: true },
  fightThrough: { label: "MWD.PlotPoints.Use.fightThrough", mech: true },
  downgrade: { label: "MWD.PlotPoints.Use.downgrade", mech: true },
  support: { label: "MWD.PlotPoints.Use.support", mech: true },
  other: { label: "MWD.PlotPoints.Use.other" }
};

/** Condition Monitor rows and the CON Check target number for each (character sheet, p. 47). */
export const CONDITION_ROWS = [
  { modifier: -1, conCheck: 3 },
  { modifier: -2, conCheck: 5 },
  { modifier: -3, conCheck: 7 },
  { modifier: -4, conCheck: 10 }
];

export const PIPS_PER_ROW = 3;

/** CON Check target once Staggered on the Physical track. */
export const STAGGERED_CON_CHECK = 11;

/* -------------------------------------------- */
/*  'Mech-Scale Combat (p. 38–51)               */
/* -------------------------------------------- */

/** Hardware weight classes and their usual Movement (p. 39, 79). */
export const WEIGHT_CLASSES = {
  light: { label: "MWD.Mech.Weight.light", movement: 4 },
  medium: { label: "MWD.Mech.Weight.medium", movement: 3 },
  heavy: { label: "MWD.Mech.Weight.heavy", movement: 2 },
  assault: { label: "MWD.Mech.Weight.assault", movement: 1 }
};

/** 'Mech locations in Armor Diagram order, with the 2D6 results that hit them (p. 44–45). */
export const MECH_LOCATIONS = {
  head: { label: "MWD.Mech.Location.head", abbr: "MWD.Mech.Location.headAbbr", rolls: "12" },
  rightArm: { label: "MWD.Mech.Location.rightArm", abbr: "MWD.Mech.Location.rightArmAbbr", rolls: "3–4", limb: true },
  torso: { label: "MWD.Mech.Location.torso", abbr: "MWD.Mech.Location.torsoAbbr", rolls: "2, 6–8" },
  leftArm: { label: "MWD.Mech.Location.leftArm", abbr: "MWD.Mech.Location.leftArmAbbr", rolls: "10–11", limb: true },
  rightLeg: { label: "MWD.Mech.Location.rightLeg", abbr: "MWD.Mech.Location.rightLegAbbr", rolls: "5", limb: true, leg: true },
  leftLeg: { label: "MWD.Mech.Location.leftLeg", abbr: "MWD.Mech.Location.leftLegAbbr", rolls: "9", limb: true, leg: true }
};

export const MECH_LOCATION_KEYS = Object.keys(MECH_LOCATIONS);

/** 2D6 hit location table for 'Mechs (p. 45 Armor Diagram). */
export const MECH_HIT_TABLE = {
  2: "torso", 3: "rightArm", 4: "rightArm", 5: "rightLeg", 6: "torso", 7: "torso",
  8: "torso", 9: "leftLeg", 10: "leftArm", 11: "leftArm", 12: "head"
};

/** 'Mech-Scale range brackets (p. 39). */
export const MECH_RANGES = {
  pointblank: "MWD.Mech.Range.pointblank",
  short: "MWD.Mech.Range.short",
  medium: "MWD.Mech.Range.medium",
  long: "MWD.Mech.Range.long"
};

/** Terrain modifiers to attacks against a target in that terrain (p. 42). */
export const MECH_TERRAIN = {
  clear: { label: "MWD.Mech.Terrain.clear", modifier: 0 },
  lightWoods: { label: "MWD.Mech.Terrain.lightWoods", modifier: -1 },
  heavyWoods: { label: "MWD.Mech.Terrain.heavyWoods", modifier: -2 },
  shallowWater: { label: "MWD.Mech.Terrain.shallowWater", modifier: -1 },
  deepWater: { label: "MWD.Mech.Terrain.deepWater", modifier: -2 },
  partialCover: { label: "MWD.Mech.Terrain.partialCover", modifier: -1, ignoreLegs: true }
};

/** Heat Effects table (p. 48): effects are cumulative from lower levels. */
export const HEAT_LEVELS = [
  { tokens: 0, key: "blue" },
  { tokens: 1, key: "green" },
  { tokens: 2, key: "yellow" },
  { tokens: 3, key: "orange" },
  { tokens: 4, key: "red" },
  { tokens: 5, key: "critical" }
];

/** Physical attack types (p. 43). */
export const PHYSICAL_ATTACKS = {
  punch: { label: "MWD.Mech.Physical.punch", table: "punch" },
  kick: { label: "MWD.Mech.Physical.kick", table: "kick" },
  push: { label: "MWD.Mech.Physical.push", table: null },
  charge: { label: "MWD.Mech.Physical.charge", table: "standard", movement: true },
  dfa: { label: "MWD.Mech.Physical.dfa", table: "punch", movement: true }
};

/** Kinds of 'Mech equipment the rules look at. */
export const MECH_EQUIPMENT_KINDS = {
  ammo: "MWD.Mech.Equipment.ammo",
  jumpJets: "MWD.Mech.Equipment.jumpJets",
  other: "MWD.Mech.Equipment.other"
};

/** Physical damage to a MechWarrior from a head hit or an ammo explosion (p. 47). */
export const PILOT_HIT_DAMAGE = 3;

/** 2D6 result needed to avoid shutdown, ammo explosion, a critical hit, or to restart (p. 45, 48). */
export const MECH_TARGET_NUMBER = 8;

/** Natural 2D6 needed to hit a Disengaged unit (p. 41). */
export const DISENGAGED_TARGET = 11;
