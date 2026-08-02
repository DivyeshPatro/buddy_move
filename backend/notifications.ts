// ============================================================
// User notification feed.
//
// The feed is stored in the shared `db` state (so it persists via the db layer
// and survives restarts) and is delivered to the frontend bell icon through the
// /api/notifications endpoints. The server injects the backing array + a save
// hook once at startup via configureNotifications().
//
// Notification kinds the UI knows how to render:
//   buddy_found · ride · verification · subscription · wallet · promo ·
//   announcement · system
// ============================================================
import { randomUUID } from "crypto";
import type { Match } from "../src/types";
import { logger } from "./logger";

export type NotificationType =
  | "buddy_found"
  | "ride"
  | "verification"
  | "subscription"
  | "wallet"
  | "promo"
  | "voucher"
  | "announcement"
  | "system";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  // Optional structured payload (e.g. promoCode, amount, matchId) for deep links.
  meta?: Record<string, any>;
}

const PER_USER_CAP = 50; // keep each user's feed bounded

// Injected at startup so the feed lives in the persisted db state.
let store: AppNotification[] | null = null;
let onChange: (() => void) | null = null;

/** Wire the feed to the persisted db array + a save callback. Call once after
 *  the db state is loaded. */
export function configureNotifications(backing: AppNotification[], save: () => void) {
  store = backing;
  onChange = save;
}

function newId() {
  return "ntf_" + randomUUID().replace(/-/g, "").substring(0, 8);
}

// Append a notification for one user (newest-first) and persist.
function push(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  meta?: Record<string, any>
): AppNotification | null {
  if (!store) return null; // not configured yet (shouldn't happen post-startup)
  const n: AppNotification = {
    id: newId(),
    userId,
    title,
    body,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  store.unshift(n);

  // Trim this user's oldest entries beyond the cap (keeps the array bounded
  // without scanning the whole feed on every push).
  let count = 0;
  for (let i = 0; i < store.length; i++) {
    if (store[i].userId === userId && ++count > PER_USER_CAP) {
      store.splice(i, 1);
      i--;
    }
  }

  logger.info({ userId, type, title }, "[notify] push");
  onChange?.();
  return n;
}

// ── Public emitters ───────────────────────────────────────────────────────────

/** Both sides of a new buddy pairing. */
export function notifyBuddyFound(match: Match) {
  const dirLabel = match.direction === "forward" ? "Home → Destination" : "Destination → Home";
  push(match.guestId, "Your buddy ride partner has been found", `You're matched with ${match.hostName} for your ${dirLabel} commute.`, "buddy_found", { matchId: match.id });
  push(match.hostId, "Your buddy ride partner has been found", `You're matched with ${match.guestName} for the ${dirLabel} commute.`, "buddy_found", { matchId: match.id });
}

/** Generic notification to a single user. */
export function notifyUser(
  userId: string,
  title: string,
  body: string,
  type: NotificationType = "system",
  meta?: Record<string, any>
) {
  return push(userId, title, body, type, meta);
}

/** Fan a notification out to many users (broadcasts, promos, announcements). */
export function notifyMany(
  userIds: string[],
  title: string,
  body: string,
  type: NotificationType = "announcement",
  meta?: Record<string, any>
): number {
  let sent = 0;
  for (const id of userIds) {
    if (push(id, title, body, type, meta)) sent++;
  }
  return sent;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function getNotifications(userId: string): AppNotification[] {
  if (!store) return [];
  return store.filter((n) => n.userId === userId);
}

export function unreadCount(userId: string): number {
  if (!store) return 0;
  return store.reduce((acc, n) => acc + (n.userId === userId && !n.read ? 1 : 0), 0);
}

/** Mark some (or, if ids omitted, all) of a user's notifications as read.
 *  Returns the number of notifications actually flipped to read. */
export function markRead(userId: string, ids?: string[]): number {
  if (!store) return 0;
  const idSet = ids && ids.length ? new Set(ids) : null;
  let changed = 0;
  for (const n of store) {
    if (n.userId !== userId || n.read) continue;
    if (idSet && !idSet.has(n.id)) continue;
    n.read = true;
    changed++;
  }
  if (changed) onChange?.();
  return changed;
}
