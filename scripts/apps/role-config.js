import { MODULE_ID, TEMPLATES, DEFAULT_ROLE_IMG, ROLE_NAME_MAX, ROLE_DESC_MAX } from "../constants.js";
import { getRoles, setRoles, getRecommendedRoles, setRecommendedRoles } from "../helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/**
 * GM panel for the team-composition role catalog. Roles are edited inline — name and
 * description are live form fields and the icon opens the FilePicker directly — and the
 * same panel holds the recommended-composition picker shown to players.
 *
 * Unlike the other module panels this app deliberately does NOT opt into
 * {@link rerenderModuleApps} (no `AUTO_RERENDER`): a settings write here would otherwise
 * re-render the panel and wipe the GM's in-progress text edits. It instead persists field
 * edits silently and re-renders itself only on structural changes (image pick, add,
 * remove, recommendation toggle), each of which first folds the current form values back
 * into the catalog so nothing typed is lost.
 */
export class RoleConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-role-config`,
    classes: [MODULE_ID, "role-config"],
    tag: "form",
    window: {
      title: "CYH.RoleConfig.Title",
      icon: "fa-solid fa-masks-theater",
      resizable: true
    },
    position: { width: 560, height: "auto" },
    form: {
      handler: RoleConfigApp.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      addRole: this.prototype._onAddRole,
      pickImage: this.prototype._onPickImage,
      removeRole: this.prototype._onRemoveRole,
      toggleRecommended: this.prototype._onToggleRecommended
    }
  };

  /** @override */
  static PARTS = {
    body: { template: TEMPLATES.ROLE_CONFIG }
  };

  /**
   * Build the render context: one view-model per catalog role, each flagged with its
   * recommended state, plus the field length limits for the inline inputs.
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const recommended = getRecommendedRoles();
    const roles = getRoles().map(r => ({
      id: r.id,
      name: r.name,
      img: r.img,
      description: r.description,
      recommended: recommended.includes(r.id)
    }));
    return Object.assign(context, { roles, nameMax: ROLE_NAME_MAX, descMax: ROLE_DESC_MAX });
  }

  /**
   * Read the catalog and overlay any in-progress name/description edits from the live
   * form, so a structural action never discards what the GM has just typed.
   * @returns {object[]} Plain-object roles reflecting the current form state.
   */
  #collectRoles() {
    const roles = getRoles().map(r => r.toObject());
    const form = this.element;
    for (const role of roles) {
      const nameEl = form.querySelector(`[name="roles.${role.id}.name"]`);
      const descEl = form.querySelector(`[name="roles.${role.id}.description"]`);
      if (nameEl) role.name = nameEl.value;
      if (descEl) role.description = descEl.value;
    }
    return roles;
  }

  /**
   * Persist live field edits without re-rendering (the values already sit in the DOM).
   * Form handler declared in `DEFAULT_OPTIONS.form`; invoked with the app as `this`.
   * @param {SubmitEvent} event The change-triggered submit event.
   * @param {HTMLFormElement} form The form element.
   * @param {foundry.applications.ux.FormDataExtended} formData The parsed form data.
   * @returns {Promise<void>}
   */
  static async #onSubmit(event, form, formData) {
    await setRoles(this.#collectRoles());
  }

  /**
   * Append a new role with placeholder values, preserving unsaved edits, then re-render.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {Promise<void>}
   */
  async _onAddRole() {
    const roles = this.#collectRoles();
    roles.push({
      id: foundry.utils.randomID(),
      name: game.i18n.localize("CYH.RoleConfig.NewRole"),
      img: DEFAULT_ROLE_IMG,
      description: ""
    });
    await setRoles(roles);
    this.render();
  }

  /**
   * Open the FilePicker on a role's icon and store the chosen image, preserving unsaved
   * edits. Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {void}
   */
  _onPickImage(event, target) {
    const { roleId } = target.closest("[data-role-id]").dataset;
    const current = getRoles().find(r => r.id === roleId)?.img || DEFAULT_ROLE_IMG;
    const FilePickerClass = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
    const picker = new FilePickerClass({
      type: "image",
      current,
      callback: async path => {
        const roles = this.#collectRoles();
        const role = roles.find(r => r.id === roleId);
        if (!role) return;
        role.img = path;
        await setRoles(roles);
        this.render();
      }
    });
    picker.browse();
  }

  /**
   * Remove a role from the catalog after confirmation, preserving unsaved edits to the
   * others. Heroes and the recommended set keep the now-orphaned id; it is filtered out
   * wherever roles are resolved. Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {Promise<void>}
   */
  async _onRemoveRole(event, target) {
    const { roleId } = target.closest("[data-role-id]").dataset;
    const role = getRoles().find(r => r.id === roleId);
    const confirmed = await DialogV2.confirm({
      window: { title: "CYH.RoleConfig.RemoveConfirmTitle" },
      content: `<p>${game.i18n.format("CYH.RoleConfig.RemoveConfirm", { name: role?.name ?? roleId })}</p>`
    });
    if (!confirmed) return;
    await setRoles(this.#collectRoles().filter(r => r.id !== roleId));
    this.render();
  }

  /**
   * Toggle whether a role is part of the recommended team composition shown to players.
   * Unsaved field edits are folded back into the catalog first so the re-render keeps them.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {Promise<void>}
   */
  async _onToggleRecommended(event, target) {
    const { roleId } = target.closest("[data-role-id]").dataset;
    await setRoles(this.#collectRoles());
    const current = getRecommendedRoles();
    const next = current.includes(roleId) ? current.filter(id => id !== roleId) : [...current, roleId];
    await setRecommendedRoles(next);
    this.render();
  }
}
