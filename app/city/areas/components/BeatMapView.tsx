"use client";

import React, { useEffect, useState } from "react";
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

            let geom = beat.geometry;
            if (typeof geom === "string") {
                try { geom = JSON.parse(geom); } catch {}
            }
            if (geom) {
                try { group.addLayer(L.geoJSON(geom)); } catch {}
            }

            if (beat.segments && Array.isArray(beat.segments)) {
                beat.segments.forEach((seg: any) => {
                    let segGeom = seg.geometry;
                    if (typeof segGeom === "string") {
                        try { segGeom = JSON.parse(segGeom); } catch {}
                    }
                    if (segGeom) {
                        try { group.addLayer(L.geoJSON(segGeom)); } catch {}
                    }
                });
            }

            if (group.getLayers().length > 0) {
                const bounds = group.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [beat, map]);
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
                        try { segGeom = JSON.parse(segGeom); } catch {}
                    }
                    if (segGeom) {
                        try { group.addLayer(L.geoJSON(segGeom)); } catch {}
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

    const explodedGeoJSON = React.useMemo(() => {
        // Option 1: Use backend-provided segments (best for assignment)
        if (beat.segments && beat.segments.length > 0) {
            return {
                type: "FeatureCollection",
                features: beat.segments.map((seg: any, i: number) => ({
                    type: "Feature",
                    geometry: seg.geometry,
                    properties: {
                        id: seg.id,
                        index: i,
                        isSegment: true,
                        name: seg.name || `Beat ${i + 1}`,
                        assignedToName: seg.employeeAssignedToName || seg.supervisorAssignedToName || beat.assignedToName,
                        assignedToId: seg.employeeAssignedToId || seg.supervisorAssignedToId || beat.assignedToId,
                        supervisorAssignedToName: seg.supervisorAssignedToName || beat.assignedToName,
                        supervisorAssignedToId: seg.supervisorAssignedToId || beat.assignedToId,
                        employeeAssignedToName: seg.employeeAssignedToName || null,
                        employeeAssignedToId: seg.employeeAssignedToId || null,
                        isUnassigned: assignmentMode === "SUPERVISOR" ? !(seg.supervisorAssignedToId || beat.assignedToId) : !seg.employeeAssignedToId
                    }
                }))
            };
        }

        // Option 2: Fallback to raw geometry (explode on the fly)
        if (!beat.geometry) return { type: "FeatureCollection", features: [] };

        const geom = beat.geometry;
        const features: any[] = [];

        const process = (g: any, props: any = {}) => {
            if (!g) return;
            if (g.type === "FeatureCollection") {
                g.features.forEach((f: any) => process(f.geometry, f.properties));
            } else if (g.type === "Feature") {
                process(g.geometry, g.properties);
            } else if (g.type === "LineString") {
                features.push({
                    type: "Feature", geometry: g,
                    properties: { ...props, isSegment: true, id: props.id || props.name || `line-${features.length}` }
                });
            } else if (g.type === "MultiLineString") {
                g.coordinates.forEach((coords: any, idx: number) => {
                    features.push({
                        type: "Feature", geometry: { type: "LineString", coordinates: coords },
                        properties: { ...props, isSegment: true, id: `${props.id || props.name || 'mline'}-${idx}` }
                    });
                });
            } else if (g.type === "Polygon") {
                features.push({
                    type: "Feature", geometry: g,
                    properties: { ...props, isSegment: true, id: props.id || props.name || `poly-${features.length}` }
                });
            } else if (g.type === "MultiPolygon") {
                g.coordinates.forEach((coords: any, idx: number) => {
                    features.push({
                        type: "Feature", geometry: { type: "Polygon", coordinates: coords },
                        properties: { ...props, isSegment: true, id: `${props.id || props.name || 'mpoly'}-${idx}` }
                    });
                });
            } else if (g.type === "GeometryCollection") {
                g.geometries.forEach((geom: any) => process(geom, props));
            } else {
                // Points, etc. - still keep them for visual context but maybe not marked as segments
                features.push({ type: "Feature", geometry: g, properties: { ...props, isSegment: false } });
            }
        };

        process(geom);
        return { type: "FeatureCollection", features };
    }, [assignmentMode, beat.geometry, beat.segments, beat.assignedToName, beat.assignedToId]);

    const features = explodedGeoJSON?.features || [];
    const filteredFeatures = features.filter((f: any) => {
        const matchesSearch = (f.properties?.name || f.properties?.index || "").toString().toLowerCase().includes(searchQuery.toLowerCase());
        const isSupported = f.geometry?.type === "LineString" || f.geometry?.type === "MultiLineString" || f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon";
        return matchesSearch && isSupported;
    });

    // handling zoom in func map controller
    const handleZoomIn = () => window.dispatchEvent(new CustomEvent("map-zoom-in"));
    // handling zoom out func map controller
    const handleZoomOut = () => window.dispatchEvent(new CustomEvent("map-zoom-out"));

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.85)", zIndex: 1000,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(12px)"
        }}>
            <div style={{
                width: "98%", maxWidth: "1600px", height: "94vh",
                backgroundColor: "white", borderRadius: "28px", overflow: "hidden",
                position: "relative", display: "flex", flexDirection: "column",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255,255,255,0.1)"
            }}>
                {/* Pro Header */}
                <div style={{
                    padding: "16px 32px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    backgroundColor: "#fff",
                    zIndex: 10
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                                <MapPin size={24} color="#2563eb" fill="#dbeafe" />
                                {beat.beatName}
                            </h3>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
                                {[beat.zoneName, beat.wardName, beat.areaName].filter(Boolean).join(" | ")}
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
                            <User size={16} color={selectedSupervisorId ? "#2563eb" : "#64748b"} />
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: selectedSupervisorId ? "#1e40af" : "#475569", whiteSpace: "nowrap" }}>
                                Supervisor:
                            </span>
                            <select
                                value={selectedSupervisorId || ""}
                                onChange={(e) => setSelectedSupervisorId(e.target.value || null)}
                                style={{
                                    padding: "5px 10px", borderRadius: "10px", border: "1px solid #cbd5e1",
                                    backgroundColor: "white", color: selectedSupervisorId ? "#1d4ed8" : "#0f172a",
                                    fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", outline: "none"
                                }}
                            >
                                <option value="">All Supervisors ({availableSupervisors.reduce((acc, s) => acc + s.count, 0)})</option>
                                {availableSupervisors.map(sup => (
                                    <option key={sup.id} value={sup.id}>
                                        {sup.name} ({sup.count} beat{sup.count === 1 ? '' : 's'})
                                    </option>
                                ))}
                            </select>
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

                <div style={{ flex: 1, display: "flex", overflow: "hidden", backgroundColor: "#f8fafc" }}>
                    {/* Side Explorer */}
                    <div style={{
                        width: "360px",
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "#fff",
                        boxShadow: "10px 0 15px -10px rgba(0,0,0,0.05)",
                        zIndex: 5
                    }}>
                        <div style={{ padding: "24px 20px" }}>
                            <div style={{ position: "relative" }}>
                                <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                                <input
                                    type="text"
                                    placeholder="Search placemarks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: "100%", padding: "12px 12px 12px 42px", borderRadius: "16px",
                                        border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", fontSize: "0.875rem",
                                        transition: "border-color 0.2s"
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 20px" }}>
                            <button
                                onClick={() => setShowAssignModal(true)}
                                style={{
                                    width: "100%", padding: "14px", borderRadius: "16px",
                                    border: "none", backgroundColor: "#2563eb", color: "white",
                                    fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                                    boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.25)",
                                    marginBottom: "12px"
                                }}
                            >
                                {selectedSegmentIds.length > 0 ? `${assignmentMode === "EMPLOYEE" ? "Deploy" : "Assign"} ${selectedSegmentIds.length} Segments` : (assignmentMode === "EMPLOYEE" ? "Deploy Employees" : "Assign Supervisor")}
                            </button>

                            {onEdit && (
                                <button
                                    onClick={() => onEdit(beat)}
                                    style={{
                                        width: "100%", padding: "12px", borderRadius: "16px",
                                        border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#475569",
                                        fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                                        marginBottom: "12px", transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
                                >
                                    <Edit2 size={18} />
                                    Edit Beat Details
                                </button>
                            )}

                            {selectedSegmentIds.length > 0 && (
                                <button
                                    onClick={() => setSelectedSegmentIds([])}
                                    style={{
                                        width: "100%", padding: "10px", borderRadius: "12px",
                                        border: "1px dashed #ef4444", backgroundColor: "white", color: "#ef4444",
                                        fontWeight: 600, fontSize: "0.75rem", cursor: "pointer",
                                        marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                                    }}
                                >
                                    <X size={14} /> Clear Selection
                                </button>
                            )}

                            <div style={{ padding: "0 8px 12px", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>Found {filteredFeatures.length} Results</span>
                                {activeSupervisor && (
                                    <span style={{ color: "#2563eb", fontWeight: 800 }}>
                                        {activeSupervisor.name}
                                    </span>
                                )}
                            </div>
                            {filteredFeatures.map((f: any, i: number) => {
                                const featureId = f.properties?.name || `feat-${i}`;
                                const color = getFeatureColor(f);
                                const isActive = selectedFeature?.properties?.name === featureId;
                                const segSupId = f.properties?.supervisorAssignedToId || f.properties?.assignedToId || beat.assignedToId;
                                const isSupMatch = selectedSupervisorId ? segSupId === selectedSupervisorId : true;

                                return (
                                    <div
                                        key={i}
                                        onClick={() => { setSelectedFeature(f); if (f.properties?.isSegment) toggleSegmentSelection(f.properties.id); }}
                                        onMouseEnter={() => setHoveredFeature(featureId)}
                                        onMouseLeave={() => setHoveredFeature(null)}
                                        style={{
                                            padding: "16px",
                                            borderRadius: "18px",
                                            marginBottom: "10px",
                                            cursor: "pointer",
                                            backgroundColor: isActive ? "#eff6ff" : (selectedSupervisorId && isSupMatch ? "#f0f9ff" : (hoveredFeature === featureId ? "#f8fafc" : "transparent")),
                                            border: "2px solid",
                                            borderColor: f.properties?.isSegment && selectedSegmentIds.includes(f.properties.id) ? "#2563eb" : (selectedSupervisorId && isSupMatch ? "#3b82f6" : (isActive ? "#3b82f6" : "transparent")),
                                            opacity: selectedSupervisorId && !isSupMatch ? 0.45 : 1,
                                            transition: "all 0.2s",
                                            boxShadow: isActive || (selectedSupervisorId && isSupMatch) ? "0 4px 12px rgba(59, 130, 246, 0.15)" : "none",
                                            position: "relative"
                                        }}
                                    >
                                        {f.properties?.isSegment && selectedSegmentIds.includes(f.properties.id) && (
                                            <div style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#2563eb", color: "white", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <UserPlus size={12} />
                                            </div>
                                        )}
                                        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                                            <div style={{
                                                width: "40px", height: "40px", borderRadius: "12px",
                                                backgroundColor: selectedSupervisorId && isSupMatch ? "#dbeafe" : `${color}15`,
                                                color: selectedSupervisorId && isSupMatch ? "#2563eb" : color,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                flexShrink: 0
                                            }}>
                                                {f.geometry?.type === "Point" ? <MapPin size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "0.935rem", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                    <span>{f.properties?.name || `Feature #${i + 1}`}</span>
                                                    {selectedSupervisorId && isSupMatch && (
                                                        <span style={{ fontSize: "10px", backgroundColor: "#2563eb", color: "white", padding: "2px 6px", borderRadius: "4px", fontWeight: 800 }}>Assigned</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <span style={{ padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: "4px" }}>{f.geometry?.type === "LineString" ? "Segment" : f.geometry?.type}</span>
                                                    <span>{f.properties?.supervisorAssignedToName || beat.assignedToName || "Street path"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Premium Map Canvas */}
                    <div style={{ flex: 1, position: "relative" }}>
                        {activeSupervisor && (
                            <div style={{
                                position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)",
                                backgroundColor: "rgba(15, 23, 42, 0.92)", backdropFilter: "blur(12px)",
                                color: "white", padding: "8px 16px 8px 20px", borderRadius: "999px",
                                boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.5)",
                                display: "flex", alignItems: "center", gap: "12px", zIndex: 1000,
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                maxWidth: "90%"
                            }}>
                                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#3b82f6", boxShadow: "0 0 10px #3b82f6", flexShrink: 0, animation: "pulse 2s infinite" }} />
                                <span style={{ fontSize: "0.85rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    Highlighting beats for <strong style={{ color: "#60a5fa" }}>{activeSupervisor.name}</strong> ({activeSupervisor.count} Beat{activeSupervisor.count === 1 ? '' : 's'})
                                </span>
                                <button
                                    onClick={() => setSelectedSupervisorId(null)}
                                    style={{
                                        backgroundColor: "#ef4444", border: "none", color: "white",
                                        borderRadius: "50%", width: "24px", height: "24px", display: "flex",
                                        alignItems: "center", justifyContent: "center", cursor: "pointer",
                                        flexShrink: 0, transition: "transform 0.2s, background-color 0.2s",
                                        boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                    title="Clear Supervisor Filter"
                                >
                                    <X size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        )}

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
                                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                />
                            ) : (
                                <TileLayer
                                    attribution='Google'
                                    url="http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                />
                            )}

                            <GeoJSON
                                key={`${mapType}-${hoveredFeature}-${searchQuery}-${selectedSupervisorId}-${JSON.stringify(explodedGeoJSON)}`}
                                data={explodedGeoJSON as any}
                                style={(feature: any) => {
                                    const props = feature?.properties;
                                    const featureId = props?.name || props?.id || "";
                                    const color = getFeatureColor(feature);
                                    const isHovered = hoveredFeature === featureId;
                                    const isSelected = selectedFeature?.properties?.name === featureId || selectedFeature?.properties?.id === props?.id;
                                    const isSelectedOnMap = props?.isSegment && selectedSegmentIds.includes(props.id);
                                    const isUnassigned = props?.isUnassigned;
                                    const segSupervisorId = props?.supervisorAssignedToId || props?.assignedToId || beat.assignedToId;

                                    if (selectedSupervisorId) {
                                        const isMatchedSup = segSupervisorId === selectedSupervisorId;
                                        if (isMatchedSup) {
                                            return {
                                                color: "#2563eb",
                                                weight: (isHovered || isSelected) ? 10 : 8,
                                                fillOpacity: 0.85,
                                                fillColor: "#3b82f6",
                                                opacity: 1,
                                                dashArray: ""
                                            };
                                        } else {
                                            return {
                                                color: "#94a3b8",
                                                weight: 2,
                                                fillOpacity: 0.05,
                                                fillColor: "#cbd5e1",
                                                opacity: 0.18,
                                                dashArray: "4, 6"
                                            };
                                        }
                                    }

                                    return {
                                        color: isSelectedOnMap ? "#2563eb" : (isUnassigned ? "#f59e0b" : color),
                                        weight: (isHovered || isSelected || isSelectedOnMap) ? 7 : (isUnassigned ? 4 : 4),
                                        fillOpacity: (isHovered || isSelected || isSelectedOnMap) ? 0.6 : 0.25,
                                        fillColor: isSelectedOnMap ? "#2563eb" : (isUnassigned ? "#fbbf24" : color),
                                        opacity: isSelectedOnMap ? 1 : (isUnassigned ? 0.95 : 1),
                                        dashArray: isSelectedOnMap ? "" : (isUnassigned ? "8, 6" : (isHovered ? "5, 5" : ""))
                                    };
                                }}
                                pointToLayer={(feature: any, latlng: any) => {
                                    const L = require("leaflet");
                                    const color = getFeatureColor(feature);
                                    const icon = L.divIcon({
                                        html: `
                                            <div style="position: relative; width: 32px; height: 32px; background: white; border: 3px solid ${color}; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 6px rgba(0,0,0,0.2)">
                                                <div style="position: absolute; width: 10px; height: 10px; background: ${color}; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg);"></div>
                                            </div>
                                        `,
                                        className: "",
                                        iconSize: [32, 32],
                                        iconAnchor: [16, 32]
                                    });
                                    return L.marker(latlng, { icon });
                                }}
                                onEachFeature={(feature, layer) => {
                                    const props = feature?.properties;
                                    const name = props?.name || (props?.isSegment ? `Beat ${props.index + 1}` : "Unnamed");
                                    const color = getFeatureColor(feature);
                                    const supervisorName = props?.supervisorAssignedToName || beat.assignedToName || "Unassigned";
                                    const employeeName = props?.employeeAssignedToName || "Unassigned";
                                    const assignedToName = assignmentMode === "EMPLOYEE" ? employeeName : supervisorName;
                                    const isUnassigned = props?.isUnassigned;

                                    if (layer && typeof layer.on === "function") {
                                        layer.on({
                                            mouseover: () => setHoveredFeature(name),
                                            mouseout: () => setHoveredFeature(null),
                                            click: (e: any) => {
                                                const L = require("leaflet");
                                                L.DomEvent.stopPropagation(e);
                                                setSelectedFeature(feature);
                                                if (props?.isSegment) {
                                                    toggleSegmentSelection(props.id);
                                                }
                                            }
                                        });
                                    }

                                    if (layer && typeof layer.bindPopup === "function") {
                                        const popupRoleColor = assignmentMode === "EMPLOYEE" ? "#db2777" : "#6366f1";
                                        const popupRoleLabel = assignmentMode === "EMPLOYEE" ? "Employee" : "Supervisor";
                                        const avatarBg = assignmentMode === "EMPLOYEE" ? "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" : "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)";

                                        layer.bindPopup(`
                                            <div style="font-family: 'Inter', sans-serif; padding: 16px; min-width: 260px;">
                                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                                                    <div style="display: flex; align-items: center; gap: 8px;">
                                                        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${isUnassigned ? '#f59e0b' : '#10b981'}; box-shadow: 0 0 10px ${isUnassigned ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.4)'}"></div>
                                                        <div style="font-weight: 800; color: #1e293b; font-size: 16px;">${name}</div>
                                                    </div>
                                                    ${props?.isSegment ? `<span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:6px; font-size:10px; font-weight: 700;">Beat ${props.index + 1}</span>` : ''}
                                                </div>

                                                <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                                                     <span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:6px; font-size:10px; font-weight: 800;">Z - ${beat.zoneName}</span>
                                                     <span style="background:#f0fdf4; color:#166534; padding:2px 8px; border-radius:6px; font-size:10px; font-weight: 800;">W - ${beat.wardName}</span>
                                                </div>

                                                <div style="background: #f8fafc; padding: 14px; border-radius: 16px; border: 1px solid #f1f5f9;">
                                                    <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 800; margin-bottom: 10px; letter-spacing: 0.05em;">Current Assignment</div>
                                                    <div style="display: flex; align-items: center; gap: 12px;">
                                                        <div style="width: 36px; height: 36px; border-radius: 10px; background: ${isUnassigned ? '#cbd5e1' : avatarBg}; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; box-shadow: ${isUnassigned ? 'none' : '0 4px 10px rgba(0,0,0,0.1)'}">
                                                            ${(assignedToName || 'U')[0]}
                                                        </div>
                                                        <div style="display: flex; flex-direction: column;">
                                                            <div style="font-weight: 700; color: #1e293b; font-size: 14px; line-height: 1.2;">${assignedToName}</div>
                                                            <div style="font-size: 11px; color: ${isUnassigned ? '#94a3b8' : popupRoleColor}; font-weight: 700;">
                                                                ${isUnassigned ? "Pending Assignment" : popupRoleLabel}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `, { className: 'modern-popup' });
                                    }
                                }}
                            />
                            <MapController targetFeature={selectedFeature} />
                            <FitBounds beat={beat} />
                            <FitSupervisorBounds beat={beat} selectedSupervisorId={selectedSupervisorId} />
                            <ZoomHandler />
                        </MapContainer>

                        {selectedFeature && (() => {
                            const props = selectedFeature.properties || {};
                            const selectedName = props.name || (props.isSegment ? `Beat Segment ${(props.index ?? 0) + 1}` : "Selected feature");
                            const supervisorName = props.supervisorAssignedToName || beat.assignedToName || "Unassigned";
                            const employeeName = props.employeeAssignedToName || "Unassigned";
                            const isSegment = !!props.isSegment;
                            const segmentSelected = isSegment && selectedSegmentIds.includes(props.id);
                            return (
                                <div style={{
                                    position: "absolute", top: "28px", left: "50%", transform: "translateX(-50%)",
                                    width: "340px", backgroundColor: "white", borderRadius: "24px", padding: "20px",
                                    boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.22)", border: "1px solid #e2e8f0", zIndex: 1000
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>{selectedName}</div>
                                            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                                                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 800 }}>Z - {beat.zoneName}</span>
                                                <span style={{ background: "#f0fdf4", color: "#166534", padding: "2px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 800 }}>W - {beat.wardName}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            {isSegment && (
                                                <button
                                                    onClick={() => toggleSegmentSelection(props.id)}
                                                    style={{
                                                        border: segmentSelected ? "none" : "1px solid #cbd5e1",
                                                        backgroundColor: segmentSelected ? "#2563eb" : "white",
                                                        color: segmentSelected ? "white" : "#334155",
                                                        borderRadius: "12px", padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem"
                                                    }}
                                                >
                                                    {segmentSelected ? "Selected" : "Select Segment"}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSelectedFeature(null)}
                                                style={{
                                                    width: "32px", height: "32px", borderRadius: "10px",
                                                    backgroundColor: "#f1f5f9", color: "#64748b",
                                                    border: "none", cursor: "pointer",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    transition: "all 0.2s", flexShrink: 0
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = "#fef2f2";
                                                    e.currentTarget.style.color = "#ef4444";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                                                    e.currentTarget.style.color = "#64748b";
                                                }}
                                                title="Close Details"
                                            >
                                                <X size={18} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
                                        <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "16px", padding: "14px" }}>
                                            <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, marginBottom: "8px" }}>Supervisor</div>
                                            <div style={{ fontWeight: 700, color: "#1e293b" }}>{supervisorName}</div>
                                        </div>
                                        <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "16px", padding: "14px" }}>
                                            <div style={{ fontSize: "10px", color: "#9d174d", textTransform: "uppercase", fontWeight: 800, marginBottom: "8px" }}>Employee</div>
                                            <div style={{ fontWeight: 700, color: "#831843" }}>{employeeName}</div>
                                        </div>
                                    </div>
                                    {isSegment && (
                                        <button
                                            onClick={() => setShowAssignModal(true)}
                                            style={{ marginTop: "16px", width: "100%", padding: "12px 14px", borderRadius: "14px", border: "none", backgroundColor: "#0f172a", color: "white", fontWeight: 700, cursor: "pointer" }}
                                        >
                                            {assignmentMode === "EMPLOYEE" ? "Assign Beat Segment" : "Assign Supervisor Segment"}
                                        </button>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Float HUD */}
                        <div style={{
                            position: "absolute", bottom: "40px", right: "40px",
                            backgroundColor: "white", padding: "12px 24px", borderRadius: "20px",
                            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                            display: "flex", gap: "24px", alignItems: "center",
                            zIndex: 1000, border: "1px solid #f1f5f9"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981", animation: "pulse 2s infinite" }} />
                                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }}>Real-time GIS Sync</span>
                            </div>
                            <div style={{ width: "1px", height: "24px", backgroundColor: "#f1f5f9" }} />
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Projection:</span>
                                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#3b82f6" }}>EPSG 4326</span>
                            </div>
                        </div>
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
      `}</style>
        </div>
    );
}
