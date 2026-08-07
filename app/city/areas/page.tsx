"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import BeatForm from "./components/BeatForm";
import AreaForm from "./components/AreaForm";
import BeatTable from "./components/BeatTable";
import EditBeatModal from "./components/EditBeatModal";
import KMLDataViewer from "./components/KMLDataViewer";
import AssignBeatModal from "./components/AssignBeatModal";
import { AreaBeatApi, apiFetch } from "@lib/apiClient";
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

  const [areas, setAreas] = useState<any[]>([]);
  const [activeFormTab, setActiveFormTab] = useState<"area" | "beat" | null>(null);
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);

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

  const filteredAreas = React.useMemo(() => {
    if (!searchQuery) return areas;
    const q = searchQuery.toLowerCase();
    return areas.filter(a => a.name?.toLowerCase().includes(q) || a.id?.toLowerCase().includes(q));
  }, [areas, searchQuery]);

  const [pendingCount, setPendingCount] = useState(0);

  const loadBeats = useCallback(async () => {
    try {
      setLoading(true);
      const [beatsRes, pendingRes, areasRes] = await Promise.allSettled([
        AreaBeatApi.list(),
        AreaBeatApi.listPendingRequests(),
        apiFetch<{ nodes: any[] }>("/city/geo?level=AREA")
      ]);
      if (beatsRes.status === "fulfilled") {
        setBeats(beatsRes.value.beats || []);
      }
      if (pendingRes.status === "fulfilled") {
        setPendingCount(pendingRes.value.pendingBeats?.length || 0);
      }
      if (areasRes.status === "fulfilled") {
        setAreas((areasRes.value as any)?.nodes || []);
      }
    } catch (err) {
      console.error("Failed to load beats/areas", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmDeleteArea = async () => {
    if (!deleteAreaTarget || isReadOnly) return;
    setDeletingAreaId(deleteAreaTarget.id);
    try {
      await apiFetch(`/city/geo/${deleteAreaTarget.id}`, { method: "DELETE" });
      setDeleteAreaTarget(null);
      await loadBeats();
    } catch (err) {
      alert("Failed to delete area");
    } finally {
      setDeletingAreaId(null);
    }
  };

  useEffect(() => {
    loadBeats();
  }, [loadBeats]);

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: "28px 36px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ width: "100%" }}>
          {/* Header */}
          {/* Header */}
          <div style={{ marginBottom: "28px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
            <div>
              <div className="breadcrumb" style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", gap: "6px", marginBottom: "4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span>City Admin</span>
                <span>/</span>
                <span style={{ color: "#3b82f6" }}>Areas & Beats</span>
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
                Areas & Beats
              </h1>
              <p style={{ marginTop: "2px", color: "#64748b", fontSize: "0.8125rem", fontWeight: 500 }}>
                Manage street-level beats and registered city areas.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Action Buttons to Create */}
              {!isReadOnly && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setActiveFormTab("area")}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px", height: "40px", padding: "0 16px", borderRadius: "10px",
                      backgroundColor: "#3b82f6", border: "none", color: "white",
                      fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.15s",
                      boxShadow: "0 4px 12px rgba(59,130,246,0.2)"
                    }}
                  >
                    <Plus size={15} /> Create Area
                  </button>
                  <button
                    onClick={() => setActiveFormTab("beat")}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px", height: "40px", padding: "0 16px", borderRadius: "10px",
                      backgroundColor: "#2563eb", border: "none", color: "white",
                      fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.15s",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.2)"
                    }}
                  >
                    <Plus size={15} /> Create Beat
                  </button>
                </div>
              )}

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setDownloadOpen(!downloadOpen)}
                  style={{
                    height: "40px", width: "40px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                  }}
                  title="Download List"
                >
                  <Download size={16} color="#475569" />
                </button>
                {downloadOpen && (
                  <div style={{
                    position: "absolute", top: "46px", right: 0, backgroundColor: "white", border: "1px solid #e2e8f0",
                    borderRadius: "12px", padding: "8px", width: "180px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    zIndex: 50, display: "flex", flexDirection: "column", gap: "4px"
                  }}>
                    <button
                      onClick={() => { alert("Export to Excel/CSV functionality pending"); setDownloadOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.8125rem", fontWeight: 600, color: "#475569" }}
                    >
                      <FileSpreadsheet size={15} color="#10b981" /> Excel / CSV
                    </button>
                    <button
                      onClick={() => { alert("Export to PDF functionality pending"); setDownloadOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.8125rem", fontWeight: 600, color: "#475569" }}
                    >
                      <FileText size={15} color="#ef4444" /> PDF
                    </button>
                  </div>
                )}
              </div>

              {!isReadOnly && (
                <>
                  <Link
                    href="/city/beat-requests"
                    style={{
                      height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "6px",
                      fontWeight: 700, padding: "0 14px", backgroundColor: pendingCount > 0 ? "#fef3c7" : "white",
                      border: pendingCount > 0 ? "1px solid #fde68a" : "1px solid #cbd5e1", color: pendingCount > 0 ? "#b45309" : "#0f172a",
                      textDecoration: "none", fontSize: "0.8rem"
                    }}
                  >
                    <FileText size={15} />
                    <span>Beat Requests</span>
                    {pendingCount > 0 && (
                      <span style={{ backgroundColor: "#d97706", color: "white", borderRadius: "9999px", padding: "1px 6px", fontSize: "0.65rem", fontWeight: 800 }}>
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/city/areas/employee-assignments"
                    style={{ height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, padding: "0 14px", backgroundColor: "white", border: "1px solid #cbd5e1", color: "#0f172a", textDecoration: "none", fontSize: "0.8rem" }}
                  >
                    <ShieldCheck size={15} />
                    <span>Employee Deployment</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Delete Area Confirmation Modal */}
          {deleteAreaTarget && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0",
                padding: "28px", maxWidth: "420px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", marginBottom: "8px" }}>
                  Delete Area ({deleteAreaTarget.name})?
                </div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, lineHeight: 1.5, marginBottom: "20px" }}>
                  Are you sure you want to delete this area? This action cannot be undone.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setDeleteAreaTarget(null)}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteArea}
                    disabled={deletingAreaId === deleteAreaTarget.id}
                    style={{ padding: "8px 18px", borderRadius: "10px", border: "none", backgroundColor: "#dc2626", color: "white", fontSize: "0.8125rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    {deletingAreaId === deleteAreaTarget.id ? "Deleting..." : "Delete Area"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
            {[
              { label: "Total Registered Beats", count: stats.total, icon: Target, color: "#2563eb", bg: "#eff6ff", border: "#dbeafe" },
              { label: "Beats with Supervisors", count: stats.withQC, icon: ShieldCheck, color: "#059669", bg: "#f0fdf4", border: "#dcfce7" },
              { label: "Beats with Field Employees", count: stats.withField, icon: Activity, color: "#dc2626", bg: "#fef2f2", border: "#fee2e2" },
            ].map((s, i) => (
              <div key={i} style={{
                backgroundColor: "white", padding: "14px 18px", borderRadius: "16px", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
              }}>
                <div style={{ backgroundColor: s.bg, color: s.color, width: "42px", height: "42px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${s.border}` }}>
                  <s.icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>{s.count}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search Box only */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
            <div style={{ position: "relative", minWidth: "280px" }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search beats or areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px 8px 36px", borderRadius: "12px", border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem", fontWeight: 700, outline: "none", backgroundColor: "white"
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", width: "100%" }}>
            
            {/* Overlay Window Modal Form container */}
            {!isReadOnly && activeFormTab && (
              <div style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
                zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
              }}>
                <div style={{
                  backgroundColor: "white", padding: "32px", borderRadius: "24px", border: "1px solid #e2e8f0",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", position: "relative", width: "100%", maxWidth: "560px",
                  overflowY: "auto", maxHeight: "90vh"
                }}>
                  <button
                    onClick={() => setActiveFormTab(null)}
                    style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
                  >
                    <X size={20} />
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                    {activeFormTab === "area" ? <MapPin size={22} color="#2563eb" /> : <Target size={22} color="#2563eb" />}
                    <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                      {activeFormTab === "area" ? "Create New Area" : "Create New Beat"}
                    </h2>
                  </div>
                  <div>
                    {activeFormTab === "area" && <AreaForm onSuccess={() => { setGeoVersion(v => v + 1); setActiveFormTab(null); }} />}
                    {activeFormTab === "beat" && <BeatForm onSuccess={() => { loadBeats(); setActiveFormTab(null); }} geoVersion={geoVersion} />}
                  </div>
                </div>
              </div>
            )}

            <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
                  <div className="animate-spin" style={{ width: "32px", height: "32px", border: "4px solid #f3f3f3", borderTop: "4px solid #2563eb", borderRadius: "50%", margin: "0 auto" }}></div>
                  <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 600 }}>Loading data...</p>
                </div>
              ) : (
                <>
                {/* Registered Areas Table */}
                <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe" }}>

                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Registered Areas ({filteredAreas.length})
                    </h3>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <tr>
                          <th style={{ padding: "12px 16px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", width: "5%" }}>Sr No</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", width: "35%" }}>Area Name</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", width: "30%" }}>City Name</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", width: "20%" }}>Created On</th>
                          <th style={{ padding: "12px 16px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", width: "10%" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAreas.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>No matching areas found.</td>
                          </tr>
                        ) : (
                          filteredAreas.map((a, idx) => {
                            const createdDate = a.createdAt
                              ? new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '06 Aug 2026';
                            const createdTime = a.createdAt
                              ? new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                              : '12:36 PM';

                            return (
                              <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "14px 16px", fontSize: "0.8125rem", fontWeight: 800, color: "#64748b" }}>
                                  {idx + 1}
                                </td>
                                <td style={{ padding: "14px 16px", fontSize: "0.875rem", fontWeight: 800, color: "#0f172a" }}>
                                  {a.name}
                                </td>
                                <td style={{ padding: "14px 16px", fontSize: "0.8125rem", fontWeight: 700, color: "#334155" }}>
                                  {user?.city?.name || "Indore"}
                                </td>
                                <td style={{ padding: "14px 16px" }}>
                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1e293b" }}>{createdDate}</span>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8" }}>{createdTime}</span>
                                  </div>
                                </td>
                                <td style={{ padding: "14px 16px", textAlign: "right", position: "relative" }}>
                                  {!isReadOnly && (
                                    <div className="group relative inline-block text-left">
                                      <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                      </button>
                                      <div className="hidden group-hover:flex absolute right-0 top-full mt-1 w-32 flex-col rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
                                        <button
                                          onClick={() => alert("Edit functionality pending")}
                                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition w-full text-left"
                                        >
                                          Edit Area
                                        </button>
                                        <button
                                          onClick={() => setDeleteAreaTarget({ id: a.id, name: a.name })}
                                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition w-full text-left"
                                        >
                                          Delete Area
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Street Beats Table */}
                <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", marginTop: "16px" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe" }}>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Street Beats ({filteredBeats.length})
                    </h3>
                  </div>
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
                </div>
                </>
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
