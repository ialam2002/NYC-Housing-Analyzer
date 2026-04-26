"use client";

import { useState } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import { Popup } from "react-map-gl/mapbox";

import type { TransitStationSummary } from "@/types/property";

type PropertyMapCardProps = {
  title: string;
  latitude: number;
  longitude: number;
  stations: TransitStationSummary[];
};

export function PropertyMapCard({ title, latitude, longitude, stations }: PropertyMapCardProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const stationMarkers = stations.filter(
    (station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude),
  );
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const hoveredStation = stationMarkers.find((s) => s.stationId === hoveredStationId);

  if (!token) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Map</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to enable the interactive map.
        </p>
      </div>
    );
  }

  if (!hasCoords) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Map</h2>
        <p className="mt-2 text-sm text-muted-foreground">Map coordinates are not available for this listing.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">Map</h2>
      <div className="mt-3 h-72 overflow-hidden rounded-md border">
        <Map
          initialViewState={{
            latitude,
            longitude,
            zoom: 13,
          }}
          mapboxAccessToken={token}
          mapStyle="mapbox://styles/mapbox/light-v11"
          reuseMaps
          attributionControl={false}
        >
          <Marker latitude={latitude} longitude={longitude}>
            <div className="h-3 w-3 rounded-full bg-primary ring-4 ring-primary/25" aria-label={title} />
          </Marker>
          {stationMarkers.map((station) => (
            <Marker key={station.stationId} latitude={station.latitude} longitude={station.longitude}>
              <div
                onMouseEnter={() => setHoveredStationId(station.stationId)}
                onMouseLeave={() => setHoveredStationId(null)}
                className="h-2.5 w-2.5 rounded-full bg-foreground/80 ring-2 ring-background"
                aria-label={`Station ${station.name}`}
              />
            </Marker>
          ))}
          {hoveredStation && (
            <Popup latitude={hoveredStation.latitude} longitude={hoveredStation.longitude} anchor="bottom">
              <div className="rounded-md bg-background px-3 py-2 text-xs text-foreground shadow-md">
                <p className="font-semibold">{hoveredStation.name}</p>
                <p className="text-muted-foreground">{hoveredStation.lines.join(", ")}</p>
                <p className="text-muted-foreground">{hoveredStation.walkingMinutes} min walk</p>
              </div>
            </Popup>
          )}
        </Map>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Centered on {title}. Nearby transit links tracked: {stations.length}. Markers shown: {stationMarkers.length}.
      </p>
    </div>
  );
}


