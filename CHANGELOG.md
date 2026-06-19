# 0.1.1

### Changed
- **Role badges on the detail portrait** — when inspecting a hero, its roles now appear as badges overlaid on the top-right of the displayed portrait (mirroring the cards), instead of as a separate text list under the name. Each badge keeps the role name on hover.
- **Pulsing title glow** — the "Claim Your Hero" title now breathes with a slow, soft golden glow. Honors the "reduce motion" accessibility preference.

### Fixed
- **Detail panel no longer leaks the grid behind it** — opening a hero's detail panel could show the role badges and interest pips from the cards underneath bleeding over the panel, and hovering that area would trigger the card hover sound. The panel now fully covers the grid behind it and no longer plays the sound.

# 0.1.0

### Added
- **Ambient golden particles** — when no background image or video is configured, the selection screen now drifts golden embers upward behind the heroes, giving the dark stage some life. They appear automatically whenever the background is left empty (or cleared) and disappear once a background is set. Honors the "reduce motion" accessibility preference.

# 0.0.9

### Added
- **Release your hero** — when the selection screen is shown to a player who already has a hero (e.g. the GM re-opens it with "Open for" / "Open for All"), their current hero is highlighted as "Your Hero" and its detail panel gains a **Release Hero** button. Releasing returns the hero to the pool and lets the player immediately pick another. The GM can still re-send the screen to anyone, including players who already hold a character.

# 0.0.8

### Changed
- **Unified role picker styling** — the "Recommended Composition" picker now uses the same one-per-line, card-style toggles (with hover and selected highlight) as the hero editor's role picker. The narrower picker lets the right column shrink, and the freed width is given to the editable catalog rows on the left, keeping the panel's overall width unchanged. Long role names truncate with an ellipsis on both sides.
- **Roles panel layout** — the panel now has a fixed height (no longer resizable) and both columns share that height, so the catalog and the recommendation list line up with no dead space; each list scrolls internally when long.

# 0.0.7

### Changed
- **Redesigned hero presentation editor** — each field is now a distinct card (border + raised surface + heading) for a clearer, higher-contrast, more readable layout.
- **Two-column editor** — the image and description fields sit on the left while the role picker moves to the right (one role per line), so the dialog spreads across its width instead of growing tall. The columns share an equal height (the description editor and the role list each fill their side, so there is no dead space), the role list caps its height and scrolls for large catalogs, each checked role lights up live, and the Save button now spans the full width.

### Added
- **Inline image previews** — the Card Image and Detail Image fields show a thumbnail on the same line as the picker, updating live as you choose a file; an empty (dashed) slot is shown when no image is set, since both images are optional.

# 0.0.6

### Added
- **Three more default roles** — the catalog now seeds eight roles, adding Controller, Scout, and Face alongside the original five.
- **Reset to Defaults** — a button next to "Add Role" restores the shipped default roles (with confirmation), replacing the current catalog and clearing the recommended composition.

### Changed
- **Inline role editing** — roles are now edited directly in the catalog list: the name and description are editable fields (with character limits) and clicking a role's icon opens the File Picker straight away. The separate role-editor dialog has been removed for a simpler flow.
- **Two-column Roles panel** — the catalog sits on the left and the "Recommended Composition" picker on the right, so the panel spreads across its width instead of growing tall.
- **Recommended composition moved** — the "Recommended Composition" picker now lives inside the Roles panel instead of the roster panel. The roster panel gains a "Configure Roles" button (next to Open for All / Clean View Permissions / Preview) that opens it.
- **Solid, opaque surfaces** — removed the translucency from the role catalog, role tags, role badges, and the composition bar for a cleaner, more readable look.

### Fixed
- **Live icon preview** — changing a role's icon now updates its preview immediately, instead of only after saving, closing, and reopening the panel.

# 0.0.5

### Added
- **Team roles & group balancing** — a new "Configure Roles" button in module Settings opens a role catalog where the GM creates roles (name, an image chosen via the File Picker, and an optional description). The catalog ships pre-seeded with five default roles (Tank, Healer, Melee DPS, Ranged DPS, Support) that the GM can freely edit or delete; deleted defaults are never re-seeded.
- **Per-hero role tagging** — the hero presentation editor now lets the GM mark which roles each hero can play.
- **Recommended composition** — the roster panel gains a "Recommended Composition" section where the GM selects the roles the party should cover.
- **Player-side composition guidance** — on the selection screen, tagged heroes show their role badges, and (when the GM has set a recommendation) a composition bar lists the recommended roles, marking each as covered or missing so picking a hero becomes about filling team gaps, not just looks.

### Fixed
- **Resilient to deleted roles** — roles removed from the catalog without cleanup are silently dropped from hero badges, the recommendation, and the gap calculation, with no stale entries or errors.

### Changed
- **On-demand character sheet access** — Observer access is no longer granted to every player on every available hero up front. Instead, a player is granted view access only when they click "View Character Sheet", and only for that hero. Several players can still view the same hero at once.
- **Revoked access returns to "Default", not "None"** — Whenever the module takes back access (a hero is claimed, assigned, released, or pending views are cleaned), the player's entry on that Actor is now removed so they fall back to the "All Players" default ("Default" in the Ownership Configuration dialog), instead of being pinned to "None". The "All Players" entry itself is never touched.

### Added
- **Automatic permission cleanup** — Each granted view is remembered on the player. The active GM reconciles these on world load, healing any view permissions left dangling by a disconnect or crash. Turning off "Allow Viewing Character Sheets" also clears them all.
- **Pending-view indicator & cleanup in the roster panel** — Each available hero shows a single indicator with the number of players currently able to view it; hovering reveals their names. A new "Clean View Permissions" button revokes every pending view in one click.
- **Actors sidebar alert** — While players still hold pending view permissions, a GM-only shortcut button (with an alert dot) appears in the Actors directory header and opens the roster panel.

# 0.0.3

### Added
- **Folder drag support** — dragging an Actor Folder onto the drop zone adds every Actor inside it (including subfolders) to the roster at once. A notification confirms how many heroes were added; actors already in the roster are skipped silently.

### Fixed
- **Drop zone visual feedback** — the "Drag actors here" zone now highlights (accent border and brighter text) while an actor is being dragged over it, consistent with the existing hover state and the per-player drag-over effect.

# 0.0.2

### Added
- **Selection screen background** — GMs can now configure an image or video background for the hero selection screen via a new "Configure Background" button in module Settings.
  - Supports static images (`.jpg`, `.png`, `.webp`, etc.) and looping videos (`.mp4`, `.webm`); videos always play muted.
  - An adjustable dark overlay (0–100% opacity) sits between the background and the content to keep hero cards and text readable at any background brightness.
  - Changes broadcast to all connected clients immediately; the selection screen updates live without requiring a reload.
