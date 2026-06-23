import {
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import { useState, useCallback } from "react";
import { Star, MapPin, ExternalLink } from "lucide-react";
import { useSearchStore } from "../../stores/searchStore";
import type { PlaceMarker } from "../../types";

const COLORS = [
  "#4285F4", "#DB4437", "#F4B400", "#0F9D58",
  "#9C27B0", "#FF9800", "#795548", "#E91E63",
  "#00BCD4", "#607D8B",
];

const colorMap = new Map<string, string>();
let colorIdx = 0;
function getColor(keyword: string): string {
  if (!colorMap.has(keyword)) {
    colorMap.set(keyword, COLORS[colorIdx++ % COLORS.length]);
  }
  return colorMap.get(keyword)!;
}

function MarkerItem({ place }: { place: PlaceMarker }) {
  const [open, setOpen] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const color = getColor(place.keyword);

  const handleClick = useCallback(() => setOpen((o) => !o), []);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: place.latitud, lng: place.longitud }}
        title={place.nombre}
        onClick={handleClick}
      >
        <div
          className="w-3.5 h-3.5 rounded-full border-2 border-white shadow"
          style={{ backgroundColor: color }}
        />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="max-w-[220px] font-sans">
            <strong className="text-sm text-slate-800">{place.nombre}</strong>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-slate-500">{place.keyword}</span>
            </div>
            {place.calificacion != null && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={12} className="text-[#FBBC04] fill-[#FBBC04]" />
                <span className="text-xs font-medium text-slate-700">{place.calificacion}</span>
              </div>
            )}
            {place.direccion_completa && (
              <div className="flex items-start gap-1 mt-0.5">
                <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-500">{place.direccion_completa}</span>
              </div>
            )}
            {place.enlace_maps && (
              <a
                href={place.enlace_maps}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-xs text-[#4285F4] no-underline
                           hover:text-[#3367D6]"
              >
                <ExternalLink size={12} />
                Ver en Maps
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function PlaceMarkers() {
  const markers = useSearchStore((s) => s.markers);
  return (
    <>
      {markers.map((m, i) => (
        <MarkerItem key={`${m.latitud}-${m.longitud}-${i}`} place={m} />
      ))}
    </>
  );
}
