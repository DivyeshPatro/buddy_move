import { useState } from "react";
import type { Trip, TripStatus } from "../types";
import { Clock, MapPin, Navigation, CheckCircle, XCircle, Loader, Smartphone, ShieldAlert } from "lucide-react";

interface Props {
  trip: Trip;
  role: "host" | "guest";
  onConfirmPickup?: (tripId: string, opts: { method: "otp" | "qr" | "manual"; code?: string }) => void;
  onBeginRide?: (tripId: string) => void;
  onHostComplete?: (tripId: string) => void;
  onGuestConfirm?: (tripId: string) => void;
  onCancelTrip?: (tripId: string, reason?: string) => void;
  busy?: boolean;
  error?: string;
}

const STATUS_LABELS: Record<TripStatus, { label: string; color: string; icon: import("react").ElementType }> = {
  scheduled: { label: "Scheduled", color: "text-blue-400", icon: Clock },
  pickup_confirmed: { label: "Pickup Confirmed", color: "text-emerald-400", icon: CheckCircle },
  in_progress: { label: "In Progress", color: "text-[#ffb300]", icon: Navigation },
  awaiting_confirmation: { label: "Awaiting Confirmation", color: "text-orange-400", icon: Clock },
  completed: { label: "Completed", color: "text-emerald-400", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-rose-400", icon: XCircle },
};

export default function TripCard({
  trip,
  role,
  onConfirmPickup,
  onBeginRide,
  onHostComplete,
  onGuestConfirm,
  onCancelTrip,
  busy,
  error,
}: Props) {
  const statusInfo = STATUS_LABELS[trip.status];
  const StatusIcon = statusInfo.icon;
  const isHost = role === "host";

  return (
    <div className="!bg-[#2a2e34] border !border-[#ffb300]/25 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
          <span className={`text-sm font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
        <span className="text-[10px] !text-[#e9eaec]/40 uppercase tracking-wider">
          {trip.direction === "forward" ? "Morning" : "Evening"} · {trip.date}
        </span>
      </div>

      {/* Route */}
      <div className="space-y-1 text-xs !text-[#e9eaec]/80">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 !text-emerald-400" />
          <span>{trip.origin}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 !text-rose-400" />
          <span>{trip.destination}</span>
        </div>
      </div>

      {/* OTP — host sees the code to share; guest sees an input to enter it */}
      {trip.status === "scheduled" && isHost && (
        <div className="!bg-[#1c1f22] rounded-xl p-3 border !border-[#ffb300]/15">
          <div className="text-[10px] uppercase font-bold !text-[#ffb300] tracking-wider mb-1 flex items-center gap-1">
            <Smartphone className="w-3 h-3" /> Pickup Code
          </div>
          <div className="text-2xl font-black !text-[#e9eaec] tracking-widest">{trip.verificationCode}</div>
          <div className="text-[10px] !text-[#e9eaec]/50 mt-0.5">Share this code with your guest to confirm boarding</div>
        </div>
      )}

      {/* Role-specific actions */}
      {isHost
        ? <HostActions trip={trip} onBeginRide={onBeginRide} onHostComplete={onHostComplete} onCancelTrip={onCancelTrip} busy={busy} />
        : <GuestActions trip={trip} onConfirmPickup={onConfirmPickup} onGuestConfirm={onGuestConfirm} onCancelTrip={onCancelTrip} busy={busy} />}

      {/* GPS tracking indicator — only during active tracking */}
      {trip.status === "in_progress" && (
        <div className="flex items-center gap-2 text-[11px] !text-emerald-400/80">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          GPS tracking active
        </div>
      )}

      {/* Pricing */}
      {trip.status === "in_progress" && (
        <div className="text-xs !text-[#e9eaec]/60">
          Reserved: <span className="!text-[#ffb300] font-bold">₹{trip.reservedAmount}</span>
        </div>
      )}
      {trip.status === "completed" && trip.creditedAmount != null && (
        <div className="!bg-emerald-500/10 border !border-emerald-500/25 rounded-xl p-3">
          <div className="text-xs !text-emerald-400 font-bold">₹{trip.creditedAmount} credited to {isHost ? "your wallet" : `${trip.hostName}'s wallet`}</div>
        </div>
      )}

      {/* Validation errors (when awaiting_confirmation) */}
      {trip.status === "awaiting_confirmation" && trip.validationErrors && trip.validationErrors.length > 0 && (
        <div className="!bg-rose-950/40 border !border-rose-500/30 rounded-xl p-3 space-y-1">
          <div className="text-[10px] uppercase font-bold !text-rose-400 tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Validation Issues
          </div>
          {trip.validationErrors.map((r, i) => (
            <div key={i} className="text-[11px] !text-rose-300">• {r}</div>
          ))}
          {!isHost && (
            <div className="text-[10px] !text-rose-400/70 mt-1">The host will be notified. An admin may review this ride.</div>
          )}
        </div>
      )}

      {/* Cancellation reason */}
      {trip.status === "cancelled" && trip.cancelReason && (
        <div className="text-[11px] !text-rose-400/80">Reason: {trip.cancelReason}</div>
      )}

      {/* Error */}
      {error && <div className="!bg-rose-950/60 border-l-4 border-rose-500 !text-rose-200 text-xs p-2.5 rounded">{error}</div>}
    </div>
  );
}

function HostActions({
  trip,
  onBeginRide,
  onHostComplete,
  onCancelTrip,
  busy,
}: {
  trip: Trip;
  onBeginRide?: (tripId: string) => void;
  onHostComplete?: (tripId: string) => void;
  onCancelTrip?: (tripId: string, reason?: string) => void;
  busy?: boolean;
}) {
  switch (trip.status) {
    case "scheduled":
      return (
        <div className="text-xs !text-[#e9eaec]/60">Waiting for guest to confirm pickup with the code above.</div>
      );
    case "pickup_confirmed":
      return (
        <button
          onClick={() => onBeginRide?.(trip.id)}
          disabled={busy}
          className="w-full !bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          Begin Ride
        </button>
      );
    case "in_progress":
      return (
        <button
          onClick={() => onHostComplete?.(trip.id)}
          disabled={busy}
          className="w-full !bg-emerald-500 hover:!bg-emerald-600 !text-white py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Complete Ride
        </button>
      );
    case "awaiting_confirmation":
      return (
        <div className="space-y-2">
          <div className="text-xs !text-[#e9eaec]/60">Waiting for guest to confirm the ride was completed.</div>
          <button
            onClick={() => onCancelTrip?.(trip.id, "Guest did not confirm")}
            disabled={busy}
            className="w-full border !border-rose-500/40 !text-rose-400 hover:!bg-rose-500/10 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
          >
            Cancel Trip
          </button>
        </div>
      );
    default:
      return null;
  }
}

function GuestActions({
  trip,
  onConfirmPickup,
  onGuestConfirm,
  onCancelTrip,
  busy,
}: {
  trip: Trip;
  onConfirmPickup?: (tripId: string, opts: { method: "otp" | "qr" | "manual"; code?: string }) => void;
  onGuestConfirm?: (tripId: string) => void;
  onCancelTrip?: (tripId: string, reason?: string) => void;
  busy?: boolean;
}) {
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  switch (trip.status) {
    case "scheduled":
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold !text-[#ffb300] tracking-wider mb-1.5 flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> Enter Pickup Code from Host
            </label>
            <input
              type="text"
              value={otpInput}
              onChange={(e) => { setOtpInput(e.target.value.toUpperCase()); setOtpError(""); }}
              placeholder="e.g. BUDDY-1234"
              maxLength={12}
              className="w-full !bg-[#1c1f22] border !border-[#ffb300]/25 rounded-xl py-2.5 px-3 !text-[#e9eaec] text-sm tracking-widest font-bold text-center focus:outline-none focus:!border-[#ffb300]"
            />
          </div>
          {otpError && <div className="text-[11px] !text-rose-400">{otpError}</div>}
          <button
            onClick={() => {
              if (!otpInput.trim()) {
                setOtpError("Please enter the pickup code from your host");
                return;
              }
              onConfirmPickup?.(trip.id, { method: "otp", code: otpInput.trim() });
            }}
            disabled={busy || !otpInput.trim()}
            className="w-full !bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm Pickup
          </button>
        </div>
      );
    case "pickup_confirmed":
    case "in_progress":
      return (
        <div className="text-xs !text-[#e9eaec]/60">
          {trip.status === "pickup_confirmed" ? "Waiting for host to begin the ride." : "Ride in progress. Your GPS is being tracked for safety."}
        </div>
      );
    case "awaiting_confirmation":
      return (
        <div className="space-y-2">
          <button
            onClick={() => onGuestConfirm?.(trip.id)}
            disabled={busy}
            className="w-full !bg-emerald-500 hover:!bg-emerald-600 !text-white py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Yes, Ride Completed
          </button>
          <button
            onClick={() => onCancelTrip?.(trip.id, "Guest reported ride not completed")}
            disabled={busy}
            className="w-full border !border-rose-500/40 !text-rose-400 hover:!bg-rose-500/10 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
          >
            Not Completed
          </button>
        </div>
      );
    default:
      return null;
  }
}
