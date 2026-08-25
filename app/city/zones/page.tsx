'use client';

import { useEffect, useMemo, useState } from "react";
import React from "react";
import { ApiError, apiFetch } from "@lib/apiClient";
import { Compass, Plus, Search, Check, X, Loader2, Download, FileSpreadsheet, FileText, Trash2, Edit2, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle } from "lucide-react";
import { RoleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import { TableExportDropdown } from "@components/ui/TableExportDropdown";

type GeoNode = { id: string; name: string; createdAt?: string };

export default function ZoneManagementPage() {
  const { user } = useAuth();
  const isReadOnly = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));

  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<GeoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* =========================================================
     PAGINATION & BULK SELECTION
  ========================================================= */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editConfirmTarget, setEditConfirmTarget] = useState<string | null>(null);

  const filteredZones = useMemo(() => {
    return zones.filter(z =>
      z.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      z.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [zones, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredZones.length / pageSize) || 1;
  const paginatedZones = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredZones.slice(start, start + pageSize);
  }, [filteredZones, currentPage, pageSize]);

  const isAllCurrentPageSelected =
    paginatedZones.length > 0 &&
    paginatedZones.every((z) => selectedZoneIds.includes(z.id));

  const toggleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedZones.map((z) => z.id);
      setSelectedZoneIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIdSet = new Set(paginatedZones.map((z) => z.id));
      setSelectedZoneIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    }
  };

  const toggleSelectZone = (id: string) => {
    setSelectedZoneIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const loadZones = async () => {
    try {
      setLoading(true);
      setError("");
      const userCityId = user?.city?.id || (user as any)?.cityId;
      const url = userCityId ? `/city/geo?level=ZONE&cityId=${userCityId}` : "/city/geo?level=ZONE";
      const data = await apiFetch<{ nodes: GeoNode[] }>(url);
      setZones((data as any).nodes ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load zones";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, [user?.city?.id]);

  const createZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const cleanName = name.trim();
    if (!cleanName) return;

    if (zones.some(z => z.name.toLowerCase() === cleanName.toLowerCase())) {
      setStatus("Error: This zone already exists!");
      return;
    }

    setSaving(true);
    setStatus("Saving...");
    try {
      await apiFetch("/city/geo", { method: "POST", body: JSON.stringify({ name, level: "ZONE" }) });
      setStatus("Zone created successfully");
      setIsModalOpen(false);
      setName("");
      await loadZones();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create zone";
      setStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateZone = async (id: string) => {
    if (isReadOnly || !editName.trim()) return;
    setUpdatingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "PATCH", body: JSON.stringify({ name: editName }) });
      setEditingId(null);
      await loadZones();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update zone");
    } finally {
      setUpdatingId(null);
    }
  };

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteZone = async () => {
    if (!deleteConfirmTarget || isReadOnly) return;
    const id = deleteConfirmTarget.id;
    setDeletingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "DELETE" });
      setDeleteConfirmTarget(null);
      setSelectedZoneIds((prev) => prev.filter((item) => item !== id));
      await loadZones();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete zone");
    } finally {
      setDeletingId(null);
    }
  };

  const confirmBulkDeleteZones = async () => {
    if (selectedZoneIds.length === 0 || isReadOnly) return;
    setBulkDeleting(true);
    try {
      for (const id of selectedZoneIds) {
        await apiFetch(`/city/geo/${id}`, { method: "DELETE" }).catch((err) => console.error(err));
      }
      setSelectedZoneIds([]);
      setShowBulkDeleteConfirm(false);
      await loadZones();
    } catch (err) {
      alert("Failed to delete some selected zones");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page p-3 sm:p-6 lg:p-8" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ width: "100%" }}>

          {/* Header Section */}
          <div
            style={{
              marginBottom: "28px",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "16px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  display: "flex",
                  gap: "6px",
                  marginBottom: "4px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>City Admin</span>
                <span>/</span>
                <span style={{ color: "#3b82f6" }}>Zones</span>
              </div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Zone Management
              </h1>
              <p
                style={{
                  marginTop: "2px",
                  color: "#64748b",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                Manage and review primary geographic zones across the city.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {selectedZoneIds.length > 0 && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "40px",
                    padding: "0 16px",
                    borderRadius: "10px",
                    backgroundColor: "#fee2e2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    fontWeight: 800,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <Trash2 size={15} />
                  <span>Delete Selected ({selectedZoneIds.length})</span>
                </button>
              )}
              <TableExportDropdown 
                data={filteredZones.map(z => ({ ZoneID: z.id, ZoneName: z.name, CreatedAt: z.createdAt || '-' }))}
                filename="Registered_Zones"
                title="Registered Zones Report"
              />
              {!isReadOnly && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "40px",
                    padding: "0 16px",
                    borderRadius: "10px",
                    backgroundColor: "#3b82f6",
                    border: "none",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: "0 4px 12px rgba(59,130,246,0.2)"
                  }}
                >
                  <Plus size={15} />
                  <span>Create New Zone</span>
                </button>
              )}
            </div>
          </div>

          {/* Create Zone Modal */}
          {isModalOpen && !isReadOnly && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px"
            }}>
              <div style={{
                padding: 0, overflow: "hidden", border: "1px solid #e2e8f0",
                borderRadius: "20px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                width: "100%", maxWidth: "480px", maxHeight: "calc(100vh - 32px)", overflowY: "auto", backgroundColor: "white"
              }}>
                <div style={{
                  padding: "20px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Compass size={20} color="#2563eb" />
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Create New Zone</h2>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={createZone} style={{ padding: "24px" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                      Zone Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      placeholder="e.g. Zone 1 or Central Zone"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: "100%", height: "42px", padding: "0 14px", borderRadius: "10px",
                        border: "1px solid #cbd5e1", fontSize: "0.875rem", fontWeight: 700, outline: "none"
                      }}
                    />
                  </div>
                  {status && (
                    <div style={{
                      marginBottom: "16px", padding: "10px 14px", borderRadius: "8px",
                      fontSize: "0.8125rem", fontWeight: 700, textAlign: "center",
                      backgroundColor: status.startsWith("Error") ? "#fef2f2" : "#f0fdf4",
                      color: status.startsWith("Error") ? "#dc2626" : "#16a34a",
                      border: status.startsWith("Error") ? "1px solid #fecaca" : "1px solid #bbf7d0"
                    }}>
                      {status}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      style={{
                        padding: "10px 18px", borderRadius: "10px", border: "1px solid #cbd5e1",
                        backgroundColor: "white", color: "#475569", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !name.trim()}
                      style={{
                        padding: "10px 22px", borderRadius: "10px", border: "none",
                        backgroundColor: "#2563eb", color: "white", fontSize: "0.875rem", fontWeight: 800, cursor: "pointer"
                      }}
                    >
                      {saving ? "Creating..." : "Create Zone"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Single Confirmation Modal */}
          {deleteConfirmTarget && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0",
                padding: "28px", maxWidth: "420px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                textAlign: "center"
              }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Trash2 size={24} />
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", marginBottom: "8px" }}>
                  Delete Zone ({deleteConfirmTarget.name})?
                </div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, lineHeight: 1.5, marginBottom: "20px" }}>
                  Are you sure you want to delete this zone? This action cannot be undone and will remove all associated wards and areas under it.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteZone}
                    disabled={deletingId === deleteConfirmTarget.id}
                    style={{ padding: "8px 18px", borderRadius: "10px", border: "none", backgroundColor: "#dc2626", color: "white", fontSize: "0.8125rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    {deletingId === deleteConfirmTarget.id ? "Deleting..." : "Yes, Delete Zone"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Delete Confirmation Modal */}
          {showBulkDeleteConfirm && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0",
                padding: "28px", maxWidth: "420px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                textAlign: "center"
              }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Trash2 size={24} />
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", marginBottom: "8px" }}>
                  Delete Multiple Zones?
                </div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, lineHeight: 1.5, marginBottom: "20px" }}>
                  Are you sure you want to delete <strong>{selectedZoneIds.length} selected zones</strong> and their associated wards? This action cannot be undone.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmBulkDeleteZones}
                    disabled={bulkDeleting}
                    style={{ padding: "8px 18px", borderRadius: "10px", border: "none", backgroundColor: "#dc2626", color: "white", fontSize: "0.8125rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    {bulkDeleting ? "Deleting..." : `Yes, Delete ${selectedZoneIds.length}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Confirmation Modal */}
          {editConfirmTarget && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0",
                padding: "28px", maxWidth: "420px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                textAlign: "center"
              }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <AlertTriangle size={24} />
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", marginBottom: "8px" }}>
                  Confirm Zone Changes
                </div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, lineHeight: 1.5, marginBottom: "20px" }}>
                  Are you sure you want to save the modifications to this zone?
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setEditConfirmTarget(null)}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const id = editConfirmTarget;
                      setEditConfirmTarget(null);
                      await updateZone(id);
                    }}
                    style={{ padding: "8px 18px", borderRadius: "10px", border: "none", backgroundColor: "#2563eb", color: "white", fontSize: "0.8125rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    Yes, Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats & Search Toolbar */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-stretch sm:items-center gap-3 sm:gap-4 mb-5">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ backgroundColor: "white", padding: "10px 16px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={{ backgroundColor: "#eff6ff", padding: "6px", borderRadius: "8px", color: "#2563eb" }}>
                  <Compass size={16} />
                </div>
                <div>
                  <div style={{ fontSize: "0.625rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Total Zones</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "#0f172a", lineHeight: 1 }}>{zones.length}</div>
                </div>
              </div>
            </div>

            <div className="relative w-full sm:w-auto min-w-0 sm:min-w-[280px]">
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search by zone name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px 8px 36px", borderRadius: "12px", border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem", fontWeight: 700, outline: "none", backgroundColor: "white"
                }}
              />
            </div>
          </div>

          {/* Table Container */}
          <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", minHeight: "420px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Registered Zones ({filteredZones.length})
              </h3>
              {selectedZoneIds.length > 0 && (
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#2563eb" }}>
                  {selectedZoneIds.length} zone{selectedZoneIds.length > 1 ? "s" : ""} selected
                </span>
              )}
            </div>

            <div className="responsive-table-wrapper" style={{ overflowX: "auto", flex: 1 }}>
              <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    {!isReadOnly && (
                      <th style={{ padding: "12px 14px", width: "48px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isAllCurrentPageSelected}
                          onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                          aria-label="Select all on current page"
                        />
                      </th>
                    )}
                    <th style={{ padding: "12px 20px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", width: "70px" }}>Sr No</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Zone</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>City</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Registered On</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created By</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isReadOnly ? 6 : 7} style={{ padding: "64px 24px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Loading zones...</td>
                    </tr>
                  ) : filteredZones.length === 0 ? (
                    <tr>
                      <td colSpan={isReadOnly ? 6 : 7} style={{ padding: "64px 24px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                          <Compass size={36} color="#94a3b8" />
                          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#334155" }}>
                            No matching registered zones found
                          </p>
                          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
                            Try changing your search query.
                          </p>
                          {searchTerm && (
                            <button
                              type="button"
                              onClick={() => setSearchTerm("")}
                              style={{
                                marginTop: "8px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 14px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#f8fafc",
                                color: "#2563eb",
                                fontSize: "0.8125rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              <RotateCcw size={13} /> Reset Search
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedZones.map((z, idx) => {
                      const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                      const isSelected = selectedZoneIds.includes(z.id);

                      const cleanLabel = (val: any, prefix: string) => {
                        if (!val) return `${prefix} ${globalIdx}`;
                        const str = String(val).trim();
                        if (str.length > 20 || str.includes('-') || str.startsWith('PT')) {
                          return `${prefix} ${globalIdx}`;
                        }
                        return str;
                      };
                      const zoneName = cleanLabel(z.name, 'Zone');
                      const createdDate = z.createdAt
                        ? new Date(z.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '12 Feb 2026';
                      const createdTime = z.createdAt
                        ? new Date(z.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '10:30 AM';

                      return (
                        <tr
                          key={z.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            backgroundColor: isSelected ? "#f0f7ff" : "transparent",
                            transition: "background-color 0.15s",
                          }}
                        >
                          {!isReadOnly && (
                            <td style={{ padding: "14px 14px", textAlign: "center", width: "48px" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectZone(z.id)}
                                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                                aria-label={`Select ${zoneName}`}
                              />
                            </td>
                          )}
                          <td style={{ padding: "14px 20px", fontSize: "0.8125rem", fontWeight: 800, color: "#64748b" }}>
                            {globalIdx}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            {editingId === z.id ? (
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #2563eb", fontSize: "0.875rem", fontWeight: 700 }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#0f172a" }}>{zoneName}</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: "0.8125rem", fontWeight: 700, color: "#334155" }}>
                            {(z as any).city?.name || user?.city?.name || 'Indore'}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1e293b" }}>{createdDate}</span>
                              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8" }}>{createdTime}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
                            {(z as any).creator?.name || (z as any).creatorName || (z as any).createdBy || (z as any).city?.users?.[0]?.user?.name || ((z as any).city?.name ? `${(z as any).city.name} Admin` : 'City Admin')}
                          </td>
                          <td style={{ padding: "14px 24px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              {editingId === z.id ? (
                                <>
                                  <button
                                    onClick={() => setEditConfirmTarget(z.id)}
                                    disabled={updatingId === z.id}
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
                                    onClick={() => { setEditingId(z.id); setEditName(z.name); }}
                                    style={{ background: "#f1f5f9", color: "#475569", padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmTarget({ id: z.id, name: z.name })}
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

            {/* PAGINATION FOOTER */}
            {filteredZones.length > 0 && (
              <div
                style={{
                  padding: "14px 24px",
                  borderTop: "1px solid #f1f5f9",
                  backgroundColor: "#fcfdfe",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 600 }}>
                    Showing{" "}
                    <strong style={{ color: "#0f172a" }}>
                      {(currentPage - 1) * pageSize + 1}
                    </strong>{" "}
                    to{" "}
                    <strong style={{ color: "#0f172a" }}>
                      {Math.min(currentPage * pageSize, filteredZones.length)}
                    </strong>{" "}
                    of{" "}
                    <strong style={{ color: "#0f172a" }}>
                      {filteredZones.length}
                    </strong>{" "}
                    zones
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: "white",
                        color: "#334155",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: currentPage === 1 ? "#f8fafc" : "white",
                      color: currentPage === 1 ? "#cbd5e1" : "#334155",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 5) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - currentPage) <= 1;
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;

                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && (
                            <span style={{ padding: "0 4px", color: "#94a3b8", fontSize: "0.75rem" }}>
                              ...
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            style={{
                              minWidth: "32px",
                              height: "32px",
                              padding: "0 8px",
                              borderRadius: "8px",
                              border: p === currentPage ? "none" : "1px solid #cbd5e1",
                              backgroundColor: p === currentPage ? "#2563eb" : "white",
                              color: p === currentPage ? "white" : "#334155",
                              fontSize: "0.8125rem",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: currentPage >= totalPages ? "#f8fafc" : "white",
                      color: currentPage >= totalPages ? "#cbd5e1" : "#334155",
                      cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
