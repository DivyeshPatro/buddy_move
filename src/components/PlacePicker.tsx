import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Loader } from 'lucide-react';
import { loadGoogleMaps, googleMapsEnabled } from '../lib/googleMaps';
import type { GeoPoint } from '../types';

export interface PlaceValue {
  address: string;
  geo?: GeoPoint;
}

interface PlacePickerProps {
  label: string;
  placeholder?: string;
  value: PlaceValue;
  onChange: (v: PlaceValue) => void;
}

interface Suggestion {
  id: string;
  text: string;
  prediction?: any; // google.maps.places.PlacePrediction
  osmPrediction?: {
    isNominatim: boolean;
    formattedAddress: string;
    lat: number;
    lng: number;
  };
}

// Shared OpenStreetMap/Nominatim lookup used both for autocomplete suggestions
// and for resolving a typed-but-never-picked address into coordinates.
// Nominatim's usage policy asks for an identifying header and rejects requests
// it considers abusive, so keep the limit small and the query debounced.
async function nominatimSearch(text: string, limit: number): Promise<Suggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&countrycodes=in&limit=${limit}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json', 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((item: any) => item && item.display_name && item.lat && item.lon)
    .map((item: any, idx: number) => ({
      id: `osm_${item.place_id || idx}`,
      text: item.display_name,
      osmPrediction: {
        isNominatim: true,
        formattedAddress: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
      },
    }));
}

export default function PlacePicker({ label, placeholder, value, onChange }: PlacePickerProps) {
  const [query, setQuery] = useState(value.address || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingSug, setLoadingSug] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const placesRef = useRef<any>(null);   // imported places library (New)
  const tokenRef = useRef<any>(null);    // autocomplete session token
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Ensure the Places (New) library is loaded. Idempotent and RETRYABLE — if the
  // first attempt fails (transient network/quota, or a poisoned loader after an
  // HMR reload), the next call (e.g. the user typing) tries again instead of
  // silently staying broken.
  const ensureLib = useCallback(async (): Promise<any | null> => {
    if (placesRef.current?.AutocompleteSuggestion) return placesRef.current;
    if (!googleMapsEnabled) return null;
    try {
      await loadGoogleMaps();
      const g = (window as any).google;
      if (!g?.maps?.importLibrary) return null;
      placesRef.current = await g.maps.importLibrary('places');
      if (!tokenRef.current) tokenRef.current = new placesRef.current.AutocompleteSessionToken();
      return placesRef.current;
    } catch (e: any) {
      console.warn('[places] library load failed (will retry on next input):', e?.message || e);
      return null;
    }
  }, []);

  // Warm the library on mount (best-effort; typing will retry if this fails).
  useEffect(() => { ensureLib(); }, [ensureLib]);

  // Keep the field in sync if the parent resets/changes the value externally.
  useEffect(() => { setQuery(value.address || ''); }, [value.address]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const fetchSuggestions = async (text: string) => {
    setNoResults(false);
    if (text.trim().length < 3) { setSuggestions([]); setOpen(false); return; }

    const fetchOSM = async (): Promise<boolean> => {
      setLoadingSug(true);
      try {
        const list = await nominatimSearch(text, 5);
        setSuggestions(list);
        // Open the panel even with zero hits so we can explain the empty result.
        // Rendering nothing at all is indistinguishable from a broken field —
        // OpenStreetMap has no entry for most individual business names, so this
        // is a normal outcome that the user needs told, not hidden.
        setNoResults(list.length === 0);
        setOpen(true);
        return list.length > 0;
      } catch (e: any) {
        console.warn('[nominatim] suggest failed:', e?.message || e);
        setSuggestions([]);
        setNoResults(true);
        setOpen(true);
        return false;
      } finally {
        setLoadingSug(false);
      }
    };

    // 1. Attempt Google Places (New) first if enabled.
    const places = placesRef.current?.AutocompleteSuggestion ? placesRef.current : await ensureLib();
    if (places?.AutocompleteSuggestion) {
      setLoadingSug(true);
      try {
        const res = await places.AutocompleteSuggestion
          .fetchAutocompleteSuggestions({ input: text, sessionToken: tokenRef.current, includedRegionCodes: ['in'] });
        const list: Suggestion[] = (res?.suggestions || [])
          .filter((s: any) => s.placePrediction)
          .map((s: any) => ({
            id: s.placePrediction.placeId,
            text: s.placePrediction.text?.text || '',
            prediction: s.placePrediction
          }));
        setLoadingSug(false);
        // An EMPTY Google response is the common failure mode once billing,
        // quota or API-key referrer restrictions kick in: the call resolves
        // successfully with zero predictions instead of throwing. Previously we
        // accepted that as "no results" and the dropdown stayed empty forever.
        // Treat it the same as an error and fall through to Nominatim.
        if (list.length > 0) {
          setSuggestions(list);
          setOpen(true);
          return;
        }
        console.warn('[places] returned 0 suggestions — falling back to Nominatim');
        await fetchOSM();
      } catch (e: any) {
        console.warn('[places] suggest failed, falling back to Nominatim:', e?.message || e);
        setLoadingSug(false);
        await fetchOSM();
      }
      return;
    }

    // 2. Google unavailable (no key / load failure) → OpenStreetMap (Nominatim).
    await fetchOSM();
  };

  const handleInput = (text: string) => {
    setQuery(text);
    onChange({ address: text, geo: undefined }); // typed text → no coords until a suggestion is picked
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 250);
  };

  // The map only renders a pin once the field carries coordinates, and coords
  // were only ever set by clicking a suggestion. If the user typed a full
  // address and tabbed away (or no suggestion list appeared at all) the value
  // stayed geo-less and the route map stayed blank. Geocode on blur to close
  // that gap.
  const resolveGeoOnBlur = async () => {
    const text = query.trim();
    if (!text || text.length < 3 || value.geo) return;
    try {
      const [best] = await nominatimSearch(text, 1);
      if (!best?.osmPrediction) return;
      // Attach coordinates but KEEP what the user typed. Silently rewriting the
      // field to Nominatim's formatted address is jarring and, on a loose match,
      // wrong. The "Location pinned" hint below the input lets them sanity-check
      // the result and retype if the pin looks off.
      onChange({ address: text, geo: { lat: best.osmPrediction.lat, lng: best.osmPrediction.lng } });
    } catch (e: any) {
      console.warn('[nominatim] blur geocode failed:', e?.message || e);
    }
  };

  const selectSuggestion = async (s: Suggestion) => {
    setOpen(false);
    setQuery(s.text);

    // If it's a Nominatim prediction
    if (s.osmPrediction) {
      onChange({
        address: s.osmPrediction.formattedAddress,
        geo: { lat: s.osmPrediction.lat, lng: s.osmPrediction.lng }
      });
      return;
    }

    // Google Places prediction
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location'] });
      const loc = place.location;
      const geo: GeoPoint | undefined = loc
        ? { lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat, lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng }
        : undefined;
      onChange({ address: place.formattedAddress || s.text, geo });
      // Start a fresh session after a completed selection (billing best-practice).
      tokenRef.current = new placesRef.current.AutocompleteSessionToken();
    } catch (e: any) {
      console.warn('[places] fetchFields failed:', e?.message || e);
      onChange({ address: s.text, geo: undefined });
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-xs font-semibold !text-[#b57e00] uppercase tracking-wider mb-1">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-4 h-4 !text-[#2a2e34]/40 z-10" />
        <input
          type="text"
          placeholder={placeholder || 'Search address…'}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          onBlur={() => { setTimeout(resolveGeoOnBlur, 200); }} // delay so a suggestion click wins
          autoComplete="off"
          style={{ paddingLeft: '2.5rem' }}
          className="w-full !bg-[#eef0f3] border !border-[#ffb300]/25 rounded-xl py-2.5 !pl-10 pr-9 !text-[#2a2e34] placeholder-[#2a2e34]/40 text-sm focus:outline-none focus:!border-[#ffb300]"
        />
        {loadingSug && <Loader className="absolute right-3 top-3 w-4 h-4 animate-spin !text-[#b57e00]" />}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 !bg-white border !border-[#ffb300]/25 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSuggestion(s)}
              className="w-full text-left px-3 py-2.5 text-xs !text-[#2a2e34] hover:!bg-[#ffb300]/10 flex items-start gap-2 border-b !border-[#ffb300]/5 last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 !text-[#b57e00] mt-0.5 shrink-0" />
              <span className="leading-snug">{s.text}</span>
            </button>
          ))}
        </div>
      )}

      {open && noResults && !loadingSug && (
        <div className="absolute z-30 left-0 right-0 mt-1 !bg-white border !border-[#ffb300]/25 rounded-xl shadow-2xl p-3">
          <p className="text-xs font-semibold !text-[#2a2e34]">No matching places found</p>
          <p className="text-[11px] !text-[#2a2e34]/60 leading-snug mt-1">
            Address search uses OpenStreetMap, which maps areas and landmarks rather than
            individual company names. Try the locality instead — e.g. <span className="font-medium">Gachibowli</span>,{' '}
            <span className="font-medium">Hitech City</span> — or a nearby landmark, then fine-tune the pin.
          </p>
        </div>
      )}

      {value.geo && (
        <p className="text-[11px] !text-emerald-600/80 mt-1">📍 Location pinned ({value.geo.lat.toFixed(4)}, {value.geo.lng.toFixed(4)})</p>
      )}
    </div>
  );
}

