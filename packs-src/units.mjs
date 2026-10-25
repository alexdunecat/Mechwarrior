/*
 * 'Mech-Scale Hardware from the Warrior's Catalog (p. 157–172), as printed.
 *
 * Weapon rows copy the book's WEAPONS table: "Name | Damage | Type | Heat | Loc | PB S M L". A name
 * starting with "Primary:" marks the Primary Weapon. Vehicles have no Heat column. Punch/Kick and
 * Ram rows are left out: the sheet derives them from Tonnage and Movement. A "(No Punch)" 'Mech
 * sets punch: false. Equipment rows: "Ammo: SRM (Torso)", "Jump Jets", anything else is listed as is.
 * Armor is [Armor, Structure] pips; "arms" and "legs" apply to both sides.
 */

export const MECHS = [
  {
    name: "Locust", model: "LCT-1V", weight: "light", tonnage: 20, movement: 4, heat: 2, punch: false,
    tags: "Scout, “Bug ’Mech”, Lightning Fast, No/Minimal Arms, Ubiquitous",
    armor: { head: [3, 1], torso: [3, 2], arms: [1, 1], legs: [3, 1] },
    weapons: [
      "Primary: Medium Laser | 2 | E | H | T | OK OK –2 —",
      "2 Machine Guns | 2 | B | — | RA, LA | OK OK — —"
    ],
    equipment: ["Ammo: Machine Gun (Torso)"]
  },
  {
    name: "Stinger", model: "STG-3R", weight: "light", tonnage: 20, movement: 3, jump: true, heat: 2,
    tags: "Scout, “Bug ’Mech”, Anti-personnel, Mainstay, Trainer ’Mech",
    armor: { head: [1, 1], torso: [2, 2], arms: [1, 1], legs: [2, 1] },
    weapons: [
      "Primary: Medium Laser | 2 | E | H | RA | OK OK –2 —",
      "2 Machine Guns | 2 | B | — | RA, LA | OK OK — —"
    ],
    equipment: ["Jump Jets", "Ammo: Machine Gun (Torso)"]
  },
  {
    name: "Wasp", model: "WSP-1A", weight: "light", tonnage: 20, movement: 3, jump: true, heat: 2,
    tags: "Scout, “Bug ’Mech”, Anti-Vehicular, Team Player, Most Common BattleMech",
    armor: { head: [1, 1], torso: [2, 2], arms: [1, 1], legs: [2, 1] },
    weapons: [
      "Primary: Medium Laser | 2 | E | H | RA | OK OK –2 —",
      "SRM 2 | 1+M (Max 2) | M | — | LL | OK OK –2 —"
    ],
    equipment: ["Jump Jets", "Ammo: SRM (Torso)"]
  },
  {
    name: "Commando", model: "COM-2D", weight: "light", tonnage: 25, movement: 3, heat: 2,
    tags: "Short-Range Brawler, Lyran Commonwealth, Heavy Hitter, Ammo-Dependent, Under-Armored",
    armor: { head: [2, 1], torso: [3, 3], arms: [2, 1], legs: [3, 2] },
    weapons: [
      "Primary: Medium Laser | 2 | E | H | LA | OK OK –2 —",
      "SRM 6 | 2+M (Max 4) | M | H | T | OK OK –2 —",
      "SRM 4 | 1+M (Max 3) | M | H | RA | OK OK –2 —"
    ],
    equipment: ["Ammo: SRM (Torso)"]
  },
  {
    name: "Valkyrie", model: "VLK-QA", weight: "light", tonnage: 30, movement: 3, jump: true, heat: 2,
    tags: "Scout, Federated Suns, Well-Armored, Slow, Quickly Repaired",
    armor: { head: [3, 1], torso: [5, 3], arms: [3, 2], legs: [4, 2] },
    weapons: [
      "Primary: Medium Laser | 2 | E | H | RA | OK OK –2 —",
      "LRM 10 | 1+M (Max 4) | M | H | T | –2 OK OK –2"
    ],
    equipment: ["Ammo: LRM (Torso)"]
  },
  {
    name: "Phoenix Hawk", model: "PXH-1", weight: "medium", tonnage: 45, movement: 3, jump: true, heat: 2,
    tags: "Heavy Scout, Star League Era, Reliable, Under-Armored, Recon Leader",
    armor: { head: [2, 1], torso: [7, 4], arms: [3, 2], legs: [5, 4] },
    weapons: [
      "Primary: Large Laser | 3 | E | HH | RA | OK OK –2 –4",
      "2 Medium Lasers | 4 | E | H | RA, LA | OK OK –2 —",
      "2 Machine Guns | 2 | B | — | RA, LA | OK OK — —"
    ],
    equipment: ["Jump Jets", "Ammo: Machine Gun (Torso)"]
  },
  {
    name: "Griffin", model: "GRF-1N", weight: "medium", tonnage: 55, movement: 3, jump: true, heat: 2,
    tags: "Mobile Fire Support, Venerable, Workhorse, No Short-Range Armament, All Weapons on Right Side",
    armor: { head: [3, 1], torso: [7, 6], arms: [5, 3], legs: [6, 4] },
    weapons: [
      "Primary: PPC | 4 | E | HH | RA | –2 OK –2 –4",
      // The book prints Type "E" here; LRMs are Missile weapons everywhere else.
      "LRM 10 | 1+M (Max 3) | M | H | T | –2 OK OK –2"
    ],
    equipment: ["Jump Jets", "Ammo: LRM (Torso)"]
  },
  {
    name: "Shadow Hawk", model: "SHD-2H", weight: "medium", tonnage: 55, movement: 3, jump: true, heat: 2,
    tags: "Multi-Role, Star League Era, Advanced Life Support System, Impressive Battle Record, Versatile",
    armor: { head: [3, 1], torso: [8, 6], arms: [5, 3], legs: [5, 4] },
    weapons: [
      "Primary: AC/5 | 2 | B | — | T | –2 OK –2 –4",
      "LRM 5 | 1+M (Max 2) | M | — | T | –2 OK OK –2",
      "Medium Laser, SRM 2 | 3+M (Max 4) | E, M | H | RA, H | OK OK –2 —"
    ],
    equipment: ["Jump Jets", "Ammo: Autocannon (Torso)", "Ammo: LRM (Torso)", "Ammo: SRM (Torso)"]
  },
  {
    name: "Wolverine", model: "WVR-6R", weight: "medium", tonnage: 55, movement: 3, jump: true, heat: 2,
    tags: "Heavy Scout, Star League Era, Endurance and Survivability, Common Mechanical Failures, Good Heat Management",
    armor: { head: [3, 1], torso: [7, 6], arms: [5, 3], legs: [5, 4] },
    weapons: [
      "Primary: AC/5 | 2 | B | — | RA | –2 OK –2 –4",
      "Medium Laser, SRM 6 | 4+M (Max 6) | E, M | H | H, T | OK OK –2 —"
    ],
    equipment: ["Jump Jets", "Ammo: Autocannon (Torso)", "Ammo: SRM (Torso)"]
  },
  {
    name: "Dragon", model: "DRG-1N", weight: "heavy", tonnage: 60, movement: 3, heat: 2,
    tags: "Brawler, Draconis Combine, Mobile, Under-Armed, Physical-Combat Focused",
    armor: { head: [3, 1], torso: [9, 7], arms: [5, 3], legs: [5, 4] },
    weapons: [
      "Primary: AC/5 | 2 | B | — | RA | –2 OK –2 –4",
      "LRM 10 | 1+M (Max 4) | M | H | T | –2 OK OK –2",
      "Medium Laser | 2 | E | H | LA | OK OK –2 —",
      "Medium Laser | 2 | E | H | T (Rear) | OK OK –2 —"
    ],
    equipment: ["Ammo: Autocannon (Torso)", "Ammo: LRM (Torso)"]
  },
  {
    name: "Rifleman", model: "RFL-3N", weight: "heavy", tonnage: 60, movement: 2, heat: 2,
    tags: "Fire Support, Star League Era, Anti-Aircraft, Heat Monster, Under-Armored",
    armor: { head: [2, 1], torso: [7, 7], arms: [5, 3], legs: [4, 5] },
    weapons: [
      "2 Large Lasers | 6 | E | HHH | RA, LA | OK OK –2 –4",
      "2 AC/5s | 4 | B | — | RA, LA | –2 OK –2 –4",
      "2 Medium Lasers | 4 | E | H | T | OK OK –2 —"
    ],
    equipment: ["Ammo: Autocannon (Torso)", "Garret D2j Anti-Aircraft Targeting System"]
  },
  {
    name: "Thunderbolt", model: "TDR-5S", weight: "heavy", tonnage: 65, movement: 2, heat: 3,
    tags: "Planetary Assault, Common, Well-Armed, Well-Armored, Off-Center Cockpit",
    armor: { head: [3, 1], torso: [10, 7], arms: [7, 3], legs: [10, 5] },
    weapons: [
      "Primary: Large Laser | 3 | E | HH | RA | OK OK –2 –4",
      "LRM 15 | 2+M (Max 5) | M | H | T | –2 OK OK –2",
      "3 Medium Lasers, SRM 2 | 6+M (Max 7) | E, B | HH | T | OK OK –2 —",
      "2 Machine Guns | 2 | B | — | LA | OK OK — —"
    ],
    equipment: ["Ammo: LRM (Torso)", "Ammo: SRM (Torso)", "Ammo: Machine Gun (Left Arm)"]
  },
  {
    name: "Catapult", model: "CPLT-C1", weight: "heavy", tonnage: 65, movement: 2, jump: true, heat: 3, punch: false,
    tags: "Missile Boat, Star League Era, Rare, No/Minimal Arms, Sideways Ejection System",
    armor: { head: [3, 1], torso: [8, 7], arms: [4, 3], legs: [6, 5] },
    weapons: [
      "2 LRM 15 | 4+MM (Max 10) | M | HH | RA, LA | –2 OK OK –2",
      "2 Medium Lasers | 4 | E | H | T | OK OK –2 —",
      "2 Medium Lasers | 4 | E | H | T | OK OK –2 —"
    ],
    equipment: ["Jump Jets", "Ammo: LRM (Torso)"]
  },
  {
    name: "Archer", model: "ARC-2R", weight: "heavy", tonnage: 70, movement: 2, heat: 2,
    tags: "Fire Support, Venerable, Long-Range Brawler, Iconic, Enlarged Hand Actuators",
    armor: { head: [3, 1], torso: [11, 7], arms: [7, 4], legs: [9, 5] },
    weapons: [
      "Primary: 2 LRM 20 | 8+MM (Max 14) | M | HH | T | –2 OK OK –2",
      "2 Medium Lasers | 4 | E | H | RA, LA | OK OK –2 —",
      "2 Medium Lasers | 4 | E | H | T (Rear) | OK OK –2 —"
    ],
    equipment: ["Ammo: LRM (Torso)"]
  },
  {
    name: "Warhammer", model: "WHM-6R", weight: "heavy", tonnage: 70, movement: 2, heat: 4,
    tags: "Brawler, Iconic, Simple but Effective, Dated Electronics, Gunslinger ’Mech",
    armor: { head: [3, 1], torso: [7, 7], arms: [7, 4], legs: [5, 5] },
    weapons: [
      "Primary: 2 PPC | 7 | E | HHHH | RA, LA | –2 OK –2 –4",
      "2 Medium Lasers, SRM 6 | 6+M (Max 8) | E, B | HH | T | OK OK –2 —",
      "2 Small Lasers, 2 Machine Guns | 4 | E, B | — | T | OK OK — —"
    ],
    equipment: ["Ammo: Machine Gun (Torso)", "Ammo: SRM (Torso)", "Searchlight"]
  },
  {
    name: "Marauder", model: "MAD-3R", weight: "heavy", tonnage: 75, movement: 2, heat: 3,
    tags: "Frontal Assault, Iconic, Command ’Mech, Rare, Menacing Silhouette",
    armor: { head: [3, 1], torso: [12, 8], arms: [7, 4], legs: [6, 5] },
    weapons: [
      "Primary: 2 PPC | 7 | E | HHHH | RA, LA | –2 OK –2 –4",
      "AC/5 | 2 | B | — | T | –2 OK –2 –4",
      "2 Medium Lasers | 4 | E | H | RA, LA | OK OK –2 —"
    ],
    equipment: ["Ammo: Autocannon (Torso)"]
  },
  {
    name: "Awesome", model: "AWS-8Q", weight: "assault", tonnage: 80, movement: 1, heat: 5,
    tags: "Frontal Assault, Popular, Fearsome, Brick House, Poor Short-Range Weaponry",
    armor: { head: [3, 1], torso: [10, 8], arms: [8, 4], legs: [11, 6] },
    weapons: [
      "Primary: PPC | 4 | E | HH | RA | –2 OK –2 –4",
      "2 PPC | 7 | E | HHHH | T | –2 OK –2 –4",
      "Small Laser | 1 | E | — | H | OK OK — —"
    ],
    equipment: []
  },
  {
    name: "BattleMaster", model: "BLR-1G", weight: "assault", tonnage: 85, movement: 1, heat: 4,
    tags: "Frontal Assault, Star League Era, Command ’Mech, High-Profile Target, Highly Valued",
    armor: { head: [3, 1], torso: [13, 9], arms: [8, 5], legs: [9, 6] },
    weapons: [
      "Primary: PPC | 4 | E | HH | RA | –2 OK –2 –4",
      "4 Medium Lasers, SRM 6 | 9+M (Max 11) | E, M | HHH | T | OK OK –2 —",
      "2 Machine Guns | 2 | B | — | LA | OK OK — —",
      "2 Medium Lasers | 4 | E | H | T (Rear) | OK OK –2 —"
    ],
    equipment: ["Ammo: Machine Gun/SRM (Torso)", "Rumble Seat"]
  }
];

export const VEHICLES = [
  {
    name: "Packrat Long Range Patrol Vehicle", weight: "light", tonnage: 20, movement: 4, motive: "wheeled",
    tags: "Recon, Wheeled, Independent, Powerful Comms System, No Fuel Needed",
    armor: { front: [5, 1], sides: [5, 1], rear: [5, 1] },
    weapons: [
      "Primary: SRM 6 | 2+M (Max 4) | M | Front | OK OK –2 —",
      "Flamer | 1 (or H) | E | Rear | OK OK — —"
    ],
    equipment: ["Infantry Bay", "Ammo: SRM"]
  },
  {
    name: "Warrior H-7 Attack Helicopter", weight: "light", tonnage: 21, movement: 4, motive: "vtol",
    tags: "Air Cavalry, VTOL, Fast, Fragile, High-Tech Targeting Helmet",
    armor: { front: [2, 1], rotor: [1, 1], sides: [2, 1], rear: [2, 1] },
    weapons: [
      "Primary: AC/2 | 1 | B | Front | –2 OK OK –2",
      "SRM 4 | 1+M (Max 3) | M | Front | OK OK –2 —"
    ],
    equipment: ["Ammo: Autocannon/SRM"]
  },
  {
    name: "Scorpion Light Tank", weight: "light", tonnage: 25, movement: 2, motive: "tracked",
    tags: "Deployed in Groups, Tracked, Ubiquitous, Cheap, Mechanical Problems",
    armor: { front: [5, 1], turret: [5, 1], sides: [4, 1], rear: [3, 1] },
    weapons: [
      "Primary: AC/5 | 2 | B | Turret | –2 OK –2 –4",
      "Machine Gun | 1 | B | Front | OK OK — —"
    ],
    equipment: ["Ammo: Autocannon/Machine Gun"]
  },
  {
    name: "Hetzer Wheeled Assault Gun", weight: "medium", tonnage: 40, movement: 2, motive: "wheeled",
    tags: "Giant Gun on Wheels, Wheeled, Under-Armored, No Secondary Weapons, No Turret",
    armor: { front: [10, 1], sides: [7, 1], rear: [7, 1] },
    weapons: [
      "Primary: AC/20 | 7 | B | Front | OK OK –2 —"
    ],
    equipment: ["Ammo: Autocannon"]
  },
  {
    name: "Condor Heavy Hover Tank", weight: "medium", tonnage: 50, movement: 4, motive: "hover",
    tags: "Heavy Cavalry, Hover, Fastest in Weight Class, Vulnerable to Flanking, Expensive",
    armor: { front: [10, 2], turret: [11, 2], sides: [5, 2], rear: [5, 2] },
    weapons: [
      "Primary: AC/5 | 2 | B | Turret | –2 OK –2 –4",
      "2 Medium Lasers | 4 | E | Turret | OK OK –2 —",
      "Machine Gun | 1 | B | Front | OK OK — —"
    ],
    equipment: ["Cargo Space", "Ammo: Autocannon/Machine Gun"]
  },
  {
    name: "Vedette Medium Tank", weight: "medium", tonnage: 50, movement: 3, motive: "tracked",
    tags: "Successful, Tracked, Popular, Fast, ComStar-Designed Electronics",
    armor: { front: [7, 2], turret: [7, 2], sides: [6, 2], rear: [7, 2] },
    weapons: [
      "Primary: AC/5 | 2 | B | Turret | –2 OK –2 –4",
      "Machine Gun | 1 | B | Front | OK OK — —"
    ],
    equipment: ["Ammo: Autocannon/Machine Gun"]
  },
  {
    name: "Patton Tank", weight: "heavy", tonnage: 65, movement: 2, motive: "tracked",
    tags: "Defensive Role, Tracked, Fusion Engine, Hard to Manufacture, Low Silhouette",
    armor: { front: [17, 2], turret: [17, 2], sides: [15, 2], rear: [13, 2] },
    weapons: [
      "Primary: AC/10 | 4 | B | Turret | OK OK –2 –4",
      "LRM 5 | 1+M (Max 2) | M | Turret | –2 OK OK –2",
      "Small Laser | 1 | E | Front | OK OK — —",
      "Flamer | 1 (or H) | E | Rear | OK OK — —"
    ],
    equipment: ["Infantry Bay", "Ammo: Autocannon/LRM"]
  },
  {
    name: "Demolisher Heavy Tank", weight: "assault", tonnage: 80, movement: 1, motive: "tracked",
    tags: "Defensive Role, Tracked, Affordable, No Secondary Weapons, Intimidating",
    armor: { front: [13, 3], turret: [13, 3], sides: [10, 3], rear: [7, 3] },
    weapons: [
      "AC/20 | 7 | B | Turret | OK OK –2 —",
      "AC/20 | 7 | B | Turret | OK OK –2 —"
    ],
    equipment: ["Ammo: Autocannon"]
  }
];

/** Aerospace fighters: Armor per location, one shared Structure pool. */
export const FIGHTERS = [
  {
    name: "Thrush", model: "TR-7", weight: "light", tonnage: 25, movement: 5, heat: 2,
    tags: "Escort/Interceptor, Capellan Confederation, Maneuverable, Difficult Atmospheric Transition, Circular Wing Design",
    armor: { nose: 2, wings: 2, aft: 2 }, structure: 4,
    weapons: [
      "Primary: Medium Laser | 2 | E | H | N | OK OK –2 —",
      "2 Medium Lasers | 4 | E | H | RW, LW | OK OK –2 —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: []
  },
  {
    name: "Corsair", model: "", weight: "medium", tonnage: 50, movement: 3, heat: 3,
    tags: "Ground Attack, Federated Suns, Easy to Refit, Mechanical Issues, Sleek Shape",
    armor: { nose: 24, wings: 17, aft: 14 }, structure: 2,
    weapons: [
      "Primary: 2 Large Lasers | 6 | E | HHH | N | OK OK –2 –4",
      "2 Medium Lasers | 4 | E | H | RW, LW | OK OK –2 —",
      "2 Small Lasers | 2 | E | — | N | OK OK — —",
      "2 Small Lasers | 2 | E | — | A | OK OK — —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: []
  },
  {
    name: "Stingray", model: "F-90", weight: "medium", tonnage: 60, movement: 3, heat: 4,
    tags: "Atmospheric Operations, Free Worlds League, No Ammo Dependency, Difficult to Pilot, Forward-Swept Wings",
    armor: { nose: 20, wings: 15, aft: 11 }, structure: 2,
    weapons: [
      "Primary: PPC | 4 | E | HH | N | –2 OK –2 –4",
      "2 Large Lasers | 6 | E | HHH | RW, LW | OK OK –2 –4",
      "2 Medium Lasers | 4 | E | H | RW, LW | OK OK –2 —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: []
  },
  {
    name: "Shilone", model: "SL-17", weight: "medium", tonnage: 65, movement: 3, heat: 4,
    tags: "Multi-Role, Draconis Combine, Well-Armed and Armored, Proud Pilots, “The Boomerang”",
    armor: { nose: 30, wings: 15, aft: 12 }, structure: 2,
    weapons: [
      "Primary: Large Laser | 3 | E | HH | N | OK OK –2 –4",
      "LRM 20 | 4+M (Max 7) | M | H | N | –2 OK OK –2",
      "2 Medium Lasers | 4 | E | H | RW, LW | OK OK –2 —",
      "SRM 4 | 1+M (Max 3) | M | H | A | OK OK –2 —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: ["Ammo: LRM/SRM"]
  },
  {
    name: "Chippewa", model: "CHP-W5", weight: "heavy", tonnage: 90, movement: 2, heat: 5,
    tags: "Offensive Role, Lyran Commonwealth, Heavily Armed, Under-Armored, Good Heat Management",
    armor: { nose: 14, wings: 8, aft: 10 }, structure: 3,
    weapons: [
      "2 LRM 15 | 4+MM (Max 7) | M | HH | N | –2 OK OK –2",
      "2 Medium Lasers, SRM 6 | 6+M (Max 8) | E, M | HH | N | OK OK –2 —",
      "2 Large Lasers | 6 | E | HHH | RW | OK OK –2 –4",
      "2 Large Lasers | 6 | E | HHH | LW | OK OK –2 –4",
      "2 Small Lasers | 2 | E | — | A | OK OK — —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: ["Ammo: LRM/SRM"]
  },
  {
    // Not in the Warrior's Catalog: Michael Antilles flies one (p. 124). Armor read off his sheet's diagram.
    name: "Sholagar", model: "SL-21", weight: "light", tonnage: 35, movement: 4, heat: 2,
    tags: "Air Superiority, Draconis Combine, Durable, Unstable in Atmosphere, Circular Wing Design",
    armor: { nose: 10, wings: 8, aft: 7 }, structure: 3,
    weapons: [
      "Primary: SRM 4 | 1+M (Max 3) | M | H | N | OK OK –2 —",
      "2 Medium Lasers | 4 | E | H | RW, LW | OK OK –2 —",
      "Bomb | 4 | — | — | — | +2 OK –2 –4"
    ],
    equipment: ["Ammo: SRM"]
  }
];
