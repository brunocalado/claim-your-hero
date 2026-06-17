# ⚔️ Claim Your Hero

**Turn character selection into a moment your players will remember.**

Claim Your Hero replaces the usual "the GM assigns you a character" routine with a cinematic, interactive selection screen — players browse a gallery of heroes, pick the one that calls to them, and lock in their claim in real time.

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-red?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/mestredigital)

---

## ✨ What It Does

When your players connect to the session, they are greeted with a **full-screen hero gallery**. Each card shows a portrait and a name. Hovering reveals more; clicking opens a rich detail panel with the description you wrote. Players then hit **Claim this Hero** to make it theirs.

The moment a hero is claimed, Foundry automatically:

- Grants the player **Owner** permission on that Actor
- Sets that Actor as their **assigned character**
- Locks the hero out so no one else can grab it

No manual permission wrangling. No back-and-forth in chat. Just pick and play.

---

## 🖼️ The Selection Screen

The gallery is **full-screen and frameless** — it fills the entire browser window so nothing distracts from the drama of choosing a hero.

Each hero has two independent images you can configure:

| Image slot | Where it appears |
|---|---|
| **Card image** | The hero grid thumbnail (always square) |
| **Detail image** | The large artwork shown in the side panel when a player selects the hero |

Both slots fall back to the Actor portrait if left empty, so you only fill them in when you want something different.

Multiple players can browse at the same time. If two players are eyeing the same hero, a small indicator appears on the card — **first to confirm wins**.

---

## 🛠️ The GM Panel

Everything is managed from a single **Roster** panel you open from the module settings. It is split into two columns:

**👥 Players (left)** — every non-GM user in your world, with a green dot for connected players and a slot showing their current character.

**🦸 Available Heroes (right)** — all the Actors you have queued up for selection.

### Adding heroes is effortless

Drag any Actor directly onto the **Available Heroes** drop zone — from the sidebar or straight out of a Compendium. The module imports Compendium Actors into the world automatically, no manual steps needed.

### Per-hero presentation

Click the ✏️ **Edit** button on any hero row to customise:

- **Card image** — thumbnail shown on the selection grid
- **Detail image** — larger artwork shown when a player opens the hero's detail panel
- **Description** — rich-text field (bold, italics, links, whatever you need) shown when a player inspects the hero

### 👁️ Hide heroes selectively

Toggle the visibility button on any hero to **hide it from the player gallery** without removing it from the roster. Hidden heroes stay invisible to players until you reveal them — perfect for mid-campaign reveals or keeping spoiler characters off-screen until the right dramatic moment.

### Direct assignment

Need to skip the selection screen entirely? Drag a hero row directly onto a player's slot and confirm the pop-up. The module handles ownership and character linking in one step.

### Releasing a claim

Changed your mind? Click the **Unassign** button next to any player's claimed character to release the hero — ownership is revoked and the hero returns to the available list automatically.

### Pushing the screen to players

- **Open for All Players** — sends the selection screen to every connected player at once.
- **Open for [Player]** — push it to one specific player from their row.
- **Preview** — opens a local read-only preview on your own screen so you can check how the roster looks before going live.

---

## 🔊 Atmospheric Sounds

The selection screen plays subtle sound cues to heighten the mood:

| Cue | When |
|---|---|
| **Hover** | Cursor moves over a hero card |
| **Select** | Detail panel opens |
| **Confirm** | A hero is claimed |

All three sounds and the master volume are configurable from **Selection Sounds** in the module settings. You can point each cue to any audio file in your Foundry data folder.

---

## ⚙️ Settings

| Setting | Default | What it does |
|---|---|---|
| **Open Selection Automatically** | On | Shows the screen to players who connect without an assigned character (requires at least one hero in the roster) |
| **Allow Viewing Character Sheets** | Off | Lets players open a hero's full character sheet from the selection screen. Observer access is granted to all roster Actors while the hero is unclaimed and revoked automatically when the hero is taken. |

---

## ⚡ Real-Time & Conflict-Free

Claim Your Hero uses Foundry's native socket layer and query system so every pick is visible to all connected clients the instant it happens. The GM client acts as the authority: when a player confirms, the claim is validated server-side before any permissions change — eliminating race conditions even when two players click simultaneously.

---

## 🚀 Getting Started

1. Install the module and enable it in your world.
2. Open **Settings → Module Settings → Hero Roster → Configure Roster**.
3. Drag your Actors (from the sidebar or a Compendium) into the **Available Heroes** zone.
4. Optionally customise each hero's images and description with the ✏️ button.
5. Use **Preview** to see how the gallery looks before your players do.
6. When your players connect, the selection screen opens automatically — or push it manually with **Open for All Players**.
7. Watch them argue over who gets the paladin.

---

## 🚀 Installation

Install via the Foundry VTT Module browser or use this manifest link:

```
https://raw.githubusercontent.com/brunocalado/claim-your-hero/main/module.json
```

---

## 🐛 Bug Reports & Feature Requests

https://github.com/brunocalado/claim-your-hero/issues

---

## 📜 Credits & License

Released under the [LICENSE](LICENSE).

**Sound effects:**

- Hover sound — [Pixabay](https://pixabay.com/sound-effects/film-special-effects-minimalist-button-hover-sound-effect-399749/)
- Select sound — [Pixabay](https://pixabay.com/sound-effects/technology-bell1-445873/)
- Confirm sound — [Pixabay](https://pixabay.com/sound-effects/musical-winbrass-39632/)
