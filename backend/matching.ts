// ============================================================
// Automatic buddy-matching engine.
//
// MoveBuddy is NOT a marketplace: guests never browse rides and hosts never
// approve passengers. This engine pairs an active guest subscription (one per
// direction) with an active host subscription based on:
//   • Proximity tiers — pickup AND drop within 500m, then 2km, then 5km
//     (tightest tier wins; coords via geocode + haversine, Routes API fallback)
//   • Time similarity — guest leg time vs host leg time (forward/return)
//   • Reliability score — guest & host reliability as a ranking factor
// Within a tier, the highest composite score wins. Pairing is 1:1 per direction
// (a bike seats one pillion).
// ============================================================
import { randomUUID } from "crypto";
import type { Subscription, User, Match, CommuteDirection } from "../src/types";
import { haversineMeters, getDistanceKm, geocode } from "./maps";
import { logger } from "./logger";

export interface MatchableState {
  subscriptions: Subscription[];
  users: User[];
  matches: Match[];
}

const DEFAULT_RADIUS_M = 500; // default when guest hasn't specified a preference
const MAX_RADIUS_M = 5000;    // absolute cap — beyond this, matching won't produce
                                 // meaningful pairs and may cause quality issues.
const TIME_WINDOW_MIN = 30; // max schedule gap to be considered compatible

function timeToMinutes(hhmm?: string): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function reliabilityOf(u?: User): number {
  if (!u) return 50;
  return typeof u.reliabilityScore === "number" ? u.reliabilityScore : (u.buddyScore ?? 50);
}

// Proximity (metres) between two route endpoints. Prefers geocoded coords
// (free haversine); falls back to Routes API driving distance. Tries to
// geocode missing coordinates first to avoid expensive API calls for
// cross-city pairs.
const MAX_REASONABLE_KM = 100;
async function endpointMeters(
  aGeo: { lat: number; lng: number } | undefined, aAddr: string | undefined,
  bGeo: { lat: number; lng: number } | undefined, bAddr: string | undefined
): Promise<number | null> {
  const endpointMetersStart = Date.now();
  if (aGeo && bGeo) {
    const meters = haversineMeters(aGeo, bGeo);
    if (meters > MAX_REASONABLE_KM * 1000) return null;
    const ms = Date.now() - endpointMetersStart;
    if (ms > 2000) {
      console.log("ACT_TIMING: endpointMeters slow", { aAddr, bAddr, ms });
    }
    return meters;
  }
  const aG = aGeo || (aAddr ? await geocode(aAddr) : undefined);
  const bG = bGeo || (bAddr ? await geocode(bAddr) : undefined);
  if (aG && bG) {
    const meters = haversineMeters(aG, bG);
    if (meters > MAX_REASONABLE_KM * 1000) return null;
    const ms = Date.now() - endpointMetersStart;
    if (ms > 2000) {
      console.log("ACT_TIMING: endpointMeters slow", { aAddr, bAddr, ms });
    }
    return meters;
  }
  if (aAddr && bAddr) {
    const getDistanceStart = Date.now();
    const r = await getDistanceKm(aAddr, bAddr);
    const getDistanceMs = Date.now() - getDistanceStart;
    if (getDistanceMs > 2000) {
      console.log("ACT_TIMING: getDistanceKm slow", { aAddr, bAddr, ms: getDistanceMs, source: r.source });
    }
    if (r.source === "google" || r.source === "ors" || r.source === "haversine" || r.source === "estimate") {
      if (r.km > MAX_REASONABLE_KM) return null;
      const ms = Date.now() - endpointMetersStart;
      if (ms > 2000) {
        console.log("ACT_TIMING: endpointMeters slow", { aAddr, bAddr, ms });
      }
      return Math.round(r.km * 1000);
    }
  }
  const ms = Date.now() - endpointMetersStart;
  if (ms > 2000) {
    console.log("ACT_TIMING: endpointMeters slow", { aAddr, bAddr, ms });
  }
  return null;
}

const hostLegTime = (host: Subscription, dir: CommuteDirection) =>
  dir === "forward" ? host.forwardTime : host.returnTime;

const PLACEHOLDER_ADDRESSES = new Set([
  "home", "office", "destination", "source", "work", "house", "current spot", "target office"
]);
function isPlaceholderAddress(address?: string): boolean {
  if (!address) return true;
  const normalized = address.trim().toLowerCase();
  return PLACEHOLDER_ADDRESSES.has(normalized) || normalized.length < 5;
}

// Is this host subscription already paired for the given direction?
function hostBusy(state: MatchableState, hostSubId: string, dir: CommuteDirection): boolean {
  return state.matches.some(
    (m) => m.hostSubscriptionId === hostSubId && m.direction === dir && m.status === "active"
  );
}

export interface Candidate {
  hostSub: Subscription;
  host?: User;
  effectiveRadius: number; // larger of pickupM and dropM (for sorting)
  pickupM: number;
  dropM: number;
  score: number;
}

// Find the best host subscription for a guest subscription, or null.
export async function findBuddyForGuest(
  state: MatchableState,
  guestSub: Subscription
): Promise<Candidate | null> {
  if (guestSub.role !== "guest" || guestSub.status !== "active" || !guestSub.direction) return null;
  const dir = guestSub.direction;
  const guestTime = timeToMinutes(guestSub.departureTime);

  const hostSubs = state.subscriptions.filter(
    (s) => s.role === "host" && s.status === "active" && !hostBusy(state, s.id, dir)
  );

  // Evaluate proximity + time for each host candidate.
  const scored: Candidate[] = [];
  const findBuddyStart = Date.now();
  console.log("ACT_TIMING: findBuddyForGuest start", { guestSubId: guestSub.id, guestUserId: guestSub.userId, hostCandidateCount: hostSubs.length });
  for (const hostSub of hostSubs) {
    const pickupM = await endpointMeters(guestSub.originGeo, guestSub.origin, hostSub.originGeo, hostSub.origin);
    const dropM = await endpointMeters(guestSub.destGeo, guestSub.destination, hostSub.destGeo, hostSub.destination);
    if (pickupM == null || dropM == null) continue;

    // Use the guest's preferred radius, or default if not set.
    const pickupRadius = guestSub.pickupRadiusM ?? guestSub.dropRadiusM ?? DEFAULT_RADIUS_M;
    const dropRadius = guestSub.dropRadiusM ?? guestSub.pickupRadiusM ?? DEFAULT_RADIUS_M;
    if (pickupM > pickupRadius || dropM > dropRadius) continue;

    // Time compatibility (skip if both times known and too far apart).
    const hostTime = timeToMinutes(hostLegTime(hostSub, dir));
    let timeScore = 0.5; // unknown time → neutral
    if (guestTime != null && hostTime != null) {
      const diff = Math.abs(guestTime - hostTime);
      if (diff > TIME_WINDOW_MIN) continue;
      timeScore = 1 - diff / TIME_WINDOW_MIN;
    }

    const host = state.users.find((u) => u.id === hostSub.userId);
    const effectiveRadius = Math.max(pickupM, dropM);
    const maxAllowed = Math.max(pickupRadius, dropRadius);
    const proximityScore = 1 - effectiveRadius / maxAllowed; // closer → higher
    const relScore = (reliabilityOf(host) + reliabilityOf(state.users.find((u) => u.id === guestSub.userId))) / 200;
    const composite = Math.round((0.5 * proximityScore + 0.3 * timeScore + 0.2 * relScore) * 100);

    scored.push({ hostSub, host, effectiveRadius, pickupM, dropM, score: composite });
  }

  if (!scored.length) {
    const findBuddyMs = Date.now() - findBuddyStart;
    console.log("ACT_TIMING: findBuddyForGuest complete", { guestSubId: guestSub.id, guestUserId: guestSub.userId, ms: findBuddyMs, candidateCount: hostSubs.length, resultCount: 0 });
    return null;
  }
  // Closest first (smaller effective radius), then best composite score.
  scored.sort((a, b) => a.effectiveRadius - b.effectiveRadius || b.score - a.score);
  const findBuddyMs = Date.now() - findBuddyStart;
  console.log("ACT_TIMING: findBuddyForGuest complete", { guestSubId: guestSub.id, guestUserId: guestSub.userId, ms: findBuddyMs, candidateCount: hostSubs.length, resultCount: scored.length });
  if (findBuddyMs > 2000) {
    console.log("ACT_TIMING: findBuddyForGuest slow", { guestSubId: guestSub.id, guestUserId: guestSub.userId, ms: findBuddyMs, candidateCount: hostSubs.length });
  }
  return scored[0];
}

// Create and persist (in-memory) a match for a guest subscription. Returns the
// Match, or null if no buddy is available. Caller is responsible for saveDB().
//
// IMPORTANT: this function is called from concurrent paths (payment verification,
// the 3‑minute sweep, admin reassign). The first guard (guestSub.matchId) is
// checked synchronously before the async findBuddyForGuest call.  Between the
// async yield and match creation another concurrent call may have already matched
// this subscription, so we MUST re-check guestSub.matchId and hostBusy() after
// the async work completes.
export async function tryMatchGuestSub(
  state: MatchableState,
  guestSub: Subscription
): Promise<Match | null> {
  if (guestSub.matchId) return null; // already matched (fast path)
  const tryMatchStart = Date.now();
  console.log("ACT_TIMING: tryMatchGuestSub start", { guestSubId: guestSub.id, guestUserId: guestSub.userId });
  const cand = await findBuddyForGuest(state, guestSub);
  const tryMatchMs = Date.now() - tryMatchStart;
  console.log("ACT_TIMING: tryMatchGuestSub complete", { guestSubId: guestSub.id, guestUserId: guestSub.userId, ms: tryMatchMs, matched: !!cand });
  if (tryMatchMs > 2000) {
    console.log("ACT_TIMING: tryMatchGuestSub slow", { guestSubId: guestSub.id, guestUserId: guestSub.userId, ms: tryMatchMs });
  }
  if (!cand) return null;
  // ── Idempotency guard: re-check after async yield ──────────────
  // A concurrent call may have matched this subscription while we were
  // awaiting findBuddyForGuest.
  if (guestSub.matchId) return null;
  // Also guard against the same host subscription being double‑matched
  // (another concurrent call may have matched this host since our snapshot).
  if (hostBusy(state, cand.hostSub.id, guestSub.direction!)) return null;

  const guest = state.users.find((u) => u.id === guestSub.userId);
  const host = cand.host;
  const match: Match = {
    id: "match_" + randomUUID().replace(/-/g, "").substring(0, 8),
    guestId: guestSub.userId,
    guestName: guest?.name || "Guest",
    hostId: cand.hostSub.userId,
    hostName: host?.name || "Host",
    guestSubscriptionId: guestSub.id,
    hostSubscriptionId: cand.hostSub.id,
    direction: guestSub.direction!,
    status: "active",
    proximityTierM: cand.effectiveRadius,
    score: cand.score,
    pickupDistanceM: cand.pickupM,
    dropDistanceM: cand.dropM,
    createdAt: new Date().toISOString(),
  };
  state.matches.push(match);
  guestSub.matchId = match.id;
  return match;
}

// Sweep all unmatched active guest subscriptions and match what we can.
export async function runMatchSweep(state: MatchableState): Promise<Match[]> {
  const created: Match[] = [];
  const pending = state.subscriptions.filter(
    (s) => s.role === "guest" && s.status === "active" && !s.matchId && s.direction
  );
  for (const guestSub of pending) {
    const m = await tryMatchGuestSub(state, guestSub);
    if (m) created.push(m);
  }
  return created;
}
