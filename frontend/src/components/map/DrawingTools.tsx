import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useCallback } from "react";
import { useTerritoryStore } from "../../stores/territoryStore";
import { useUIStore } from "../../stores/uiStore";
import { useDrawingStore } from "../../stores/drawingStore";
import { polygonTerritory } from "../../api/territories";

export function DrawingTools() {
  const map = useMap();
  const mode = useTerritoryStore((s) => s.mode);
  const isRefining = useTerritoryStore((s) => s.isRefining);
  const radiusM = useTerritoryStore((s) => s.radiusM);
  const setTerritory = useTerritoryStore((s) => s.setTerritory);
  const setRefinement = useTerritoryStore((s) => s.setRefinement);
  const addToast = useUIStore((s) => s.addToast);
  const drawMode = useDrawingStore((s) => s.drawMode);

  const pointsRef = useRef<google.maps.LatLng[]>([]);
  const overlaysRef = useRef<google.maps.MVCObject[]>([]);
  const previewPolyRef = useRef<google.maps.Polyline | null>(null);
  const rectStartRef = useRef<google.maps.LatLng | null>(null);
  const rectPreviewRef = useRef<google.maps.Rectangle | null>(null);
  const circlePreviewRef = useRef<google.maps.Circle | null>(null);

  const active = mode === "draw" || isRefining;

  const clearOverlays = useCallback(() => {
    overlaysRef.current.forEach((o: any) => {
      if (o.setMap) o.setMap(null);
    });
    overlaysRef.current = [];
    if (previewPolyRef.current) {
      previewPolyRef.current.setMap(null);
      previewPolyRef.current = null;
    }
    if (rectPreviewRef.current) {
      rectPreviewRef.current.setMap(null);
      rectPreviewRef.current = null;
    }
    if (circlePreviewRef.current) {
      circlePreviewRef.current.setMap(null);
      circlePreviewRef.current = null;
    }
    pointsRef.current = [];
    rectStartRef.current = null;
  }, []);

  const processCoords = useCallback(
    async (coords: number[][]) => {
      if (
        coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1]
      ) {
        coords.push(coords[0]);
      }

      try {
        const result = await polygonTerritory(coords, radiusM);

        if (isRefining) {
          setRefinement(
            result.polygon ?? coords.map((c) => [c[0], c[1]] as [number, number]),
            result.geojson!,
            result.cells,
            result.h3_resolution,
            result.bounds,
            result.area_km2
          );
          addToast(`Zona refinada · ${result.h3_cell_count} zonas`, "ok");
        } else {
          setTerritory({
            id: result.id,
            nombre: result.nombre,
            bounds: result.bounds,
            areaKm2: result.area_km2,
            h3Resolution: result.h3_resolution,
            cells: result.cells,
            polygon: result.polygon ?? null,
            geojson: result.geojson ?? null,
          });
          addToast(`Zona dibujada · ${result.h3_cell_count} zonas`, "ok");
        }
      } catch {
        addToast("Error al procesar la zona.", "error");
      }
    },
    [radiusM, isRefining, setRefinement, setTerritory, addToast]
  );

  useEffect(() => {
    if (!map || !active) {
      clearOverlays();
      return;
    }

    const listeners: google.maps.MapsEventListener[] = [];

    const clickListener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng || !drawMode) return;

      if (drawMode === "polygon") {
        pointsRef.current.push(e.latLng);

        const marker = new google.maps.Marker({
          position: e.latLng,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: "#7C3AED",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          clickable: false,
        });
        overlaysRef.current.push(marker);

        if (previewPolyRef.current) previewPolyRef.current.setMap(null);
        if (pointsRef.current.length > 1) {
          const line = new google.maps.Polyline({
            path: pointsRef.current,
            strokeColor: "#7C3AED",
            strokeOpacity: 0.9,
            strokeWeight: 2,
            map,
          });
          previewPolyRef.current = line;
        }
      } else if (drawMode === "rectangle") {
        if (!rectStartRef.current) {
          rectStartRef.current = e.latLng;
          const marker = new google.maps.Marker({
            position: e.latLng,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: "#7C3AED",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
            clickable: false,
          });
          overlaysRef.current.push(marker);
        } else {
          const sw = rectStartRef.current;
          const ne = e.latLng;
          const bounds = new google.maps.LatLngBounds(
            { lat: Math.min(sw.lat(), ne.lat()), lng: Math.min(sw.lng(), ne.lng()) },
            { lat: Math.max(sw.lat(), ne.lat()), lng: Math.max(sw.lng(), ne.lng()) }
          );
          const coords: number[][] = [
            [bounds.getNorthEast().lat(), bounds.getSouthWest().lng()],
            [bounds.getNorthEast().lat(), bounds.getNorthEast().lng()],
            [bounds.getSouthWest().lat(), bounds.getNorthEast().lng()],
            [bounds.getSouthWest().lat(), bounds.getSouthWest().lng()],
          ];
          clearOverlays();
          processCoords(coords);
        }
      } else if (drawMode === "circle") {
        if (!rectStartRef.current) {
          rectStartRef.current = e.latLng;
          const marker = new google.maps.Marker({
            position: e.latLng,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: "#7C3AED",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
            clickable: false,
          });
          overlaysRef.current.push(marker);
        } else {
          const center = rectStartRef.current;
          const edge = e.latLng;
          const r = google.maps.geometry.spherical.computeDistanceBetween(center, edge);
          const points = 36;
          const coords: number[][] = [];
          for (let i = 0; i < points; i++) {
            const angle = (i / points) * 360;
            const pt = google.maps.geometry.spherical.computeOffset(center, r, angle);
            coords.push([pt.lat(), pt.lng()]);
          }
          clearOverlays();
          processCoords(coords);
        }
      }
    });
    listeners.push(clickListener);

    const dblClickListener = map.addListener("dblclick", (e: google.maps.MapMouseEvent) => {
      if (drawMode !== "polygon" || pointsRef.current.length < 3) return;
      if (e.stop) e.stop();

      const coords = pointsRef.current.map((p) => [p.lat(), p.lng()]);
      clearOverlays();
      processCoords(coords);
    });
    listeners.push(dblClickListener);

    const moveListener = map.addListener("mousemove", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      if (drawMode === "rectangle" && rectStartRef.current) {
        if (rectPreviewRef.current) rectPreviewRef.current.setMap(null);
        const sw = rectStartRef.current;
        const ne = e.latLng;
        rectPreviewRef.current = new google.maps.Rectangle({
          bounds: new google.maps.LatLngBounds(
            { lat: Math.min(sw.lat(), ne.lat()), lng: Math.min(sw.lng(), ne.lng()) },
            { lat: Math.max(sw.lat(), ne.lat()), lng: Math.max(sw.lng(), ne.lng()) }
          ),
          strokeColor: "#7C3AED",
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: "#8B5CF6",
          fillOpacity: 0.1,
          clickable: false,
          map,
        });
      }

      if (drawMode === "circle" && rectStartRef.current) {
        if (circlePreviewRef.current) circlePreviewRef.current.setMap(null);
        const center = rectStartRef.current;
        const r = google.maps.geometry.spherical.computeDistanceBetween(center, e.latLng);
        circlePreviewRef.current = new google.maps.Circle({
          center,
          radius: r,
          strokeColor: "#7C3AED",
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: "#8B5CF6",
          fillOpacity: 0.1,
          clickable: false,
          map,
        });
      }
    });
    listeners.push(moveListener);

    return () => {
      listeners.forEach((l) => google.maps.event.removeListener(l));
      clearOverlays();
    };
  }, [map, active, drawMode, isRefining, clearOverlays, processCoords]);

  return null;
}
