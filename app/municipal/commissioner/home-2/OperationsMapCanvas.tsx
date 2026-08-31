'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { BeatMapItem, PointMapItem, WorkState } from './types';

const STATE_COLORS: Record<WorkState, string> = {
  NOT_STARTED: '#94a3b8',
  SUBMITTED: '#86efac',
  APPROVED: '#15803d',
  ATTENTION: '#f97316',
};

function geometryToFeature(geometry: any) {
  if (!geometry) return null;
  if (geometry.type === 'Feature') return geometry;
  if (geometry.type === 'FeatureCollection') return geometry;
  if (geometry.type && geometry.coordinates) return { type: 'Feature', properties: {}, geometry };
  return null;
}

function markerIcon(kind: 'toilet' | 'bin', state: WorkState) {
  const color = STATE_COLORS[state];
  const glyph = kind === 'toilet'
    ? '<span style="font:800 10px/1 system-ui;letter-spacing:-.02em">WC</span>'
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 10v6M14 10v6" />
      </svg>`;
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;border-radius:${kind === 'toilet' ? '10px' : '50%'};background:${color};border:3px solid white;box-shadow:0 5px 16px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;color:white">${glyph}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function FitAssets({ beats, toilets, bins }: { beats: BeatMapItem[]; toilets: PointMapItem[]; bins: PointMapItem[] }) {
  const map = useMap();
  useEffect(() => {
    type Candidate = { center: L.LatLng; bounds?: L.LatLngBounds };
    const candidates: Candidate[] = [];

    beats.forEach((beat) => {
      const feature = geometryToFeature(beat.geometry);
      if (feature) {
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
            Math.abs(northEast.lat - southWest.lat) <= 2 &&
            Math.abs(northEast.lng - southWest.lng) <= 2;
          if (hasValidCoordinates && hasReasonableAssetSize) candidates.push({ center, bounds: beatBounds });
        } catch { /* malformed legacy geometry */ }
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
        candidates.push({ center: L.latLng(latitude, longitude) });
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

    /* Ignore legacy 0,0/swapped/outlier coordinates so one bad asset cannot zoom to the world. */
    const cityCluster = candidates.filter((candidate) =>
      Math.abs(candidate.center.lat - cityCenter.lat) <= 1.5 &&
      Math.abs(candidate.center.lng - cityCenter.lng) <= 1.5
    );
    const usableCandidates = cityCluster.length ? cityCluster : candidates;
    const bounds = L.latLngBounds([]);
    usableCandidates.forEach((candidate) => bounds.extend(candidate.bounds || candidate.center));

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [52, 52],
        maxZoom: usableCandidates.length === 1 ? 16 : 14,
        animate: true,
      });
    }
  }, [map, beats, toilets, bins]);
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
}: {
  beats: BeatMapItem[];
  toilets: PointMapItem[];
  bins: PointMapItem[];
  visible: { beats: boolean; toilets: boolean; bins: boolean };
}) {
  const fallbackCenter = useMemo<[number, number]>(() => {
    const point = toilets[0] || bins[0];
    return point ? [point.latitude, point.longitude] : [22.9734, 78.6569];
  }, [toilets, bins]);

  return (
    <MapContainer center={fallbackCenter} zoom={10} minZoom={7} className="h-full w-full" zoomControl attributionControl>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeMapOnFullscreen />
      <FitAssets beats={visible.beats ? beats : []} toilets={visible.toilets ? toilets : []} bins={visible.bins ? bins : []} />
      {visible.beats && beats.map((beat) => {
        const feature = geometryToFeature(beat.geometry);
        if (!feature) return null;
        const color = STATE_COLORS[beat.state];
        return (
          <GeoJSON
            key={`${beat.id}-${beat.state}`}
            data={feature}
            style={{ color, weight: 3, fillColor: color, fillOpacity: beat.state === 'NOT_STARTED' ? 0.22 : 0.42 }}
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
              <div className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-600">Public toilet · {toilet.type}</div>
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
