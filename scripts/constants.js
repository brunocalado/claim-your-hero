/**
 * Module-wide shared constants.
 * This file is a dependency-free leaf: it must never import from any other module file.
 */

/** The module id, mirroring the `id` field of `module.json` (single source of truth). */
export const MODULE_ID = "claim-your-hero";

/** Keys for settings registered under the {@link MODULE_ID} namespace. */
export const SETTINGS = {
  ROSTER: "roster",
  AUTO_OPEN: "autoOpen",
  SOUNDS: "sounds",
  SHEET_ACCESS: "sheetAccess",
  VISUAL: "visual"
};


/** Default audio files shipped with the module. */
export const DEFAULT_SOUNDS = {
  hover: `modules/${MODULE_ID}/assets/sfx/hover.ogg`,
  select: `modules/${MODULE_ID}/assets/sfx/selected-option.ogg`,
  confirm: `modules/${MODULE_ID}/assets/sfx/confirm-vote.ogg`
};

/** Default volume applied to every module sound. */
export const DEFAULT_SOUND_VOLUME = 0.85;

/** Name of the world Folder that receives Actors imported from Compendiums. */
export const FOLDER_NAME = "Claim Your Hero";

/** Handlebars template paths used by the module's Applications. */
export const TEMPLATES = {
  ROSTER_CONFIG: `modules/${MODULE_ID}/templates/roster-config.hbs`,
  HERO_EDITOR: `modules/${MODULE_ID}/templates/hero-editor.hbs`,
  HERO_SELECTION: `modules/${MODULE_ID}/templates/hero-selection.hbs`,
  SOUND_CONFIG: `modules/${MODULE_ID}/templates/sound-config.hbs`,
  VISUAL_CONFIG: `modules/${MODULE_ID}/templates/visual-config.hbs`
};
