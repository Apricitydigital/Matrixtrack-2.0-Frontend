"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import AreaForm from "./components/AreaForm";

import { apiFetch, CityApi } from "@lib/apiClient";

import {
  MapPin,
  Plus,
  X,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

import { useAuth } from "@hooks/useAuth";
import { TableExportDropdown } from "@components/ui/TableExportDropdown";
import { RoleGuard } from "@components/Guards";

const AREA_TYPE_OPTIONS = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "SLUM", label: "Slum" },
  { value: "RELIGIOUS_PLACE", label: "Religious Place" },
  { value: "TOURIST_AREA", label: "Tourist Area" },
  { value: "TRANSPORT_HUB", label: "Transport Hub" },
  { value: "PARKS_AND_GARDENS", label: "Parks and Gardens" },
  { value: "MARKET_AREA", label: "Market Area" },
  { value: "PARKING", label: "Parking" },
];

export default function AreasPage() {
  const { user } = useAuth();

  const isReadOnly =
    user?.roles?.some((r) =>
      [
        "COMMISSIONER",
        "ULB_OFFICER",
      ].includes(r)
    );

  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "HMS_SUPER_ADMIN" ||
    user?.roles?.some((r) => ["SUPER_ADMIN", "HMS_SUPER_ADMIN"].includes(r));

  const assignedCityName = user?.city?.name || user?.cityName;

  /* =========================================================
     AREA DATA
  ========================================================= */

  const [areas, setAreas] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================================================
     UI STATE / FILTERS
  ========================================================= */

  const [showCreateArea, setShowCreateArea] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [selectedWard, setSelectedWard] = useState("ALL");
  const [selectedAreaType, setSelectedAreaType] = useState("ALL");

  /* =========================================================
     PAGINATION STATE
  ========================================================= */

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* =========================================================
     BULK SELECTION
  ========================================================= */

  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* =========================================================
     EDIT AREA MODAL STATE
  ========================================================= */

  const [editingArea, setEditingArea] = useState<any | null>(null);
  const [editAreaName, setEditAreaName] = useState("");
  const [editAreaType, setEditAreaType] = useState("RESIDENTIAL");
  const [editZoneId, setEditZoneId] = useState("");
  const [editWardId, setEditWardId] = useState("");
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  /* =========================================================
     DELETE AREA STATE (SINGLE)
  ========================================================= */

  const [deleteAreaTarget, setDeleteAreaTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null);

  /* =========================================================
     LOAD AREAS + WARDS + ZONES + CITIES
  ========================================================= */

  const loadAreas = useCallback(async () => {
    try {
      setLoading(true);

      const [areaResult, wardResult, zoneResult, cityResult] =
        await Promise.allSettled([
          apiFetch<{ nodes: any[] }>("/city/geo?level=AREA"),
          apiFetch<{ nodes: any[] }>("/city/geo?level=WARD"),
          apiFetch<{ nodes: any[] }>("/city/geo?level=ZONE"),
          CityApi.list().catch(() => ({ cities: [] })),
        ]);

      if (areaResult.status === "fulfilled") {
        setAreas(areaResult.value?.nodes || []);
      }

      if (wardResult.status === "fulfilled") {
        setWards(wardResult.value?.nodes || []);
      }

      if (zoneResult.status === "fulfilled") {
        setZones(zoneResult.value?.nodes || []);
      }

      if (cityResult.status === "fulfilled") {
        setCities((cityResult.value as any)?.cities || []);
      }
    } catch (err) {
      console.error("Failed to load areas", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  // Set default city if user is City Admin
  useEffect(() => {
    if (!isSuperAdmin && assignedCityName) {
      setSelectedCity(assignedCityName);
    }
  }, [isSuperAdmin, assignedCityName]);

  /* =========================================================
     WARD MAP & ZONE MAP
  ========================================================= */

  const wardMap = useMemo(() => {
    return new Map(wards.map((ward) => [ward.id, ward]));
  }, [wards]);

  const zoneMap = useMemo(() => {
    return new Map(zones.map((zone) => [zone.id, zone]));
  }, [zones]);

  /* =========================================================
     AREA TYPE FORMATTER
  ========================================================= */

  const formatAreaType = (value: any) => {
    if (!value) return "-";
    return String(value)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  /* =========================================================
     ENRICHED AREAS DATA
  ========================================================= */

  const enrichedAreas = useMemo(() => {
    return areas.map((area) => {
      const ward = area.parentId ? wardMap.get(area.parentId) : null;
      const zone = ward?.parentId ? zoneMap.get(ward.parentId) : null;

      return {
        ...area,
        areaTypeLabel: formatAreaType(area.areaType || area.type),
        wardName: area.wardName || area.ward?.name || ward?.name || "-",
        zoneName: area.zoneName || area.zone?.name || zone?.name || "-",
        zoneId: zone?.id || "",
        cityName:
          zone?.city?.name ||
          area.city?.name ||
          ward?.city?.name ||
          user?.city?.name ||
          "Indore",
      };
    });
  }, [areas, wardMap, zoneMap, user?.city?.name]);

  /* =========================================================
     FILTER DROPDOWN OPTIONS
  ========================================================= */

  const cityOptions = useMemo(() => {
    if (!isSuperAdmin && assignedCityName) {
      return [assignedCityName];
    }
    const set = new Set<string>();
    enrichedAreas.forEach((a) => {
      if (a.cityName) set.add(a.cityName);
    });
    cities.forEach((c) => {
      if (c.name) set.add(c.name);
    });
    return Array.from(set);
  }, [enrichedAreas, cities, isSuperAdmin, assignedCityName]);

  const zoneOptions = useMemo(() => {
    let zonesFiltered = zones;
    if (selectedCity !== "ALL") {
      zonesFiltered = zones.filter((z) => {
        const zCity = (z as any).city?.name || user?.city?.name || "Indore";
        return zCity.toLowerCase() === selectedCity.toLowerCase();
      });
    }
    return zonesFiltered;
  }, [zones, selectedCity, user?.city?.name]);

  const wardOptions = useMemo(() => {
    let wardsFiltered = wards;
    if (selectedZone !== "ALL") {
      wardsFiltered = wards.filter((w) => w.parentId === selectedZone);
    } else if (selectedCity !== "ALL") {
      const zoneIdsInCity = new Set(zoneOptions.map((z) => z.id));
      wardsFiltered = wards.filter((w) => w.parentId && zoneIdsInCity.has(w.parentId));
    }
    return wardsFiltered;
  }, [wards, selectedZone, selectedCity, zoneOptions]);

  const areaTypeOptions = useMemo(() => {
    const types = new Set<string>();
    enrichedAreas.forEach((a) => {
      const typeVal = a.areaType || a.type;
      if (typeVal) types.add(typeVal);
    });
    return Array.from(types);
  }, [enrichedAreas]);

  // Reset child filters if parent changes
  useEffect(() => {
    if (selectedCity !== "ALL") {
      const validZoneIds = new Set(zoneOptions.map((z) => z.id));
      if (selectedZone !== "ALL" && !validZoneIds.has(selectedZone)) {
        setSelectedZone("ALL");
        setSelectedWard("ALL");
      }
    }
  }, [selectedCity, zoneOptions, selectedZone]);

  useEffect(() => {
    if (selectedZone !== "ALL") {
      const validWardIds = new Set(wardOptions.map((w) => w.id));
      if (selectedWard !== "ALL" && !validWardIds.has(selectedWard)) {
        setSelectedWard("ALL");
      }
    }
  }, [selectedZone, wardOptions, selectedWard]);

  // Reset page to 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCity, selectedZone, selectedWard, selectedAreaType]);

  /* =========================================================
     SEARCH & FILTERS APPLICATION
  ========================================================= */

  const filteredAreas = useMemo(() => {
    let result = enrichedAreas;

    if (selectedCity !== "ALL") {
      result = result.filter(
        (area) => area.cityName?.toLowerCase() === selectedCity.toLowerCase()
      );
    }

    if (selectedZone !== "ALL") {
      result = result.filter(
        (area) =>
          area.parentId && wardMap.get(area.parentId)?.parentId === selectedZone
      );
    }

    if (selectedWard !== "ALL") {
      result = result.filter((area) => area.parentId === selectedWard);
    }

    if (selectedAreaType !== "ALL") {
      result = result.filter(
        (area) =>
          area.areaType === selectedAreaType ||
          area.type === selectedAreaType ||
          area.areaTypeLabel?.toLowerCase() === selectedAreaType.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (area) =>
          area.name?.toLowerCase().includes(q) ||
          area.id?.toLowerCase().includes(q) ||
          area.areaTypeLabel?.toLowerCase().includes(q) ||
          area.zoneName?.toLowerCase().includes(q) ||
          area.wardName?.toLowerCase().includes(q) ||
          area.cityName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [
    enrichedAreas,
    searchQuery,
    selectedCity,
    selectedZone,
    selectedWard,
    selectedAreaType,
    wardMap,
  ]);

  /* =========================================================
     PAGINATED AREAS
  ========================================================= */

  const totalPages = Math.ceil(filteredAreas.length / pageSize) || 1;
  const paginatedAreas = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAreas.slice(startIndex, startIndex + pageSize);
  }, [filteredAreas, currentPage, pageSize]);

  /* =========================================================
     SELECTION HANDLERS
  ========================================================= */

  const isAllCurrentPageSelected =
    paginatedAreas.length > 0 &&
    paginatedAreas.every((a) => selectedAreaIds.includes(a.id));

  const toggleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedAreas.map((a) => a.id);
      setSelectedAreaIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIdSet = new Set(paginatedAreas.map((a) => a.id));
      setSelectedAreaIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    }
  };

  const toggleSelectArea = (id: string) => {
    setSelectedAreaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  /* =========================================================
     EDIT AREA HANDLERS
  ========================================================= */

  const openEditAreaModal = (area: any) => {
    const ward = area.parentId ? wardMap.get(area.parentId) : null;
    const zoneId = ward?.parentId || area.zoneId || "";
    setEditingArea(area);
    setEditAreaName(area.name || "");
    setEditAreaType(area.areaType || area.type || "RESIDENTIAL");
    setEditZoneId(zoneId);
    setEditWardId(area.parentId || "");
    setShowEditConfirm(false);
  };

  const editWardDropdownOptions = useMemo(() => {
    if (!editZoneId) return wards;
    return wards.filter((w) => w.parentId === editZoneId);
  }, [wards, editZoneId]);

  const confirmSaveEditArea = async () => {
    if (!editingArea) return;
    if (!editAreaName.trim()) {
      alert("Area name cannot be empty.");
      return;
    }
    if (!editWardId) {
      alert("Please select a ward for this area.");
      return;
    }

    setSavingEdit(true);
    try {
      await apiFetch(`/city/geo/${editingArea.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editAreaName.trim(),
          displayName: editAreaName.trim(),
          areaType: editAreaType,
          parentId: editWardId,
        }),
      });

      setEditingArea(null);
      setShowEditConfirm(false);
      await loadAreas();
    } catch (err: any) {
      console.error("Failed to update area", err);
      alert(err?.message || "Failed to update area");
    } finally {
      setSavingEdit(false);
    }
  };

  /* =========================================================
     DELETE AREA HANDLERS (SINGLE & BULK)
  ========================================================= */

  const confirmDeleteArea = async () => {
    if (!deleteAreaTarget || isReadOnly) return;

    setDeletingAreaId(deleteAreaTarget.id);
    try {
      await apiFetch(`/city/geo/${deleteAreaTarget.id}`, {
        method: "DELETE",
      });

      setDeleteAreaTarget(null);
      setSelectedAreaIds((prev) =>
        prev.filter((id) => id !== deleteAreaTarget.id)
      );
      await loadAreas();
    } catch (err) {
      console.error("Failed to delete area", err);
      alert("Failed to delete area");
    } finally {
      setDeletingAreaId(null);
    }
  };

  const confirmBulkDeleteAreas = async () => {
    if (selectedAreaIds.length === 0 || isReadOnly) return;

    setBulkDeleting(true);
    try {
      for (const id of selectedAreaIds) {
        await apiFetch(`/city/geo/${id}`, {
          method: "DELETE",
        }).catch((err) => console.error("Error deleting area", id, err));
      }

      setSelectedAreaIds([]);
      setShowBulkDeleteConfirm(false);
      await loadAreas();
    } catch (err) {
      console.error("Failed to bulk delete areas", err);
      alert("Failed to complete bulk delete");
    } finally {
      setBulkDeleting(false);
    }
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    if (isSuperAdmin) setSelectedCity("ALL");
    setSelectedZone("ALL");
    setSelectedWard("ALL");
    setSelectedAreaType("ALL");
  };

  /* =========================================================
     PAGE RENDER
  ========================================================= */

  return (
    <RoleGuard
      roles={[
        "CITY_ADMIN",
        "HMS_SUPER_ADMIN",
        "COMMISSIONER",
        "ULB_OFFICER",
      ]}
    >
      <div
        className="page p-3 sm:p-6 lg:p-8"
        style={{
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
        }}
      >
        <div style={{ width: "100%" }}>
          {/* =================================================
              HEADER
          ================================================= */}
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
                <span style={{ color: "#3b82f6" }}>Areas</span>
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
                Areas
              </h1>

              <p
                style={{
                  marginTop: "2px",
                  color: "#64748b",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                Manage registered city areas.
              </p>
            </div>

            {/* AREA ACTIONS */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {/* BULK DELETE ACTION */}
              {selectedAreaIds.length > 0 && !isReadOnly && (
                <button
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
                  <span>Delete Selected ({selectedAreaIds.length})</span>
                </button>
              )}

              {/* EXPORT */}
              <TableExportDropdown
                data={filteredAreas.map((area, index) => ({
                  SrNo: index + 1,
                  AreaName: area.name || "-",
                  AreaType: area.areaTypeLabel || "-",
                  CityName: user?.city?.name || "Indore",
                  Zone: area.zoneName || "-",
                  Ward: area.wardName || "-",
                  CreatedOn: area.createdAt
                    ? new Date(area.createdAt).toLocaleDateString("en-GB")
                    : "-",
                }))}
                filename="Registered_Areas"
                title="Registered Areas Report"
              />

              {/* CREATE AREA */}
              {!isReadOnly && (
                <button
                  onClick={() => setShowCreateArea(true)}
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
                    boxShadow: "0 4px 12px rgba(59,130,246,0.2)",
                  }}
                >
                  <Plus size={15} />
                  Create Area
                </button>
              )}
            </div>
          </div>

          {/* =================================================
              TOTAL AREAS CARD
          ================================================= */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 1fr)",
              maxWidth: "420px",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "14px 18px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #dbeafe",
                }}
              >
                <MapPin size={20} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Total Registered Areas
                </div>

                <div
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 900,
                    color: "#0f172a",
                    lineHeight: 1.1,
                  }}
                >
                  {areas.length}
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              SEARCH & FILTERS
          ================================================= */}
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
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
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

            {/* Ward Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Ward</span>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
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
                <option value="ALL">All Wards</option>
                {wardOptions.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Area Type Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Area Type</span>
              <select
                value={selectedAreaType}
                onChange={(e) => setSelectedAreaType(e.target.value)}
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
                <option value="ALL">All Types</option>
                {areaTypeOptions.map((t) => (
                  <option key={t} value={t}>{formatAreaType(t)}</option>
                ))}
              </select>
            </div>

            {/* Search bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Search</span>
              <div style={{ position: "relative", width: "100%" }}>
                <Search
                  size={15}
                  color="#94a3b8"
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search areas, type, city, zone or ward..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* =================================================
              CREATE AREA MODAL
          ================================================= */}
          {!isReadOnly && showCreateArea && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15,23,42,0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "600px",
                  maxHeight: "calc(100vh - 32px)",
                  overflowY: "auto",
                  backgroundColor: "white",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <MapPin size={20} color="#2563eb" />
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                      Create New Area
                    </h2>
                  </div>

                  <button
                    onClick={() => setShowCreateArea(false)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ padding: "24px" }}>
                  <AreaForm
                    wards={wards}
                    onSuccess={() => {
                      setShowCreateArea(false);
                      loadAreas();
                    }}
                    onCancel={() => setShowCreateArea(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              EDIT AREA MODAL
          ================================================= */}
          {!isReadOnly && editingArea && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15,23,42,0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "540px",
                  maxHeight: "calc(100vh - 32px)",
                  overflowY: "auto",
                  backgroundColor: "white",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Edit2 size={20} color="#2563eb" />
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                      Edit Area Details
                    </h2>
                  </div>

                  <button
                    onClick={() => {
                      setEditingArea(null);
                      setShowEditConfirm(false);
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ padding: "24px" }}>
                  {showEditConfirm ? (
                    <div style={{ textAlign: "center", padding: "12px 0" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          backgroundColor: "#dbeafe",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 16px",
                        }}
                      >
                        <AlertTriangle size={24} />
                      </div>
                      <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                        Confirm Area Update
                      </h3>
                      <p style={{ margin: "0 0 24px", fontSize: "0.875rem", color: "#64748b" }}>
                        Are you sure you want to save changes to area <strong>{editAreaName}</strong>?
                      </p>
                      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => setShowEditConfirm(false)}
                          style={{
                            padding: "10px 20px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "white",
                            color: "#475569",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={confirmSaveEditArea}
                          disabled={savingEdit}
                          style={{
                            padding: "10px 24px",
                            borderRadius: "10px",
                            border: "none",
                            backgroundColor: "#2563eb",
                            color: "white",
                            fontSize: "0.875rem",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {savingEdit ? "Saving..." : "Yes, Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setShowEditConfirm(true);
                      }}
                    >
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                          Area Name <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editAreaName}
                          onChange={(e) => setEditAreaName(e.target.value)}
                          placeholder="e.g. Area 1 or Commercial Plaza"
                          style={{
                            width: "100%",
                            height: "42px",
                            padding: "0 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            outline: "none",
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                          Area Type <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                          value={editAreaType}
                          onChange={(e) => setEditAreaType(e.target.value)}
                          style={{
                            width: "100%",
                            height: "42px",
                            padding: "0 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            outline: "none",
                            backgroundColor: "white",
                          }}
                        >
                          {AREA_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                          Zone (Filter Wards)
                        </label>
                        <select
                          value={editZoneId}
                          onChange={(e) => {
                            setEditZoneId(e.target.value);
                            setEditWardId("");
                          }}
                          style={{
                            width: "100%",
                            height: "42px",
                            padding: "0 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            outline: "none",
                            backgroundColor: "white",
                          }}
                        >
                          <option value="">All Zones</option>
                          {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                          Assigned Ward <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                          required
                          value={editWardId}
                          onChange={(e) => setEditWardId(e.target.value)}
                          style={{
                            width: "100%",
                            height: "42px",
                            padding: "0 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            outline: "none",
                            backgroundColor: "white",
                          }}
                        >
                          <option value="" disabled>Select Ward</option>
                          {editWardDropdownOptions.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} {w.displayName ? `(${w.displayName})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setEditingArea(null)}
                          style={{
                            padding: "10px 18px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "white",
                            color: "#475569",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{
                            padding: "10px 22px",
                            borderRadius: "10px",
                            border: "none",
                            backgroundColor: "#2563eb",
                            color: "white",
                            fontSize: "0.875rem",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Update Area
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              DELETE SINGLE AREA MODAL
          ================================================= */}
          {!isReadOnly && deleteAreaTarget && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15,23,42,0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 110,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "440px",
                  backgroundColor: "white",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Trash2 size={24} />
                </div>

                <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                  Delete Area?
                </h3>

                <p style={{ margin: "0 0 24px", fontSize: "0.875rem", color: "#64748b", lineHeight: 1.5 }}>
                  Are you sure you want to delete <strong>{deleteAreaTarget.name}</strong>? This action cannot be undone.
                </p>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => setDeleteAreaTarget(null)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "white",
                      color: "#475569",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmDeleteArea}
                    disabled={deletingAreaId === deleteAreaTarget.id}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#dc2626",
                      color: "white",
                      fontSize: "0.875rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {deletingAreaId === deleteAreaTarget.id ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              BULK DELETE CONFIRMATION MODAL
          ================================================= */}
          {!isReadOnly && showBulkDeleteConfirm && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15,23,42,0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 110,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "440px",
                  backgroundColor: "white",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Trash2 size={24} />
                </div>

                <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                  Delete Multiple Areas?
                </h3>

                <p style={{ margin: "0 0 24px", fontSize: "0.875rem", color: "#64748b", lineHeight: 1.5 }}>
                  Are you sure you want to delete <strong>{selectedAreaIds.length} selected areas</strong>? This action cannot be undone.
                </p>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "white",
                      color: "#475569",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmBulkDeleteAreas}
                    disabled={bulkDeleting}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#dc2626",
                      color: "white",
                      fontSize: "0.875rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {bulkDeleting ? "Deleting..." : `Yes, Delete ${selectedAreaIds.length}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              REGISTERED AREAS TABLE & PAGINATION
          ================================================= */}
          <section>
            {loading ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  backgroundColor: "white",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  className="animate-spin"
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "4px solid #f3f3f3",
                    borderTop: "4px solid #2563eb",
                    borderRadius: "50%",
                    margin: "0 auto",
                  }}
                />
                <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 600 }}>
                  Loading areas...
                </p>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  overflow: "hidden",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  minHeight: "420px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* TABLE TITLE & SELECTION BAR */}
                <div
                  style={{
                    padding: "18px 24px",
                    borderBottom: "1px solid #f1f5f9",
                    backgroundColor: "#fcfdfe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "0.95rem",
                      fontWeight: 900,
                      color: "#0f172a",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Registered Areas ({filteredAreas.length})
                  </h3>

                  {selectedAreaIds.length > 0 && (
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#2563eb" }}>
                      {selectedAreaIds.length} item{selectedAreaIds.length > 1 ? "s" : ""} selected
                    </span>
                  )}
                </div>

                <div className="responsive-table-wrapper" style={{ overflowX: "auto", flex: 1 }}>
                  <table
                    style={{
                      width: "100%",
                      minWidth: "1050px",
                      borderCollapse: "collapse",
                      textAlign: "left",
                    }}
                  >
                    {/* TABLE HEADER */}
                    <thead
                      style={{
                        backgroundColor: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <tr>
                        {!isReadOnly && (
                          <th style={{ ...headerCell, width: "48px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isAllCurrentPageSelected}
                              onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                              style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                              aria-label="Select all on current page"
                            />
                          </th>
                        )}
                        <th style={{ ...headerCell, width: "70px" }}>Sr No</th>
                        <th style={headerCell}>Area Name</th>
                        <th style={headerCell}>Area Type</th>
                        <th style={headerCell}>City Name</th>
                        <th style={headerCell}>Zone</th>
                        <th style={headerCell}>Ward</th>
                        <th style={headerCell}>Registered On</th>
                        <th style={{ ...headerCell, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>

                    {/* TABLE BODY */}
                    <tbody>
                      {filteredAreas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isReadOnly ? 8 : 9}
                            style={{
                              padding: "64px 24px",
                              textAlign: "center",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                              <MapPin size={36} color="#94a3b8" />
                              <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#334155" }}>
                                No matching registered areas found
                              </p>
                              <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
                                Try changing your search query or filter options above.
                              </p>
                              {(searchQuery || selectedCity !== "ALL" || selectedZone !== "ALL" || selectedWard !== "ALL" || selectedAreaType !== "ALL") && (
                                <button
                                  type="button"
                                  onClick={resetAllFilters}
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
                                  <RotateCcw size={13} /> Reset Filters
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedAreas.map((area, index) => {
                          const globalIndex = (currentPage - 1) * pageSize + index + 1;
                          const isSelected = selectedAreaIds.includes(area.id);

                          const createdDate = area.createdAt
                            ? new Date(area.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—";

                          const createdTime = area.createdAt
                            ? new Date(area.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "";

                          return (
                            <tr
                              key={area.id}
                              style={{
                                borderBottom: "1px solid #f1f5f9",
                                backgroundColor: isSelected ? "#f0f7ff" : "transparent",
                                transition: "background-color 0.15s",
                              }}
                            >
                              {/* SELECT CHECKBOX */}
                              {!isReadOnly && (
                                <td style={{ ...tableCell, textAlign: "center", width: "48px" }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectArea(area.id)}
                                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                                    aria-label={`Select ${area.name}`}
                                  />
                                </td>
                              )}

                              {/* SR NO */}
                              <td style={{ ...tableCell, fontWeight: 700, color: "#64748b" }}>
                                {globalIndex}
                              </td>

                              {/* AREA NAME */}
                              <td
                                style={{
                                  ...tableCell,
                                  fontSize: "0.875rem",
                                  fontWeight: 800,
                                  color: "#0f172a",
                                }}
                              >
                                {area.name}
                              </td>

                              {/* AREA TYPE */}
                              <td style={tableCell}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "4px 10px",
                                    borderRadius: "999px",
                                    backgroundColor: "#eff6ff",
                                    border: "1px solid #dbeafe",
                                    color: "#2563eb",
                                    fontSize: "0.75rem",
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {area.areaTypeLabel || "-"}
                                </span>
                              </td>

                              {/* CITY */}
                              <td style={{ ...tableCell, fontWeight: 700, color: "#334155" }}>
                                {area.cityName}
                              </td>

                              {/* ZONE */}
                              <td style={{ ...tableCell, fontWeight: 700, color: "#334155" }}>
                                {area.zoneName || "-"}
                              </td>

                              {/* WARD */}
                              <td style={{ ...tableCell, fontWeight: 700, color: "#334155" }}>
                                {area.wardName || "-"}
                              </td>

                              {/* REGISTERED ON */}
                              <td style={tableCell}>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1e293b" }}>
                                    {createdDate}
                                  </span>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8" }}>
                                    {createdTime}
                                  </span>
                                </div>
                              </td>

                              {/* ACTIONS */}
                              <td style={{ ...tableCell, textAlign: "right" }}>
                                {!isReadOnly && (
                                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                    <button
                                      type="button"
                                      onClick={() => openEditAreaModal(area)}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "6px 10px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        backgroundColor: "#f8fafc",
                                        color: "#334155",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                      }}
                                    >
                                      <Edit2 size={13} color="#2563eb" /> Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setDeleteAreaTarget({ id: area.id, name: area.name })}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "6px 10px",
                                        borderRadius: "8px",
                                        border: "1px solid #fecaca",
                                        backgroundColor: "#fef2f2",
                                        color: "#dc2626",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                      }}
                                    >
                                      <Trash2 size={13} /> Delete
                                    </button>
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

                {/* PAGINATION FOOTER */}
                {filteredAreas.length > 0 && (
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
                          {Math.min(currentPage * pageSize, filteredAreas.length)}
                        </strong>{" "}
                        of{" "}
                        <strong style={{ color: "#0f172a" }}>
                          {filteredAreas.length}
                        </strong>{" "}
                        areas
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
            )}
          </section>
        </div>

        <style jsx>{`
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </RoleGuard>
  );
}

/* ===========================================================
   TABLE STYLES
=========================================================== */

const headerCell: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: "0.7rem",
  fontWeight: 900,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

const tableCell: React.CSSProperties = {
  padding: "14px 14px",
  fontSize: "0.8125rem",
  color: "#475569",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};