import { MODULE_ID, SETTINGS, TEMPLATES, TITLE_MAX } from "../constants.js";
import { VisualConfigData } from "../data-models.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM form for the selection screen's visual background: choose an image or muted
 * video file and tune the dark overlay that keeps the content readable on top of it.
 */
export class VisualConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-visual-config`,
    classes: [MODULE_ID, "visual-config"],
    tag: "form",
    window: {
      title: "CYH.Visual.Title",
      icon: "fa-solid fa-image"
    },
    position: { width: 480, height: "auto" },
    form: {
      handler: VisualConfigApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    },
    actions: {
      clearBackground: this.prototype._onClearBackground
    }
  };

  /** @override */
  static PARTS = {
    body: { template: TEMPLATES.VISUAL_CONFIG }
  };

  /**
   * Build the render context from the stored visual setting and its schema fields.
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const visual = game.settings.get(MODULE_ID, SETTINGS.VISUAL);
    return Object.assign(context, {
      visual: visual.toObject(),
      fields: VisualConfigData.schema.fields,
      titleMax: TITLE_MAX
    });
  }

  /**
   * Attach the type-select change listener to show only the relevant file field.
   * @override
   * @param {object} context The render context.
   * @param {object} options Render options.
   * @returns {void}
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const typeSelect = this.element.querySelector('[name="type"]');
    this.#syncFieldVisibility(typeSelect.value);
    typeSelect.addEventListener("change", e => this.#syncFieldVisibility(e.target.value));
  }

  /**
   * Show only the file-picker field that matches the current type selection.
   * @param {string} type The selected background type ("none" | "image" | "video").
   * @returns {void}
   */
  #syncFieldVisibility(type) {
    for (const el of this.element.querySelectorAll(".visual-src-field")) {
      el.hidden = el.dataset.forType !== type;
    }
  }

  /**
   * Persist the visual configuration. Form handler declared in `DEFAULT_OPTIONS.form`.
   * @param {SubmitEvent} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {foundry.applications.ux.FormDataExtended} formData The parsed form data.
   * @returns {Promise<void>}
   */
  static async #onSubmit(event, form, formData) {
    await game.settings.set(MODULE_ID, SETTINGS.VISUAL, foundry.utils.expandObject(formData.object));
  }

  /**
   * Reset the visual setting to its defaults (no background). Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {Promise<void>}
   */
  async _onClearBackground() {
    await game.settings.set(MODULE_ID, SETTINGS.VISUAL, {});
    ui.notifications.info("CYH.Visual.ClearDone", { localize: true });
    this.render();
  }
}
