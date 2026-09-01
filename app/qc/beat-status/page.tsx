"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Protected, RoleGuard } from "@components/Guards";
import { AreaBeatApi } from "@lib/apiClient";
import {
    CheckCircle2, Clock, AlertCircle, MapPin, Search, Calendar,
    List, Map as MapIcon, User, Users, ChevronDown, ChevronRight,
    RefreshCw, Target, X, Building2
} from "lucide-react";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

type BeatStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_DONE";

const STATUS_META: Record<BeatStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    COMPLETED:   { label: "Completed",   color: "#15803d", bg: "rgba(34,197,94,0.10)",  border: "#22c55e", icon: <CheckCircle2 size={14} /> },
    IN_PROGRESS: { label: "In Progress", color: "#b45309", bg: "rgba(245,158,11,0.10)", border: "#f59e0b", icon: <Clock size={14} /> },
    NOT_DONE:    { label: "Not Started",    color: "#b91c1c", bg: "rgba(239,68,68,0.10)",  border: "#ef4444", icon: <AlertCircle size={14} /> },
};
const MAP_COLORS: Record<BeatStatus, string> = { COMPLETED: "#22c55e", IN_PROGRESS: "#f59e0b", NOT_DONE: "#ef4444" };

function todayStr() { return new Date().toISOString().split("T")[0]; }

function getCoords(g: any): [number, number][] {
    if (!g) return [];
    if (g.type === "LineString") return g.coordinates.map((c: number[]) => [c[1], c[0]]);
    if (g.type === "MultiLineString") return g.coordinates.flatMap((l: number[][]) => l.map((c: number[]) => [c[1], c[0]]));
    if (g.type === "Point") return [[g.coordinates[1], g.coordinates[0]]];
    return [];
}

function getBeatCoords(beat: any): [number, number][] {
    const coords: [number, number][] = [];
    if (Array.isArray(beat.segments) && beat.segments.length > 0) {
        for (const seg of beat.segments) {
            if (seg.geometry) coords.push(...getCoords(seg.geometry));
        }
    }
    if (coords.length === 0 && Array.isArray(beat.points) && beat.points.length > 0) {
        for (const p of beat.points) {
            const lat = p.latitude ?? p.lat;
            const lng = p.longitude ?? p.lng ?? p.lon;
            if (typeof lat === "number" && typeof lng === "number") coords.push([lat, lng]);
        }
    }
    if (coords.length === 0 && beat.geometry) coords.push(...getCoords(beat.geometry));
    return coords;
}

function getBeatPointMarkers(beat: any) {
    const markers: { id: string; name: string; lat: number; lng: number; isAssessed: boolean }[] = [];
    if (Array.isArray(beat.segments) && beat.segments.length > 0) {
        beat.segments.forEach((seg: any, i: number) => {
            const segCoords = getCoords(seg.geometry);
            const ptName = seg.name || (beat.points?.[i]?.name ? `Point ${i + 1}: ${beat.points[i].name}` : `Point ${i + 1}`);
            if (segCoords.length > 0) {
                const mid = segCoords[Math.floor(segCoords.length / 2)];
                markers.push({ id: seg.id || `seg-${i}`, name: ptName, lat: mid[0], lng: mid[1], isAssessed: !!seg.isAssessed });
            }
        });
    } else if (Array.isArray(beat.points)) {
        beat.points.forEach((p: any, i: number) => {
            const lat = p.latitude ?? p.lat;
            const lng = p.longitude ?? p.lng ?? p.lon;
            if (typeof lat === "number" && typeof lng === "number") {
                const ptName = p.name ? `Point ${i + 1}: ${p.name}` : `Point ${i + 1}`;
                markers.push({ id: `pt-${i}`, name: ptName, lat, lng, isAssessed: false });
            }
        });
    }
    return markers;
}

function StatusBadge({ status }: { status: BeatStatus }) {
    const m = STATUS_META[status];
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
            {m.icon} {m.label}
        </span>
    );
}

function ProgressBar({ assessed, total }: { assessed: number; total: number }) {
    const pct = total > 0 ? Math.round((assessed / total) * 100) : 0;
    const color = pct === 100 ? "#22c55e" : pct > 0 ? "#f59e0b" : "#ef4444";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 48 }}>{assessed}/{total}</span>
        </div>
    );
}

function BeatRow({ beat, expanded, onToggle }: any) {
    return (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 10, background: "white" }}>
            <button onClick={onToggle} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "14px 18px", display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr auto", gap: 12, alignItems: "center", textAlign: "left" }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{beat.beatName}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{beat.zoneName} · {beat.wardName}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <User size={13} color="#94a3b8" />
                    <span style={{ fontSize: 12, color: "#475569" }}>{beat.supervisorsSummary[0]?.name || beat.assignedTo?.name || "Unassigned"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={13} color="#94a3b8" />
                    <span style={{ fontSize: 12, color: "#475569" }}>{beat.employeesSummary.length > 0 ? beat.employeesSummary.map((e: any) => e.name).join(", ") : "—"}</span>
                </div>
                <ProgressBar assessed={beat.assessedPointsCount} total={beat.totalPoints} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge status={beat.beatCompletionStatus} />
                    {expanded ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                </div>
            </button>
            {expanded && (
                <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "14px 18px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
                        Point Details — {beat.assessedPointsCount} of {beat.totalPoints} reported today
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {beat.segments.map((seg: any, i: number) => (
                            <div key={seg.id} style={{ background: seg.isAssessed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)", border: `1px solid ${seg.isAssessed ? "#22c55e" : "#ef4444"}`, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                                <span style={{ fontWeight: 700, color: seg.isAssessed ? "#15803d" : "#b91c1c" }}>{seg.isAssessed ? "✓ Inspected" : "✗ Pending"}</span>
                                <span style={{ marginLeft: 6, color: "#334155", fontWeight: 600 }}>{seg.name || `Point ${i + 1}`}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function QCBeatStatusPage() {
    const [beats, setBeats] = useState<any[]>([]);
    const [summary, setSummary] = useState({ total: 0, completed: 0, inProgress: 0, notDone: 0 });
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"list" | "map">("map");
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [statusFilter, setStatusFilter] = useState<"ALL" | BeatStatus>("ALL");

    // Geo filters
    const [selectedZoneId, setSelectedZoneId] = useState<string>("ALL");
    const [selectedWardId, setSelectedWardId] = useState<string>("ALL");
    const [selectedBeatId, setSelectedBeatId] = useState<string>("ALL");

    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const mapRef = useRef<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await AreaBeatApi.beatStatusOverview({
                date: selectedDate,
                status: statusFilter
            });
            setBeats(data.beats || []);
            setSummary(data.summary || { total: 0, completed: 0, inProgress: 0, notDone: 0 });
            setLastRefreshed(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedDate, statusFilter]);

    // Unique Zones derived from returned authorized beats
    const availableZones = useMemo(() => {
        const map = new Map<string, string>();
        beats.forEach(b => {
            if (b.zoneId && b.zoneName) map.set(b.zoneId, b.zoneName);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [beats]);

    // Unique Wards derived from returned beats (filtered by Zone if selected)
    const availableWards = useMemo(() => {
        const map = new Map<string, string>();
        beats.forEach(b => {
            if (selectedZoneId !== "ALL" && b.zoneId !== selectedZoneId) return;
            if (b.wardId && b.wardName) map.set(b.wardId, b.wardName);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [beats, selectedZoneId]);

    // Available beats for dropdown before single beat selection
    const availableBeats = useMemo(() => {
        return beats.filter(b => {
            if (selectedZoneId !== "ALL" && b.zoneId !== selectedZoneId) return false;
            if (selectedWardId !== "ALL" && b.wardId !== selectedWardId) return false;
            return true;
        });
    }, [beats, selectedZoneId, selectedWardId]);

    const filtered = useMemo(() => {
        let result = beats;

        if (selectedZoneId !== "ALL") {
            result = result.filter(b => b.zoneId === selectedZoneId);
        }
        if (selectedWardId !== "ALL") {
            result = result.filter(b => b.wardId === selectedWardId);
        }
        if (selectedBeatId !== "ALL") {
            result = result.filter(b => b.id === selectedBeatId);
        }
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(b => b.beatName?.toLowerCase().includes(q) || b.wardName?.toLowerCase().includes(q) || b.zoneName?.toLowerCase().includes(q) || b.supervisorsSummary?.some((s: any) => s.name?.toLowerCase().includes(q)) || b.segments?.some((seg: any) => seg.name?.toLowerCase().includes(q)));
        }
        return result;
    }, [beats, selectedZoneId, selectedWardId, selectedBeatId, search]);

    const mapCenter: [number, number] = useMemo(() => {
        for (const b of filtered) {
            const c = getBeatCoords(b); if (c.length) return c[0];
        }
        return [22.7, 75.8];
    }, [filtered]);

    useEffect(() => {
        if (!mapRef.current || !filtered.length) return;
        const allCoords: [number, number][] = [];
        filtered.forEach(b => {
            allCoords.push(...getBeatCoords(b));
        });
        if (allCoords.length > 0) {
            try {
                mapRef.current.fitBounds(allCoords as any, { padding: [50, 50], maxZoom: 16 });
            } catch {}
        }
    }, [filtered, view]);

    const btnStyle = (active: boolean, color: string) => ({
        background: active ? `${color}15` : "white", border: `2px solid ${active ? color : "#e2e8f0"}`,
        borderRadius: 10, padding: "12px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
        flex: 1, transition: "all 0.2s", fontFamily: "inherit"
    });

    return (
        <Protected>
            <RoleGuard roles={["QC"]}>
                <div style={{ padding: 24, minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', sans-serif" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ background: "#7c3aed", borderRadius: 10, padding: 10 }}><Target size={22} color="white" /></div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Beat Sweeping Status</h1>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                                    Daily tracking · {lastRefreshed ? lastRefreshed.toLocaleTimeString() : "—"}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            {/* Zone Selector */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px" }}>
                                <Building2 size={14} color="#7c3aed" />
                                <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Zone:</span>
                                <select
                                    value={selectedZoneId}
                                    onChange={e => { setSelectedZoneId(e.target.value); setSelectedWardId("ALL"); setSelectedBeatId("ALL"); }}
                                    style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", fontWeight: 700, color: "#0f172a", background: "transparent", cursor: "pointer" }}
                                >
                                    <option value="ALL">All Zones ({availableZones.length})</option>
                                    {availableZones.map(z => (
                                        <option key={z.id} value={z.id}>{z.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Ward Selector */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px" }}>
                                <MapPin size={14} color="#7c3aed" />
                                <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Ward:</span>
                                <select
                                    value={selectedWardId}
                                    onChange={e => { setSelectedWardId(e.target.value); setSelectedBeatId("ALL"); }}
                                    style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", fontWeight: 700, color: "#0f172a", background: "transparent", cursor: "pointer" }}
                                >
                                    <option value="ALL">All Wards ({availableWards.length})</option>
                                    {availableWards.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Beat Selector */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px" }}>
                                <Target size={14} color="#7c3aed" />
                                <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Beat:</span>
                                <select
                                    value={selectedBeatId}
                                    onChange={e => setSelectedBeatId(e.target.value)}
                                    style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", fontWeight: 700, color: "#0f172a", background: "transparent", cursor: "pointer" }}
                                >
                                    <option value="ALL">All Beats ({availableBeats.length})</option>
                                    {availableBeats.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.beatName} ({b.assessedPointsCount}/{b.totalPoints} Pts)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px" }}>
                                <Calendar size={14} color="#64748b" />
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit" }} />
                            </div>
                            <button onClick={fetchData} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>
                                <RefreshCw size={14} /> Refresh
                            </button>
                            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", overflow: "hidden" }}>
                                {[{ v: "list" as const, icon: <List size={14} /> }, { v: "map" as const, icon: <MapIcon size={14} /> }].map(({ v, icon }) => (
                                    <button key={v} onClick={() => setView(v)} style={{ padding: "7px 14px", border: "none", cursor: "pointer", background: view === v ? "#7c3aed" : "transparent", color: view === v ? "white" : "#64748b", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                                        {icon} {v.charAt(0).toUpperCase() + v.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary buttons */}
                    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                        {([
                            { key: "ALL", label: "Total", value: summary.total, color: "#7c3aed", icon: <Target size={18} /> },
                            { key: "COMPLETED", label: "Completed", value: summary.completed, color: "#22c55e", icon: <CheckCircle2 size={18} /> },
                            { key: "IN_PROGRESS", label: "In Progress", value: summary.inProgress, color: "#f59e0b", icon: <Clock size={18} /> },
                            { key: "NOT_DONE", label: "Not started", value: summary.notDone, color: "#ef4444", icon: <AlertCircle size={18} /> },
                        ] as any[]).map(({ key, label, value, color, icon }) => (
                            <button key={key} onClick={() => { setStatusFilter(key); setSelectedBeatId("ALL"); }} style={btnStyle(statusFilter === key, color)}>
                                <div style={{ background: `${color}20`, borderRadius: 8, padding: 8, color }}>{icon}</div>
                                <div style={{ textAlign: "left" }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: statusFilter === key ? color : "#0f172a" }}>{loading ? "…" : value}</div>
                                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{label}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                        <Search size={15} color="#94a3b8" />
                        <input placeholder="Search beats, points, supervisors, zones, wards..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit" }} />
                        {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={14} color="#94a3b8" /></button>}
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} beats showing</span>
                    </div>

                    {loading && (
                        <div style={{ textAlign: "center", padding: "60px 0" }}>
                            <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#7c3aed", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
                            <p style={{ color: "#64748b" }}>Loading beat status...</p>
                        </div>
                    )}

                    {!loading && view === "list" && (
                        <>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr auto", gap: 12, padding: "8px 18px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                                <span>Beat</span><span>Supervisor</span><span>Employees</span><span>Progress</span><span>Status</span>
                            </div>
                            {filtered.length === 0 && (
                                <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
                                    <MapPin size={28} style={{ marginBottom: 10 }} /><p>No beats match your filter.</p>
                                </div>
                            )}
                            {filtered.map(beat => (
                                <BeatRow key={beat.id} beat={beat} expanded={expandedId === beat.id} onToggle={() => setExpandedId(expandedId === beat.id ? null : beat.id)} />
                            ))}
                        </>
                    )}

                    {!loading && view === "map" && (
                        <div style={{ height: "68vh", borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", position: "relative" }}>
                            <MapContainer center={mapCenter} zoom={13} ref={mapRef} style={{ height: "100%", width: "100%" }}>
                                <TileLayer
                                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                    maxZoom={20}
                                />
                                {filtered.map(beat => {
                                    const coords = getBeatCoords(beat);
                                    const pointMarkers = getBeatPointMarkers(beat);
                                    if (!coords.length && !pointMarkers.length) return null;
                                    const color = MAP_COLORS[beat.beatCompletionStatus as BeatStatus];
                                    const isSelected = selectedBeatId === beat.id;

                                    return (
                                        <React.Fragment key={beat.id}>
                                            {coords.length > 0 && (
                                                <>
                                                    <Polyline positions={coords as any} pathOptions={{ color, weight: isSelected ? 20 : 14, opacity: 0.2 }} />
                                                    <Polyline positions={coords as any} pathOptions={{ color, weight: isSelected ? 7 : 4, opacity: 1, lineCap: "round" }}>
                                                        <Popup closeButton={false}>
                                                            <div style={{ fontFamily: "'Inter',sans-serif", minWidth: 200 }}>
                                                                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{beat.beatName}</div>
                                                                <StatusBadge status={beat.beatCompletionStatus} />
                                                                <div style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>
                                                                    <div><b>Zone/Ward:</b> {beat.zoneName} · {beat.wardName}</div>
                                                                    <div><b>Supervisor:</b> {beat.supervisorsSummary[0]?.name || "—"}</div>
                                                                    <div><b>Progress:</b> {beat.assessedPointsCount}/{beat.totalPoints} points reported</div>
                                                                </div>
                                                            </div>
                                                        </Popup>
                                                    </Polyline>
                                                </>
                                            )}

                                            {pointMarkers.map(pt => (
                                                <CircleMarker
                                                    key={pt.id}
                                                    center={[pt.lat, pt.lng]}
                                                    radius={isSelected ? 8 : 6}
                                                    pathOptions={{
                                                        color: pt.isAssessed ? "#15803d" : "#b91c1c",
                                                        fillColor: pt.isAssessed ? "#22c55e" : "#ef4444",
                                                        fillOpacity: 0.9,
                                                        weight: 2
                                                    }}
                                                >
                                                    <Popup closeButton={false}>
                                                        <div style={{ fontFamily: "'Inter',sans-serif", minWidth: 180 }}>
                                                            <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>{beat.beatName}</div>
                                                            <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", margin: "2px 0 6px" }}>{pt.name}</div>
                                                            <span style={{
                                                                display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                                                                background: pt.isAssessed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                                                                color: pt.isAssessed ? "#15803d" : "#b91c1c"
                                                            }}>
                                                                {pt.isAssessed ? "✓ Inspected Today" : "✗ Pending Inspection"}
                                                            </span>
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </MapContainer>
                            <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 1000, background: "white", borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Beat Status</div>
                                {(["COMPLETED", "IN_PROGRESS", "NOT_DONE"] as BeatStatus[]).map(s => (
                                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                        <div style={{ width: 18, height: 4, background: MAP_COLORS[s], borderRadius: 4 }} />
                                        <span style={{ color: STATUS_META[s].color }}>{STATUS_META[s].label}</span>
                                    </div>
                                ))}
                                <div style={{ height: 1, background: "#e2e8f0", margin: "6px 0" }} />
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Point Status</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                                    <span style={{ color: "#15803d" }}>Point Inspected</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                                    <span style={{ color: "#b91c1c" }}>Point Pending</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </RoleGuard>
        </Protected>
    );
}
