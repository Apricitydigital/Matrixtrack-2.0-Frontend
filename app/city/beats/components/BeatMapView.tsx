"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Plus, Minus, FileText, X, Navigation, UserPlus, Edit2, User, Users, Filter, CheckCircle2 } from "lucide-react";
import AssignBeatModal from "./AssignBeatModal";

// Dynamic imports for Leaflet
import type { MapContainerProps, TileLayerProps, GeoJSONProps, PopupProps } from "react-leaflet";

const MapContainer = dynamic<MapContainerProps>(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic<TileLayerProps>(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const GeoJSON = dynamic<GeoJSONProps>(
    () => import("react-leaflet").then((mod) => mod.GeoJSON),
    { ssr: false }
);
const Popup = dynamic<PopupProps>(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);

// Helper component to fit bounds
function FitBounds({ beat }: { beat: any }) {
    const { useMap } = require("react-leaflet");
    const map = useMap();

    useEffect(() => {
        if (!map || !beat) return;

        const L = require("leaflet");

        map.invalidateSize();

        const timer = setTimeout(() => {
            const group = new L.FeatureGroup();

            /* ================================
               ORIGINAL IMPORTED BEAT GEOMETRY
            ================================= */

            let geometry = beat.geometry;

            if (typeof geometry === "string") {
                try {
                    geometry = JSON.parse(geometry);
                } catch {
                    geometry = null;
                }
            }

            if (geometry) {
                try {
                    group.addLayer(
                        L.geoJSON(geometry)
                    );
                } catch { }
            }


            /* ================================
               SAVED P1 - P5
            ================================= */

            const points =
                Array.isArray(beat.points)
                    ? beat.points
                    : [];

            points.forEach((point: any) => {
                const lat =
                    Number(
                        point?.latitude ??
                        point?.lat
                    );

                const lng =
                    Number(
                        point?.longitude ??
                        point?.lng ??
                        point?.lon
                    );

                if (
                    Number.isFinite(lat) &&
                    Number.isFinite(lng)
                ) {
                    group.addLayer(
                        L.circleMarker(
                            [lat, lng],
                            {
                                radius: 1,
                            }
                        )
                    );
                }
            });


            /* ================================
               FIT BEAT + ALL FIVE POINTS
            ================================= */

            if (
                group.getLayers().length >
                0
            ) {
                const bounds =
                    group.getBounds();

                if (bounds.isValid()) {
                    map.fitBounds(
                        bounds,
                        {
                            padding: [
                                70,
                                70,
                            ],
                            maxZoom: 18,
                        }
                    );
                }
            }

        }, 150);

        return () =>
            clearTimeout(timer);

    }, [
        beat?.id,
        beat?.geometry,
        beat?.points,
        map,
    ]);

    return null;
}

// Helper component to fit supervisor bounds when supervisor filter is selected
function FitSupervisorBounds({ beat, selectedSupervisorId }: { beat: any; selectedSupervisorId: string | null }) {
    const { useMap } = require("react-leaflet");
    const map = useMap();

    useEffect(() => {
        if (!map || !selectedSupervisorId) return;
        const L = require("leaflet");

        const group = new L.FeatureGroup();

        if (beat.segments && Array.isArray(beat.segments)) {
            beat.segments.forEach((seg: any) => {
                const supId = seg.supervisorAssignedToId || seg.assignedToId || beat.assignedToId;
                if (supId === selectedSupervisorId) {
                    let segGeom = seg.geometry;
                    if (typeof segGeom === "string") {
                        try { segGeom = JSON.parse(segGeom); } catch { }
                    }
                    if (segGeom) {
                        try { group.addLayer(L.geoJSON(segGeom)); } catch { }
                    }
                }
            });
        }

        if (group.getLayers().length > 0) {
            const bounds = group.getBounds();
            if (bounds.isValid()) {
                map.flyToBounds(bounds, { padding: [80, 80], duration: 0.8 });
            }
        }
    }, [beat, selectedSupervisorId, map]);

    return null;
}

export interface BeatMapViewProps {
    beat: any;
    filterUserId?: string | null;
    assignmentMode?: "SUPERVISOR" | "EMPLOYEE";
    onClose: () => void;
    onEdit?: (beat: any) => void;
    onRefresh?: () => void;
}

const VIBRANT_COLORS = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
    "#06b6d4", "#ec4899", "#6366f1", "#f97316", "#84cc16"
];

const getFeatureColor = (feature: any) => {
    const name = feature.properties?.name || "";
    let hash = 0;
    if (name) {
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
    } else {
        const coords = JSON.stringify(feature.geometry.coordinates);
        for (let i = 0; i < Math.min(coords.length, 50); i++) {
            hash = coords.charCodeAt(i) + ((hash << 5) - hash);
        }
    }
    return VIBRANT_COLORS[Math.abs(hash) % VIBRANT_COLORS.length];
};

const parseGeoJSON = (value: any) => {
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

const readProperty = (properties: any, keys: string[]) => {
    if (!properties || typeof properties !== "object") return null;

    const actualKeys = Object.keys(properties);

    for (const wantedKey of keys) {
        const exact = properties[wantedKey];

        if (
            exact !== undefined &&
            exact !== null &&
            String(exact).trim() !== ""
        ) {
            return String(exact).trim();
        }

        const matchingKey = actualKeys.find(
            key => key.toLowerCase() === wantedKey.toLowerCase()
        );

        if (matchingKey) {
            const value = properties[matchingKey];

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                return String(value).trim();
            }
        }
    }

    return null;
};

const collectGeometryFeatures = (geometry: any) => {
    const parsed = parseGeoJSON(geometry);

    if (!parsed) return [];

    const collected: any[] = [];

    const walk = (value: any, inheritedProperties: any = {}) => {
        if (!value) return;

        if (value.type === "FeatureCollection") {
            (value.features || []).forEach((feature: any) =>
                walk(feature, inheritedProperties)
            );
            return;
        }

        if (value.type === "Feature") {
            const properties = {
                ...inheritedProperties,
                ...(value.properties || {})
            };

            if (value.geometry) {
                collected.push({
                    type: "Feature",
                    geometry: value.geometry,
                    properties
                });
            }

            return;
        }

        if (value.type === "GeometryCollection") {
            (value.geometries || []).forEach((item: any) =>
                walk(item, inheritedProperties)
            );
            return;
        }

        if (value.type) {
            collected.push({
                type: "Feature",
                geometry: value,
                properties: inheritedProperties
            });
        }
    };

    walk(parsed);

    return collected;
};

const getImportedBeatName = (beat: any) => {
    const candidates = [
        beat?.importedBeatName,
        beat?.kmlBeatName,
        beat?.kmzBeatName,
        beat?.documentName,
        beat?.folderName,
        beat?.sourceName,
        beat?.kmlMetadata?.beatName,
        beat?.kmlMetadata?.documentName,
        beat?.kmlMetadata?.folderName,
        beat?.kmzMetadata?.beatName,
        beat?.kmzMetadata?.documentName,
        beat?.kmzMetadata?.folderName
    ];

    const geometry = parseGeoJSON(beat?.geometry);

    return candidates.find(
        value => value && String(value).trim()
    ) || null;
};

const getFeatureDisplayName = (
    feature: any,
    index: number,
    fallbackPrefix = "Point"
) => {
    const name =
        feature?.properties?.name ||
        feature?.properties?.importedName;

    if (name && String(name).trim()) {
        return String(name).trim();
    }

    return `${fallbackPrefix} ${index + 1}`;
};

// Map Controller for panned navigation
function MapController({ targetFeature }: { targetFeature: any | null }) {
    const { useMap } = require("react-leaflet");
    const map = useMap();

    useEffect(() => {
        if (targetFeature && map) {
            const L = require("leaflet");
            const geoLayer = L.geoJSON(targetFeature);
            const bounds = geoLayer.getBounds();

            if (targetFeature.geometry.type === "Point") {
                map.setView(bounds.getCenter(), 18, { animate: true });
            } else {
                map.fitBounds(bounds, { padding: [100, 100], animate: true });
            }
        }
    }, [targetFeature, map]);

    return null;
}

// Map Zoom Handler
function ZoomHandler() {
    const { useMap } = require("react-leaflet");
    const map = useMap();

    useEffect(() => {
        const handleZoomIn = () => map.zoomIn();
        const handleZoomOut = () => map.zoomOut();

        window.addEventListener("map-zoom-in", handleZoomIn);
        window.addEventListener("map-zoom-out", handleZoomOut);

        return () => {
            window.removeEventListener("map-zoom-in", handleZoomIn);
            window.removeEventListener("map-zoom-out", handleZoomOut);
        };
    }, [map]);

    return null;
}

export default function BeatMapView({ beat, filterUserId, assignmentMode = "SUPERVISOR", onClose, onEdit, onRefresh }: BeatMapViewProps) {
    const [mapType, setMapType] = useState<"streets" | "satellite">("streets");
    const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
    const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(filterUserId || null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, []);

    const toggleSegmentSelection = (segmentId: string) => {
        setSelectedSegmentIds((prev) =>
            prev.includes(segmentId) ? prev.filter((id) => id !== segmentId) : [...prev, segmentId]
        );
    };

    useEffect(() => {
        if (filterUserId && beat.segments) {
            const userSegments = beat.segments
                .filter((s: any) => s.employeeAssignedToId === filterUserId || s.supervisorAssignedToId === filterUserId)
                .map((s: any) => s.id);
            setSelectedSegmentIds(userSegments);
            setSelectedSupervisorId(filterUserId);
        }
    }, [filterUserId, beat.segments]);

    // Extract unique supervisors assigned to beats / segments in this view
    const availableSupervisors = React.useMemo(() => {
        const map = new Map<string, { id: string; name: string; count: number }>();

        if (beat.assignedToId && beat.assignedToName) {
            map.set(beat.assignedToId, {
                id: beat.assignedToId,
                name: beat.assignedToName,
                count: 0
            });
        }

        if (beat.supervisorsSummary && Array.isArray(beat.supervisorsSummary)) {
            beat.supervisorsSummary.forEach((sup: any) => {
                if (sup.id && sup.name) {
                    map.set(sup.id, {
                        id: sup.id,
                        name: sup.name,
                        count: 0
                    });
                }
            });
        }

        if (beat.segments && Array.isArray(beat.segments) && beat.segments.length > 0) {
            beat.segments.forEach((seg: any) => {
                const supId = seg.supervisorAssignedToId || beat.assignedToId;
                const supName = seg.supervisorAssignedToName || beat.assignedToName;
                if (supId && supName) {
                    const existing = map.get(supId);
                    if (existing) {
                        existing.count += 1;
                    } else {
                        map.set(supId, { id: supId, name: supName, count: 1 });
                    }
                }
            });
        } else if (beat.assignedToId && beat.assignedToName) {
            const existing = map.get(beat.assignedToId);
            if (existing) {
                existing.count = 1;
            } else {
                map.set(beat.assignedToId, { id: beat.assignedToId, name: beat.assignedToName, count: 1 });
            }
        }

        return Array.from(map.values()).filter(s => s.count > 0);
    }, [beat]);

    const activeSupervisor = React.useMemo(() => {
        if (!selectedSupervisorId) return null;
        const found = availableSupervisors.find(s => s.id === selectedSupervisorId);
        if (found) return found;
        if (beat.assignedToId === selectedSupervisorId && beat.assignedToName) {
            return { id: beat.assignedToId, name: beat.assignedToName, count: 0 };
        }
        return { id: selectedSupervisorId, name: "Selected Supervisor", count: 0 };
    }, [selectedSupervisorId, availableSupervisors, beat]);

    const importedGeometryFeatures = React.useMemo(
        () => collectGeometryFeatures(beat.geometry),
        [beat.geometry]
    );

    const importedBeatName = React.useMemo(
        () => getImportedBeatName(beat),
        [beat]
    );

    const displayBeatName =
        beat.beatName ||
        "Unnamed Beat";

    const explodedGeoJSON = React.useMemo(() => {
        const geometry =
            parseGeoJSON(
                beat?.geometry
            );

        if (!geometry) {
            return {
                type:
                    "FeatureCollection",
                features:
                    [],
            };
        }


        const supervisorName =
            beat?.supervisorsSummary?.[0]?.name ||
            beat?.assignedToName ||
            beat?.segments?.[0]
                ?.supervisorAssignedToName ||
            null;


        const supervisorId =
            beat?.supervisorsSummary?.[0]?.id ||
            beat?.assignedToId ||
            beat?.segments?.[0]
                ?.supervisorAssignedToId ||
            null;


        const employeeName =
            beat?.employeesSummary?.[0]?.name ||
            beat?.segments?.[0]
                ?.employeeAssignedToName ||
            null;


        const employeeId =
            beat?.employeesSummary?.[0]?.id ||
            beat?.segments?.[0]
                ?.employeeAssignedToId ||
            null;


        const baseProperties = {
            id:
                beat?.id,

            name:
                beat?.beatName ||
                "Unnamed Beat",

            isBeat:
                true,

            supervisorAssignedToName:
                supervisorName,

            supervisorAssignedToId:
                supervisorId,

            employeeAssignedToName:
                employeeName,

            employeeAssignedToId:
                employeeId,

            isUnassigned:
                !supervisorId ||
                !employeeId,
        };


        /* ================================
           FEATURE COLLECTION
        ================================= */

        if (
            geometry.type ===
            "FeatureCollection"
        ) {
            return {
                type:
                    "FeatureCollection",

                features:
                    (
                        geometry.features ||
                        []
                    ).map(
                        (
                            feature: any,
                            index: number
                        ) => ({
                            ...feature,

                            properties: {
                                ...(
                                    feature.properties ||
                                    {}
                                ),

                                ...baseProperties,

                                id:
                                    `${beat?.id || "beat"}-${index}`,
                            },
                        })
                    ),
            };
        }


        /* ================================
           FEATURE
        ================================= */

        if (
            geometry.type ===
            "Feature"
        ) {
            return {
                type:
                    "FeatureCollection",

                features: [
                    {
                        ...geometry,

                        properties: {
                            ...(
                                geometry.properties ||
                                {}
                            ),

                            ...baseProperties,
                        },
                    },
                ],
            };
        }


        /* ================================
           RAW GEOJSON GEOMETRY
        ================================= */

        return {
            type:
                "FeatureCollection",

            features: [
                {
                    type:
                        "Feature",

                    geometry,

                    properties:
                        baseProperties,
                },
            ],
        };

    }, [
        beat?.id,
        beat?.beatName,
        beat?.geometry,
        beat?.assignedToId,
        beat?.assignedToName,
        beat?.supervisorsSummary,
        beat?.employeesSummary,
        beat?.segments,
    ]);

    const pointGeoJSON =
        React.useMemo(() => {

            const points =
                Array.isArray(
                    beat?.points
                )
                    ? beat.points
                    : [];


            return {
                type:
                    "FeatureCollection",

                features:
                    points
                        .map(
                            (
                                point: any,
                                index: number
                            ) => {

                                const lat =
                                    Number(
                                        point?.latitude ??
                                        point?.lat
                                    );

                                const lng =
                                    Number(
                                        point?.longitude ??
                                        point?.lng ??
                                        point?.lon
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


                                return {
                                    type:
                                        "Feature",

                                    geometry: {
                                        type:
                                            "Point",

                                        coordinates: [
                                            lng,
                                            lat,
                                        ],
                                    },

                                    properties: {
                                        code:
                                            point?.code ||
                                            `P${index + 1}`,

                                        name:
                                            point?.name ||
                                            `Point ${index + 1}`,

                                        pointType:
                                            point?.type ||
                                            (
                                                index === 0
                                                    ? "START"
                                                    : index ===
                                                        points.length -
                                                        1
                                                        ? "END"
                                                        : "ROUTE"
                                            ),

                                        index,
                                    },
                                };
                            }
                        )
                        .filter(
                            Boolean
                        ),
            };

        }, [
            beat?.points,
        ]);

    const features = explodedGeoJSON?.features || [];
    const filteredFeatures = features.filter((f: any) => {
        const props = f.properties || {};

        const searchableText = [
            props.name,
            props.importedName,
            props.supervisorAssignedToName,
            props.employeeAssignedToName,
            props.importedSupervisorName,
            props.importedEmployeeName,
            props.description,
            props.index
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(
            searchQuery.trim().toLowerCase()
        );

        const isSupported =
            f.geometry?.type === "LineString" ||
            f.geometry?.type === "MultiLineString" ||
            f.geometry?.type === "Polygon" ||
            f.geometry?.type === "MultiPolygon";

        return matchesSearch && isSupported;
    });

    // handling zoom in func map controller
    const handleZoomIn = () => window.dispatchEvent(new CustomEvent("map-zoom-in"));
    // handling zoom out func map controller
    const handleZoomOut = () => window.dispatchEvent(new CustomEvent("map-zoom-out"));

    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="beat-map-overlay"
            style={{
                position: "fixed",
                inset: 0,
                width: "100vw",
                height: "100dvh",

                zIndex: 99999,

                backgroundColor:
                    "rgba(15, 23, 42, 0.72)",

                backdropFilter:
                    "blur(8px)",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: "12px",

                boxSizing: "border-box",
                overflow: "hidden",
            }}
        >
            <div
                className="beat-map-shell"
                style={{
                    width: "100%",
                    maxWidth: "1600px",

                    height:
                        "calc(100dvh - 24px)",

                    maxHeight:
                        "calc(100dvh - 24px)",

                    minWidth: 0,
                    minHeight: 0,

                    backgroundColor: "#ffffff",

                    borderRadius: "22px",

                    overflow: "hidden",

                    position: "relative",

                    display: "flex",
                    flexDirection: "column",

                    boxShadow:
                        "0 25px 60px rgba(15,23,42,0.32)",

                    border:
                        "1px solid rgba(255,255,255,0.2)",
                }}
            >
                {/* Pro Header */}
                <div
                    className="beat-map-header"
                    style={{
                        padding: "16px 24px",

                        flexShrink: 0,

                        borderBottom:
                            "1px solid #f1f5f9",

                        display: "flex",

                        justifyContent:
                            "space-between",

                        alignItems:
                            "center",

                        gap: "16px",

                        backgroundColor:
                            "#ffffff",

                        zIndex: 10,

                        minWidth: 0,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                                <MapPin size={24} color="#2563eb" fill="#dbeafe" />
                                {displayBeatName}
                            </h3>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
                                {[beat.zoneName, beat.wardName, beat.areaName].filter(Boolean).join(" | ")}
                                {importedBeatName &&
                                    importedBeatName !== beat.beatName &&
                                    beat.beatName && (
                                        <div
                                            style={{
                                                fontSize: "0.68rem",
                                                color: "#94a3b8",
                                                fontWeight: 600,
                                                marginTop: "3px"
                                            }}
                                        >
                                            MatrixTrack Beat: {beat.beatName}
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        {/* Supervisor Wise Filter Dropdown */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            backgroundColor: selectedSupervisorId ? "#eff6ff" : "#f1f5f9",
                            padding: "6px 14px", borderRadius: "14px",
                            border: selectedSupervisorId ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                            transition: "all 0.2s",
                            boxShadow: selectedSupervisorId ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "none"
                        }}>


                            {selectedSupervisorId && (
                                <button
                                    onClick={() => setSelectedSupervisorId(null)}
                                    style={{
                                        border: "none", backgroundColor: "#ef4444", color: "white",
                                        borderRadius: "50%", width: "22px", height: "22px",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: "pointer", flexShrink: 0, transition: "transform 0.2s, background-color 0.2s",
                                        boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                    title="Clear Supervisor Filter"
                                >
                                    <X size={13} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                            {(["streets", "satellite"] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setMapType(type)}
                                    style={{
                                        padding: "6px 16px", borderRadius: "10px", border: "none", fontSize: "0.75rem", fontWeight: 700,
                                        backgroundColor: mapType === type ? "white" : "transparent",
                                        color: mapType === type ? "#2563eb" : "#64748b",
                                        boxShadow: mapType === type ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                        cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize"
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: "44px", height: "44px", borderRadius: "14px", border: "none",
                                backgroundColor: "#fef2f2", color: "#ef4444", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fef2f2"}
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                <div
                    className="beat-map-content"
                    style={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,

                        display: "flex",

                        overflow: "hidden",

                        backgroundColor:
                            "#f8fafc",
                    }}
                >
                    {/* Side Explorer */}
                    <div style={{
                        width: "360px",
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "#fff",
                        boxShadow: "10px 0 15px -10px rgba(0,0,0,0.05)",
                        zIndex: 5,
                        minHeight: 0,
                        overflow: "hidden",
                    }}>
                        {/* =========================================
    NEW BEAT SUMMARY
========================================= */}

                        <div
                            style={{
                                flex: 1,
                                minHeight: 0,
                                overflowY: "auto",
                                padding: "18px",
                            }}
                        >
                            {/* BEAT STATUS */}

                            <div
                                style={{
                                    padding: "16px",
                                    borderRadius: "16px",
                                    background:
                                        Array.isArray(beat?.points) &&
                                            beat.points.length === 5
                                            ? "#ecfdf5"
                                            : "#fff7ed",
                                    border:
                                        Array.isArray(beat?.points) &&
                                            beat.points.length === 5
                                            ? "1px solid #a7f3d0"
                                            : "1px solid #fed7aa",
                                    marginBottom: "16px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: "10px",
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                fontWeight: 900,
                                                color: "#64748b",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.08em",
                                            }}
                                        >
                                            Beat Configuration
                                        </div>

                                        <div
                                            style={{
                                                marginTop: "4px",
                                                fontSize: "15px",
                                                fontWeight: 800,
                                                color: "#0f172a",
                                            }}
                                        >
                                            {beat?.beatName || "Unnamed Beat"}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            borderRadius: "999px",
                                            padding: "5px 9px",
                                            background: "#ffffff",
                                            fontSize: "10px",
                                            fontWeight: 900,
                                            color:
                                                Array.isArray(beat?.points) &&
                                                    beat.points.length === 5
                                                    ? "#047857"
                                                    : "#c2410c",
                                        }}
                                    >
                                        {Array.isArray(beat?.points) &&
                                            beat.points.length === 5 ? (
                                            <CheckCircle2 size={13} />
                                        ) : (
                                            <MapPin size={13} />
                                        )}

                                        {Array.isArray(beat?.points)
                                            ? `${beat.points.length}/5`
                                            : "0/5"}
                                    </div>
                                </div>
                            </div>


                            {/* LOCATION */}

                            <div
                                style={{
                                    marginBottom: "18px",
                                }}
                            >
                                <div
                                    style={{
                                        marginBottom: "8px",
                                        fontSize: "10px",
                                        color: "#94a3b8",
                                        fontWeight: 900,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                    }}
                                >
                                    Location
                                </div>

                                <div
                                    style={{
                                        padding: "13px",
                                        borderRadius: "14px",
                                        border: "1px solid #e2e8f0",
                                        background: "#f8fafc",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "9px",
                                        }}
                                    >
                                        <MapPin
                                            size={16}
                                            color="#2563eb"
                                            style={{
                                                flexShrink: 0,
                                                marginTop: "2px",
                                            }}
                                        />

                                        <div
                                            style={{
                                                minWidth: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    lineHeight: "18px",
                                                    fontWeight: 700,
                                                    color: "#334155",
                                                }}
                                            >
                                                {[
                                                    beat?.zoneName,
                                                    beat?.wardName,
                                                    beat?.areaName,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" • ") || "-"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* ASSIGNMENT */}

                            <div
                                style={{
                                    marginBottom: "18px",
                                }}
                            >
                                <div
                                    style={{
                                        marginBottom: "8px",
                                        fontSize: "10px",
                                        color: "#94a3b8",
                                        fontWeight: 900,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                    }}
                                >
                                    Assignment
                                </div>


                                {/* EMPLOYEE */}

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "11px",
                                        padding: "12px",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "14px",
                                        background: "#ffffff",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "35px",
                                            height: "35px",
                                            borderRadius: "11px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "#eff6ff",
                                            color: "#2563eb",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <User size={16} />
                                    </div>

                                    <div
                                        style={{
                                            minWidth: 0,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "9px",
                                                color: "#94a3b8",
                                                fontWeight: 900,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.06em",
                                            }}
                                        >
                                            Employee
                                        </div>

                                        <div
                                            style={{
                                                marginTop: "2px",
                                                fontSize: "12px",
                                                fontWeight: 800,
                                                color: "#0f172a",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {beat?.employeesSummary?.[0]?.name ||
                                                beat?.segments?.find(
                                                    (segment: any) =>
                                                        segment?.employeeAssignedToName
                                                )?.employeeAssignedToName ||
                                                "Not assigned"}
                                        </div>
                                    </div>
                                </div>


                                {/* SUPERVISOR */}

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "11px",
                                        padding: "12px",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "14px",
                                        background: "#ffffff",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "35px",
                                            height: "35px",
                                            borderRadius: "11px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "#ecfdf5",
                                            color: "#059669",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Users size={16} />
                                    </div>

                                    <div
                                        style={{
                                            minWidth: 0,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "9px",
                                                color: "#94a3b8",
                                                fontWeight: 900,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.06em",
                                            }}
                                        >
                                            Supervisor
                                        </div>

                                        <div
                                            style={{
                                                marginTop: "2px",
                                                fontSize: "12px",
                                                fontWeight: 800,
                                                color: "#0f172a",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {beat?.supervisorsSummary?.[0]?.name ||
                                                beat?.assignedToName ||
                                                beat?.segments?.find(
                                                    (segment: any) =>
                                                        segment?.supervisorAssignedToName
                                                )?.supervisorAssignedToName ||
                                                "Not assigned"}
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* CONFIGURED POINTS */}

                            <div
                                style={{
                                    marginBottom: "18px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "10px",
                                            color: "#94a3b8",
                                            fontWeight: 900,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.08em",
                                        }}
                                    >
                                        Configured Points
                                    </div>

                                    <span
                                        style={{
                                            fontSize: "10px",
                                            fontWeight: 900,
                                            color:
                                                beat?.points?.length === 5
                                                    ? "#047857"
                                                    : "#c2410c",
                                        }}
                                    >
                                        {Array.isArray(beat?.points)
                                            ? beat.points.length
                                            : 0}
                                        /5
                                    </span>
                                </div>


                                <div
                                    style={{
                                        display: "grid",
                                        gap: "7px",
                                    }}
                                >
                                    {(Array.isArray(beat?.points)
                                        ? beat.points
                                        : []
                                    ).map(
                                        (
                                            point: any,
                                            index: number
                                        ) => {
                                            const pointType =
                                                point?.type ||
                                                (index === 0
                                                    ? "START"
                                                    : index ===
                                                        beat.points.length -
                                                        1
                                                        ? "END"
                                                        : "ROUTE");

                                            return (
                                                <div
                                                    key={
                                                        point?.code ||
                                                        index
                                                    }
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "10px",
                                                        padding: "10px",
                                                        borderRadius: "12px",
                                                        background: "#f8fafc",
                                                        border:
                                                            "1px solid #e2e8f0",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: "32px",
                                                            height: "32px",
                                                            borderRadius:
                                                                "50%",
                                                            background:
                                                                "#2563eb",
                                                            color: "#ffffff",
                                                            display:
                                                                "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            fontSize:
                                                                "10px",
                                                            fontWeight:
                                                                900,
                                                            flexShrink:
                                                                0,
                                                        }}
                                                    >
                                                        {point?.code ||
                                                            `P${index + 1}`}
                                                    </div>

                                                    <div
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "11px",
                                                                fontWeight:
                                                                    800,
                                                                color:
                                                                    "#0f172a",
                                                            }}
                                                        >
                                                            {point?.name ||
                                                                `Point ${index + 1}`}
                                                        </div>

                                                        <div
                                                            style={{
                                                                marginTop:
                                                                    "2px",
                                                                fontSize:
                                                                    "9px",
                                                                fontWeight:
                                                                    800,
                                                                color:
                                                                    pointType ===
                                                                        "START"
                                                                        ? "#047857"
                                                                        : pointType ===
                                                                            "END"
                                                                            ? "#dc2626"
                                                                            : "#64748b",
                                                            }}
                                                        >
                                                            {pointType}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>


                            {/* EDIT */}

                            {onEdit && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onEdit(beat)
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "12px",
                                        borderRadius: "13px",
                                        border:
                                            "1px solid #cbd5e1",
                                        backgroundColor:
                                            "#ffffff",
                                        color: "#334155",
                                        fontWeight: 800,
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent:
                                            "center",
                                        gap: "8px",
                                    }}
                                >
                                    <Edit2 size={15} />

                                    Edit Beat Details
                                </button>
                            )}
                        </div>


                    </div>

                    {/* Premium Map Canvas */}
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        position: "relative",
                        overflow: "hidden"
                    }}>


                        <MapContainer
                            key={beat?.id || "beat-map"}
                            center={[20.5937, 78.9629] as LatLngExpression}
                            zoom={5}
                            zoomControl={false}
                            style={{ height: "100%", width: "100%", background: "#f1f5f9" }}
                        >
                            <div className="leaflet-top leaflet-right" style={{ marginTop: "20px", marginRight: "20px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", backgroundColor: "white", borderRadius: "14px", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                                        <button onClick={handleZoomIn} style={{ padding: "12px", border: "none", backgroundColor: "white", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}><Plus size={18} /></button>
                                        <button onClick={handleZoomOut} style={{ padding: "12px", border: "none", backgroundColor: "white", cursor: "pointer" }}><Minus size={18} /></button>
                                    </div>
                                </div>
                            </div>

                            {mapType === "streets" ? (
                                <TileLayer
                                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                    maxZoom={20}
                                />
                            ) : (
                                <TileLayer
                                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                    maxZoom={20}
                                />
                            )}

                            <GeoJSON
                                key={`beat-${beat?.id}-${mapType}-${JSON.stringify(explodedGeoJSON)}`}

                                data={
                                    explodedGeoJSON as any
                                }

                                style={() => ({
                                    color:
                                        "#2563eb",

                                    weight:
                                        6,

                                    opacity:
                                        1,

                                    fillColor:
                                        "#3b82f6",

                                    fillOpacity:
                                        0.12,

                                    lineCap:
                                        "round",

                                    lineJoin:
                                        "round",
                                })}

                                onEachFeature={(
                                    _feature,
                                    layer
                                ) => {

                                    const supervisorName =
                                        beat?.supervisorsSummary?.[0]?.name ||
                                        beat?.assignedToName ||
                                        beat?.segments?.[0]
                                            ?.supervisorAssignedToName ||
                                        "Not assigned";


                                    const employeeName =
                                        beat?.employeesSummary?.[0]?.name ||
                                        beat?.segments?.[0]
                                            ?.employeeAssignedToName ||
                                        "Not assigned";


                                    if (
                                        layer &&
                                        typeof layer.bindPopup ===
                                        "function"
                                    ) {
                                        layer.bindPopup(
                                            `
                <div style="
                    min-width:220px;
                    font-family:Inter,Arial,sans-serif;
                    padding:8px;
                ">
                    <div style="
                        font-size:16px;
                        font-weight:800;
                        color:#0f172a;
                        margin-bottom:8px;
                    ">
                        ${beat?.beatName || "Beat"}
                    </div>

                    <div style="
                        font-size:12px;
                        color:#64748b;
                        margin-bottom:10px;
                    ">
                        ${[
                                                beat?.zoneName,
                                                beat?.wardName,
                                                beat?.areaName
                                            ]
                                                .filter(Boolean)
                                                .join(" • ")}
                    </div>

                    <div style="
                        border-top:1px solid #e2e8f0;
                        padding-top:9px;
                        display:grid;
                        gap:5px;
                        font-size:12px;
                    ">
                        <div>
                            <b>Employee:</b>
                            ${employeeName}
                        </div>

                        <div>
                            <b>Supervisor:</b>
                            ${supervisorName}
                        </div>

                        <div>
                            <b>Points:</b>
                            ${Array.isArray(
                                                    beat?.points
                                                )
                                                ? beat.points.length
                                                : 0
                                            }/5
                        </div>
                    </div>
                </div>
                `,
                                            {
                                                className:
                                                    "modern-popup",
                                            }
                                        );
                                    }
                                }}
                            />
                            <GeoJSON
                                key={`beat-points-${beat?.id}-${JSON.stringify(pointGeoJSON)}`}

                                data={
                                    pointGeoJSON as any
                                }

                                pointToLayer={(
                                    feature: any,
                                    latlng: any
                                ) => {

                                    const L =
                                        require("leaflet");

                                    const code =
                                        feature?.properties?.code ||
                                        "P";


                                    const icon =
                                        L.divIcon({
                                            className:
                                                "beat-point-marker",

                                            html: `
                    <div class="beat-point-marker-inner">
                        ${code}
                    </div>
                `,

                                            iconSize: [
                                                36,
                                                36,
                                            ],

                                            iconAnchor: [
                                                18,
                                                18,
                                            ],
                                        });


                                    return L.marker(
                                        latlng,
                                        {
                                            icon,
                                            interactive:
                                                true,
                                        }
                                    );
                                }}

                                onEachFeature={(
                                    feature,
                                    layer
                                ) => {

                                    const props =
                                        feature?.properties ||
                                        {};


                                    if (
                                        layer &&
                                        typeof layer.bindTooltip ===
                                        "function"
                                    ) {
                                        layer.bindTooltip(
                                            `
                    <strong>
                        ${props.code}
                    </strong>
                    &nbsp;
                    ${props.name}
                    <br/>
                    <span style="color:#64748b;">
                        ${props.pointType}
                    </span>
                `,
                                            {
                                                direction:
                                                    "top",

                                                offset: [
                                                    0,
                                                    -12,
                                                ],

                                                className:
                                                    "beat-point-tooltip",
                                            }
                                        );
                                    }
                                }}
                            />
                            <MapController targetFeature={selectedFeature} />
                            <FitBounds beat={beat} />

                            <ZoomHandler />
                        </MapContainer>
                    </div>
                </div>
            </div>

            {showAssignModal && (
                <AssignBeatModal
                    beat={beat}
                    mode={assignmentMode}
                    initialSelectedSegmentIds={selectedSegmentIds}
                    onClose={() => setShowAssignModal(false)}
                    onSuccess={() => {
                        setShowAssignModal(false);
                        setSelectedSegmentIds([]);
                        if (onRefresh) onRefresh();
                    }}
                />
            )}

            <style jsx global>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .leaflet-container { background: #f8fafc !important; }
        .modern-popup .leaflet-popup-content-wrapper { border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); }
        .modern-popup .leaflet-popup-tip-container { display: none; }
        .beat-point-marker {
    background: transparent !important;
    border: none !important;
}

.beat-point-marker-inner {
    width: 34px;
    height: 34px;

    border-radius: 50%;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #2563eb;
    color: white;

    border: 3px solid white;

    font-size: 11px;
    font-weight: 900;

    box-shadow:
        0 4px 12px rgba(37, 99, 235, 0.4);
}

.beat-point-tooltip {
    border: none !important;
    border-radius: 10px !important;

    box-shadow:
        0 6px 18px rgba(15, 23, 42, 0.16) !important;

    color: #0f172a !important;

    font-size: 11px !important;
}
      `}</style>
        </div>,
        document.body
    );
}
