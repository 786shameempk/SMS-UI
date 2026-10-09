import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface BusMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  /** Compass heading in degrees; rotates the arrow when known. */
  heading?: number;
  /** Dim a bus that has not reported recently. */
  stale?: boolean;
}

interface BusMapProps {
  markers: BusMapMarker[];
  /** Describes the map for screen readers. */
  label: string;
  className?: string;
}

function busIcon(m: BusMapMarker) {
  const rotate = m.heading == null ? "" : `transform:rotate(${m.heading}deg);`;
  const background = m.stale ? "#8A8D99" : "#D68F14";
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${background};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff;font-size:16px;${rotate}">&#9650;</div>`,
  });
}

/**
 * OpenStreetMap view of one or more buses (one for a parent, the whole fleet for admin/principal). Loaded lazily by the
 * screens that use it, so Leaflet stays out of the main bundle. The map re-fits only when the set of buses changes, so
 * it does not fight a user who has panned or zoomed.
 */
export default function BusMap({ markers, label, className }: BusMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fittedFor = useRef("");

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current).setView([markers[0]?.latitude ?? 11.25, markers[0]?.longitude ?? 75.78], 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
      layer.current = null;
      fittedFor.current = "";
    };
    // The map is created once; marker changes are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    markers.forEach((m) => L.marker([m.latitude, m.longitude], { icon: busIcon(m), title: m.label, alt: m.label }).bindTooltip(m.label).addTo(layer.current!));

    const ids = markers
      .map((m) => m.id)
      .sort()
      .join(",");
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.current.panTo([markers[0].latitude, markers[0].longitude]);
    } else if (ids !== fittedFor.current) {
      map.current.fitBounds(L.latLngBounds(markers.map((m) => [m.latitude, m.longitude] as [number, number])), { padding: [40, 40], maxZoom: 16 });
    }
    fittedFor.current = ids;
  }, [markers]);

  return <div ref={el} role="img" aria-label={label} className={className ?? "h-72 w-full rounded-lg overflow-hidden border border-border"} />;
}
