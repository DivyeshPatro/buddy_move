// Regression tests for the address autocomplete fallback.
//
// The bug: Google Places (New) does not throw when a key is over quota or
// referrer-restricted — fetchAutocompleteSuggestions RESOLVES with an empty
// suggestion list. PlacePicker treated that as "no results" and never reached
// its Nominatim fallback, so the dropdown stayed empty forever.
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/lib/googleMaps', () => ({
  googleMapsEnabled: true,
  loadGoogleMaps: () => Promise.resolve(),
}));

import PlacePicker from '../src/components/PlacePicker';

const NOMINATIM_ROW = {
  place_id: 42,
  display_name: 'Whitefield, Bengaluru, Karnataka, India',
  lat: '12.9698',
  lon: '77.7500',
};

/** Install a fake google.maps.importLibrary('places') whose autocomplete call
 *  resolves with `suggestions` (never throws) — mirroring the real SDK. */
function installGoogle(suggestions: any[]) {
  (window as any).google = {
    maps: {
      importLibrary: async () => ({
        AutocompleteSessionToken: class {},
        AutocompleteSuggestion: {
          fetchAutocompleteSuggestions: vi.fn(async () => ({ suggestions })),
        },
      }),
    },
  };
}

function mockNominatim(rows: any[] = [NOMINATIM_ROW]) {
  const fetchMock = vi.fn(async (url: any) => {
    if (String(url).includes('nominatim')) {
      return { ok: true, json: async () => rows } as any;
    }
    throw new Error('unexpected fetch: ' + url);
  });
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  delete (window as any).google;
  vi.restoreAllMocks();
});

describe('PlacePicker address autocomplete', () => {
  it('falls back to Nominatim when Google resolves with ZERO suggestions', async () => {
    installGoogle([]); // the silent-failure shape
    const fetchMock = mockNominatim();
    const onChange = vi.fn();

    render(<PlacePicker label="Home" value={{ address: '' }} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'whitefield' } });

    await waitFor(() => expect(screen.getByText(/Whitefield, Bengaluru/)).toBeTruthy(), { timeout: 3000 });
    expect(fetchMock.mock.calls.some(c => String(c[0]).includes('nominatim'))).toBe(true);
  });

  it('falls back to Nominatim when the Google call throws', async () => {
    (window as any).google = {
      maps: {
        importLibrary: async () => ({
          AutocompleteSessionToken: class {},
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: vi.fn(async () => { throw new Error('OVER_QUERY_LIMIT'); }),
          },
        }),
      },
    };
    mockNominatim();

    render(<PlacePicker label="Home" value={{ address: '' }} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'whitefield' } });

    await waitFor(() => expect(screen.getByText(/Whitefield, Bengaluru/)).toBeTruthy(), { timeout: 3000 });
  });

  it('emits coordinates when a Nominatim suggestion is picked (so the map can pin it)', async () => {
    installGoogle([]);
    mockNominatim();
    const onChange = vi.fn();

    render(<PlacePicker label="Home" value={{ address: '' }} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'whitefield' } });

    const option = await screen.findByText(/Whitefield, Bengaluru/, {}, { timeout: 3000 });
    fireEvent.click(option);

    await waitFor(() => {
      const withGeo = onChange.mock.calls.map(c => c[0]).filter((v: any) => v.geo);
      expect(withGeo.length).toBeGreaterThan(0);
      expect(withGeo[withGeo.length - 1].geo).toEqual({ lat: 12.9698, lng: 77.75 });
    });
  });

  it('geocodes a typed-but-never-picked address on blur', async () => {
    installGoogle([]);
    mockNominatim();
    const onChange = vi.fn();

    render(<PlacePicker label="Home" value={{ address: '' }} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'whitefield' } });
    fireEvent.blur(input);

    await waitFor(() => {
      const withGeo = onChange.mock.calls.map(c => c[0]).filter((v: any) => v.geo);
      expect(withGeo.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
