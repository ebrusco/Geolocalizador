import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import { cellToBoundary } from "h3-js";
import { useTerritoryStore } from "../../stores/territoryStore";

export function HexGrid() {
  const map = useMap();
  const cells = useTerritoryStore((s) => s.cells);
  const polysRef = useRef<google.maps.Polygon[]>([]);

  useEffect(() => {
    if (!map) return;

    polysRef.current.forEach((p) => p.setMap(null));
    polysRef.current = [];

    if (!cells.length) return;

    const newPolys = cells.map((cell) => {
      const boundary = cellToBoundary(cell.h3_index);
      const path = boundary.map(([lat, lng]) => ({ lat, lng }));

      return new google.maps.Polygon({
        map,
        paths: path,
        strokeColor: "#4285F4",
        strokeOpacity: 0.4,
        strokeWeight: 1,
        fillColor: "#4285F4",
        fillOpacity: 0.06,
        clickable: false,
      });
    });

    polysRef.current = newPolys;

    return () => {
      newPolys.forEach((p) => p.setMap(null));
    };
  }, [map, cells]);

  return null;
}
