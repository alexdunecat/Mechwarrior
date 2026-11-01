/*
 * Clan Invasion appendix (p. 195–234), as printed: OmniMechs and OmniFighters in their Primary
 * Configuration (p. 223–233), the Elemental (p. 234), Lachlan's salvage vehicle (p. 207) and the
 * 3050 Clan weapons table (p. 217).
 *
 * Rows work as in units.mjs. LB-X damage carries its cluster value, "2 (C2)"; a Streak weapon is
 * named so. Equipment may give its location and CASE, "Ammo: SRM (Torso, CASE)", or a number of
 * tracked shots, "A-Pods [4]". "MASC" adds the bracketed Movement. Ammo listed for two locations
 * becomes one bin in each.
 */

export const CLAN_MECHS = [
  {
    name: "Fire Moth", model: "Prime", designation: "Dasher", weight: "light", tonnage: 20, movement: 5, heat: 4,
    tags: "Infantry Support, Clan Ghost Bear, Speed Demon, Under-Armored, Overhead Arms",
    armor: { head: [2, 1], torso: [2, 2], arms: [1, 1], legs: [1, 1] },
    weapons: [
      "SRM 6, SRM 4 | 3+MM (Max 7) | M | H | RA, T | OK OK –2 —",
      "2 ER Medium Lasers | 6 | E | HH | LA | OK OK –2 —"
    ],
    equipment: ["Ammo: SRM (Right Arm, CASE)", "Ammo: SRM (Torso, CASE)", "MASC"]
  },
  {
    name: "Mist Lynx", model: "Prime", designation: "Koshi", weight: "light", tonnage: 25, movement: 4, jump: true, heat: 4,
    tags: "Recon, Clan Smoke Jaguar, Common, Ammo Dependent, Maneuverable",
    armor: { head: [2, 1], torso: [3, 3], arms: [1, 1], legs: [2, 2] },
    weapons: [
      "Primary: LRM 10 | 1+M (Max 4) | M | H | LA | OK OK OK –2",
      "Streak SRM 4 | 3 | M | H | RA | OK OK –2 —",
      "2 Machine Guns | 2 | B | — | RA | OK OK — —"
    ],
    equipment: ["Active Probe", "Ammo: LRM (Left Arm, CASE)", "Ammo: SRM (Right Arm, CASE)",
      "Ammo: Machine Gun (Right Arm, CASE)", "Jump Jets"]
  },
  {
    name: "Kit Fox", model: "Prime", designation: "Uller", weight: "light", tonnage: 30, movement: 3, heat: 4,
    tags: "Sniper, Clan Jade Falcon, Configurable, Slow for Class, Long-Range Focus",
    armor: { head: [3, 1], torso: [3, 3], arms: [2, 2], legs: [3, 2] },
    weapons: [
      "Primary: ER Large Laser | 4 | E | HH | LA | OK OK –2 –4",
      "LB 5-X AC | 2 (C2) | B | — | RA | –2 OK OK –2",
      "Streak SRM 4 | 3 | M | H | RA | OK OK –2 —",
      "Small Pulse Laser | 1 | E | — | LA | +2 +2 — —"
    ],
    equipment: ["Ammo: LB 5-X AC (Right Arm, CASE)", "Ammo: SRM (Right Arm, CASE)"]
  },
  {
    name: "Adder", model: "Prime", designation: "Puma", weight: "light", tonnage: 35, movement: 3, heat: 4,
    tags: "Brawler, Common, Feared, Heat Monster, Distinctive Hood",
    armor: { head: [3, 1], torso: [5, 4], arms: [4, 2], legs: [5, 3] },
    weapons: [
      "ER PPC | 5 | E | HHH | RA | +1 +1 +1 –1",
      "ER PPC | 5 | E | HHH | RA | +1 +1 +1 –1"
    ],
    equipment: ["Targeting Computer"]
  },
  {
    name: "Viper", model: "Prime", designation: "Dragonfly", weight: "medium", tonnage: 40, movement: 4, jump: true, heat: 4,
    tags: "Striker, Clan Ghost Bear, Fast, Combined-Arms Tactics, Short-Ranged Weapons",
    armor: { head: [3, 1], torso: [5, 4], arms: [4, 2], legs: [6, 3] },
    weapons: [
      "2 Medium Pulse Lasers | 5 | E | HH | RA | +2 +2 OK —",
      "SRM 4 | 1+M (Max 3) | M | H | LA | OK OK –2 —",
      "2 Machine Guns | 2 | B | — | T | OK OK — —"
    ],
    equipment: ["Ammo: Anti-Missile System (Torso, CASE)", "Ammo: Machine Gun (Torso, CASE)",
      "Ammo: SRM (Left Arm, CASE)", "Anti-Missile System", "Jump Jets"]
  },
  {
    name: "Ice Ferret", model: "Prime", designation: "Fenris", weight: "medium", tonnage: 45, movement: 4, heat: 5,
    tags: "Sniper, Clan Wolf, Swift, Stigma, Mobile",
    armor: { head: [3, 1], torso: [8, 5], arms: [5, 2], legs: [6, 4] },
    weapons: [
      "Primary: ER PPC | 5 | E | HHH | LA | OK OK OK –2",
      "Streak SRM 2 | 2 | M | — | RA | OK OK –2 —",
      "ER Small Laser | 2 | E | H | LA | OK OK — —"
    ],
    equipment: ["Ammo: SRM (Right Arm, CASE)", "Active Probe"]
  },
  {
    name: "Nova", model: "Prime", designation: "Black Hawk", weight: "medium", tonnage: 50, movement: 3, jump: true, heat: 7,
    tags: "Second Fiddle, Uncommon, Over-Armed, Heat Monster, Jack of All Trades",
    armor: { head: [3, 1], torso: [8, 5], arms: [5, 3], legs: [7, 4] },
    weapons: [
      "3 ER Medium Lasers | 7 | E | HHH | RA | OK OK –2 —",
      "3 ER Medium Lasers | 7 | E | HHH | RA | OK OK –2 —",
      "3 ER Medium Lasers | 7 | E | HHH | LA | OK OK –2 —",
      "3 ER Medium Lasers | 7 | E | HHH | LA | OK OK –2 —"
    ],
    equipment: ["Jump Jets"]
  },
  {
    name: "Stormcrow", model: "Prime", designation: "Ryoken", weight: "medium", tonnage: 55, movement: 3, heat: 9,
    tags: "Hunter/Killer, Common, Heavily Armored, Duelist, Versatile",
    armor: { head: [3, 1], torso: [8, 6], arms: [6, 3], legs: [8, 4] },
    weapons: [
      "2 ER Large Lasers | 7 | E | HHHHH | RA, LA | OK OK OK –2",
      "2 ER Medium Lasers | 5 | E | HH | RA, LA | OK OK –2 —",
      "ER Medium Laser | 3 | E | H | H | OK OK –2 —"
    ],
    equipment: []
  },
  {
    name: "Mad Dog", model: "Prime", designation: "Vulture", weight: "heavy", tonnage: 60, movement: 3, heat: 5,
    tags: "Fire Support, Clan Smoke Jaguar, Long-Range Loadout, Common, Distinctive Silhouette",
    armor: { head: [3, 1], torso: [8, 7], arms: [5, 3], legs: [8, 5] },
    weapons: [
      "2 Large Pulse Lasers | 7 | E | HHHH | RA, LA | +2 +2 +2 OK",
      "2 LRM 20 | 8+MM (Max 14) | M | HH | T | OK OK OK –2",
      "2 Medium Pulse Lasers | 5 | E | HH | RA, LA | +2 +2 OK —"
    ],
    equipment: ["Ammo: LRM (Torso, CASE)"]
  },
  {
    name: "Hellbringer", model: "Prime", designation: "Loki", weight: "heavy", tonnage: 65, movement: 3, heat: 5,
    tags: "Peculiar Loadout, Clan Jade Falcon, Obsolete, Under-Armored, Questionable Success",
    armor: { head: [3, 1], torso: [6, 7], arms: [4, 3], legs: [5, 5] },
    weapons: [
      "2 ER PPC | 10 | E | HHHHHH | RA, LA | +1 +1 +1 –1",
      "3 ER Medium Lasers | 7 | E | HHH | T | +1 +1 –1 —",
      "Streak SRM 6 | 4 | M | H | T | OK OK –2 —",
      "2 Machine Guns | 2 | B | — | T | +1 +1 — —"
    ],
    equipment: ["Active Probe", "A-Pods [4]", "Ammo: Anti-Missile System (Torso, CASE)", "Ammo: Machine Gun (Torso, CASE)",
      "Ammo: SRM (Torso, CASE)", "Anti-Missile System", "ECM Suite", "Targeting Computer"]
  },
  {
    name: "Summoner", model: "Prime", designation: "Thor", weight: "heavy", tonnage: 70, movement: 3, jump: true, heat: 6,
    tags: "Raider, Clan Jade Falcon, Mobile, Lean Loadout, Off-Center Cockpit",
    armor: { head: [3, 1], torso: [9, 7], arms: [6, 4], legs: [8, 5] },
    weapons: [
      "Primary: ER PPC | 5 | E | HHH | RA | OK OK OK –2",
      "LB 10-X AC | 4 (C4) | B | — | LA | OK OK –2 –4",
      "LRM 15 | 2+M (Max 5) | M | H | T | OK OK OK –2"
    ],
    equipment: ["Ammo: Autocannon (Left Arm, CASE)", "Ammo: LRM (Torso, CASE)", "Jump Jets"]
  },
  {
    name: "Timber Wolf", model: "Prime", designation: "Mad Cat", weight: "heavy", tonnage: 75, movement: 3, heat: 7,
    tags: "Balanced, Clan Wolf, Well-Armored, Lethal, Iconic",
    armor: { head: [3, 1], torso: [12, 8], arms: [8, 4], legs: [11, 5] },
    weapons: [
      "2 ER Large Lasers | 7 | E | HHHHH | RA, LA | OK OK OK –2",
      "2 LRM 20 | 8+MM (Max 14) | M | HH | T | OK OK OK –2",
      "2 ER Medium Lasers | 5 | E | HH | RA, LA | OK OK –2 —",
      "Medium Pulse Laser, 2 Machine Guns | 4 | E, B | H | T | OK OK — —"
    ],
    equipment: ["Ammo: LRM (Torso, CASE)", "Ammo: Machine Gun (Torso, CASE)"]
  },
  {
    name: "Gargoyle", model: "Prime", designation: "Man O’ War", weight: "assault", tonnage: 80, movement: 3, heat: 6,
    tags: "Shock Trooper, Clan Wolf, Fastest Assault OmniMech, Light Loadout, Weakness: Arm Amputation",
    armor: { head: [3, 1], torso: [10, 8], arms: [8, 4], legs: [8, 6] },
    weapons: [
      // The book prints "4 (C4, C4)": two LB 5-X of C2 each, so all 4 points as cluster hits.
      "2 LB 5-X AC | 4 (C4) | B | H | RA, LA | –2 OK OK –2",
      "2 SRM 6 | 4+MM (Max 8) | M | HH | RA, LA | OK OK –2 —",
      "ER Small Laser | 2 | E | H | T | OK OK — —"
    ],
    equipment: ["Ammo: Autocannon (Torso, CASE)", "Ammo: SRM (Torso, CASE)"]
  },
  {
    name: "Warhawk", model: "Prime", designation: "Masakari", weight: "assault", tonnage: 85, movement: 2, heat: 8,
    tags: "Frontal Assault, Clan Smoke Jaguar, Deadly, Heat Monster, Squat & Boxy",
    armor: { head: [3, 1], torso: [14, 9], arms: [9, 5], legs: [12, 6] },
    weapons: [
      "2 ER PPC | 10 | E | HHHHHH | RA | +1 +1 +1 –1",
      "2 ER PPC | 10 | E | HHHHHH | LA | +1 +1 +1 –1",
      "LRM 10 | 1+M (Max 4) | M | H | T | OK OK OK –2"
    ],
    equipment: ["Ammo: LRM (Torso, CASE)", "Targeting Computer"]
  },
  {
    name: "Executioner", model: "Prime", designation: "Gladiator", weight: "assault", tonnage: 95, movement: 2, jump: true, heat: 7,
    tags: "Brawler, Clan Ghost Bear, Fast Assault ’Mech, Underpowered, Balanced",
    armor: { head: [3, 1], torso: [12, 10], arms: [11, 5], legs: [13, 7] },
    weapons: [
      "Primary: Gauss Rifle | 5 | B | — | LA | –2 OK OK –2",
      "2 ER Large Lasers | 7 | E | HHHHH | RA | OK OK OK –2",
      "2 Machine Guns | 2 | B | — | T | OK OK — —"
    ],
    equipment: ["Ammo: Gauss Rifle (Left Arm, CASE)", "Ammo: Machine Gun (Torso, CASE)", "Jump Jets", "MASC"]
  },
  {
    // The book also lists Jump Jets, but its Movement has no (J) and the Dire Wolf Prime has none.
    name: "Dire Wolf", model: "Prime", designation: "Daishi", weight: "assault", tonnage: 100, movement: 1, heat: 9,
    tags: "Brawler, Clan Smoke Jaguar, “The Ultimate Assault OmniMech”, Heavily Armed, Command ’Mech",
    armor: { head: [3, 1], torso: [16, 10], arms: [11, 6], legs: [14, 7] },
    weapons: [
      "2 ER Large Lasers, Ultra AC/5 | 9+M (Max 11) | E, B | HHHHHH | RA | OK OK OK –2",
      "2 ER Large Lasers, Ultra AC/5 | 9+M (Max 11) | E, B | HHHHHH | LA | OK OK OK –2",
      "4 Medium Pulse Lasers | 10 | E | HHH | RA, LA | +2 +2 OK —",
      "LRM 10 | 1+M (Max 4) | M | H | T | OK OK OK –2"
    ],
    equipment: ["Ammo: Autocannon (Right Arm, Left Arm, CASE)", "Ammo: LRM (Torso, CASE)"]
  }
];

/** OmniFighters (p. 231–233): Armor per location, one shared Structure pool. */
export const CLAN_FIGHTERS = [
  {
    name: "Bashkir", model: "Prime", weight: "light", tonnage: 20, movement: 5, heat: 4,
    tags: "Recon, Clan Smoke Jaguar, Fast, Limited Fuel, Maneuverable",
    armor: { nose: 6, wings: 6, aft: 5 }, structure: 4,
    weapons: [
      "Streak SRM 2 | 2 | M | — | N | OK OK –2 —",
      "ER Small Laser | 2 | E | H | N | OK OK — —",
      "2 ER Medium Lasers | 5 | E | HH | RW, LW | OK OK –2 —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: ["Ammo: SRM"]
  },
  {
    name: "Sulla", model: "Prime", weight: "light", tonnage: 45, movement: 4, heat: 5,
    tags: "Multi-Role, Clan Ghost Bear, Well-Protected, Accurate, Ample Fuel",
    armor: { nose: 15, wings: 14, aft: 12 }, structure: 3,
    weapons: [
      "Primary: ER PPC | 5 | E | HHH | N | OK OK OK –2",
      "2 ER Large Lasers | 7 | E | HHHH | RW, LW | OK OK OK –2",
      "ER Small Laser | 2 | E | H | A | OK OK — —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: []
  },
  {
    name: "Visigoth", model: "Prime", weight: "medium", tonnage: 60, movement: 4, heat: 6,
    tags: "Multi-Role, Common, Popular, Solid Performance, Aging Design",
    armor: { nose: 22, wings: 16, aft: 14 }, structure: 2,
    weapons: [
      "Primary: LB 10-X AC | 4 (C4) | B | — | N | OK OK –2 –4",
      "3 ER Medium Lasers | 7 | E | HHH | N | OK OK –2 —",
      "2 Streak SRM 4 | 6 | M | H | RW, LW | OK OK –2 —",
      "2 Small Pulse Lasers | 2 | E | — | RW, LW | +2 +2 — —",
      "2 ER Medium Lasers | 5 | E | HH | A | OK OK –2 —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: ["Ammo: Autocannon", "Ammo: SRM"]
  },
  {
    name: "Jagatai", model: "Prime", weight: "medium", tonnage: 70, movement: 3, heat: 6,
    tags: "Air Superiority, Clan Wolf, Versatile, Poor Heat Management, New Design",
    armor: { nose: 22, wings: 17, aft: 15 }, structure: 2,
    weapons: [
      "LRM 20 | 4+M (Max 7) | M | H | N | OK OK OK –2",
      "2 ER PPC | 10 | E | HHHHHH | RW, LW | OK OK OK –2",
      "2 Large Pulse Lasers | 7 | E | HHHH | RW, LW | +2 +2 +2 OK",
      "Large Pulse Laser | 4 | E | HH | A | +2 +2 +2 OK",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: ["Ammo: LRM"]
  },
  {
    name: "Sabutai", model: "Prime", weight: "heavy", tonnage: 75, movement: 3, heat: 8,
    tags: "Striker, Common, Heavily Armed, Under-Armored, New Design",
    armor: { nose: 21, wings: 15, aft: 13 }, structure: 2,
    weapons: [
      "Primary: Gauss Rifle | 5 | B | — | N | –2 OK OK –2",
      "ER Small Laser | 2 | E | H | N | OK OK — —",
      "2 ER PPC | 10 | E | HHHHHH | RW, LW | OK OK OK –2",
      "2 Large Pulse Lasers | 7 | E | HHHH | RW, LW | +2 +2 +2 OK",
      "2 ER Small Lasers | 4 | E | H | A | OK OK –2 —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: ["Ammo: Gauss Rifle"]
  },
  {
    name: "Scytha", model: "Prime", weight: "heavy", tonnage: 90, movement: 3, heat: 10,
    tags: "Survivor, Clan Jade Falcon, Agile, Under-Armored, Ammo-Dependent",
    armor: { nose: 30, wings: 33, aft: 16 }, structure: 3,
    weapons: [
      "Ultra AC/20, ER Large Laser | 11+MMM (Max 18) | B | HHHHH | N | OK OK –2 —",
      "ER Small Laser | 2 | E | H | N | OK OK — —",
      "2 ER Large Lasers | 7 | E | HHHH | RW | OK OK OK –2",
      "2 ER Large Lasers | 7 | E | HHHH | LW | OK OK OK –2",
      "2 ER Medium Lasers | 5 | E | HH | A | OK OK –2 —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: ["Ammo: Autocannon"]
  }
];

/** Lachlan's salvage vehicle (p. 206–207): no weapons, Ram only. Armor read off the diagram. */
export const CLAN_VEHICLES = [
  {
    name: "Salvage Vehicle (Clan)", weight: "heavy", tonnage: 70, movement: 1, motive: "tracked",
    tags: "Field Repair Vehicle, Tracked, Utilitarian, No Armament, Large Cargo Space",
    armor: { front: [3, 2], sides: [3, 2], rear: [3, 2] },
    weapons: [],
    equipment: ["3 Lift Hoists", "Cargo Space (34 Tons)"]
  }
];

/** Battle armor (p. 234). Personal weapons are catalog-style rows; 'Mech-Scale rows have no Heat. */
export const BATTLE_ARMOR = [
  {
    name: "Elemental Battle Armor", designation: "Toad", weight: "medium", mass: 1000, movement: 2, jump: true,
    tags: "Genetically Bred Warrior, Common, Anti-’Mech, HarJel Sealant, Detachable SRM Launcher",
    pips: 4,
    personal: [
      ["Battle Claw", "4", "OK", "—", "—", { skill: "meleeCombat" }],
      ["Machine Gun", "4", "OK", "OK", "OK", { skill: "supportWeapons", special: "May attack up to two different targets per Narration." }]
    ],
    weapons: [
      "Small Laser | 1 | E | — | Body | OK OK — —",
      "SRM 2 | 1+M (Max 2) | M | — | Body | OK OK –2 —"
    ],
    equipment: ["Ammo: SRM [2]", "Jump Jets"]
  }
];

/** 3050 Clan weapons for 'Mech-Scale Combat (p. 217), single weapons without a location. */
export const CLAN_MECH_WEAPONS = [
  "Machine Gun | 1 | B | — | — | OK OK — —",
  "LB 2-X Autocannon | 1 (C1) | B | — | — | –2 OK OK –2",
  "LB 5-X Autocannon | 2 (C2) | B | — | — | –2 OK OK –2",
  "LB 10-X Autocannon | 4 (C4) | B | — | — | OK OK –2 –4",
  "LB 20-X Autocannon | 7 (C7) | B | H | — | OK OK –2 —",
  "Ultra Autocannon/2 | 1+M (Max 2) | B | — | — | –2 OK OK –2",
  "Ultra Autocannon/5 | 2+M (Max 4) | B | — | — | OK OK OK –2",
  "Ultra Autocannon/10 | 4+MM (Max 8) | B | H | — | OK OK –2 –4",
  "Ultra Autocannon/20 | 7+MMM (Max 14) | B | HHH | — | OK OK –2 —",
  "Gauss Rifle | 5 | B | — | — | –2 OK OK –2",
  "SRM 2 | 1+M (Max 2) | M | — | — | OK OK –2 —",
  "SRM 4 | 1+M (Max 3) | M | H | — | OK OK –2 —",
  "SRM 6 | 2+M (Max 4) | M | H | — | OK OK –2 —",
  "Streak SRM 2 | 2 | M | — | — | OK OK –2 —",
  "Streak SRM 4 | 3 | M | H | — | OK OK –2 —",
  "Streak SRM 6 | 4 | M | H | — | OK OK –2 —",
  "LRM 5 | 1+M (Max 2) | M | — | — | OK OK OK –2",
  "LRM 10 | 1+M (Max 4) | M | H | — | OK OK OK –2",
  "LRM 15 | 2+M (Max 5) | M | H | — | OK OK OK –2",
  "LRM 20 | 4+M (Max 7) | M | H | — | OK OK OK –2",
  "ER Small Laser | 2 | E | H | — | OK OK — —",
  "ER Medium Laser | 3 | E | H | — | OK OK –2 —",
  "ER Large Laser | 4 | E | HH | — | OK OK OK –2",
  "Small Pulse Laser | 1 | E | — | — | +2 +2 — —",
  "Medium Pulse Laser | 3 | E | H | — | +2 +2 OK —",
  "Large Pulse Laser | 4 | E | HH | — | +2 +2 +2 OK",
  "ER PPC | 5 | E | HHH | — | OK OK OK –2",
  "Flamer | 1 (or H) | E | H | — | OK OK — —"
];
