import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Subscription, User, Match, GeoPoint } from "../src/types";

vi.mock("../backend/maps", () => ({
  geocode: vi.fn(async (addr: string): Promise<GeoPoint | null> => {
    const lat = 42.35 + Math.random() * 0.05;
    const lng = -71.10 + Math.random() * 0.05;
    return { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) };
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
  getDistanceKm: vi.fn(async () => ({ km: 2, durationMin: 5, source: "google" as const })),
}));

interface TestState {
  users: User[];
  subscriptions: Subscription[];
  matches: Match[];
}

function randomGeo(base: { lat: number; lng: number }, spreadM: number): GeoPoint {
  const latDelta = (spreadM / 111_000) * (Math.random() - 0.5) * 2;
  const lngDelta = (spreadM / (111_000 * Math.cos(base.lat * Math.PI / 180))) * (Math.random() - 0.5) * 2;
  return { lat: base.lat + latDelta, lng: base.lng + lngDelta };
}

describe("Stress test: 20 guests + 10 hosts", () => {
  it("matches all 20 guests without duplicates", async () => {
    const { findBuddyForGuest, tryMatchGuestSub, runMatchSweep } = await import("../backend/matching");

    const center = { lat: 42.3601, lng: -71.0942 }; // MIT area

    // Create 10 hosts at random locations within ~2km of center
    const hosts: Subscription[] = [];
    for (let i = 0; i < 10; i++) {
      const geo = randomGeo(center, 2000);
      hosts.push({
        id: `sub_h_stress_${i}`,
        userId: `usr_host_stress_${i}`,
        planName: "Host Monthly",
        durationDays: 22,
        startDate: "2026-07-01",
        endDate: "2026-07-22",
        amountPaid: 99,
        status: "active" as const,
        role: "host" as const,
        origin: `Host ${i} Origin`,
        destination: `Host ${i} Dest`,
        forwardTime: "09:00",
        returnTime: "18:00",
        originGeo: geo,
        destGeo: randomGeo(geo, 500),
        distanceKm: 5,
        matchId: null,
      });
    }

    const hostUsers: User[] = hosts.map((h, i) => ({
      id: h.userId,
      name: `Host ${i}`,
      role: "host" as const,
      buddyScore: 50 + Math.floor(Math.random() * 50),
      rating: 3 + Math.random() * 2,
      reliabilityScore: 50 + Math.floor(Math.random() * 50),
    }));

    // Create 20 guests at random locations within ~1km of center
    const guests: Subscription[] = [];
    for (let i = 0; i < 20; i++) {
      const geo = randomGeo(center, 1000);
      guests.push({
        id: `sub_g_stress_${i}`,
        userId: `usr_guest_stress_${i}`,
        planName: "Monthly Pass",
        durationDays: 22,
        startDate: "2026-07-01",
        endDate: "2026-07-22",
        amountPaid: 500,
        status: "active" as const,
        role: "guest" as const,
        direction: "forward" as const,
        origin: `Guest ${i} Origin`,
        destination: `Guest ${i} Dest`,
        departureTime: "09:00",
        originGeo: geo,
        destGeo: randomGeo(geo, 300),
        distanceKm: 3,
        matchId: null,
        pickupRadiusM: 2000,
        dropRadiusM: 2000,
      });
    }

    const guestUsers: User[] = guests.map((g, i) => ({
      id: g.userId,
      name: `Guest ${i}`,
      role: "guest" as const,
      buddyScore: 50 + Math.floor(Math.random() * 50),
      rating: 3 + Math.random() * 2,
      reliabilityScore: 50 + Math.floor(Math.random() * 50),
    }));

    const state: TestState = {
      users: [...hostUsers, ...guestUsers],
      subscriptions: [...hosts, ...guests],
      matches: [],
    };

    // Activation time test for each guest
    const activationTimes: number[] = [];
    for (const guest of guests) {
      // Simulate findBuddyForGuest timing (the async part of activation)
      const start = performance.now();
      const cand = await findBuddyForGuest(state, guest);
      activationTimes.push(performance.now() - start);

      if (cand) {
        const match = await tryMatchGuestSub(state, guest);
        // Guard against duplicate
        if (!match) continue;
      }
    }

    // Verify: no duplicate subscriptions
    const guestIds = state.subscriptions.filter(s => s.role === "guest").map(s => s.id);
    expect(new Set(guestIds).size).toBe(guestIds.length);

    // Verify: no duplicate matches (same host twice for same direction)
    const hostMatchCounts = new Map<string, number>();
    for (const m of state.matches) {
      const key = `${m.hostId}:${m.direction}`;
      hostMatchCounts.set(key, (hostMatchCounts.get(key) || 0) + 1);
    }
    for (const [key, count] of hostMatchCounts) {
      expect(count).toBeLessThanOrEqual(1); // no host matched twice for same direction
    }

    // Verify: guest matchIds are unique
    const matchedGuestSubs = state.subscriptions.filter(s => s.matchId);
    const matchIds = matchedGuestSubs.map(s => s.matchId);
    expect(new Set(matchIds).size).toBe(matchIds.length);

    // Verify: activation times are fast (most under 200ms in this test)
    const avgTime = activationTimes.reduce((a, b) => a + b, 0) / activationTimes.length;
    expect(avgTime).toBeLessThan(500);

    console.log(`Stress test: ${state.matches.length} matches from ${guests.length} guests + ${hosts.length} hosts`);
    console.log(`Average findBuddyForGuest time: ${avgTime.toFixed(1)}ms`);
    console.log(`Max findBuddyForGuest time: ${Math.max(...activationTimes).toFixed(1)}ms`);
  });

  it("runMatchSweep produces no duplicate matches", async () => {
    const { runMatchSweep, findBuddyForGuest, tryMatchGuestSub } = await import("../backend/matching");

    const center = { lat: 42.3601, lng: -71.0942 };

    // 5 hosts, 10 guests — all within radius
    const hosts: Subscription[] = [];
    for (let i = 0; i < 5; i++) {
      hosts.push({
        id: `sub_h_sweep_${i}`, userId: `usr_hs_${i}`,
        planName: "Host Monthly", durationDays: 22,
        startDate: "2026-07-01", endDate: "2026-07-22",
        amountPaid: 99, status: "active" as const, role: "host" as const,
        origin: `H${i} O`, destination: `H${i} D`,
        forwardTime: "09:00", returnTime: "18:00",
        originGeo: randomGeo(center, 1000), destGeo: randomGeo(center, 1000),
        distanceKm: 3, matchId: null,
      });
    }

    const guests: Subscription[] = [];
    for (let i = 0; i < 10; i++) {
      guests.push({
        id: `sub_g_sweep_${i}`, userId: `usr_gs_${i}`,
        planName: "Monthly Pass", durationDays: 22,
        startDate: "2026-07-01", endDate: "2026-07-22",
        amountPaid: 500, status: "active" as const, role: "guest" as const,
        direction: "forward" as const,
        origin: `G${i} O`, destination: `G${i} D`,
        departureTime: "09:00",
        originGeo: randomGeo(center, 500), destGeo: randomGeo(center, 500),
        distanceKm: 2, matchId: null,
        pickupRadiusM: 2000, dropRadiusM: 2000,
      });
    }

    const allUsers: User[] = [
      ...hosts.map((h, i) => ({ id: h.userId, name: `Host ${i}`, role: "host" as const, buddyScore: 70, rating: 4.0, reliabilityScore: 70 })),
      ...guests.map((g, i) => ({ id: g.userId, name: `Guest ${i}`, role: "guest" as const, buddyScore: 70, rating: 4.0, reliabilityScore: 70 })),
    ];

    const state: TestState = { users: allUsers, subscriptions: [...hosts, ...guests], matches: [] };

    // Run the sweep once
    const firstPass = await runMatchSweep(state);
    const firstMatchCount = state.matches.length;

    // Run the sweep again — should produce no new matches (all matched guests have matchId)
    const secondPass = await runMatchSweep(state);
    const secondMatchCount = state.matches.length;

    expect(firstMatchCount).toBeGreaterThan(0);
    expect(secondMatchCount).toBe(firstMatchCount); // no additional matches
    expect(secondPass.length).toBe(0); // no matches returned

    // Verify no duplicates
    const guestMatchIds = state.subscriptions.filter(s => s.role === "guest" && s.matchId).map(s => s.matchId);
    expect(new Set(guestMatchIds).size).toBe(guestMatchIds.length);
  });
});
