import { MODULE_ID, TEMPLATES } from "../constants.js";
import { RoleData } from "../data-models.js";
import { getRoles, setRoles } from "../helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM form for a single role: its name, an image chosen through the FilePicker, and an
 * optional plain-text description shown to players as a tooltip on the selection screen.
 */
export class RoleEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} [options] Application options.
   * @param {string} options.roleId Id of the catalog role being edited.
   */
  constructor(options = {}) {
    super(options);
    this.#roleId = options.roleId;
  }

  /** @type {string} */
  #roleId;

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [MODULE_ID, "role-editor"],
    tag: "form",
    window: {
      title: "CYH.RoleEditor.Title",
      icon: "fa-solid fa-masks-theater",
      resizable: true
    },
    position: { width: 480, height: "auto" },
    form: {
      handler: RoleEditorApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    body: { template: TEMPLATES.ROLE_EDITOR }
  };

  /**
   * Append the role name to the window title.
   * @override
   * @returns {string} The window title.
   */
  get title() {
    const name = getRoles().find(r => r.id === this.#roleId)?.name;
    const base = game.i18n.localize("CYH.RoleEditor.Title");
    return name ? `${base}: ${name}` : base;
  }

  /**
   * Build the render context. Schema field instances drive the `{{formGroup}}` helpers
   * (name input and the FilePicker image field).
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const role = getRoles().find(r => r.id === this.#roleId);
    return Object.assign(context, {
      role: role?.toObject() ?? {},
      fields: RoleData.schema.fields
    });
  }

  /**
   * Persist the edited role back into the catalog setting.
   * Form handler declared in `DEFAULT_OPTIONS.form`; invoked with the app as `this`.
   * @param {SubmitEvent} event The form submission event.
   * @param {HTMLFormElement} form The form element.
   * @param {foundry.applications.ux.FormDataExtended} formData The parsed form data.
   * @returns {Promise<void>}
   */
  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    const roles = getRoles().map(r => r.toObject());
    const role = roles.find(r => r.id === this.#roleId);
    if (!role) return;
    role.name = data.name ?? "";
    role.img = data.img ?? "";
    role.description = data.description ?? "";
    await setRoles(roles);
  }
}
