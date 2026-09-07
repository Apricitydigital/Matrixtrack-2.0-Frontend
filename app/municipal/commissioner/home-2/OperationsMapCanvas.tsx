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

  const statusColor = STATE_COLORS[state] || STATE_COLORS.NOT_STARTED;
  const isStarted = state !== 'NOT_STARTED';

  /*
   * If report is submitted/approved/attention, make the entire marker icon box
   * background and surrounding ring reflect the status color (e.g. #2563eb Blue).
   */
  const bgColor = isStarted ? statusColor : moduleColor;
  const ringStyle = isStarted
    ? `0 0 0 3.5px ${statusColor}, 0 4px 14px ${statusColor}70`
    : `0 3px 9px rgba(15,23,42,.25)`;

  /*
   * Match the Map Layers icons:
   * Toilet     -> Building icon
   * Litter Bin -> Trash icon
   */
  const glyph =
    kind === 'toilet'
      ? `
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="7" r="2.5"/>
      <circle cx="16" cy="7" r="2.5"/>
      <path d="M4.5 20v-3.5c0-2.3 1.5-4 3.5-4h0"/>
      <path d="M19.5 20v-3.5c0-2.3-1.5-4-3.5-4h0"/>
      <path d="M8 12.5V20"/>
      <path d="M16 12.5V20"/>
    </svg>
      `
      : `
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18"/>
          <path d="M8 6V4h8v2"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 10v6"/>
          <path d="M14 10v6"/>
        </svg>
      `;

  return L.divIcon({
    className: '',
    html: `
      <div
        style="
          position:relative;
          width:32px;
          height:32px;
          border-radius:10px;
          background:${bgColor};
          border:2px solid white;
          box-shadow:${ringStyle};
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
            right:-4px;
            bottom:-4px;
            width:10px;
            height:10px;
            border-radius:50%;
            background:${statusColor};
            border:2px solid white;
            box-shadow:0 1px 4px rgba(15,23,42,.3);
          "
        ></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
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
      isStarted: boolean;
    };

    const candidates: Candidate[] = [];

    beats.forEach((beat) => {
      const feature = geometryToFeature(beat.geometry);
      if (!feature) return;

      try {
        const beatBounds = L.geoJSON(feature).getBounds();
        if (!beatBounds.isValid()) return;

        const center = beatBounds.getCenter();
        const northEast = beatBounds.getNorthEast();
        const southWest = beatBounds.getSouthWest();

        const hasValidCoordinates =
          Math.abs(center.lat) <= 90 &&
          Math.abs(center.lng) <= 180 &&
          Math.abs(center.lat) > 0.01 &&
          Math.abs(center.lng) > 0.01;

        const hasReasonableAssetSize =
          Math.abs(northEast.lat - southWest.lat) <= 0.5 &&
          Math.abs(northEast.lng - southWest.lng) <= 0.5;

        if (hasValidCoordinates && hasReasonableAssetSize) {
          candidates.push({
            center,
            bounds: beatBounds,
            isStarted: beat.state !== 'NOT_STARTED',
          });
        }
      } catch {
        // Ignore malformed legacy geometry.
      }
    });

    [...toilets, ...bins].forEach((item) => {
      const latitude = Number(item.latitude);
      const longitude = Number(item.longitude);

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180 &&
        Math.abs(latitude) > 0.01 &&
        Math.abs(longitude) > 0.01
      ) {
        candidates.push({
          center: L.latLng(latitude, longitude),
          isStarted: item.state !== 'NOT_STARTED',
        });
      }
    });

    if (!candidates.length) return;

    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    const cityCenter = L.latLng(
      median(candidates.map((candidate) => candidate.center.lat)),
      median(candidates.map((candidate) => candidate.center.lng)),
    );

    const radiusMeters =
      focusLevel === 'WARD'
        ? 12000
        : focusLevel === 'SUPERVISOR'
          ? 15000
          : focusLevel === 'ZONE'
            ? 20000
            : 35000;

    const nearbyCandidates = candidates.filter(
      (candidate) => cityCenter.distanceTo(candidate.center) <= radiusMeters,
    );

    const requiredClusterSize = Math.max(1, Math.ceil(candidates.length * 0.6));

    const clusterCandidates =
      nearbyCandidates.length >= requiredClusterSize
        ? nearbyCandidates
        : candidates;

    /*
     * ALWAYS include submitted/active assets in map bounds
     * so they are never cut off by clustering!
     */
    const startedCandidates = candidates.filter((c) => c.isStarted);
    const usableMapCandidates = Array.from(
      new Set([...startedCandidates, ...clusterCandidates]),
    );

    const bounds = L.latLngBounds([]);
    usableMapCandidates.forEach((candidate) => {
      bounds.extend(candidate.bounds || candidate.center);
    });

    if (!bounds.isValid()) return;

    const maxZoom =
      focusLevel === 'WARD'
        ? 17
        : focusLevel === 'SUPERVISOR'
          ? 16
          : focusLevel === 'ZONE'
            ? 15
            : 15;

    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom,
      animate: true,
      duration: 0.6,
    });
  }, [map, beats, toilets, bins, focusLevel]);

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
      minZoom={9}
      className="h-full w-full"
      zoomControl
      attributionControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        maxZoom={20}
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
        const isNotStarted = beat.state === 'NOT_STARTED';
        const statusColor = STATE_COLORS[beat.state] || STATE_COLORS.NOT_STARTED;
        const color = isNotStarted ? '#64748b' : statusColor;
        return (
          <GeoJSON
            key={`${beat.id}-${beat.state}`}
            data={feature}
            style={{
              color: color,
              weight: isNotStarted ? 3 : 6,
              fillColor: color,
              fillOpacity: isNotStarted ? 0.15 : 0.52,
            }}
          >
            <Popup>
              <div className="min-w-[220px] font-sans">
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Sweeping beat</div>
                <div className="mt-1 text-base font-bold text-slate-900">{beat.name}</div>
                <div className="mt-2 text-xs text-slate-600">{beat.zoneName} · {beat.wardName}</div>
                <div className="mt-1 text-xs text-slate-600">Supervisor: {supervisorsText(beat)}</div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span>Status</span><b style={{ color: color }}>{beat.state}</b>
                </div>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
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
              <div className="mt-2 text-xs font-bold text-slate-700">Status: <span style={{ color: STATE_COLORS[toilet.state] }}>{toilet.state}</span></div>
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
              <div className="mt-2 text-xs font-bold text-slate-700">Status: <span style={{ color: STATE_COLORS[bin.state] }}>{bin.state}</span></div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
