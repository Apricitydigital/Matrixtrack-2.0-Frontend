"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Protected, RoleGuard } from "@components/Guards";
import { AreaBeatApi } from "@lib/apiClient";
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    MapPin,
    Search,
    Calendar,
    List,
    Map as MapIcon,
    User,
    Users,
    ChevronDown,
    ChevronRight,
    RefreshCw,
    Target,
    X,
    Building2
} from "lucide-react";
import { TableExportDropdown } from "@components/ui/TableExportDropdown";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
    () => import("react-leaflet").then(m => m.MapContainer),
    { ssr: false }
);

const TileLayer = dynamic(
    () => import("react-leaflet").then(m => m.TileLayer),
    { ssr: false }
);

const Polyline = dynamic(
    () => import("react-leaflet").then(m => m.Polyline),
    { ssr: false }
);

const CircleMarker = dynamic(
    () => import("react-leaflet").then(m => m.CircleMarker),
    { ssr: false }
);

const Popup = dynamic(
    () => import("react-leaflet").then(m => m.Popup),
    { ssr: false }
);


/* ============================================================
   TYPES
============================================================ */

type BeatStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_DONE";

interface BeatOverview {
    id: string;
    beatName: string;
    beatCode?: string;
    zoneId?: string;
    wardId?: string;
    areaId?: string;
    zoneName: string;
    wardName: string;
    areaName: string;
    geometry?: any;
    points?: any[];
    totalPoints: number;
    assessedPointsCount: number;
    beatCompletionStatus: BeatStatus;

    assignedTo?: {
        id: string;
        name: string;
        phone?: string;
    };

    supervisorsSummary: {
        id: string;
        name: string;
    }[];

    employeesSummary: {
        id: string;
        name: string;
    }[];

    segments: any[];
}

interface Summary {
    total: number;
    completed: number;
    inProgress: number;
    notDone: number;
}


/* ============================================================
   STATUS
============================================================ */

const STATUS_META: Record<
    BeatStatus,
    {
        label: string;
        color: string;
        bg: string;
        border: string;
        icon: React.ReactNode;
    }
> = {
    COMPLETED: {
        label: "Completed",
        color: "#15803d",
        bg: "#ecfdf3",
        border: "#bbf7d0",
        icon: <CheckCircle2 size={14} />
    },

    IN_PROGRESS: {
        label: "In Progress",
        color: "#b45309",
        bg: "#fff8eb",
        border: "#fde68a",
        icon: <Clock size={14} />
    },

    NOT_DONE: {
        label: "Pending",
        color: "#b91c1c",
        bg: "#fff1f2",
        border: "#fecdd3",
        icon: <AlertCircle size={14} />
    }
};

const MAP_COLORS: Record<BeatStatus, string> = {
    COMPLETED: "#22c55e",
    IN_PROGRESS: "#f59e0b",
    NOT_DONE: "#ef4444"
};


/* ============================================================
   HELPERS
============================================================ */

function todayStr() {
    return new Date().toISOString().split("T")[0];
}


function getCoords(geometry: any): [number, number][] {

    if (!geometry) return [];

    if (geometry.type === "LineString") {
        return geometry.coordinates.map(
            (c: number[]) => [c[1], c[0]]
        );
    }

    if (geometry.type === "MultiLineString") {
        return geometry.coordinates.flatMap(
            (l: number[][]) =>
                l.map(
                    (c: number[]) => [c[1], c[0]]
                )
        );
    }

    if (geometry.type === "Point") {
        return [
            [
                geometry.coordinates[1],
                geometry.coordinates[0]
            ]
        ];
    }

    return [];
}


function getBeatCoords(beat: any): [number, number][] {

    const coords: [number, number][] = [];

    if (
        Array.isArray(beat.segments) &&
        beat.segments.length > 0
    ) {
        for (const seg of beat.segments) {

            if (seg.geometry) {
                coords.push(
                    ...getCoords(seg.geometry)
                );
            }

        }
    }

    if (
        coords.length === 0 &&
        Array.isArray(beat.points) &&
        beat.points.length > 0
    ) {

        for (const p of beat.points) {

            const lat =
                p.latitude ?? p.lat;

            const lng =
                p.longitude ??
                p.lng ??
                p.lon;

            if (
                typeof lat === "number" &&
                typeof lng === "number"
            ) {
                coords.push([lat, lng]);
            }
        }
    }

    if (
        coords.length === 0 &&
        beat.geometry
    ) {
        coords.push(
            ...getCoords(beat.geometry)
        );
    }

    return coords;
}


function getBeatPointMarkers(beat: any) {

    const markers: {
        id: string;
        name: string;
        lat: number;
        lng: number;
        isAssessed: boolean;
    }[] = [];

    if (
        Array.isArray(beat.segments) &&
        beat.segments.length > 0
    ) {

        beat.segments.forEach(
            (seg: any, i: number) => {

                const segCoords =
                    getCoords(seg.geometry);

                const ptName =
                    seg.name ||
                    (
                        beat.points?.[i]?.name
                            ? `Point ${i + 1}: ${beat.points[i].name}`
                            : `Point ${i + 1}`
                    );

                if (segCoords.length > 0) {

                    const mid =
                        segCoords[
                            Math.floor(
                                segCoords.length / 2
                            )
                        ];

                    markers.push({
                        id:
                            seg.id ||
                            `seg-${i}`,
                        name: ptName,
                        lat: mid[0],
                        lng: mid[1],
                        isAssessed:
                            !!seg.isAssessed
                    });
                }
            }
        );

    } else if (
        Array.isArray(beat.points)
    ) {

        beat.points.forEach(
            (p: any, i: number) => {

                const lat =
                    p.latitude ?? p.lat;

                const lng =
                    p.longitude ??
                    p.lng ??
                    p.lon;

                if (
                    typeof lat === "number" &&
                    typeof lng === "number"
                ) {

                    const ptName =
                        p.name
                            ? `Point ${i + 1}: ${p.name}`
                            : `Point ${i + 1}`;

                    markers.push({
                        id: `pt-${i}`,
                        name: ptName,
                        lat,
                        lng,
                        isAssessed: false
                    });
                }
            }
        );
    }

    return markers;
}


/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({
    status
}: {
    status: BeatStatus;
}) {

    const m = STATUS_META[status];

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: m.bg,
                color: m.color,
                border: `1px solid ${m.border}`,
                borderRadius: 999,
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 800,
                whiteSpace: "nowrap"
            }}
        >
            {m.icon}

            {m.label}
        </span>
    );
}


/* ============================================================
   PROGRESS BAR
============================================================ */

function ProgressBar({
    assessed,
    total
}: {
    assessed: number;
    total: number;
}) {

    const pct =
        total > 0
            ? Math.round(
                (assessed / total) * 100
            )
            : 0;

    const color =
        pct === 100
            ? "#22c55e"
            : pct > 0
                ? "#f59e0b"
                : "#ef4444";

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 9
            }}
        >
            <div
                style={{
                    flex: 1,
                    height: 7,
                    background: "#e8edf5",
                    borderRadius: 999,
                    overflow: "hidden"
                }}
            >
                <div
                    style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: color,
                        borderRadius: 999,
                        transition:
                            "width 0.4s ease"
                    }}
                />
            </div>

            <span
                style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color,
                    minWidth: 50
                }}
            >
                {assessed}/{total}
            </span>
        </div>
    );
}


/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
    label,
    value,
    color,
    icon,
    active,
    onClick
}: any) {

    return (
        <button
            onClick={onClick}
            className="beat-summary-card"
            style={{
                background:
                    active
                        ? `linear-gradient(135deg, ${color}12 0%, #ffffff 72%)`
                        : "#ffffff",

                border:
                    active
                        ? `1.5px solid ${color}`
                        : "1px solid #e5eaf2",

                borderRadius: 18,

                minHeight: 105,

                padding: "18px 20px",

                cursor: "pointer",

                display: "flex",

                alignItems: "center",

                gap: 15,

                textAlign: "left",

                transition:
                    "transform .2s ease, box-shadow .2s ease, border-color .2s ease",

                boxShadow:
                    active
                        ? `0 12px 28px ${color}18`
                        : "0 7px 22px rgba(15,23,42,.055)"
            }}
        >

            <div
                style={{
                    width: 48,
                    height: 48,
                    minWidth: 48,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    borderRadius: 14,

                    background: `${color}14`,

                    color,

                    border:
                        `1px solid ${color}12`
                }}
            >
                {icon}
            </div>

            <div>

                <div
                    style={{
                        fontSize: 27,
                        lineHeight: 1,
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        color:
                            active
                                ? color
                                : "#0f172a"
                    }}
                >
                    {value}
                </div>

                <div
                    style={{
                        fontSize: 12,
                        marginTop: 8,
                        color: "#64748b",
                        fontWeight: 700
                    }}
                >
                    {label}
                </div>

            </div>

        </button>
    );
}


/* ============================================================
   BEAT LIST ROW
============================================================ */

function BeatListRow({
    beat,
    expanded,
    onToggle
}: {
    beat: BeatOverview;
    expanded: boolean;
    onToggle: () => void;
}) {

    return (
        <div
            className="beat-list-card"
            style={{
                border:
                    expanded
                        ? "1px solid #bfdbfe"
                        : "1px solid #e6ebf2",

                borderRadius: 16,

                overflow: "hidden",

                marginBottom: 10,

                background: "#ffffff",

                boxShadow:
                    expanded
                        ? "0 12px 28px rgba(37,99,235,.08)"
                        : "0 5px 18px rgba(15,23,42,.035)",

                transition:
                    "all .2s ease"
            }}
        >

            <button
                onClick={onToggle}
                className="beat-list-row"
                style={{
                    width: "100%",

                    background: "white",

                    border: "none",

                    cursor: "pointer",

                    padding: "16px 18px",

                    display: "grid",

                    gridTemplateColumns:
                        "2fr 1.35fr 1.5fr 1fr auto",

                    gap: 15,

                    alignItems: "center",

                    textAlign: "left"
                }}
            >

                <div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9
                        }}
                    >

                        <div
                            style={{
                                width: 31,
                                height: 31,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 9,
                                background: "#eff6ff",
                                color: "#2563eb"
                            }}
                        >
                            <Target size={15} />
                        </div>

                        <div>

                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 13,
                                    color: "#0f172a"
                                }}
                            >
                                {beat.beatName}
                            </div>

                            <div
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    color: "#94a3b8",
                                    marginTop: 3
                                }}
                            >
                                {beat.zoneName}
                                {" · "}
                                {beat.wardName}
                                {beat.areaName && beat.areaName !== "Unknown" ? ` · ${beat.areaName}` : ""}
                            </div>

                        </div>

                    </div>

                </div>


                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7
                    }}
                >

                    <User
                        size={14}
                        color="#94a3b8"
                    />

                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#475569"
                        }}
                    >
                        {
                            beat
                                .supervisorsSummary[0]
                                ?.name ||
                            beat.assignedTo?.name ||
                            "Unassigned"
                        }
                    </span>

                </div>


                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7
                    }}
                >

                    <Users
                        size={14}
                        color="#94a3b8"
                    />

                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#475569"
                        }}
                    >
                        {
                            beat.employeesSummary
                                .length > 0
                                ? beat
                                    .employeesSummary
                                    .map(
                                        e => e.name
                                    )
                                    .join(", ")
                                : "—"
                        }
                    </span>

                </div>


                <div
                    style={{
                        minWidth: 120
                    }}
                >
                    <ProgressBar
                        assessed={beat.assessedPointsCount}
                        total={beat.segments?.length || beat.totalPoints}
                    />
                </div>


                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9
                    }}
                >

                    <StatusBadge
                        status={
                            beat.beatCompletionStatus
                        }
                    />

                    {
                        expanded
                            ? (
                                <ChevronDown
                                    size={16}
                                    color="#94a3b8"
                                />
                            )
                            : (
                                <ChevronRight
                                    size={16}
                                    color="#94a3b8"
                                />
                            )
                    }

                </div>

            </button>


            {expanded && (

                <div
                    style={{
                        background:
                            "linear-gradient(180deg,#f8fbff 0%,#f8fafc 100%)",

                        borderTop:
                            "1px solid #e7edf5",

                        padding:
                            "16px 18px 18px"
                    }}
                >

                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 900,
                            color: "#64748b",
                            marginBottom: 10,
                            textTransform: "uppercase",
                            letterSpacing: 0.8
                        }}
                    >
                        Point Details — {Array.isArray(beat.points) ? beat.points.length : 0} geo points
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
                            gap: 8
                        }}
                    >
                        {(Array.isArray(beat.points) ? beat.points : []).map((point: any, i: number) => {
                            const lat = point.latitude ?? point.lat;
                            const lng = point.longitude ?? point.lng ?? point.lon;
                            const segment = beat.segments?.[i];

                            return (
                                <div
                                    key={point.code || `${beat.id}-point-${i}`}
                                    style={{
                                        background: "#ffffff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: 10,
                                        padding: "10px 12px"
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                                        <span style={{ fontWeight: 800, color: "#334155", fontSize: 11.5 }}>
                                            {point.name || `Point ${i + 1}`}
                                        </span>
                                        {segment ? (
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                color: segment.isAssessed ? "#15803d" : "#b45309",
                                                background: segment.isAssessed ? "#ecfdf3" : "#fff8eb",
                                                borderRadius: 999,
                                                padding: "3px 7px"
                                            }}>
                                                {segment.isAssessed ? "Inspected" : "Pending"}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div style={{ marginTop: 6, color: "#64748b", fontSize: 10.5, lineHeight: 1.55 }}>
                                        <div><b>Latitude:</b> {typeof lat === "number" ? lat.toFixed(6) : "—"}</div>
                                        <div><b>Longitude:</b> {typeof lng === "number" ? lng.toFixed(6) : "—"}</div>
                                        {point.type ? <div><b>Type:</b> {String(point.type).replaceAll("_", " ")}</div> : null}
                                    </div>
                                </div>
                            );
                        })}

                        {(!Array.isArray(beat.points) || beat.points.length === 0) && (
                            <div style={{ color: "#94a3b8", fontSize: 11.5 }}>No geo points available for this beat.</div>
                        )}
                    </div>

                </div>

            )}

        </div>
    );
}


/* ============================================================
   MAIN PAGE
============================================================ */

export default function BeatStatusPage() {

    const [
        beats,
        setBeats
    ] = useState<BeatOverview[]>([]);

    const [
        summary,
        setSummary
    ] = useState<Summary>({
        total: 0,
        completed: 0,
        inProgress: 0,
        notDone: 0
    });

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState<string | null>(null);

    const [
        view,
        setView
    ] = useState<"list" | "map">("map");

    const [
        selectedDate,
        setSelectedDate
    ] = useState(todayStr());

    const [
        statusFilter,
        setStatusFilter
    ] = useState<
        "ALL" |
        BeatStatus
    >("ALL");


    /* GEO FILTERS */

    const [
        selectedZoneId,
        setSelectedZoneId
    ] = useState<string>("ALL");

    const [
        selectedWardId,
        setSelectedWardId
    ] = useState<string>("ALL");

    const [
        selectedBeatId,
        setSelectedBeatId
    ] = useState<string>("ALL");


    const [
        search,
        setSearch
    ] = useState("");

    const [
        expandedId,
        setExpandedId
    ] = useState<string | null>(null);

    const [
        selectedBeat,
        setSelectedBeat
    ] = useState<BeatOverview | null>(null);

    const [
        lastRefreshed,
        setLastRefreshed
    ] = useState<Date | null>(null);

    const mapRef =
        useRef<any>(null);


    /* ========================================================
       FETCH DATA
    ======================================================== */

    const fetchData = async () => {

        setLoading(true);
        setError(null);

        try {

            const data =
                await AreaBeatApi
                    .beatStatusOverview({
                        date: selectedDate,
                        status: statusFilter
                    });

            setBeats(
                data.beats || []
            );

            setSummary(
                data.summary || {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    notDone: 0
                }
            );

            setLastRefreshed(
                new Date()
            );

        } catch (e: any) {

            setError(e.message);

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        fetchData();

    }, [
        selectedDate,
        statusFilter
    ]);


    /* ========================================================
       AVAILABLE ZONES
    ======================================================== */

    const availableZones =
        useMemo(() => {

            const map =
                new Map<
                    string,
                    string
                >();

            beats.forEach(b => {

                if (
                    b.zoneId &&
                    b.zoneName
                ) {
                    map.set(
                        b.zoneId,
                        b.zoneName
                    );
                }

            });

            return Array
                .from(map.entries())
                .map(
                    ([id, name]) => ({
                        id,
                        name
                    })
                );

        }, [beats]);


    /* ========================================================
       AVAILABLE WARDS
    ======================================================== */

    const availableWards =
        useMemo(() => {

            const map =
                new Map<
                    string,
                    string
                >();

            beats.forEach(b => {

                if (
                    selectedZoneId !==
                    "ALL" &&
                    b.zoneId !==
                    selectedZoneId
                ) {
                    return;
                }

                if (
                    b.wardId &&
                    b.wardName
                ) {
                    map.set(
                        b.wardId,
                        b.wardName
                    );
                }

            });

            return Array
                .from(map.entries())
                .map(
                    ([id, name]) => ({
                        id,
                        name
                    })
                );

        }, [
            beats,
            selectedZoneId
        ]);


    /* ========================================================
       AVAILABLE BEATS
    ======================================================== */

    const availableBeats =
        useMemo(() => {

            return beats.filter(b => {

                if (
                    selectedZoneId !==
                    "ALL" &&
                    b.zoneId !==
                    selectedZoneId
                ) {
                    return false;
                }

                if (
                    selectedWardId !==
                    "ALL" &&
                    b.wardId !==
                    selectedWardId
                ) {
                    return false;
                }

                return true;

            });

        }, [
            beats,
            selectedZoneId,
            selectedWardId
        ]);


    /* ========================================================
       FILTER DATA
    ======================================================== */

    const filtered =
        useMemo(() => {

            let result = beats;


            if (
                selectedZoneId !==
                "ALL"
            ) {

                result =
                    result.filter(
                        b =>
                            b.zoneId ===
                            selectedZoneId
                    );
            }


            if (
                selectedWardId !==
                "ALL"
            ) {

                result =
                    result.filter(
                        b =>
                            b.wardId ===
                            selectedWardId
                    );
            }


            if (
                selectedBeatId !==
                "ALL"
            ) {

                result =
                    result.filter(
                        b =>
                            b.id ===
                            selectedBeatId
                    );
            }


            if (search) {

                const q =
                    search.toLowerCase();

                result =
                    result.filter(
                        b =>
                            b.beatName
                                .toLowerCase()
                                .includes(q) ||

                            b.wardName
                                ?.toLowerCase()
                                .includes(q) ||

                            b.zoneName
                                ?.toLowerCase()
                                .includes(q) ||

                            b.areaName
                                ?.toLowerCase()
                                .includes(q) ||

                            b.supervisorsSummary
                                .some(
                                    s =>
                                        s.name
                                            .toLowerCase()
                                            .includes(q)
                                ) ||

                            b.employeesSummary
                                .some(
                                    e =>
                                        e.name
                                            .toLowerCase()
                                            .includes(q)
                                ) ||

                            b.segments
                                ?.some(
                                    (
                                        seg: any
                                    ) =>
                                        seg.name
                                            ?.toLowerCase()
                                            .includes(q)
                                )
                    );

            }

            return result;

        }, [
            beats,
            selectedZoneId,
            selectedWardId,
            selectedBeatId,
            search
        ]);


    /* ========================================================
       MAP CENTER
    ======================================================== */

    const mapCenter:
        [number, number] =
        useMemo(() => {

            for (
                const b
                of filtered
            ) {

                const c =
                    getBeatCoords(b);

                if (c.length) {
                    return c[0];
                }

            }

            return [
                22.7,
                75.8
            ];

        }, [filtered]);


    /* ========================================================
       AUTO FIT MAP
    ======================================================== */

    useEffect(() => {

        if (
            !mapRef.current ||
            !filtered.length
        ) {
            return;
        }

        const allCoords:
            [number, number][] = [];

        filtered.forEach(b => {

            allCoords.push(
                ...getBeatCoords(b)
            );

        });

        if (
            allCoords.length > 0
        ) {

            try {

                mapRef.current.fitBounds(
                    allCoords as any,
                    {
                        padding: [50, 50],
                        maxZoom: 16
                    }
                );

            } catch {}

        }

    }, [
        filtered,
        view
    ]);


    /* ========================================================
       PAGE
    ======================================================== */

    return (

        <Protected>

            <RoleGuard
                roles={[
                    "CITY_ADMIN",
                    "QC"
                ]}
            >

                <div
                    className="beat-status-page"
                    style={{
                        padding: "20px 22px 26px",

                        minHeight: "100vh",

                        background:
                            "linear-gradient(180deg,#f8fbff 0%,#f3f7fc 48%,#f8fafc 100%)",

                        fontFamily:
                            "'Inter', sans-serif"
                    }}
                >

                    {/* =========================================
                        PAGE INTRO + FILTER PANEL
                    ========================================= */}

                    <div
                        style={{
                            background: "#ffffff",

                            border:
                                "1px solid #e6ebf2",

                            borderRadius: 20,

                            padding: "20px",

                            boxShadow:
                                "0 10px 35px rgba(15,23,42,.055)",

                            marginBottom: 18
                        }}
                    >

                        <div
                            className="beat-page-head"
                            style={{
                                display: "flex",

                                justifyContent:
                                    "space-between",

                                alignItems:
                                    "flex-start",

                                gap: 20,

                                marginBottom: 18
                            }}
                        >

                            {/* TITLE */}

                            <div
                                style={{
                                    display: "flex",
                                    gap: 13,
                                    alignItems:
                                        "center"
                                }}
                            >

                                <div
                                    style={{
                                        width: 48,
                                        height: 48,

                                        minWidth: 48,

                                        display: "flex",

                                        alignItems:
                                            "center",

                                        justifyContent:
                                            "center",

                                        borderRadius: 15,

                                        color: "#ffffff",

                                        background:
                                            "linear-gradient(135deg,#2563eb 0%,#4f46e5 100%)",

                                        boxShadow:
                                            "0 10px 22px rgba(37,99,235,.23)"
                                    }}
                                >
                                    <Target
                                        size={22}
                                    />
                                </div>


                                <div>

                                    <div
                                        style={{
                                            display:
                                                "flex",

                                            alignItems:
                                                "center",

                                            gap: 8,

                                            marginBottom: 3
                                        }}
                                    >

                                        <span
                                            style={{
                                                padding:
                                                    "3px 8px",

                                                borderRadius:
                                                    999,

                                                background:
                                                    "#eff6ff",

                                                color:
                                                    "#2563eb",

                                                fontWeight:
                                                    900,

                                                fontSize: 9,

                                                letterSpacing:
                                                    ".08em",

                                                textTransform:
                                                    "uppercase"
                                            }}
                                        >
                                            Daily Monitoring
                                        </span>

                                    </div>

                                    <h1
                                        style={{
                                            margin: 0,

                                            fontSize: 23,

                                            lineHeight: 1.15,

                                            fontWeight: 900,

                                            letterSpacing:
                                                "-0.035em",

                                            color:
                                                "#0f172a"
                                        }}
                                    >
                                        Beat Sweeping Status
                                    </h1>

                                    <p
                                        style={{
                                            margin:
                                                "5px 0 0",

                                            fontSize: 12,

                                            lineHeight: 1.5,

                                            color:
                                                "#64748b",

                                            fontWeight: 500
                                        }}
                                    >
                                        Daily completion
                                        tracking
                                        {" · "}

                                        {
                                            lastRefreshed
                                                ? `Last refreshed ${lastRefreshed.toLocaleTimeString()}`
                                                : "Loading..."
                                        }
                                    </p>

                                </div>

                            </div>


                            {/* VIEW SWITCH */}

                            <div
                                style={{
                                    display: "flex",

                                    alignItems:
                                        "center",

                                    padding: 4,

                                    borderRadius: 12,

                                    border:
                                        "1px solid #e5eaf2",

                                    background:
                                        "#f8fafc"
                                }}
                            >

                                {[
                                    {
                                        v:
                                            "list" as const,
                                        icon:
                                            <List size={14} />,
                                        label:
                                            "List"
                                    },

                                    {
                                        v:
                                            "map" as const,
                                        icon:
                                            <MapIcon size={14} />,
                                        label:
                                            "Map"
                                    }
                                ].map(
                                    ({
                                        v,
                                        icon,
                                        label
                                    }) => (

                                        <button
                                            key={v}
                                            onClick={() =>
                                                setView(v)
                                            }
                                            style={{
                                                border:
                                                    "none",

                                                borderRadius:
                                                    9,

                                                cursor:
                                                    "pointer",

                                                fontSize: 12,

                                                fontWeight:
                                                    750,

                                                padding:
                                                    "8px 13px",

                                                display:
                                                    "flex",

                                                alignItems:
                                                    "center",

                                                gap: 6,

                                                background:
                                                    view === v
                                                        ? "#2563eb"
                                                        : "transparent",

                                                color:
                                                    view === v
                                                        ? "#ffffff"
                                                        : "#64748b",

                                                boxShadow:
                                                    view === v
                                                        ? "0 5px 14px rgba(37,99,235,.22)"
                                                        : "none",

                                                transition:
                                                    "all .2s"
                                            }}
                                        >
                                            {icon}
                                            {label}
                                        </button>

                                    )
                                )}

                            </div>

                        </div>


                        {/* FILTERS */}

                        <div
                            className="beat-filter-grid"
                            style={{
                                display: "grid",

                                gridTemplateColumns:
                                    "1fr 1fr 1.25fr 1fr auto auto",

                                gap: 9,

                                alignItems: "center"
                            }}
                        >

                            {/* ZONE */}

                            <div
                                className="filter-control"
                            >

                                <Building2
                                    size={15}
                                    color="#2563eb"
                                />

                                <div
                                    className="filter-control-text"
                                >

                                    <span>
                                        Zone
                                    </span>

                                    <select
                                        value={
                                            selectedZoneId
                                        }
                                        onChange={
                                            e => {

                                                setSelectedZoneId(
                                                    e.target
                                                        .value
                                                );

                                                setSelectedWardId(
                                                    "ALL"
                                                );

                                                setSelectedBeatId(
                                                    "ALL"
                                                );
                                            }
                                        }
                                    >

                                        <option
                                            value="ALL"
                                        >
                                            All Zones (
                                            {
                                                availableZones.length
                                            }
                                            )
                                        </option>

                                        {
                                            availableZones.map(
                                                z => (
                                                    <option
                                                        key={
                                                            z.id
                                                        }
                                                        value={
                                                            z.id
                                                        }
                                                    >
                                                        {
                                                            z.name
                                                        }
                                                    </option>
                                                )
                                            )
                                        }

                                    </select>

                                </div>

                            </div>


                            {/* WARD */}

                            <div
                                className="filter-control"
                            >

                                <MapPin
                                    size={15}
                                    color="#2563eb"
                                />

                                <div
                                    className="filter-control-text"
                                >

                                    <span>
                                        Ward
                                    </span>

                                    <select
                                        value={
                                            selectedWardId
                                        }
                                        onChange={
                                            e => {

                                                setSelectedWardId(
                                                    e.target
                                                        .value
                                                );

                                                setSelectedBeatId(
                                                    "ALL"
                                                );
                                            }
                                        }
                                    >

                                        <option
                                            value="ALL"
                                        >
                                            All Wards (
                                            {
                                                availableWards.length
                                            }
                                            )
                                        </option>

                                        {
                                            availableWards.map(
                                                w => (
                                                    <option
                                                        key={
                                                            w.id
                                                        }
                                                        value={
                                                            w.id
                                                        }
                                                    >
                                                        {
                                                            w.name
                                                        }
                                                    </option>
                                                )
                                            )
                                        }

                                    </select>

                                </div>

                            </div>


                            {/* BEAT */}

                            <div
                                className="filter-control"
                            >

                                <Target
                                    size={15}
                                    color="#2563eb"
                                />

                                <div
                                    className="filter-control-text"
                                >

                                    <span>
                                        Beat
                                    </span>

                                    <select
                                        value={
                                            selectedBeatId
                                        }
                                        onChange={
                                            e =>
                                                setSelectedBeatId(
                                                    e.target
                                                        .value
                                                )
                                        }
                                    >

                                        <option
                                            value="ALL"
                                        >
                                            All Beats (
                                            {
                                                availableBeats.length
                                            }
                                            )
                                        </option>

                                        {
                                            availableBeats.map(
                                                b => (

                                                    <option
                                                        key={
                                                            b.id
                                                        }
                                                        value={
                                                            b.id
                                                        }
                                                    >
                                                        {
                                                            b.beatName
                                                        }
                                                        {" ("}
                                                        {
                                                            b.assessedPointsCount
                                                        }
                                                        /
                                                        {
                                                            b.totalPoints
                                                        }
                                                        {" Pts)"}
                                                    </option>

                                                )
                                            )
                                        }

                                    </select>

                                </div>

                            </div>


                            {/* DATE */}

                            <div
                                className="filter-control"
                            >

                                <Calendar
                                    size={15}
                                    color="#64748b"
                                />

                                <div
                                    className="filter-control-text"
                                >

                                    <span>
                                        Date
                                    </span>

                                    <input
                                        type="date"
                                        value={
                                            selectedDate
                                        }
                                        onChange={
                                            e =>
                                                setSelectedDate(
                                                    e.target
                                                        .value
                                                )
                                        }
                                    />

                                </div>

                            </div>


                            {/* EXPORT */}

                            <div
                                className="export-wrap"
                            >

                                <TableExportDropdown

                                    data={
                                        filtered.map(
                                            b => ({
                                                BeatName:
                                                    b.beatName,

                                                Zone:
                                                    b.zoneName,

                                                Ward:
                                                    b.wardName,

                                                Status:
                                                    b.beatCompletionStatus,

                                                AssessedPoints:
                                                    `${b.assessedPointsCount}/${b.totalPoints}`
                                            })
                                        )
                                    }

                                    filename="Beat_Sweeping_Status"

                                    title="Beat Sweeping Status Report"
                                />

                            </div>


                            {/* REFRESH */}

                            <button
                                onClick={
                                    fetchData
                                }
                                className="refresh-button"
                            >

                                <RefreshCw
                                    size={14}
                                    className={
                                        loading
                                            ? "spin"
                                            : ""
                                    }
                                />

                                Refresh

                            </button>

                        </div>

                    </div>


                    {/* =========================================
                        SUMMARY CARDS
                    ========================================= */}

                    <div
                        className="summary-grid"
                        style={{
                            display: "grid",

                            gridTemplateColumns:
                                "repeat(4,minmax(0,1fr))",

                            gap: 13,

                            marginBottom: 16
                        }}
                    >

                        <SummaryCard
                            label="Total Beats"
                            value={
                                summary.total
                            }
                            color="#2563eb"
                            icon={
                                <Target
                                    size={21}
                                />
                            }
                            active={
                                statusFilter ===
                                "ALL"
                            }
                            onClick={() => {

                                setStatusFilter(
                                    "ALL"
                                );

                                setSelectedBeatId(
                                    "ALL"
                                );
                            }}
                        />


                        <SummaryCard
                            label="Completed"
                            value={
                                summary.completed
                            }
                            color="#22c55e"
                            icon={
                                <CheckCircle2
                                    size={21}
                                />
                            }
                            active={
                                statusFilter ===
                                "COMPLETED"
                            }
                            onClick={() => {

                                setStatusFilter(
                                    "COMPLETED"
                                );

                                setSelectedBeatId(
                                    "ALL"
                                );
                            }}
                        />


                        <SummaryCard
                            label="In Progress"
                            value={
                                summary.inProgress
                            }
                            color="#f59e0b"
                            icon={
                                <Clock
                                    size={21}
                                />
                            }
                            active={
                                statusFilter ===
                                "IN_PROGRESS"
                            }
                            onClick={() => {

                                setStatusFilter(
                                    "IN_PROGRESS"
                                );

                                setSelectedBeatId(
                                    "ALL"
                                );
                            }}
                        />


                        <SummaryCard
                            label="Pending"
                            value={
                                summary.notDone
                            }
                            color="#ef4444"
                            icon={
                                <AlertCircle
                                    size={21}
                                />
                            }
                            active={
                                statusFilter ===
                                "NOT_DONE"
                            }
                            onClick={() => {

                                setStatusFilter(
                                    "NOT_DONE"
                                );

                                setSelectedBeatId(
                                    "ALL"
                                );
                            }}
                        />

                    </div>


                    {/* =========================================
                        SEARCH
                    ========================================= */}

                    <div
                        style={{
                            background: "#ffffff",

                            border:
                                "1px solid #e5eaf2",

                            borderRadius: 14,

                            padding:
                                "10px 14px",

                            display: "flex",

                            alignItems: "center",

                            gap: 10,

                            marginBottom: 14,

                            boxShadow:
                                "0 5px 18px rgba(15,23,42,.035)"
                        }}
                    >

                        <div
                            style={{
                                width: 30,
                                height: 30,

                                borderRadius: 9,

                                display: "flex",

                                alignItems:
                                    "center",

                                justifyContent:
                                    "center",

                                background:
                                    "#f8fafc",

                                color:
                                    "#94a3b8"
                            }}
                        >
                            <Search size={15} />
                        </div>


                        <input
                            placeholder="Search beats, points, supervisors, employees, zones, wards..."
                            value={search}
                            onChange={
                                e =>
                                    setSearch(
                                        e.target.value
                                    )
                            }
                            style={{
                                flex: 1,

                                minWidth: 0,

                                border: "none",

                                outline: "none",

                                fontSize: 12.5,

                                fontFamily:
                                    "inherit",

                                fontWeight: 500,

                                color:
                                    "#0f172a",

                                background:
                                    "transparent"
                            }}
                        />


                        {search && (

                            <button
                                onClick={() =>
                                    setSearch("")
                                }
                                style={{
                                    width: 27,
                                    height: 27,

                                    display: "flex",

                                    alignItems:
                                        "center",

                                    justifyContent:
                                        "center",

                                    background:
                                        "#f8fafc",

                                    border:
                                        "1px solid #e5eaf2",

                                    borderRadius: 8,

                                    cursor:
                                        "pointer"
                                }}
                            >
                                <X
                                    size={13}
                                    color="#64748b"
                                />
                            </button>

                        )}


                        <span
                            style={{
                                padding:
                                    "5px 9px",

                                borderRadius: 999,

                                fontSize: 10.5,

                                fontWeight: 800,

                                background:
                                    "#eff6ff",

                                color:
                                    "#2563eb",

                                whiteSpace:
                                    "nowrap"
                            }}
                        >
                            {filtered.length}
                            {" beats showing"}
                        </span>

                    </div>


                    {/* =========================================
                        LOADING
                    ========================================= */}

                    {loading && (

                        <div
                            style={{
                                minHeight: 350,

                                background:
                                    "#ffffff",

                                border:
                                    "1px solid #e5eaf2",

                                borderRadius: 18,

                                display:
                                    "flex",

                                flexDirection:
                                    "column",

                                justifyContent:
                                    "center",

                                alignItems:
                                    "center",

                                boxShadow:
                                    "0 8px 28px rgba(15,23,42,.04)"
                            }}
                        >

                            <div
                                style={{
                                    width: 39,
                                    height: 39,

                                    border:
                                        "3px solid #e5eaf2",

                                    borderTopColor:
                                        "#2563eb",

                                    borderRadius:
                                        "50%",

                                    animation:
                                        "spin .8s linear infinite"
                                }}
                            />

                            <p
                                style={{
                                    color:
                                        "#64748b",

                                    fontSize: 12,

                                    fontWeight: 700,

                                    marginTop: 13
                                }}
                            >
                                Loading beat status...
                            </p>

                        </div>

                    )}


                    {/* =========================================
                        ERROR
                    ========================================= */}

                    {error && !loading && (

                        <div
                            style={{
                                background:
                                    "#fff1f2",

                                border:
                                    "1px solid #fecdd3",

                                borderRadius: 16,

                                padding: 25,

                                textAlign:
                                    "center",

                                color:
                                    "#b91c1c",

                                fontWeight: 600
                            }}
                        >

                            <AlertCircle
                                size={22}
                                style={{
                                    marginBottom: 7
                                }}
                            />

                            <p
                                style={{
                                    margin: 0
                                }}
                            >
                                {error}
                            </p>

                        </div>

                    )}


                    {/* =========================================
                        LIST
                    ========================================= */}

                    {!loading &&
                        !error &&
                        view === "list" && (

                        <div
                            style={{
                                background:
                                    "#ffffff",

                                border:
                                    "1px solid #e5eaf2",

                                borderRadius: 18,

                                padding: 14,

                                boxShadow:
                                    "0 8px 28px rgba(15,23,42,.04)"
                            }}
                        >

                            <div
                                className="beat-list-column-head"
                                style={{
                                    display:
                                        "grid",

                                    gridTemplateColumns:
                                        "2fr 1.35fr 1.5fr 1fr auto",

                                    gap: 15,

                                    padding:
                                        "7px 18px 12px",

                                    fontSize: 9.5,

                                    fontWeight:
                                        900,

                                    color:
                                        "#94a3b8",

                                    textTransform:
                                        "uppercase",

                                    letterSpacing:
                                        0.8
                                }}
                            >
                                <span>
                                    Beat
                                </span>

                                <span>
                                    Supervisor
                                </span>

                                <span>
                                    Employees
                                </span>

                                <span>
                                    Progress
                                </span>

                                <span>
                                    Status
                                </span>
                            </div>


                            {filtered.length ===
                                0 && (

                                <div
                                    style={{
                                        textAlign:
                                            "center",

                                        padding:
                                            "65px 0",

                                        color:
                                            "#94a3b8"
                                    }}
                                >

                                    <MapPin
                                        size={34}
                                        style={{
                                            marginBottom:
                                                12
                                        }}
                                    />

                                    <p
                                        style={{
                                            fontWeight:
                                                600
                                        }}
                                    >
                                        No beats found
                                        for the selected
                                        filter.
                                    </p>

                                </div>

                            )}


                            {filtered.map(
                                beat => (

                                    <BeatListRow

                                        key={
                                            beat.id
                                        }

                                        beat={
                                            beat
                                        }

                                        expanded={
                                            expandedId ===
                                            beat.id
                                        }

                                        onToggle={() =>
                                            setExpandedId(
                                                expandedId ===
                                                    beat.id
                                                    ? null
                                                    : beat.id
                                            )
                                        }
                                    />

                                )
                            )}

                        </div>

                    )}


                    {/* =========================================
                        MAP
                    ========================================= */}

                    {!loading &&
                        !error &&
                        view === "map" && (

                        <div
                            className="map-shell"
                            style={{
                                height: "67vh",

                                minHeight: 480,

                                borderRadius: 18,

                                overflow: "hidden",

                                border:
                                    "1px solid #dfe6ef",

                                position:
                                    "relative",

                                background:
                                    "#ffffff",

                                boxShadow:
                                    "0 12px 35px rgba(15,23,42,.07)"
                            }}
                        >

                            <MapContainer
                                center={
                                    mapCenter
                                }
                                zoom={13}
                                ref={mapRef}
                                style={{
                                    height:
                                        "100%",
                                    width:
                                        "100%"
                                }}
                            >

                                <TileLayer
                                    attribution="© CARTO"
                                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                />


                                {filtered.map(
                                    beat => {

                                        const coords =
                                            getBeatCoords(
                                                beat
                                            );

                                        const pointMarkers =
                                            getBeatPointMarkers(
                                                beat
                                            );

                                        if (
                                            !coords.length &&
                                            !pointMarkers.length
                                        ) {
                                            return null;
                                        }


                                        const color =
                                            MAP_COLORS[
                                                beat
                                                    .beatCompletionStatus
                                            ];


                                        const isSelected =
                                            selectedBeatId ===
                                                beat.id ||
                                            selectedBeat?.id ===
                                                beat.id;


                                        return (

                                            <React.Fragment
                                                key={
                                                    beat.id
                                                }
                                            >

                                                {coords.length >
                                                    0 && (

                                                    <>

                                                        <Polyline
                                                            positions={
                                                                coords as any
                                                            }
                                                            pathOptions={{
                                                                color,
                                                                weight:
                                                                    isSelected
                                                                        ? 20
                                                                        : 14,
                                                                opacity:
                                                                    0.18
                                                            }}
                                                        />


                                                        <Polyline
                                                            positions={
                                                                coords as any
                                                            }
                                                            pathOptions={{
                                                                color,
                                                                weight:
                                                                    isSelected
                                                                        ? 7
                                                                        : 4,
                                                                opacity:
                                                                    1,
                                                                lineCap:
                                                                    "round"
                                                            }}
                                                            eventHandlers={{
                                                                click: () => {

                                                                    setSelectedBeat(
                                                                        isSelected
                                                                            ? null
                                                                            : beat
                                                                    );

                                                                    setSelectedBeatId(
                                                                        beat.id
                                                                    );
                                                                }
                                                            }}
                                                        >

                                                            <Popup
                                                                closeButton={
                                                                    false
                                                                }
                                                            >

                                                                <div
                                                                    style={{
                                                                        fontFamily:
                                                                            "'Inter',sans-serif",

                                                                        minWidth:
                                                                            220,

                                                                        padding:
                                                                            "2px"
                                                                    }}
                                                                >

                                                                    <div
                                                                        style={{
                                                                            fontWeight:
                                                                                900,

                                                                            fontSize:
                                                                                14,

                                                                            color:
                                                                                "#0f172a",

                                                                            marginBottom:
                                                                                7
                                                                        }}
                                                                    >
                                                                        {
                                                                            beat.beatName
                                                                        }
                                                                    </div>


                                                                    <StatusBadge
                                                                        status={
                                                                            beat.beatCompletionStatus
                                                                        }
                                                                    />


                                                                    <div
                                                                        style={{
                                                                            marginTop:
                                                                                11,

                                                                            fontSize:
                                                                                11.5,

                                                                            color:
                                                                                "#475569",

                                                                            display:
                                                                                "flex",

                                                                            flexDirection:
                                                                                "column",

                                                                            gap: 5
                                                                        }}
                                                                    >

                                                                        <div>
                                                                            <b>
                                                                                Zone / Ward / Area:
                                                                            </b>
                                                                            {" "}
                                                                            {beat.zoneName}
                                                                            {" · "}
                                                                            {beat.wardName}
                                                                            {beat.areaName && beat.areaName !== "Unknown" ? ` · ${beat.areaName}` : ""}
                                                                        </div>

                                                                        <div>
                                                                            <b>
                                                                                Supervisor:
                                                                            </b>
                                                                            {" "}
                                                                            {
                                                                                beat
                                                                                    .supervisorsSummary[0]
                                                                                    ?.name ||
                                                                                "Unassigned"
                                                                            }
                                                                        </div>

                                                                        <div>
                                                                            <b>
                                                                                Progress:
                                                                            </b>
                                                                            {" "}
                                                                            {
                                                                                beat.assessedPointsCount
                                                                            }
                                                                            /
                                                                            {
                                                                                beat.totalPoints
                                                                            }
                                                                            {" points reported"}
                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            </Popup>

                                                        </Polyline>

                                                    </>

                                                )}


                                                {pointMarkers.map(
                                                    pt => (

                                                        <CircleMarker

                                                            key={
                                                                pt.id
                                                            }

                                                            center={[
                                                                pt.lat,
                                                                pt.lng
                                                            ]}

                                                            radius={
                                                                isSelected
                                                                    ? 8
                                                                    : 6
                                                            }

                                                            pathOptions={{
                                                                color:
                                                                    pt.isAssessed
                                                                        ? "#15803d"
                                                                        : "#b91c1c",

                                                                fillColor:
                                                                    pt.isAssessed
                                                                        ? "#22c55e"
                                                                        : "#ef4444",

                                                                fillOpacity:
                                                                    0.92,

                                                                weight:
                                                                    2
                                                            }}
                                                        >

                                                            <Popup
                                                                closeButton={
                                                                    false
                                                                }
                                                            >

                                                                <div
                                                                    style={{
                                                                        fontFamily:
                                                                            "'Inter',sans-serif",

                                                                        minWidth:
                                                                            180
                                                                    }}
                                                                >

                                                                    <div
                                                                        style={{
                                                                            fontSize:
                                                                                9,

                                                                            fontWeight:
                                                                                900,

                                                                            color:
                                                                                "#64748b",

                                                                            letterSpacing:
                                                                                ".07em",

                                                                            textTransform:
                                                                                "uppercase"
                                                                        }}
                                                                    >
                                                                        {
                                                                            beat.beatName
                                                                        }
                                                                    </div>

                                                                    <div
                                                                        style={{
                                                                            fontWeight:
                                                                                900,

                                                                            fontSize:
                                                                                13,

                                                                            color:
                                                                                "#0f172a",

                                                                            margin:
                                                                                "3px 0 7px"
                                                                        }}
                                                                    >
                                                                        {
                                                                            pt.name
                                                                        }
                                                                    </div>

                                                                    <span
                                                                        style={{
                                                                            display:
                                                                                "inline-block",

                                                                            padding:
                                                                                "4px 8px",

                                                                            borderRadius:
                                                                                999,

                                                                            fontSize:
                                                                                10.5,

                                                                            fontWeight:
                                                                                800,

                                                                            background:
                                                                                pt.isAssessed
                                                                                    ? "#ecfdf3"
                                                                                    : "#fff1f2",

                                                                            color:
                                                                                pt.isAssessed
                                                                                    ? "#15803d"
                                                                                    : "#b91c1c"
                                                                        }}
                                                                    >
                                                                        {
                                                                            pt.isAssessed
                                                                                ? "✓ Inspected Today"
                                                                                : "✗ Pending Inspection"
                                                                        }
                                                                    </span>

                                                                </div>

                                                            </Popup>

                                                        </CircleMarker>

                                                    )
                                                )}

                                            </React.Fragment>

                                        );

                                    }
                                )}

                            </MapContainer>


                            {/* MAP LEGEND */}

                            <div
                                className="map-legend"
                                style={{
                                    position:
                                        "absolute",

                                    bottom: 18,

                                    right: 18,

                                    zIndex:
                                        1000,

                                    minWidth:
                                        175,

                                    background:
                                        "rgba(255,255,255,.96)",

                                    backdropFilter:
                                        "blur(12px)",

                                    borderRadius:
                                        14,

                                    padding:
                                        "13px 14px",

                                    border:
                                        "1px solid rgba(226,232,240,.9)",

                                    boxShadow:
                                        "0 12px 30px rgba(15,23,42,.13)",

                                    display:
                                        "flex",

                                    flexDirection:
                                        "column",

                                    gap: 7
                                }}
                            >

                                <div
                                    style={{
                                        fontSize: 9,

                                        fontWeight:
                                            900,

                                        color:
                                            "#64748b",

                                        textTransform:
                                            "uppercase",

                                        letterSpacing:
                                            0.8,

                                        marginBottom:
                                            2
                                    }}
                                >
                                    Beat Status
                                </div>


                                {(
                                    [
                                        "COMPLETED",
                                        "IN_PROGRESS",
                                        "NOT_DONE"
                                    ] as BeatStatus[]
                                ).map(
                                    s => (

                                        <div
                                            key={s}
                                            style={{
                                                display:
                                                    "flex",

                                                alignItems:
                                                    "center",

                                                gap: 8,

                                                fontSize:
                                                    11,

                                                fontWeight:
                                                    700
                                            }}
                                        >

                                            <div
                                                style={{
                                                    width:
                                                        20,

                                                    height:
                                                        4,

                                                    background:
                                                        MAP_COLORS[
                                                            s
                                                        ],

                                                    borderRadius:
                                                        999
                                                }}
                                            />

                                            <span
                                                style={{
                                                    color:
                                                        STATUS_META[
                                                            s
                                                        ].color
                                                }}
                                            >
                                                {
                                                    STATUS_META[
                                                        s
                                                    ].label
                                                }
                                            </span>

                                        </div>

                                    )
                                )}


                                <div
                                    style={{
                                        height: 1,

                                        background:
                                            "#e5eaf2",

                                        margin:
                                            "4px 0"
                                    }}
                                />


                                <div
                                    style={{
                                        fontSize: 9,

                                        fontWeight:
                                            900,

                                        color:
                                            "#64748b",

                                        textTransform:
                                            "uppercase",

                                        letterSpacing:
                                            0.8
                                    }}
                                >
                                    Point Status
                                </div>


                                <div
                                    style={{
                                        display:
                                            "flex",

                                        alignItems:
                                            "center",

                                        gap: 8,

                                        fontSize:
                                            11,

                                        fontWeight:
                                            700
                                    }}
                                >

                                    <div
                                        style={{
                                            width: 9,
                                            height: 9,

                                            borderRadius:
                                                "50%",

                                            background:
                                                "#22c55e",

                                            boxShadow:
                                                "0 0 0 3px rgba(34,197,94,.12)"
                                        }}
                                    />

                                    <span
                                        style={{
                                            color:
                                                "#15803d"
                                        }}
                                    >
                                        Point Inspected
                                    </span>

                                </div>


                                <div
                                    style={{
                                        display:
                                            "flex",

                                        alignItems:
                                            "center",

                                        gap: 8,

                                        fontSize:
                                            11,

                                        fontWeight:
                                            700
                                    }}
                                >

                                    <div
                                        style={{
                                            width: 9,
                                            height: 9,

                                            borderRadius:
                                                "50%",

                                            background:
                                                "#ef4444",

                                            boxShadow:
                                                "0 0 0 3px rgba(239,68,68,.12)"
                                        }}
                                    />

                                    <span
                                        style={{
                                            color:
                                                "#b91c1c"
                                        }}
                                    >
                                        Point Pending
                                    </span>

                                </div>

                            </div>

                        </div>

                    )}


                    {/* =========================================
                        UI STYLES ONLY
                    ========================================= */}

                    <style>{`

                        @keyframes spin {
                            to {
                                transform: rotate(360deg);
                            }
                        }

                        .spin {
                            animation: spin .8s linear infinite;
                        }

                        .beat-summary-card:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 14px 30px rgba(15,23,42,.09) !important;
                        }

                        .beat-list-card:hover {
                            border-color: #d7e2f1 !important;
                            box-shadow: 0 9px 24px rgba(15,23,42,.065) !important;
                        }

                        .filter-control {
                            min-height: 47px;
                            display: flex;
                            align-items: center;
                            gap: 9px;
                            background: #f8fafc;
                            border: 1px solid #e5eaf2;
                            border-radius: 12px;
                            padding: 7px 11px;
                            transition: all .2s ease;
                            min-width: 0;
                        }

                        .filter-control:hover {
                            background: #ffffff;
                            border-color: #bfdbfe;
                            box-shadow: 0 4px 13px rgba(37,99,235,.055);
                        }

                        .filter-control:focus-within {
                            background: #ffffff;
                            border-color: #93c5fd;
                            box-shadow: 0 0 0 3px rgba(37,99,235,.07);
                        }

                        .filter-control-text {
                            min-width: 0;
                            width: 100%;
                            display: flex;
                            flex-direction: column;
                            gap: 1px;
                        }

                        .filter-control-text > span {
                            font-size: 8px;
                            line-height: 1;
                            font-weight: 900;
                            letter-spacing: .07em;
                            text-transform: uppercase;
                            color: #94a3b8;
                        }

                        .filter-control select,
                        .filter-control input {
                            width: 100%;
                            min-width: 0;
                            border: none;
                            outline: none;
                            background: transparent;
                            font-family: inherit;
                            font-size: 11.5px;
                            line-height: 1.2;
                            font-weight: 750;
                            color: #0f172a;
                            cursor: pointer;
                            padding: 1px 0;
                        }

                        .refresh-button {
                            min-height: 47px;
                            padding: 0 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 6px;
                            border: 1px solid #dbeafe;
                            border-radius: 12px;
                            background: #eff6ff;
                            color: #2563eb;
                            font-size: 11.5px;
                            font-weight: 800;
                            cursor: pointer;
                            white-space: nowrap;
                            transition: all .2s ease;
                        }

                        .refresh-button:hover {
                            background: #2563eb;
                            color: #ffffff;
                            border-color: #2563eb;
                            box-shadow: 0 7px 18px rgba(37,99,235,.18);
                        }

                        .export-wrap {
                            display: flex;
                            align-items: stretch;
                            min-height: 47px;
                        }

                        .export-wrap > * {
                            height: 100%;
                        }

                        .leaflet-control-zoom {
                            border: 1px solid #dfe6ef !important;
                            border-radius: 10px !important;
                            overflow: hidden;
                            box-shadow: 0 7px 20px rgba(15,23,42,.10) !important;
                        }

                        .leaflet-control-zoom a {
                            border: none !important;
                            color: #334155 !important;
                        }

                        .leaflet-popup-content-wrapper {
                            border-radius: 13px !important;
                            box-shadow: 0 12px 30px rgba(15,23,42,.15) !important;
                        }

                        .leaflet-popup-content {
                            margin: 13px 15px !important;
                        }

                        @media (max-width: 1250px) {

                            .beat-filter-grid {
                                grid-template-columns: repeat(3,minmax(0,1fr)) !important;
                            }

                            .summary-grid {
                                grid-template-columns: repeat(2,minmax(0,1fr)) !important;
                            }

                        }

                        @media (max-width: 900px) {

                            .beat-status-page {
                                padding: 14px !important;
                            }

                            .beat-page-head {
                                flex-direction: column;
                            }

                            .beat-filter-grid {
                                grid-template-columns: repeat(2,minmax(0,1fr)) !important;
                            }

                            .beat-list-column-head {
                                display: none !important;
                            }

                            .beat-list-row {
                                grid-template-columns: 1fr !important;
                            }

                            .map-shell {
                                min-height: 520px !important;
                            }

                        }

                        @media (max-width: 640px) {

                            .beat-filter-grid {
                                grid-template-columns: 1fr !important;
                            }

                            .summary-grid {
                                grid-template-columns: 1fr !important;
                            }

                            .map-legend {
                                right: 10px !important;
                                bottom: 10px !important;
                            }

                        }

                    `}</style>

                </div>

            </RoleGuard>

        </Protected>

    );
}