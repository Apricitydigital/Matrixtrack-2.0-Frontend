'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import type {
  BeatMapItem,
  MapActor,
  PointMapItem,
  WorkflowEvent,
  WorkflowTimes,
  WorkState,
} from './types';

const STATE_COLORS: Record<WorkState, string> = {
  NOT_REPORTED: '#64748b',
  PENDING: '#f59e0b',
  APPROVED: '#16a34a',
  REJECTED: '#e11d48',
  ACTION_REQUIRED: '#f97316',
  ACTION_TAKEN: '#2563eb',
};

const STATE_LABELS: Record<WorkState, string> = {
  NOT_REPORTED: 'Not Reported',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ACTION_REQUIRED: 'Action Required',
  ACTION_TAKEN: 'Action Taken',
};

const ROLE_LABELS: Record<string, string> = {
  SUPERVISOR: 'Daroga',
  QC: 'Sanitary Inspector (SI)',
  ACTION_OFFICER: 'IEC Member',
  ULB_OFFICER: 'ULB Officer',
  EMPLOYEE: 'Employee',
};


function actorForRole(
  actors: MapActor[] | undefined,
  role: string,
) {
  return (
    actors || []
  ).find(
    (actor) =>
      actor.role === role,
  ) || null;
}

function actorName(
  actor: MapActor | null | undefined,
  fallback = '—',
) {
  return actor?.name || fallback;
}

function responsibilityValue(
  state: WorkState,
  role:
    | 'SUPERVISOR'
    | 'QC'
    | 'ACTION_OFFICER',
  actor: MapActor | null,
) {
  if (actor) {
    return actor.name;
  }

  if (role === 'SUPERVISOR') {
    return 'Unassigned';
  }

  if (role === 'QC') {
    if (
      state === 'NOT_REPORTED'
    ) {
      return '—';
    }

    if (state === 'PENDING') {
      return 'Pending review';
    }

    return 'Historical identity unavailable';
  }

  if (
    role === 'ACTION_OFFICER'
  ) {
    if (
      state ===
      'ACTION_REQUIRED'
    ) {
      return 'Pending action';
    }

    if (
      state ===
      'ACTION_TAKEN'
    ) {
      return 'Historical identity unavailable';
    }

    return '—';
  }

  return '—';
}

function formatWorkflowTime(
  value: string | null | undefined,
  completed: boolean,
) {
  if (!completed) {
    return 'Pending';
  }

  if (!value) {
    return 'Historical timestamp unavailable';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Historical timestamp unavailable';
  }

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone:
        'Asia/Kolkata',
    },
  );
}

function buildWorkflow(
  state: WorkState,
  actors: MapActor[] | undefined,
  times?: WorkflowTimes,
): WorkflowEvent[] {
  const supervisor =
    actorForRole(
      actors,
      'SUPERVISOR',
    );

  const employee =
    actorForRole(
      actors,
      'EMPLOYEE',
    );

  const si =
    actorForRole(
      actors,
      'QC',
    );

  const ulb =
    actorForRole(
      actors,
      'ULB_OFFICER',
    );

  const iec =
    actorForRole(
      actors,
      'ACTION_OFFICER',
    );

  const reporter =
    employee || supervisor;

  if (
    state === 'NOT_REPORTED'
  ) {
    return [
      {
        key: 'report-awaited',
        label: 'Report Awaited',
        status:
          'NOT_REPORTED',
        at: null,
        actor: null,
        completed: false,
        detail:
          'No report received for the selected date.',
      },
    ];
  }

  const events: WorkflowEvent[] =
    [
      {
        key: 'reported',
        label:
          'Report Submitted',
        status: 'PENDING',
        at:
          times?.reportedAt ||
          null,
        actor: reporter,
        completed: true,
        detail: reporter
          ? null
          : 'Reporter identity unavailable',
      },
    ];

  if (state === 'PENDING') {
    events.push({
      key: 'si-review',
      label: 'SI Review',
      status: null,
      at: null,
      actor: null,
      completed: false,
      detail:
        'Awaiting SI review',
    });

    return events;
  }

  if (state === 'APPROVED') {
    events.push({
      key: 'si-approved',
      label: 'SI Approved',
      status: 'APPROVED',
      at:
        times?.reviewedAt ||
        null,
      actor: si,
      completed: true,
      detail: si
        ? null
        : 'Historical reviewer identity unavailable',
    });

    return events;
  }

  if (state === 'REJECTED') {
    events.push({
      key: 'si-rejected',
      label: 'SI Rejected',
      status: 'REJECTED',
      at:
        times?.reviewedAt ||
        null,
      actor: si,
      completed: true,
      detail: si
        ? null
        : 'Historical reviewer identity unavailable',
    });

    return events;
  }

  /*
   * ACTION_REQUIRED and ACTION_TAKEN
   */
  events.push({
    key: 'si-reviewed',
    label: 'SI Reviewed',
    status: 'PENDING',
    at:
      times?.reviewedAt ||
      null,
    actor: si,
    completed: true,
    detail: si
      ? null
      : 'Historical reviewer identity unavailable',
  });

  events.push({
    key: 'action-required',
    label: 'Action Required',
    status:
      'ACTION_REQUIRED',
    at:
      times?.actionRequiredAt ||
      null,
    actor: ulb,
    completed: true,
    detail: ulb
      ? null
      : 'Historical action issuer unavailable',
  });

  if (
    state ===
    'ACTION_REQUIRED'
  ) {
    events.push({
      key: 'iec-action',
      label: 'IEC Action',
      status: null,
      at: null,
      actor: iec,
      completed: false,
      detail: iec
        ? `Assigned to ${iec.name}`
        : 'Awaiting IEC action',
    });

    return events;
  }

  events.push({
    key: 'action-taken',
    label: 'Action Taken',
    status: 'ACTION_TAKEN',
    at:
      times?.actionTakenAt ||
      null,
    actor: iec,
    completed: true,
    detail: iec
      ? null
      : 'Historical action user identity unavailable',
  });

  return events;
}

function QuickPerson({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const isUnavailable =
    value === '—' ||
    value === 'Unassigned' ||
    value.includes('unavailable') ||
    value.includes('Pending');

  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="shrink-0 text-[9px] font-black uppercase tracking-[.10em] text-slate-400">
        {label}
      </div>

      <div
        className={`min-w-0 text-right text-[10px] font-bold leading-4 ${
          isUnavailable
            ? 'text-slate-500'
            : 'text-slate-900'
        }`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function ResponsibilitySummary({
  state,
  actors,
}: {
  state: WorkState;
  actors?: MapActor[];
}) {
  const supervisor =
    actorForRole(
      actors,
      'SUPERVISOR',
    );

  const si =
    actorForRole(
      actors,
      'QC',
    );

  const iec =
    actorForRole(
      actors,
      'ACTION_OFFICER',
    );

  const ulb =
    actorForRole(
      actors,
      'ULB_OFFICER',
    );

  const showSi =
    state !==
    'NOT_REPORTED';

  const showIec =
    state ===
      'ACTION_REQUIRED' ||
    state ===
      'ACTION_TAKEN';

  return (
    <div className="mt-3">
      <div className="mb-2 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">
        Responsibility
      </div>

      <div className="space-y-1.5">
        <QuickPerson
          label="Daroga"
          value={responsibilityValue(
            state,
            'SUPERVISOR',
            supervisor,
          )}
        />

        {showSi && (
          <QuickPerson
            label="Sanitary Inspector"
            value={responsibilityValue(
              state,
              'QC',
              si,
            )}
          />
        )}

        {showIec && (
          <QuickPerson
            label="IEC Member"
            value={responsibilityValue(
              state,
              'ACTION_OFFICER',
              iec,
            )}
          />
        )}
      </div>

      {ulb &&
        (state ===
          'ACTION_REQUIRED' ||
          state ===
            'ACTION_TAKEN') && (
          <div className="mt-2">
            <QuickPerson
              label="ULB Officer"
              value={ulb.name}
            />
          </div>
        )}
    </div>
  );
}

function QuickAssetPreview({
  moduleLabel,
  name,
  state,
  zoneName,
  wardName,
  actors,
}: {
  moduleLabel: string;
  name: string;
  state: WorkState;
  zoneName: string;
  wardName: string;
  actors?: MapActor[];
}) {
  const supervisor =
    actorForRole(
      actors,
      'SUPERVISOR',
    );

  const si =
    actorForRole(
      actors,
      'QC',
    );

  const iec =
    actorForRole(
      actors,
      'ACTION_OFFICER',
    );

  return (
    <div className="w-[235px] max-w-[calc(100vw-90px)] font-sans">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[8px] font-black uppercase tracking-[.16em] text-slate-400">
            {moduleLabel}
          </div>

          <div className="mt-0.5 truncate text-sm font-black text-slate-900">
            {name}
          </div>
        </div>

        <StatusBadge
          state={state}
        />
      </div>

      <div className="mt-1 text-[10px] font-semibold text-slate-500">
        {zoneName} · {wardName}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between gap-3 text-[10px]">
          <span className="text-slate-500">
            Daroga
          </span>

          <b className="max-w-[145px] truncate text-slate-800">
            {actorName(
              supervisor,
              'Unassigned',
            )}
          </b>
        </div>

        {state !==
          'NOT_REPORTED' && (
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="text-slate-500">
              SI
            </span>

            <b className="max-w-[145px] truncate text-slate-800">
              {responsibilityValue(
                state,
                'QC',
                si,
              )}
            </b>
          </div>
        )}

        {(state ===
          'ACTION_REQUIRED' ||
          state ===
            'ACTION_TAKEN') && (
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="text-slate-500">
              IEC Member
            </span>

            <b className="max-w-[145px] truncate text-slate-800">
              {responsibilityValue(
                state,
                'ACTION_OFFICER',
                iec,
              )}
            </b>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-400">
        Click for complete workflow
      </div>
    </div>
  );
}

function WorkflowTimeline({
  state,
  actors,
  workflowTimes,
}: {
  state: WorkState;
  actors?: MapActor[];
  workflowTimes?: WorkflowTimes;
}) {
  const events =
    buildWorkflow(
      state,
      actors,
      workflowTimes,
    );

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="mb-3 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">
        Workflow Timeline
      </div>

      <div>
        {events.map(
          (event, index) => {
            const isLast =
              index ===
              events.length - 1;

            const color =
              event.status
                ? STATE_COLORS[
                    event.status
                  ]
                : '#cbd5e1';

            const timeLabel =
              formatWorkflowTime(
                event.at,
                event.completed,
              );

            return (
              <div
                key={event.key}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {!isLast && (
                  <span className="absolute left-[6px] top-3 h-[calc(100%-3px)] w-px bg-slate-200" />
                )}

                <span
                  className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white"
                  style={{
                    backgroundColor:
                      event.completed
                        ? color
                        : '#e2e8f0',
                    boxShadow:
                      event.completed
                        ? `0 0 0 2px ${color}30`
                        : '0 0 0 2px #e2e8f0',
                  }}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-black text-slate-800">
                      {event.label}
                    </div>

                    {event.at && (
                      <div className="shrink-0 whitespace-nowrap text-right text-[9px] font-bold text-slate-500">
                        {timeLabel}
                      </div>
                    )}

                    {!event.completed && (
                      <div className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-500">
                        Pending
                      </div>
                    )}
                  </div>

                  {event.actor && (
                    <div className="mt-0.5 truncate text-[9px] font-semibold text-slate-500">
                      {
                        event.actor
                          .name
                      }
                      {' · '}
                      {ROLE_LABELS[
                        event.actor
                          .role
                      ] ||
                        event.actor
                          .role}
                    </div>
                  )}

                  {event.detail && (
                    <div className="mt-1 text-[8px] font-semibold leading-3 text-slate-400">
                      {event.detail}
                    </div>
                  )}

                  {event.completed &&
                    !event.at && (
                      <div className="mt-1 text-[8px] font-semibold leading-3 text-slate-400">
                        Historical timestamp unavailable
                      </div>
                    )}
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

function geometryToFeature(geometry: any) {
  if (!geometry) return null;

  if (geometry.type === 'Feature') {
    return geometry;
  }

  if (geometry.type === 'FeatureCollection') {
    return geometry;
  }

  if (geometry.type && geometry.coordinates) {
    return {
      type: 'Feature',
      properties: {},
      geometry,
    };
  }

  return null;
}

function markerIcon(
  kind: 'toilet' | 'bin',
  state: WorkState,
) {
  const statusColor = STATE_COLORS[state];

  const glyph =
    kind === 'toilet'
      ? `
        <svg
          width="16"
          height="16"
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
          <path d="M4.5 20v-3.5c0-2.3 1.5-4 3.5-4"/>
          <path d="M19.5 20v-3.5c0-2.3-1.5-4-3.5-4"/>
          <path d="M8 12.5V20"/>
          <path d="M16 12.5V20"/>
        </svg>
      `
      : `
        <svg
          width="16"
          height="16"
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
        title="${STATE_LABELS[state]}"
        style="
          position:relative;
          width:36px;
          height:36px;
          border-radius:12px;
          background:${statusColor};
          border:3px solid white;
          box-shadow:
            0 0 0 4px ${statusColor}30,
            0 8px 18px rgba(15,23,42,.28);
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
            width:12px;
            height:12px;
            border-radius:999px;
            background:${statusColor};
            border:3px solid white;
            box-shadow:0 2px 5px rgba(15,23,42,.25);
          "
        ></span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

type MapFocusLevel =
  | 'CITY'
  | 'ZONE'
  | 'WARD'
  | 'USER';

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
      isReported: boolean;
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

        const hasReasonableAssetSize =
          Math.abs(
            northEast.lat -
              southWest.lat,
          ) <= 0.5 &&
          Math.abs(
            northEast.lng -
              southWest.lng,
          ) <= 0.5;

        if (
          hasValidCoordinates &&
          hasReasonableAssetSize
        ) {
          candidates.push({
            center,
            bounds: beatBounds,
            isReported:
              beat.state !==
              'NOT_REPORTED',
          });
        }
      } catch {
        // Ignore malformed legacy geometry.
      }
    });

    [...toilets, ...bins].forEach(
      (item) => {
        const latitude = Number(
          item.latitude,
        );

        const longitude = Number(
          item.longitude,
        );

        if (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          Math.abs(latitude) <= 90 &&
          Math.abs(longitude) <=
            180 &&
          Math.abs(latitude) > 0.01 &&
          Math.abs(longitude) > 0.01
        ) {
          candidates.push({
            center: L.latLng(
              latitude,
              longitude,
            ),
            isReported:
              item.state !==
              'NOT_REPORTED',
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

    const radiusMeters =
      focusLevel === 'WARD'
        ? 12000
        : focusLevel === 'USER'
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

    const requiredClusterSize =
      Math.max(
        1,
        Math.ceil(
          candidates.length * 0.6,
        ),
      );

    const clusterCandidates =
      nearbyCandidates.length >=
      requiredClusterSize
        ? nearbyCandidates
        : candidates;

    const reportedCandidates =
      candidates.filter(
        (candidate) =>
          candidate.isReported,
      );

    const usableMapCandidates =
      Array.from(
        new Set([
          ...reportedCandidates,
          ...clusterCandidates,
        ]),
      );

    const bounds =
      L.latLngBounds([]);

    usableMapCandidates.forEach(
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
        : focusLevel === 'USER'
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
    const resize = () =>
      window.setTimeout(
        () => map.invalidateSize(),
        80,
      );

    window.addEventListener(
      'resize',
      resize,
    );

    document.addEventListener(
      'fullscreenchange',
      resize,
    );

    return () => {
      window.removeEventListener(
        'resize',
        resize,
      );

      document.removeEventListener(
        'fullscreenchange',
        resize,
      );
    };
  }, [map]);

  return null;
}

function supervisorsText(item: {
  supervisors: Array<{
    name: string;
  }>;
}) {
  return item.supervisors.length
    ? item.supervisors
        .map(
          (supervisor) =>
            supervisor.name,
        )
        .join(', ')
    : 'Unassigned';
}

function StatusBadge({
  state,
}: {
  state: WorkState;
}) {
  return (
    <span
      className="inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white"
      style={{
        backgroundColor:
          STATE_COLORS[state],
      }}
    >
      {STATE_LABELS[state]}
    </span>
  );
}

function ActorList({
  actors,
}: {
  actors?: MapActor[];
}) {
  if (!actors?.length) {
    return (
      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400">
        No role activity linked
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      {actors
        .slice(0, 6)
        .map((actor) => (
          <div
            key={`${actor.id}-${actor.role}`}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px]"
          >
            <span className="font-semibold text-slate-500">
              {ROLE_LABELS[
                actor.role
              ] || actor.role}
            </span>

            <span className="max-w-[130px] truncate text-right font-bold text-slate-800">
              {actor.name}
            </span>
          </div>
        ))}
    </div>
  );
}

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
  const fallbackCenter =
    useMemo<[number, number]>(() => {
      const point =
        toilets[0] || bins[0];

      return point
        ? [
            point.latitude,
            point.longitude,
          ]
        : [23.1765, 75.7885];
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
        beats={
          visible.beats ? beats : []
        }
        toilets={
          visible.toilets
            ? toilets
            : []
        }
        bins={
          visible.bins ? bins : []
        }
        focusLevel={focusLevel}
      />

      {visible.beats &&
        beats.map((beat) => {
          const feature =
            geometryToFeature(
              beat.geometry,
            );

          if (!feature) return null;

          const statusColor =
            STATE_COLORS[beat.state];

          const isNotReported =
            beat.state ===
            'NOT_REPORTED';

          const isPending =
            beat.state === 'PENDING';

          return (
            <GeoJSON
              key={`${beat.id}-${beat.state}`}
              data={feature}
              style={{
                color: statusColor,
                weight:
                  beat.state ===
                    'REJECTED' ||
                  beat.state ===
                    'ACTION_REQUIRED'
                    ? 5
                    : 4,

                fillColor:
                  statusColor,

                fillOpacity:
                  isNotReported
                    ? 0.3
                    : 0.55,

                dashArray:
                  isNotReported
                    ? '7 6'
                    : isPending
                      ? '11 5'
                      : undefined,
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -10]}
                opacity={1}
                sticky
              >
                <QuickAssetPreview
                  moduleLabel="Sweeping Beat"
                  name={beat.name}
                  state={beat.state}
                  zoneName={beat.zoneName}
                  wardName={beat.wardName}
                  actors={beat.actors}
                />
              </Tooltip>

              <Popup>
                <div className="w-[320px] max-w-[calc(100vw-80px)] max-h-[440px] overflow-y-auto overflow-x-hidden pr-1 font-sans">
                  <div className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">
                    Sweeping Beat
                  </div>

                  <div className="mt-1 text-base font-black text-slate-900">
                    {beat.name}
                  </div>

                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {beat.zoneName} ·{' '}
                    {beat.wardName}
                  </div>

                  <div className="mt-3">
                    <StatusBadge
                      state={beat.state}
                    />
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-[10px]">
                      <span className="font-semibold text-slate-500">
                        Segments Reported
                      </span>

                      <b className="text-slate-900">
                        {beat.reportedSegments}/{beat.totalSegments}
                      </b>
                    </div>
                  </div>

                  <ResponsibilitySummary
                    state={beat.state}
                    actors={beat.actors}
                  />

                  <WorkflowTimeline
                    state={beat.state}
                    actors={beat.actors}
                    workflowTimes={
                      beat.workflowTimes
                    }
                  />
                </div>
              </Popup>
            </GeoJSON>
          );
        })}

      {visible.toilets &&
        toilets.map((toilet) => (
          <Marker
            key={`${toilet.id}-${toilet.state}`}
            position={[
              toilet.latitude,
              toilet.longitude,
            ]}
            icon={markerIcon(
              'toilet',
              toilet.state,
            )}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
            >
              <QuickAssetPreview
                moduleLabel="Toilet"
                name={toilet.name}
                state={toilet.state}
                zoneName={toilet.zoneName}
                wardName={toilet.wardName}
                actors={toilet.actors}
              />
            </Tooltip>

            <Popup>
              <div className="w-[320px] max-w-[calc(100vw-80px)] max-h-[440px] overflow-y-auto overflow-x-hidden pr-1 font-sans">
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-600">
                  Toilet
                  {toilet.type
                    ? ` · ${toilet.type}`
                    : ''}
                </div>

                <div className="mt-1 text-base font-black text-slate-900">
                  {toilet.name}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {toilet.zoneName} ·{' '}
                  {toilet.wardName}
                </div>

                <div className="mt-3">
                  <StatusBadge
                    state={
                      toilet.state
                    }
                  />
                </div>



                <ResponsibilitySummary
                  state={toilet.state}
                  actors={toilet.actors}
                />

                <WorkflowTimeline
                  state={toilet.state}
                  actors={toilet.actors}
                  workflowTimes={
                    toilet.workflowTimes
                  }
                />
              </div>
            </Popup>
          </Marker>
        ))}

      {visible.bins &&
        bins.map((bin) => (
          <Marker
            key={`${bin.id}-${bin.state}`}
            position={[
              bin.latitude,
              bin.longitude,
            ]}
            icon={markerIcon(
              'bin',
              bin.state,
            )}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
            >
              <QuickAssetPreview
                moduleLabel="Litter Bin"
                name={bin.name}
                state={bin.state}
                zoneName={bin.zoneName}
                wardName={bin.wardName}
                actors={bin.actors}
              />
            </Tooltip>

            <Popup>
              <div className="w-[320px] max-w-[calc(100vw-80px)] max-h-[440px] overflow-y-auto overflow-x-hidden pr-1 font-sans">
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-600">
                  Litter Bin
                </div>

                <div className="mt-1 text-base font-black text-slate-900">
                  {bin.name}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {bin.zoneName} ·{' '}
                  {bin.wardName}
                </div>

                <div className="mt-3">
                  <StatusBadge
                    state={bin.state}
                  />
                </div>



                <ResponsibilitySummary
                  state={bin.state}
                  actors={bin.actors}
                />

                <WorkflowTimeline
                  state={bin.state}
                  actors={bin.actors}
                  workflowTimes={
                    bin.workflowTimes
                  }
                />
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
