'use client';

import React, { useEffect, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import {
    Maximize2, Minimize2, Map as MapIcon, Layers, Info, Search, Navigation2, ChevronRight, User,
    CheckCircle2, Clock, AlertCircle, Filter, X, Phone, Mail, ShieldCheck, UserCheck
} from "lucide-react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";

const COLORS = [
    "#FF3D00", "#FFD600", "#00E676", "#00B0FF", "#651FFF", "#D500F9",
    "#F50057", "#1DE9B6", "#C6FF00", "#FF9100", "#FF1744", "#3D5AFE"
];

function FitAllBounds({ beats, selectedBeatId }: { beats: any[], selectedBeatId?: string | null }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        map.invalidateSize();

        const timer = setTimeout(() => {
            if (selectedBeatId) {
                const beat = beats.find(b => b.id === selectedBeatId);
                const group = new L.FeatureGroup();

                let geom = beat?.geometry;
                if (typeof geom === "string") {
                    try { geom = JSON.parse(geom); } catch {}
                }
                if (geom) {
                    try { group.addLayer(L.geoJSON(geom)); } catch {}
                }
                if (beat?.segments && Array.isArray(beat.segments)) {
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
                        map.flyToBounds(bounds, { padding: [80, 80], duration: 1.2 });
                    }
                }
                return;
            }

            if (beats && beats.length > 0) {
                const group = new L.FeatureGroup();

                beats.forEach(beat => {
                    let geom = beat.geometry;
                    if (typeof geom === "string") {
                        try { geom = JSON.parse(geom); } catch {}
                    }
                    if (geom) {
                        try { group.addLayer(L.geoJSON(geom)); } catch (e) {}
                    }

                    if (beat.segments && Array.isArray(beat.segments)) {
                        beat.segments.forEach((seg: any) => {
                            let segGeom = seg.geometry;
                            if (typeof segGeom === "string") {
                                try { segGeom = JSON.parse(segGeom); } catch {}
                            }
                            if (segGeom) {
                                try { group.addLayer(L.geoJSON(segGeom)); } catch (e) {}
                            }
                        });
                    }
                });

                if (group.getLayers().length > 0) {
                    const bounds = group.getBounds();
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 50] });
                    }
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [beats, map, selectedBeatId]);

    return null;
}

function BeatGeoJSONLayer({
    beat,
    bIdx,
    isSelected,
    onSelectBeat
}: {
    beat: any;
    bIdx: number;
    isSelected: boolean;
    onSelectBeat: (id: string) => void;
}) {
    const hasReport = beat.segments?.some((s: any) => s.isAssessed || s.lastAssessment);
    const isUnassigned = !beat.assignedToId;

    const explodedGeoJSON = useMemo(() => {
        if (beat.segments && beat.segments.length > 0) {
            return {
                type: "FeatureCollection",
                features: beat.segments.map((seg: any, i: number) => ({
                    type: "Feature",
                    geometry: seg.geometry,
                    properties: {
                        id: seg.id,
                        index: i,
                        segmentNumber: seg.segmentNumber || (i + 1),
                        isSegment: true,
                        assignedToName: seg.assignedToName || beat.assignedToName,
                        assignedToId: seg.assignedToId || beat.assignedToId,
                        supervisorName: seg.supervisorAssignedToName || beat.assignedToName,
                        employeeName: seg.employeeAssignedToName || seg.assignedToName,
                        isUnassigned: !seg.assignedToId && !beat.assignedToId,
                        hasReport: seg.isAssessed || !!seg.lastAssessment,
                        lastAssessment: seg.lastAssessment
                    }
                }))
            };
        }

        if (!beat.geometry) return null;
        try {
            const geom = beat.geometry;
            const baseProp = {
                index: 0,
                segmentNumber: 1,
                assignedToName: beat.assignedToName,
                isUnassigned: !beat.assignedToId,
                hasReport
            };
            if (geom.type === "LineString") {
                return {
                    type: "FeatureCollection",
                    features: [{ type: "Feature", geometry: geom, properties: baseProp }]
                };
            } else if (geom.type === "MultiLineString") {
                return {
                    type: "FeatureCollection",
                    features: geom.coordinates.map((coords: any, i: number) => ({
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: coords },
                        properties: { ...baseProp, index: i, segmentNumber: i + 1 }
                    }))
                };
            } else if (geom.type === "GeometryCollection") {
                const features: any[] = [];
                geom.geometries.forEach((g: any) => {
                    if (g.type === "LineString") {
                        features.push({ type: "Feature", geometry: g, properties: { ...baseProp, index: features.length, segmentNumber: features.length + 1 } });
                    } else if (g.type === "MultiLineString") {
                        g.coordinates.forEach((coords: any) => {
                            features.push({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: { ...baseProp, index: features.length, segmentNumber: features.length + 1 } });
                        });
                    } else if (g.type === "Polygon") {
                        features.push({ type: "Feature", geometry: g, properties: { ...baseProp, index: features.length, segmentNumber: features.length + 1 } });
                    } else if (g.type === "MultiPolygon") {
                        g.coordinates.forEach((coords: any) => {
                            features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: coords }, properties: { ...baseProp, index: features.length, segmentNumber: features.length + 1 } });
                        });
                    }
                });
                return { type: "FeatureCollection", features };
            }
            return { type: "FeatureCollection", features: [{ type: "Feature", geometry: geom, properties: baseProp }] };
        } catch (e) {
            return null;
        }
    }, [beat.geometry, beat.segments, beat.assignedToName, beat.assignedToId, hasReport]);

    if (!explodedGeoJSON) return null;

    return (
        <GeoJSON
            key={beat.id}
            data={explodedGeoJSON as any}
            style={(feature) => {
                const props = feature?.properties;
                const segHasReport = props?.hasReport;
                const isUnassigned = props?.isUnassigned;

                let strokeColor = COLORS[bIdx % COLORS.length];
                if (segHasReport) {
                    strokeColor = "#10b981";
                } else if (isUnassigned) {
                    strokeColor = "#94a3b8";
                }

                if (isSelected) strokeColor = "#2563eb";

                return {
                    color: strokeColor,
                    weight: isSelected ? 7 : (segHasReport ? 5 : (isUnassigned ? 2 : 4)),
                    opacity: isSelected ? 1 : (segHasReport ? 1 : 0.85),
                    fillOpacity: isSelected ? 0.35 : (segHasReport ? 0.25 : 0.1),
                    dashArray: isUnassigned && !segHasReport ? "5, 8" : "none"
                };
            }}
            onEachFeature={(feature, layer) => {
                const props = feature?.properties;
                const supervisorName = props?.supervisorName || beat.assignedToName || 'Unassigned Supervisor';
                const employeeName = props?.employeeName || props?.assignedToName || 'Unassigned Worker';
                const segHasReport = props?.hasReport;
                const lastAss = props?.lastAssessment;

                layer.on('click', () => onSelectBeat(beat.id));
                layer.bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; padding: 16px; min-width: 280px; max-width: 320px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                            <div style="font-weight: 900; color: #0f172a; font-size: 17px; letter-spacing: -0.02em;">${beat.beatName}</div>
                            ${props?.isSegment ? `<span style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">Beat ${props.segmentNumber}</span>` : ''}
                        </div>

                        <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 14px;">
                            ${beat.zoneName || 'Zone'} • ${beat.wardName || 'Ward'} • ${beat.areaName || 'Area'}
                        </div>

                        <div style="background: ${segHasReport ? '#ecfdf5' : '#fffbeb'}; border: 1px solid ${segHasReport ? '#a7f3d0' : '#fde68a'}; padding: 10px 12px; border-radius: 12px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${segHasReport ? '#10b981' : '#f59e0b'};"></div>
                            <div>
                                <div style="font-weight: 800; font-size: 12px; color: ${segHasReport ? '#047857' : '#b45309'};">
                                    ${segHasReport ? "✓ Report Submitted" : "⏱ Awaiting Report Submission"}
                                </div>
                                ${lastAss?.status ? `<div style="font-size: 10px; color: #475569; font-weight: 600; margin-top: 2px;">QC Status: ${lastAss.status}</div>` : ''}
                            </div>
                        </div>

                        <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px;">
                            <div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800;">Assigned Supervisor</div>
                                <div style="font-weight: 700; color: #1e293b; font-size: 13px; margin-top: 1px;">
                                    👨‍💼 ${supervisorName}
                                </div>
                            </div>

                            <div style="border-top: 1px solid #e2e8f0; padding-top: 8px;">
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800;">Assigned Worker / Employee</div>
                                <div style="font-weight: 700; color: #1e293b; font-size: 13px; margin-top: 1px;">
                                    🧹 ${employeeName}
                                </div>
                            </div>
                        </div>
                    </div>
                `, {
                    className: 'premium-popup'
                });
            }}
        />
    );
}

export default function GlobalBeatMapView({ beats }: { beats: any[] }) {
    const [mapType, setMapType] = useState<"streets" | "satellite">("streets");
    const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMode, setFilterMode] = useState<"ALL" | "SUPERVISOR" | "EMPLOYEE" | "REPORT_STATUS">("ALL");
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("ALL");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("ALL");
    const [reportFilter, setReportFilter] = useState<"ALL" | "REPORTED" | "PENDING">("ALL");

    // Extract unique supervisors
    const supervisorsList = useMemo(() => {
        const map = new Map<string, { id: string; name: string }>();
        beats.forEach(b => {
            if (b.supervisorsSummary) {
                b.supervisorsSummary.forEach((s: any) => {
                    if (s.id && s.name) map.set(s.id, { id: s.id, name: s.name });
                });
            }
            if (b.assignedToId && b.assignedToName) {
                map.set(b.assignedToId, { id: b.assignedToId, name: b.assignedToName });
            }
            (b.segments || []).forEach((seg: any) => {
                if (seg.supervisorAssignedToId && seg.supervisorAssignedToName) {
                    map.set(seg.supervisorAssignedToId, { id: seg.supervisorAssignedToId, name: seg.supervisorAssignedToName });
                }
            });
        });
        return Array.from(map.values());
    }, [beats]);

    // Extract unique employees
    const employeesList = useMemo(() => {
        const map = new Map<string, { id: string; name: string }>();
        beats.forEach(b => {
            if (b.employeesSummary) {
                b.employeesSummary.forEach((e: any) => {
                    if (e.id && e.name) map.set(e.id, { id: e.id, name: e.name });
                });
            }
            (b.segments || []).forEach((seg: any) => {
                if (seg.employeeAssignedToId && seg.employeeAssignedToName) {
                    map.set(seg.employeeAssignedToId, { id: seg.employeeAssignedToId, name: seg.employeeAssignedToName });
                }
                if (seg.assignedToId && seg.assignedToName) {
                    map.set(seg.assignedToId, { id: seg.assignedToId, name: seg.assignedToName });
                }
            });
        });
        return Array.from(map.values());
    }, [beats]);

    // Filter beats
    const filteredBeats = useMemo(() => {
        return beats.filter(beat => {
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = beat.beatName?.toLowerCase().includes(q) ||
                    beat.zoneName?.toLowerCase().includes(q) ||
                    beat.wardName?.toLowerCase().includes(q) ||
                    beat.areaName?.toLowerCase().includes(q);
                const supMatch = beat.supervisorsSummary?.some((s: any) => s.name?.toLowerCase().includes(q)) ||
                    beat.assignedToName?.toLowerCase().includes(q);
                const empMatch = beat.employeesSummary?.some((e: any) => e.name?.toLowerCase().includes(q)) ||
                    beat.segments?.some((s: any) => s.employeeAssignedToName?.toLowerCase().includes(q) || s.assignedToName?.toLowerCase().includes(q));

                if (!nameMatch && !supMatch && !empMatch) return false;
            }

            // Supervisor Filter
            if (filterMode === "SUPERVISOR" && selectedSupervisorId !== "ALL") {
                const hasSup = beat.assignedToId === selectedSupervisorId ||
                    beat.supervisorsSummary?.some((s: any) => s.id === selectedSupervisorId) ||
                    beat.segments?.some((s: any) => s.supervisorAssignedToId === selectedSupervisorId);
                if (!hasSup) return false;
            }

            // Employee Filter
            if (filterMode === "EMPLOYEE" && selectedEmployeeId !== "ALL") {
                const hasEmp = beat.employeesSummary?.some((e: any) => e.id === selectedEmployeeId) ||
                    beat.segments?.some((s: any) => s.employeeAssignedToId === selectedEmployeeId || s.assignedToId === selectedEmployeeId);
                if (!hasEmp) return false;
            }

            // Report Filter
            const hasReport = beat.segments?.some((s: any) => s.isAssessed || s.lastAssessment);
            if (reportFilter === "REPORTED" && !hasReport) return false;
            if (reportFilter === "PENDING" && hasReport) return false;

            return true;
        });
    }, [beats, searchQuery, filterMode, selectedSupervisorId, selectedEmployeeId, reportFilter]);

    const beatsWithGeom = useMemo(() => {
        return filteredBeats.filter(b => b.geometry || (b.segments && b.segments.some((s: any) => s.geometry)));
    }, [filteredBeats]);

    const selectedBeat = useMemo(() => {
        return beats.find(b => b.id === selectedBeatId) || null;
    }, [beats, selectedBeatId]);

    // Stats
    const stats = useMemo(() => {
        let reported = 0;
        let pending = 0;
        beats.forEach(b => {
            const hasRep = b.segments?.some((s: any) => s.isAssessed || s.lastAssessment);
            if (hasRep) reported++;
            else pending++;
        });
        return { total: beats.length, reported, pending };
    }, [beats]);

    return (
        <div className="card" style={{ padding: 0, overflow: "hidden", height: "780px", position: "relative", borderRadius: "24px", border: "1px solid #e2e8f0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>

            {/* Top Control Bar */}
            <div style={{
                position: "absolute", top: "16px", left: "16px", right: "16px", zIndex: 1000,
                display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between",
                backgroundColor: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(12px)",
                padding: "12px 18px", borderRadius: "18px", border: "1px solid rgba(226, 232, 240, 0.8)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)"
            }}>
                {/* Left: Search Box */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", minWidth: "260px" }}>
                    <Search size={16} color="#64748b" />
                    <input
                        type="text"
                        placeholder="Search beats, supervisors, employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", color: "#0f172a", width: "100%", fontWeight: 600 }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                            <X size={14} color="#94a3b8" />
                        </button>
                    )}
                </div>

                {/* Center: View Mode & Filtering Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>

                    {/* Mode Selector */}
                    <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "12px" }}>
                        <button
                            onClick={() => { setFilterMode("ALL"); setSelectedSupervisorId("ALL"); setSelectedEmployeeId("ALL"); }}
                            style={{
                                padding: "6px 12px", borderRadius: "9px", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                                background: filterMode === "ALL" ? "#ffffff" : "transparent",
                                color: filterMode === "ALL" ? "#2563eb" : "#64748b",
                                boxShadow: filterMode === "ALL" ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
                            }}
                        >
                            All Beats
                        </button>

                        <button
                            onClick={() => setFilterMode("SUPERVISOR")}
                            style={{
                                padding: "6px 12px", borderRadius: "9px", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                                background: filterMode === "SUPERVISOR" ? "#ffffff" : "transparent",
                                color: filterMode === "SUPERVISOR" ? "#2563eb" : "#64748b",
                                boxShadow: filterMode === "SUPERVISOR" ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
                            }}
                        >
                            Supervisor View
                        </button>

                        <button
                            onClick={() => setFilterMode("EMPLOYEE")}
                            style={{
                                padding: "6px 12px", borderRadius: "9px", border: "none", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                                background: filterMode === "EMPLOYEE" ? "#ffffff" : "transparent",
                                color: filterMode === "EMPLOYEE" ? "#8b5cf6" : "#64748b",
                                boxShadow: filterMode === "EMPLOYEE" ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
                            }}
                        >
                            Employee View
                        </button>
                    </div>

                    {/* Supervisor Dropdown */}
                    {filterMode === "SUPERVISOR" && (
                        <select
                            value={selectedSupervisorId}
                            onChange={(e) => setSelectedSupervisorId(e.target.value)}
                            style={{
                                padding: "7px 12px", borderRadius: "12px", border: "1px solid #bfdbfe", background: "#eff6ff",
                                fontSize: "12px", fontWeight: 700, color: "#1d4ed8", outline: "none", cursor: "pointer"
                            }}
                        >
                            <option value="ALL">All Supervisors ({supervisorsList.length})</option>
                            {supervisorsList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Employee Dropdown */}
                    {filterMode === "EMPLOYEE" && (
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            style={{
                                padding: "7px 12px", borderRadius: "12px", border: "1px solid #ddd6fe", background: "#f5f3ff",
                                fontSize: "12px", fontWeight: 700, color: "#6d28d9", outline: "none", cursor: "pointer"
                            }}
                        >
                            <option value="ALL">All Employees ({employeesList.length})</option>
                            {employeesList.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Report Status Filter Buttons */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button
                            onClick={() => setReportFilter(reportFilter === "REPORTED" ? "ALL" : "REPORTED")}
                            style={{
                                display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "12px",
                                border: reportFilter === "REPORTED" ? "1px solid #059669" : "1px solid #dcfce7",
                                background: reportFilter === "REPORTED" ? "#10b981" : "#ecfdf5",
                                color: reportFilter === "REPORTED" ? "#ffffff" : "#047857",
                                fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                            }}
                        >
                            <CheckCircle2 size={14} />
                            Report Submitted ({stats.reported})
                        </button>

                        <button
                            onClick={() => setReportFilter(reportFilter === "PENDING" ? "ALL" : "PENDING")}
                            style={{
                                display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "12px",
                                border: reportFilter === "PENDING" ? "1px solid #d97706" : "1px solid #fef3c7",
                                background: reportFilter === "PENDING" ? "#f59e0b" : "#fffbeb",
                                color: reportFilter === "PENDING" ? "#ffffff" : "#b45309",
                                fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                            }}
                        >
                            <Clock size={14} />
                            Pending ({stats.pending})
                        </button>
                    </div>
                </div>
            </div>

            {/* Leaflet Map */}
            <MapContainer
                key="global-beat-map-view"
                center={[20.5937, 78.9629]}
                zoom={5}
                zoomControl={false}
                style={{ height: "100%", width: "100%", background: "#f1f5f9" }}
            >
                {mapType === "streets" ? (
                    <TileLayer
                        attribution='&copy; CARTO'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />
                ) : (
                    <TileLayer
                        attribution='Google'
                        url="http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    />
                )}

                {beatsWithGeom.map((beat, bIdx) => (
                    <BeatGeoJSONLayer
                        key={beat.id}
                        beat={beat}
                        bIdx={bIdx}
                        isSelected={selectedBeatId === beat.id}
                        onSelectBeat={setSelectedBeatId}
                    />
                ))}

                <FitAllBounds beats={beatsWithGeom} selectedBeatId={selectedBeatId} />

                {/* Map Type Controls */}
                <div style={{ position: "absolute", bottom: "24px", right: "20px", zIndex: 1000 }}>
                    <div style={{
                        backgroundColor: "white", padding: "6px", borderRadius: "16px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", border: "1px solid #f1f5f9",
                        display: "flex", flexDirection: "column", gap: "6px"
                    }}>
                        {(["streets", "satellite"] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setMapType(t)}
                                style={{
                                    width: "44px", height: "44px", borderRadius: "12px", border: "none",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    backgroundColor: mapType === t ? "#eff6ff" : "transparent",
                                    color: mapType === t ? "#2563eb" : "#94a3b8",
                                    cursor: "pointer", transition: "all 0.2s"
                                }}
                            >
                                {t === "streets" ? <MapIcon size={20} /> : <Layers size={20} />}
                            </button>
                        ))}
                    </div>
                </div>
            </MapContainer>

            {/* Selected Beat Details Floating Card (Bottom Left) */}
            {selectedBeat && (
                <div style={{
                    position: "absolute", bottom: "24px", left: "20px", width: "360px", zIndex: 1000,
                    backgroundColor: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)", overflow: "hidden"
                }}>
                    <div style={{ padding: "16px", background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "-0.01em" }}>{selectedBeat.beatName}</div>
                            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600, marginTop: "2px" }}>
                                {selectedBeat.zoneName} • {selectedBeat.wardName} • {selectedBeat.areaName}
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedBeatId(null)}
                            style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div style={{ padding: "16px", maxHeight: "300px", overflowY: "auto" }}>
                        {/* Supervisors */}
                        <div style={{ marginBottom: "14px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Assigned Supervisor(s)</div>
                            {(selectedBeat.supervisorsSummary && selectedBeat.supervisorsSummary.length > 0) ? (
                                selectedBeat.supervisorsSummary.map((sup: any) => (
                                    <div key={sup.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9", marginBottom: "4px" }}>
                                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px" }}>
                                            {sup.name[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{sup.name}</div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>{sup.count || 1} assigned segment(s)</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>{selectedBeat.assignedToName ? `Primary: ${selectedBeat.assignedToName}` : "No supervisor assigned"}</div>
                            )}
                        </div>

                        {/* Employees */}
                        <div style={{ marginBottom: "14px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Assigned Worker(s) / Employees</div>
                            {(selectedBeat.employeesSummary && selectedBeat.employeesSummary.length > 0) ? (
                                selectedBeat.employeesSummary.map((emp: any) => (
                                    <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9", marginBottom: "4px" }}>
                                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f5f3ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px" }}>
                                            {emp.name[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{emp.name}</div>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>{emp.count || 1} segment(s)</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>No specific employee assigned</div>
                            )}
                        </div>

                        {/* Segment breakdown */}
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Segments & Report Status</div>
                            {(selectedBeat.segments || []).map((seg: any, idx: number) => {
                                const isAss = seg.isAssessed || !!seg.lastAssessment;
                                const segNum = seg.segmentNumber || (idx + 1);
                                return (
                                    <div key={seg.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "6px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 800 }}>Beat {segNum}</span>
                                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>{seg.assignedToName || 'Unassigned Worker'}</span>
                                        </div>
                                        <span style={{
                                            padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 800,
                                            background: isAss ? "#dcfce7" : "#fef3c7",
                                            color: isAss ? "#15803d" : "#b45309"
                                        }}>
                                            {isAss ? "Report Submitted" : "Pending Report"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .premium-popup .leaflet-popup-content-wrapper {
                    border-radius: 20px;
                    padding: 0;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255,255,255,0.8);
                }
                .premium-popup .leaflet-popup-content {
                    margin: 0;
                }
                .premium-popup .leaflet-popup-tip-container {
                    display: none;
                }
                .leaflet-container {
                    cursor: crosshair !important;
                }
            `}</style>
        </div>
    );
}
