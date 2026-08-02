import { useState, useEffect, useCallback, useRef } from "react";
import type { Trip, GeoPoint, SocketTripJoinPayload, SocketTripLeavePayload, SocketTripJoinAck, SocketTripJoinError } from "../types";
import { connectSocket } from "../lib/socket";

interface ActiveTripResult {
  activeTrip: Trip | null;
  loading: boolean;
  error: string;
  startTrip: (matchId: string) => Promise<Trip | null>;
  confirmPickup: (tripId: string, opts: { method: "otp" | "qr" | "manual"; code?: string }) => Promise<Trip | null>;
  beginRide: (tripId: string) => Promise<Trip | null>;
  hostCompleteRide: (tripId: string, hostGeo?: GeoPoint) => Promise<Trip | null>;
  guestConfirmTrip: (tripId: string, guestGeo?: GeoPoint) => Promise<Trip | null>;
  cancelTrip: (tripId: string, reason?: string) => Promise<Trip | null>;
  loadActiveTrip: () => Promise<void>;
}

export function useTrip(userId: string | undefined): ActiveTripResult {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const joinedRoomRef = useRef<string | null>(null);

  const loadActiveTrip = useCallback(async () => {
    if (!userId) { setActiveTrip(null); setLoading(false); return; }
    try {
      const res = await fetch(`/api/trips/active/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveTrip(data.trip ?? null);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadActiveTrip(); }, [loadActiveTrip]);

  // Socket room management
  useEffect(() => {
    if (!activeTrip?.id) {
      joinedRoomRef.current = null;
      return;
    }
    const roomId = activeTrip.id;
    const room = `trip:${roomId}`;
    if (joinedRoomRef.current === room) return;
    joinedRoomRef.current = room;

    const socket = connectSocket();
    if (!socket.connected) socket.connect();

    const joinPayload: SocketTripJoinPayload = { tripId: roomId };
    socket.emit("trip:join", joinPayload, (res: SocketTripJoinAck | SocketTripJoinError) => {
      if ("error" in res) {
        setError(res.error);
        joinedRoomRef.current = null;
      }
    });

    const onUpdate = (updated: Trip) => {
      if (updated.id === roomId) {
        setError("");
        setActiveTrip(updated);
      }
    };
    socket.on("trip:update", onUpdate);

    return () => {
      socket.off("trip:update", onUpdate);
      const leavePayload: SocketTripLeavePayload = { tripId: roomId };
      socket.emit("trip:leave", leavePayload);
      joinedRoomRef.current = null;
    };
  }, [activeTrip?.id]);

  const actionBusyRef = useRef(false);

  const callAction = async (path: string, body: Record<string, unknown>): Promise<Trip | null> => {
    if (actionBusyRef.current) return null;
    actionBusyRef.current = true;
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        await loadActiveTrip();
        return null;
      }
      setActiveTrip(data.trip ?? null);
      return data.trip ?? null;
    } catch {
      setError("Network error");
      return null;
    } finally {
      actionBusyRef.current = false;
    }
  };

  const startTrip = useCallback(
    async (matchId: string) => callAction("/api/trips/start", { matchId }),
    []
  );

  const confirmPickup = useCallback(
    async (tripId: string, opts: { method: "otp" | "qr" | "manual"; code?: string }) =>
      callAction("/api/trips/confirm-pickup", { tripId, ...opts }),
    []
  );

  const beginRide = useCallback(
    async (tripId: string) => callAction("/api/trips/begin", { tripId }),
    []
  );

  const hostCompleteRide = useCallback(
    async (tripId: string, hostGeo?: GeoPoint) =>
      callAction("/api/trips/host-complete", { tripId, hostGeo }),
    []
  );

  const guestConfirmTrip = useCallback(
    async (tripId: string, guestGeo?: GeoPoint) =>
      callAction("/api/trips/guest-confirm", { tripId, guestGeo }),
    []
  );

  const cancelTrip = useCallback(
    async (tripId: string, reason?: string) =>
      callAction("/api/trips/cancel", { tripId, reason }),
    []
  );

  return {
    activeTrip,
    loading,
    error,
    startTrip,
    confirmPickup,
    beginRide,
    hostCompleteRide,
    guestConfirmTrip,
    cancelTrip,
    loadActiveTrip,
  };
}
