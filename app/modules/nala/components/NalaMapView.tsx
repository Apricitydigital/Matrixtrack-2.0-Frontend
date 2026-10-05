'use client';

import React, { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

/*
 * Map of registered Nalas (Sweeping: GlobalBeatMapView).
 *
 * Each Nala draws its centre-line (when it has one) and one marker per
 * NalaPoint, coloured by the photo count of its latest report:
 *   green = 3+ photos (sent to SI), amber = 1-2 photos, red = none.
 */

type LatLngTuple = [number, number];

function pointPosition(point: any): LatLngTuple | null {
  const lat = Number(point?.pointLatitude ?? point?.geometry?.coordinates?.[1]);
  const lng = Number(point?.pointLongitude ?? point?.geometry?.coordinates?.[0]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function linePositions(geometry: any): LatLngTuple[] {
  if (!geometry?.coordinates || geometry.type === "Point") return [];
  const coords: any[] =
    geometry.type === "MultiLineString" || geometry.type === "Polygon"
      ? geometry.coordinates.flat(1)
      : geometry.coordinates;

  return coords
    .map((item: any) => [Number(item?.[1]), Number(item?.[0])] as LatLngTuple)
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
}

function pointColor(point: any) {
  const photos = Number(point?.submittedPhotoCount || 0);
  if (photos >= 3) return "#16a34a";
  if (photos > 0) return "#d97706";
  return "#dc2626";
}

function FitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [map, positions]);

  return null;
}

export default function NalaMapView({ nalas }: { nalas: any[] }) {
  const allPositions = useMemo(
    () =>
      nalas.flatMap((nala) => [
        ...linePositions(nala.geometry),
        ...(nala.nalaPoints || []).map(pointPosition).filter(Boolean) as LatLngTuple[],
      ]),
    [nalas]
  );

  const center: LatLngTuple = allPositions[0] || [23.1765, 75.7885];

  return (
    <div
      style={{
        height: 620,
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        position: "relative",
      }}
    >
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={20}
        />

        <FitBounds positions={allPositions} />

        {nalas.map((nala) => {
          const line = linePositions(nala.geometry);
          return line.length > 1 ? (
            <Polyline key={`${nala.id}-line`} positions={line} pathOptions={{ color: "#0284c7", weight: 4 }}>
              <Tooltip sticky>{nala.nalaName}</Tooltip>
            </Polyline>
          ) : null;
        })}

        {nalas.flatMap((nala) =>
          (nala.nalaPoints || []).map((point: any) => {
            const position = pointPosition(point);
            if (!position) return null;
            const color = pointColor(point);

            return (
              <CircleMarker
                key={point.id}
                center={position}
                radius={8}
                pathOptions={{ color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 800 }}>{nala.nalaName}</div>
                    <div>{[point.pointCode, point.pointName].filter(Boolean).join(" - ")}</div>
                    <div>Latest report: {Number(point.submittedPhotoCount || 0)}/5 photos</div>
                    <div>Daroga: {point.supervisorAssignedToName || "Unassigned"}</div>
                    <div>Employee: {point.employeeAssignedToName || "Unassigned"}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })
        )}
      </MapContainer>

      <div
        style={{
          position: "absolute",
          right: 12,
          bottom: 12,
          zIndex: 500,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 12,
          padding: "8px 12px",
          fontSize: 11,
          fontWeight: 700,
          color: "#334155",
          display: "flex",
          gap: 12,
        }}
      >
        <span style={{ color: "#16a34a" }}>● 3+ photos</span>
        <span style={{ color: "#d97706" }}>● 1-2 photos</span>
        <span style={{ color: "#dc2626" }}>● Not started</span>
      </div>
    </div>
  );
}
