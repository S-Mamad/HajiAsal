"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  /** Fired when user finishes dragging/panning the map (center settled). */
  onDragEnd?: (lat: number, lng: number) => void;
  className?: string;
}

/**
 * Uber-style picker: pin is CSS-fixed at center; the map pans underneath.
 * Tiles come from same-origin `/api/geo/tiles` so Iranian clients are not
 * blocked on tile.openstreetmap.org.
 */
export function LocationPickerMap({
  lat,
  lng,
  onChange,
  onDragEnd,
  className,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onChangeRef = useRef(onChange);
  const onDragEndRef = useRef(onDragEnd);
  const syncingRef = useRef(false);
  const lastEmittedRef = useRef({ lat, lng });
  const startRef = useRef({ lat, lng });
  onChangeRef.current = onChange;
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;

    const init = () => {
      if (cancelled || mapRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;

      const origin = startRef.current;
      const map = L.map(containerRef.current, {
        center: [origin.lat, origin.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        tapTolerance: 18,
      });

      L.tileLayer("/api/geo/tiles/{z}/{x}/{y}", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap, &copy; CARTO",
      }).addTo(map);

      const emitSettle = () => {
        if (syncingRef.current) return;
        const center = map.getCenter();
        lastEmittedRef.current = { lat: center.lat, lng: center.lng };
        onChangeRef.current(center.lat, center.lng);
        onDragEndRef.current?.(center.lat, center.lng);
      };

      map.on("dragend", emitSettle);
      map.on("zoomend", emitSettle);

      mapRef.current = map;
      map.invalidateSize();
    };

    ro = new ResizeObserver(() => {
      if (!mapRef.current) init();
      else mapRef.current.invalidateSize();
    });
    ro.observe(el);

    const t1 = window.setTimeout(init, 80);
    const t2 = window.setTimeout(() => {
      init();
      mapRef.current?.invalidateSize();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const emitted = lastEmittedRef.current;
    const matchesEmitted =
      Math.abs(emitted.lat - lat) < 0.00005 &&
      Math.abs(emitted.lng - lng) < 0.00005;
    if (matchesEmitted) return;

    const current = map.getCenter();
    if (
      Math.abs(current.lat - lat) > 0.00005 ||
      Math.abs(current.lng - lng) > 0.00005
    ) {
      syncingRef.current = true;
      lastEmittedRef.current = { lat, lng };
      map.setView([lat, lng], map.getZoom(), { animate: true });
      window.setTimeout(() => {
        syncingRef.current = false;
        map.invalidateSize();
      }, 280);
    }
  }, [lat, lng]);

  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <div ref={containerRef} className="h-full min-h-[320px] w-full" />
      <div
        className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center"
        aria-hidden
      >
        <div className="hajiasal-map-center-pin">
          <span className="hajiasal-map-center-pin__head" />
          <span className="hajiasal-map-center-pin__dot" />
          <span className="hajiasal-map-center-pin__tip" />
          <span className="hajiasal-map-center-pin__shadow" />
        </div>
      </div>
    </div>
  );
}
