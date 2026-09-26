"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    GeoJSON,
    MapContainer,
    Marker,
    TileLayer,
    Tooltip,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import {
    Eye,
    Map as MapIcon,
    MapPin,
    Table2,
    X,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

interface Props {
    group: any;
    onClose: () => void;
    onViewBeat: (beat: any) => void;
}

const uniqueNames = (items: any[]) =>
    Array.from(
        new Set(
            (items || [])
                .map((item) => item?.name)
                .filter(Boolean)
        )
    ).join(", ");

const getSupervisors = (beat: any) => {
    if (
        Array.isArray(beat?.supervisorsSummary) &&
        beat.supervisorsSummary.length
    ) {
        return beat.supervisorsSummary;
    }

    const users = new Map<string, string>();

    (beat?.segments || []).forEach((segment: any) => {
        if (
            segment.supervisorAssignedToId &&
            segment.supervisorAssignedToName
        ) {
            users.set(
                segment.supervisorAssignedToId,
                segment.supervisorAssignedToName
            );
        }
    });

    if (
        !users.size &&
        beat?.assignedToId &&
        beat?.assignedToName
    ) {
        users.set(
            beat.assignedToId,
            beat.assignedToName
        );
    }

    return Array.from(users, ([id, name]) => ({
        id,
        name,
    }));
};

const getEmployees = (beat: any) => {
    if (
        Array.isArray(beat?.employeesSummary) &&
        beat.employeesSummary.length
    ) {
        return beat.employeesSummary;
    }

    const users = new Map<string, string>();

    (beat?.segments || []).forEach((segment: any) => {
        if (
            segment.employeeAssignedToId &&
            segment.employeeAssignedToName
        ) {
            users.set(
                segment.employeeAssignedToId,
                segment.employeeAssignedToName
            );
        }
    });

    return Array.from(users, ([id, name]) => ({
        id,
        name,
    }));
};

const parseGeometry = (value: any) => {
    if (!value) return null;

    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }

    return value;
};

const pointIcon = (label: string) =>
    L.divIcon({
        className: "zbm-point-marker",
        html:
            "<span>" +
            String(label)
                .replace(/[^a-zA-Z0-9_-]/g, "")
                .slice(0, 6) +
            "</span>",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
    });

function FitBounds({ beats }: { beats: any[] }) {
    const map = useMap();

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const group = new L.FeatureGroup();

            beats.forEach((beat) => {
                const geometry = parseGeometry(
                    beat.geometry
                );

                if (geometry) {
                    try {
                        group.addLayer(
                            L.geoJSON(geometry)
                        );
                    } catch {}
                }
            });

            const bounds = group.getBounds();

            if (bounds.isValid()) {
                map.fitBounds(bounds, {
                    padding: [45, 45],
                    maxZoom: 16,
                });
            }

            map.invalidateSize();
        }, 120);

        return () =>
            window.clearTimeout(timer);
    }, [map, beats]);

    return null;
}

export default function GroupBeatMappingModal({
    group,
    onClose,
    onViewBeat,
}: Props) {
    const [mounted, setMounted] =
        useState(false);

    const [mode, setMode] =
        useState<"TABLE" | "MAP">("TABLE");

    const [selectedBeat, setSelectedBeat] =
        useState<any | null>(null);

    const [mapType, setMapType] =
        useState<"streets" | "satellite">(
            "streets"
        );

    useEffect(() => {
        setMounted(true);

        const oldOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        return () => {
            document.body.style.overflow =
                oldOverflow;
        };
    }, []);

    const beats = useMemo(
        () => group?.beats || [],
        [group]
    );

    if (!mounted || !group) return null;

    return createPortal(
        <div
            className="zbm-overlay"
            onMouseDown={onClose}
        >
            <div
                className="zbm-shell"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="zbm-toolbar">
                    <div className="zbm-title">
                        <small>
                            ZONE / WARD BEAT MAPPING
                        </small>

                        <h2>{group.title}</h2>

                        <p>
                            {beats.length} beats
                            {group.subtitle
                                ? " - " +
                                  group.subtitle
                                : ""}
                        </p>
                    </div>

                    <div className="zbm-actions">
                        <div className="zbm-tabs">
                            <button
                                className={
                                    mode === "TABLE"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setMode("TABLE")
                                }
                            >
                                <Table2 size={15} />
                                Table
                            </button>

                            <button
                                className={
                                    mode === "MAP"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setMode("MAP")
                                }
                            >
                                <MapIcon size={15} />
                                Map
                            </button>
                        </div>

                        <button
                            className="zbm-close"
                            onClick={onClose}
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {mode === "TABLE" ? (
                    <div className="zbm-table-scroll">
                        <div className="zbm-table zbm-table-head">
                            <span>Beat</span>
                            <span>Ward</span>
                            <span>Area</span>
                            <span>Daroga</span>
                            <span>Employee</span>
                            <span>Points</span>
                            <span>Status</span>
                            <span></span>
                        </div>

                        {beats.map((beat: any) => {
                            const supervisors =
                                getSupervisors(beat);

                            const employees =
                                getEmployees(beat);

                            const pointCount =
                                Array.isArray(
                                    beat.points
                                )
                                    ? beat.points.length
                                    : 0;

                            const ready =
                                supervisors.length >
                                    0 &&
                                employees.length > 0 &&
                                pointCount === 5;

                            return (
                                <div
                                    key={beat.id}
                                    className="zbm-table zbm-table-row"
                                >
                                    <strong>
                                        {beat.beatName}
                                    </strong>

                                    <span>
                                        {beat.wardName ||
                                            "-"}
                                    </span>

                                    <span>
                                        {beat.areaName ||
                                            "-"}
                                    </span>

                                    <span
                                        title={uniqueNames(
                                            supervisors
                                        )}
                                    >
                                        {uniqueNames(
                                            supervisors
                                        ) ||
                                            "Not assigned"}
                                    </span>

                                    <span
                                        title={uniqueNames(
                                            employees
                                        )}
                                    >
                                        {uniqueNames(
                                            employees
                                        ) ||
                                            "Not assigned"}
                                    </span>

                                    <span>
                                        {pointCount}/5
                                    </span>

                                    <span
                                        className={
                                            ready
                                                ? "zbm-status ready"
                                                : "zbm-status pending"
                                        }
                                    >
                                        {ready
                                            ? "Configured"
                                            : "Needs Setup"}
                                    </span>

                                    <button
                                        className="zbm-view"
                                        onClick={() =>
                                            onViewBeat(
                                                beat
                                            )
                                        }
                                    >
                                        <Eye
                                            size={14}
                                        />
                                        View
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="zbm-map-layout">
                        <div className="zbm-map-wrap">
                            <div className="zbm-map-controls">
                                <button
                                    className={
                                        mapType ===
                                        "streets"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setMapType(
                                            "streets"
                                        )
                                    }
                                >
                                    Streets
                                </button>

                                <button
                                    className={
                                        mapType ===
                                        "satellite"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setMapType(
                                            "satellite"
                                        )
                                    }
                                >
                                    Satellite
                                </button>
                            </div>

                            <MapContainer
                                center={[
                                    22.7196,
                                    75.8577,
                                ]}
                                zoom={13}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                            >
                                <TileLayer
                                    attribution="Google Maps"
                                    url={
                                        mapType ===
                                        "streets"
                                            ? "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                            : "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                    }
                                    maxZoom={20}
                                />

                                <FitBounds
                                    beats={beats}
                                />

                                {beats.map(
                                    (beat: any) => {
                                        const geometry =
                                            parseGeometry(
                                                beat.geometry
                                            );

                                        const isSelected =
                                            selectedBeat?.id ===
                                            beat.id;

                                        return (
                                            <React.Fragment
                                                key={
                                                    beat.id
                                                }
                                            >
                                                {geometry && (
                                                    <GeoJSON
                                                        data={
                                                            geometry
                                                        }
                                                        style={{
                                                            color:
                                                                isSelected
                                                                    ? "#1d4ed8"
                                                                    : "#60a5fa",
                                                            weight:
                                                                isSelected
                                                                    ? 7
                                                                    : 4,
                                                            opacity:
                                                                selectedBeat &&
                                                                !isSelected
                                                                    ? 0.3
                                                                    : 0.85,
                                                        }}
                                                        eventHandlers={{
                                                            click: () =>
                                                                setSelectedBeat(
                                                                    beat
                                                                ),
                                                        }}
                                                    >
                                                        <Tooltip
                                                            sticky
                                                        >
                                                            {
                                                                beat.beatName
                                                            }
                                                            {" - "}
                                                            {beat.areaName ||
                                                                ""}
                                                        </Tooltip>
                                                    </GeoJSON>
                                                )}

                                                {isSelected &&
                                                    (Array.isArray(
                                                        beat.points
                                                    )
                                                        ? beat.points
                                                        : []
                                                    ).map(
                                                        (
                                                            point: any,
                                                            index: number
                                                        ) => {
                                                            const lat =
                                                                Number(
                                                                    point.latitude ??
                                                                        point.lat
                                                                );

                                                            const lng =
                                                                Number(
                                                                    point.longitude ??
                                                                        point.lng ??
                                                                        point.lon
                                                                );

                                                            if (
                                                                !Number.isFinite(
                                                                    lat
                                                                ) ||
                                                                !Number.isFinite(
                                                                    lng
                                                                )
                                                            ) {
                                                                return null;
                                                            }

                                                            const label =
                                                                point.code ||
                                                                point.label ||
                                                                "P" +
                                                                    (index +
                                                                        1);

                                                            return (
                                                                <Marker
                                                                    key={
                                                                        beat.id +
                                                                        "-" +
                                                                        index
                                                                    }
                                                                    position={[
                                                                        lat,
                                                                        lng,
                                                                    ]}
                                                                    icon={pointIcon(
                                                                        label
                                                                    )}
                                                                >
                                                                    <Tooltip>
                                                                        {
                                                                            beat.beatName
                                                                        }
                                                                        {" - "}
                                                                        {
                                                                            label
                                                                        }
                                                                    </Tooltip>
                                                                </Marker>
                                                            );
                                                        }
                                                    )}
                                            </React.Fragment>
                                        );
                                    }
                                )}
                            </MapContainer>

                            {!selectedBeat && (
                                <div className="zbm-map-hint">
                                    Click a beat route to view its points and assignment.
                                </div>
                            )}
                        </div>

                        <aside className="zbm-sidebar">
                            {selectedBeat ? (
                                <>
                                    <div className="zbm-selected-title">
                                        <span>
                                            <MapPin
                                                size={
                                                    18
                                                }
                                            />
                                        </span>

                                        <div>
                                            <small>
                                                SELECTED
                                                BEAT
                                            </small>
                                            <h3>
                                                {
                                                    selectedBeat.beatName
                                                }
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="zbm-info">
                                        <label>
                                            Ward
                                        </label>
                                        <strong>
                                            {selectedBeat.wardName ||
                                                "-"}
                                        </strong>
                                    </div>

                                    <div className="zbm-info">
                                        <label>
                                            Area
                                        </label>
                                        <strong>
                                            {selectedBeat.areaName ||
                                                "-"}
                                        </strong>
                                    </div>

                                    <div className="zbm-info">
                                        <label>
                                            Daroga
                                        </label>
                                        <strong>
                                            {uniqueNames(
                                                getSupervisors(
                                                    selectedBeat
                                                )
                                            ) ||
                                                "Not assigned"}
                                        </strong>
                                    </div>

                                    <div className="zbm-info">
                                        <label>
                                            Employee
                                        </label>
                                        <strong>
                                            {uniqueNames(
                                                getEmployees(
                                                    selectedBeat
                                                )
                                            ) ||
                                                "Not assigned"}
                                        </strong>
                                    </div>

                                    <div className="zbm-info">
                                        <label>
                                            Points
                                        </label>
                                        <strong>
                                            {Array.isArray(
                                                selectedBeat.points
                                            )
                                                ? selectedBeat
                                                      .points
                                                      .length
                                                : 0}
                                            /5
                                        </strong>
                                    </div>

                                    <div className="zbm-routes">
                                        <label>
                                            ROUTE
                                            ASSIGNMENT
                                        </label>

                                        {(selectedBeat.segments ||
                                            []).length ? (
                                            (
                                                selectedBeat.segments ||
                                                []
                                            ).map(
                                                (
                                                    segment: any,
                                                    index: number
                                                ) => (
                                                    <div
                                                        key={
                                                            segment.id ||
                                                            index
                                                        }
                                                        className="zbm-route-row"
                                                    >
                                                        <strong>
                                                            P
                                                            {index +
                                                                1}{" "}
                                                            -&gt;
                                                            P
                                                            {index +
                                                                2}
                                                        </strong>

                                                        <div>
                                                            <span>
                                                                {segment.supervisorAssignedToName ||
                                                                    "No Daroga"}
                                                            </span>

                                                            <small>
                                                                {segment.employeeAssignedToName ||
                                                                    "No Employee"}
                                                            </small>
                                                        </div>
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <div className="zbm-no-route">
                                                No route assignment available.
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className="zbm-open-beat"
                                        onClick={() =>
                                            onViewBeat(
                                                selectedBeat
                                            )
                                        }
                                    >
                                        <Eye
                                            size={15}
                                        />
                                        Open Full Beat
                                    </button>
                                </>
                            ) : (
                                <div className="zbm-empty">
                                    <MapIcon
                                        size={32}
                                    />
                                    <strong>
                                        Select a beat
                                    </strong>
                                    <p>
                                        Click any route on the
                                        map to inspect its
                                        assignment.
                                    </p>
                                </div>
                            )}
                        </aside>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .zbm-overlay{position:fixed;inset:0;z-index:120000;background:rgba(15,23,42,.62);backdrop-filter:blur(5px);display:grid;place-items:center;padding:20px}
                .zbm-shell{width:min(1420px,calc(100vw - 40px));height:min(820px,calc(100dvh - 40px));background:#fff;border-radius:18px;box-shadow:0 30px 85px rgba(15,23,42,.35);overflow:hidden;display:flex;flex-direction:column}
                .zbm-toolbar{height:76px;flex:0 0 76px;padding:12px 16px 12px 20px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:20px;background:#fff}
                .zbm-title small{display:block;font-size:9px;font-weight:900;letter-spacing:.08em;color:#2563eb}
                .zbm-title h2{margin:3px 0 1px;font-size:17px;line-height:1.25;color:#0f172a}
                .zbm-title p{margin:0;font-size:10px;color:#64748b;font-weight:700}
                .zbm-actions{display:flex;align-items:center;gap:10px}
                .zbm-tabs{display:flex;padding:3px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc}
                .zbm-tabs button{height:32px;border:0;border-radius:7px;padding:0 11px;background:transparent;color:#64748b;font-size:10px;font-weight:800;display:flex;align-items:center;gap:5px;cursor:pointer}
                .zbm-tabs button.active{background:#fff;color:#2563eb;box-shadow:0 1px 4px rgba(15,23,42,.1)}
                .zbm-close{width:36px;height:36px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;color:#64748b;display:grid;place-items:center;cursor:pointer}
                .zbm-table-scroll{flex:1;min-height:0;overflow:auto;padding:14px 16px 18px}
                .zbm-table{display:grid;grid-template-columns:minmax(110px,.85fr) 95px minmax(120px,1fr) minmax(145px,1.15fr) minmax(145px,1.15fr) 65px 100px 70px;gap:10px;align-items:center;min-width:1000px}
                .zbm-table-head{padding:0 10px 8px;font-size:9px;font-weight:900;text-transform:uppercase;color:#64748b}
                .zbm-table-row{min-height:50px;padding:7px 10px;margin-bottom:6px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;font-size:10px;color:#334155}
                .zbm-table-row>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .zbm-table-row>strong{color:#1d4ed8}
                .zbm-status{width:max-content;padding:5px 8px;border-radius:999px;font-size:8px;font-weight:900}
                .zbm-status.ready{background:#ecfdf5;color:#047857}
                .zbm-status.pending{background:#fff7ed;color:#c2410c}
                .zbm-view{height:29px;border:1px solid #bfdbfe;border-radius:7px;background:#eff6ff;color:#1d4ed8;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer}
                .zbm-map-layout{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 290px}
                .zbm-map-wrap{position:relative;min-width:0;min-height:0;background:#e2e8f0}
                .zbm-map-controls{position:absolute;right:12px;top:12px;z-index:1000;display:flex;padding:3px;border:1px solid #dbe3ee;border-radius:9px;background:#fff;box-shadow:0 4px 14px rgba(15,23,42,.14)}
                .zbm-map-controls button{height:30px;border:0;border-radius:6px;padding:0 10px;background:transparent;color:#64748b;font-size:9px;font-weight:900;cursor:pointer}
                .zbm-map-controls button.active{background:#eff6ff;color:#2563eb}
                .zbm-map-hint{position:absolute;left:14px;bottom:14px;z-index:1000;padding:8px 11px;border-radius:9px;background:rgba(15,23,42,.82);color:#fff;font-size:9px;font-weight:800}
                .zbm-sidebar{min-height:0;padding:16px;border-left:1px solid #e2e8f0;background:#fff;overflow:auto}
                .zbm-selected-title{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
                .zbm-selected-title>span{width:38px;height:38px;border-radius:10px;background:#dbeafe;color:#2563eb;display:grid;place-items:center}
                .zbm-selected-title small{font-size:8px;font-weight:900;letter-spacing:.08em;color:#94a3b8}
                .zbm-selected-title h3{margin:2px 0 0;font-size:16px;color:#0f172a}
                .zbm-info{padding:10px 0;border-bottom:1px solid #f1f5f9}
                .zbm-info label,.zbm-routes>label{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;color:#94a3b8;text-transform:uppercase}
                .zbm-info strong{display:block;margin-top:3px;font-size:11px;color:#334155}
                .zbm-routes{padding-top:13px}
                .zbm-route-row{margin-top:7px;padding:8px;border:1px solid #e2e8f0;border-radius:9px;background:#fff}
                .zbm-route-row>strong{display:block;margin-bottom:5px;font-size:10px;color:#2563eb}
                .zbm-route-row>div{display:grid;gap:2px}
                .zbm-route-row span{font-size:10px;font-weight:800;color:#334155}
                .zbm-route-row small{font-size:9px;color:#64748b}
                .zbm-no-route{margin-top:7px;padding:10px;border:1px dashed #cbd5e1;border-radius:9px;text-align:center;font-size:9px;color:#64748b}
                .zbm-open-beat{width:100%;height:38px;margin-top:14px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer}
                .zbm-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#94a3b8}
                .zbm-empty strong{margin-top:8px;font-size:12px;color:#334155}
                .zbm-empty p{max-width:190px;margin:5px 0 0;font-size:10px;line-height:1.45}
                .zbm-point-marker{background:transparent!important;border:0!important}
                .zbm-point-marker span{width:34px;height:34px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 3px 10px rgba(15,23,42,.35);display:grid;place-items:center;color:#fff;font-size:9px;font-weight:900}
                @media(max-width:850px){.zbm-overlay{padding:8px}.zbm-shell{width:100%;height:calc(100dvh - 16px)}.zbm-toolbar{height:auto;min-height:72px;flex-wrap:wrap}.zbm-map-layout{grid-template-columns:1fr;grid-template-rows:minmax(360px,1fr) 245px}.zbm-sidebar{border-left:0;border-top:1px solid #e2e8f0}}
            `}</style>
        </div>,
        document.body
    );
}
