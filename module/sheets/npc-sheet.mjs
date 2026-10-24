import { PersonSheet, TEMPLATES } from "./person-sheet.mjs";

/**
 * Compact NPC sheet laid out like the book's NPC blocks (p. 128).
 */
export class NpcSheet extends PersonSheet {
  static DEFAULT_OPTIONS = {
    classes: ["npc"],
    position: { width: 680, height: 720 }
  };

  static PARTS = {
    body: { template: `${TEMPLATES}/actor/npc-sheet.hbs`, scrollable: [""] }
  };
}
