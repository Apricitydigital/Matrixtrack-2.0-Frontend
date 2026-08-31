'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { BeatMapItem, PointMapItem, WorkState } from './types';

const MODULE_COLORS = {
  beat: '#4F46E5',
  bin: '#7C3AED',
  toilet: '#0891B2',
} as const;
const STATE_COLORS: Record<WorkState, string> = {
  NOT_STARTED: '#94a3b8',
  SUBMITTED: '#2563eb',
  APPROVED: '#10b981',
  ATTENTION: '#f59e0b',
};

function geometryToFeature(geometry: any) {
  if (!geometry) return null;
  if (geometry.type === 'Feature') return geometry;
  if (geometry.type === 'FeatureCollection') return geometry;
  if (geometry.type && geometry.coordinates) return { type: 'Feature', properties: {}, geometry };
  return null;
}

function markerIcon(
  kind: 'toilet' | 'bin',
  state: WorkState,
) {
  const moduleColor =
    kind === 'toilet'
      ? MODULE_COLORS.toilet
      : MODULE_COLORS.bin;

  const statusColor = STATE_COLORS[state];

  const glyph =
    kind === 'toilet'
      ? `
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="7" cy="5" r="2"/>
          <path d="M4 21v-5H2.5L5 9h4l2.5 7H10v5"/>
          <circle cx="17" cy="5" r="2"/>
          <path d="M15 9v12"/>
          <path d="M19 9v12"/>
          <path d="M14 14h6"/>
        </svg>
      `
      : `
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 10v6M14 10v6" />
        </svg>
      `;

  return L.divIcon({
    className: '',
    html: `
      <div
        style="
          position:relative;
          width:38px;
          height:38px;
          border-radius:${kind === 'toilet' ? '11px' : '50%'};
          background:${moduleColor};
          border:3px solid ${statusColor};
          box-shadow:
            0 6px 18px rgba(15,23,42,.28),
            0 0 0 2px rgba(255,255,255,.95);
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
        "
      >
        ${glyph}

        <span
          style="
            position:absolute;
            right:-3px;
            bottom:-3px;
            width:10px;
            height:10px;
            border-radius:50%;
            background:${statusColor};
            border:2px solid white;
            box-shadow:0 2px 6px rgba(15,23,42,.22);
          "
        ></span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}

type MapFocusLevel = 'CITY' | 'ZONE' | 'WARD' | 'SUPERVISOR';

function FitAssets({
  beats,
  toilets,
  bins,
  focusLevel,
}: {
  beats: BeatMapItem[];
  toilets: PointMapItem[];
  bins: PointMapItem[];
  focusLevel: MapFocusLevel;
}) {
  const map = useMap();

  useEffect(() => {
    type Candidate = {
      center: L.LatLng;
      bounds?: L.LatLngBounds;
    };

    const candidates: Candidate[] = [];

    beats.forEach((beat) => {
      const feature = geometryToFeature(
        beat.geometry,
      );

      if (!feature) return;

      try {
        const beatBounds =
          L.geoJSON(feature).getBounds();

        if (!beatBounds.isValid()) return;

        const center =
          beatBounds.getCenter();

        const northEast =
          beatBounds.getNorthEast();

        const southWest =
          beatBounds.getSouthWest();

        const hasValidCoordinates =
          Math.abs(center.lat) <= 90 &&
          Math.abs(center.lng) <= 180 &&
          Math.abs(center.lat) > 0.01 &&
          Math.abs(center.lng) > 0.01;

        /*
         * Reject abnormally large legacy polygons.
         * Municipal beats should never span hundreds
         * of kilometres.
         */
        const hasReasonableAssetSize =
          Math.abs(
            northEast.lat - southWest.lat,
          ) <= 0.5 &&
          Math.abs(
            northEast.lng - southWest.lng,
          ) <= 0.5;

        if (
          hasValidCoordinates &&
          hasReasonableAssetSize
        ) {
          candidates.push({
            center,
            bounds: beatBounds,
          });
        }
      } catch {
        // Ignore malformed legacy geometry.
      }
    });

    [...toilets, ...bins].forEach(
      (item) => {
        const latitude =
          Number(item.latitude);

        const longitude =
          Number(item.longitude);

        if (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          Math.abs(latitude) <= 90 &&
          Math.abs(longitude) <= 180 &&
          Math.abs(latitude) > 0.01 &&
          Math.abs(longitude) > 0.01
        ) {
          candidates.push({
            center: L.latLng(
              latitude,
              longitude,
            ),
          });
        }
      },
    );

    if (!candidates.length) return;

    const median = (
      values: number[],
    ) => {
      const sorted = [...values].sort(
        (a, b) => a - b,
      );

      return sorted[
        Math.floor(sorted.length / 2)
      ];
    };

    /*
     * Robust city centre.
     * A single wrong coordinate cannot pull
     * the map hundreds of kilometres away.
     */
    const cityCenter = L.latLng(
      median(
        candidates.map(
          (candidate) =>
            candidate.center.lat,
        ),
      ),
      median(
        candidates.map(
          (candidate) =>
            candidate.center.lng,
        ),
      ),
    );

    /*
     * Automatically tighten the valid radius
     * as the user applies filters.
     */
    const radiusMeters =
      focusLevel === 'WARD'
        ? 12000
        : focusLevel === 'SUPERVISOR'
          ? 15000
          : focusLevel === 'ZONE'
            ? 20000
            : 35000;

    const nearbyCandidates =
      candidates.filter(
        (candidate) =>
          cityCenter.distanceTo(
            candidate.center,
          ) <= radiusMeters,
      );

    /*
     * Only use the tight cluster if it contains
     * most of the returned assets.
     */
    const requiredClusterSize =
      Math.max(
        1,
        Math.ceil(
          candidates.length * 0.6,
        ),
      );

    const usableCandidates =
      nearbyCandidates.length >=
        requiredClusterSize
        ? nearbyCandidates
        : candidates;

    const bounds =
      L.latLngBounds([]);

    usableCandidates.forEach(
      (candidate) => {
        bounds.extend(
          candidate.bounds ||
          candidate.center,
        );
      },
    );

    if (!bounds.isValid()) return;

    const maxZoom =
      focusLevel === 'WARD'
        ? 17
        : focusLevel ===
          'SUPERVISOR'
          ? 16
          : focusLevel === 'ZONE'
            ? 15
            : 14;

    map.fitBounds(bounds, {
      padding: [55, 55],
      maxZoom,
      animate: true,
      duration: 0.6,
    });
  }, [
    map,
    beats,
    toilets,
    bins,
    focusLevel,
  ]);

  return null;
}

function ResizeMapOnFullscreen() {
  const map = useMap();
  useEffect(() => {
    const resize = () => window.setTimeout(() => map.invalidateSize(), 80);
    window.addEventListener('resize', resize);
    document.addEventListener('fullscreenchange', resize);
    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('fullscreenchange', resize);
    };
  }, [map]);
  return null;
}

const supervisorsText = (item: { supervisors: Array<{ name: string }> }) =>
  item.supervisors.length ? item.supervisors.map((supervisor) => supervisor.name).join(', ') : 'Unassigned';

export default function OperationsMapCanvas({
  beats,
  toilets,
  bins,
  visible,
  focusLevel,
}: {
  beats: BeatMapItem[];
  toilets: PointMapItem[];
  bins: PointMapItem[];
  focusLevel: MapFocusLevel;
  visible: {
    beats: boolean;
    toilets: boolean;
    bins: boolean;
  };
}) {
  const fallbackCenter = useMemo<[number, number]>(() => {
    const point = toilets[0] || bins[0];
    return point ? [point.latitude, point.longitude] : [22.9734, 78.6569];
  }, [toilets, bins]);

  return (
    <MapContainer
      center={fallbackCenter}
      zoom={12}
      minZoom={9} className="h-full w-full" zoomControl attributionControl>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeMapOnFullscreen />
      <FitAssets
        beats={visible.beats ? beats : []}
        toilets={visible.toilets ? toilets : []}
        bins={visible.bins ? bins : []}
        focusLevel={focusLevel}
      />
      {visible.beats && beats.map((beat) => {
        const feature = geometryToFeature(beat.geometry);
        if (!feature) return null;
        const statusColor = STATE_COLORS[beat.state];
        const moduleColor = MODULE_COLORS.beat;
        return (
          <GeoJSON
            key={`${beat.id}-${beat.state}`}
            data={feature}
            style={{
              color: statusColor,
              weight: 3.5,
              fillColor: moduleColor,
              fillOpacity:
                beat.state === 'NOT_STARTED'
                  ? 0.16
                  : 0.28,
            }}
          >
            <Popup>
              <div className="min-w-[220px] font-sans">
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Sweeping beat</div>
                <div className="mt-1 text-base font-bold text-slate-900">{beat.name}</div>
                <div className="mt-2 text-xs text-slate-600">{beat.zoneName} · {beat.wardName}</div>
                <div className="mt-1 text-xs text-slate-600">Supervisor: {supervisorsText(beat)}</div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span>Segments reported</span><b>{beat.reportedSegments}/{beat.totalSegments}</b>
                </div>
              </div>
            </Popup>
          </GeoJSON>
        );
      })}
      {visible.toilets && toilets.map((toilet) => (
        <Marker key={toilet.id} position={[toilet.latitude, toilet.longitude]} icon={markerIcon('toilet', toilet.state)}>
          <Popup>
            <div className="min-w-[210px] font-sans">
              <div className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-600">Toilet · {toilet.type}</div>
              <div className="mt-1 text-base font-bold text-slate-900">{toilet.name}</div>
              <div className="mt-2 text-xs text-slate-600">{toilet.zoneName} · {toilet.wardName}</div>
              <div className="mt-1 text-xs text-slate-600">Supervisor: {supervisorsText(toilet)}</div>
            </div>
          </Popup>
        </Marker>
      ))}
      {visible.bins && bins.map((bin) => (
        <Marker key={bin.id} position={[bin.latitude, bin.longitude]} icon={markerIcon('bin', bin.state)}>
          <Popup>
            <div className="min-w-[210px] font-sans">
              <div className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-600">Litter bin</div>
              <div className="mt-1 text-base font-bold text-slate-900">{bin.name}</div>
              <div className="mt-2 text-xs text-slate-600">{bin.zoneName} · {bin.wardName}</div>
              <div className="mt-1 text-xs text-slate-600">Supervisor: {supervisorsText(bin)}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
