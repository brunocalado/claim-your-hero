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
      hidden: new fields.BooleanField({ initial: false }),
      // Ids of the roles (see RoleData) this hero is suited to play. References are
      // resolved tolerantly at read time, so ids of deleted roles are simply ignored.
      roles: new fields.ArrayField(new fields.StringField({ blank: false }), { initial: [] })
    };
  }
}

/**
 * A single playable role in the team-composition catalog (e.g. Tank, Healer). The id
 * is the stable reference stored on heroes and in the recommended set; deleting a role
 * never rewrites those references — stale ids are filtered when roles are resolved.
 */
export class RoleData extends foundry.abstract.DataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CYH.Role"];

  /**
   * @override
   * @returns {Record<string, foundry.data.fields.DataField>} The role schema.
   */
  static defineSchema() {
    return {
      id: new fields.StringField({ required: true, nullable: false, blank: false }),
      name: new fields.StringField({ required: true, nullable: false, blank: true }),
      img: new fields.FilePathField({ categories: ["IMAGE"], required: false, blank: true }),
      description: new fields.StringField({ required: false, blank: true })
    };
  }
}

/**
 * The world-setting payload holding the role catalog. `seeded` is a one-shot sentinel:
 * the default roles are written exactly once, so emptying the catalog never re-adds them.
 */
export class RolesData extends foundry.abstract.DataModel {
  /**
   * @override
   * @returns {Record<string, foundry.data.fields.DataField>} The roles setting schema.
   */
  static defineSchema() {
    return {
      roles: new fields.ArrayField(new fields.EmbeddedDataField(RoleData), { initial: [] }),
      seeded: new fields.BooleanField({ initial: false })
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
 * The world-setting payload for the selection screen's visual background: an image
 * or muted looping video, plus a dark overlay to preserve content readability.
 */
export class VisualConfigData extends foundry.abstract.DataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CYH.Visual"];

  /**
   * @override
   * @returns {Record<string, foundry.data.fields.DataField>} The visual config schema.
   */
  static defineSchema() {
    return {
      type: new fields.StringField({
        required: true,
        nullable: false,
        blank: false,
        initial: "none",
        choices: { none: "None", image: "Image", video: "Video" }
      }),
      imageSrc: new fields.FilePathField({ categories: ["IMAGE"], required: false, blank: true }),
      videoSrc: new fields.FilePathField({ categories: ["VIDEO"], required: false, blank: true }),
      overlayOpacity: new fields.NumberField({ required: true, nullable: false, min: 0, max: 1, initial: 0.5 }),
      // Player-facing heading on the selection screen. Blank falls back to the
      // localized default title (see HeroSelectionApp._prepareContext); length is
      // capped on the config input rather than the schema, matching the role fields.
      title: new fields.StringField({ required: false, blank: true, trim: true })
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
      entries: new fields.ArrayField(new fields.EmbeddedDataField(HeroEntryData), { initial: [] }),
      // Ids of the roles the GM recommends for this session's composition. Resolved
      // tolerantly at read time, so ids of deleted roles are simply ignored.
      recommended: new fields.ArrayField(new fields.StringField({ blank: false }), { initial: [] })
    };
  }
}
