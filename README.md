# ⚔️ Claim Your Hero

**Turn character selection into a moment your players will remember.**

Claim Your Hero replaces the usual "the GM assigns you a character" routine with a cinematic, interactive selection screen — players browse a gallery of heroes, pick the one that calls to them, and lock in their claim in real time.

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-red?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/mestredigital)

---

## ✨ What It Does

When your players connect to the session, they are greeted with a **full-screen hero gallery**. Each card shows a portrait and a name. Hovering reveals more; clicking opens a rich detail panel with the description you wrote — and the **roles** that hero can fill. Players then hit **Claim this Hero** to make it theirs.

The moment a hero is claimed, Foundry automatically:

- Grants the player **Owner** permission on that Actor
- Sets that Actor as their **assigned character**
- Locks the hero out so no one else can grab it

No manual permission wrangling. No back-and-forth in chat. Just pick and play.

---

## 🖼️ The Selection Screen

![The hero selection screen — a full-screen gallery of hero cards with a detail panel on the right](docs/pick-hero.webp)

The gallery is **full-screen and frameless** — it fills the entire browser window so nothing distracts from the drama of choosing a hero. You can even set a custom **image or video background** behind it (see [Settings](#️-settings)).

Each hero has two independent images you can configure:

| Image slot | Where it appears |
|---|---|
| **Card image** | The hero grid thumbnail (always square) |
| **Detail image** | The large artwork shown in the side panel when a player selects the hero |

Both slots fall back to the Actor portrait if left empty, so you only fill them in when you want something different.

### Role badges & composition guidance

- **Role badges** — heroes you have tagged with roles wear small badges on their card and in the detail panel, so players can see at a glance who tanks, who heals, and who deals damage.
- **Composition bar** — when you set a recommended party composition, a bar lists the roles the party should cover and marks each as **✅ covered** or **⚠️ missing** as heroes are claimed. Picking a hero becomes about filling team gaps, not just looks.

See [Team Roles & Composition](#-team-roles--composition) for how to set these up.

### Contesting a pick

Multiple players can browse at the same time. If two players are eyeing the same hero, a small indicator appears on the card — **first to confirm wins**.

### Already have a hero?

If you re-open the selection screen for a player who has already claimed someone (for example with **Open for All Players**), their current hero is highlighted as **Your Hero**. Its detail panel gains a **Release Hero** button — one click returns the hero to the pool and frees the player to immediately pick another.

---

## 🎭 Team Roles & Composition

Optional, but powerful for groups that care about a balanced party.

![The Team Roles editor — the role catalog on the left and the recommended composition on the right](docs/config-roles.webp)

Open **Settings → Module Settings → Team Roles → Configure Roles** — or just hit the **Configure Roles** button right inside the Roster panel — to manage your role catalog and the recommended composition side by side.

### The role catalog

- Ships pre-seeded with **eight ready-to-use roles**: Tank, Healer, Melee DPS, Ranged DPS, Support, Controller, Scout, and Face.
- Edit any role **inline** — change its name and description in place, or click its icon to pick any image with the File Picker (the preview updates live).
- **Add Role** to create your own; **Reset to Defaults** restores the shipped set (with confirmation).
- Delete roles you don't use — removed roles are cleanly dropped from every hero tag and from the recommendation, with no stale data left behind.

### Recommended composition

Right beside the catalog, tick the roles your party *should* cover. Players see this list on the selection screen, with gaps highlighted, so the group can coordinate instead of all doubling up on the same archetype.

### Tagging heroes

In each hero's presentation editor, mark which roles that hero can play. Those tags drive the badges on the selection screen and the covered/missing math in the composition bar.

---

## 🛠️ The GM Panel

Everything is managed from a single **Roster** panel you open from the module settings. It is split into two columns:

![The GM Roster panel — players and their assigned characters on the left, available heroes on the right](docs/config-screen.webp)

**👥 Players (left)** — every non-GM user in your world, with a green dot for connected players and a slot showing their current character.

**🦸 Available Heroes (right)** — all the Actors you have queued up for selection.

### Adding heroes is effortless

Drag any Actor directly onto the **Available Heroes** drop zone — from the sidebar or straight out of a Compendium. Drop an entire **Actor Folder** (including its subfolders) to add every hero inside it at once. The module imports Compendium Actors into the world automatically, no manual steps needed.

### Per-hero presentation

Click the ✏️ **Edit** button on any hero row to customise:

![The per-hero presentation editor — card and detail images, a rich-text description, and role checkboxes](docs/config-actor.webp)

- **Card image** — thumbnail shown on the selection grid, with a live preview
- **Detail image** — larger artwork shown when a player opens the hero's detail panel, with a live preview
- **Description** — rich-text field (bold, italics, links, whatever you need) shown when a player inspects the hero
- **Roles** — tick which roles this hero can fill

### 👁️ Hide heroes selectively

Toggle the visibility button on any hero to **hide it from the player gallery** without removing it from the roster. Hidden heroes stay invisible to players until you reveal them — perfect for mid-campaign reveals or keeping spoiler characters off-screen until the right dramatic moment.

### Direct assignment

Need to skip the selection screen entirely? Drag a hero row directly onto a player's slot and confirm the pop-up. The module handles ownership and character linking in one step.

### Releasing a claim

Changed your mind? Click the **Unassign** button next to any player's claimed character to release the hero — ownership is revoked and the hero returns to the available list automatically. (Players can also release their own hero from the selection screen — see [Already have a hero?](#already-have-a-hero))

### Letting players inspect sheets

When **Allow Viewing Character Sheets** is on, players get a **View Character Sheet** button on each unclaimed hero. Access is granted **on demand** — only to the player who clicks View, and only for that hero (several players can peek at the same hero at once). It is revoked automatically when the hero is claimed.

The Roster panel keeps this tidy for you:

- Each hero shows an **👁️ eye indicator** with the number of players who can currently view it; hover to see exactly who.
- The **Clean View Permissions** button revokes every outstanding view in one click.
- Whenever players still hold pending view permissions, a GM-only shortcut button (with an alert dot) appears in the **Actors directory header** and jumps straight to this panel.

Cleanup is also automatic: dangling grants are healed on world load, and turning the setting off clears them all. Revoked access falls back to the world's **Default** ownership rather than being pinned to "None".

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

## 🎨 Selection Screen Background

Give the gallery a backdrop from **Settings → Module Settings → Selection Background → Configure Background**:

- Supports static **images** (`.jpg`, `.png`, `.webp`, …) and looping **videos** (`.mp4`, `.webm`); videos always play muted.
- An adjustable **dark overlay** (0–100% opacity) sits between the background and the content, keeping hero cards and text readable at any background brightness.
- Changes broadcast to all connected clients immediately — the selection screen updates live, no reload required.

---

## ⚙️ Settings

Claim Your Hero is configured from **Settings → Module Settings**. Four panels handle the heavy lifting:

| Panel | What it opens |
|---|---|
| **Hero Roster → Configure Roster** | The GM Roster panel (players, heroes, assignment) |
| **Team Roles → Configure Roles** | The role catalog and recommended composition |
| **Selection Sounds → Configure Sounds** | Hover / select / confirm cues and volume |
| **Selection Background → Configure Background** | Image or video backdrop for the gallery |

Plus two world toggles:

| Setting | Default | What it does |
|---|---|---|
| **Open Selection Automatically** | On | Shows the screen to players who connect without an assigned character (requires at least one hero in the roster) |
| **Allow Viewing Character Sheets** | On | Lets players open a hero's full character sheet from the selection screen. Observer access is granted on demand only to the player who clicks View, and is cleared again once they claim a hero, when the setting is turned off, or on the next world load. |

---

## ⚡ Real-Time & Conflict-Free

Claim Your Hero uses Foundry's native socket layer and query system so every pick is visible to all connected clients the instant it happens. The GM client acts as the authority: when a player confirms, the claim is validated server-side before any permissions change — eliminating race conditions even when two players click simultaneously.

---

## 🚀 Getting Started

1. Install the module and enable it in your world.
2. Open **Settings → Module Settings → Hero Roster → Configure Roster**.
3. Drag your Actors (from the sidebar, a folder, or a Compendium) into the **Available Heroes** zone.
4. Optionally customise each hero's images, description, and roles with the ✏️ button.
5. (Optional) Set up **Team Roles** and a **recommended composition** so players can balance the party.
6. Use **Preview** to see how the gallery looks before your players do.
7. When your players connect, the selection screen opens automatically — or push it manually with **Open for All Players**.
8. Watch them argue over who gets the paladin.

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
