import { MODULE_ID, SETTINGS } from "./constants.js";
import { HeroEntryData, RosterData, SoundConfigData, VisualConfigData } from "./data-models.js";
import { getRoster, setRoster, rerenderModuleApps, syncRosterObservers, revokeObservers } from "./helpers.js";
import { initSocket, registerClaimQuery, broadcastJoin, clearUserInterest } from "./socket.js";
import { RosterConfigApp } from "./apps/roster-config.js";
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
    onChange: () => {
      rerenderModuleApps();
      if (game.user === game.users.activeGM
        && game.settings.get(MODULE_ID, SETTINGS.SHEET_ACCESS) === true) {
        syncRosterObservers();
      }
    }
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

  game.settings.register(MODULE_ID, SETTINGS.SHEET_ACCESS, {
    name: "CYH.Settings.SheetAccess.Name",
    hint: "CYH.Settings.SheetAccess.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: async value => {
      if (game.user !== game.users.activeGM) return;
      if (value) {
        await syncRosterObservers();
      } else {
        await revokeObservers(getRoster().map(e => game.actors.get(e.actorId)).filter(Boolean));
      }
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

  registerClaimQuery();
});

// Runs after localization data is loaded, as required by localizeDataModel.
Hooks.once("i18nInit", () => {
  foundry.helpers.Localization.localizeDataModel(HeroEntryData);
  foundry.helpers.Localization.localizeDataModel(SoundConfigData);
  foundry.helpers.Localization.localizeDataModel(VisualConfigData);
});

Hooks.once("ready", () => {
  initSocket({ onOpenRequest: () => HeroSelectionApp.show() });

  game.modules.get(MODULE_ID).api = {
    open: () => HeroSelectionApp.show(),
    configure: () => new RosterConfigApp().render({ force: true })
  };

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
});

Hooks.on("userConnected", (user, connected) => {
  if (!connected) clearUserInterest(user.id);
  // FIXME: User#active may not yet reflect the connection change when this hook
  // fires, so an immediate render shows stale online status. Defer one tick.
  setTimeout(rerenderModuleApps, 150);
  if (connected && game.user === game.users.activeGM
    && game.settings.get(MODULE_ID, SETTINGS.SHEET_ACCESS) === true) {
    syncRosterObservers();
  }
});

// Roster hygiene: drop entries whose Actor was deleted. Only the active GM writes,
// preventing concurrent settings updates when multiple GMs are connected.
Hooks.on("deleteActor", async actor => {
  if (game.user !== game.users.activeGM) return;
  const entries = getRoster();
  if (!entries.some(e => e.actorId === actor.id)) return;
  await setRoster(entries.filter(e => e.actorId !== actor.id).map(e => e.toObject()));
});
