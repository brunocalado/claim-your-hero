import { MODULE_ID, SETTINGS, FLAGS, DEFAULT_SOUND_VOLUME, DEFAULT_ROLES } from "./constants.js";

/**
 * Read the configured hero roster from world settings.
 * @returns {import("./data-models.js").HeroEntryData[]} The configured entries (DataModel instances).
 */
export function getRoster() {
  return game.settings.get(MODULE_ID, SETTINGS.ROSTER)?.entries ?? [];
}

/**
 * Persist a new roster entry list to world settings, preserving the recommended set.
 * The roster setting is replaced wholesale on write (it is a typed DataModel), so the
 * current {@link getRecommendedRoles} value is carried over to avoid clobbering it.
 * @param {object[]} entries Plain-object source data for every entry.
 * @returns {Promise<unknown>} The settings update promise.
 */
export function setRoster(entries) {
  return game.settings.set(MODULE_ID, SETTINGS.ROSTER, { entries, recommended: getRecommendedRoles() });
}

/**
 * Read the role ids the GM recommends for the team composition.
 * @returns {string[]} The recommended role ids (may include ids of deleted roles).
 */
export function getRecommendedRoles() {
  return game.settings.get(MODULE_ID, SETTINGS.ROSTER)?.recommended ?? [];
}

/**
 * Persist the recommended role ids, preserving the existing roster entries.
 * @param {string[]} ids The role ids to recommend.
 * @returns {Promise<unknown>} The settings update promise.
 */
export function setRecommendedRoles(ids) {
  return game.settings.set(MODULE_ID, SETTINGS.ROSTER, { entries: getRoster().map(e => e.toObject()), recommended: ids });
}

/**
 * Read the role catalog from world settings.
 * @returns {import("./data-models.js").RoleData[]} The configured roles (DataModel instances).
 */
export function getRoles() {
  return game.settings.get(MODULE_ID, SETTINGS.ROLES)?.roles ?? [];
}

/**
 * Persist the role catalog. Any write marks the catalog as seeded, so the default
 * roles are never re-added once the GM has had a chance to manage them.
 * @param {object[]} roles Plain-object source data for every role.
 * @returns {Promise<unknown>} The settings update promise.
 */
export function setRoles(roles) {
  return game.settings.set(MODULE_ID, SETTINGS.ROLES, { roles, seeded: true });
}

/**
 * Resolve an ordered list of role ids to display view-models, silently dropping ids
 * that no longer match a catalog role. This is the safety net for roles the GM deleted
 * without clearing them from heroes or the recommended set.
 * @param {string[]} ids Role ids to resolve.
 * @returns {Array<{id: string, name: string, img: string, description: string}>} The resolved roles.
 */
export function resolveRoles(ids) {
  if (!ids?.length) return [];
  const byId = new Map(getRoles().map(r => [r.id, r]));
  const resolved = [];
  for (const id of ids) {
    const role = byId.get(id);
    if (role) resolved.push({ id: role.id, name: role.name, img: role.img, description: role.description });
  }
  return resolved;
}

/**
 * Seed the role catalog with the shipped defaults on first use only, resolving their
 * localized names and descriptions. The `seeded` sentinel guarantees this runs once,
 * so a GM who deletes the defaults does not see them reappear on the next world load.
 * Only the active GM should call this; it performs a world settings write.
 * @returns {Promise<void>}
 */
export async function seedDefaultRoles() {
  if (game.settings.get(MODULE_ID, SETTINGS.ROLES)?.seeded) return;
  const roles = DEFAULT_ROLES.map(d => ({
    id: foundry.utils.randomID(),
    name: game.i18n.localize(d.nameKey),
    img: d.img,
    description: game.i18n.localize(d.descKey)
  }));
  await setRoles(roles);
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
 * Build an Actor update payload that sets or removes per-user ownership entries
 * while leaving `default` (All Players) and every other user untouched.
 *
 * Removing an entry (level `null`) deletes the key entirely so the user falls back
 * to the All Players default — i.e. "Default" in the ownership dialog, whose stored
 * shape is simply the absence of the key (e.g. `{ "default": 0 }`). The deletion is
 * realised by {@link applyOwnershipUpdates} replacing the whole `ownership` map with
 * `recursive: false`, because `-=` deletion keys are rejected by the v14 ownership
 * SchemaField diff.
 * @param {Actor} actor The roster Actor to patch.
 * @param {Record<string, number|null>} changes userId → ownership level, or null to remove.
 * @returns {object|null} A `{ _id, ownership }` payload, or null when nothing changes.
 */
export function buildOwnershipUpdate(actor, changes) {
  const ownership = { ...actor.ownership };
  let dirty = false;
  for (const [userId, level] of Object.entries(changes)) {
    if (level === null) {
      if (userId in ownership) { delete ownership[userId]; dirty = true; }
    } else if (ownership[userId] !== level) {
      ownership[userId] = level;
      dirty = true;
    }
  }
  return dirty ? { _id: actor.id, ownership } : null;
}

/**
 * Apply ownership payloads from {@link buildOwnershipUpdate} as a single batch.
 * `recursive: false` makes the supplied `ownership` object replace the stored map
 * wholesale, so removed user keys actually disappear (granting genuine "Default").
 * @param {Array<object|null>} updates Payloads (nulls are ignored).
 * @returns {Promise<void>}
 */
export async function applyOwnershipUpdates(updates) {
  const real = updates.filter(Boolean);
  if (real.length) await Actor.implementation.updateDocuments(real, { recursive: false, diff: false });
}

/**
 * Apply the document changes of a claim-state transition: batched Actor ownership
 * updates plus the user's character (re)assignment.
 * @param {Array<object|null>} actorUpdates Ownership payloads from {@link buildOwnershipUpdate}.
 * @param {string} userId The affected user's id.
 * @param {string|null} characterId The new linked character id, or null to unlink.
 * @returns {Promise<void>}
 */
export async function applyClaimChanges(actorUpdates, userId, characterId) {
  await applyOwnershipUpdates(actorUpdates);
  await game.users.get(userId)?.update({ character: characterId });
}

/**
 * Read the roster Actor ids a player was granted view (OBSERVER) access on and that
 * are still pending revocation. The durable record behind the GM-side cleanup.
 * @param {User} user The player to inspect.
 * @returns {string[]} The pending Actor ids (a copy is not made — do not mutate).
 */
export function getPendingViews(user) {
  return user.getFlag(MODULE_ID, FLAGS.PENDING_VIEWS) ?? [];
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
 * Count the still-pending view grants that a player should no longer hold: roster
 * Actors flagged on {@link FLAGS.PENDING_VIEWS} that the player has not claimed
 * (i.e. is not OWNER of). Drives the roster panel badge and the directory alert.
 * @param {User} user The player to inspect.
 * @returns {number} How many of the player's pending views are revocable.
 */
export function countRevocableViews(user) {
  if (user.isGM) return 0;
  const { OWNER } = foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS;
  let count = 0;
  for (const actorId of getPendingViews(user)) {
    const actor = game.actors.get(actorId);
    if (!actor || actor.getUserLevel(user) < OWNER) count++;
  }
  return count;
}

/**
 * Reconcile module-granted view permissions strictly from the players' pending-view
 * flags: every flagged Actor a player does not own has the player's ownership entry
 * removed (dropped back to "Default"), then the flag is cleared. Actors the player
 * has claimed (now OWNER) keep their access. `default` (All Players) and ownership
 * the GM set by hand are never touched, because only flagged grants are considered.
 * Only the active GM should call this; it performs batched Actor and User updates.
 * @param {Iterable<User>} [users=game.users] The players to reconcile.
 * @returns {Promise<void>}
 */
export async function reconcilePendingViews(users = game.users) {
  const { OWNER } = foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS;
  const removalsByActor = new Map(); // actorId → Set<userId>
  const userUpdates = [];
  for (const user of users) {
    if (user.isGM) continue;
    const pending = getPendingViews(user);
    if (!pending.length) continue;
    for (const actorId of pending) {
      const actor = game.actors.get(actorId);
      // Keep access only where the player actually owns (claimed) the Actor.
      if (actor && actor.getUserLevel(user) >= OWNER) continue;
      if (!removalsByActor.has(actorId)) removalsByActor.set(actorId, new Set());
      removalsByActor.get(actorId).add(user.id);
    }
    userUpdates.push({ _id: user.id, [`flags.${MODULE_ID}.${FLAGS.PENDING_VIEWS}`]: [] });
  }

  const actorUpdates = [];
  for (const [actorId, userIds] of removalsByActor) {
    const actor = game.actors.get(actorId);
    if (!actor) continue;
    const changes = Object.fromEntries([...userIds].map(id => [id, null]));
    actorUpdates.push(buildOwnershipUpdate(actor, changes));
  }
  await applyOwnershipUpdates(actorUpdates);
  if (userUpdates.length) await User.implementation.updateDocuments(userUpdates);
}
