import { BATTLE_ARMOR } from "../config.mjs";
import { segmentsLeft, suitMaxMovement } from "../rules/battle-armor.mjs";
import { counter } from "./actor-base.mjs";
import { UnitData } from "./actor-unit.mjs";

const { fields } = foundry.data;

/**
 * A suit of battle armor (Clan Invasion appendix, p. 217–220): worn by a character, it fights at
 * both scales. Its Armor pips have six segments for Personal Combat damage; its one Structure pip
 * is the wearer. Battle armor tracks no Heat, makes no Piloting Tests and takes no critical hits.
 * It can ride an OmniMech or swarm an enemy 'Mech.
 */
export class BattleArmorData extends UnitData {
  static unitType = "battleArmor";

  static defineSchema() {
    return {
      ...super.defineSchema(),
      armor: new fields.SchemaField({
        pips: counter(4),
        segments: counter(0)
      }),
      structure: new fields.SchemaField({
        damage: counter(0, { max: 1 })
      }),
      attached: new fields.SchemaField({
        mode: new fields.StringField({ required: true, blank: true, initial: "",
          choices: { "": "MWD.BattleArmor.Attached.none", mounted: "MWD.BattleArmor.Attached.mounted",
            swarming: "MWD.BattleArmor.Attached.swarming" } }),
        target: new fields.StringField({ required: true, blank: true, initial: "" })
      })
    };
  }

  static defineDetails() {
    return {
      ...super.defineDetails(),
      // Battle armor weighs in kilograms.
      tonnage: counter(1000, { max: 5000 }),
      movement: counter(1),
      jumpJets: new fields.BooleanField({ initial: false }),
      legAttack: new fields.BooleanField({ initial: true }),
      swarmAttack: new fields.BooleanField({ initial: true })
    };
  }

  /* -------------------------------------------- */

  /** Segments of Armor in one pip. */
  get segmentsPerPip() {
    return BATTLE_ARMOR.segments;
  }

  prepareDerivedData() {
    // A built-in crew wears no personal armor, which UnitData records as `armor`; keep the suit's.
    const armor = this.armor;
    super.prepareDerivedData();
    this.armor = armor;
    const left = segmentsLeft(this.armor);
    this.armorTotal = { value: left, max: this.armor.pips * BATTLE_ARMOR.segments };
    this.structureTotal = { value: 1 - this.structure.damage, max: 1 };
    this.suitDestroyed = (left === 0) && (this.armor.pips > 0);
    const stopped = this.status.destroyed || this.suitDestroyed;
    this.maxMovement = stopped ? 0 : Math.min(this.details.movement, suitMaxMovement(this.details.jumpJets));
    this.mounted = this.attached.mode === "mounted" ? this.attached.target : "";
    this.swarming = this.attached.mode === "swarming" ? this.attached.target : "";
  }
}
