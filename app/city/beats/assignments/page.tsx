"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

import {
  Search,
  MapPin,
  Users,
  UserCheck2,
  RefreshCw,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { AreaBeatApi } from "@lib/apiClient";
import { RoleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";

import AssignBeatModal from "../components/AssignBeatModal";

export default function BeatAssignmentsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  /* =========================================================
     CURRENT VIEW
  ========================================================= */

  const currentView: "supervisor" | "employee" =
    searchParams.get("view") === "employee"
      ? "employee"
      : "supervisor";

  const isSupervisorView = currentView === "supervisor";

  /* =========================================================
     READ ONLY
  ========================================================= */

  const isReadOnly =
    user?.roles?.some((role) =>
      ["COMMISSIONER", "ULB_OFFICER"].includes(role)
    ) || false;

  /* =========================================================
     DATA
  ========================================================= */

  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedBeat, setSelectedBeat] = useState<any | null>(null);

  /* =========================================================
     LOAD BEATS
  ========================================================= */

  const loadBeats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await AreaBeatApi.list();
      setBeats(response?.beats || []);
    } catch (error) {
      console.error("Failed to load beats", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeats();
  }, [loadBeats]);

  // Reset pagination on filter or view change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, zoneFilter, wardFilter, areaFilter, currentView]);

  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

  const zoneOptions = useMemo(() => {
    return Array.from(
      new Set(
        beats
          .map((beat) => beat.zoneName)
          .filter(Boolean)
      )
    ).sort();
  }, [beats]);

  const wardOptions = useMemo(() => {
    return Array.from(
      new Set(
        beats
          .filter((beat) =>
            zoneFilter ? beat.zoneName === zoneFilter : true
          )
          .map((beat) => beat.wardName)
          .filter(Boolean)
      )
    ).sort();
  }, [beats, zoneFilter]);

  const areaOptions = useMemo(() => {
    return Array.from(
      new Set(
        beats
          .filter((beat) =>
            zoneFilter ? beat.zoneName === zoneFilter : true
          )
          .filter((beat) =>
            wardFilter ? beat.wardName === wardFilter : true
          )
          .map((beat) => beat.areaName)
          .filter(Boolean)
      )
    ).sort();
  }, [beats, zoneFilter, wardFilter]);

  /* =========================================================
     FILTERED DATA
  ========================================================= */

  const filteredBeats = useMemo(() => {
    const q = search.trim().toLowerCase();

    return beats.filter((beat) => {
      const supervisorNames = (beat.supervisorsSummary || [])
        .map((supervisor: any) => supervisor.name || "")
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !q ||
        beat.beatName?.toLowerCase().includes(q) ||
        beat.zoneName?.toLowerCase().includes(q) ||
        beat.wardName?.toLowerCase().includes(q) ||
        beat.areaName?.toLowerCase().includes(q) ||
        beat.assignedToName?.toLowerCase().includes(q) ||
        supervisorNames.includes(q);

      const matchesZone =
        !zoneFilter || beat.zoneName === zoneFilter;

      const matchesWard =
        !wardFilter || beat.wardName === wardFilter;

      const matchesArea =
        !areaFilter || beat.areaName === areaFilter;

      return (
        matchesSearch &&
        matchesZone &&
        matchesWard &&
        matchesArea
      );
    });
  }, [beats, search, zoneFilter, wardFilter, areaFilter]);

  /* =========================================================
     COUNTS
  ========================================================= */

  const totalBeats = filteredBeats.length;

  const assignedSupervisorCount = useMemo(() => {
    return filteredBeats.filter((beat) => {
      const supervisors =
        beat.supervisorsSummary ||
        (beat.assignedToName ? [{ name: beat.assignedToName }] : []);
      return supervisors.length > 0;
    }).length;
  }, [filteredBeats]);

  const partiallyAssignedEmployeeCount = useMemo(() => {
    return filteredBeats.filter((beat) => {
      const assignedSegments = (beat.segments || []).filter(
        (segment: any) => !!segment.employeeAssignedToId
      ).length;
      return assignedSegments > 0;
    }).length;
  }, [filteredBeats]);

  const fullyStaffedEmployeeCount = useMemo(() => {
    return filteredBeats.filter((beat) => {
      const totalSegments =
        beat.totalSegments || beat.segments?.length || 0;
      const assignedSegments = (beat.segments || []).filter(
        (segment: any) => !!segment.employeeAssignedToId
      ).length;

      return totalSegments > 0 && assignedSegments === totalSegments;
    }).length;
  }, [filteredBeats]);

  /* =========================================================
     PAGINATION CALCULATION
  ========================================================= */

  const totalPages = Math.max(1, Math.ceil(filteredBeats.length / pageSize));
  const paginatedBeats = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBeats.slice(start, start + pageSize);
  }, [filteredBeats, currentPage, pageSize]);

  /* =========================================================
     PAGE TEXT
  ========================================================= */

  const pageTitle = isSupervisorView
    ? "Supervisor Assignment"
    : "Employee Assignment";

  const pageDescription = isSupervisorView
    ? "Manage supervisor allocation across registered beats."
    : "Manage employee allocation across beat segments.";

  /* =========================================================
     HELPERS
  ========================================================= */

  const resetFilters = () => {
    setSearch("");
    setZoneFilter("");
    setWardFilter("");
    setAreaFilter("");
  };

  const showActiveFilters =
    !!search || !!zoneFilter || !!wardFilter || !!areaFilter;

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
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          padding: "28px 36px",
        }}
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            padding: "20px 24px",
            boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "260px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "8px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>CITY ADMIN</span>
                <span>/</span>
                <span>BEATS</span>
                <span>/</span>
                <span style={{ color: isSupervisorView ? "#2563eb" : "#059669", fontWeight: 800 }}>
                  {pageTitle.toUpperCase()}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isSupervisorView
                      ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
                      : "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                    border: isSupervisorView
                      ? "1px solid #bfdbfe"
                      : "1px solid #a7f3d0",
                    color: isSupervisorView ? "#2563eb" : "#059669",
                    flexShrink: 0,
                  }}
                >
                  {isSupervisorView ? (
                    <UserCheck2 size={20} />
                  ) : (
                    <Users size={20} />
                  )}
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={loadBeats}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  height: "38px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* STATS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Total Beats
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "1.45rem",
                  fontWeight: 900,
                  color: "#0f172a",
                  lineHeight: 1.1,
                }}
              >
                {totalBeats}
              </div>
            </div>

            {isSupervisorView ? (
              <>
                <div
                  style={{
                    padding: "14px 18px",
                    backgroundColor: "#eff6ff",
                    border: "1px solid #dbeafe",
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: "#2563eb",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Supervisors Assigned
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "1.45rem",
                      fontWeight: 900,
                      color: "#1d4ed8",
                      lineHeight: 1.1,
                    }}
                  >
                    {assignedSupervisorCount}
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 18px",
                    backgroundColor: totalBeats - assignedSupervisorCount > 0 ? "#fff1f2" : "#f0fdf4",
                    border: totalBeats - assignedSupervisorCount > 0 ? "1px solid #ffe4e6" : "1px solid #dcfce7",
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: totalBeats - assignedSupervisorCount > 0 ? "#e11d48" : "#16a34a",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Unassigned Beats
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "1.45rem",
                      fontWeight: 900,
                      color: totalBeats - assignedSupervisorCount > 0 ? "#be123c" : "#15803d",
                      lineHeight: 1.1,
                    }}
                  >
                    {Math.max(0, totalBeats - assignedSupervisorCount)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    padding: "14px 18px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #d1fae5",
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: "#059669",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Employees Assigned
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "1.45rem",
                      fontWeight: 900,
                      color: "#047857",
                      lineHeight: 1.1,
                    }}
                  >
                    {partiallyAssignedEmployeeCount}
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 18px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #dcfce7",
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: "#16a34a",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Fully Staffed Beats
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "1.45rem",
                      fontWeight: 900,
                      color: "#15803d",
                      lineHeight: 1.1,
                    }}
                  >
                    {fullyStaffedEmployeeCount}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===================================================
            FILTER BAR
        =================================================== */}

        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "16px",
            marginBottom: "18px",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "14px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#334155",
                fontSize: "0.85rem",
                fontWeight: 800,
              }}
            >
              <Filter size={16} />
              Filters
            </div>

            {showActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  color: "#475569",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={14} />
                Reset Filters
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr 1fr 1fr",
              gap: "12px",
            }}
          >
            {/* SEARCH */}
            <div style={{ position: "relative" }}>
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
                placeholder="Search beats, supervisors, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyleWithIcon}
              />
            </div>

            {/* ZONE */}
            <div style={{ position: "relative" }}>
              <select
                value={zoneFilter}
                onChange={(e) => {
                  setZoneFilter(e.target.value);
                  setWardFilter("");
                  setAreaFilter("");
                }}
                style={selectStyle}
              >
                <option value="">All Zones</option>
                {zoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} style={selectArrowStyle} />
            </div>

            {/* WARD */}
            <div style={{ position: "relative" }}>
              <select
                value={wardFilter}
                onChange={(e) => {
                  setWardFilter(e.target.value);
                  setAreaFilter("");
                }}
                style={selectStyle}
              >
                <option value="">All Wards</option>
                {wardOptions.map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} style={selectArrowStyle} />
            </div>

            {/* AREA */}
            <div style={{ position: "relative" }}>
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Areas</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} style={selectArrowStyle} />
            </div>
          </div>
        </div>

        {/* ===================================================
            MAIN CARD
        =================================================== */}

        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            overflow: "hidden",
            boxShadow: "0 3px 12px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "18px 22px",
              backgroundColor: "#fcfdff",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                Registered Beats
              </div>

              <div
                style={{
                  marginTop: "3px",
                  color: "#94a3b8",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
              >
                {filteredBeats.length} beat(s) found
              </div>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              Loading beats...
            </div>
          ) : filteredBeats.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              No beats found.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "850px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <th style={headCell}>Beat Name</th>
                    <th style={headCell}>Location</th>
                    <th style={headCell}>Supervisor</th>
                    <th style={headCell}>Employee Assignment</th>
                    <th style={{ ...headCell, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedBeats.map((beat) => {
                    const supervisors =
                      beat.supervisorsSummary ||
                      (beat.assignedToName
                        ? [
                            {
                              id: beat.assignedToId,
                              name: beat.assignedToName,
                            },
                          ]
                        : []);

                    const totalSegments =
                      beat.totalSegments || beat.segments?.length || 0;

                    const assignedSegments = (beat.segments || []).filter(
                      (segment: any) => !!segment.employeeAssignedToId
                    ).length;

                    const allEmployeesAssigned =
                      totalSegments > 0 &&
                      assignedSegments === totalSegments;

                    return (
                      <tr
                        key={beat.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <td style={bodyCell}>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 800,
                              color: "#0f172a",
                            }}
                          >
                            {beat.beatName}
                          </div>

                          {beat.beatCode && (
                            <div
                              style={{
                                marginTop: "3px",
                                fontSize: "0.68rem",
                                color: "#94a3b8",
                                fontWeight: 600,
                              }}
                            >
                              {beat.beatCode}
                            </div>
                          )}
                        </td>

                        <td style={bodyCell}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "6px",
                            }}
                          >
                            <MapPin size={14} color="#94a3b8" />
                            <span
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 650,
                                color: "#475569",
                              }}
                            >
                              {beat.zoneName} {" - "} {beat.wardName} {" - "} {beat.areaName}
                            </span>
                          </div>
                        </td>

                        <td style={bodyCell}>
                          {supervisors.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                              }}
                            >
                              {supervisors.map(
                                (supervisor: any, index: number) => (
                                  <span
                                    key={supervisor.id || index}
                                    style={{
                                      fontSize: "0.78rem",
                                      color: "#334155",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {supervisor.name}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span
                              style={{
                                color: "#d97706",
                                fontSize: "0.75rem",
                                fontWeight: 650,
                                fontStyle: "italic",
                              }}
                            >
                              Not assigned
                            </span>
                          )}
                        </td>

                        <td style={bodyCell}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "7px",
                            }}
                          >
                            <Users
                              size={14}
                              color={allEmployeesAssigned ? "#059669" : "#d97706"}
                            />
                            <span
                              style={{
                                color: allEmployeesAssigned ? "#059669" : "#d97706",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                              }}
                            >
                              {assignedSegments}/{totalSegments} segments assigned
                            </span>
                          </div>
                        </td>

                        <td style={{ ...bodyCell, textAlign: "right" }}>
                          {!isReadOnly &&
                            (isSupervisorView ? (
                              <button
                                type="button"
                                onClick={() => setSelectedBeat(beat)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "7px",
                                  height: "36px",
                                  padding: "0 14px",
                                  borderRadius: "9px",
                                  border: "1px solid #bfdbfe",
                                  backgroundColor: "#eff6ff",
                                  color: "#2563eb",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                <UserCheck2 size={14} />
                                {supervisors.length > 0
                                  ? "Manage Supervisor"
                                  : "Assign Supervisor"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedBeat(beat)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "7px",
                                  height: "36px",
                                  padding: "0 14px",
                                  borderRadius: "9px",
                                  border: "1px solid #a7f3d0",
                                  backgroundColor: "#ecfdf5",
                                  color: "#059669",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                <Users size={14} />
                                {assignedSegments > 0
                                  ? "Manage Employees"
                                  : "Assign Employees"}
                              </button>
                            ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION FOOTER */}
          {!loading && filteredBeats.length > 0 && (
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
                    {Math.min(currentPage * pageSize, filteredBeats.length)}
                  </strong>{" "}
                  of{" "}
                  <strong style={{ color: "#0f172a" }}>
                    {filteredBeats.length}
                  </strong>{" "}
                  beats
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
                            border: p === currentPage ? "1px solid #2563eb" : "1px solid #e2e8f0",
                            backgroundColor: p === currentPage ? "#2563eb" : "white",
                            color: p === currentPage ? "white" : "#334155",
                            fontSize: "0.78rem",
                            fontWeight: 700,
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
                  disabled={currentPage === totalPages}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: currentPage === totalPages ? "#f8fafc" : "white",
                    color: currentPage === totalPages ? "#cbd5e1" : "#334155",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            EXISTING ASSIGNMENT MODAL
        =================================================== */}

        {selectedBeat && (
          <AssignBeatModal
            beat={selectedBeat}
            mode={isSupervisorView ? "SUPERVISOR" : "EMPLOYEE"}
            onClose={() => setSelectedBeat(null)}
            onSuccess={() => {
              loadBeats();
            }}
          />
        )}
      </div>
    </RoleGuard>
  );
}

/* ===========================================================
   STYLES
=========================================================== */

const headCell: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "0.68rem",
  fontWeight: 900,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const bodyCell: React.CSSProperties = {
  padding: "15px 16px",
  verticalAlign: "middle",
};

const inputStyleWithIcon: React.CSSProperties = {
  width: "100%",
  height: "42px",
  padding: "0 12px 0 36px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  outline: "none",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#0f172a",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: "42px",
  padding: "0 36px 0 12px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  outline: "none",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#0f172a",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const selectArrowStyle: React.CSSProperties = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  pointerEvents: "none",
};