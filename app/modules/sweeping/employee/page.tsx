"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Protected, ModuleGuard } from "@components/Guards";
import { AreaBeatApi } from "@lib/apiClient";
import { Activity, CheckCircle2, ChevronRight, Clock, Layers, MapPin } from "lucide-react";
import dynamic from "next/dynamic";

const BeatMapView = dynamic(() => import("../../../city/areas/components/BeatMapView"), { ssr: false });

export default function EmployeeSweepingPage() {
    const [beats, setBeats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [viewingBeat, setViewingBeat] = useState<any | null>(null);

    const loadMyBeats = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await AreaBeatApi.listMyBeats();
            setBeats(res.beats || []);
        } catch (err: any) {
            console.error("Failed to load beats", err);
            setError(err?.message || "Failed to load assigned beats.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMyBeats();
    }, [loadMyBeats]);

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["SUPERVISOR", "EMPLOYEE"]}>
                <div className="page" style={{ padding: "32px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
                    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                        <div style={{ marginBottom: "32px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                                <Activity size={14} /> My Daily Workload
                            </div>
                            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>Assigned Sweeping Beats</h1>
                            <p style={{ color: "#64748b", marginTop: "8px", fontSize: "1rem" }}>
                                Start the inspection against the exact assigned beat segment. Location is checked automatically when you submit.
                            </p>
                        </div>

                        {error && <div className="alert alert-error" style={{ marginBottom: 18 }}>{error}</div>}

                        {loading ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px" }}>
                                <div className="animate-spin" style={{ width: "32px", height: "32px", border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%" }} />
                                <span style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Loading assignments...</span>
                            </div>
                        ) : beats.length === 0 ? (
                            <div style={{ backgroundColor: "white", borderRadius: "24px", padding: "60px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                                <div style={{ backgroundColor: "#f1f5f9", width: "64px", height: "64px", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                                    <Clock size={32} color="#94a3b8" />
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>No active assignments</h2>
                                <p style={{ color: "#64748b", maxWidth: "420px", margin: "12px auto 0" }}>
                                    No sweeping beat segment is currently assigned to you.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                {beats.map((beat) => (
                                    <section key={beat.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 22, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.05)" }}>
                                        <div style={{ padding: "20px 22px", display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                                <div style={{ background: "#eff6ff", width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center" }}>
                                                    <MapPin size={22} color="#2563eb" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{beat.beatName}</div>
                                                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 3 }}>
                                                        Ward {beat.wardName || "-"} · {beat.areaName || "-"} · {beat.segments?.length || 0} segment(s)
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setViewingBeat(beat)}>
                                                <Layers size={15} /> View Map
                                            </button>
                                        </div>

                                        <div style={{ padding: 14 }}>
                                            {(beat.segments || []).length === 0 ? (
                                                <div className="muted" style={{ padding: 16, textAlign: "center" }}>No assigned segments in this beat.</div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                                                    {(beat.segments || []).map((segment: any, index: number) => {
                                                        const completed = !!segment.isAssessed || !!segment.lastAssessment;
                                                        const segmentName = segment.name || segment.fullName || `Beat Segment ${index + 1}`;
                                                        return (
                                                            <div key={segment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "13px 14px", border: "1px solid #eef2f7", borderRadius: 14, background: completed ? "#f0fdf4" : "#f8fafc" }}>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontSize: 14, fontWeight: 750, color: "#1e293b" }}>{segmentName}</div>
                                                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                                                                        {segment.startPointName && segment.endPointName ? `${segment.startPointName} → ${segment.endPointName}` : `Segment ${segment.segmentNumber || index + 1}`}
                                                                    </div>
                                                                </div>

                                                                {completed ? (
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#15803d", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
                                                                        <CheckCircle2 size={17} /> Completed Today
                                                                    </div>
                                                                ) : (
                                                                    <Link
                                                                        className="btn btn-sm btn-primary"
                                                                        href={`/modules/survey/SWEEPING/${segment.id}?name=${encodeURIComponent(segmentName)}&returnTo=${encodeURIComponent('/modules/sweeping/employee')}`}
                                                                    >
                                                                        Start Survey <ChevronRight size={15} />
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}
                    </div>

                    {viewingBeat && <BeatMapView beat={viewingBeat} onClose={() => setViewingBeat(null)} />}

                    <style jsx>{`
                        .animate-spin { animation: spin 1s linear infinite; }
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    `}</style>
                </div>
            </ModuleGuard>
        </Protected>
    );
}
