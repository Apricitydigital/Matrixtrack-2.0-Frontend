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

  const employeeAssignedCount = useMemo(() => {
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
     PAGE TEXT
  ========================================================= */

  const pageTitle = isSupervisorView
    ? "Supervisor Assignment"
    : "Employee Assignment";

  const pageDescription = isSupervisorView
    ? "Manage supervisor allocation across registered beats."
    : "Assign one employee to each registered beat.";

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
            background:
              "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: "22px",
            padding: "22px 24px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "280px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <span>CITY ADMIN</span>
                <span>/</span>
                <span>BEATS</span>
                <span>/</span>
                <span style={{ color: "#2563eb" }}>{pageTitle.toUpperCase()}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "18px",
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
                    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.08)",
                    flexShrink: 0,
                  }}
                >
                  {isSupervisorView ? (
                    <UserCheck2 size={26} />
                  ) : (
                    <Users size={26} />
                  )}
                </div>

                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "1.85rem",
                      fontWeight: 900,
                      color: "#0f172a",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.15,
                    }}
                  >
                    {pageTitle}
                  </h1>

                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "0.92rem",
                      fontWeight: 500,
                      color: "#64748b",
                    }}
                  >
                    {pageDescription}
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={loadBeats}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "42px",
                  padding: "0 16px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* STATS */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "18px",
            }}
          >
            <div
              style={{
                minWidth: "170px",
                padding: "12px 14px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Total Beats
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {totalBeats}
              </div>
            </div>

            <div
              style={{
                minWidth: "170px",
                padding: "12px 14px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Supervisors Assigned
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "#2563eb",
                }}
              >
                {assignedSupervisorCount}
              </div>
            </div>

            <div
              style={{
                minWidth: "170px",
                padding: "12px 14px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Employee Assigned Beats
              </div>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "#059669",
                }}
              >
                {employeeAssignedCount}
              </div>
            </div>
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
                  {filteredBeats.map((beat) => {
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
                              color={
                                allEmployeesAssigned
                                  ? "#059669"
                                  : assignedSegments > 0
                                    ? "#d97706"
                                    : "#94a3b8"
                              }
                            />
                            <span
                              style={{
                                color: allEmployeesAssigned
                                  ? "#059669"
                                  : assignedSegments > 0
                                    ? "#d97706"
                                    : "#64748b",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                              }}
                            >
                              {allEmployeesAssigned
                                ? "Beat Assigned"
                                : assignedSegments > 0
                                  ? "Needs Reassignment"
                                  : "Not Assigned"}
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
                                {allEmployeesAssigned
                                  ? "Change Employee"
                                  : "Assign Employee"}
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