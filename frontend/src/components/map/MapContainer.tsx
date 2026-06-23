import { Map } from "@vis.gl/react-google-maps";
import { HexGrid } from "./HexGrid";
import { TerritoryOverlay } from "./TerritoryOverlay";
import { PlaceMarkers } from "./PlaceMarkers";
import { DrawingTools } from "./DrawingTools";

export function MapContainer() {
  return (
    <Map
      defaultCenter={{ lat: -38.4, lng: -63.6 }}
      defaultZoom={5}
      mapId="prospectoai-map"
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={true}
      fullscreenControl={true}
      streetViewControl={false}
      className="w-full h-full"
    >
      <TerritoryOverlay />
      <HexGrid />
      <PlaceMarkers />
      <DrawingTools />
    </Map>
  );
}
