import { MODULE_ID, SETTINGS, FLAGS } from "./constants.js";
import { getRoster, getClaimantUser, rerenderModuleApps, applyClaimChanges, buildOwnershipUpdate, applyOwnershipUpdates, getPendingViews } from "./helpers.js";

const SOCKET_NAME = `module.${MODULE_ID}`;

/** Discriminators for the fire-and-forget socket payloads exchanged by the module. */
const MESSAGE_TYPES = {
  JOIN: "join",
  SELECT: "select",
  CLAIMED: "claimed",
  OPEN: "open"
};

/**
 * Live, unconfirmed hero interest across connected clients: userId -> actorId.
 * Purely ephemeral — confirmed claims are derived from `User#character` instead.
 * @type {Map<string, string>}
 */
export const interest = new Map();

/** Callback invoked when a GM remotely requests this client to open the selection screen. */
let onOpenRequest = null;

/**
 * Start listening on the module socket. Called once from the `ready` hook.
 * @param {object} callbacks
 * @param {Function} callbacks.onOpenRequest Invoked when a GM forces this client's selection screen open.
 * @returns {void}
 */
export function initSocket(callbacks) {
  onOpenRequest = callbacks.onOpenRequest;
  game.socket.on(SOCKET_NAME, onSocketMessage);
}

/**
 * Dispatch an incoming module socket payload.
 * `game.socket.emit` never echoes back to the sender, so local state is always
 * updated by the broadcast helpers below before emitting.
 * @param {object} payload The raw socket payload.
 * @returns {void}
 */
function onSocketMessage(payload) {
  switch (payload?.type) {
    case MESSAGE_TYPES.SELECT:
      if (payload.actorId) interest.set(payload.userId, payload.actorId);
      else interest.delete(payload.userId);
      rerenderModuleApps();
      break;
    case MESSAGE_TYPES.JOIN: {
      // Re-announce our own pending selection so the newcomer rebuilds the shared state.
      const mine = interest.get(game.user.id);
      if (mine) emit({ type: MESSAGE_TYPES.SELECT, userId: game.user.id, actorId: mine });
      break;
    }
    case MESSAGE_TYPES.CLAIMED:
      forgetActorInterest(payload.actorId);
      rerenderModuleApps();
      break;
    case MESSAGE_TYPES.OPEN:
      if (!game.user.isGM && payload.userIds?.includes(game.user.id)) onOpenRequest?.();
      break;
  }
}

/**
 * Emit a payload on the module socket channel.
 * @param {object} payload The payload to broadcast to all other clients.
 * @returns {void}
 */
function emit(payload) {
  game.socket.emit(SOCKET_NAME, payload);
}

/**
 * Drop every pending interest entry pointing at an Actor (used once it has been claimed).
 * @param {string} actorId The claimed Actor id.
 * @returns {void}
 */
function forgetActorInterest(actorId) {
  for (const [userId, target] of interest.entries()) {
    if (target === actorId) interest.delete(userId);
  }
}

/**
 * Broadcast this user's pending hero selection (or its withdrawal).
 * @param {string|null} actorId The selected Actor id, or null to clear the selection.
 * @returns {void}
 */
export function broadcastSelection(actorId) {
  if (actorId) interest.set(game.user.id, actorId);
  else interest.delete(game.user.id);
  emit({ type: MESSAGE_TYPES.SELECT, userId: game.user.id, actorId: actorId ?? null });
  rerenderModuleApps();
}

/**
 * Announce this client's arrival so peers re-broadcast their pending selections.
 * @returns {void}
 */
export function broadcastJoin() {
  emit({ type: MESSAGE_TYPES.JOIN, userId: game.user.id });
}

/**
 * Announce a confirmed claim so peers immediately clear stale interest on that hero.
 * @param {string} actorId The Actor that was just claimed.
 * @returns {void}
 */
export function broadcastClaimed(actorId) {
  forgetActorInterest(actorId);
  emit({ type: MESSAGE_TYPES.CLAIMED, userId: game.user.id, actorId });
  rerenderModuleApps();
}

/**
 * Ask specific player clients to open the hero selection screen (GM action).
 * @param {string[]} userIds Ids of the users that must open the screen.
 * @returns {void}
 */
export function broadcastOpen(userIds) {
  emit({ type: MESSAGE_TYPES.OPEN, userIds });
}

/**
 * Forget a disconnected user's pending interest. Called from the `userConnected` hook.
 * @param {string} userId The disconnected user's id.
 * @returns {void}
 */
export function clearUserInterest(userId) {
  if (interest.delete(userId)) rerenderModuleApps();
}

/**
 * Serializes ownership writes on the GM client so two simultaneous operations
 * (claims and view grants) can never interleave and corrupt an Actor's ownership.
 * @type {Promise<unknown>}
 */
let opQueue = Promise.resolve();

/**
 * Chain an operation onto the GM-side ownership queue.
 * @param {() => Promise<unknown>} run The operation to serialize.
 * @returns {Promise<unknown>} The operation's settled result.
 */
function enqueue(run) {
  opQueue = opQueue.then(run, run);
  return opQueue;
}

/**
 * Register the promise-based queries executed on the active GM's client. Players
 * cannot modify Actor ownership themselves, so both confirming a claim and being
 * granted view access are delegated here. Registered during the `init` hook on
 * every client; only the queried GM runs them.
 * @returns {void}
 */
export function registerQueries() {
  CONFIG.queries[`${MODULE_ID}.claim`] = data => enqueue(() => handleClaim(data));
  CONFIG.queries[`${MODULE_ID}.release`] = data => enqueue(() => handleRelease(data));
  CONFIG.queries[`${MODULE_ID}.grantView`] = data => enqueue(() => handleGrantView(data));
}

/**
 * Validate and execute a claim: grant the player ownership of the Actor and link
 * it as their character.
 * @param {object} data
 * @param {string} data.userId The claiming user's id.
 * @param {string} data.actorId The claimed Actor's id.
 * @returns {Promise<{ok: boolean, reason?: string}>} The claim outcome for the querying client.
 */
async function handleClaim({ userId, actorId }) {
  const user = game.users.get(userId);
  const actor = game.actors.get(actorId);
  if (!user || !actor || !getRoster().some(e => e.actorId === actorId)) {
    return { ok: false, reason: "missing" };
  }
  if (getClaimantUser(actorId)) return { ok: false, reason: "taken" };
  if (user.character) return { ok: false, reason: "alreadyHas" };
  await applyClaimChanges(
    [buildOwnershipUpdate(actor, { [userId]: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER })],
    userId,
    actorId
  );
  // The claimed hero is now owned, so drop it from the player's pending-view list;
  // any other heroes they merely previewed stay flagged for later reconcile.
  await user.setFlag(MODULE_ID, FLAGS.PENDING_VIEWS, getPendingViews(user).filter(id => id !== actorId));
  return { ok: true };
}

/**
 * Release a player's own claimed hero from the selection screen: revoke their
 * ownership (back to "Default") and unlink the character, returning the hero to the
 * pool so it — or any other — can be claimed again. The GM-side mirror of the player
 * "Release" button, since players cannot rewrite Actor ownership themselves. Only the
 * hero the player currently has linked may be released, so a stale request is a no-op.
 * Runs only on the active GM via the `release` query.
 * @param {object} data
 * @param {string} data.userId The releasing user's id.
 * @param {string} data.actorId The Actor the player is releasing.
 * @returns {Promise<{ok: boolean, reason?: string}>} The release outcome for the querying client.
 */
async function handleRelease({ userId, actorId }) {
  const user = game.users.get(userId);
  const actor = game.actors.get(actorId);
  // Guard against releasing a hero the requester no longer holds (the screen may be
  // stale): only the player's currently-linked character is eligible.
  if (!user || !actor || user.character?.id !== actorId) return { ok: false, reason: "missing" };
  await applyClaimChanges(
    [buildOwnershipUpdate(actor, { [userId]: null })],
    userId,
    null
  );
  return { ok: true };
}

/**
 * Grant the requesting player OBSERVER access to a roster Actor so they can open its
 * sheet from the selection screen, recording the grant on the player's pending-view
 * flag first so it can always be reconciled away later (even after a disconnect).
 * Runs only on the active GM via the `grantView` query.
 * @param {object} data
 * @param {string} data.userId The requesting user's id.
 * @param {string} data.actorId The roster Actor's id.
 * @returns {Promise<{ok: boolean, reason?: string}>} The grant outcome for the querying client.
 */
async function handleGrantView({ userId, actorId }) {
  const user = game.users.get(userId);
  const actor = game.actors.get(actorId);
  if (!user || !actor || !getRoster().some(e => e.actorId === actorId)) {
    return { ok: false, reason: "missing" };
  }
  if (!game.settings.get(MODULE_ID, SETTINGS.SHEET_ACCESS)) return { ok: false, reason: "failed" };
  // Flag the pending view before touching permissions, so the cleanup record exists
  // even if the ownership write below never lands.
  const pending = getPendingViews(user);
  if (!pending.includes(actorId)) {
    await user.setFlag(MODULE_ID, FLAGS.PENDING_VIEWS, [...pending, actorId]);
  }
  const { OBSERVER } = foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS;
  if (actor.getUserLevel(user) < OBSERVER) {
    await applyOwnershipUpdates([buildOwnershipUpdate(actor, { [userId]: OBSERVER })]);
  }
  return { ok: true };
}
