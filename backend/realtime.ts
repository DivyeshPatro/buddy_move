import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "./auth";
import { recordPing, type TripsState } from "./trips";
import { logger } from "./logger";
import type {
  GeoPoint,
  Trip,
  SocketTripJoinPayload,
  SocketTripJoinAck,
  SocketTripJoinError,
  SocketTripLeavePayload,
  SocketTripPingPayload,
  SocketTripPingBroadcast,
  SocketTripHeartbeatPayload,
  SocketTripErrorEvent,
} from "../src/types";

interface AuthedSocket extends Socket {
  data: { userId: string };
}

export interface RealtimeDeps {
  getState: () => TripsState & { trips: Trip[] };
  saveDB: () => void;
}

let io: SocketIOServer | null = null;

// Per-user-per-trip ping throttle: { `${userId}:${tripId}` → timestamp }
const lastPingMs = new Map<string, number>();
const PING_THROTTLE_MS = 2000;

// Throttled save: only persist every 30s max
let lastSaveMs = 0;
const SAVE_INTERVAL_MS = 30000;

function throttleSave(deps: RealtimeDeps) {
  const now = Date.now();
  if (now - lastSaveMs > SAVE_INTERVAL_MS) {
    lastSaveMs = now;
    deps.saveDB();
  }
}

export function initRealtime(httpServer: HttpServer, deps: RealtimeDeps): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth as any)?.token ||
      (socket.handshake.query as any)?.token ||
      "";
    const payload = token ? verifyAccessToken(String(token)) : null;
    if (!payload) return next(new Error("Unauthorized"));
    (socket as AuthedSocket).data.userId = payload.sub;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const s = socket as AuthedSocket;
    const userId = s.data.userId;

    s.on("trip:join", (payload: SocketTripJoinPayload, ack?: (res: SocketTripJoinAck | SocketTripJoinError) => void) => {
      const { tripId } = payload || ({} as any);
      if (!tripId) {
        if (ack) ack({ error: "tripId required" });
        return;
      }
      const state = deps.getState();
      const trip = state.trips.find((t) => t.id === tripId);
      if (!trip) {
        if (ack) ack({ error: "Trip not found" });
        return;
      }
      if (trip.hostId !== userId && trip.guestId !== userId) {
        if (ack) ack({ error: "Forbidden: not your trip" });
        return;
      }
      s.join(`trip:${tripId}`);
      if (ack) {
        ack({
          success: true,
          tripId,
          hostLastPing: trip.hostLastPing || null,
          guestLastPing: trip.guestLastPing || null,
          status: trip.status,
        });
      }
    });

    s.on("trip:leave", (payload: SocketTripLeavePayload) => {
      const { tripId } = payload || ({} as any);
      if (!tripId) return;
      s.leave(`trip:${tripId}`);
    });

    // ── Position ping with per-user rate limiting ──────────────────
    s.on("trip:ping", (payload: SocketTripPingPayload) => {
      const { tripId, geo } = payload || ({} as any);
      if (!tripId || !geo || typeof geo.lat !== "number" || typeof geo.lng !== "number") return;

      // Rate limit: ignore if same user+trip pinged within throttle window
      const key = `${userId}:${tripId}`;
      const now = Date.now();
      const last = lastPingMs.get(key) || 0;
      if (now - last < PING_THROTTLE_MS) return;
      lastPingMs.set(key, now);

      const state = deps.getState();
      const trip = recordPing(state, tripId, userId, geo);
      if (!trip) return;

      const role = trip.hostId === userId ? "host" : "guest";
      const broadcast: SocketTripPingBroadcast = { tripId, role, geo, at: new Date().toISOString() };
      s.to(`trip:${tripId}`).emit("trip:ping", broadcast);

      throttleSave(deps);
    });

    // ── Heartbeat from clients (logged for monitoring) ─────────────
    s.on("trip:heartbeat", (payload: SocketTripHeartbeatPayload) => {
      if (!payload?.tripId) return;
      const { status, lastPingAge } = payload;
      if (status === "gps_failed" || status === "offline") {
        logger.warn({ tripId: payload.tripId, userId, status, lastPingAge }, "[realtime] heartbeat");
      }
    });

    s.on("disconnect", () => {
      // Clean up throttle entries for this user
      for (const key of lastPingMs.keys()) {
        if (key.startsWith(`${userId}:`)) lastPingMs.delete(key);
      }
    });
  });

  return io;
}

export function emitTripUpdate(trip: Trip) {
  if (!io) return;
  io.to(`trip:${trip.id}`).emit("trip:update", trip);
}

export function getIO(): SocketIOServer | null {
  return io;
}
