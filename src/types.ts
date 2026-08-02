/**
 * Move Buddy Common Type Definitions
 */

export type UserRole = 'guest' | 'host' | 'admin';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'SUPPORT' | 'OPERATIONS';
// In-app sections for the logged-in customer (driven from the top navbar menu).
export type CustomerView = 'dashboard' | 'commute' | 'plans' | 'profile' | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  gender: 'male' | 'female' | 'other';
  companyOrCollege?: string;
  isIdVerified: boolean;
  isCompanyVerified: boolean;
  avatarUrl: string;
  buddyScore: number;
  rating: number;
  skills?: string[];
  bio?: string;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  licenceNumber?: string;
  aadhaarNumber?: string;
  selfieImage?: string;
  // Uploaded document scans (URLs under /uploads) + vehicle registration.
  licenceImageUrl?: string;
  aadhaarImageUrl?: string;
  vehicleRcNumber?: string;
  vehicleRcImageUrl?: string;
  verificationSubmittedAt?: string;
  adminRole?: AdminRole;
  // Reliability score (0-100) used as a matching ranking factor. Starts neutral
  // and adjusts with completed rides, cancellations and ratings.
  reliabilityScore?: number;
  createdAt?: string; // ISO timestamp of signup (for real growth analytics)
}

export interface Ride {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostRating: number;
  hostBuddyScore: number;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  availableSeats: number;
  totalSeats: number;
  vehicleType: 'bike';
  vehicleModel: string;
  vehicleNumber: string;
  perKmRate: number;
  distanceKm: number;
  totalCost: number;
  genderRestriction?: 'none' | 'women-only';
  isRecurring: boolean;
  recurrenceDays?: string[]; // e.g. ['Mon', 'Wed', 'Fri']
  helmetAvailable?: boolean;
  matches?: {
    overlapPercent: number;
    suggestedPickup: string;
  };
}

export interface RideRequest {
  id: string;
  rideId: string;
  guestId: string;
  guestName: string;
  guestAvatar: string;
  guestRating: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  requestDate: string;
  verificationCode: string;
}

// forward = Home -> Destination (office/college); return = Destination -> Home
export type CommuteDirection = 'forward' | 'return';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Subscription {
  id: string;
  userId: string;
  // Plan names are admin-configurable (e.g. "Monthly Pass", "Host 15 Day"), so
  // this is an open string rather than a fixed union.
  planName: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  amountPaid: number;       // what the guest actually paid (after welcome discount)
  planPrice?: number;       // gross plan price before any discount (for loyalty calc)
  status: 'pending' | 'geocoding' | 'matching' | 'active' | 'expired' | 'failed';
  hostId?: string;
  hostName?: string;
  hostAvatar?: string;
  hostBikeModel?: string;
  hostBikeNumber?: string;
  hostRating?: number;
  isPartnerLocked?: boolean;
  partnerChangeApproved?: boolean;

  // ── Automatic-matching model ──
  role?: 'guest' | 'host';
  // Guests hold ONE subscription per direction. Hosts hold a single
  // subscription that serves both directions (forwardTime + returnTime).
  direction?: CommuteDirection;
  origin?: string;        // Home address
  destination?: string;   // Office/College address
  originGeo?: GeoPoint;    // geocoded Home
  destGeo?: GeoPoint;      // geocoded Destination
  departureTime?: string;  // guest leg departure "HH:mm"
  forwardTime?: string;    // host morning departure "HH:mm"
  returnTime?: string;     // host evening departure "HH:mm"
  distanceKm?: number;
  pickupRadiusM?: number;   // how far the user is willing to walk for pickup
  dropRadiusM?: number;     // how far the user is willing to walk for drop-off
  matchId?: string | null; // currently assigned match (if any)
}

// A backend-created buddy pairing. Neither side selects the other.
export interface Match {
  id: string;
  guestId: string;
  guestName: string;
  hostId: string;
  hostName: string;
  guestSubscriptionId: string;
  hostSubscriptionId: string;
  direction: CommuteDirection;
  status: 'active' | 'cancelled' | 'completed';
  proximityTierM: number; // effective radius in meters (larger of pickupM, dropM)
  score: number;                     // 0-100 composite match quality
  pickupDistanceM: number;
  dropDistanceM: number;
  createdAt: string;
}

// A real payment via Razorpay. A subscription is only activated AFTER the
// payment signature is verified server-side.
export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  provider: 'razorpay';
  providerOrderId: string;
  providerPaymentId?: string;
  amount: number;   // rupees
  currency: string; // 'INR'
  status: 'created' | 'success' | 'failed';
  notes?: Record<string, any>;
  createdAt: string;
}

// Source of truth for activity-based host payout.
export interface HostActivityDay {
  id: string;
  hostId: string;
  subscriptionId: string;
  date: string;            // YYYY-MM-DD
  rideCompleted: boolean;
  matchedGuestCount: number;
  eligibleForPayout: boolean;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  credits: number;
  history: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: 'open' | 'resolved' | 'approved' | 'rejected';
  createdAt: string;
  messages: Array<{ sender: string; text: string; time: string }>;
  ticketType?: 'partner_change' | 'sos' | 'general';
  category?: string; // Safety Issue, Behaviour Issue, etc.
  description?: string;
  screenshotUrl?: string;
  guestId?: string;
  guestName?: string;
  hostId?: string;
  hostName?: string;
  rideId?: string;
  gpsCoordinates?: { lat: number; lng: number };
  timestamp?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: string;
  rideId?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  quote: string;
  stars: number;
}
// A single day's actual ride instance, derived from a standing Match.
// Match = the recurring host<->guest pairing. Trip = today's execution of it.
export type TripStatus =
  | 'scheduled'           // host tapped "Start Today's Commute"; OTP generated, not yet picked up
  | 'pickup_confirmed'    // guest confirmed boarding (OTP / QR / manual button)
  | 'in_progress'         // host tapped "Begin Ride"; live tracking window; fare RESERVED not credited
  | 'awaiting_confirmation' // host tapped "Complete Ride"; waiting on guest's "Yes, completed"
  | 'completed'           // both sides confirmed + server validation passed; wallet credited
  | 'cancelled';          // aborted from any non-terminal state

export type PickupMethod = 'otp' | 'qr' | 'manual';

export interface TripLocationPing {
  lat: number;
  lng: number;
  at: string; // ISO timestamp
}

export interface Trip {
  id: string;
  matchId: string;
  hostId: string;
  guestId: string;
  hostName: string;
  guestName: string;
  direction: CommuteDirection;
  date: string; // YYYY-MM-DD, the calendar day this trip belongs to

  status: TripStatus;

  // Pickup confirmation
  verificationCode: string; // reused OTP pattern, e.g. "BUDDY-8744"
  pickupMethod?: PickupMethod;
  pickupConfirmedAt?: string;
  pickupGeo?: GeoPoint; // host's location at the moment of pickup confirmation

  // Ride lifecycle timestamps
  startedAt?: string;        // 'scheduled' created
  beginRideAt?: string;      // 'in_progress' started (live tracking begins)
  hostCompletedAt?: string;  // host tapped "Complete Ride"
  guestConfirmedAt?: string; // guest tapped "Yes, ride completed"
  completedAt?: string;      // final, after server validation passes
  cancelledAt?: string;
  cancelReason?: string;

  // Route + fare
  origin: string;
  destination: string;
  originGeo?: GeoPoint;
  destGeo?: GeoPoint;
  distanceKm: number;

  // Money — RESERVED at pickup confirmation, CREDITED only after completion
  // validation. Never mutate wallet.credits until status === 'completed'.
  reservedAmount: number;
  creditedAmount?: number;

  // Live tracking — last known position of each party while in_progress.
  hostLastPing?: TripLocationPing;
  guestLastPing?: TripLocationPing;

  // Validation flags (computed at completion time, stored for audit/dispute use)
  validation?: {
    pickupConfirmed: boolean;
    destinationReached: boolean;
    durationValid: boolean;
    gpsRouteValid: boolean;
  };
  // Human-readable validation failure reasons (when validation.valid === false).
  // Keeps the trip in awaiting_confirmation instead of auto-cancelling, so the
  // system (or future admin panel) can force-complete, cancel, or retry.
      validationErrors?: string[];
}

// ── Socket.IO event payloads ──────────────────────────────────────────────
export interface SocketTripJoinPayload {
  tripId: string;
}

export interface SocketTripJoinAck {
  success: boolean;
  tripId: string;
  hostLastPing: TripLocationPing | null;
  guestLastPing: TripLocationPing | null;
  status: TripStatus;
}

export interface SocketTripJoinError {
  error: string;
}

export type SocketTripJoinResponse = SocketTripJoinAck | SocketTripJoinError;

export interface SocketTripLeavePayload {
  tripId: string;
}

export interface SocketTripPingPayload {
  tripId: string;
  geo: GeoPoint;
}

export interface SocketTripPingBroadcast {
  tripId: string;
  role: "host" | "guest";
  geo: GeoPoint;
  at: string;
}

export interface SocketTripUpdatePayload {
  trip: Trip;
}

export interface SocketTripErrorEvent {
  error: string;
}

export interface SocketTripHeartbeatPayload {
  tripId: string;
  status: "active" | "gps_failed" | "offline";
  lastPingAge: number; // seconds since last successful position
}