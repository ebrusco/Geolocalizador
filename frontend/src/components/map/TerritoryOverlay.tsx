import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import { useTerritoryStore } from "../../stores/territoryStore";

export function TerritoryOverlay() {
  const map = useMap();
  const bounds = useTerritoryStore((s) => s.bounds);
  const polygon = useTerritoryStore((s) => s.polygon);
  const refinedPolygon = useTerritoryStore((s) => s.refinedPolygon);
  const mainRef = useRef<google.maps.Polygon | google.maps.Rectangle | null>(null);
  const refinedRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    if (mainRef.current) {
      mainRef.current.setMap(null);
      mainRef.current = null;
    }
    if (refinedRef.current) {
      refinedRef.current.setMap(null);
      refinedRef.current = null;
    }

    const hasRefinement = refinedPolygon && refinedPolygon.length > 0;

    if (polygon && polygon.length > 0) {
      const path = polygon.map(([lat, lng]) => ({ lat, lng }));
      const poly = new google.maps.Polygon({
        map,
        paths: path,
        strokeColor: "#1D4ED8",
        strokeOpacity: hasRefinement ? 0.4 : 0.8,
        strokeWeight: hasRefinement ? 1 : 2,
        fillColor: "#3B82F6",
        fillOpacity: hasRefinement ? 0.03 : 0.08,
        clickable: false,
      });
      mainRef.current = poly;

      if (!hasRefinement) {
        const gBounds = new google.maps.LatLngBounds();
        path.forEach((p) => gBounds.extend(p));
        map.fitBounds(gBounds);
      }
    } else if (bounds && !hasRefinement) {
      const rect = new google.maps.Rectangle({
        map,
        bounds: new google.maps.LatLngBounds(
          { lat: bounds.south, lng: bounds.west },
          { lat: bounds.north, lng: bounds.east },
        ),
        strokeColor: "#1D4ED8",
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: "#3B82F6",
        fillOpacity: 0.06,
        clickable: false,
      });
      mainRef.current = rect;

      map.fitBounds(
        new google.maps.LatLngBounds(
          { lat: bounds.south, lng: bounds.west },
          { lat: bounds.north, lng: bounds.east },
        ),
      );
    }

    if (hasRefinement) {
      const refinedPath = refinedPolygon.map(([lat, lng]) => ({ lat, lng }));
      const rPoly = new google.maps.Polygon({
        map,
        paths: refinedPath,
        strokeColor: "#7C3AED",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#8B5CF6",
        fillOpacity: 0.12,
        clickable: false,
      });
      refinedRef.current = rPoly;

      const rBounds = new google.maps.LatLngBounds();
      refinedPath.forEach((p) => rBounds.extend(p));
      map.fitBounds(rBounds);
    }

    return () => {
      if (mainRef.current) mainRef.current.setMap(null);
      if (refinedRef.current) refinedRef.current.setMap(null);
    };
  }, [map, bounds, polygon, refinedPolygon]);

  return null;
}
