import { MODULE_ID, FOLDER_NAME, FLAGS, TEMPLATES } from "../constants.js";
import { getRoster, setRoster, getClaimantUser, applyClaimChanges, buildOwnershipUpdate, getPendingViews, reconcilePendingViews, countRevocableViews, getRoles, getRecommendedRoles, setRecommendedRoles } from "../helpers.js";
import { broadcastOpen, broadcastClaimed } from "../socket.js";
import { HeroEditorApp } from "./hero-editor.js";
import { HeroSelectionApp } from "./hero-selection.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/**
 * GM panel for building the claimable hero roster: drag-and-drop Actors (world or
 * Compendium), edit each hero's presentation, and push the selection screen to players.
 */
export class RosterConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Opted into {@link rerenderModuleApps} so claim/roster changes refresh the panel live. */
  static AUTO_RERENDER = true;

  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-roster-config`,
    classes: [MODULE_ID, "roster-config"],
    tag: "div",
    window: {
      title: "CYH.RosterConfig.Title",
      icon: "fa-solid fa-users-viewfinder",
      resizable: true
    },
    position: { width: 880, height: "auto" },
    actions: {
      editHero: this.prototype._onEditHero,
      toggleHidden: this.prototype._onToggleHidden,
      openSheet: this.prototype._onOpenSheet,
      removeHero: this.prototype._onRemoveHero,
      unassignHero: this.prototype._onUnassignHero,
      openFor: this.prototype._onOpenFor,
      openForAll: this.prototype._onOpenForAll,
      cleanPermissions: this.prototype._onCleanPermissions,
      toggleRecommended: this.prototype._onToggleRecommended,
      preview: this.prototype._onPreview
    }
  };

  /** @override */
  static PARTS = {
    body: { template: TEMPLATES.ROSTER_CONFIG }
  };

  /**
   * Build the render context: only unclaimed roster entries appear in the hero list —
   * linked heroes are represented by their owner's drop slot in the player list instead.
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const players = game.users.filter(u => !u.isGM);
    const entries = [];
    for (const e of getRoster()) {
      if (getClaimantUser(e.actorId)) continue;
      const actor = game.actors.get(e.actorId);
      // Players currently holding a module-granted view on this available hero.
      // A single indicator reveals the full list on hover, so any number of viewers
      // fits without overflowing the row.
      const viewerNames = players
        .filter(u => getPendingViews(u).includes(e.actorId))
        .map(u => u.name);
      entries.push({
        actorId: e.actorId,
        name: actor?.name ?? game.i18n.localize("CYH.RosterConfig.MissingActor"),
        missing: !actor,
        img: e.img || actor?.img,
        hidden: e.hidden,
        viewerCount: viewerNames.length,
        viewersTip: viewerNames.length
          ? `${game.i18n.localize("CYH.RosterConfig.ViewersTip")}: ${viewerNames.join(", ")}`
          : ""
      });
    }
    // Total revocable view grants across all players — drives the cleanup button.
    const illegalCount = players.reduce((sum, u) => sum + countRevocableViews(u), 0);
    const playerRows = players.map(u => ({
      id: u.id,
      name: u.name,
      active: u.active,
      color: u.color.css,
      character: u.character
        ? { id: u.character.id, name: u.character.name, img: u.character.img }
        : null
    }));
    // Catalog roles with their recommended state, for the composition chips.
    const recommended = getRecommendedRoles();
    const roles = getRoles().map(r => ({
      id: r.id,
      name: r.name,
      img: r.img,
      description: r.description,
      recommended: recommended.includes(r.id)
    }));
    return Object.assign(context, { entries, players: playerRows, illegalCount, roles });
  }

  /**
   * Bind drag-and-drop listeners. Called from `_onRender` because the part's DOM is
   * replaced on every render, which discards previously bound listeners. Native
   * listeners are used instead of the DragDrop helper: `dragover` must call
   * `preventDefault()` for the browser to accept the very first drop.
   * @override
   * @param {object} context The render context.
   * @param {object} options Render options.
   * @returns {void}
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const zone = this.element.querySelector("[data-drop-zone]");
    zone?.addEventListener("dragover", event => {
      event.preventDefault();
      zone.classList.add("drag-over");
    });
    zone?.addEventListener("dragleave", event => {
      if (!zone.contains(event.relatedTarget)) zone.classList.remove("drag-over");
    });
    zone?.addEventListener("drop", event => {
      zone.classList.remove("drag-over");
      this._onDrop(event);
    });

    for (const row of this.element.querySelectorAll(".hero-row[draggable]")) {
      row.addEventListener("dragstart", event => this._onDragHero(event));
    }
    for (const row of this.element.querySelectorAll(".player-row")) {
      row.addEventListener("dragover", event => {
        event.preventDefault();
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", event => {
        row.classList.remove("drag-over");
        this._onDropOnPlayer(event);
      });
    }
  }

  /**
   * Start dragging a roster hero towards a player row for direct assignment.
   * @param {DragEvent} event The dragstart event.
   * @returns {void}
   */
  _onDragHero(event) {
    const { actorId } = event.currentTarget.dataset;
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: `${MODULE_ID}.hero`, actorId }));
    event.dataTransfer.effectAllowed = "link";
  }

  /**
   * Assign a hero dropped onto a player row. Accepts internal hero-row drags as
   * well as Actor drags from the sidebar or a Compendium: external Actors join
   * the roster first (importing if needed) and are then linked to the player,
   * exactly as if they had been added to the available list and dragged from there.
   * @param {DragEvent} event The drop event.
   * @returns {Promise<void>}
   */
  async _onDropOnPlayer(event) {
    event.preventDefault();
    event.stopPropagation();
    const userId = event.currentTarget.closest("[data-user-id]")?.dataset.userId;
    if (!userId) return;
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    let actorId = null;
    if (data?.type === `${MODULE_ID}.hero`) {
      actorId = data.actorId;
      if (!getRoster().some(e => e.actorId === actorId)) return;
    } else {
      const actor = await this.#resolveDroppedActor(data);
      if (!actor) return;
      await this.#addToRoster(actor);
      actorId = actor.id;
    }
    await this.#assignHeroToUser(actorId, userId);
  }

  /**
   * Directly assign a roster hero to a player (GM shortcut bypassing the claim flow):
   * grant ownership, link the character, and revoke the previous character's
   * ownership when replacing one.
   * @param {string} actorId The roster Actor id.
   * @param {string} userId The receiving player's user id.
   * @returns {Promise<void>}
   */
  async #assignHeroToUser(actorId, userId) {
    const user = game.users.get(userId);
    const actor = game.actors.get(actorId);
    if (!user || !actor) return;
    const claimant = getClaimantUser(actorId);
    if (claimant?.id === userId) return;
    if (claimant) {
      ui.notifications.warn("CYH.RosterConfig.AssignTaken", { localize: true });
      return;
    }
    const previous = user.character;
    let content = `<p>${game.i18n.format("CYH.RosterConfig.AssignConfirm", { name: actor.name, user: user.name })}</p>`;
    if (previous) content += `<p>${game.i18n.format("CYH.RosterConfig.AssignReplace", { current: previous.name })}</p>`;
    const confirmed = await DialogV2.confirm({
      window: { title: "CYH.RosterConfig.AssignConfirmTitle" },
      content
    });
    if (!confirmed) return;
    const actorUpdates = [buildOwnershipUpdate(actor, { [userId]: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER })];
    if (previous && previous.id !== actorId) {
      // Drop the replaced hero back to "Default" (remove the key, not NONE).
      actorUpdates.push(buildOwnershipUpdate(previous, { [userId]: null }));
    }
    try {
      await applyClaimChanges(actorUpdates, userId, actorId);
      // The assigned hero is now owned; clear it from the player's pending views.
      await user.setFlag(MODULE_ID, FLAGS.PENDING_VIEWS, getPendingViews(user).filter(id => id !== actorId));
    } catch (err) {
      console.error(err);
      ui.notifications.error("CYH.RosterConfig.AssignFailed", { localize: true });
      return;
    }
    // Clears any pending interest peers still hold on this hero.
    broadcastClaimed(actorId);
    ui.notifications.info(game.i18n.format("CYH.RosterConfig.Assigned", { name: actor.name, user: user.name }));
  }

  /**
   * Handle an Actor or Actor Folder dropped onto the drop zone.
   * Folders are expanded recursively; single Actors are imported from Compendiums when needed.
   * @param {DragEvent} event The drop event.
   * @returns {Promise<void>}
   */
  async _onDrop(event) {
    event.preventDefault();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type === "Folder") {
      await this.#addFolderToRoster(data);
      return;
    }
    const actor = await this.#resolveDroppedActor(data);
    if (!actor) return;
    const added = await this.#addToRoster(actor);
    if (!added) ui.notifications.warn("CYH.RosterConfig.Duplicate", { localize: true });
  }

  /**
   * Add every world Actor inside a dropped Folder (and its subfolders) to the roster.
   * Shows a count notification on success, or a warning when nothing new was added.
   * @param {object} data Drag data parsed by `getDragEventData`.
   * @returns {Promise<void>}
   */
  async #addFolderToRoster(data) {
    const folder = await foundry.utils.fromUuid(data.uuid);
    if (!folder || folder.type !== "Actor") return;
    const actors = [folder, ...folder.getSubfolders(true)].flatMap(f => f.contents);
    let added = 0;
    for (const actor of actors) {
      if (await this.#addToRoster(actor)) added++;
    }
    if (added) {
      ui.notifications.info(game.i18n.format("CYH.RosterConfig.FolderAdded", { count: added }));
    } else {
      ui.notifications.warn("CYH.RosterConfig.FolderNoneAdded", { localize: true });
    }
  }

  /**
   * Resolve dropped drag data to a world Actor, importing from a Compendium when needed.
   * @param {object} data Drag data parsed by `getDragEventData`.
   * @returns {Promise<Actor|null>} The world Actor, or null for non-Actor drops.
   */
  async #resolveDroppedActor(data) {
    if (data?.type !== "Actor" || !data.uuid) return null;
    const dropped = await foundry.utils.fromUuid(data.uuid);
    if (!dropped) return null;
    return dropped.pack ? this.#importFromCompendium(dropped) : dropped;
  }

  /**
   * Add a world Actor to the roster with default presentation, unless already present.
   * @param {Actor} actor The world Actor to add.
   * @returns {Promise<boolean>} Whether a new entry was created.
   */
  async #addToRoster(actor) {
    const entries = getRoster().map(e => e.toObject());
    if (entries.some(e => e.actorId === actor.id)) return false;
    entries.push({ actorId: actor.id, img: "", detailImg: "", description: "" });
    await setRoster(entries);
    return true;
  }

  /**
   * Import a Compendium Actor into the world, inside the module's dedicated Folder
   * (created on first use). Re-dropping the same pack entry reuses the previous
   * import, detected through `_stats.compendiumSource`, instead of duplicating it.
   * @param {Actor} actor The Compendium-sourced Actor document.
   * @returns {Promise<Actor>} The world Actor.
   */
  async #importFromCompendium(actor) {
    const existing = game.actors.find(a => a._stats?.compendiumSource === actor.uuid);
    if (existing) return existing;
    const folder = game.folders.find(f => f.type === "Actor" && f.name === FOLDER_NAME)
      ?? await Folder.implementation.create({ name: FOLDER_NAME, type: "Actor" });
    const pack = game.packs.get(actor.pack);
    return game.actors.importFromCompendium(pack, actor.id, { folder: folder.id });
  }

  /**
   * Open the presentation editor for a roster entry. Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {void}
   */
  _onEditHero(event, target) {
    const { actorId } = target.closest("[data-actor-id]").dataset;
    new HeroEditorApp({ actorId }).render({ force: true });
  }

  /**
   * Toggle whether a roster hero is shown on the player selection screen.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {Promise<void>}
   */
  async _onToggleHidden(event, target) {
    const { actorId } = target.closest("[data-actor-id]").dataset;
    const entries = getRoster().map(e => e.toObject());
    const entry = entries.find(e => e.actorId === actorId);
    if (!entry) return;
    entry.hidden = !entry.hidden;
    await setRoster(entries);
  }

  /**
   * Open the Actor sheet for a roster entry. Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {void}
   */
  _onOpenSheet(event, target) {
    const { actorId } = target.closest("[data-actor-id]").dataset;
    game.actors.get(actorId)?.sheet?.render({ force: true });
  }

  /**
   * Remove a hero from the roster after confirmation. The Actor itself is untouched.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {Promise<void>}
   */
  async _onRemoveHero(event, target) {
    const { actorId } = target.closest("[data-actor-id]").dataset;
    const actor = game.actors.get(actorId);
    const confirmed = await DialogV2.confirm({
      window: { title: "CYH.RosterConfig.RemoveConfirmTitle" },
      content: `<p>${game.i18n.format("CYH.RosterConfig.RemoveConfirm", { name: actor?.name ?? actorId })}</p>`
    });
    if (!confirmed) return;
    await setRoster(getRoster().filter(e => e.actorId !== actorId).map(e => e.toObject()));
  }

  /**
   * Unassign a player's linked hero: revoke their ownership and unlink the character,
   * returning the hero to the available list. Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {Promise<void>}
   */
  async _onUnassignHero(event, target) {
    const userId = target.closest("[data-user-id]")?.dataset.userId;
    const user = game.users.get(userId);
    const character = user?.character;
    if (!character) return;
    const confirmed = await DialogV2.confirm({
      window: { title: "CYH.RosterConfig.ReleaseConfirmTitle" },
      content: `<p>${game.i18n.format("CYH.RosterConfig.ReleaseConfirm", { name: character.name, user: user.name })}</p>`
    });
    if (!confirmed) return;
    try {
      // Drop the released hero back to "Default" by removing the player's key.
      await applyClaimChanges(
        [buildOwnershipUpdate(character, { [userId]: null })],
        userId,
        null
      );
    } catch (err) {
      console.error(err);
      ui.notifications.error("CYH.RosterConfig.AssignFailed", { localize: true });
    }
  }

  /**
   * Force the selection screen open on one player's client. Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {void}
   */
  _onOpenFor(event, target) {
    const { userId } = target.closest("[data-user-id]").dataset;
    broadcastOpen([userId]);
  }

  /**
   * Force the selection screen open on every connected player client.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {void}
   */
  _onOpenForAll() {
    broadcastOpen(game.users.filter(u => u.active && !u.isGM).map(u => u.id));
  }

  /**
   * Revoke every still-pending view grant (drop the players back to "Default" on the
   * heroes they previewed but did not claim) by reconciling the pending-view flags.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {Promise<void>}
   */
  async _onCleanPermissions() {
    const count = game.users.reduce((sum, u) => sum + countRevocableViews(u), 0);
    if (!count) {
      ui.notifications.info("CYH.RosterConfig.NoIllegal", { localize: true });
      return;
    }
    await reconcilePendingViews();
    ui.notifications.info(game.i18n.format("CYH.RosterConfig.CleanIllegalDone", { count }));
  }

  /**
   * Toggle whether a role is part of the recommended team composition shown to players.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The element bearing `data-action`.
   * @returns {Promise<void>}
   */
  async _onToggleRecommended(event, target) {
    const { roleId } = target.closest("[data-role-id]").dataset;
    const current = getRecommendedRoles();
    const next = current.includes(roleId) ? current.filter(id => id !== roleId) : [...current, roleId];
    await setRecommendedRoles(next);
  }

  /**
   * Preview the selection screen locally (read-only for the GM).
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {void}
   */
  _onPreview() {
    HeroSelectionApp.show();
  }
}
