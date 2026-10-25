/*
 * Sample NPCs (p. 128–137), as printed. Attributes are [STR, RFL, INT, WIL, CHA]; creatures have no
 * CHA. Skills are [key, rating, Hardware specialty or Knowledge subject], or ["custom", rating,
 * attribute, name] for a Skill outside the Skills List. Weapons work as for the sample characters.
 */

export const NPC_GROUPS = [
  {
    folder: "Military",
    npcs: [
      {
        name: "Grunt", attributes: [3, 3, 1, 2, 1],
        tags: "Boots-on-the-Ground Soldier, Weapon Enthusiast, Follows Orders, Grim, Disciplined",
        skills: [["smallArms", 3], ["supportWeapons", 2], ["meleeCombat", 3], ["intimidation", 3], ["knowledge", 1, "Weapon Trivia"]],
        weapons: ["Martial Arts", "Rifle (B)"],
        armor: "Flak Armor",
        inventory: ["Infantry Field Kit", "Rations", "Cigar"]
      },
      {
        name: "Officer", attributes: [2, 3, 2, 2, 3],
        tags: "Career Soldier, Commander, Humorless, Respected, Veteran",
        skills: [["smallArms", 4], ["leadership", 4], ["protocol", 2], ["tactics", 4], ["knowledge", 2, "Military History"]],
        weapons: ["Martial Arts", "Laser Pistol (E)", { name: "Combat Knife", from: "Knife/Dagger/Bayonet" }],
        armor: "Ablative Armor",
        inventory: ["Orders from Superior", "Military Ribbons", "Military History Book"]
      },
      {
        name: "MechWarrior", attributes: [2, 3, 2, 2, 1],
        tags: "Thirty-First-Century Knight, Sergeant, ’Mech Jock, Code of Conduct, Respected",
        skills: [["gunnery", 2, "mech"], ["piloting", 2, "mech"], ["smallArms", 3], ["tactics", 3], ["knowledge", 2, "’Mech Identification"]],
        weapons: ["Martial Arts", "Auto-Pistol (B)"],
        armor: "Flak Armor",
        inventory: ["MechWarrior Field Kit", "Cockpit Mementos", "Coolant Vest", "Neurohelmet"]
      },
      {
        name: "Aerojock", attributes: [1, 3, 2, 2, 5],
        tags: "Hair on Fire, Cocky, Risk Taker, Glory Seeker, Adventurous",
        skills: [["gunnery", 3, "aero"], ["piloting", 3, "aero"], ["navigation", 2], ["smallArms", 2], ["knowledge", 2, "Military Aviation History"]],
        weapons: ["Martial Arts", "Laser Pistol (E)"],
        armor: "Ablative Armor",
        inventory: ["Flight Suit", "Neurohelmet", "Bomber Jacket"]
      },
      {
        name: "Technician", attributes: [2, 2, 3, 2, 1],
        tags: "Blue Collar, Repair Expert, Reliable, Skilled, Out-of-the-Box Solutions",
        skills: [["technician", 4], ["computers", 3], ["smallArms", 2], ["knowledge", 3, "Obscure ’Mech Trivia"]],
        weapons: ["Unarmed", ["Welder", "4", "–2", "—", "—"]],
        armor: "",
        inventory: ["Wrench", "Diagnostic Tools", "Coveralls"]
      },
      {
        name: "Military Police", attributes: [3, 2, 1, 1, 3],
        tags: "Checkpoints, Stockade/Brig, Vigilant, Tough, Zero Tolerance",
        skills: [["smallArms", 2], ["meleeCombat", 3], ["protocol", 2], ["intimidation", 3], ["knowledge", 2, "Military Law"]],
        weapons: ["Martial Arts", "Club", "Laser Pistol (E)"],
        armor: "Flak Armor",
        inventory: ["MP Armband", "Approved Guests Checklist", "Passkeys"]
      }
    ]
  },
  {
    folder: "Law and Order",
    npcs: [
      {
        name: "Law Enforcement Officer", attributes: [2, 2, 2, 2, 2],
        tags: "Patrol, First Responder, Beat Cop, No-Nonsense, Friendly Persuader (House Kurita)",
        skills: [["smallArms", 2], ["meleeCombat", 2], ["investigation", 3], ["intimidation", 3], ["knowledge", 2, "Local Crime Activity"]],
        weapons: ["Martial Arts", "Auto-Pistol (B)"],
        armor: "Flak Armor",
        inventory: ["Manacles", "Utility Belt", "Flashlight"]
      },
      {
        name: "Security Guard", attributes: [3, 2, 2, 2, 1],
        tags: "Vigilant, Disciplined, Intimidating, Persistent, Not Quite Military",
        skills: [["meleeCombat", 3], ["smallArms", 2], ["tracking", 2], ["perception", 3], ["knowledge", 2, "Criminal Psychology"]],
        weapons: ["Unarmed", "Stunstick", "Auto-Pistol (B)"],
        armor: "Flak Armor",
        inventory: ["Uniform", "Personal Communicator", "Manacles"]
      },
      {
        name: "Bounty Hunter", attributes: [2, 2, 3, 1, 2],
        tags: "Ruthless, Persistent, Mercenary, Predator, Flexible Morals",
        // The book prints "Tracking +INT (+5)": rating 2 gives the +5.
        skills: [["smallArms", 1], ["perception", 3], ["investigation", 3], ["tracking", 2], ["knowledge", 1, "Criminal Hideouts"]],
        weapons: ["Martial Arts", "Dart Gun", "Revolver (B)"],
        armor: "Concealed Ablative Armor",
        inventory: ["Notebook", "Bribe Money", "List of Informants"]
      }
    ]
  },
  {
    folder: "Underworld",
    npcs: [
      {
        name: "Gang Member", attributes: [3, 1, 1, 2, 3],
        tags: "Belligerent, Turf, Cocky, More Bark than Bite, Yakuza (House Kurita)",
        skills: [["meleeCombat", 3], ["smallArms", 2], ["streetwise", 2], ["intimidation", 3], ["knowledge", 2, "Police Patrol Schedules"]],
        weapons: ["Unarmed", { name: "Blackjack", from: "Blackjack/Sap" }, "Hold-Out Pistol (B)"],
        armor: "",
        inventory: ["Narcotics", "Gang Tattoos", "Gang Colors"]
      },
      {
        name: "Smuggler", attributes: [1, 2, 2, 1, 4],
        tags: "Smooth Talker, Unscrupulous, Bribes, Pragmatic, Hidden Compartments",
        skills: [["smallArms", 2], ["acting", 2], ["negotiation", 2], ["streetwise", 2], ["knowledge", 2, "Legendary Heist Stories"]],
        weapons: ["Unarmed", "Vibrodagger", "Laser Pistol (Hold-Out) (E)"],
        armor: "Concealed Flak Armor",
        inventory: ["Coat w/ Hidden Pockets", "Noteputer", "Doctored Shipping Manifest"]
      },
      {
        name: "Pirate", attributes: [3, 2, 1, 2, 2],
        tags: "Scum, Devil May Care, Fearsome, Lawless, Might Makes Right",
        skills: [["smallArms", 2], ["meleeCombat", 3], ["survival", 2], ["intimidation", 3], ["knowledge", 2, "Human Pain Thresholds"]],
        weapons: ["Unarmed", "Vibrosword", "Needler Pistol"],
        armor: "Concealed Flak Armor",
        inventory: ["Stolen Jewelry", "Good Luck Charm", "Human Trophies"]
      },
      {
        name: "Courtesan", attributes: [1, 2, 2, 1, 4],
        tags: "Attractive, Perceptive, Trained, Professional, Companionship",
        skills: [["meleeCombat", 1], ["perception", 3], ["acting", 2], ["protocol", 2], ["knowledge", 2, "Acupressure Points"]],
        weapons: ["Unarmed", "Fingernails (Carbon-Fiber Reinforced)", "Monowire"],
        armor: "",
        inventory: ["Silk Robe", "Bag of Cosmetics", "List of Clients"]
      },
      {
        name: "Bookie", attributes: [1, 1, 3, 2, 3],
        tags: "Opportunistic, Greedy, Predatory Lender, Risk Taker, Dishonest",
        skills: [["smallArms", 2], ["computers", 2], ["negotiation", 3], ["streetwise", 1], ["knowledge", 2, "Card Tricks"]],
        weapons: ["Unarmed", "Hold-Out Pistol (B)"],
        armor: "Concealed Ablative Armor",
        inventory: ["List of Clients", "White Noise Generator", "Verigraph Reader"]
      },
      {
        name: "Informant", attributes: [1, 2, 3, 1, 3],
        tags: "Snitch, Back Alley, Trustworthy, Haunted, Self-Preservation",
        skills: [["communications", 2], ["perception", 2], ["negotiation", 3], ["intimidation", 3], ["knowledge", 1, "Local Rumors"]],
        weapons: ["Unarmed", { name: "Shiv", from: "Knife/Dagger/Bayonet" }, "Hold-Out Pistol (B)"],
        armor: "",
        inventory: ["Sunglasses", "Compact Comm", "Medical Kit"]
      }
    ]
  },
  {
    folder: "Civilians",
    npcs: [
      {
        name: "Media Celebrity", attributes: [1, 2, 1, 2, 4],
        tags: "Fame, Media Events, Holovids, Big City, Crowds",
        skills: [["athletics", 1], ["perception", 2], ["acting", 3], ["disguise", 2], ["knowledge", 2, "Celebrity Gossip"]],
        weapons: ["Unarmed", "Needler Pistol (Hold-Out)"],
        armor: "",
        inventory: ["Autograph Pen", "Headshots", "Personal Communicator"]
      },
      {
        name: "Rioter", attributes: [3, 2, 1, 2, 2],
        tags: "Belligerent, Substandard Wages, Unfair Treatment, Blue Collar, Angry",
        skills: [["meleeCombat", 1], ["projectileWeapons", 1], ["negotiation", 2], ["intimidation", 2], ["custom", 3, "int", "Trade Skill"]],
        weapons: ["Unarmed", ["Molotov Cocktail (2x)", "5", "OK", "—", "—", { skill: "projectileWeapons" }],
          ["Pitchfork", "2S", "OK", "–2", "—"]],
        armor: "",
        inventory: ["Picket Sign", "List of Demands", "Photos of Victims"]
      },
      {
        name: "Reporter", attributes: [1, 2, 3, 2, 2],
        tags: "Intrepid, Intrusive, Inquisitive, Exposing Corruption, War Correspondent",
        skills: [["escapeArtist", 2], ["smallArms", 1], ["investigation", 3], ["tracking", 3], ["knowledge", 2, "Local Government"]],
        weapons: ["Unarmed", "Revolver (B)"],
        armor: "Concealed Flak Armor",
        inventory: ["Video Camera", "Noteputer", "Press Badge"]
      },
      {
        name: "Spacer", attributes: [3, 3, 1, 2, 1],
        tags: "Blue Collar, Zero G, Space Lifestyle, Teamwork, Humorless",
        skills: [["zeroG", 3], ["communications", 3], ["meleeCombat", 1], ["navigation", 3], ["knowledge", 2, "Trade Routes"]],
        weapons: ["Unarmed", "Stunstick"],
        armor: "",
        inventory: ["Noteputer", "Pressure Suit", "Emergency Oxygen Mask"]
      }
    ]
  },
  {
    folder: "Nobility and ComStar",
    npcs: [
      {
        name: "House Liaison", attributes: [1, 1, 3, 2, 3],
        tags: "Bureaucrat, Self-Interest, Middleman, Stickler, No Nonsense",
        skills: [["perception", 2], ["negotiation", 3], ["intimidation", 2], ["protocol", 2], ["knowledge", 3, "Mercenary Regulations"]],
        weapons: ["Unarmed", ["Swagger Stick", "1S", "OK", "—", "—"], "Auto-Pistol (B)"],
        armor: "Concealed Flak Armor",
        inventory: ["Military Uniform", "Noteputer", "Micro-Recorder"]
      },
      {
        name: "Noble", attributes: [1, 2, 3, 2, 4],
        tags: "Renowned, Statecraft, Decorum, Magnanimous, Grandiloquent",
        skills: [["art", 2], ["perception", 3], ["leadership", 4], ["protocol", 4], ["knowledge", 3, "Heraldry"]],
        weapons: ["Unarmed", { name: "Ornamental Dagger", from: "Knife/Dagger/Bayonet" }, "Needler Pistol"],
        armor: "Concealed Ablative Armor",
        inventory: ["Formal Attire", "Extravagant Jewelry", "Noteputer"]
      },
      {
        name: "ComStar Acolyte", attributes: [2, 1, 2, 2, 1],
        tags: "Low Rank, Secret Society, Teachable, Apprentice, Litanies and Rituals",
        skills: [["communications", 2], ["computers", 2], ["perception", 1], ["technician", 2], ["knowledge", 1, "ComStar Rituals"]],
        weapons: ["Unarmed", ["Wrench", "1S", "OK", "—", "—"]],
        armor: "",
        inventory: ["Acolyte Robe", "Diagnostic Toolkit", "Book of Litanies", "Copy of The Word of Blake"]
      },
      {
        name: "ComStar Adept", attributes: [2, 1, 3, 2, 2],
        tags: "Middle Rank, Technical, Secretive, Pseudo-Religious, Journeyman",
        skills: [["communications", 3], ["computers", 3], ["science", 2], ["technician", 2], ["knowledge", 2, "HPG Operation"]],
        weapons: ["Unarmed", "Needler Pistol (Hold-Out)"],
        armor: "",
        inventory: ["Adept Robe", "Noteputer", "Personal Comm", "Pocket-Sized Copy of The Word of Blake"]
      },
      {
        name: "ComStar Precentor", attributes: [2, 1, 4, 3, 4],
        tags: "High Rank, Manipulative, Secretive, Hidden Agenda, Administrator",
        skills: [["communications", 4], ["computers", 4], ["acting", 4], ["leadership", 4], ["knowledge", 4, "Great House Secrets"]],
        weapons: ["Unarmed", "Monowire", "Needler Pistol"],
        armor: "Concealed Ablative Armor",
        inventory: ["Precentor Robe", "Noteputer", "Blackmail Files", "Microfiche Copy of The Word of Blake"]
      }
    ]
  },
  {
    folder: "Intelligence",
    npcs: [
      {
        name: "Intelligence Agent", attributes: [2, 3, 3, 2, 2],
        tags: "Spy, Information Gatherer, Deep Cover, Concealed Weapons, False Identity",
        skills: [["smallArms", 2], ["tracking", 4], ["acting", 4], ["disguise", 4], ["knowledge", 2, "Local Culture"]],
        weapons: ["Martial Arts", "Compound Bow", "Laser Pistol (E)"],
        armor: "Concealed Flak Armor",
        inventory: ["Civilian Clothing", "Encrypted Comm", "Micro Recorder", "Laser Microphone"]
      },
      {
        name: "Elite Intelligence Operative", attributes: [3, 3, 3, 3, 2],
        tags: "Covert, Counterintelligence, Assassination, Unseen, Remorseless",
        skills: [["smallArms", 4], ["stealth", 4], ["tracking", 4], ["disguise", 4], ["knowledge", 4, "Planetary Culture"]],
        weapons: ["Martial Arts", "Monowire", "Sniper Rifle (B)"],
        armor: "Infiltration Suit",
        inventory: ["Tracking Bug", "Night Vision Goggles", "Disguise Kit", "Target Dossier"]
      }
    ]
  },
  {
    folder: "Creatures",
    npcs: [
      {
        name: "Branth (Draco animalis lopecis)", attributes: [10, 4, 6, 2, 1],
        tags: "Predator, Trainable & Rideable, Lopez (Free Worlds League), Weak Immune System, Dragon-like, with Wings",
        skills: [["meleeCombat", 2], ["perception", 5], ["tracking", 1]],
        weapons: [["Claws", "7", "OK", "—", "—"],
          ["Venomous Spit", "2", "OK", "–2", "—", { special: "On a successful attack, deals damage for two rounds." }]],
        armor: { name: "Natural Armor", reduceB: 1 },
        inventory: ["Venom Gland", "Scaly Hide", "Sharp Teeth"]
      },
      {
        name: "Nolan (Horror verus engadineii)", attributes: [8, 5, 7, 7, 1],
        tags: "Intelligent Pack Predator, Engadine (Lyran Commonwealth), The Rooting: Annual Nolan-Hunt Expedition, Large, Four-Armed Physique, Demon-like",
        skills: [["meleeCombat", 4], ["perception", 2], ["tracking", 5]],
        weapons: [["Claws", "4", "OK", "—", "—"],
          ["Bite", "1", "–2", "—", "—", { special: "On a successful attack, deals 3 damage for the next two rounds." }]],
        armor: { name: "Natural Armor", reduceB: 1 },
        inventory: ["Nolan-Hunting Trophy"]
      },
      {
        name: "Godan (Lacertosaurus caninus kitterieii)", attributes: [4, 4, 2, 3, 1],
        tags: "Reptilian Pack Predator, Dog-Sized, Kittery (Federated Suns), Jungle Dweller, Ambush Tactics",
        skills: [["meleeCombat", 3], ["perception", 4], ["tracking", 1]],
        weapons: [["Bite", "1", "OK", "—", "—"]],
        armor: "",
        inventory: []
      }
    ]
  }
];
