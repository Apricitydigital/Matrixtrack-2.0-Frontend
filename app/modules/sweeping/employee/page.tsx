"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { AreaBeatApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { MapPin, Layers, CheckCircle, Clock, ChevronRight, Activity } from "lucide-react";
import dynamic from "next/dynamic";

const BeatMapView = dynamic(() => import("../../../city/areas/components/BeatMapView"), { ssr: false });

export default function EmployeeSweepingPage() {
    const { user } = useAuth();
    const [beats, setBeats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingBeat, setViewingBeat] = useState<any | null>(null);

    const loadMyBeats = useCallback(async () => {
        try {
            setLoading(true);
            const res = await AreaBeatApi.listMyBeats();
            setBeats(res.beats || []);
        } catch (err) {
            console.error("Failed to load beats", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMyBeats();
    }, [loadMyBeats]);

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["EMPLOYEE"]}>
                <div className="page" style={{ padding: "32px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
                    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                        {/* Header */}
                        <div style={{ marginBottom: "40px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                                <Activity size={14} /> My Daily Workload
                            </div>
                            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                                Assigned Beats
                            </h1>
                            <p style={{ color: "#64748b", marginTop: "8px", fontSize: "1rem" }}>
                                Select a beat to view your assigned segments and start your shift.
                            </p>
                        </div>

                        {loading ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px" }}>
                                <div className="animate-spin" style={{ width: "32px", height: "32px", border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%" }}></div>
                                <span style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>Syncing your assignments...</span>
                            </div>
                        ) : beats.length === 0 ? (
                            <div style={{ backgroundColor: "white", borderRadius: "24px", padding: "60px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                                <div style={{ backgroundColor: "#f1f5f9", width: "64px", height: "64px", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                                    <Clock size={32} color="#94a3b8" />
                                </div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>No active assignments</h2>
                                <p style={{ color: "#64748b", maxWidth: "400px", margin: "12px auto 0" }}>
                                    You don't have any assigned beats or road segments at the moment. Please contact your supervisor (QC) for new assignments.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
                                {beats.map((beat) => (
                                    <div
                                        key={beat.id}
                                        className="beat-card"
                                        onClick={() => setViewingBeat(beat)}
                                        style={{
                                            backgroundColor: "white",
                                            borderRadius: "24px",
                                            padding: "24px",
                                            border: "1px solid #e2e8f0",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                            cursor: "pointer",
                                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                            position: "relative",
                                            overflow: "hidden"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                                            <div style={{ backgroundColor: "#eff6ff", padding: "10px", borderRadius: "14px" }}>
                                                <MapPin size={24} color="#2563eb" />
                                            </div>
                                            <div style={{
                                                backgroundColor: "#f0fdf4", color: "#16a34a",
                                                fontSize: "11px", fontWeight: 800,
                                                padding: "4px 12px", borderRadius: "20px",
                                                border: "1px solid #bbf7d0", textTransform: "uppercase"
                                            }}>
                                                Active
                                            </div>
                                        </div>

                                        <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", marginBottom: "8px" }}>
                                            {beat.beatName}
                                        </h3>

                                        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "16px", padding: "16px 0", borderTop: "1px solid #f1f5f9" }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Assigned LineStrings</div>
                                                <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <Layers size={18} color="#2563eb" /> {beat.segments?.length || 0}
                                                </div>
                                            </div>
                                            <ChevronRight size={20} color="#cbd5e1" />
                                        </div>

                                        <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "14px", marginTop: "8px" }}>
                                            <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Geo Context</div>
                                            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#334155", marginTop: "2px" }}>
                                                Ward {beat.wardName || "-"} · Area {beat.areaName || "-"}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {viewingBeat && (
                        <BeatMapView
                            beat={viewingBeat}
                            onClose={() => setViewingBeat(null)}
                        />
                    )}

                    <style jsx>{`
                        .beat-card:hover {
                            transform: translateY(-4px);
                            box-shadow: 0 12px 20px -8px rgba(0,0,0,0.1);
                            border-color: #2563eb;
                        }
                        .animate-spin { animation: spin 1s linear infinite; }
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    `}</style>
                </div>
            </ModuleGuard>
        </Protected>
    );
}
