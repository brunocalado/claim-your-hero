import { DEFAULT_SOUNDS, DEFAULT_SOUND_VOLUME } from "./constants.js";

const fields = foundry.data.fields;

/**
 * Per-hero presentation data configured by the GM: the world Actor it points to,
 * an optional alternate image with its aspect ratio, and a rich-text description.
 */
export class HeroEntryData extends foundry.abstract.DataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CYH.HeroEntry"];

  /**
   * @override
   * @returns {Record<string, foundry.data.fields.DataField>} The entry schema.
   */
  static defineSchema() {
    return {
      actorId: new fields.DocumentIdField({ required: true, nullable: false }),
      img: new fields.FilePathField({ categories: ["IMAGE"], required: false, blank: true }),
      detailImg: new fields.FilePathField({ categories: ["IMAGE"], required: false, blank: true }),
      description: new fields.HTMLField({ required: false, blank: true }),
      hidden: new fields.BooleanField({ initial: false })
    };
  }
}

/**
 * The world-setting payload for the selection screen's UI sounds: one audio file
 * per interaction plus a single volume shared by all of them. Field initials are
 * the shipped defaults, so resetting the setting to `{}` restores them.
 */
export class SoundConfigData extends foundry.abstract.DataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CYH.Sounds"];

  /**
   * @override
   * @returns {Record<string, foundry.data.fields.DataField>} The sound config schema.
   */
  static defineSchema() {
    return {
      hover: new fields.FilePathField({ categories: ["AUDIO"], required: false, blank: true, initial: DEFAULT_SOUNDS.hover }),
      select: new fields.FilePathField({ categories: ["AUDIO"], required: false, blank: true, initial: DEFAULT_SOUNDS.select }),
      confirm: new fields.FilePathField({ categories: ["AUDIO"], required: false, blank: true, initial: DEFAULT_SOUNDS.confirm }),
      volume: new fields.NumberField({ required: true, nullable: false, min: 0, max: 1, initial: DEFAULT_SOUND_VOLUME })
    };
  }
}

/**
 * The world-setting payload holding every configured hero entry.
 * Registered as the `type` of the roster setting so reads return validated data.
 */
export class RosterData extends foundry.abstract.DataModel {
  /**
   * @override
   * @returns {Record<string, foundry.data.fields.DataField>} The roster schema.
   */
  static defineSchema() {
    return {
      entries: new fields.ArrayField(new fields.EmbeddedDataField(HeroEntryData), { initial: [] })
    };
  }
}
