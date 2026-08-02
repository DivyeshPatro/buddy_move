import { randomUUID } from "crypto";
import type { GeoPoint } from "../src/types";
import { logger } from "./logger";
import { TtlCache, cacheGet, cacheSet } from "./cache";

const FALLBACK_KM = 8;
const ROUTE_CACHE_TTL = 3600_000;
const GEO_CACHE_TTL = 3600_000;

export interface DistanceResult {
  km: number;
  durationMin: number;
  source: "ors" | "estimate" | "haversine";
  fallbackReason?: string;
}

const cache = new TtlCache<DistanceResult>("route", { maxSize: 2000, defaultTTL: ROUTE_CACHE_TTL });
const geoCache = new TtlCache<GeoPoint>("geo", { maxSize: 2000, defaultTTL: GEO_CACHE_TTL });

export function mapsConfigured(): boolean {
  return !!process.env.OPENROUTESERVICE_API_KEY;
}

/**
 * Convert great-circle meters to estimated road km (× 1.35 winding factor).
 */
function haversineKm(origin: GeoPoint, destination: GeoPoint): number {
  const meters = haversineMeters(origin, destination);
  return Math.max(1, Math.round((meters / 1000) * 1.35 * 10) / 10);
}

/**
 * Try to geocode both addresses, then return a haversine-based road estimate.
 * Returns null if either address cannot be geocoded.
 */
async function estimateFromGeocode(origin: string, destination: string): Promise<{ km: number; durationMin: number } | null> {
  const [originGeo, destGeo] = await Promise.all([geocode(origin), geocode(destination)]);
  if (originGeo && destGeo) {
    const km = haversineKm(originGeo, destGeo);
    return { km, durationMin: Math.round(km * 3) };
  }
  return null;
}

export async function getDistanceKm(origin: string, destination: string): Promise<DistanceResult> {
  const distanceStart = Date.now();
  const o = origin?.trim().toLowerCase();
  const d = destination?.trim().toLowerCase();
  if (o && d && o === d) {
    return { km: 0, durationMin: 0, source: "estimate" };
  }
  const orsKey = process.env.OPENROUTESERVICE_API_KEY;
  const cacheKey = `${origin}|${destination}`.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const redisCached = await cacheGet<DistanceResult>("route", cacheKey);
  if (redisCached) {
    cache.set(cacheKey, redisCached);
    return redisCached;
  }

  // Helper: on API failure, fall back to geocode→haversine before flat constant.
  async function apiFallback(reason: string): Promise<DistanceResult> {
    const geo = await estimateFromGeocode(origin, destination);
    if (geo) {
      return { km: geo.km, durationMin: geo.durationMin, source: "haversine", fallbackReason: reason };
    }
    return { km: FALLBACK_KM, durationMin: FALLBACK_KM * 3, source: "estimate", fallbackReason: reason };
  }

  // If OpenRouteService is configured, prefer it for the Leaflet + OSM stack!
  if (orsKey) {
    const originGeo = await geocode(origin);
    const destGeo = await geocode(destination);
    if (originGeo && destGeo) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const fetchStart = Date.now();
        const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "Authorization": orsKey
          },
          body: JSON.stringify({
            coordinates: [
              [originGeo.lng, originGeo.lat],
              [destGeo.lng, destGeo.lat]
            ]
          })
        });
        clearTimeout(timeout);
        const fetchMs = Date.now() - fetchStart;
        if (fetchMs > 2000) {
          console.log("ACT_TIMING: getDistanceKm ORS fetch slow", { origin, destination, ms: fetchMs });
        }
        if (res.ok) {
          const data: any = await res.json();
          const route = data.routes?.[0];
          if (route?.summary) {
            const km = Number((route.summary.distance / 1000).toFixed(2));
            const durationMin = Math.round(route.summary.duration / 60);
            const result: DistanceResult = { km, durationMin, source: "ors" };
            cache.set(cacheKey, result);
            await cacheSet("route", cacheKey, result, ROUTE_CACHE_TTL);
            return result;
          }
        }
      } catch (e: any) {
        clearTimeout(timeout);
        logger.debug({ err: e }, "[maps] OpenRouteService directions API failed");
      }
    }
  }

  const reason = "OPENROUTESERVICE_API_KEY not configured in environment";
  logger.debug({ reason }, "[maps] API key missing or route lookup failed");
  const result = await apiFallback(reason);
  const totalMs = Date.now() - distanceStart;
  if (totalMs > 2000) {
    console.log("ACT_TIMING: getDistanceKm slow", { origin, destination, ms: totalMs, source: result.source, fallback: true });
  }
  return result;
}

export async function geocode(address: string): Promise<GeoPoint | null> {
  if (!address) return null;
  const ck = address.trim().toLowerCase();
  const hit = geoCache.get(ck);
  if (hit) return hit;

  const redisHit = await cacheGet<GeoPoint>("geo", ck);
  if (redisHit) {
    geoCache.set(ck, redisHit);
    return redisHit;
  }

  const orsKey = process.env.OPENROUTESERVICE_API_KEY;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    if (orsKey) {
      // Use OpenRouteService geocoding (Pelias)
      const url = `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(address)}&boundary.country=IN&size=1`;
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      const data: any = await res.json();
      if (data.features && data.features.length > 0) {
        const coords = data.features[0].geometry.coordinates; // [lng, lat]
        const pt: GeoPoint = { lat: coords[1], lng: coords[0] };
        geoCache.set(ck, pt);
        await cacheSet("geo", ck, pt, GEO_CACHE_TTL);
        return pt;
      }
    }

    // Fallback to OpenStreetMap (Nominatim) free geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=in&limit=1`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "MoveBuddy/1.0" }
    });
    clearTimeout(t);
    const data: any = await res.json();
    if (data && data.length > 0) {
      const pt: GeoPoint = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
      geoCache.set(ck, pt);
      await cacheSet("geo", ck, pt, GEO_CACHE_TTL);
      return pt;
    }
    return null;
  } catch (e: any) {
    clearTimeout(t);
    logger.debug({ err: e, address }, "[maps] geocode request failed");
    return null;
  }
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
