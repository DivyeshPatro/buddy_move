// Regression tests for the Leaflet route map.
//
// The bug: the effect read window.L once and returned permanently if Leaflet
// had not finished loading, leaving a blank grey box that never recovered.
// The fix polls for Leaflet — so it must (a) recover when the CDN script lands
// late, and (b) stop polling rather than leak a timer if it never lands.
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import RouteMap from '../src/components/RouteMap';

const ORIGIN = { lat: 12.9698, lng: 77.75 };
const DEST = { lat: 12.9352, lng: 77.6245 };

/** Minimal stand-in for the parts of the Leaflet API RouteMap touches. */
function makeLeaflet() {
  const map = {
    setView: vi.fn(function (this: any) { return this; }),
    removeLayer: vi.fn(),
    fitBounds: vi.fn(),
    invalidateSize: vi.fn(),
  };
  const layer = { addTo: vi.fn(() => layer), bindPopup: vi.fn(() => layer) };
  const L = {
    map: vi.fn(() => map),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    marker: vi.fn(() => layer),
    polyline: vi.fn(() => layer),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn((pts: any) => pts),
  };
  return { L, map };
}

afterEach(() => {
  cleanup();
  delete (window as any).L;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('RouteMap', () => {
  it('draws both markers and the route line when Leaflet is ready', () => {
    const { L, map } = makeLeaflet();
    (window as any).L = L;

    render(<RouteMap originGeo={ORIGIN} destinationGeo={DEST} originAddress="A" destinationAddress="B" />);

    expect(L.map).toHaveBeenCalledTimes(1);
    expect(L.marker).toHaveBeenCalledTimes(2);
    expect(L.polyline).toHaveBeenCalledTimes(1);
    expect(map.fitBounds).toHaveBeenCalled();
  });

  it('recovers when the Leaflet CDN script lands AFTER the component mounts', () => {
    vi.useFakeTimers();
    // Leaflet deliberately absent at mount — the old code gave up here forever.
    render(<RouteMap originGeo={ORIGIN} destinationGeo={DEST} />);

    const { L } = makeLeaflet();
    expect(L.map).not.toHaveBeenCalled();

    (window as any).L = L;      // script finally executes
    vi.advanceTimersByTime(300); // next poll tick

    expect(L.map).toHaveBeenCalledTimes(1);
    expect(L.marker).toHaveBeenCalledTimes(2);
  });

  it('stops polling instead of leaking a timer when Leaflet never loads', () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<RouteMap originGeo={ORIGIN} destinationGeo={DEST} />);
    vi.advanceTimersByTime(30_000); // well past the ~10s budget

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Leaflet did not load'));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('centres on a single point when only one endpoint has coordinates', () => {
    const { L, map } = makeLeaflet();
    (window as any).L = L;

    render(<RouteMap originGeo={ORIGIN} />);

    expect(L.marker).toHaveBeenCalledTimes(1);
    expect(L.polyline).not.toHaveBeenCalled();
    expect(map.setView).toHaveBeenCalledWith([ORIGIN.lat, ORIGIN.lng], 13);
  });
});
