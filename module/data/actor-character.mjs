import { EXPERIENCE_LEVELS, INITIATIVE_BY_EXPERIENCE, PLOT_POINTS } from "../config.mjs";
import { PersonData, counter } from "./actor-base.mjs";

const { fields } = foundry.data;

/**
 * Player character data model.
 */
export class CharacterData extends PersonData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      edge: new fields.SchemaField({
        spent: counter(0)
      }),
      plotPoints: new fields.SchemaField({
        value: counter(PLOT_POINTS.playerStart),
        max: counter(PLOT_POINTS.playerMax)
      }),
      xp: new fields.SchemaField({
        value: counter(0),
        total: counter(0)
      }),
      details: new fields.SchemaField({
        faction: new fields.StringField({ required: true, initial: "" }),
        rank: new fields.StringField({ required: true, initial: "" }),
        age: new fields.StringField({ required: true, initial: "" }),
        height: new fields.StringField({ required: true, initial: "" }),
        weight: new fields.StringField({ required: true, initial: "" }),
        experience: new fields.StringField({
          required: true, initial: "regular", choices: () => Object.fromEntries(
            Object.entries(EXPERIENCE_LEVELS).map(([k, v]) => [k, v.label]))
        })
      }),
      lifeModules: new fields.SchemaField({
        faction: new fields.StringField({ required: true, initial: "" }),
        childhood: new fields.StringField({ required: true, initial: "" }),
        education: new fields.StringField({ required: true, initial: "" }),
        realLife: new fields.StringField({ required: true, initial: "" })
      }),
      cues: new fields.StringField({ required: true, initial: "" }),
      biography: new fields.SchemaField({
        history: new fields.HTMLField({ required: true, initial: "" }),
        personality: new fields.HTMLField({ required: true, initial: "" }),
        disposition: new fields.StringField({ required: true, initial: "" })
      })
    };
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    super.prepareDerivedData();
    const edg = this.attributes.edg.value;
    this.edge.max = edg;
    this.edge.remaining = Math.max(0, edg - this.edge.spent);
    this.initiativeBonus += INITIATIVE_BY_EXPERIENCE[this.details.experience] ?? 0;
    this.cueList = this.cues.split("\n").map(c => c.trim()).filter(Boolean);
  }

  /** @override */
  get usesEdge() {
    return true;
  }
}
