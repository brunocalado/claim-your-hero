import { MODULE_ID, SETTINGS, TEMPLATES, ISSUES_URL } from "../constants.js";
import { getSystemDescriptionPath, isSystemDescriptionPathKnown } from "../helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM form for the Actor-sourced description settings: the global "read from the Actor
 * sheet" toggle and the dot-path of the field to read. Opened from the roster panel.
 * Detects the active game system and pre-fills/explains the expected path, pointing GMs
 * of unregistered systems to the issue tracker.
 */
export class DescriptionConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-description-config`,
    classes: [MODULE_ID, "description-config"],
    tag: "form",
    window: {
      title: "CYH.DescriptionConfig.Title",
      icon: "fa-solid fa-align-left"
    },
    position: { width: 520, height: "auto" },
    form: {
      handler: DescriptionConfigApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    },
    actions: {
      resetPath: this.prototype._onResetPath
    }
  };

  /** @override */
  static PARTS = {
    body: { template: TEMPLATES.DESCRIPTION_CONFIG }
  };

  /**
   * Build the render context from the stored settings and the active system's metadata.
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return Object.assign(context, {
      useActorDesc: game.settings.get(MODULE_ID, SETTINGS.USE_ACTOR_DESC),
      descriptionPath: game.settings.get(MODULE_ID, SETTINGS.DESCRIPTION_PATH),
      systemId: game.system.id,
      systemTitle: game.system.title,
      systemKnown: isSystemDescriptionPathKnown(),
      defaultPath: getSystemDescriptionPath(),
      issuesUrl: ISSUES_URL
    });
  }

  /**
   * Reset the path input to the active system's default (or the global fallback) without
   * persisting, so the GM can review before saving. Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action` (carries the default path).
   * @returns {void}
   */
  _onResetPath(event, target) {
    const input = this.element.querySelector('[name="descriptionPath"]');
    if (input) input.value = target.dataset.defaultPath ?? "";
  }

  /**
   * Persist the toggle and path settings. Form handler declared in `DEFAULT_OPTIONS.form`.
   * @param {SubmitEvent} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {foundry.applications.ux.FormDataExtended} formData The parsed form data.
   * @returns {Promise<void>}
   */
  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(MODULE_ID, SETTINGS.USE_ACTOR_DESC, data.useActorDescription ?? false);
    await game.settings.set(MODULE_ID, SETTINGS.DESCRIPTION_PATH, (data.descriptionPath ?? "").trim());
  }
}
