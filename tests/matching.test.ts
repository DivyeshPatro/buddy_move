import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Subscription, User, Match, GeoPoint } from "../src/types";

vi.mock("../backend/maps", () => ({
  geocode: vi.fn(async (addr: string): Promise<GeoPoint | null> => {
    if (addr === "MIT Gate, Cambridge") return { lat: 42.3601, lng: -71.0942 };
    if (addr === "MIT Food Court, Cambridge") return { lat: 42.3610, lng: -71.0955 };
    if (addr === "Harvard Yard, Cambridge") return { lat: 42.3744, lng: -71.1169 };
    if (addr === "Harvard Science Center") return { lat: 42.3760, lng: -71.1160 };
    if (addr === "Central Square, Cambridge") return { lat: 42.3650, lng: -71.1030 };
    if (addr === "Kendall Square, Cambridge") return { lat: 42.3625, lng: -71.0840 };
    return { lat: 12.97, lng: 77.59 };
  }),
  haversineMeters: vi.fn((a: GeoPoint, b: GeoPoint) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }),
  getDistanceKm: vi.fn(async () => ({ km: 1, durationMin: 3, source: "google" as const })),
}));

interface TestState {
  users: User[];
  subscriptions: Subscription[];
  matches: Match[];
}

function makeState(users: User[], subs: Subscription[], matches: Match[] = []): TestState {
  return { users, subscriptions: subs, matches };
}

function hostSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_h_" + Math.random().toString(36).slice(2, 9),
    userId: "usr_host1",
    planName: "Host Monthly",
    durationDays: 22,
    startDate: "2026-07-01",
    endDate: "2026-07-22",
    amountPaid: 99,
    status: "active",
    role: "host",
    origin: "MIT Gate, Cambridge",
    destination: "MIT Food Court, Cambridge",
    forwardTime: "09:00",
    returnTime: "18:00",
    originGeo: { lat: 42.3601, lng: -71.0942 },
    destGeo: { lat: 42.3610, lng: -71.0955 },
    distanceKm: 1.5,
    matchId: null,
    pickupRadiusM: 500,
    dropRadiusM: 500,
    ...overrides,
  };
}

function guestSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_g_" + Math.random().toString(36).slice(2, 9),
    userId: "usr_guest1",
    planName: "Monthly Pass",
    durationDays: 22,
    startDate: "2026-07-01",
    endDate: "2026-07-22",
    amountPaid: 500,
    status: "active",
    role: "guest",
    direction: "forward",
    origin: "MIT Gate, Cambridge",
    destination: "MIT Food Court, Cambridge",
    departureTime: "09:00",
    originGeo: { lat: 42.3601, lng: -71.0942 },
    destGeo: { lat: 42.3610, lng: -71.0955 },
    distanceKm: 1.5,
    matchId: null,
    pickupRadiusM: 200,
    dropRadiusM: 200,
    ...overrides,
  };
}

function makeUsers(): User[] {
  return [
    { id: "usr_host1", name: "Host One", role: "host", buddyScore: 90, rating: 4.5, reliabilityScore: 85 },
    { id: "usr_guest1", name: "Guest One", role: "guest", buddyScore: 80, rating: 4.0, reliabilityScore: 75 },
  ];
}

// Calculate haversine distance between MIT Gate and MIT Food Court:
// MIT Gate: 42.3601, -71.0942
// MIT Food Court: 42.3610, -71.0955
// dLat = 0.0009 deg = ~100m, dLng = 0.0013 deg = ~100m
// distance ≈ sqrt(100² + 100²) ≈ 140m
// Harvard Yard: 42.3744, -71.1169
// MIT Gate to Harvard Yard: dLat = 0.0143 deg ≈ 1590m, dLng = 0.0227 deg ≈ 1770m
// distance ≈ sqrt(1590² + 1770²) ≈ 2380m

describe("Matching engine", () => {
  // Approximate known distances (in meters) using haversine:
  // MIT Gate(42.3601,-71.0942) ↔ MIT Food Court(42.3610,-71.0955): ~140m
  // MIT Gate ↔ Harvard Yard(42.3744,-71.1169): ~2380m
  // MIT Food Court ↔ Harvard Science Center(42.3760,-71.1160): ~2460m
  // MIT Gate ↔ Central Square(42.3650,-71.1030): ~870m
  // MIT Food Court ↔ Kendall Square(42.3625,-71.0840): ~910m

  // Scenario 1: Guest radius 100m, host distance ~140m → ❌ No match
  it("rejects host outside pickup radius", async () => {
    const { findBuddyForGuest } = await import("../backend/matching");
    const state = makeState(makeUsers(), [
      hostSub({ originGeo: { lat: 42.3610, lng: -71.0955 } }),
    ]);
    const gs = guestSub({
      origin: "MIT Food Court, Cambridge",
      originGeo: { lat: 42.3610, lng: -71.0955 },
      destination: "MIT Gate, Cambridge",
      destGeo: { lat: 42.3601, lng: -71.0942 },
      pickupRadiusM: 100,
      dropRadiusM: 100,
      departureTime: "09:00",
    });

    const result = await findBuddyForGuest(state, gs);
    expect(result).toBeNull();
  });

  // Scenario 2: Guest radius 200m, host distance ~140m → ✅ Match
  it("accepts host inside pickup radius", async () => {
    const { findBuddyForGuest } = await import("../backend/matching");
    const state = makeState(makeUsers(), [
      hostSub({ originGeo: { lat: 42.3610, lng: -71.0955 } }),
    ]);
    const gs = guestSub({
      origin: "MIT Food Court, Cambridge",
      originGeo: { lat: 42.3610, lng: -71.0955 },
      destination: "MIT Gate, Cambridge",
      destGeo: { lat: 42.3601, lng: -71.0942 },
      pickupRadiusM: 200,
      dropRadiusM: 200,
      departureTime: "09:00",
    });

    const result = await findBuddyForGuest(state, gs);
    expect(result).not.toBeNull();
    expect(result!.pickupM).toBeLessThanOrEqual(200);
    expect(result!.dropM).toBeLessThanOrEqual(200);
  });

  // Scenario 3: Time mismatch (outside 30 min window) → ❌ No match
  it("rejects host with time mismatch > 30 min", async () => {
    const { findBuddyForGuest } = await import("../backend/matching");
    const state = makeState(makeUsers(), [
      hostSub({ forwardTime: "10:00" }),
    ]);
    const gs = guestSub({
      departureTime: "09:00",
      pickupRadiusM: 500,
      dropRadiusM: 500,
    });

    const result = await findBuddyForGuest(state, gs);
    expect(result).toBeNull();
  });

  // Scenario 4: Same time, close proximity → ✅ Match
  it("matches guest and host with same time and close proximity", async () => {
    const { findBuddyForGuest } = await import("../backend/matching");
    const state = makeState(makeUsers(), [
      hostSub({ forwardTime: "09:00" }),
    ]);
    const gs = guestSub({
      departureTime: "09:00",
      pickupRadiusM: 500,
      dropRadiusM: 500,
    });

    const result = await findBuddyForGuest(state, gs);
    expect(result).not.toBeNull();
    expect(result!.hostSub.userId).toBe("usr_host1");
    expect(result!.score).toBeGreaterThanOrEqual(0);
  });

  // Scenario 5: No hosts available → ❌ No match
  it("returns null when no hosts exist", async () => {
    const { findBuddyForGuest } = await import("../backend/matching");
    const state = makeState(makeUsers(), []);
    const gs = guestSub({ pickupRadiusM: 500, dropRadiusM: 500 });

    const result = await findBuddyForGuest(state, gs);
    expect(result).toBeNull();
  });

  // Scenario 6: Multiple hosts, pick the closest
  it("picks the closest host when multiple are available", async () => {
    const { findBuddyForGuest } = await import("../backend/matching");
    const users = [
      ...makeUsers(),
      { id: "usr_host2", name: "Host Two Far", role: "host" as const, buddyScore: 90, rating: 4.5, reliabilityScore: 85 },
    ];
    const state = makeState(users, [
      hostSub({
        id: "sub_h_close",
        userId: "usr_host1",
        originGeo: { lat: 42.3602, lng: -71.0943 }, // ~15m from guest pickup
        destGeo: { lat: 42.3611, lng: -71.0956 },   // ~15m from guest drop
        forwardTime: "09:00",
      }),
      hostSub({
        id: "sub_h_far",
        userId: "usr_host2",
        origin: "Harvard Yard, Cambridge",
        destination: "Harvard Science Center, Cambridge",
        originGeo: { lat: 42.3744, lng: -71.1169 }, // ~2380m from guest pickup
        destGeo: { lat: 42.3760, lng: -71.1160 },   // ~2460m from guest drop
        forwardTime: "09:00",
      }),
    ]);
    const gs = guestSub({
      departureTime: "09:00",
      pickupRadiusM: 3000,
      dropRadiusM: 3000,
    });

    const result = await findBuddyForGuest(state, gs);
    expect(result).not.toBeNull();
    // Should pick the closer host
    expect(result!.hostSub.id).toBe("sub_h_close");
  });

  // Scenario 7: Host already matched for this direction → ❌ No match
  it("skips hosts already matched for the same direction", async () => {
    const { findBuddyForGuest } = await import("../backend/matching");
    const host = hostSub({ id: "sub_h_matched", forwardTime: "09:00" });
    const existingMatch: Match = {
      id: "match_existing",
      guestId: "usr_other",
      guestName: "Other Guest",
      hostId: "usr_host1",
      hostName: "Host One",
      guestSubscriptionId: "sub_other",
      hostSubscriptionId: "sub_h_matched",
      direction: "forward",
      status: "active",
      proximityTierM: 500,
      score: 90,
      pickupDistanceM: 100,
      dropDistanceM: 100,
      createdAt: new Date().toISOString(),
    };
    const state = makeState(makeUsers(), [host], [existingMatch]);
    const gs = guestSub({ departureTime: "09:00", pickupRadiusM: 500, dropRadiusM: 500 });

    const result = await findBuddyForGuest(state, gs);
    expect(result).toBeNull();
  });

  // Scenario 8: Guest with 0 radius → should default to 500m
  it("falls back to default radius when guest has no radius preference", async () => {
    const { findBuddyForGuest } = await import("../backend/matching");
    const state = makeState(makeUsers(), [
      hostSub({ originGeo: { lat: 42.3610, lng: -71.0955 }, forwardTime: "09:00" }),
    ]);
    const gs = guestSub({
      pickupRadiusM: undefined,
      dropRadiusM: undefined,
      departureTime: "09:00",
    });

    const result = await findBuddyForGuest(state, gs);
    // MIT Gate to MIT Food Court is ~140m, which is within default 500m
    expect(result).not.toBeNull();
  });

  // Scenario 9: tryMatchGuestSub creates the match
  it("tryMatchGuestSub creates a match record", async () => {
    const { tryMatchGuestSub } = await import("../backend/matching");
    const state = makeState(makeUsers(), [
      hostSub({ forwardTime: "09:00" }),
    ]);
    const gs = guestSub({
      departureTime: "09:00",
      pickupRadiusM: 500,
      dropRadiusM: 500,
    });

    const match = await tryMatchGuestSub(state, gs);
    expect(match).not.toBeNull();
    expect(match!.guestSubscriptionId).toBe(gs.id);
    expect(match!.status).toBe("active");
    expect(gs.matchId).toBe(match!.id);
  });

  // Scenario 10: Already matched guest → skip
  it("skips already matched guest subscription", async () => {
    const { tryMatchGuestSub } = await import("../backend/matching");
    const state = makeState(makeUsers(), [hostSub({ forwardTime: "09:00" })]);
    const gs = guestSub({ matchId: "already_matched", departureTime: "09:00", pickupRadiusM: 500, dropRadiusM: 500 });

    const match = await tryMatchGuestSub(state, gs);
    expect(match).toBeNull();
  });
});
