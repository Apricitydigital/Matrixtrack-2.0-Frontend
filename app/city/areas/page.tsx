"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import BeatForm from "./components/BeatForm";
import AreaForm from "./components/AreaForm";
import BeatTable from "./components/BeatTable";
import EditBeatModal from "./components/EditBeatModal";
import KMLDataViewer from "./components/KMLDataViewer";
import AssignBeatModal from "./components/AssignBeatModal";
import { AreaBeatApi } from "@lib/apiClient";
import { MapPin, Info, Plus, X, Download, FileSpreadsheet, FileText, Target, ShieldCheck, Activity, Search } from "lucide-react";
import dynamic from "next/dynamic";
import type { BeatMapViewProps } from "./components/BeatMapView";
import { useAuth } from "@hooks/useAuth";
import { RoleGuard } from "@components/Guards";


const BeatMapView = dynamic<BeatMapViewProps>(() => import("./components/BeatMapView"), { ssr: false });

export default function AreasPage() {
  const { user } = useAuth();
  const isReadOnly = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingBeat, setViewingBeat] = useState<any | null>(null);
  const [editingBeat, setEditingBeat] = useState<any | null>(null);
  const [inspectingBeat, setInspectingBeat] = useState<any | null>(null);
  const [assigningBeat, setAssigningBeat] = useState<any | null>(null);
  const [deployingBeat, setDeployingBeat] = useState<any | null>(null);
  const [geoVersion, setGeoVersion] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const stats = React.useMemo(() => {
    const total = beats.length;
    const withQC = beats.filter(b => b.assignedToId).length;
    const withField = beats.filter(b => b.segments?.some((s: any) => s.assignedToId)).length;
    return { total, withQC, withField };
  }, [beats]);

  const filteredBeats = React.useMemo(() => {
    if (!searchQuery) return beats;
    const q = searchQuery.toLowerCase();
    return beats.filter(b =>
      b.beatName?.toLowerCase().includes(q) ||
      b.zoneName?.toString().includes(q) ||
      b.wardName?.toString().includes(q) ||
      b.areaName?.toLowerCase().includes(q)
    );
  }, [beats, searchQuery]);

  const loadBeats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AreaBeatApi.list();
      setBeats(res.beats || []);
    } catch (err) {
      console.error("Failed to load beats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeats();
  }, [loadBeats]);

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: "32px 40px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ marginBottom: "32px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div className="breadcrumb" style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", gap: "8px", marginBottom: "8px" }}>
                <span>City Admin</span>
                <span>/</span>
                <span style={{ color: "#1e293b", fontWeight: 500 }}>Area & Beat Management</span>
              </div>
              <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Area & Beat Management
              </h1>
              <p style={{ marginTop: "8px", color: "#64748b", fontSize: "1rem" }}>
                Upload KML files and manage street-level beats across city zones.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setDownloadOpen(!downloadOpen)}
                  style={{
                    height: "48px", width: "48px", borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "white",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                  title="Download List"
                >
                  <Download size={20} color="#475569" />
                </button>
                {downloadOpen && (
                  <div style={{
                    position: "absolute", top: "56px", right: 0, backgroundColor: "white", border: "1px solid #e2e8f0",
                    borderRadius: "12px", padding: "8px", width: "180px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
                    zIndex: 50, display: "flex", flexDirection: "column", gap: "4px"
                  }}>
                    <button
                      onClick={() => { alert("Export to Excel/CSV functionality pending"); setDownloadOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px",
                        border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.875rem",
                        fontWeight: 600, color: "#475569", textAlign: "left", transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                    >
                      <FileSpreadsheet size={16} color="#10b981" />
                      Excel / CSV
                    </button>
                    <button
                      onClick={() => { alert("Export to PDF functionality pending"); setDownloadOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px",
                        border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.875rem",
                        fontWeight: 600, color: "#475569", textAlign: "left", transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                    >
                      <FileText size={16} color="#ef4444" />
                      PDF
                    </button>
                  </div>
                )}
              </div>
              {!isReadOnly && (
                <>
                  <Link
                    href="/city/areas/employee-assignments"
                    style={{ height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, padding: "0 20px", backgroundColor: "white", border: "1px solid #e2e8f0", color: "#0f172a", textDecoration: "none" }}
                  >
                    <ShieldCheck size={18} />
                    Employee Deployment
                  </Link>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary"
                    style={{ height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, padding: "0 24px" }}
                  >
                    <Plus size={18} />
                    Create Area & Beat
                  </button>
                </>
              )}
            </div>
          </div>


          {/* Stats & Search Controls */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px", alignItems: "flex-end", marginBottom: "32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {[
                { label: "Total Beats", count: stats.total, icon: Target, color: "#2563eb", bg: "#eff6ff", border: "#dbeafe" },
                { label: "Supervisors Assigned", count: stats.withQC, icon: ShieldCheck, color: "#059669", bg: "#f0fdf4", border: "#dcfce7" },
                { label: "Field Active", count: stats.withField, icon: Activity, color: "#dc2626", bg: "#fef2f2", border: "#fee2e2" },
              ].map((s, i) => (
                <div key={i} style={{
                  backgroundColor: "white", padding: "16px 20px", borderRadius: "20px", border: "1px solid #e2e8f0",
                  display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ backgroundColor: s.bg, color: s.color, width: "48px", height: "48px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${s.border}` }}>
                    <s.icon size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>{s.count}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ position: "relative" }}>
              <Search size={18} color="#94a3b8" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search beats, zones or areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", height: "52px", padding: "0 16px 0 48px", borderRadius: "18px", border: "1.5px solid #e2e8f0",
                  fontSize: "0.95rem", fontWeight: 500, outline: "none", transition: "all 0.2s",
                  backgroundColor: "white", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 4px rgba(37, 99, 235, 0.08)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.03)"; }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "32px", width: "100%" }}>
            {isModalOpen && (
              <div style={{
                position: "fixed",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px"
              }}>
                <div className="card" style={{
                  padding: 0,
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  borderRadius: "24px",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  margin: 0,
                  width: "100%",
                  maxWidth: "1000px",
                  maxHeight: "90vh",
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "white"
                }}>
                  <div style={{
                    padding: "24px 32px",
                    borderBottom: "1px solid #f1f5f9",
                    backgroundColor: "#fcfdfe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <MapPin size={20} color="#2563eb" />
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Create Area & Beat</h2>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      style={{
                        border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: "4px",
                        display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div style={{ overflowY: "auto", flex: 1, padding: "32px", backgroundColor: "#f8fafc" }}>
                    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "32px", alignItems: "start" }}>
                      <AreaForm onSuccess={() => setGeoVersion(v => v + 1)} />
                      <BeatForm onSuccess={() => { setIsModalOpen(false); loadBeats(); }} geoVersion={geoVersion} />
                    </section>
                  </div>
                </div>
              </div>
            )}

            <section>
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                  <div className="animate-spin" style={{ width: "32px", height: "32px", border: "4px solid #f3f3f3", borderTop: "4px solid #2563eb", borderRadius: "50%", margin: "0 auto" }}></div>
                  <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 600 }}>Loading beats dashboard...</p>
                </div>
              ) : (
                <BeatTable
                  beats={filteredBeats}
                  onRefresh={loadBeats}
                  onView={setViewingBeat}
                  onEdit={setEditingBeat}
                  onViewData={setInspectingBeat}
                  onAssign={setAssigningBeat}
                  onAssignEmployees={setDeployingBeat}
                  onViewUser={(beat) => setDeployingBeat(beat)}
                  assignmentActionLabel="Assign Supervisor"
                  isReadOnly={isReadOnly}
                />
              )}
            </section>
          </div>

        </div>

        {/* Modals */}
        {viewingBeat && (
          <BeatMapView
            beat={viewingBeat}
            onClose={() => setViewingBeat(null)}
            onEdit={(b: any) => { setViewingBeat(null); setEditingBeat(b); }}
            onRefresh={loadBeats}
          />
        )}

        {editingBeat && (
          <EditBeatModal
            beat={editingBeat}
            onClose={() => setEditingBeat(null)}
            onSuccess={loadBeats}
          />
        )}

        {inspectingBeat && (
          <KMLDataViewer
            beat={inspectingBeat}
            onClose={() => setInspectingBeat(null)}
          />
        )}

        {assigningBeat && (
          <AssignBeatModal
            beat={assigningBeat}
            mode="SUPERVISOR"
            onClose={() => setAssigningBeat(null)}
            onSuccess={loadBeats}
          />
        )}

        {deployingBeat && (
          <AssignBeatModal
            beat={deployingBeat}
            mode="EMPLOYEE"
            onClose={() => setDeployingBeat(null)}
            onSuccess={loadBeats}
          />
        )}

        <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </RoleGuard >
  );
}
