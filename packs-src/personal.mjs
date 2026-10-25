/*
 * Personal-scale equipment from the Warrior's Catalog (p. 155–156), as printed.
 *
 * Weapon rows: [name, damage, close, near, far, special]. Damage is the book's code: "2S" adds the
 * STR bonus, a trailing "F" deals Fatigue damage. Ranges are "OK", "–2" or "—".
 */

const TWO_TARGETS = "May attack up to two different targets per Narration.";
const THREE_TARGETS = "May attack up to three different targets per Narration.";
const SPLIT = "May split damage across two eligible targets within range.";
const NEEDLER = "Every 2 damage reduces the target's Armor by 1 pip. Condition Monitor pips are damaged as normal.";
const FREE = "Does not count against the weapon total.";

/** Weapon groups: folder name, Skill used for the Attack Test, and the rows. */
export const WEAPON_GROUPS = [
  {
    folder: "Melee Weapons", skill: "meleeCombat", rows: [
      ["Martial Arts", "2SF", "OK", "—", "—", FREE],
      ["Unarmed", "2SF", "OK", "—", "—", FREE],
      ["Axe", "2S", "OK", "—", "—"],
      ["Blackjack/Sap", "3SF", "–2", "—", "—"],
      ["Club", "1S", "OK", "—", "—"],
      ["Dao", "2S", "OK", "—", "—"],
      ["Fingernails (Carbon-Fiber Reinforced)", "1S", "–2", "—", "—"],
      ["Hatchet/Tomahawk", "1S", "OK", "—", "—"],
      ["Knife/Dagger/Bayonet", "1S", "–2", "—", "—"],
      ["Medusa Whip", "1F", "OK", "–2", "—"],
      ["Monowire", "5", "–2", "—", "—"],
      ["Neural Whip", "5F", "OK", "—", "—"],
      ["No-Dachi", "3S", "OK", "—", "—"],
      ["Nunchaku", "1S", "OK", "—", "—"],
      ["Polearm", "2S", "OK", "—", "—"],
      ["Scimitar", "2S", "OK", "—", "—"],
      ["Staff", "2S", "OK", "—", "—"],
      ["Stunstick", "4F", "OK", "—", "—"],
      ["Sword/Katana", "2S", "OK", "—", "—"],
      ["Vibroaxe", "4S", "OK", "—", "—"],
      ["Vibrodagger", "2S", "–2", "—", "—"],
      ["Vibromace", "5S", "–2", "—", "—"],
      ["Vibrosword", "3S", "OK", "—", "—"],
      ["Wakizashi", "1S", "OK", "—", "—"]
    ]
  },
  {
    folder: "Projectile/Thrown Weapons", skill: "projectileWeapons", rows: [
      ["Compound Bow", "2S", "OK", "OK", "OK"],
      ["Dart/Shuriken", "1", "OK", "–2", "—"],
      ["Heavy Crossbow", "3", "OK", "OK", "–2"],
      ["Light Crossbow", "2", "OK", "OK", "—"],
      ["Long Bow/Daikyu", "2S", "OK", "OK", "OK"],
      ["Short Bow/Hankyu", "1S", "OK", "OK", "–2"],
      ["Spear", "2S", "OK", "–2", "—"]
    ]
  },
  {
    folder: "Ballistic Weapons", skill: "smallArms", type: "B", rows: [
      ["Auto-Pistol (B)", "4", "OK", "OK", "—"],
      ["Hold-Out Pistol (B)", "3", "OK", "–2", "—"],
      ["Revolver (B)", "4", "OK", "–2", "—"],
      ["Submachine Gun (B)", "3", "OK", "OK", "—", TWO_TARGETS],
      ["Elephant Gun (B)", "6", "–2", "OK", "OK"],
      ["Rifle (B)", "4", "OK", "OK", "–2"],
      ["Assault Rifle (B)", "3", "OK", "OK", "–2", TWO_TARGETS],
      ["Sniper Rifle (B)", "4", "–2", "OK", "OK"]
    ]
  },
  {
    folder: "Energy Weapons", skill: "smallArms", type: "E", rows: [
      ["Laser Pistol (E)", "3", "OK", "OK", "OK"],
      ["Laser Pistol (Hold-Out) (E)", "2", "OK", "OK", "—"],
      ["Laser Rifle (E)", "4", "OK", "OK", "OK"]
    ]
  },
  {
    folder: "Flechette Weapons", skill: "smallArms", rows: [
      ["Needler Pistol", "5", "OK", "–2", "—", NEEDLER],
      ["Needler Rifle", "5", "OK", "OK", "—", NEEDLER],
      ["Needler Pistol (Hold-Out)", "5", "OK", "—", "—", NEEDLER],
      ["Combat Shotgun (B)", "5", "OK", "–2", "—", SPLIT, "B"],
      ["Pump Shotgun (B)", "6", "OK", "–2", "—", SPLIT, "B"]
    ]
  },
  {
    folder: "Gyrojet Weapons", skill: "smallArms", rows: [
      ["Gyrojet Pistol", "4", "OK", "OK", "–2"],
      ["Gyrojet Rifle", "5", "OK", "OK", "OK"]
    ]
  },
  {
    folder: "Special Weapons", skill: "smallArms", rows: [
      ["Dart Gun", "3F", "OK", "–2", "—"],
      ["Flare Gun", "3", "OK", "–2", "—", "The fire from the flare damages the target for two rounds unless extinguished."],
      ["Harpoon Gun (B)", "3", "OK", "–2", "—", "Fires a grappling cable.", "B"],
      ["Paint Gun", "0", "–2", "—", "—", "Sprays a liquid payload (paint or water)."],
      ["Sonic Stunner", "4F", "OK", "–2", "—"],
      ["Wakizashi ShotStun (B)", "5", "OK", "–2", "—", `Includes an extendable Stunstick (4F, OK/—/—). ${SPLIT}`, "B"]
    ]
  },
  {
    folder: "Support Weapons", skill: "supportWeapons", support: true, rows: [
      ["Autocannon (Semi-Portable) (B)", "5", "OK", "OK", "OK", TWO_TARGETS, "B"],
      ["Machine Gun (B)", "4", "OK", "OK", "OK", TWO_TARGETS, "B"],
      ["Grenade Launcher (High-Explosive)", "8", "–2", "OK", "OK", THREE_TARGETS],
      ["Grenade Launcher (Anti-Personnel)", "10", "–2", "OK", "OK", THREE_TARGETS],
      ["Mortar (High-Explosive)", "11", "—", "–2", "OK", `Uses the Artillery Skill for the Attack Test. ${THREE_TARGETS}`, "", "artillery"],
      ["Mortar (Anti-Personnel)", "13", "—", "–2", "OK", `Uses the Artillery Skill for the Attack Test. ${THREE_TARGETS}`, "", "artillery"],
      ["LAW (Rocket Launcher)", "10", "—", "OK", "OK", `Single use. ${THREE_TARGETS}`],
      ["SRM Launcher (Standard)", "12", "—", "OK", "OK",
        `In 'Mech-Scale Combat: 1+M (Max 2). ${THREE_TARGETS}`],
      ["SRM Launcher (Inferno)", "0", "—", "OK", "OK", `Inferno warheads: H on a D6 roll of 1–3. ${THREE_TARGETS}`]
    ]
  },
  {
    folder: "Explosives", skill: "projectileWeapons", rows: [
      ["Thrown Grenade (High-Explosive)", "8", "OK", "–2", "—", "May attack up to three different targets."],
      ["Thrown Grenade (Anti-Personnel)", "10", "OK", "–2", "—", "May attack up to three different targets."],
      ["C8 Satchel Charge", "12", "OK", "—", "—",
        "Personal Combat: may attack up to three targets. 'Mech-Scale Combat: 1 damage.", "", "demolitions"]
    ]
  }
];

/** Armor (p. 156): pips, damage reduction and RFL penalty. */
export const ARMOR = [
  { name: "Ablative Armor", key: "ablative", pips: 10, reduceE: 2 },
  { name: "Ablative/Flak Armor", key: "ablativeFlak", pips: 10, reduceB: 1, reduceE: 1 },
  { name: "Ballistic Plate Armor", key: "ballisticPlate", pips: 12, reduceB: 3, rflPenalty: 1 },
  { name: "Concealed Ablative Armor", key: "concealedAblative", pips: 8, reduceE: 1, concealed: true },
  { name: "Concealed Flak Armor", key: "concealedFlak", pips: 8, reduceB: 1, concealed: true },
  { name: "Flak Armor", key: "flak", pips: 10, reduceB: 2 },
  { name: "Infiltration Suit", key: "infiltration", pips: 8, reduceB: 1, reduceE: 1, concealed: true }
];

/** Inventory ideas by category (p. 156). Items have no stats; they are Cues for Narrations. */
export const INVENTORY = {
  "Audiovisual Gear": ["Holomap", "Micro-Recorder", "Video Camera"],
  "Communications Gear": ["Communications Kit", "Personal Communicator"],
  "Computing Gear": ["Audio/Video Storage Chip", "Computer Diagnostic Equipment", "Engineering Console", "Noteputer",
    "Verigraph Scanner"],
  "Espionage Gear": ["Demolition Kit", "Disguise Kit", "Forensics Kit", "Forgery Kit", "Lock Pick Set",
    "Neurohelmet Codebreaker", "Polygraph", "Wiretap Kit"],
  "Hostile Environment Gear": ["Environment Suit", "Respirator", "SCUBA Gear", "Snow Suit", "Wetsuit"],
  "Medical Gear": ["Field Surgical Kit", "Laser Scalpel", "Medical Kit", "Medipack", "Medpatch", "Plastiflesh Bandage",
    "Sedative Patch", "Stimpatch"],
  "Optical Gear": ["Binoculars", "Night Vision Goggles"],
  "Power Gear": ["Fusion Recharger", "Power Pack", "Solar Recharger"],
  "Repair & Salvage Gear": ["Aerospace Repair Kit", "Basic Toolkit", "BattleMech Repair Kit", "Electronics Repair Kit",
    "Laser Torch", "Vehicle Repair Kit"],
  "Surveillance Gear": ["Bug Scanner", "Laser Microphone", "Microphone Bug", "Sensor (Heat, Motion, Radar, or Seismic)",
    "Tracking Bug", "White Noise Generator"],
  "Survival Gear": ["Compass", "Emergency Flares", "Emergency Rations", "Field Kit", "Jump Pack", "Parachute", "Tent"]
};
