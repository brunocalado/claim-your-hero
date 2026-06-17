import { MODULE_ID, SETTINGS, DEFAULT_SOUND_VOLUME } from "./constants.js";

/**
 * Read the configured hero roster from world settings.
 * @returns {import("./data-models.js").HeroEntryData[]} The configured entries (DataModel instances).
 */
export function getRoster() {
  return game.settings.get(MODULE_ID, SETTINGS.ROSTER)?.entries ?? [];
}

/**
 * Persist a new roster entry list to world settings.
 * @param {object[]} entries Plain-object source data for every entry.
 * @returns {Promise<unknown>} The settings update promise.
 */
export function setRoster(entries) {
  return game.settings.set(MODULE_ID, SETTINGS.ROSTER, { entries });
}

/**
 * Find the player that has formally claimed an Actor, i.e. has it as their linked character.
 * Claims are derived from `User#character` so they survive reloads without extra bookkeeping.
 * @param {string} actorId The world Actor id.
 * @returns {User|null} The claiming player, or null when the hero is still available.
 */
export function getClaimantUser(actorId) {
  return game.users.find(u => !u.isGM && u.character?.id === actorId) ?? null;
}

/**
 * Apply the document changes of a claim-state transition: batched Actor ownership
 * updates plus the user's character (re)assignment. Uses the stable per-collection
 * batch APIs instead of `foundry.documents.modifyBatch`, whose instruction format
 * is still shifting between v14 builds and failed silently at runtime.
 * @param {object[]} actorUpdates Batched Actor update payloads (may be empty).
 * @param {string} userId The affected user's id.
 * @param {string|null} characterId The new linked character id, or null to unlink.
 * @returns {Promise<void>}
 */
export async function applyClaimChanges(actorUpdates, userId, characterId) {
  if (actorUpdates.length) await Actor.implementation.updateDocuments(actorUpdates);
  await game.users.get(userId)?.update({ character: characterId });
}

/**
 * Play one of the configured UI sounds locally, honoring the shared volume setting.
 * Silently does nothing when the configured path is blank or fails to load.
 * @param {"hover"|"select"|"confirm"} key Which configured sound to play.
 * @returns {void}
 */
export function playUiSound(key) {
  const config = game.settings.get(MODULE_ID, SETTINGS.SOUNDS);
  const src = config?.[key];
  if (!src) return;
  foundry.audio.AudioHelper.play(
    { src, volume: config.volume ?? DEFAULT_SOUND_VOLUME, loop: false },
    false
  ).catch(() => {});
}

/**
 * Re-render every open module Application that opted into automatic refresh via the
 * `AUTO_RERENDER` static flag. The hero editor deliberately opts out so live socket
 * traffic cannot wipe an unsaved ProseMirror draft mid-edit.
 * @returns {void}
 */
export function rerenderModuleApps() {
  for (const app of foundry.applications.instances.values()) {
    if (app.constructor.AUTO_RERENDER && app.rendered) app.render();
  }
}

/**
 * Grant OBSERVER permission to every non-GM player on each unclaimed roster actor
 * that does not already have OBSERVER or higher access.
 * Only the active GM should call this; it performs batched Actor ownership updates.
 * @returns {Promise<void>}
 */
export async function syncRosterObservers() {
  const playerIds = game.users.filter(u => !u.isGM).map(u => u.id);
  if (!playerIds.length) return;
  const { OBSERVER } = foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS;
  const updates = [];
  for (const e of getRoster()) {
    if (getClaimantUser(e.actorId)) continue;
    const actor = game.actors.get(e.actorId);
    if (!actor) continue;
    const patch = {};
    for (const userId of playerIds) {
      const current = actor.ownership[userId] ?? foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
      if (current < OBSERVER) patch[`ownership.${userId}`] = OBSERVER;
    }
    if (Object.keys(patch).length) updates.push({ _id: e.actorId, ...patch });
  }
  if (updates.length) await Actor.implementation.updateDocuments(updates);
}

/**
 * Revoke OBSERVER permission from all non-GM players on the given actors.
 * Players who are OWNER (claimants) are untouched.
 * Only the active GM should call this; it performs batched Actor ownership updates.
 * @param {Actor[]} actors The actors whose module-granted OBSERVER access should be cleared.
 * @returns {Promise<void>}
 */
export async function revokeObservers(actors) {
  const { OBSERVER, NONE } = foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS;
  const updates = [];
  for (const actor of actors) {
    if (!actor) continue;
    const patch = {};
    for (const [userId, level] of Object.entries(actor.ownership)) {
      if (userId === "default") continue;
      if (game.users.get(userId)?.isGM) continue;
      if (level === OBSERVER) patch[`ownership.${userId}`] = NONE;
    }
    if (Object.keys(patch).length) updates.push({ _id: actor.id, ...patch });
  }
  if (updates.length) await Actor.implementation.updateDocuments(updates);
}
