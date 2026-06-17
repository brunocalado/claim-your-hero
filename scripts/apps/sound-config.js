import { MODULE_ID, SETTINGS, TEMPLATES } from "../constants.js";
import { SoundConfigData } from "../data-models.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM form for the selection screen's UI sounds: one audio file per interaction
 * (hover, select, confirm), a single shared volume, and a one-click restore of
 * the module's default files.
 */
export class SoundConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-sound-config`,
    classes: [MODULE_ID, "sound-config"],
    tag: "form",
    window: {
      title: "CYH.Sounds.Title",
      icon: "fa-solid fa-volume-high"
    },
    position: { width: 480, height: "auto" },
    form: {
      handler: SoundConfigApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    },
    actions: {
      resetDefaults: this.prototype._onResetDefaults
    }
  };

  /** @override */
  static PARTS = {
    body: { template: TEMPLATES.SOUND_CONFIG }
  };

  /**
   * Build the render context from the stored sound setting and its schema fields.
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sounds = game.settings.get(MODULE_ID, SETTINGS.SOUNDS);
    return Object.assign(context, {
      sounds: sounds.toObject(),
      fields: SoundConfigData.schema.fields
    });
  }

  /**
   * Persist the sound configuration. Form handler declared in `DEFAULT_OPTIONS.form`.
   * @param {SubmitEvent} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {foundry.applications.ux.FormDataExtended} formData The parsed form data.
   * @returns {Promise<void>}
   */
  static async #onSubmit(event, form, formData) {
    await game.settings.set(MODULE_ID, SETTINGS.SOUNDS, foundry.utils.expandObject(formData.object));
  }

  /**
   * Restore the shipped default sounds and volume. Resetting the setting to an
   * empty object lets the DataModel field initials reapply the defaults.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {Promise<void>}
   */
  async _onResetDefaults() {
    await game.settings.set(MODULE_ID, SETTINGS.SOUNDS, {});
    ui.notifications.info("CYH.Sounds.ResetDone", { localize: true });
    this.render();
  }
}
