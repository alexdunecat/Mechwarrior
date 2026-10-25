/*
 * The sample characters (p. 84–127), as printed. Skills are [key, rating, Hardware specialty or
 * Knowledge subject]; a Trait with a key is one of the book's Traits. Weapons name a Warrior's
 * Catalog entry, copy one under another name ({ name, from }), or give a row like the catalog's.
 * Hardware names an entry of the 'Mechs, vehicles or fighters compendium; personal vehicles are
 * only noted.
 */

export const CHARACTERS = [
  {
    name: "Anthony Griffin", page: 84,
    details: { faction: "Federated Suns (House Davion)", factionKey: "fedsuns", rank: "Captain", age: "35", height: "1.7m", weight: "64kg", experience: "veteran" },
    tags: " Skilled  Haunted  Career Soldier  Jaded  Blooded",
    attributes: [2, 2, 2, 2, 2, 2],
    skills: [["gunnery", 4, "mech"], ["piloting", 3, "mech"], ["smallArms", 2], ["meleeCombat", 1], ["leadership", 3], ["tactics", 3], ["perception", 1], ["survival", 1], ["knowledge", 1, "Military Force ID"]],
    lifeModules: {"faction": "Federated Suns (House Davion)", "childhood": "War Orphan", "education": "Military Academy", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "rank", "name": "Rank", "text": "Captain."},
      {"polarity": "negative", "key": "darkSecret", "name": "Dark Secret", "text": "War is hell, and people make mistakes. Captain Griffin once made the wrong call, and it cost some people their lives. He believes he is responsible for their deaths. He fears to face judgment for his mistake more than he fears death in combat. Is he truly guilty of something heinous, or does he mistakenly hold himself responsible for bad things that were not truly his fault?"}
    ],
    weapons: ["Martial Arts", { name: "Academy Vibrosaber", from: "Vibrosword" }, { name: "Auto Pistol (B)", from: "Auto-Pistol (B)" }, "Laser Rifle (E)"],
    armor: "Flak Armor",
    inventory: ["Formal Dress Uniform with Impressive Medals", "Photograph of a Long-Dead Family (Not His Own)", "Deluxe Field Kit", "Environment Bubble Tent"],
    hardware: "Warhammer",
    history: "The Griffin family manage a fertile region on the planet Redfield. They have served the Federated Suns military for generations, passing a handful of irreplaceable BattleMechs down from parent to child as the centuries pass. Arthur's mother Chloe rose to the rank of captain before a PPC bored a hole through her cockpit and abruptly ended his childhood. Arthur was shipped off to his first military academy at age twelve, just days after his mother's funeral. While most of his family was deployed, Arthur found that he thrived in the academy environment. The rigid structure helped make sense of a chaotic world, and the unending barrage of difficult challenges gave him something to focus on other than his grief. Once he graduated he inherited his mother's ‘Mech, which his father had painstakingly restored as a graduation present. That was over a decade ago. Arthur has since risen to the same rank his mother achieved—the highest any member of the Griffin family has ever achieved. He has the skill, experience, and his heirloom heavy BattleMech to rely on, but he knows that any day, a single unlucky hit could make it all for nothing.",
    personality: "Captain Griffin knows his days are numbered, but he was born to be a MechWarrior. Where others might despair or panic, his cold and calculating resolve helps him keep his people together. His private thoughts hold a bleaker outlook than his surface shows. He enters every battle expecting death.",
    disposition: ["Seems absolutely confident in himself and the abilities of those under his command.", "Doesn't back down from a hard situation, but doesn't lean on false hope to get through it.", "Spends long hours overanalyzing his mistakes.", "Expects his orders to place a low priority on his survival, and is rarely disappointed."],
    cues: ["Looks like it's our turn again.", "Never go into battle without a plan.", "Plans always fall apart.", "Holy hell. We actually made it.", "Ammo and armor are expendable.", "People and fusion engines are not.", "Form up! We're in the suck, so let's get shoveling!", "Sound off if you're still with us!", "I took a bad hit. I think this is the one.", "I'm not ready to die. I'm already dead.", "It's the only way I know how to live.", "I know it looks bad, but this is our mission.", "Who's ready to go into battle with me?", "Watch your facing!", "Nothing to do now but call in the salvage team.", "Time to make our mothers proud!", "Keep it tight!", "We only live through this if we do it together!", "That plan is going to get us all killed.", "It's nothing I haven't seen before.", "Cut the chatter."]
  },
  {
    name: "Maura “Wildcard” Singer", page: 86,
    details: { faction: "Federated Suns (House Davion)", factionKey: "fedsuns", rank: "Subaltern", age: "23", height: "1.6m", weight: "63kg", experience: "regular" },
    tags: " Cocky  Eager  Gambler  Attractive  Flirty",
    attributes: [1, 3, 2, 2, 2, 1],
    skills: [["piloting", 3, "aero"], ["gunnery", 3, "aero"], ["tactics", 2], ["smallArms", 4], ["streetwise", 1], ["knowledge", 2, "Aircraft ID"]],
    lifeModules: {"faction": "Federated Suns (House Davion)", "childhood": "Mercenary Brat", "education": "Military Academy", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "combatSense", "name": "Combat Sense", "text": "Choose when you take your Narration in the turn order without needing to spend a Plot Point."},
      {"polarity": "negative", "key": "badReputation", "name": "Bad Reputation", "text": "–1 penalty to CHA-based Tests involving someone who knows your character."}
    ],
    weapons: ["Martial Arts", "Auto-Pistol (B)", { name: "Knife", from: "Knife/Dagger/Bayonet" }],
    armor: "Flak Armor",
    inventory: ["Deck of Playing Cards", "3 Stimpatches", "Skimmer", "Personal Music Set"],
    hardware: "Thrush",
    history: "Growing up, all Maura Singer wanted to do was fly. Her parents were both aerospace pilots, part of a small mercenary unit that bounced around the Davion Outback. When the unit disbanded, the family settled in the Federated Suns. Maura got into the NAIS, where her flying talent was offset by her ability to find trouble. She scraped through school and was assigned to the Tenth Deneb Light Calvary, earning the call sign “Wildcard” due to her unpredictability in combat exercises. Despite being a talented pilot, she has earned her commanding officer's ire and spends much of her off-duty time on punishment details.",
    personality: "There's no mistaking when Wildcard is in the room: she's the center of attention. Outgoing and flirty, she has many male friends, though no serious relationships. She also likes to gamble, and the card games she hosts are the stuff of legend in the Tenth.",
    disposition: ["Knows she's the best fighter pilot ever.", "Enjoys drinking and carousing as much as combat.", "A crack shot and happy to prove it.", "A bit of a daredevil."],
    cues: ["Watch this!", "Wanna bet?", "Hey there, care to buy a girl a drink?", "Let's play chicken!", "I'm feeling the need for speed!", "Okay, time to ante up!", "I like a good time!", "Five shots in the two-centimeter ring?", "You're on!", "WOOOHOOOOO!", "I think the captain is unhappy with me…", "Read 'em and weep, boys!", "How was I supposed to know he was the general's son?", "Sleep? Who needs it?", "Time to earn our keep!", "I'm going to buzz the tower!", "Anyone know where I can get a drink and a card game?", "As my pappy used to say…", "I get bored easily."]
  },
  {
    name: "Kaito Yukimura", page: 88,
    details: { faction: "Draconis Combine (House Kurita)", factionKey: "draconis", rank: "Chu-i", age: "21", height: "1.8m", weight: "80kg", experience: "regular" },
    tags: " Honorable  Idealistic  Confident  Eager  Disciplined",
    attributes: [2, 2, 2, 3, 1, 1],
    skills: [["piloting", 3, "mech"], ["gunnery", 5, "mech"], ["meleeCombat", 1], ["leadership", 3], ["protocol", 2], ["knowledge", 1, "Bonsai Trees"]],
    lifeModules: {"faction": "Draconis Combine (House Kurita)", "childhood": "Nobility", "education": "Military Academy", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "toughness", "name": "Toughness", "text": "Subtract 1 to all Physical and Fatigue Damage you receive. (Damage to Armor pips is not reduced.)"},
      {"polarity": "negative", "key": "enemy", "name": "Enemy", "text": "The GM may make your nemesis appear at any time to complicate your life."}
    ],
    weapons: ["Martial Arts", "Auto-Pistol (B)", { name: "Katana", from: "Sword/Katana" }],
    armor: "Flak Armor",
    inventory: ["Dress Uniform", "Field Uniform", "Noteputer", "Medical Kit", "Advanced Field Kit", "Military Communicator"],
    hardware: "Griffin",
    history: "Yukimura's family is minor nobility on Pesht, and he grew up on stories of warriors and combat. When he turned ten, he decided to be a soldier. Several of his family retainers, retired DCMS soldiers, helped train the young man. He entered Sun Zhang MechWarrior Academy, graduated in the top 10 percent of his class, and was the school's kendo champion. Now with the Fifth Sun Zhang Cadre, he has been promoted to chu-i and assigned to lance command. He expects to be transferred to a DCMS line regiment within six months.",
    personality: "Kaito is a cheerful and eager soldier. A few of his superiors think he's a little too cheerful and eager, but they cannot deny he is a leader who gets things done. Behind the cheerful disposition are an iron core and a disciplined mind. As far as he is concerned, he is serving the Dragon the best way he can.",
    disposition: ["Has a smile on his face most of the time.", "Practices with his katana every morning, rain or shine.", "Will never ask his subordinates to do anything he refuses to do.", "Is a loyal soldier of the Combine."],
    cues: ["Good Morning, Tai-i! What are we doing today?", "I'll lead the way.", "Yes, sir! I'll get on that right away!", "Musashi's The Book of Five Rings should be required reading for everyone.", "A true warrior unites the heart, mind, and soul.", "I am a humble servant of the Dragon.", "The sword is the soul of the warrior.", "We fight for the Combine, for the Coordinator, for the Dragon!", "We must show the Inner Sphere that we are the true heirs of the Star League.", "A warrior fights for honor.", "Let's show the enemy how true warriors fight!", "Know oneself before trying to know the enemy.", "My honor is central to me.", "I remember a story one of my father's retainers once told me…", "So, it's you…Shall we end it now?", "You have no honor.", "We attack!", "If I draw steel, there will be blood."]
  },
  {
    name: "Karen Dorantes", page: 90,
    details: { faction: "Draconis Combine (House Kurita)", factionKey: "draconis", rank: "Chu-i", age: "25", height: "1.55m", weight: "45kg", experience: "regular" },
    tags: " Assassin  Demolitions  Stealth  Spy",
    attributes: [1, 3, 2, 2, 2, 1],
    skills: [["acting", 2], ["athletics", 2], ["demolitions", 3], ["disguise", 2], ["escapeArtist", 2], ["meleeCombat", 1], ["smallArms", 2], ["stealth", 2], ["tracking", 1], ["zeroG", 1], ["knowledge", 1, "Psychology"]],
    lifeModules: {"faction": "Draconis Combine (House Kurita)", "childhood": "Spacer", "education": "Intelligence Operative Training", "realLife": "Covert Operations"},
    traits: [
      {"polarity": "positive", "key": "sixthSense", "name": "Sixth Sense", "text": "+1 to Perception Tests to avoid being surprised or ambushed."},
      {"polarity": "negative", "key": "compulsion", "name": "Compulsion", "text": "Dorantes secretly loves to blow things up. She takes pain to avoid causing unnec- essary loss of life but she suffers a –1 penalty to Tests made to resist incorporating explosives into an operation."}
    ],
    weapons: ["Martial Arts", "Needler Pistol", "C8 Satchel Charge"],
    armor: "Infiltration Suit",
    inventory: ["Personal Communicator", "Demolitions Toolkit", "Micro Reconnaissance Drone", "Holographic Disguise Hood"],
    hardware: "",
    history: "Karen Dorantes grew up on the Nakamura, a civilian JumpShip operating primarily within the Draconis Combine. Her parents asked their friend Tai-sa Khorasani—a diplomat who frequently used the Nakamura when traveling—to help place their daughter in one of the best youth academies on Luthien. They did not know that Khorasani was a DEST officer, who would quietly follow Karen's progress through her education. She recognized that Karen had aptitudes that would serve the DEST well. When the intelligence veteran offered the young woman the opportunity to train as a covert operative, she eagerly accepted.",
    personality: "Dorantes is difficult to pick out of a crowd. She is an expert at masking her motivations and true personality, and is easily mistaken as harmless and dismissive. She mistrusts nearly everyone but never shows it. Underneath, she is sardonic, impish, and clever. She avoids direct conflict but loves to carry out elaborate and explosive schemes.",
    disposition: ["Enjoys passing as harmless-looking.", "Avoids direct conflicts.", "Hides her true motivations and personality from almost everyone.", "Openly disdainful of warfare."],
    cues: ["Who, me?", "You MechWarriors always think you are invincible.", "How many BattleMechs have YOU destroyed without ever strapping into a cockpit?", "I think we can make this work, but I have an idea...", "If we set off charges here, it will make an excellent distraction.", "Keep your ammo in the can.", "Oh, my.", "They really were not expecting someone like me.", "Let us pretend to be civilized for a few minutes.", "So many gas leaks in this town...", "Relax. I am practically a surgeon with explosives.", "Oops...", "Konnichi wa. May I come in to use your restroom?", "Do I look like I could possibly be a threat to you?", "Should have taken me more seriously.", "Synchronize your chronometers.", "Do not stray too close to their ammunition depot.", "I serve the Draconis Combine better than any 'Mech jock ever could.", "Ending or preventing war is worth killing for.", "They will have no sign of danger until it is too late to avoid it."]
  },
  {
    name: "Miles van Ogden", page: 92,
    details: { faction: "Lyran Commonwealth (House Steiner)", factionKey: "lyran", rank: "Hauptmann", age: "25", height: "1.8m", weight: "77kg", experience: "regular" },
    tags: " MechWarrior  Officer  Diplomatic  Socialite  Noble  Connected",
    attributes: [1, 2, 1, 2, 2, 2],
    skills: [["gunnery", 2, "mech"], ["piloting", 2, "mech"], ["smallArms", 1], ["leadership", 3], ["negotiation", 2], ["protocol", 3], ["knowledge", 1, "Planetary Trade Exports"], ["knowledge", 1, "The Rich and Famous"]],
    lifeModules: {"faction": "Lyran Commonwealth (House Steiner)", "childhood": "Nobility", "education": "Military Academy", "realLife": "Travel"},
    traits: [
      {"polarity": "positive", "key": "rank", "name": "Rank", "text": "Hauptmann."},
      {"polarity": "negative", "key": "glassJaw", "name": "Glass Jaw", "text": "Add 1 to all Physical and Fatigue Damage you receive."}
    ],
    weapons: ["Martial Arts", { name: "Academy Dress Sword", from: "Sword/Katana" }, "Laser Pistol (E)"],
    armor: "Flak Armor",
    inventory: ["Boutique Personal Communicator", "Formal Dress Uniform", "Compact Camera", "Seemingly Endless Supply of Fine Spirits"],
    hardware: "Wolverine",
    history: "Miles was born with a silver spoon in his mouth as the eldest son of the van Ogdens of the planet Ford in the Lyran Commonwealth. His family has long numbered among the wealthy and powerful of House Steiner and owns many of the lucrative factory operations in the system. He grew up pampered and entitled, approaching military service as a combination of social obligations and opportunities. He found a natural talent for piloting BattleMechs but spent most of his time carousing and networking. Since receiving his commission, he has bounced from one easy garrison duty to another in well-defended, highly populated regions. He has spent the vast majority of his time in the military in his formal dress uniform and is much more comfortable solving conflicts through diplomatic means. The lone time Miles was called on to lead a lance against a pirate raid, he struck a deal with the pirate leader who then formed their pirate force into a legitimate mercenary company and was shipped off to augment Ford's planetary garrison.",
    personality: "Bold, brash, and beautiful! Miles has dashing good looks and inherited wealth, privilege, and elevated lineage as a significant vassal of House Steiner. He is always outspoken and friendly, constantly seeking people to converse with. He possesses a rare blend of self-obsessiveness and thoughtful attentiveness that attracts many and repels others, but he always seems to know how to smooth things over with the latter.",
    disposition: ["Always seems to be relaxing.", "Seems incapable of taking life-and-death matters seriously.", "Gregarious toward others at all times, even in the face of hostility.", "Pays close attention to conversation, but often tries to appear casual and inattentive."],
    cues: ["I'd like to propose a toast...", "Have you met my cousin?", "Charmed, I'm sure.", "I do believe we can make an accommodation, for propriety's sake.", "Just who do you believe you are dealing with?", "I've prepared a rousing speech to bolster our resolve for the coming battle.", "Where has everyone gone off to now?", "Fortune favors the bold.", "Onward to victory and glory!", "I believe I know someone who can help us with that little problem.", "I'm afraid we'll end up owing a few favors after this…", "Well, I never!", "I have the enemy in my crosshairs!", "They're shooting at me!", "Now that was absolutely uncalled for.", "Hold your fire! I call for parley!", "Well, I'm feeling quite undignified at the present moment.", "Don't you dare tell a soul about this!", "Who wants to get in on this photo?"]
  },
  {
    name: "Dana Barton", page: 94,
    details: { faction: "Lyran Commonwealth (House Steiner)", factionKey: "lyran", rank: "Chief Scientist, DefHes Industries Weapons, Quality Control Office", age: "27", height: "1.7m", weight: "50kg", experience: "veteran" },
    tags: " Thorough  Sarcastic  Blunt  Genius  No-Nonsense",
    attributes: [2, 3, 5, 2, 2, 1],
    skills: [["technician", 5], ["computers", 3], ["perception", 3], ["science", 3], ["knowledge", 4, "Weapons Systems"]],
    lifeModules: {"faction": "Lyran Commonwealth (House Steiner)", "childhood": "Blue Collar", "education": "Technical College", "realLife": "Postgraduate Studies"},
    traits: [
      {"polarity": "positive", "key": "techEmpathy", "name": "Tech Empathy", "text": "+1 bonus for any Tests directly involving technology."},
      {"polarity": "negative", "key": "glassJaw", "name": "Glass Jaw", "text": "Add 1 to all Physical and Fatigue Damage you receive."}
    ],
    weapons: ["Unarmed", "Hold-Out Pistol (B)", { name: "Penknife", from: "Knife/Dagger/Bayonet" }],
    armor: "Ablative Armor",
    inventory: ["Noteputer", "Deluxe Toolkit", "Handheld Laser Torch"],
    hardware: "Slipper LX-Series Hovercar",
    history: "Dana is the second child of a pair of commercial technicians. When she was sixteen, she designed and built her own military-grade laser for a science-fair project. DefHes saw her work and offered her a scholarship to technical college. After graduation, Dana joined DefHes and was assigned to the Quality Control Office; within four years, she was in charge. Responsible for ensuring DefHes weapons are of the highest quality, her reports describing a weapon's failure are known throughout the company for their colorful language and biting sarcasm.",
    personality: "Dana lives for her work. She rarely smiles except when a weapon test outperforms expectations, and she takes her job seriously. She runs every prototype and production model through a grueling battery of tests before clearing them. She usually reserves her sarcasm for her reports on failed weapons.",
    disposition: ["She works, eats once in a while, and sleeps whenever.", "She is loyal to her people but demanding.", "Quick to praise, quick to chew out.", "Wants to be left alone to do her job."],
    cues: ["Whoever built this subsystem should be replaced by an untrained wombat. The wombat will do just as well and work cheaper.", "You are two minutes late!", "I went camping once. Did not like it.", "I can rebuild this subsystem so it's twenty percent smaller and carry the power load much better.", "Good. Fantastic. Now can we go back inside?", "Good work. Now, make it smaller.", "What is it? I have three tests to do this afternoon and five reports to write.", "Someone please advise the higher-ups that our allotment of village idiots has already been exceeded this year.", "If humanity was intended to live outside, they wouldn't have invented climate control!", "All right, time to test this puppy!", "Okay, we know what went wrong.", "Let's find out why.", "Do I tell you how to be a bureaucrat?", "Don't tell me how to be a technician!", "I hate [insert any weather type].", "Double and triple-check everything!", "Clear the area unless you like being set on fire.", "I don't need a nap as long as the coffee holds out.", "I suppose I can take a few minutes to eat."]
  },
  {
    name: "Yasamin Turan", page: 96,
    details: { faction: "Capellan Confederation (House Liao)", factionKey: "capellan", rank: "Lance Leader", age: "20", height: "1.6m", weight: "52kg", experience: "regular" },
    tags: " MechWarrior  Warrior House Dai Da Chi",
    attributes: [2, 3, 1, 1, 3, 1],
    skills: [["gunnery", 4, "mech"], ["piloting", 2, "mech"], ["meleeCombat", 2], ["smallArms", 2], ["intimidation", 2], ["leadership", 1], ["protocol", 1], ["knowledge", 1, "House Liao History"]],
    lifeModules: {"faction": "Capellan Confederation (House Liao)", "childhood": "Noble", "education": "Family Training", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "citizenship", "name": "Citizenship", "text": "+1 to CHA tests when dealing with loyal citizens of the Capellan Confederation."},
      {"polarity": "negative", "key": "enemy", "name": "Enemy", "text": "Rival Mercenary MechWarrior"}
    ],
    weapons: ["Martial Arts", { name: "Telescoping Staff", from: "Staff" }, "Submachine Gun (B)"],
    armor: "Ablative Armor",
    inventory: ["Personal Comm", "Formal Dress Uniform", "Leatherbound Copy of the Quran", "Sunglasses with Optical Enhancements"],
    hardware: "Phoenix Hawk",
    history: "Lance Leader Yasamin Turan traces her family lineage to the days of the Star League, and the Turan family has served House Liao faithfully through every major conflict since the League's fall. Yasamin grew up with stories of the achievements of her ancestors, who became her childhood heroes. Of all her siblings, she showed the most determination and martial prowess, and she anticipated a career in the regular CCAF. However, upon reaching the age of twelve, she was instead given the honor of selection as a student for Warrior House Dai Da Chi. Since her graduation, she has seen several combat actions. She thwarted one mercenary raid when her battered and nearly disabled 'Mech struck a killing blow with a Death from Above maneuver.",
    personality: "Lance Leader Turan is fierce and intense, and blindly loyal to the Capellan Confederation. She was raised from a very young age to be a great warrior, and she has seized every opportunity to become the hero that her ancestry demands. Her tactics tend to be straightforward, but since the teachings of Sun Tzu have instilled the virtue of deception as a natural part of warfare, she delights in every opportunity to trick and surprise her foes. More concerned with victory than violence, she is always eager to press her enemy to surrender rather than fight to the bitter end.",
    disposition: ["Usually seems to be on the edge of bursting into action.", "Expresses zealous loyalty to House Liao at every opportunity.", "Masks an impish sense of humor behind proper etiquette and protocol.", "Has trouble letting go and having fun when not on duty."],
    cues: ["For the Capellan Confederation!", "Now you will see what a true MechWarrior is capable of!", "I was born for this!", "Don't worry. I've got jump jets.", "Do you want me to be the anvil or the hammer?", "Cold cockpits are for cowards.", "Mercs and pirates are all the same to me.", "If you can't solve a problem with a large laser, you need more time in the simulator pod.", "I think we can turn this to our advantage.", "Sun Tzu said, “In the midst of chaos, there is also opportunity.”", "To paraphrase the wisdom of Sun Tzu: “A wise general never passes up good salvage.”", "OK, this is what we planned for.", "Why do the astechs always glare at me like that?", "There goes the plan.", "Time to look for those opportunities!", "I think I wore out my shutdown-override button.", "I know what to do, but it's not going to be easy.", "Today we stand against those who would bring chaos and destruction to the good and loyal citizens of this planet.", "They won't get past me."]
  },
  {
    name: "Carter Xing", page: 98,
    details: { faction: "Capellan Confederation (House Liao)", factionKey: "capellan", rank: "Lance Sergeant", age: "24", height: "1.8m", weight: "84kg", experience: "veteran" },
    tags: " Tough  Fearless  Infantry  Committed  Drillmaster",
    attributes: [3, 2, 2, 3, 2, 1],
    skills: [["smallArms", 5], ["leadership", 2], ["supportWeapons", 4], ["streetwise", 3], ["tactics", 4], ["knowledge", 1, "Capellan Military History"]],
    lifeModules: {"faction": "Capellan Confederation (House Liao)", "childhood": "Street", "education": "Military Enlistment", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "toughness", "name": "Toughness", "text": "Subtract 1 to all Physical and Fatigue Damage you receive (Damage to Armor pips is not reduced.)"},
      {"polarity": "negative", "key": "dependents", "name": "Dependents", "text": "The GM may use this negative Trait in the story at any time."}
    ],
    weapons: ["Martial Arts", { name: "Knife", from: "Knife/Dagger/Bayonet" }, "Rifle (B)", "Auto-Pistol (B)"],
    armor: "Flak Armor",
    inventory: ["Field Communicator", "Medical Kit", "Binoculars", "Flashbang Grenades"],
    hardware: "Bayamo Hoverbike",
    history: "Carter was a street punk who was picked up on a burglary charge. At trial, he was given a choice: jail or military service. He chose the military and quickly realized he had found a home. He graduated as a top recruit and was promoted to lance corporal in his Home Guard regiment. During his first three years of service, he was promoted to lance sergeant, got married, and was made the training NCO for his company. He is well aware of the eyes on him and he has accomplished everything asked of him and more. More than a few suspect he will be soon promoted to assistant force leader.",
    personality: "In the field, Carter is the NCO held up as an example of the ideal Home Guard soldier. He drills the soldiers in his company relentlessly, is quick to correct mistakes and is grudging with his praise. Nothing escapes his attention, and he has seen all the scams, despite his relatively young age. Off duty, he is wholly devoted to his wife and child.",
    disposition: ["When on duty: focused and driven. When off duty: quiet and relaxed.", "Wants to make his company the best in the regiment.", "Always teaching and quick to correct mistakes.", "Eager to do anything asked of him."],
    cues: ["Come on, you Kuòyú! We only have another ten kilometers to run!", "My job is to make sure your death is not a waste.", "Listen up, worms!", "I pulled that that stunt years ago.", "Didn't work then, not going to work now.", "Drop and give me fifty!", "No, no, this is how you shoot.", "If the Celestial Wisdom demands you sacrifice your life, you will do so without hesitation!", "Follow me!", "I am a Capellan soldier first, a husband second.", "This is Capellan soil, and we will defend it to our last breath!", "What do you need done, sir?", "My family is why I do this.", "Good. Now go back and do it again, only faster!", "Better to bleed in training than in battle!", "The Celestial Wisdom is infallible.", "You are not.", "Attention!", "Never expect the enemy to be stupider than you.", "Everyone would do well to memorize Sun Tzu's The Art of War. I have."]
  },
  {
    name: "Edwin Mendoza", page: 100,
    details: { faction: "Free Worlds League (House Marik)", factionKey: "fwl", rank: "Staff Sergeant", age: "33", height: "1.8m", weight: "90kg", experience: "regular" },
    tags: " Tanker  Silver Hawks Coalition  Gruff  No-Nonsense  Career Soldier",
    attributes: [2, 3, 1, 2, 2, 1],
    skills: [["gunnery", 4, "vehicle"], ["piloting", 2, "vehicle"], ["smallArms", 2], ["supportWeapons", 1], ["leadership", 2], ["survival", 3], ["knowledge", 1, "Parliamentary Law"]],
    lifeModules: {"faction": "Free Worlds League (House Marik)", "childhood": "War Orphan", "education": "Military Enlistment", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "equipped", "name": "Equipped", "text": "Choose 2 additional Inventory during character creation."},
      {"polarity": "negative", "key": "poorHearing", "name": "Poor Hearing", "text": "–1 penalty to Perception Tests involving hearing."}
    ],
    weapons: ["Martial Arts", "Auto-Pistol (B)", ["Vibroblade", "4S", "OK", "—", "—"]],
    armor: "Flak Armor",
    inventory: ["Armor Crew Kit", "Deck of Four-Card Drax Cards", "Mother's Dog Tags", "Micro Recorder", "Expensive Cigar"],
    hardware: "Vedette Medium Tank",
    history: "Young Edwin Mendoza lost both of his parents to a Lyran Commonwealth raid on the Silver Hawks Coalition world of Amity. His mother's 'Mech was shot down in the opening moves of the battle, and a building collapsed on his civilian father when the fighting spilled into the city of Stryker, Amity's capital. To escape unsympathetic relatives, Edwin enlisted in the FWLM at his earliest opportunity, hoping to become a MechWarrior like his mother and find some way of avenging her death. To his dismay, however, his aptitude scores and the lack of available MechWarrior billets in both provincial and federal forces placed him in an armor unit instead. He has served with distinction in the Kalidasa Guard armor regiment of the Silver Hawk Irregulars ever since, and he dreams of the day he can put an enemy 'Mech in his tank sights and single-handedly shoot it down instead of focusing on anti-infantry missions.",
    personality: "Sergeant Mendoza has had enough of your lip, soldier. You'll do what he says, when he says it, and he won't apologize or back down. But he'll stick by your side when the depleted uranium starts flying.",
    disposition: ["Doesn't believe he'll live to see retirement.", "Expects others to jump when he lays down the law.", "More loyal to the Silver Hawks Coalition than to the Free Worlds League.", "Isn't scared of BattleMechs in combat."],
    cues: ["Bitching goes up the chain of command, not down.", "This tank is your life, soldier. Treat her wrong, and you probably won't live long enough to regret it.", "All we ever do on our downtime is play cards…", "Get the lead outta yer ass!", "Hate to burst yer bubble, but these chevrons mean you do what I say, ¿comprende?", "Drop and give me twenty!", "Do you smell somethin' burning in here?", "Don't just stand there! Shoot somethin'!", "Madre de dios…Of all the incompetent rooks I had to get saddled with…", "What the hell're you laughin' at, chucklehead?", "I didn't come up with this cockamamie strategy. Blame the brass.", "I'll fight for the Silver Hawks worlds.", "Rest of the League can burn, for all I care.", "Them Steiners, they build damn good tanks, not like this here rust bucket.", "Contact! Traverse left!", "We only invaded the Lyran Commonwealth to get cases of Timbiqui Dark.", "Will Parliament ever get off their collective asses and send us some decent equipment?", "All Capellans look like they're up to something.", "You think we've got it bad?", "At least we're not in the Periphery…"]
  },
  {
    name: "Celia Young", page: 102,
    details: { faction: "Free Worlds League (House Marik)", factionKey: "fwl", rank: "Resistance Leader", age: "24", height: "1.7m", weight: "59kg", experience: "regular" },
    tags: " Rebel  Guerrilla  Perceptive  Stealthy  Clever",
    attributes: [1, 2, 2, 2, 3, 1],
    skills: [["escapeArtist", 1], ["smallArms", 2], ["stealth", 2], ["communications", 2], ["demolitions", 2], ["perception", 2], ["intimidation", 1], ["leadership", 2], ["negotiation", 1], ["streetwise", 3], ["knowledge", 1, "Political Science"]],
    lifeModules: {"faction": "Free Worlds League (House Marik)", "childhood": "Street", "education": "Technical College", "realLife": "Guerilla Insurgent"},
    traits: [
      {"polarity": "positive", "key": "equipped", "name": "Equipped", "text": "Choose 1 additional weapon during character creation"},
      {"polarity": "negative", "key": "inForLife", "name": "In for Life", "text": "Celia is being hunted by counterintelligence forces, who have been tracking her ever since they captured her mentor."}
    ],
    weapons: ["Unarmed", "Laser Pistol (E)", "Rifle (B)", { name: "Explosive Charges", from: "C8 Satchel Charge" }],
    armor: "Concealed Ablative Armor",
    inventory: ["Comm Unit Hacking Tool", "Balaclava", "Stash of Contraband", "Propaganda Pamphlets"],
    hardware: "",
    history: "Celia Young grew up on the planet Ford in the Lyran Commonwealth, after her grandparents emigrated from Marik space on a business venture that fell apart while the family was in transit. They fell on hard times, and Celia's parents both died tragic deaths in poverty. After several bad foster homes, she ran away and survived on her own. Her life seemed to change for the better when she met a young operative serving the Free Worlds League. He saw some potential in her and used his connections to set her up in a local technical college. He kept in touch over the years and began using her to place listening devices in communications equipment. He disappeared several months ago, leaving Celia to carry on the task of fomenting rebellion against the corrupt government.",
    personality: "Celia appears friendly and relaxed at first glance, but her eyes are always scanning every corner for signs of danger or betrayal. She has lived almost her entire life in danger of one form or another and is never completely relaxed. She is passionate about the incredible income inequality she has seen on Ford. Cautious and clever, she tends to avoid fights as much as possible–but won't back down from any chance to strike back at the powerful who oppress the weak.",
    disposition: ["Outwardly friendly and laid back, seemingly at ease at most times.", "Always watching for signs of subtext and hidden meaning in conversation.", "Quick to stand up for anyone unjustly treated by the wealthy or powerful.", "Prefers less direct and more convoluted approaches to overcoming obstacles."],
    cues: ["Something doesn't feel right about this.", "We've got to do something.", "I don't think we're alone anymore.", "I think I know a shortcut or two.", "We could always arrange a distraction.", "Just because they own the factories doesn't give them the right to own our lives!", "Hand me those charges...carefully.", "Let's see them try to suppress this!", "There are other ways. Other governments who value freedom instead of just profits.", "I'm only one person, and I'm not the beginning or the end of this movement.", "If only more people stood up for each other, we would never have such poverty.", "I won't let you do this on your own.", "I know the perfect place where we can hide out.", "Time for drastic measures.", "I'm not the only one ready to put her life on the line for a better world.", "The Free Worlds League is different.", "I suppose you don't want this little bag of party favors then, do you?", "I knew you'd find your conscience in there somewhere."]
  },
  {
    name: "Pellean “Ironhead” Taliaferro", page: 104,
    details: { faction: "Mercenary (Hansen's Roughriders)", factionKey: "mercenary", rank: "Sergeant", age: "30", height: "1.95m", weight: "105kg", experience: "veteran" },
    tags: " Confident  Brawler  Rowdy  Steady  Reflective",
    attributes: [4, 3, 2, 2, 1, 1],
    skills: [["piloting", 3, "mech"], ["gunnery", 4, "mech"], ["smallArms", 4], ["artillery", 3], ["meleeCombat", 4], ["knowledge", 1, "Drinking Games"]],
    lifeModules: {"faction": "Mercenary (Hansen's Roughriders)", "childhood": "Mercenary Brat", "education": "Military Enlistment", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "painResistance", "name": "Pain Resistance", "text": "Ignore the first wound modifier on both Damage Tracks."},
      {"polarity": "negative", "name": "TDS—Transit Disorientation Syndrome", "text": "–2 penalty to all Tests taken within 20 minutes after a hyperspace jump (GM's discretion)."}
    ],
    weapons: ["Martial Arts", "Auto-Pistol (B)", { name: "Knife", from: "Knife/Dagger/Bayonet" }, ["Brass Knuckles", "1S", "OK", "—", "—"]],
    armor: "Flak Armor",
    inventory: ["Field Uniform", "Military Communicator", "Medical Kit", "Bottle of Whiskey"],
    hardware: "Marauder",
    history: "Both of Pel's parents were members of Hansen's Roughriders, and the rowdy mercenaries are Pel's extended family. He became a 'Mech pilot and worked his way into the second slot of his current lance. His nickname “Ironhead” came from a barroom brawl in which he head-butted three Waco Rangers, knocking the trio unconscious. On the battlefield, he is all business and cool under fire. Hansen cycles new lieutenants through Pel's lance, relying on the sergeant's steadiness and knowledge to keep the lance on an even keel while the new lieutenants find their footing.",
    personality: "On the surface, Pel is a typical Roughrider: loud, boisterous, and ready to drink or fight at the drop of a hat. But other times, he withdraws into himself to remember the friends he has lost along the way. When he's in this mood, those who know him leave him alone. The moods don't last long before he's back to his normal rowdy self.",
    disposition: ["Loves a good drink, a good fight, or both.", "Will stand with his fellow Roughriders, come hell or high water.", "Feels a little guilty about surviving when friends didn't.", "All business on the battlefield."],
    cues: ["You call that a punch?", "My mother hit me harder than that!", "Friend, you shouldn'ta done that.", "Eat particles, you ugly slug!", "A good beer and good company is all I need.", "The LTs are getting younger every day.", "The Roughriders are my family, and you do not mess with family—ever!", "Here's to the ones who've left us.", "May they find peace.", "I'm here to drink, but if you want a fight, that's fine by me.", "All right, you heard the lieutenant!", "Business is business, and pleasure is pleasure.", "Never mix the two.", "Follow my lead.", "You want to know what they call me Ironhead?", "Here's why!", "I hate jumps and JumpShips. They ain't natural.", "As a prison cell, this one isn't too bad.", "We follow orders, understood?", "Lieutenant? May I suggest that…", "First round's on me!", "I miss my friends."]
  },
  {
    name: "Danika McDonnell", page: 106,
    details: { faction: "Mercenary (Wolf's Dragoons)", factionKey: "mercenary", rank: "Lieutenant", age: "27", height: "1.9m", weight: "92kg", experience: "veteran" },
    tags: " MechWarrior  Maverick  Calm  Confident Exterior",
    attributes: [2, 3, 2, 3, 2, 1],
    skills: [["gunnery", 3, "mech"], ["piloting", 3, "mech"], ["athletics", 2], ["meleeCombat", 2], ["smallArms", 2], ["supportWeapons", 1], ["perception", 2], ["tactics", 1], ["leadership", 1], ["protocol", 1], ["knowledge", 1, "Mercenary Companies"]],
    lifeModules: {"faction": "Mercenary (Wolf's Dragoons)", "childhood": "Mercenary Brat", "education": "Military Enlistment", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "goodVision", "name": "Good Vision", "text": "+1 to Visual Perception Tests."},
      {"polarity": "negative", "key": "unattractive", "name": "Unattractive", "text": "–1 Penalty to CHA tests where physical appearance matters."}
    ],
    weapons: ["Martial Arts", "Stunstick", "Laser Pistol (E)", { name: "Grenade Launcher", from: "Grenade Launcher (High-Explosive)", special: "High-Explosive Grenade: 8. Anti-Personnel Grenade: 10. May attack up to three different targets per Narration." }],
    armor: "Ablative Armor",
    inventory: ["Personal Comm", "Formal Dress Uniform", "Pet Robot Kitten", "Tattooing Kit"],
    hardware: "Thunderbolt",
    history: "Danika grew up around BattleMechs. Her parents both serve as DropShip technicians for Wolf's Dragoons, but she was more enamored with the BattleMechs they transported than the ships that carried them. Ever since she learned to walk and talk, she spent every waking moment around the giant machines and the Dragoons' simulator pods. Every MechWarrior appreciates the crew who maintain the ships that get them out of danger, so it was an easy matter to arrange an apprenticeship. Danika's unorthodox education and unflinching dedication to excellence made her fit right in with the other MechWarriors. She earned her place among the elite Black Widow Company by being one of the best and most unpredictable warriors among the ranks of Wolf's Dragoons.",
    personality: "Serving under Natasha Kerensky of the famed and feared Black Widow Company of the Wolf's Dragoons carries a lot of baggage, but McDonnell is determined to carry it well. She's fought hard side-by-side with some of the best and most iconoclastic MechWarriors the Inner Sphere has ever seen, and she knows she numbers among them. Stoic, stern, and confident, she is a reassuring presence to her allies and an implacable, inevitable force of destruction to her enemies.",
    disposition: ["Cold, calm, and solid in the face of danger and surprise.", "She's worked hard to earn her spot, and she's not afraid to fight to keep it.", "This might seem like the worst to you, but it's just another day to her.", "Just because she isn't panicking doesn't mean she knows what to do next."],
    cues: ["It's as good as scrap.", "Time to earn our C-Bills.", "This is what they pay us the big bucks for.", "It's not just our lives that are at stake, but also our reputation.", "Respect is earned on the battlefield.", "Fear is the first foe we defeat today.", "They don't think we can break through, do they?", "We'll just have to see about that.", "Now that's what I call an alpha strike!", "Form up and draw them to my position.", "On my mark, execute maneuver Hourglass Delta!", "They'll barely have time to eject.", "Who wants matching tattoos?", "I think we just made them angry.", "Which plan are we on now?", "And that's why I love Thunderbolts.", "Didn't think I could fit my T-Bolt there, did you?", "All that's left now is to collect our pay."]
  },
  {
    name: "Carson Stosser", page: 108,
    details: { faction: "Mercenary (Kell Hounds)", factionKey: "mercenary", rank: "Lieutenant", age: "35", height: "1.7m", weight: "85kg", experience: "regular" },
    tags: " Uncertain  Stiff  Quick  Wide-Eyed  Social",
    attributes: [2, 2, 2, 2, 2, 1],
    skills: [["piloting", 2, "mech"], ["gunnery", 3, "mech"], ["protocol", 4], ["tactics", 3], ["knowledge", 3, "Bureaucracy"]],
    lifeModules: {"faction": "Mercenary (Kell Hounds)", "childhood": "Nobility", "education": "Military Academy", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "wealthy", "name": "Wealthy", "text": "+1 Hardware Points."},
      {"polarity": "negative", "key": "unlucky", "name": "Unlucky", "text": "Whenever you spend a point of EDG to reroll, add a Crit Die to your roll; if the Crit Die rolls a 6, something bad happened, even if the roll otherwise succeeds."}
    ],
    weapons: ["Martial Arts", "Laser Pistol (E)", { name: "Knife", from: "Knife/Dagger/Bayonet" }],
    armor: "Flak Armor",
    inventory: ["Kell Hounds Uniforms", "Advanced Field Kit", "Notebook of Contacts", "Star League-Era Neurohelmet"],
    hardware: "Archer",
    history: "Carson never expected to be part of the Kell Hounds' command company. The third son of a duke, all he wanted to do was serve the Commonwealth. After graduating from the Nagelring, he served two tours of duty in the Second Royal Guards but found that his superiors were too much “social” and not enough “general.” A chance encounter with Patrick Kell led to Carson retiring from the LCAF and joining the Kell Hounds. As a member of Kell's command company, Carson acts as a liaison between the Hounds and the LCAF.",
    personality: "Carson still doesn't know how he managed to get accepted into the Kell Hounds, especially at such a position of importance as the command company. As such, he walks as if on eggshells and acts uneasy at staff meetings. He's more comfortable leading his lance on the battlefield or handing relations between the unit and the LCAF. His nervousness has led to occasional gaffes, but he is quick to recover. He does, however, like the way he looks in the Kell Hounds' dress uniform.",
    disposition: ["Comfortable on the battlefield and in the Commonwealth's bureaucracy", "Tends to stay silent in staff meetings unless asked a direct question.", "Proud to be a Kell Hound, but still uncertain how he was that lucky.", "Point man when there's a problem between the Hounds and the LCAF."],
    cues: ["I have nothing more to add, sir.", "Now, what is the problem with those supply forms?", "What did I do to deserve this?", "I'll talk to the colonel.", "Tighten up the formation!", "My father used to say…", "I'm proud to be a Kell Hound.", "If you can't resolve it, I'll talk to your supervisor.", "I will make sure we get every single gram of supplies we requested.", "Is there a problem?", "Why did that have to happen now?", "The colonel wanted it done yesterday!", "Don't feed me that bureaucratic bull.", "I know all the excuses.", "Do you know who my father is?", "Oh, hell.", "I know someone I can call…", "I don't gamble unless I have to.", "See that 'Mech? Make it go away."]
  },
  {
    name: "Lovisa Bjornstrom", page: 110,
    details: { faction: "Mercenary (Gray Death Legion)", factionKey: "mercenary", rank: "Lieutenant", age: "24", height: "1.6m", weight: "46kg", experience: "regular" },
    tags: " Quick  Observant  Alert  Scout  Runner",
    attributes: [1, 3, 2, 2, 2, 2],
    skills: [["gunnery", 2, "mech"], ["piloting", 4, "mech"], ["technician", 2], ["tactics", 3], ["perception", 3], ["knowledge", 1, "Star League History"]],
    lifeModules: {"faction": "Mercenary (Gray Death Legion)", "childhood": "Blue Collar", "education": "Officer Candidate School", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "sixthSense", "name": "Sixth Sense", "text": "+1 bonus for Perception Tests to avoid being surprised or ambushed."},
      {"polarity": "negative", "key": "compulsion", "name": "Compulsion", "text": "–1 penalty on Tests to resist your compulsion (speed)."}
    ],
    weapons: ["Martial Arts", "Auto-Pistol (B)", ["Kukri Knife", "2S", "OK", "—", "—"]],
    armor: "Concealed Ablative Armor",
    inventory: ["Motorcycle Keys", "Family Heirloom from Draconis Combine", "Military Communicator", "Deluxe Toolkit"],
    hardware: "Locust",
    history: "Lovisa's parents escaped the Draconis Combine and fled into the Lyran Commonwealth half a step ahead of the ISF. Lovisa developed a love of speed from a young age. Seeing her neurohelmet test results, the LCAF offered her an officer candidate school slot, with a transfer to the Nagelring for advanced training after OCS graduation. Despite her excellent grades, the Lyran Intelligence Corps blocked her transfer to the Nagelring, citing irregularities in her family's background. Crushed, she fell into a deep despair and was dishonorably discharged from the LCAF for acting out. A fellow OCS cadet who sympathized with her plight put her in contact with Davis McCall of the Gray Death Legion. McCall, impressed by her grades and abilities, hired her.",
    personality: "Lovisa is always moving. She takes no performance-enhancing drugs and rarely drinks coffee, but she is wired from the time she gets up until she goes to sleep. Speed is her obsession— the faster, the better—to the point that she goes everywhere at top speed. She disdains both the LCAF and the LIC.",
    disposition: ["Can't sit still.", "Dislikes heavy and assault 'Mechs.", "Aware of everything going on around her.", "Always tinkering with her machines to make them go faster."],
    cues: ["I always know what's going on around me.", "Did I mention I hate the Combine?", "There's something wrong up ahead.", "About time you guys showed up.", "Moving targets are harder to hit, and I'm always moving.", "I don't like relying on someone else's intelligence for anything.", "We have to do something…", "What's the use of having all that firepower if it takes you forever to get anywhere?", "Give me twenty minutes, and I'll have it all back together! I promise!", "LIC, ISF—I don't trust any intel organizations as far as I can throw them.", "Without the Legion, I don't know what I'd be.", "The LIC? You mean the “Lost, Incompetent Cretins”?", "Not a big fan of them.", "I think I can get another couple of kph if I tweak this…", "Well, well, well, if it isn't the LCAF: slow of mind and movement.", "Wanna race?", "I'm paid to find things, not shoot things!", "Give me enough time, and I'll tell you what they had for breakfast!", "I don't have to outfight anyone, just outrun them."]
  },
  {
    name: "Joshua Maron", page: 112,
    details: { faction: "Mercenary (Eridani Light Horse)", factionKey: "mercenary", rank: "Captain", age: "36", height: "1.8m", weight: "59kg", experience: "veteran" },
    tags: " MechWarrior  Adventurous  Survivor",
    attributes: [2, 3, 3, 2, 2, 3],
    skills: [["gunnery", 3, "mech"], ["piloting", 3, "mech"], ["smallArms", 1], ["stealth", 1], ["artillery", 2], ["communications", 1], ["navigation", 1], ["perception", 1], ["tactics", 2], ["tracking", 2], ["leadership", 1], ["knowledge", 1, "Carnivorous Wildlife"]],
    lifeModules: {"faction": "Mercenary (Eridani Light Horse)", "childhood": "Backwoods", "education": "Military Enlistment", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "rank", "name": "Rank", "text": "Captain."},
      {"polarity": "negative", "key": "poorHearing", "name": "Poor Hearing", "text": "–1 to Hearing-based Perception Tests."}
    ],
    weapons: ["Martial Arts", "Auto-Pistol (B)", "Laser Rifle (E)", "Vibrodagger"],
    armor: "Flak Armor",
    inventory: ["Personal Comm", "Formal Dress Uniform", "Tooth from a Massive Predator", "Portable Jamming Device"],
    hardware: "Valkyrie",
    history: "Joshua Maron grew up on a sparsely populated planet with exceptionally dangerous flora and fauna and a known pirate presence operating outside the reach of civilization. While most of his fellow citizens stayed within the high walls and protective fields that deterred the many predators, human and otherwise, Joshua often went exploring. When the Eridani Light Horse was hired to find and rescue people captured for enslavement by one of the pirate warlords, they found Maron to be an indispensable guide and offered him ongoing employment. He agreed only after they offered to train him as a MechWarrior. Over the years he has proved himself a capable and wily scout who knows exactly when to strike with speed and surprise and when to evade action.",
    personality: "Maron always seems to be enjoying a joke that only he gets. The galaxy is a strange place, full of interesting things to observe and try not to get killed by, and he takes every day as a new adventure. He rarely does what people expect and relishes every opportunity to surprise his friends as well as his foes. The scarier and more chaotic things get, the more his sense of humor comes to the surface.",
    disposition: ["Always seems to be cooking up a scheme.", "Comes off as an adrenaline junkie, seeming to relish extreme danger.", "Rarely passes up an opportunity to make a pun.", "Doesn't like to sit still."],
    cues: ["Now we ride.", "Let's see if they can keep up.", "I don't think they know we're here.", "Tonnage isn't everything.", "I love a good flank attack!", "Here, have a ten-rack in the back!", "Hit 'em hard and run for your lives!", "They're going to feel that in the morning.", "Don't worry, I brought enough missiles for you too!", "Time to make some noise!", "What?", "Let's go find the path to victory.", "I don't think they want us up there. Let's see what my jump jets have to say about that.", "Marking targets for artillery strike now…", "On my mark, unload everything into their rear and engage jump jets.", "I've got visual confirmation of the entire enemy formation.", "So that's how the ejection system works…", "Look out below!"]
  },
  {
    name: "Jamie Grear", page: 114,
    details: { faction: "Mercenary (Northwind Highlanders)", factionKey: "mercenary", rank: "Lieutenant", age: "23", height: "1.7m", weight: "72kg", experience: "regular" },
    tags: " MechWarrior  Former Slave  Passionate  Parent  Gamer",
    attributes: [1, 3, 2, 3, 1, 1],
    skills: [["gunnery", 2, "mech"], ["piloting", 3, "mech"], ["athletics", 1], ["smallArms", 2], ["zeroG", 1], ["science", 1], ["tactics", 1], ["perception", 2], ["knowledge", 1, "Human Trafficking"], ["knowledge", 1, "Photography"]],
    lifeModules: {"faction": "Mercenary (Northwind Highlanders)", "childhood": "Slave", "education": "Military Academy", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "combatSense", "name": "Combat Sense", "text": "Choose when to take your Narration in the turn order without needing to spend a Plot Point."},
      {"polarity": "negative", "key": "dependents", "name": "Dependents", "text": "The GM may use this negative Trait in the story at any time."}
    ],
    weapons: ["Martial Arts", "Laser Pistol (Hold-Out) (E)", "Vibrodagger"],
    armor: "Concealed Ablative Armor",
    inventory: ["Personal Comm", "Portable VR Game Console", "Chemistry Field Kit", "High Quality Holovid Camera"],
    hardware: "Shadow Hawk",
    history: "Jamie Grear was born into slavery, and her life would have been brief and unpleasant if not for the Northwind Highlanders being hired to disrupt the slavers' operation. At a crucial moment, she attacked one of the slavers as he was getting dressed combat, and then she fired one of the slavers' support guns into an ammunition storage bay to throw the enemy into disarray. When the Highlanders liberated her along with the other slaves, the officer who led the operation arranged for her to receive a scholarship to a private military academy. She took this chance and worked hard to become a capable MechWarrior, eventually signing with the Northwind Highlanders upon graduation. She is currently raising two orphan children who travel with her, and she donates most of her pay to organizations that help victims of slavers.",
    personality: "Grear is confident and passionate and readily shares her thoughts and feelings with those around her. Many mistake this for naiveté, but she is careful and intelligent. She takes both life and leisure very seriously, and never forgets her childhood spent as a slave. She feels incredibly lucky to have escaped that fate and takes every chance she gets to pay that good fortune forward. Grear looks younger than her years due to malnutrition in her childhood, and she is used to having people underestimate her.",
    disposition: ["Tries to make everyone in her command feel important and valued.", "Secretly enjoys having people underestimate her, and seeing their surprise at learning their mistake.", "Values human life over hardware.", "Has no mercy for slavers or pirates."],
    cues: ["Stay sharp everyone. We'll be on them soon.", "When I want your opinion, I'll ask for it via HPG.", "Nice one!", "Watch your ranges and stay in formation.", "Let's do this by the numbers.", "Everyone focus fire on my target.", "Don't let them get behind you.", "Let's pull back and cool off a bit.", "Don't you dare!", "I've got kids to feed.", "I can't wait to get a sample of that!", "No mercy for slavers.", "Come look at this!", "I only look young because I am young.", "There's no way we're leaving those people behind.", "That's a problem we can solve with the direct application of high-velocity depleted uranium.", "Can we do that again?", "I forgot to hit the record button.", "Nobody messes with my family."]
  },
  {
    name: "Sandor Kalman", page: 116,
    details: { faction: "ComStar", factionKey: "comstar", rank: "Acolyte II-Alpha", age: "21", height: "1.75m", weight: "79kg", experience: "green" },
    tags: " Quiet  Believer  Devout  Student  Gentle",
    attributes: [1, 1, 3, 2, 1, 1],
    skills: [["communications", 3], ["computers", 3], ["protocol", 3], ["science", 1], ["knowledge", 1, "HPG Systems"]],
    lifeModules: {"faction": "ComStar", "childhood": "White Collar", "education": "Technical College", "realLife": "ComStar Service"},
    traits: [
      {"polarity": "positive", "key": "techEmpathy", "name": "Tech Empathy", "text": "+1 bonus for any Tests directly involving technology."},
      {"polarity": "negative", "key": "inForLife", "name": "In for Life", "text": "The GM may use this negative Trait in the story at any time."}
    ],
    weapons: ["Unarmed", { name: "Collapsible Baton", from: "Club" }],
    armor: "Concealed Flak Armor",
    inventory: ["Leatherbound copy of The Word of Blake", "ComStar Acolyte Robes", "Civilian Communicator", "Deluxe Toolkit"],
    hardware: "Bayamo Hoverbike",
    history: "Sandor grew up in an upper-middle-class family in the Free Worlds League. He became interested in technology early in life and graduated with a degree in communications systems. Dissatisfied with the local job market, he met with a ComStar recruiter who convinced him to join the Order. Now stationed in the Draconis Combine's Periphery border, his days are filled with learning HPG maintenance basics and the correct litanies and hymns from the operation manuals. At night, he reads The Word of Blake and related material, absorbing everything he can about ComStar.",
    personality: "Sandor is a quiet man, always polite and respectful. He found a home in the Order and expects to make it his life's work. He is comfortable with technology, even if he's not quite sure why the litanies and hymns from the operation manuals are treated like holy scriptures. He now believes that Blake's ideas are the ones to carry the Inner Sphere forward into a new era of peace and prosperity.",
    disposition: ["A committed pacifist.", "Dedicated to his work, even when he doesn't quite understand the technicalities.", "Keeps to himself.", "Neat and orderly."],
    cues: ["Blessed be Blake.", "I am not a violent man.", "This place is a mess!", "I study to improve myself.", "I am not sure why we treat the operations manual as a holy book, but I can live with it.", "I understand the underlying theory of the hyper pulse generator, but not the technology—yet.", "Violence never solves anything.", "I see the problem. Give me a few minutes, and I'll have it running.", "I have found my place in the universe.", "Guns are not the way to solve a problem.", "I know where the file is on the system.", "Ready to transmit.", "The peace of Blake be upon you.", "I'll check the subsystem.", "That's where the fault was last time.", "I spend most nights reading and thinking about Jerome Blake's words.", "As the Blessed Blake says…", "I see…Your solution is to hit it?", "We call that “percussive maintenance.”", "Greetings. How may I help you?"]
  },
  {
    name: "Cass Krandall", page: 118,
    details: { faction: "Pirate (Independent)", factionKey: "pirate", rank: "Queen Bee", age: "28", height: "1.8m", weight: "105kg", experience: "regular" },
    tags: " Survivor  Scalawag  Intimidating  Resourceful",
    attributes: [3, 3, 1, 1, 2, 1],
    skills: [["escapeArtist", 1], ["gunnery", 1, "vehicle"], ["piloting", 1, "vehicle"], ["meleeCombat", 2], ["supportWeapons", 2], ["stealth", 1], ["perception", 1], ["acting", 1], ["intimidation", 2], ["streetwise", 2], ["knowledge", 1, "Black Markets"]],
    lifeModules: {"faction": "Pirate (Independent)", "childhood": "Street", "education": "Military Enlistment", "realLife": "Organized Crime"},
    traits: [
      {"polarity": "positive", "key": "toughness", "name": "Toughness", "text": "Subtract 1 to all Physical and Fatigue Damage you receive. (Damage to Armor pips is not reduced.)"},
      {"polarity": "negative", "key": "badReputation", "name": "Bad Reputation", "text": "–1 penalty to CHA-based tests involving someone who knows her pirate reputation."}
    ],
    weapons: ["Martial Arts", "Machine Gun (B)", "Stunstick"],
    armor: "Flak Armor",
    inventory: ["Personal Communicator", "Jolly Roger Holo-Banner", "Authentic Bleached Human Skull", "Erhu (Spike Fiddle) and Bow"],
    hardware: "Condor Heavy Hover Tank",
    history: "Cass Krandall doesn't remember her parents or much of her traumatic childhood. She grew up on the streets of Nasul in the Taurian Concordat. Her wit and tenacity kept her alive through those hard years, and she learned how to survive. One of the most important skills she learned at a young age is to know which fights she could win and which she needed to avoid. As soon as she was big enough to lie about her age, she signed on with the planetary militia garrison. This is where she met her first love: a Demolisher heavy tank that carried two of the biggest guns she had ever seen. When it was destroyed in combat along with most of her fellow crew, she was left for dead and captured by pirates. They never knew what hit them. Within a month she was a promising rookie. Within six months she was planning assaults and leading raids. Within a year she became the most feared and respected pirate in the system.",
    personality: "“Crass” Krandall is a pirate queen, and she lets everyone know it. She believes the galaxy is her oyster—it's what the universe owes her for a torturous childhood, after all. Arrogant to the nines, she'll fight anyone who tries to question her, and her unbridled fierceness often makes her opponents back down before they can even take a swing or a shot at her.",
    disposition: ["Takes flak from no one.", "Constantly establishing dominance, often taking up more space than she needs.", "Refuses to show any sign of weakness or vulnerability to anyone.", "Parties hard and fights harder."],
    cues: ["Who you lookin' at?", "If you've got the C-Bills, I lack the scruples.", "We either make a deal, or I deal out the pain.", "Either way is a win for me.", "You don't always have to pull a trigger to win.", "Just let me get in position, and I'll take 'em out at the knees.", "That's the ticket!", "Don't say “over my dead body” unless you're ready to fulfill that condition.", "This little ol' thing? It's practically a sidearm!", "Aw, does the poor wittle boy need a 'Mech to carry his guns for him? How cute.", "Turn on the lead, fellas! Let's pour it on!", "Get some!", "You sure you want to try that against me?", "Why don't things ever go smoothly?!", "I'm just a businesswoman.", "Pain is my business.", "They'll be stacking their scrap...", "We'll be stacking C-Bills.", "You better make it rain C-Bills, or I'm gonna make it rain lead.", "I can't believe that worked!"]
  },
  {
    name: "Darice Garzi", page: 120,
    details: { faction: "Magistracy of Canopus", factionKey: "canopus", rank: "Classified", age: "22", height: "1.6m", weight: "55kg", experience: "elite" },
    tags: " Sultry  Flexible  Professional  Careful  Committed",
    attributes: [1, 4, 2, 2, 4, 4],
    skills: [["smallArms", 4], ["athletics", 5], ["stealth", 5], ["disguise", 2], ["intimidation", 5], ["knowledge", 2, "Courtesan"]],
    lifeModules: {"faction": "Magistracy of Canopus", "childhood": "Slave", "education": "Intel Ops Training", "realLife": "Covert Operations"},
    traits: [
      {"polarity": "positive", "key": "attractive", "name": "Attractive", "text": "+1 bonus for CHA-based Tests where physical appearance matters."},
      {"polarity": "negative", "key": "darkSecret", "name": "Dark Secret", "text": "–1 modifier to Tests for trying to keep your secret hidden."}
    ],
    weapons: ["Martial Arts", { name: "Dagger", from: "Knife/Dagger/Bayonet" }, "Sniper Rifle (B)", "Laser Pistol (Hold-Out) (E)", "Needler Pistol"],
    armor: "Infiltration Suit",
    inventory: ["Revealing Clothes", "Advanced Security Bypass Kit", "Encrypted Long-Range Communicator", "Disguise Kit"],
    hardware: "Bayamo Hoverbike",
    history: "Publicly, Darice is one of the most popular pleasure-circus courtesans, with a long list of important clients across a dozen worlds. In fact, she is actually a member of the Magistracy Intelligence Ministry, tasked with discovering and passing on classified information. As a child, she was separated from her parents and placed into slavery, until a raid by the Magistracy freed her and several hundred slaves. The MIM took her in and trained her as an agent. Assigned the codename “Marigold,” she quickly established herself as one of the MIM's top operatives.",
    personality: "Darice—not her real name—is three different people. Darice the courtesan is warm, sultry, intelligent and skillful; Darice the spy is cold, calculating, and ruthless. She can slip from one to the other in a blink of an eye when needed. She doesn't let anyone other than her adoptive family see the true Darice: the woman who was once a slave. Her loyalty to the Magistracy is complete, but she harbors a deep hatred for slavers.",
    disposition: ["Deliberate in everything she does.", "A careful and meticulous planner.", "Her courtesan persona has friends. Her spy persona has none.", "Never uses her real face when she's on a mission outside the pleasure circus."],
    cues: ["Good evening. I'm Darice, and tonight, I am yours.", "I need those plans, and I need them tonight.", "The Magistracy took me in and gave me a way to fight back.", "It's easy to get my clients to talk.", "The hard part is getting them to shut up.", "Here's your drink, just how you like it.", "Enough talking for now.", "I'm a woman of many faces— most friendly, a few not.", "All missions are important, in degrees.", "And you think that will happen? When?", "I have no pity for slavers.", "My body is a weapon, in more ways than one.", "Which costume for tonight…the innocent schoolgirl, the strict librarian, or the sexy cop?", "I can get more with a smile and a few sweet words than a dozen agents can through illegal means.", "I can get in, no problem. Security isn't that good.", "I do what I must to complete the mission.", "Could you please put your arm around me?", "These clothes are not designed for warmth.", "Please, explain that to me. It sounds so exciting.", "Deep inside me is that scared little girl."]
  },
  {
    name: "Turi Walsh", page: 122,
    details: { faction: "Taurian Concordat", factionKey: "taurian", rank: "N/A", age: "36", height: "1.8m", weight: "96kg", experience: "veteran" },
    tags: " Loner  Hunter  Haunted  Outdoorsman  Survivalist",
    attributes: [3, 2, 2, 3, 1, 2],
    skills: [["smallArms", 5], ["tracking", 4], ["survival", 4], ["perception", 3], ["supportWeapons", 2], ["knowledge", 1, "Bushcraft"]],
    lifeModules: {"faction": "Taurian Concordat", "childhood": "Backwoods", "education": "Military Enlistment", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "thickSkinned", "name": "Thick-Skinned", "text": "Ignore any modifiers related to performing actions in extreme heat or extreme cold."},
      {"polarity": "negative", "key": "introvert", "name": "Introvert", "text": "–1 penalty for CHA-related Tests."}
    ],
    weapons: ["Unarmed", { name: "Hunting Rifle (B)", from: "Rifle (B)" }, "Auto-Pistol (B)", { name: "Hunting Knife", from: "Knife/Dagger/Bayonet" }],
    armor: "Flak Armor",
    inventory: ["Medical Kit", "Binoculars", "Winter Clothing", "Jerked Meat"],
    hardware: "Bulldog Medium Truck",
    history: "Turi grew up in the backwoods of his home planet, learning to hunt and be self-sufficient. He was drafted into the Taurian Defense Force and became an infantryman, rising to the rank of lance sergeant and serving as senior NCO of a company. However, during a Federated Suns raid, conflicting orders resulted in the entire company being slaughtered except for Turi. Overwhelmed with guilt and emotion, he resigned and disappeared before the TDF could fully investigate. Now he's back on his homeworld, up in the mountains, living off the grid and avoiding all human contact. The TDF have twice sent teams in to find him, but he's avoided them both times.",
    personality: "Turi wants to be left alone. He brings pelts to a small settlement for food and supplies, but otherwise avoids human contact. He relives the tragic events that ended his military service every time he closes his eyes, and blames himself for the company's destruction. He is a skilled hunter and tracker and is used to being alone. A morose man, he avoids people as much as possible, but will fight if he's cornered.",
    disposition: ["Holds himself responsible for his company's annihilation.", "Rarely speaks and doesn't say much when he does.", "Lives with survivor's guilt every day.", "Always alert."],
    cues: ["Leave me alone.", "I don't miss civilization.", "I know these lands better than anyone.", "I'm not alone.", "My ghosts keep me company.", "I'm not staying long. Neither are you.", "It's my fault.", "War isn't glory. Its horror.", "I don't care about causes anymore.", "Don't pretend you understand me.", "I will be seen only if I want to.", "Quiet.", "Why are you here?", "We've talked enough.", "Better get to shelter.", "Weather's getting bad.", "Regrets are all I've got left.", "Do you hear that?", "I've seen too much death and destruction to be normal again.", "I kill only to eat or protect myself."]
  },
  {
    name: "Michael “Outrider” Antilles", page: 124,
    details: { faction: "Outworlds Alliance", factionKey: "outworlds", rank: "Captain", age: "25", height: "1.8m", weight: "63.5kg", experience: "regular" },
    tags: " Ace Pilot  Fidgety  Unorthodox  Lucky  Spotter",
    attributes: [1, 3, 2, 1, 1, 2],
    skills: [["gunnery", 2, "aero"], ["piloting", 3, "aero"], ["smallArms", 1], ["zeroG", 1], ["artillery", 2], ["knowledge", 1, "Politics"], ["navigation", 2], ["perception", 2], ["tactics", 1]],
    lifeModules: {"faction": "Outworlds Alliance", "childhood": "Spacer Family", "education": "Officer Candidate School", "realLife": "Tour of Duty"},
    traits: [
      {"polarity": "positive", "key": "rank", "name": "Rank", "text": "Captain."},
      {"polarity": "negative", "key": "glassJaw", "name": "Glass Jaw", "text": "Add 1 to all Physical and Fatigue Damage you receive."}
    ],
    weapons: ["Martial Arts", "Laser Pistol (E)", "Laser Rifle (E)"],
    armor: "Ablative Armor",
    inventory: ["Lucky Dice", "Formal Dress Uniform", "Hardcover RPG Book Collection", "Personal Communicator"],
    hardware: "Sholagar",
    history: "Captain Antilles's family boasts a long tradition of service in the Alliance Military Corps in prominent, prestigious roles. It just so happens that Michael possesses the skill to back up the nepotism that propelled him directly into officer territory. Most of the action he's seen has come against pirates. Two years ago he became a local hero when he led a patrol that intercepted a pirate assault on a DropShip carrying wealthy passengers and their accompanying paparazzi. Antilles and his wing faced two-to-one odds against enemy aerofighters supported by an assault DropShip. Every moment of the battle was captured on camera and broadcast live. The pirates were driven away and captured days later, but Antilles was the only survivor. His Sholagar came through the combat without any significant damage. He achieved the distinction he craved, and now he must live up to it.",
    personality: "Captain Antilles is confident and optimistic and doesn't sit still very well. He is always looking for problems to solve, and his methods are often creative and unconventional. He fills awkward silences and breaks up tension easily with his wit and good humor. He's lost friends in combat but doesn't actually believe that it will ever happen to him.",
    disposition: ["Believes he's one of the best and won't ever get shot down.", "Looks for every chance to swoop in and save the day.", "Doesn't like to get too close to anyone but hides it well.", "Always has a catchy name for his fancy maneuvers."],
    cues: ["Keep it tight. We're going in hot.", "Did somebody call in a miracle?", "Woohooo!", "Time to try out the “Ballistic Armadillo”!", "Targets painted for artillery strike.", "Send them my regards.", "Let's go show 'em how it's done.", "I have eyes on the target location now.", "Stay on target…", "I think this calls for a “Sonic Wormhole.”", "Look at 'em all lined up for me like tin cans on a bench!", "I'll draw their fire!", "Where'd you learn how to shoot?", "Strafing run? No problem!", "I'll just work it into my dogfight here.", "They don't give these fancy officer insignias out to just anybody.", "That was close, even for me.", "Take evasive action.", "I'll get there as fast as I can!", "Did you see that? I pulled off a perfect “Fractal Deathflower”!", "Yee-hah!"]
  },
  {
    name: "Regan Galdo", page: 126,
    details: { faction: "Unaffiliated", factionKey: "unaffiliated", rank: "None", age: "27", height: "1.7m", weight: "68kg", experience: "regular" },
    tags: " MechWarrior  Gladiator  Champion  Solaris VII",
    attributes: [1, 3, 2, 1, 3, 1],
    skills: [["gunnery", 3, "mech"], ["piloting", 2, "mech"], ["smallArms", 1], ["perception", 1], ["tactics", 1], ["acting", 2], ["intimidation", 2], ["protocol", 1], ["streetwise", 1], ["knowledge", 1, "Solaris VII Games"]],
    lifeModules: {"faction": "Unaffiliated", "childhood": "White Collar", "education": "Solaris Internship", "realLife": "Solaris VII Games"},
    traits: [
      {"polarity": "positive", "key": "wealthy", "name": "Wealthy", "text": "+1 Hardware Points."},
      {"polarity": "negative", "key": "compulsion", "name": "Compulsion", "text": "Can't stand the thought of losing."}
    ],
    weapons: ["Unarmed", "Laser Pistol (E)", "Submachine Gun (B)"],
    armor: "Flak Armor",
    inventory: ["Personal Communicator", "HypeBot! Social Media Drone", "Autographed Photo Prints", "Personal Stash of Illicit Drugs"],
    hardware: "Rifleman",
    history: "Regan Galdo grew up on the game world of Solaris VII. All the kids aspired to pilot the great Battle- Mechs of the arena from a young age, but none of them showed the determination she did. Her parents were wealthy but often absent, and were more than happy to provide her with private tutoring and access to a simulator pod. She spent her youth learning about 'Mechs and their capabilities, and her teenage years led to an internship with a prominent Solaris VII sponsor. There she learned much more about the business side of entertainment, as well as the gambling activities that transform arena matches into piles of C-Bills. She took the underbelly in stride as just part of the game and learned to play it with the same determination with which she mastered BattleMech piloting. A few savvy deals and close calls was all it took to turn her family wealth and connections into a recently restored BattleMech. Now all she needs is a chance to prove herself against the top contenders in her division.",
    personality: "Regan is bold, clever, and determined. She is a winner and won't stand for anything short of getting her way. She's used to the privilege her wealth provides but works very hard to get what she wants. She expects excellence from everyone she works with and won't back down when things get rough.",
    disposition: ["Knows she is the best of the best.", "Never passes up a chance to prove herself.", "No retreat, no surrender.", "Expects others to keep up and won't wait to see if they can."],
    cues: ["Let's do this!", "The only things standing between me and the championship are time and scrap metal.", "Stay out of my way.", "I'm not here to hold your hand.", "Keep up or stay home.", "No guts, no galaxy!", "Oh, it's on!", "What do you mean, “no”?", "Good thing you brought me along.", "One way or another, we aren't leaving until we get what we're here for.", "Eject buttons are for cowards.", "The “odds” don't apply to me.", "There's more than one way to win a match.", "Watch and learn.", "This is going to be the best match you've ever seen...until my next bout.", "What were you thinking?!", "I thought you were supposed to be professionals.", "Time to level the playing field."]
  }
];
