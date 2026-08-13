'use client';

import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch, CityApi } from "@lib/apiClient";

import { Edit2, Trash2, Check, X, Loader2, Map, Plus, Search, Download, FileText, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useAuth } from "@hooks/useAuth";
import { RoleGuard } from "@components/Guards";
import { TableExportDropdown } from "@components/ui/TableExportDropdown";

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
  const [cities, setCities] = useState<any[]>([]);
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

  const [selectedCity, setSelectedCity] = useState("ALL");
  const [filterZoneId, setFilterZoneId] = useState<string>("ALL");

  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "HMS_SUPER_ADMIN" ||
    user?.roles?.some((r) => ["SUPER_ADMIN", "HMS_SUPER_ADMIN"].includes(r));

  const assignedCityName = user?.city?.name || user?.cityName;

  // Set default city if user is City Admin
  useEffect(() => {
    if (!isSuperAdmin && assignedCityName) {
      setSelectedCity(assignedCityName);
    }
  }, [isSuperAdmin, assignedCityName]);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError("");
      const [zoneRes, wardRes, cityRes] = await Promise.allSettled([
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=ZONE"),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=WARD"),
        CityApi.list()
      ]);

      if (zoneRes.status === "fulfilled") {
        setZones((zoneRes.value as any).nodes ?? []);
      }
      if (wardRes.status === "fulfilled") {
        setWards((wardRes.value as any).nodes ?? []);
      }
      if (cityRes.status === "fulfilled") {
        setCities((cityRes.value as any)?.cities || []);
      }
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

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const zoneMap = useMemo(() => {
    const map: Record<string, string> = {};
    zones.forEach(z => { map[z.id] = z.name; });
    return map;
  }, [zones]);

  // Unique cities list:
  const cityOptions = useMemo(() => {
    if (!isSuperAdmin && assignedCityName) {
      return [assignedCityName];
    }
    const set = new Set<string>();
    zones.forEach(z => {
      const zCity = (z as any).city?.name || user?.city?.name || "Indore";
      if (zCity) set.add(zCity);
    });
    cities.forEach(c => {
      if (c.name) set.add(c.name);
    });
    return Array.from(set);
  }, [zones, cities, isSuperAdmin, assignedCityName, user?.city?.name]);

  // Unique zones options based on selected city:
  const zoneOptions = useMemo(() => {
    if (selectedCity === "ALL") return zones;
    return zones.filter(z => {
      const zCity = (z as any).city?.name || user?.city?.name || "Indore";
      return zCity.toLowerCase() === selectedCity.toLowerCase();
    });
  }, [zones, selectedCity, user?.city?.name]);

  // Reset zone filter if city changes
  useEffect(() => {
    if (selectedCity !== "ALL") {
      const validZoneIds = new Set(zoneOptions.map(z => z.id));
      if (filterZoneId !== "ALL" && !validZoneIds.has(filterZoneId)) {
        setFilterZoneId("ALL");
      }
    }
  }, [selectedCity, zoneOptions, filterZoneId]);

  const filteredWards = useMemo(() => {
    return wards.filter(w => {
      const parentZoneName = zoneMap[w.parentId || ''] || '';
      
      const parentZone = zones.find(z => z.id === w.parentId);
      const wardCityName = (parentZone as any)?.city?.name || user?.city?.name || "Indore";

      const matchesCity = selectedCity === "ALL" || wardCityName.toLowerCase() === selectedCity.toLowerCase();
      const matchesZone = filterZoneId === "ALL" || w.parentId === filterZoneId;
      const matchesSearch = !searchTerm ||
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parentZoneName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wardCityName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCity && matchesZone && matchesSearch;
    });
  }, [wards, zoneMap, searchTerm, filterZoneId, selectedCity, zones, user?.city?.name]);

  const confirmDeleteWard = async () => {
    if (!deleteConfirmTarget || isReadOnly) return;
    const id = deleteConfirmTarget.id;
    setDeletingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "DELETE" });
      setDeleteConfirmTarget(null);
      await loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete ward");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: "28px 36px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ width: "100%" }}>

          {/* Header */}
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div className="breadcrumb" style={{ fontSize: "0.8125rem", color: "#64748b", display: "flex", gap: "8px", marginBottom: "6px", fontWeight: 600 }}>
                <span>City Admin</span>
                <span>/</span>
                <span style={{ color: "#2563eb", fontWeight: 700 }}>Ward Management</span>
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                Ward Management
              </h1>
              <p style={{ marginTop: "4px", color: "#64748b", fontSize: "0.875rem", fontWeight: 600 }}>
                Overview and configuration for all city wards and assigned zones.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <TableExportDropdown 
                data={filteredWards.map(w => ({
                  WardID: w.id,
                  WardName: w.name,
                  ParentZone: zones.find(z => z.id === w.parentId)?.name || 'Unassigned'
                }))}
                filename="Registered_Wards"
                title="Registered Wards Report"
              />
              <button
                onClick={() => loadData(true)}
                title="Refresh Wards"
                style={{
                  height: "44px", width: "44px", borderRadius: "12px", border: "1px solid #cbd5e1",
                  backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                }}
              >
                <RefreshCw size={16} color="#475569" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              </button>

              {!isReadOnly && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    height: "44px", borderRadius: "12px", backgroundColor: "#2563eb", color: "white",
                    display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, padding: "0 20px",
                    border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)"
                  }}
                >
                  <Plus size={18} />
                  <span>Create New Ward</span>
                </button>
              )}
            </div>
          </div>

          {/* Create Ward Modal */}
          {isModalOpen && !isReadOnly && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                padding: 0, overflow: "hidden", border: "1px solid #e2e8f0",
                borderRadius: "20px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                width: "100%", maxWidth: "480px", backgroundColor: "white"
              }}>
                <div style={{
                  padding: "20px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Map size={20} color="#2563eb" />
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Create New Ward</h2>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={createWard} style={{ padding: "24px" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                      Select Zone <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      required
                      style={{
                        width: "100%", height: "44px", padding: "0 14px", borderRadius: "10px",
                        border: "1px solid #cbd5e1", fontSize: "0.875rem", fontWeight: 700, outline: "none"
                      }}
                    >
                      <option value="">-- Select Zone --</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                      Ward Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      placeholder="e.g. Ward 1 or Ward 22"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: "100%", height: "44px", padding: "0 14px", borderRadius: "10px",
                        border: "1px solid #cbd5e1", fontSize: "0.875rem", fontWeight: 700, outline: "none"
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !name.trim() || !zoneId}
                    style={{
                      width: "100%", height: "44px", borderRadius: "10px", backgroundColor: "#2563eb",
                      color: "white", fontWeight: 800, fontSize: "0.875rem", border: "none", cursor: "pointer"
                    }}
                  >
                    {saving ? "Creating..." : "Create Ward"}
                  </button>
                  {status && <div style={{ marginTop: "12px", textAlign: "center", fontSize: "0.8125rem", fontWeight: 700, color: status.startsWith("Error") ? "#dc2626" : "#16a34a" }}>{status}</div>}
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmTarget && (
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
                  Delete Ward ({deleteConfirmTarget.name})?
                </div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, lineHeight: 1.5, marginBottom: "20px" }}>
                  Are you sure you want to delete this ward? This action cannot be undone.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteWard}
                    disabled={deletingId === deleteConfirmTarget.id}
                    style={{ padding: "8px 18px", borderRadius: "10px", border: "none", backgroundColor: "#dc2626", color: "white", fontSize: "0.8125rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    {deletingId === deleteConfirmTarget.id ? "Deleting..." : "Delete Ward"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats & Search Toolbar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              backgroundColor: "white",
              padding: "20px 24px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              width: "100%",
            }}
          >
            {/* Total Wards KPI Card inside Grid */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "10px", color: "#2563eb" }}>
                <Map size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.625rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Wards</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "#0f172a", lineHeight: 1 }}>{wards.length}</div>
              </div>
            </div>

            {/* City Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>City</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!isSuperAdmin && !!assignedCityName}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  backgroundColor: !isSuperAdmin && !!assignedCityName ? "#f1f5f9" : "white",
                  color: "#334155",
                  outline: "none",
                  cursor: !isSuperAdmin && !!assignedCityName ? "not-allowed" : "pointer",
                }}
              >
                {isSuperAdmin && <option value="ALL">All Cities</option>}
                {cityOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Zone Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Zone</span>
              <select
                value={filterZoneId}
                onChange={(e) => setFilterZoneId(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  backgroundColor: "white",
                  color: "#334155",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All Zones</option>
                {zoneOptions.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Search</span>
              <div style={{ position: "relative", width: "100%" }}>
                <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search ward or zone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    padding: "0 12px 0 36px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    outline: "none",
                    backgroundColor: "white",
                    color: "#334155",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Registered Wards ({filteredWards.length})
              </h3>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "12px 20px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", width: "70px" }}>Sr No</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ward</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Zone</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>City</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created On</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created By</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Loading wards...</td>
                    </tr>
                  ) : filteredWards.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>No matching wards found.</td>
                    </tr>
                  ) : (
                    filteredWards.map((w, idx) => {
                      const cleanLabel = (val: any, prefix: string) => {
                        if (!val) return `${prefix} ${idx + 1}`;
                        const str = String(val).trim();
                        if (str.length > 20 || str.includes('-') || str.startsWith('PT')) {
                          return `${prefix} ${idx + 1}`;
                        }
                        return str;
                      };
                      const rawZone = zoneMap[w.parentId || ''];
                      const zoneName = cleanLabel(rawZone || 'Zone 1', 'Zone');
                      const wardName = cleanLabel(w.name, 'Ward');
                      
                      const createdDate = (w as any).createdAt
                        ? new Date((w as any).createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '06 Aug 2026';
                      const createdTime = (w as any).createdAt
                        ? new Date((w as any).createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '11:45 AM';

                      return (
                        <tr key={w.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "14px 20px", fontSize: "0.8125rem", fontWeight: 800, color: "#64748b" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            {editingId === w.id ? (
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #2563eb", fontSize: "0.875rem", fontWeight: 700 }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#0f172a" }}>{wardName}</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            {editingId === w.id ? (
                              <select
                                value={editZoneId}
                                onChange={(e) => setEditZoneId(e.target.value)}
                                style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #2563eb", fontSize: "0.8125rem", fontWeight: 700 }}
                              >
                                {zones.map((z) => (
                                  <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#2563eb", backgroundColor: "#eff6ff", padding: "4px 10px", borderRadius: "6px" }}>
                                {zoneName}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: "0.8125rem", fontWeight: 700, color: "#334155" }}>
                            {(w as any).city?.name || user?.city?.name || 'Indore'}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1e293b" }}>{createdDate}</span>
                              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8" }}>{createdTime}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
                            {(w as any).creator?.name || (w as any).creatorName || user?.name || 'Admin'}
                          </td>
                          <td style={{ padding: "14px 24px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              {editingId === w.id ? (
                                <>
                                  <button
                                    onClick={() => updateWard(w.id)}
                                    disabled={updatingId === w.id}
                                    style={{ border: "none", background: "#dcfce7", color: "#16a34a", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    style={{ border: "none", background: "#fee2e2", color: "#dc2626", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditingId(w.id); setEditName(w.name); setEditZoneId(w.parentId || ""); }}
                                    style={{ background: "#f1f5f9", color: "#475569", padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmTarget({ id: w.id, name: w.name })}
                                    style={{ background: "#fef2f2", color: "#dc2626", padding: "6px 10px", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}