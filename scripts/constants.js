/**
 * Module-wide shared constants.
 * This file is a dependency-free leaf: it must never import from any other module file.
 */

/** The module id, mirroring the `id` field of `module.json` (single source of truth). */
export const MODULE_ID = "claim-your-hero";

/** Keys for settings registered under the {@link MODULE_ID} namespace. */
export const SETTINGS = {
  ROSTER: "roster",
  ROLES: "roles",
  AUTO_OPEN: "autoOpen",
  SOUNDS: "sounds",
  SHEET_ACCESS: "sheetAccess",
  VISUAL: "visual"
};

/** Keys for document flags written under the {@link MODULE_ID} scope. */
export const FLAGS = {
  /**
   * On a User: the ids of roster Actors this player was granted OBSERVER on by
   * clicking "View Character Sheet". Each entry is a permission the module must
   * later revoke (drop back to "Default") unless the player ends up claiming it.
   * The durable record that lets the GM-side reconcile clean up after disconnects.
   */
  PENDING_VIEWS: "pendingViews"
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

/** Placeholder image applied to a freshly created role until the GM picks one. */
export const DEFAULT_ROLE_IMG = "icons/svg/aura.svg";

/** Maximum length of a role's name, enforced on the catalog inputs. */
export const ROLE_NAME_MAX = 40;

/** Maximum length of a role's description, enforced on the catalog inputs. */
export const ROLE_DESC_MAX = 240;

/** Maximum length of the selection screen's player-facing title, enforced on the input. */
export const TITLE_MAX = 150;

/**
 * Roles seeded into the catalog on first use (see {@link SETTINGS.ROLES}). Names and
 * descriptions are localization keys resolved at seed time, so they honour the active
 * language; images are native Foundry icon paths, so the module ships no extra assets.
 * The GM can edit or delete any of these afterwards.
 */
export const DEFAULT_ROLES = [
  { nameKey: "CYH.Roles.Defaults.Tank.name", descKey: "CYH.Roles.Defaults.Tank.desc", img: "icons/equipment/shield/heater-crystal-blue.webp" },
  { nameKey: "CYH.Roles.Defaults.Healer.name", descKey: "CYH.Roles.Defaults.Healer.desc", img: "icons/magic/life/heart-cross-green.webp" },
  { nameKey: "CYH.Roles.Defaults.MeleeDPS.name", descKey: "CYH.Roles.Defaults.MeleeDPS.desc", img: "icons/skills/melee/blade-tip-orange.webp" },
  { nameKey: "CYH.Roles.Defaults.RangedDPS.name", descKey: "CYH.Roles.Defaults.RangedDPS.desc", img: "icons/skills/ranged/arrow-flying-broadhead-metal.webp" },
  { nameKey: "CYH.Roles.Defaults.Support.name", descKey: "CYH.Roles.Defaults.Support.desc", img: "icons/magic/control/buff-flight-wings-blue.webp" },
  { nameKey: "CYH.Roles.Defaults.Controller.name", descKey: "CYH.Roles.Defaults.Controller.desc", img: "icons/magic/control/hypnosis-mesmerism-eye-tan.webp" },
  { nameKey: "CYH.Roles.Defaults.Scout.name", descKey: "CYH.Roles.Defaults.Scout.desc", img: "icons/skills/movement/figure-running-gray.webp" },
  { nameKey: "CYH.Roles.Defaults.Face.name", descKey: "CYH.Roles.Defaults.Face.desc", img: "icons/skills/social/diplomacy-handshake.webp" }
];

/** Handlebars template paths used by the module's Applications. */
export const TEMPLATES = {
  ROSTER_CONFIG: `modules/${MODULE_ID}/templates/roster-config.hbs`,
  ROLE_CONFIG: `modules/${MODULE_ID}/templates/role-config.hbs`,
  HERO_EDITOR: `modules/${MODULE_ID}/templates/hero-editor.hbs`,
  HERO_SELECTION: `modules/${MODULE_ID}/templates/hero-selection.hbs`,
  SOUND_CONFIG: `modules/${MODULE_ID}/templates/sound-config.hbs`,
  VISUAL_CONFIG: `modules/${MODULE_ID}/templates/visual-config.hbs`
};
