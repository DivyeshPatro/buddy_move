// @ts-nocheck
import React, { useEffect, useRef } from 'react';

interface GeoPoint {
  lat: number;
  lng: number;
}

interface RouteMapProps {
  originGeo?: GeoPoint;
  destinationGeo?: GeoPoint;
  originAddress?: string;
  destinationAddress?: string;
}

export default function RouteMap({
  originGeo,
  destinationGeo,
  originAddress,
  destinationAddress,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Leaflet is delivered by a CDN <script> in index.html. If that script has
    // not executed yet (slow network) or was injected late, window.L is still
    // undefined — and the previous code just bailed out permanently, leaving a
    // blank grey box that never recovered. Poll until Leaflet appears, but give
    // up after ~10s so a blocked CDN cannot leave a timer running forever.
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // 40 × 250ms
    const run = () => {
      if (cancelled) return;
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) {
        if (attempts++ >= MAX_ATTEMPTS) {
          console.warn('[map] Leaflet did not load — check the CDN <script> in index.html');
          return;
        }
        retryRef.current = window.setTimeout(run, 250);
        return;
      }
      draw(L);
    };

    const draw = (L: any) => {
    // Initialize the map if not already done
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([20.5937, 78.9629], 5); // Default center of India

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear previous markers & lines
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const points: any[] = [];

    // Custom icons
    const startIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg text-white font-black text-xs">A</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const endIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-8 h-8 rounded-full bg-[#ffb300] border-2 border-white flex items-center justify-center shadow-lg text-[#2a2e34] font-black text-xs">B</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (originGeo && originGeo.lat && originGeo.lng) {
      const originLatlng = [originGeo.lat, originGeo.lng];
      points.push(originLatlng);
      const markerA = L.marker(originLatlng, { icon: startIcon })
        .addTo(map)
        .bindPopup(`<b>Pickup:</b> ${originAddress || 'Origin'}`);
      markersRef.current.push(markerA);
    }

    if (destinationGeo && destinationGeo.lat && destinationGeo.lng) {
      const destLatlng = [destinationGeo.lat, destinationGeo.lng];
      points.push(destLatlng);
      const markerB = L.marker(destLatlng, { icon: endIcon })
        .addTo(map)
        .bindPopup(`<b>Drop:</b> ${destinationAddress || 'Destination'}`);
      markersRef.current.push(markerB);
    }

    if (points.length === 2) {
      // Draw a solid matching route line
      const polyline = L.polyline(points, {
        color: '#b57e00',
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.8,
      }).addTo(map);
      polylineRef.current = polyline;

      // Fit bounds
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }

    // Force map size refresh in case container was resized
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
    };

    run();
    return () => {
      cancelled = true;
      if (retryRef.current) window.clearTimeout(retryRef.current);
    };
  }, [originGeo, destinationGeo, originAddress, destinationAddress]);

  return (
    <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden border border-[#ffb300]/15 shadow-inner bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute bottom-2 left-2 z-10 bg-white/95 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-[#2a2e34]/70 font-mono border border-slate-200">
        🍃 OpenStreetMap &amp; Leaflet
      </div>
    </div>
  );
}
