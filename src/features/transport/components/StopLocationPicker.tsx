import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface StopLocationPickerProps {
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
  onPick: (latitude: number, longitude: number) => void;
}

/** Small OpenStreetMap view where clicking sets the stop's position; the circle shows the arrival radius. Loaded lazily with the stop form. */
export default function StopLocationPicker({ latitude, longitude, radiusMeters, onPick }: StopLocationPickerProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current).setView([latitude ?? 11.25, longitude ?? 75.78], latitude != null ? 17 : 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    map.current.on("click", (e: L.LeafletMouseEvent) => onPickRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))));
    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
      circle.current = null;
    };
    // The map is created once; the position and radius are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (latitude == null || longitude == null) {
      marker.current?.remove();
      circle.current?.remove();
      marker.current = null;
      circle.current = null;
      return;
    }
    const at: L.LatLngExpression = [latitude, longitude];
    if (!marker.current) marker.current = L.marker(at).addTo(map.current);
    else marker.current.setLatLng(at);
    if (!circle.current) circle.current = L.circle(at, { radius: radiusMeters, color: "#D68F14", weight: 2 }).addTo(map.current);
    else circle.current.setLatLng(at).setRadius(radiusMeters);
    map.current.setView(at, Math.max(map.current.getZoom(), 17));
  }, [latitude, longitude, radiusMeters]);

  return <div ref={el} role="application" aria-label="Map: click to set the stop location" className="h-56 w-full rounded-lg overflow-hidden border border-border" />;
}
