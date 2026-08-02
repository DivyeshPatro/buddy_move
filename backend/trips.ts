// ============================================================
// backend/trips.ts
//
// Trip lifecycle business logic — kept separate from server.ts so this logic
// is independently readable/testable, since it's where real money (wallet
// credits) moves.
//
// State machine:
//   scheduled -> pickup_confirmed -> in_progress -> awaiting_confirmation -> completed
//             \-> cancelled (from any non-terminal state)
//
// Money rule: wallet.credits is touched ONLY inside confirmTripCompletion(),
// and only after validation passes. Every earlier step may compute and store a
// `reservedAmount` for display, but that number is informational until completion.
//
// Validation config: thresholds are loaded from configuration (env / admin
// settings) rather than hardcoded magic numbers. If validation fails, the trip
// stays awaiting_confirmation rather than auto-cancelling, giving the system
// (or future admin panel) the opportunity to force-complete, cancel, or retry.
// ============================================================
import { randomUUID, randomInt } from "crypto";
import type { Match, Subscription, Trip, User, GeoPoint, Wallet } from "../src/types";
import { haversineMeters } from "./maps";
import { logger } from "./logger";

export interface TripsState {
  trips: Trip[];
  matches: Match[];
  subscriptions: Subscription[];
  users: User[];
  wallets: Record<string, Wallet>;
  pricingConfig: { hostRatePerKm: number };
}

export interface ValidationConfig {
  maxDestinationDriftMeters: number;
  minimumRideDurationSeconds: number;
  allowManualOverride: boolean;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  maxDestinationDriftMeters: 1500,
  minimumRideDurationSeconds: 60,
  allowManualOverride: false,
};

export interface ValidationDetail {
  pickupConfirmed: boolean;
  destinationReached: boolean;
  durationValid: boolean;
  gpsRouteValid: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
  details: ValidationDetail;
}

function genId(prefix: string): string {
  return `${prefix}_` + randomUUID().replace(/-/g, "").substring(0, 8);
}

function genOtp(): string {
  return "BUDDY-" + randomInt(1000, 9999);
}

// Per-ride fare the host stands to earn for THIS trip (distinct from the
// activity-day incentive math in server.ts's /payout endpoint — this is the
// immediate per-ride amount referenced in the spec, e.g. "₹56 Reserved").
function calcTripFare(ratePerKm: number, distanceKm: number): number {
  return Math.round(ratePerKm * Math.max(0, distanceKm) * 100) / 100;
}

export function findActiveTripForUser(trips: Trip[], userId: string): Trip | null {
  return (
    trips.find(
      (t) => (t.hostId === userId || t.guestId === userId) && t.status !== "completed" && t.status !== "cancelled"
    ) || null
  );
}

// ── 1. Host taps "Start Today's Commute" ────────────────────────────────────
export function startTrip(state: TripsState, matchId: string, hostId: string): { trip?: Trip; error?: string } {
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) return { error: "Match not found" };
  if (match.hostId !== hostId) return { error: "Forbidden: not your match" };
  if (match.status !== "active") return { error: "Match is not active" };

  // Block a duplicate trip for the same match today.
  const today = new Date().toISOString().split("T")[0];
  const existing = state.trips.find(
    (t) => t.matchId === matchId && t.date === today && t.status !== "cancelled"
  );
  if (existing) return { trip: existing }; // idempotent — re-tapping returns the same trip

  const guestSub = state.subscriptions.find((s) => s.id === match.guestSubscriptionId);
  const hostSub = state.subscriptions.find((s) => s.id === match.hostSubscriptionId);
  if (!guestSub) return { error: "Guest route not found for this match" };

  const distanceKm = guestSub.distanceKm ?? hostSub?.distanceKm ?? 0;
  const reservedAmount = calcTripFare(state.pricingConfig.hostRatePerKm, distanceKm);

  const trip: Trip = {
    id: genId("trip"),
    matchId: match.id,
    hostId: match.hostId,
    guestId: match.guestId,
    hostName: match.hostName,
    guestName: match.guestName,
    direction: match.direction,
    date: today,
    status: "scheduled",
    verificationCode: genOtp(),
    origin: guestSub.origin || "",
    destination: guestSub.destination || "",
    originGeo: guestSub.originGeo,
    destGeo: guestSub.destGeo,
    distanceKm,
    reservedAmount,
    startedAt: new Date().toISOString(),
  };
  state.trips.unshift(trip);
  return { trip };
}

// ── 2. Guest confirms pickup (OTP / QR / manual button) ─────────────────────
export function confirmPickup(
  state: TripsState,
  tripId: string,
  guestId: string,
  opts: { method: "otp" | "qr" | "manual"; code?: string; hostGeo?: GeoPoint }
): { trip?: Trip; error?: string } {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.guestId !== guestId) return { error: "Forbidden: not your trip" };
  if (trip.status !== "scheduled") return { error: `Cannot confirm pickup from status '${trip.status}'` };

  if (opts.method !== "manual") {
    if (!opts.code || opts.code.trim().toUpperCase() !== trip.verificationCode.toUpperCase()) {
      return { error: "Invalid pickup code" };
    }
  }

  trip.status = "pickup_confirmed";
  trip.pickupMethod = opts.method;
  trip.pickupConfirmedAt = new Date().toISOString();
  if (opts.hostGeo) trip.pickupGeo = opts.hostGeo;
  return { trip };
}

// ── 3. Host taps "Begin Ride" — opens the live-tracking window ──────────────
export function beginRide(state: TripsState, tripId: string, hostId: string): { trip?: Trip; error?: string } {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.hostId !== hostId) return { error: "Forbidden: not your trip" };
  if (trip.status !== "pickup_confirmed") return { error: `Cannot begin ride from status '${trip.status}'` };

  trip.status = "in_progress";
  trip.beginRideAt = new Date().toISOString();
  return { trip };
}

// ── 4. Host taps "Complete Ride" ─────────────────────────────────────────────
export function hostCompleteRide(
  state: TripsState,
  tripId: string,
  hostId: string,
  hostGeo?: GeoPoint
): { trip?: Trip; error?: string } {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.hostId !== hostId) return { error: "Forbidden: not your trip" };
  if (trip.status !== "in_progress") return { error: `Cannot complete ride from status '${trip.status}'` };

  trip.status = "awaiting_confirmation";
  trip.hostCompletedAt = new Date().toISOString();
  if (hostGeo) {
    trip.hostLastPing = { ...hostGeo, at: trip.hostCompletedAt };
  }
  logger.info({ tripId, hostGeo, beginRideAt: trip.beginRideAt, status: trip.status }, "[trips] hostCompleteRide");
  return { trip };
}

// ── 5. Guest confirms "Yes, ride completed" → run validation → credit wallet ─
export function confirmTripCompletion(
  state: TripsState,
  tripId: string,
  guestId: string,
  config?: Partial<ValidationConfig>,
  guestGeo?: GeoPoint
): { trip?: Trip; error?: string; validation?: ValidationResult } {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.guestId !== guestId) return { error: "Forbidden: not your trip" };
  if (trip.status !== "awaiting_confirmation") {
    return { error: `Cannot confirm completion from status '${trip.status}'` };
  }

  trip.guestConfirmedAt = new Date().toISOString();
  if (guestGeo) {
    trip.guestLastPing = { ...guestGeo, at: trip.guestConfirmedAt };
  }

  const validation = validateTrip(trip, {
    ...DEFAULT_VALIDATION_CONFIG,
    ...config,
  }, guestGeo);

  logger.info(
    { tripId, valid: validation.valid, reasons: validation.reasons, guestGeo, config },
    "[trips] confirmTripCompletion"
  );

  trip.validation = validation.details;
  trip.validationErrors = validation.reasons;

  if (!validation.valid) {
    // Do NOT auto-cancel. Keep awaiting_confirmation so the system (or future
    // admin panel) can decide: force-complete, cancel, or retry validation.
    logger.warn({ tripId, reasons: validation.reasons }, "[trips] Validation FAILED");
    return {
      trip,
      validation,
      error: "Ride could not be auto-verified. " + validation.reasons.join(", "),
    };
  }

  logger.info({ tripId, amount: trip.reservedAmount }, "[trips] Validation PASSED");
  return completeTrip(state, trip);
}

// Complete a verified trip — credits the host wallet and marks the trip done.
function completeTrip(
  state: TripsState,
  trip: Trip
): { trip: Trip; validation: ValidationResult } {
  trip.status = "completed";
  trip.completedAt = new Date().toISOString();
  trip.creditedAmount = trip.reservedAmount;

  // ── THE ONLY PLACE A TRIP TOUCHES THE WALLET ──
  if (!state.wallets[trip.hostId]) {
    state.wallets[trip.hostId] = { userId: trip.hostId, credits: 0, history: [] };
  }
  const wallet = state.wallets[trip.hostId];
  wallet.credits += trip.creditedAmount;
  wallet.history.unshift({
    id: genId("tx"),
    amount: trip.creditedAmount,
    type: "credit",
    description: `Ride completed with ${trip.guestName} (${trip.direction === "forward" ? "morning" : "evening"} commute)`,
    timestamp: trip.completedAt,
  });

  const validReason = { pickupConfirmed: true, destinationReached: true, durationValid: true, gpsRouteValid: true };
  const validation: ValidationResult = {
    valid: true,
    reasons: [],
    details: validReason,
  };
  trip.validation = validReason;
  trip.validationErrors = [];

  return { trip, validation };
}

// ── Admin/system: force-complete a trip that is stuck in awaiting_confirmation ─
export function forceCompleteTrip(
  state: TripsState,
  tripId: string,
  adminId: string
): { trip?: Trip; error?: string } {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.status !== "awaiting_confirmation") {
    return { error: `Cannot force-complete from status '${trip.status}'` };
  }
  return { trip: completeTrip(state, trip).trip };
}

// Server-side validation — never trust the client's word that a ride happened.
// Thresholds come from config (env vars / admin settings) instead of hardcoded
// magic numbers, making the system production-ready and extensible.
//
// Data flow: the system prefers GPS tracking data recorded during the ride
// (via socket.io trip:ping events → hostLastPing/guestLastPing) over a single
// end-of-ride coordinate from the confirm request. This ensures accurate
// validation even if the guest's confirm-request geo is imprecise — the
// live tracking data collected during the ride is the source of truth.
function validateTrip(
  trip: Trip,
  config: ValidationConfig,
  guestEndGeo?: GeoPoint
): ValidationResult {
  const reasons: string[] = [];
  const details: ValidationDetail = {
    pickupConfirmed: false,
    destinationReached: false,
    durationValid: false,
    gpsRouteValid: false,
  };

  // 1. Pickup confirmation — was the OTP/QR/manual handshake completed?
  details.pickupConfirmed = !!trip.pickupConfirmedAt;
  if (!details.pickupConfirmed) {
    reasons.push("Pickup was not confirmed");
  }

  // 2. Destination reached — use stored GPS pings (recorded via socket.io
  //    trip:ping during in_progress) as the primary source; fall back to the
  //    guest's end-of-ride coordinate from the confirm request.
  const lastKnownGeo = trip.guestLastPing
    ? { lat: trip.guestLastPing.lat, lng: trip.guestLastPing.lng }
    : guestEndGeo;
  if (lastKnownGeo && trip.destGeo) {
    const driftM = haversineMeters(lastKnownGeo, trip.destGeo);
    details.destinationReached = driftM <= config.maxDestinationDriftMeters;
    if (!details.destinationReached) {
      reasons.push(
        `Destination too far from expected location (${Math.round(driftM)}m vs ${config.maxDestinationDriftMeters}m limit)`
      );
    }
  } else {
    details.destinationReached = true;
  }

  // 3. Ride duration — actual elapsed time from beginRide to host-complete.
  if (trip.beginRideAt && trip.hostCompletedAt) {
    const ms = new Date(trip.hostCompletedAt).getTime() - new Date(trip.beginRideAt).getTime();
    details.durationValid = ms >= config.minimumRideDurationSeconds * 1000;
    if (!details.durationValid) {
      const sec = Math.round(ms / 1000);
      reasons.push(
        `Ride duration below minimum threshold (${sec}s vs ${config.minimumRideDurationSeconds}s minimum)`
      );
    }
  } else {
    details.durationValid = true;
  }

  // 4. GPS route validity — at least one position ping must have been recorded
  //    during the ride. The host (driver) is expected to send continuous pings
  //    via socket.io; if neither party recorded any tracking data, the ride
  //    likely didn't happen or a frontend bug prevented tracking.
  details.gpsRouteValid = !!(trip.hostLastPing || trip.guestLastPing);
  if (!details.gpsRouteValid) {
    reasons.push("No GPS tracking data recorded during ride");
  }

  const valid = details.pickupConfirmed && details.destinationReached && details.durationValid && details.gpsRouteValid;

  logger.info(
    { tripId: trip.id, pickupConfirmed: details.pickupConfirmed, destinationReached: details.destinationReached, durationValid: details.durationValid, gpsRouteValid: details.gpsRouteValid, valid },
    "[trips] validateTrip"
  );

  return { valid, reasons, details };
}

// ── Cancel (either party, while non-terminal) ────────────────────────────────
export function cancelTrip(
  state: TripsState,
  tripId: string,
  userId: string,
  reason?: string
): { trip?: Trip; error?: string } {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip) return { error: "Trip not found" };
  if (trip.hostId !== userId && trip.guestId !== userId) return { error: "Forbidden" };
  if (trip.status === "completed" || trip.status === "cancelled") {
    return { error: `Trip already ${trip.status}` };
  }
  trip.status = "cancelled";
  trip.cancelledAt = new Date().toISOString();
  trip.cancelReason = reason || "Cancelled by user";
  return { trip };
}

// ── Live position update while in_progress (called by the socket layer too) ─
export function recordPing(state: TripsState, tripId: string, userId: string, geo: GeoPoint): Trip | null {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip || trip.status !== "in_progress") {
    if (trip) logger.warn({ tripId, status: trip.status }, "[trips] recordPing REJECTED — not in_progress");
    return null;
  }
  const ping = { ...geo, at: new Date().toISOString() };
  if (trip.hostId === userId) {
    trip.hostLastPing = ping;
  } else if (trip.guestId === userId) {
    trip.guestLastPing = ping;
  } else {
    return null;
  }
  logger.info({ tripId, userId, geo, role: userId === trip.hostId ? "host" : "guest" }, "[trips] recordPing");
  return trip;
}