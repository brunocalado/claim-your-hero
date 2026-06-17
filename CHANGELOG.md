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
