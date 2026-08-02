import { describe, it, expect } from "vitest";
import { haversineMeters } from "../backend/maps";

describe("haversineMeters", () => {
  it("returns 0 for same point", () => {
    const d = haversineMeters({ lat: 12.34, lng: 56.78 }, { lat: 12.34, lng: 56.78 });
    expect(d).toBe(0);
  });

  it("returns ~111km for 1 degree latitude", () => {
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("distance Delhi to Mumbai is ~1150km", () => {
    const d = haversineMeters(
      { lat: 28.6139, lng: 77.2090 },
      { lat: 19.0760, lng: 72.8777 },
    );
    expect(d).toBeGreaterThan(1_100_000);
    expect(d).toBeLessThan(1_200_000);
  });

  it("commutative", () => {
    const a = { lat: 40.7128, lng: -74.0060 };
    const b = { lat: 34.0522, lng: -118.2437 };
    expect(haversineMeters(a, b)).toBe(haversineMeters(b, a));
  });
});
