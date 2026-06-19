import { MODULE_ID, SETTINGS, TEMPLATES } from "../constants.js";
import { getRoster, getClaimantUser, playUiSound, resolveRoles, getRecommendedRoles } from "../helpers.js";
import { interest, broadcastSelection, broadcastClaimed } from "../socket.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Immersive full-screen hero selection overlay shown to players. Renders frameless
 * and unpositioned: the stage is laid out entirely through the module stylesheet.
 * Pending selections are contested in real time through the module socket; the final
 * claim is confirmed through a GM-side query.
 */
export class HeroSelectionApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Opted into {@link rerenderModuleApps} so socket traffic refreshes the stage live. */
  static AUTO_RERENDER = true;

  /** @override */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-selection`,
    classes: [MODULE_ID, "hero-selection"],
    tag: "div",
    window: { frame: false, positioned: false },
    actions: {
      selectHero: this.prototype._onSelectHero,
      clearSelection: this.prototype._onClearSelection,
      confirmClaim: this.prototype._onConfirmClaim,
      releaseHero: this.prototype._onReleaseHero,
      viewSheet: this.prototype._onViewSheet,
      closeApp: this.prototype._onCloseApp
    }
  };

  /** @override */
  static PARTS = {
    stage: { template: TEMPLATES.HERO_SELECTION }
  };

  /**
   * The hero currently inspected in the detail panel by this user.
   * @type {string|null}
   */
  #selectedId = null;

  /**
   * Render the singleton selection screen, reusing the open instance if any.
   * @returns {HeroSelectionApp} The rendered application.
   */
  static show() {
    const existing = foundry.applications.instances.get(`${MODULE_ID}-selection`);
    const app = existing instanceof HeroSelectionApp ? existing : new HeroSelectionApp();
    app.render({ force: true });
    return app;
  }

  /**
   * Build the render context: one card view-model per roster hero, plus the enriched
   * detail panel for the locally selected hero.
   * @override
   * @param {object} options Render options.
   * @returns {Promise<object>} The template context.
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const heroes = [];
    for (const e of getRoster()) {
      // GM-hidden entries and entries pointing at deleted Actors never reach the screen.
      if (e.hidden) continue;
      const actor = game.actors.get(e.actorId);
      if (!actor) continue;
      const claimant = getClaimantUser(e.actorId);
      const interested = [];
      for (const [userId, actorId] of interest.entries()) {
        if (actorId !== e.actorId) continue;
        const user = game.users.get(userId);
        if (!user?.active) continue;
        interested.push({
          name: user.name,
          color: user.color.css,
          initial: user.name.charAt(0).toUpperCase(),
          self: user.id === game.user.id
        });
      }
      heroes.push({
        actorId: e.actorId,
        name: actor.name,
        img: e.img || actor.img,
        detailImg: e.detailImg || e.img || actor.img,
        taken: !!claimant,
        takenBy: claimant?.name ?? "",
        // The hero this very player has claimed — surfaces the "Your Hero" marker and
        // the Release action so they can free it (e.g. when the GM re-opens the screen).
        mine: claimant?.id === game.user.id,
        interested,
        selectedByMe: this.#selectedId === e.actorId,
        description: e.description,
        // The roles this hero can fill (deleted-role ids filtered out by resolveRoles).
        roles: resolveRoles(e.roles)
      });
    }

    let selected = null;
    if (this.#selectedId) {
      const hero = heroes.find(h => h.actorId === this.#selectedId);
      if (hero) {
        selected = {
          ...hero,
          enrichedDescription: await foundry.applications.ux.TextEditor.implementation
            .enrichHTML(hero.description ?? ""),
          interestedOthers: hero.interested.filter(i => !i.self).map(i => i.name).join(", ")
        };
      } else {
        this.#selectedId = null;
      }
    }

    // Group-balancing indicator: only shown once the GM has recommended a composition.
    // A recommended role is "covered" when at least one already-claimed hero can fill it.
    // resolveRoles drops deleted-role ids, so an all-deleted recommendation shows nothing.
    let composition = null;
    const recommended = resolveRoles(getRecommendedRoles());
    if (recommended.length) {
      const covered = new Set();
      for (const e of getRoster()) {
        if (!getClaimantUser(e.actorId)) continue;
        for (const id of e.roles ?? []) covered.add(id);
      }
      const marked = recommended.map(r => ({ ...r, covered: covered.has(r.id) }));
      const gaps = marked.filter(r => !r.covered);
      composition = {
        recommended: marked,
        hasGaps: gaps.length > 0,
        gapNames: gaps.map(r => r.name).join(", ")
      };
    }

    const visual = game.settings.get(MODULE_ID, SETTINGS.VISUAL);
    let visualBg = null;
    if (visual.type !== "none") {
      const src = visual.type === "video" ? visual.videoSrc : visual.imageSrc;
      if (src) visualBg = { src, isVideo: visual.type === "video", overlayOpacity: visual.overlayOpacity };
    }

    return Object.assign(context, {
      heroes,
      selected,
      composition,
      canClaim: !game.user.isGM && !game.user.character,
      canViewSheet: !game.user.isGM && game.settings.get(MODULE_ID, SETTINGS.SHEET_ACCESS),
      visualBg
    });
  }

  /**
   * Attach the hover-sound listeners. Mouseenter is not a click action, so it is
   * bound here on every render (the cards' DOM is replaced each time).
   * @override
   * @param {object} context The render context.
   * @param {object} options Render options.
   * @returns {void}
   */
  _onRender(context, options) {
    super._onRender(context, options);
    for (const card of this.element.querySelectorAll(".hero-card")) {
      card.addEventListener("mouseenter", () => playUiSound("hover"));
    }
  }

  /**
   * Select a hero card: open its detail panel and broadcast interest to peers.
   * Claimed heroes can still be inspected but never broadcast or confirmed.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @param {PointerEvent} event The originating click event.
   * @param {HTMLElement} target The card element bearing `data-action`.
   * @returns {void}
   */
  _onSelectHero(event, target) {
    const { actorId } = target.dataset;
    if (!actorId || actorId === this.#selectedId) return;
    playUiSound("select");
    this.#selectedId = actorId;
    if (!game.user.isGM && !getClaimantUser(actorId)) broadcastSelection(actorId);
    else this.render();
  }

  /**
   * Close the detail panel and withdraw any broadcast interest.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {void}
   */
  _onClearSelection() {
    this.#selectedId = null;
    if (!game.user.isGM && interest.has(game.user.id)) broadcastSelection(null);
    else this.render();
  }

  /**
   * Confirm the claim: delegate ownership transfer and character linking to the
   * active GM client via query, then announce the result to peers.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {Promise<void>}
   */
  async _onConfirmClaim() {
    const actorId = this.#selectedId;
    if (!actorId || game.user.isGM) return;
    const gm = game.users.activeGM;
    if (!gm) {
      ui.notifications.warn("CYH.Selection.NoGM", { localize: true });
      return;
    }
    playUiSound("confirm");
    let result;
    try {
      result = await gm.query(`${MODULE_ID}.claim`, { userId: game.user.id, actorId }, { timeout: 15000 });
    } catch {
      result = { ok: false, reason: "failed" };
    }
    if (!result?.ok) {
      const reason = ["missing", "taken", "alreadyHas"].includes(result?.reason) ? result.reason : "failed";
      ui.notifications.warn(`CYH.Selection.Error.${reason}`, { localize: true });
      this.render();
      return;
    }
    broadcastClaimed(actorId);
    const actor = game.actors.get(actorId);
    ui.notifications.info(game.i18n.format("CYH.Selection.Success", { name: actor?.name ?? "" }));
    // Close the Foundry user config sheet if it is open so the player isn't left
    // staring at a stale character-selection form after the claim completes.
    foundry.applications.instances.get(`UserConfig-User-${game.user.id}`)?.close();
    await this.close();
    actor?.sheet?.render({ force: true });
  }

  /**
   * Release this player's currently-claimed hero: ask the active GM (via the `release`
   * query) to revoke ownership and unlink the character, returning the hero to the pool.
   * The screen stays open so the player can immediately claim another. Bound via
   * `DEFAULT_OPTIONS.actions`.
   * @returns {Promise<void>}
   */
  async _onReleaseHero() {
    const actorId = game.user.character?.id;
    if (!actorId || game.user.isGM) return;
    const actor = game.actors.get(actorId);
    const gm = game.users.activeGM;
    if (!gm) {
      ui.notifications.warn("CYH.Selection.NoGM", { localize: true });
      return;
    }
    let result;
    try {
      result = await gm.query(`${MODULE_ID}.release`, { userId: game.user.id, actorId }, { timeout: 15000 });
    } catch {
      result = { ok: false };
    }
    if (!result?.ok) {
      ui.notifications.warn("CYH.Selection.ReleaseFailed", { localize: true });
      this.render();
      return;
    }
    // Return to the grid; the released hero is now claimable, and the GM's character/
    // ownership writes will re-render the stage with claiming re-enabled.
    this.#selectedId = null;
    broadcastClaimed(actorId);
    ui.notifications.info(game.i18n.format("CYH.Selection.Released", { name: actor?.name ?? "" }));
  }

  /**
   * Open the actor sheet for the currently selected hero. View access is granted
   * on demand: the first time this player opens a hero's sheet, the active GM is
   * asked (via the `grantView` query) to grant OBSERVER and flag the grant for
   * later cleanup. The selection overlay sits at z-index 9998; the sheet window is
   * pushed above it after render so it is not hidden behind the overlay.
   * Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {Promise<void>}
   */
  async _onViewSheet() {
    const actor = game.actors.get(this.#selectedId);
    if (!actor) return;
    const { OBSERVER } = foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS;
    if (!actor.testUserPermission(game.user, OBSERVER)) {
      const gm = game.users.activeGM;
      if (!gm) {
        ui.notifications.warn("CYH.Selection.NoGM", { localize: true });
        return;
      }
      let result;
      try {
        result = await gm.query(`${MODULE_ID}.grantView`, { userId: game.user.id, actorId: actor.id }, { timeout: 15000 });
      } catch {
        result = { ok: false };
      }
      // The GM's ownership update reaches this client over a separate channel, so
      // wait for it to land before rendering rather than racing into a limited sheet.
      for (let i = 0; result?.ok && i < 40 && !actor.testUserPermission(game.user, OBSERVER); i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (!actor.testUserPermission(game.user, OBSERVER)) {
        ui.notifications.warn("CYH.Selection.SheetNoPermission", { localize: true });
        return;
      }
    }
    await actor.sheet.render({ force: true });
    // Give the sheet one tick to mount its element, then promote its z-index above the overlay.
    setTimeout(() => {
      const el = actor.sheet.element;
      if (!el) return;
      (el instanceof HTMLElement ? el : el[0])?.style.setProperty("z-index", "9999");
    }, 0);
  }

  /**
   * Close the overlay. Bound via `DEFAULT_OPTIONS.actions`.
   * @returns {void}
   */
  _onCloseApp() {
    this.close();
  }

  /**
   * Withdraw any pending interest when the overlay closes for whatever reason.
   * @override
   * @param {object} options Close options.
   * @returns {void}
   */
  _onClose(options) {
    super._onClose(options);
    if (!game.user.isGM && interest.has(game.user.id)) broadcastSelection(null);
  }
}
