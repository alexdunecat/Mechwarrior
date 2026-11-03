import { translateCompendiumDocument } from "./compendium.mjs";

/**
 * Item document for MechWarrior: Destiny.
 */
export class MWDItem extends Item {
  /** Items in the system's compendiums show in the client's language. @override */
  prepareBaseData() {
    super.prepareBaseData();
    translateCompendiumDocument(this);
  }
}
