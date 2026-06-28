import { MODULE_ID, SETTINGS, FLAGS, DEFAULT_DESCRIPTION_PATH } from "./constants.js";
import { HeroEntryData, RoleData, RolesData, RosterData, SoundConfigData, VisualConfigData } from "./data-models.js";
import { getRoster, setRoster, rerenderModuleApps, reconcilePendingViews, countRevocableViews, seedDefaultRoles } from "./helpers.js";
import { initSocket, registerQueries, broadcastJoin, clearUserInterest } from "./socket.js";
import { RosterConfigApp } from "./apps/roster-config.js";
import { RoleConfigApp } from "./apps/role-config.js";
import { HeroSelectionApp } from "./apps/hero-selection.js";
import { SoundConfigApp } from "./apps/sound-config.js";
import { VisualConfigApp } from "./apps/visual-config.js";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.ROSTER, {
    scope: "world",
    config: false,
    type: RosterData,
    default: { entries: [] },
    // World settings broadcast to every client, so this keeps all open UIs in sync.
    onChange: () => rerenderModuleApps()
  });

  game.settings.register(MODULE_ID, SETTINGS.ROLES, {
    scope: "world",
    config: false,
    type: RolesData,
    default: { roles: [], seeded: false },
    // World settings broadcast to every client, so role edits refresh all open UIs.
    onChange: () => rerenderModuleApps()
  });

  game.settings.register(MODULE_ID, SETTINGS.AUTO_OPEN, {
    name: "CYH.Settings.AutoOpen.Name",
    hint: "CYH.Settings.AutoOpen.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.SOUNDS, {
    scope: "world",
    config: false,
    type: SoundConfigData,
    default: {}
  });

  game.settings.register(MODULE_ID, SETTINGS.VISUAL, {
    scope: "world",
    config: false,
    type: VisualConfigData,
    default: {},
    // World settings broadcast to every client, so the selection screen updates live.
    onChange: () => rerenderModuleApps()
  });

  game.settings.register(MODULE_ID, SETTINGS.USE_ACTOR_DESC, {
    name: "CYH.Settings.UseActorDesc.Name",
    hint: "CYH.Settings.UseActorDesc.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    // Governs heroes left in `inherit` mode; refresh open selection screens live.
    onChange: () => rerenderModuleApps()
  });

  game.settings.register(MODULE_ID, SETTINGS.DESCRIPTION_PATH, {
    name: "CYH.Settings.DescriptionPath.Name",
    hint: "CYH.Settings.DescriptionPath.Hint",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_DESCRIPTION_PATH,
    onChange: () => rerenderModuleApps()
  });

  game.settings.register(MODULE_ID, SETTINGS.SHEET_ACCESS, {
    name: "CYH.Settings.SheetAccess.Name",
    hint: "CYH.Settings.SheetAccess.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    // Disabling sheet access ends viewing, so reconcile away every pending grant.
    // Enabling needs no action: access is now granted on demand per "View" click.
    onChange: async value => {
      if (!value && game.user === game.users.activeGM) await reconcilePendingViews();
    }
  });

  game.settings.registerMenu(MODULE_ID, "rosterMenu", {
    name: "CYH.Settings.Menu.Name",
    label: "CYH.Settings.Menu.Label",
    hint: "CYH.Settings.Menu.Hint",
    icon: "fa-solid fa-users-viewfinder",
    type: RosterConfigApp,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "rolesMenu", {
    name: "CYH.Settings.RolesMenu.Name",
    label: "CYH.Settings.RolesMenu.Label",
    hint: "CYH.Settings.RolesMenu.Hint",
    icon: "fa-solid fa-masks-theater",
    type: RoleConfigApp,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "soundMenu", {
    name: "CYH.Settings.SoundMenu.Name",
    label: "CYH.Settings.SoundMenu.Label",
    hint: "CYH.Settings.SoundMenu.Hint",
    icon: "fa-solid fa-volume-high",
    type: SoundConfigApp,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "visualMenu", {
    name: "CYH.Settings.VisualMenu.Name",
    label: "CYH.Settings.VisualMenu.Label",
    hint: "CYH.Settings.VisualMenu.Hint",
    icon: "fa-solid fa-image",
    type: VisualConfigApp,
    restricted: true
  });

  registerQueries();
});

// Runs after localization data is loaded, as required by localizeDataModel.
Hooks.once("i18nInit", () => {
  foundry.helpers.Localization.localizeDataModel(HeroEntryData);
  foundry.helpers.Localization.localizeDataModel(RoleData);
  foundry.helpers.Localization.localizeDataModel(SoundConfigData);
  foundry.helpers.Localization.localizeDataModel(VisualConfigData);
});

Hooks.once("ready", async () => {
  initSocket({ onOpenRequest: () => HeroSelectionApp.show() });

  game.modules.get(MODULE_ID).api = {
    open: () => HeroSelectionApp.show(),
    configure: () => new RosterConfigApp().render({ force: true })
  };

  // On world load the active GM heals any view grants left dangling by players who
  // disconnected (or whose client never cleaned up) during a previous session, and
  // seeds the default role catalog on the very first run.
  if (game.user === game.users.activeGM) {
    await reconcilePendingViews();
    await seedDefaultRoles();
  }

  if (game.user.isGM) return;

  // Announce arrival so peers re-broadcast their pending selections to this client.
  broadcastJoin();

  const shouldAutoOpen = game.settings.get(MODULE_ID, SETTINGS.AUTO_OPEN)
    && !game.user.character
    && getRoster().length > 0;
  if (shouldAutoOpen) HeroSelectionApp.show();
});

// Confirmed claims surface as ownership/character updates on every client,
// so these hooks keep the selection screen and GM panel current without sockets.
Hooks.on("updateActor", (actor, changes) => {
  if ("ownership" in changes) rerenderModuleApps();
});

Hooks.on("updateUser", (user, changes) => {
  if ("character" in changes) rerenderModuleApps();
  // Pending-view changes alter the roster panel badges and the directory alert.
  if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${FLAGS.PENDING_VIEWS}`)) {
    rerenderModuleApps();
    ui.actors?.render();
  }
});

Hooks.on("userConnected", (user, connected) => {
  if (!connected) clearUserInterest(user.id);
  // FIXME: User#active may not yet reflect the connection change when this hook
  // fires, so an immediate render shows stale online status. Defer one tick.
  setTimeout(rerenderModuleApps, 150);
});

// GM-only shortcut in the Actors sidebar: appears with an alert accent whenever
// players still hold module-granted view permissions awaiting cleanup, opening the
// roster panel where they can be inspected and cleared.
Hooks.on("renderActorDirectory", (app, element) => {
  if (!game.user.isGM) return;
  const root = element instanceof HTMLElement ? element : element?.[0];
  if (!root) return;
  // Re-renders reuse the same element, so drop any previously injected button first.
  root.querySelector(".claim-your-hero.roster-alert")?.remove();
  if (!game.users.some(u => countRevocableViews(u) > 0)) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "claim-your-hero roster-alert";
  button.innerHTML = `<i class="fa-solid fa-users-viewfinder"></i> ${game.i18n.localize("CYH.RosterConfig.DirectoryAlert")}`;
  button.addEventListener("click", () => new RosterConfigApp().render({ force: true }));
  // Drop it into the header's action-button row (below Create Actor / Create Folder)
  // so it inherits Foundry's directory padding and inter-button spacing; the CSS
  // makes it wrap onto its own full-width line.
  const actions = root.querySelector(".directory-header .header-actions");
  if (actions) actions.appendChild(button);
  else (root.querySelector(".directory-header") ?? root).prepend(button);
});

// Roster hygiene: drop entries whose Actor was deleted. Only the active GM writes,
// preventing concurrent settings updates when multiple GMs are connected.
Hooks.on("deleteActor", async actor => {
  if (game.user !== game.users.activeGM) return;
  const entries = getRoster();
  if (!entries.some(e => e.actorId === actor.id)) return;
  await setRoster(entries.filter(e => e.actorId !== actor.id).map(e => e.toObject()));
});
