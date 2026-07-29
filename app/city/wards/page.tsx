'use client';

import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@lib/apiClient";

import { Edit2, Trash2, Check, X, Loader2, Map, Plus, Search, Download, FileText, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useAuth } from "@hooks/useAuth";
import { RoleGuard } from "@components/Guards";

type GeoNode = { id: string; name: string; parentId?: string };

export default function WardManagementPage() {
  const { user } = useAuth();
  const isReadOnly = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editZoneId, setEditZoneId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError("");
      const [zoneRes, wardRes] = await Promise.all([
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=ZONE"),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=WARD")
      ]);
      setZones((zoneRes as any).nodes ?? []);
      setWards((wardRes as any).nodes ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load zones/wards";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const createWard = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || !zoneId) return;
    if (wards.some(w => w.name.toLowerCase() === cleanName.toLowerCase() && w.parentId === zoneId)) {
      setStatus("Error: This ward already exists in the selected zone!");
      return;
    }
    setSaving(true); setStatus("Saving...");
    try {
      await apiFetch("/city/geo", { method: "POST", body: JSON.stringify({ name, level: "WARD", parentId: zoneId }) });
      setStatus("Ward created successfully");
      setIsModalOpen(false); setName(""); setZoneId("");
      await loadData();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to create ward");
    } finally { setSaving(false); }
  };

  const updateWard = async (id: string) => {
    if (isReadOnly || !editName.trim() || !editZoneId) return;
    setUpdatingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "PATCH", body: JSON.stringify({ name: editName, parentId: editZoneId }) });
      setEditingId(null);
      await loadData();
    } catch (err) { alert(err instanceof ApiError ? err.message : "Failed to update ward"); }
    finally { setUpdatingId(null); }
  };

  const deleteWard = async (id: string) => {
    if (isReadOnly) return;
    if (!confirm("Are you sure you want to delete this ward and all areas/beats under it?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) { alert(err instanceof ApiError ? err.message : "Failed to delete ward"); }
    finally { setDeletingId(null); }
  };

  const groupedWards = useMemo(() => {
    const map: Record<string, GeoNode[]> = {};
    wards.forEach((w) => {
      if (!w.parentId) return;
      map[w.parentId] = map[w.parentId] || [];
      map[w.parentId].push(w);
    });
    return map;
  }, [wards]);

  const filteredZones = useMemo(() => {
    if (!searchTerm) return zones;
    return zones.filter(z => {
      const zoneMatches = z.name.toLowerCase().includes(searchTerm.toLowerCase()) || z.id.toLowerCase().includes(searchTerm.toLowerCase());
      const wardMatches = (groupedWards[z.id] || []).some(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return zoneMatches || wardMatches;
    });
  }, [zones, groupedWards, searchTerm]);

  const statCard = (label: string, value: number, iconBg: string, iconColor: string) => (
    <div style={{
      backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0",
      padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)", minWidth: "140px"
    }}>
      <div style={{ backgroundColor: iconBg, padding: "10px", borderRadius: "12px", display: "flex" }}>
        <Map size={18} color={iconColor} />
      </div>
      <div>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  );

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: "0", backgroundColor: "#f8fafc", minHeight: "100vh" }}>

        {/* ── Page Hero ── */}
        <div style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          borderBottom: "1px solid #e2e8f0",
          padding: "28px 40px 24px",
        }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", gap: "6px", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontWeight: 600 }}>City Admin</span>
              <span style={{ color: "#cbd5e1" }}>/</span>
              <span style={{ color: "#475569", fontWeight: 600 }}>Ward Management</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h1 style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
                  Ward Management
                </h1>
                <p style={{ marginTop: "4px", color: "#64748b", fontSize: "0.875rem" }}>
                  {loading ? "Loading..." : `${zones.length} zone${zones.length !== 1 ? "s" : ""} · ${wards.length} ward${wards.length !== 1 ? "s" : ""} registered`}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Refresh */}
                <button
                  onClick={() => loadData(true)}
                  title="Refresh"
                  style={{
                    height: "42px", width: "42px", borderRadius: "10px", border: "1px solid #e2e8f0",
                    backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "white"; }}
                >
                  <RefreshCw size={16} color="#475569" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                </button>

                {/* Download */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setDownloadOpen(!downloadOpen)}
                    title="Export"
                    style={{
                      height: "42px", width: "42px", borderRadius: "10px", border: "1px solid #e2e8f0",
                      backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", transition: "all 0.2s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "white"; }}
                  >
                    <Download size={16} color="#475569" />
                  </button>
                  {downloadOpen && (
                    <div style={{
                      position: "absolute", top: "50px", right: 0, backgroundColor: "white", border: "1px solid #e2e8f0",
                      borderRadius: "12px", padding: "6px", width: "170px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.08)", zIndex: 50, display: "flex", flexDirection: "column", gap: "2px"
                    }}>
                      {[
                        { label: "Excel / CSV", icon: <FileSpreadsheet size={15} color="#10b981" />, action: () => { alert("Export to Excel/CSV pending"); setDownloadOpen(false); } },
                        { label: "PDF", icon: <FileText size={15} color="#ef4444" />, action: () => { alert("Export to PDF pending"); setDownloadOpen(false); } }
                      ].map(item => (
                        <button key={item.label} onClick={item.action} style={{
                          display: "flex", alignItems: "center", gap: "9px", width: "100%", padding: "9px 11px",
                          border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px",
                          fontSize: "0.85rem", fontWeight: 600, color: "#475569", textAlign: "left", transition: "all 0.15s"
                        }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                        >
                          {item.icon}{item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Create Ward */}
                {!isReadOnly && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary"
                    style={{ height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "7px", fontWeight: 700, padding: "0 20px", fontSize: "0.875rem" }}
                  >
                    <Plus size={16} />
                    Create Ward
                  </button>
                )}

                {/* Read-only notice */}
                {isReadOnly && (
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 700, color: "#2563eb",
                    backgroundColor: "#eff6ff", padding: "6px 14px",
                    borderRadius: "20px", border: "1px solid #bfdbfe"
                  }}>View Only</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "28px 40px", maxWidth: "1280px", margin: "0 auto" }}>

          {/* Stat Cards */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
            {statCard("Total Wards", wards.length, "#eff6ff", "#2563eb")}
            {statCard("Total Zones", zones.length, "#f0fdf4", "#16a34a")}
          </div>

          {/* Search + toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "420px" }}>
              <Search size={15} color="#94a3b8" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Search zone or ward..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px 10px 37px", borderRadius: "10px",
                  border: "1px solid #e2e8f0", fontSize: "0.875rem", outline: "none",
                  backgroundColor: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", transition: "border-color 0.2s, box-shadow 0.2s"
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; }}
              />
            </div>
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} style={{ fontSize: "0.8rem", color: "#64748b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Clear
              </button>
            )}
            <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>
              {filteredZones.length} zone{filteredZones.length !== 1 ? "s" : ""} shown
            </div>
          </div>

          {/* Divider label */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              Zones &amp; Wards
            </span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#e2e8f0" }} />
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding: "80px 24px", textAlign: "center", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <Loader2 size={28} color="#2563eb" style={{ margin: "0 auto", display: "block", animation: "spin 1s linear infinite" }} />
              <p style={{ marginTop: "14px", color: "#64748b", fontWeight: 600, fontSize: "0.9rem" }}>Loading city data…</p>
            </div>
          )}

          {error && <div className="alert error" style={{ borderRadius: "12px" }}>{error}</div>}

          {/* Empty state */}
          {!loading && !error && filteredZones.length === 0 && (
            <div style={{ padding: "80px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ padding: "18px", backgroundColor: "#f8fafc", borderRadius: "50%", border: "1px solid #e2e8f0" }}>
                <Search size={32} color="#cbd5e1" />
              </div>
              <div>
                <div style={{ color: "#0f172a", fontWeight: 800, fontSize: "1rem" }}>No results found</div>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "4px" }}>
                  {searchTerm ? `No zones or wards match "${searchTerm}"` : "No zones have been added yet."}
                </div>
              </div>
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} style={{ fontSize: "0.82rem", color: "#2563eb", background: "none", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Zone cards */}
          {!loading && !error && filteredZones.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredZones.map((z, zIdx) => {
                const zoneWards = groupedWards[z.id] || [];
                return (
                  <div key={z.id} style={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    borderLeft: "4px solid #2563eb"
                  }}>
                    {/* Zone Header */}
                    <div style={{
                      padding: "14px 20px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      backgroundColor: "#fafbfc", borderBottom: zoneWards.length > 0 ? "1px solid #f1f5f9" : "none"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ backgroundColor: "#eff6ff", padding: "9px", borderRadius: "10px", border: "1px solid #dbeafe", display: "flex" }}>
                          <Map size={18} color="#2563eb" />
                        </div>
                        <div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>{z.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                            <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontFamily: "monospace", backgroundColor: "#f1f5f9", padding: "1px 7px", borderRadius: "5px" }}>
                              ID: {z.id.slice(0, 10)}…
                            </span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(z.id); }}
                              style={{ border: "none", background: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.6rem", fontWeight: 800, padding: 0, letterSpacing: "0.03em" }}
                            >COPY</button>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 700,
                          color: zoneWards.length === 0 ? "#94a3b8" : "#2563eb",
                          backgroundColor: zoneWards.length === 0 ? "#f8fafc" : "#eff6ff",
                          padding: "4px 12px", borderRadius: "20px",
                          border: `1px solid ${zoneWards.length === 0 ? "#e2e8f0" : "#bfdbfe"}`
                        }}>
                          {zoneWards.length} {zoneWards.length === 1 ? "Ward" : "Wards"}
                        </span>
                      </div>
                    </div>

                    {/* Ward Table */}
                    {zoneWards.length === 0 ? (
                      <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem", fontStyle: "italic" }}>
                        No wards assigned to this zone yet.
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                              <th style={{ padding: "12px 20px", fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left", width: "70px" }}>#</th>
                              <th style={{ padding: "12px 20px", fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left" }}>Ward Name</th>
                              <th style={{ padding: "12px 20px", fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right", width: "150px" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {zoneWards.map((w, wIdx) => (
                              <tr
                                key={w.id}
                                style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.12s" }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#fafbff"; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                              >
                                {/* Index */}
                                <td style={{ padding: "12px 20px", verticalAlign: "middle", width: "70px" }}>
                                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#64748b" }}>
                                    {wIdx + 1}
                                  </div>
                                </td>

                                {/* Name / edit */}
                                <td style={{ padding: "12px 20px", verticalAlign: "middle" }}>
                                  {editingId === w.id ? (
                                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                      <input
                                        className="input"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        style={{ margin: 0, padding: "8px 12px", fontSize: "0.875rem", height: "36px", flex: 1, borderRadius: "8px" }}
                                        autoFocus
                                      />
                                      <select
                                        className="input"
                                        value={editZoneId}
                                        onChange={e => setEditZoneId(e.target.value)}
                                        style={{ margin: 0, padding: "8px 10px", fontSize: "0.875rem", height: "36px", width: "130px", borderRadius: "8px" }}
                                      >
                                        {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                                      </select>
                                    </div>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>{w.name}</span>
                                      <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontFamily: "monospace", marginTop: "2px" }}>ID: {w.id.slice(0, 14)}…</span>
                                    </div>
                                  )}
                                </td>

                                {/* Actions */}
                                <td style={{ padding: "12px 20px", verticalAlign: "middle" }}>
                                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                    {isReadOnly ? (
                                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#2563eb", backgroundColor: "#eff6ff", padding: "4px 10px", borderRadius: "20px", border: "1px solid #bfdbfe" }}>
                                        View Only
                                      </span>
                                    ) : editingId === w.id ? (
                                      <>
                                        <button onClick={() => updateWard(w.id)} disabled={updatingId === w.id}
                                          style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", padding: "7px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                          {updatingId === w.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                        </button>
                                        <button onClick={() => setEditingId(null)}
                                          style={{ border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", padding: "7px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                          <X size={15} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => { setEditingId(w.id); setEditName(w.name); setEditZoneId(z.id); }}
                                          style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", padding: "7px", borderRadius: "8px", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center" }}
                                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                                          title="Edit ward"
                                        >
                                          <Edit2 size={15} />
                                        </button>
                                        <button
                                          onClick={() => deleteWard(w.id)}
                                          disabled={deletingId === w.id}
                                          style={{ border: "1px solid #fee2e2", background: "#fff5f5", color: "#f87171", padding: "7px", borderRadius: "8px", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center" }}
                                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fecaca"; }}
                                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#fff5f5"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#fee2e2"; }}
                                          title="Delete ward"
                                        >
                                          {deletingId === w.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Create Ward Modal ── */}
        {isModalOpen && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)",
            zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
          }}>
            <div style={{
              backgroundColor: "white", borderRadius: "20px", width: "100%", maxWidth: "480px",
              overflow: "hidden", boxShadow: "0 24px 48px rgba(0,0,0,0.18)", border: "1px solid #e2e8f0"
            }}>
              {/* Modal header */}
              <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fafbfc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
                    <Map size={18} color="#2563eb" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>Create New Ward</h2>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>Add a ward to an existing zone</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: "4px", borderRadius: "8px", transition: "all 0.15s", display: "flex" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>
                  <X size={19} />
                </button>
              </div>

              {/* Modal form */}
              <form onSubmit={createWard} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div className="field">
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "7px" }}>
                    Select Zone <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select className="input" value={zoneId} onChange={e => setZoneId(e.target.value)} required disabled={zones.length === 0} style={{ height: "44px" }}>
                    <option value="">Choose a zone…</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "7px" }}>
                    Ward Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input className="input" placeholder="e.g. Ward 12" value={name} onChange={e => setName(e.target.value)} required style={{ height: "44px" }} />
                </div>
                {status && (
                  <div style={{ fontSize: "0.82rem", textAlign: "center", color: status.startsWith("Error") ? "#dc2626" : "#16a34a", padding: "8px 12px", borderRadius: "8px", backgroundColor: status.startsWith("Error") ? "#fff5f5" : "#f0fdf4", border: `1px solid ${status.startsWith("Error") ? "#fecaca" : "#bbf7d0"}` }}>
                    {status}
                  </div>
                )}
                <button className="btn btn-primary" type="submit" disabled={!name.trim() || !zoneId || saving} style={{ height: "44px", borderRadius: "10px", fontWeight: 700, fontSize: "0.9rem" }}>
                  {saving ? "Creating…" : "Create Ward"}
                </button>
              </form>
            </div>
          </div>
        )}

        <style jsx>{`
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </RoleGuard>
  );
}