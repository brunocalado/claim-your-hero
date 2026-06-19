import { MODULE_ID, TEMPLATES, DEFAULT_ROLE_IMG } from "../constants.js";
import { getRoles, setRoles } from "../helpers.js";
import { RoleEditorApp } from "./role-editor.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/**
 * GM panel for the team-composition role catalog: create, edit and remove the roles
 * (Tank, Healer, DPS, …) that heroes can be tagged with and the GM can recommend.
 */
export class RoleConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Opted into {@link rerenderModuleApps} so role edits refresh the list live. */
  static AUTO_RERENDER = true;

  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-role-config`,
    classes: [MODULE_ID, "role-config"],
    tag: "div",
    window: {
      title: "CYH.RoleConfig.Title",
      icon: "fa-solid fa-masks-theater",
      resizable: true
    },
    position: { width: 560, height: "auto" },
    actions: {
      addRole: this.prototype._onAddRole,
      editRole: this.prototype._onEditRole,
      removeRole: this.prototype._onRemoveRole
    }
  };

  /** @override */
  static PARTS = {
    body: { template: TEMPLATES.ROLE_CONFIG }
  };

  /**
   * Build the render context: one view-model per catalog role.
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const roles = getRoles().map(r => ({ id: r.id, name: r.name, img: r.img, description: r.description }));
    return Object.assign(context, { roles });
  }

  /**
   * Create a new role with placeholder values and open its editor immediately, mirroring
   * the roster's "add then edit" flow. Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {Promise<void>}
   */
  async _onAddRole() {
    const roles = getRoles().map(r => r.toObject());
    const id = foundry.utils.randomID();
    roles.push({ id, name: game.i18n.localize("CYH.RoleConfig.NewRole"), img: DEFAULT_ROLE_IMG, description: "" });
    await setRoles(roles);
    new RoleEditorApp({ roleId: id }).render({ force: true });
  }

  /**
   * Open the editor for an existing role. Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {void}
   */
  _onEditRole(event, target) {
    const { roleId } = target.closest("[data-role-id]").dataset;
    new RoleEditorApp({ roleId }).render({ force: true });
  }

  /**
   * Remove a role from the catalog after confirmation. Heroes and the recommended set
   * keep the now-orphaned id; it is filtered out wherever roles are resolved.
   * Bound via `DEFAULT_OPTIONS.actions`.
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
    await setRoles(getRoles().filter(r => r.id !== roleId).map(r => r.toObject()));
  }
}
