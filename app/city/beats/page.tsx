"use client";

import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import Link from "next/link";
import dynamic from "next/dynamic";

import BeatForm from "./components/BeatForm";
import BeatTable from "./components/BeatTable";
import EditBeatModal from "./components/EditBeatModal";
import KMLDataViewer from "./components/KMLDataViewer";
import AssignBeatModal from "./components/AssignBeatModal";

import type { BeatMapViewProps } from "./components/BeatMapView";

import { AreaBeatApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { RoleGuard } from "@components/Guards";
import { TableExportDropdown } from "@components/ui/TableExportDropdown";

import {
  Plus,
  X,
  FileText,
  Target,
  ShieldCheck,
  Activity,
  Search,
  RotateCcw,
} from "lucide-react";

const BeatMapView = dynamic<BeatMapViewProps>(
  () => import("./components/BeatMapView"),
  {
    ssr: false,
  }
);

export default function BeatsPage() {
  const { user } = useAuth();

  const isReadOnly = user?.roles?.some((r) =>
    ["COMMISSIONER", "ULB_OFFICER"].includes(r)
  );

  /* =========================================================
     DATA
  ========================================================= */

  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  /* =========================================================
     BEAT MODALS
  ========================================================= */

  const [viewingBeat, setViewingBeat] =
    useState<any | null>(null);

  const [editingBeat, setEditingBeat] =
    useState<any | null>(null);

  const [inspectingBeat, setInspectingBeat] =
    useState<any | null>(null);

  const [assigningBeat, setAssigningBeat] =
    useState<any | null>(null);

  const [deployingBeat, setDeployingBeat] =
    useState<any | null>(null);

  const [showCreateBeat, setShowCreateBeat] =
    useState(false);

  /* =========================================================
     FILTER STATE
  ========================================================= */

  const [searchQuery, setSearchQuery] =
    useState("");

  const [zoneFilter, setZoneFilter] =
    useState("ALL");

  const [wardFilter, setWardFilter] =
    useState("ALL");

  const [areaFilter, setAreaFilter] =
    useState("ALL");

  /*
   * Existing BeatForm prop.
   * Kept unchanged.
   */
  const [geoVersion] = useState(0);

  /* =========================================================
     STATS
  ========================================================= */

  const stats = React.useMemo(() => {
    const total = beats.length;

    const withQC = beats.filter(
      (b) => b.assignedToId
    ).length;

    const withField = beats.filter(
      (b) =>
        b.segments?.some(
          (s: any) => s.assignedToId
        )
    ).length;

    return {
      total,
      withQC,
      withField,
    };
  }, [beats]);

  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

  const availableZones = React.useMemo(() => {
    return Array.from(
      new Set(
        beats
          .map((beat) => beat.zoneName)
          .filter(Boolean)
      )
    ).sort();
  }, [beats]);

  const availableWards = React.useMemo(() => {
    return Array.from(
      new Set(
        beats
          .filter((beat) =>
            zoneFilter === "ALL"
              ? true
              : beat.zoneName === zoneFilter
          )
          .map((beat) => beat.wardName)
          .filter(Boolean)
      )
    ).sort();
  }, [beats, zoneFilter]);

  const availableAreas = React.useMemo(() => {
    return Array.from(
      new Set(
        beats
          .filter((beat) =>
            zoneFilter === "ALL"
              ? true
              : beat.zoneName === zoneFilter
          )
          .filter((beat) =>
            wardFilter === "ALL"
              ? true
              : beat.wardName === wardFilter
          )
          .map((beat) => beat.areaName)
          .filter(Boolean)
      )
    ).sort();
  }, [
    beats,
    zoneFilter,
    wardFilter,
  ]);

  /* =========================================================
     FILTER BEATS
  ========================================================= */

  const filteredBeats = React.useMemo(() => {
    const q =
      searchQuery
        .trim()
        .toLowerCase();

    return beats.filter((beat) => {
      const matchesSearch =
        !q ||
        beat.beatName
          ?.toLowerCase()
          .includes(q) ||
        beat.beatCode
          ?.toLowerCase()
          .includes(q) ||
        beat.zoneName
          ?.toString()
          .toLowerCase()
          .includes(q) ||
        beat.wardName
          ?.toString()
          .toLowerCase()
          .includes(q) ||
        beat.areaName
          ?.toLowerCase()
          .includes(q);

      const matchesZone =
        zoneFilter === "ALL" ||
        beat.zoneName === zoneFilter;

      const matchesWard =
        wardFilter === "ALL" ||
        beat.wardName === wardFilter;

      const matchesArea =
        areaFilter === "ALL" ||
        beat.areaName === areaFilter;

      return (
        matchesSearch &&
        matchesZone &&
        matchesWard &&
        matchesArea
      );
    });
  }, [
    beats,
    searchQuery,
    zoneFilter,
    wardFilter,
    areaFilter,
  ]);

  /* =========================================================
     RESET FILTERS
  ========================================================= */

  const resetFilters = () => {
    setSearchQuery("");
    setZoneFilter("ALL");
    setWardFilter("ALL");
    setAreaFilter("ALL");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    zoneFilter !== "ALL" ||
    wardFilter !== "ALL" ||
    areaFilter !== "ALL";

  /* =========================================================
     LOAD BEATS
     EXISTING API
  ========================================================= */

  const loadBeats = useCallback(async () => {
    try {
      setLoading(true);

      const [
        beatsRes,
        pendingRes,
      ] = await Promise.allSettled([
        AreaBeatApi.list(),
        AreaBeatApi.listPendingRequests(),
      ]);

      if (
        beatsRes.status ===
        "fulfilled"
      ) {
        setBeats(
          beatsRes.value.beats || []
        );
      }

      if (
        pendingRes.status ===
        "fulfilled"
      ) {
        setPendingCount(
          pendingRes.value
            .pendingBeats?.length || 0
        );
      }
    } catch (err) {
      console.error(
        "Failed to load beats",
        err
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeats();
  }, [loadBeats]);

  /* =========================================================
     PAGE
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
        style={{
          padding: "28px 36px",
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: "100%",
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={{
              marginBottom: "28px",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              justifyContent:
                "space-between",
              alignItems: "center",
              borderBottom:
                "1px solid #e2e8f0",
              paddingBottom: "16px",
            }}
          >
            <div>
              {/* BREADCRUMB */}

              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  display: "flex",
                  gap: "6px",
                  marginBottom: "4px",
                  fontWeight: 700,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.05em",
                }}
              >
                <span>
                  City Admin
                </span>

                <span>/</span>

                <span>
                  Beats
                </span>

                <span>/</span>

                <span
                  style={{
                    color: "#3b82f6",
                  }}
                >
                  Beat Management
                </span>
              </div>

              {/* TITLE */}

              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#0f172a",

                  letterSpacing:
                    "-0.01em",
                }}
              >
                Beat Management
              </h1>

              <p
                style={{
                  marginTop: "2px",
                  marginBottom: 0,
                  color: "#64748b",
                  fontSize:
                    "0.8125rem",
                  fontWeight: 500,
                }}
              >
                Create, view and manage
                registered beats.
              </p>
            </div>

            {/* ===============================================
                ACTION BUTTONS
            =============================================== */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {/* EXPORT */}

              <TableExportDropdown
                data={filteredBeats.map(
                  (b) => ({
                    BeatName:
                      b.beatName ||
                      b.name ||
                      "-",

                    BeatCode:
                      b.beatCode ||
                      "-",

                    AreaName:
                      b.areaName ||
                      "-",

                    ZoneName:
                      b.zoneName ||
                      "-",

                    WardName:
                      b.wardName ||
                      "-",

                    Supervisor:
                      b
                        .supervisorsSummary?.[0]
                        ?.name ||
                      "-",

                    Employee:
                      b
                        .employeesSummary?.[0]
                        ?.name ||
                      "-",
                  })
                )}
                filename="Registered_Beats"
                title="Registered Beats Report"
              />

              {/* CREATE BEAT */}

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() =>
                    setShowCreateBeat(
                      true
                    )
                  }
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "6px",
                    height: "40px",
                    padding:
                      "0 16px",
                    borderRadius:
                      "10px",
                    backgroundColor:
                      "#2563eb",
                    border: "none",
                    color: "white",
                    fontWeight: 700,
                    fontSize:
                      "0.8rem",
                    cursor:
                      "pointer",
                    boxShadow:
                      "0 4px 12px rgba(37,99,235,0.2)",
                  }}
                >
                  <Plus
                    size={15}
                  />

                  Create Beat
                </button>
              )}

              {/* BEAT REQUESTS */}

              {!isReadOnly && (
                <>
                  <Link
                    href="/city/beat-requests"
                    style={{
                      height: "40px",
                      borderRadius:
                        "10px",
                      display: "flex",
                      alignItems:
                        "center",
                      gap: "6px",
                      fontWeight: 700,
                      padding:
                        "0 14px",

                      backgroundColor:
                        pendingCount > 0
                          ? "#fef3c7"
                          : "white",

                      border:
                        pendingCount > 0
                          ? "1px solid #fde68a"
                          : "1px solid #cbd5e1",

                      color:
                        pendingCount > 0
                          ? "#b45309"
                          : "#0f172a",

                      textDecoration:
                        "none",
                      fontSize:
                        "0.8rem",
                    }}
                  >
                    <FileText
                      size={15}
                    />

                    <span>
                      Beat Requests
                    </span>

                    {pendingCount >
                      0 && (
                        <span
                          style={{
                            backgroundColor:
                              "#d97706",
                            color:
                              "white",
                            borderRadius:
                              "9999px",
                            padding:
                              "1px 6px",
                            fontSize:
                              "0.65rem",
                            fontWeight:
                              800,
                          }}
                        >
                          {
                            pendingCount
                          }
                        </span>
                      )}
                  </Link>

                  {/* EXISTING EMPLOYEE DEPLOYMENT */}

                  <Link
                    href="/city/areas/employee-assignments"
                    style={{
                      height: "40px",
                      borderRadius:
                        "10px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "6px",
                      fontWeight:
                        700,
                      padding:
                        "0 14px",
                      backgroundColor:
                        "white",
                      border:
                        "1px solid #cbd5e1",
                      color:
                        "#0f172a",
                      textDecoration:
                        "none",
                      fontSize:
                        "0.8rem",
                    }}
                  >
                    <ShieldCheck
                      size={15}
                    />

                    <span>
                      Employee Deployment
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* =================================================
              STATS
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "16px",
              marginBottom:
                "24px",
            }}
          >
            {[
              {
                label:
                  "Total Registered Beats",
                count:
                  stats.total,
                icon:
                  Target,
                color:
                  "#2563eb",
                bg:
                  "#eff6ff",
                border:
                  "#dbeafe",
              },

              {
                label:
                  "Beats with Supervisors",
                count:
                  stats.withQC,
                icon:
                  ShieldCheck,
                color:
                  "#059669",
                bg:
                  "#f0fdf4",
                border:
                  "#dcfce7",
              },

              {
                label:
                  "Beats with Field Employees",
                count:
                  stats.withField,
                icon:
                  Activity,
                color:
                  "#dc2626",
                bg:
                  "#fef2f2",
                border:
                  "#fee2e2",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  backgroundColor:
                    "white",
                  padding:
                    "14px 18px",
                  borderRadius:
                    "16px",
                  border:
                    "1px solid #e2e8f0",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "14px",
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    backgroundColor:
                      s.bg,
                    color:
                      s.color,
                    width:
                      "42px",
                    height:
                      "42px",
                    borderRadius:
                      "12px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    border:
                      `1px solid ${s.border}`,
                    flexShrink:
                      0,
                  }}
                >
                  <s.icon
                    size={20}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize:
                        "0.6875rem",
                      fontWeight:
                        800,
                      color:
                        "#64748b",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.05em",
                    }}
                  >
                    {s.label}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "1.2rem",
                      fontWeight:
                        900,
                      color:
                        "#0f172a",
                      lineHeight:
                        1.1,
                      marginTop:
                        "3px",
                    }}
                  >
                    {s.count}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* =================================================
              FILTER BAR
          ================================================= */}

          <div
            style={{
              backgroundColor:
                "white",
              border:
                "1px solid #e2e8f0",
              borderRadius:
                "16px",
              padding:
                "14px",
              marginBottom:
                "20px",
              boxShadow:
                "0 2px 8px rgba(15,23,42,0.03)",
            }}
          >
            <div
              className="beat-filter-grid"
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "minmax(220px, 1.4fr) repeat(3, minmax(145px, 1fr)) auto",
                gap:
                  "10px",
                alignItems:
                  "center",
              }}
            >
              {/* SEARCH */}

              <div
                style={{
                  position:
                    "relative",
                }}
              >
                <Search
                  size={16}
                  color="#94a3b8"
                  style={{
                    position:
                      "absolute",
                    left:
                      "12px",
                    top:
                      "50%",
                    transform:
                      "translateY(-50%)",
                    pointerEvents:
                      "none",
                  }}
                />

                <input
                  type="text"
                  placeholder="Search beats..."
                  value={
                    searchQuery
                  }
                  onChange={(e) =>
                    setSearchQuery(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    height:
                      "42px",
                    padding:
                      "0 12px 0 36px",
                    borderRadius:
                      "11px",
                    border:
                      "1px solid #cbd5e1",
                    fontSize:
                      "0.8rem",
                    fontWeight:
                      600,
                    outline:
                      "none",
                    backgroundColor:
                      "white",
                    color:
                      "#0f172a",
                  }}
                />
              </div>

              {/* ZONE FILTER */}

              <select
                value={
                  zoneFilter
                }
                onChange={(e) => {
                  setZoneFilter(
                    e.target
                      .value
                  );

                  setWardFilter(
                    "ALL"
                  );

                  setAreaFilter(
                    "ALL"
                  );
                }}
                style={
                  filterSelectStyle
                }
              >
                <option value="ALL">
                  All Zones
                </option>

                {availableZones.map(
                  (zone) => (
                    <option
                      key={zone}
                      value={zone}
                    >
                      {zone}
                    </option>
                  )
                )}
              </select>

              {/* WARD FILTER */}

              <select
                value={
                  wardFilter
                }
                onChange={(e) => {
                  setWardFilter(
                    e.target
                      .value
                  );

                  setAreaFilter(
                    "ALL"
                  );
                }}
                style={
                  filterSelectStyle
                }
              >
                <option value="ALL">
                  All Wards
                </option>

                {availableWards.map(
                  (ward) => (
                    <option
                      key={ward}
                      value={ward}
                    >
                      {ward}
                    </option>
                  )
                )}
              </select>

              {/* AREA FILTER */}

              <select
                value={
                  areaFilter
                }
                onChange={(e) =>
                  setAreaFilter(
                    e.target
                      .value
                  )
                }
                style={
                  filterSelectStyle
                }
              >
                <option value="ALL">
                  All Areas
                </option>

                {availableAreas.map(
                  (area) => (
                    <option
                      key={area}
                      value={area}
                    >
                      {area}
                    </option>
                  )
                )}
              </select>

              {/* RESET */}

              <button
                type="button"
                onClick={
                  resetFilters
                }
                disabled={
                  !hasActiveFilters
                }
                style={{
                  height:
                    "42px",
                  padding:
                    "0 14px",
                  borderRadius:
                    "11px",
                  border:
                    "1px solid #cbd5e1",
                  backgroundColor:
                    "#f8fafc",
                  color:
                    hasActiveFilters
                      ? "#475569"
                      : "#94a3b8",
                  fontSize:
                    "0.76rem",
                  fontWeight:
                    800,
                  cursor:
                    hasActiveFilters
                      ? "pointer"
                      : "default",
                  whiteSpace:
                    "nowrap",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap:
                    "6px",
                }}
              >
                <RotateCcw
                  size={14}
                />

                Reset
              </button>
            </div>

            <div
              style={{
                marginTop:
                  "10px",
                fontSize:
                  "0.7rem",
                color:
                  "#94a3b8",
                fontWeight:
                  700,
              }}
            >
              Showing{" "}
              {filteredBeats.length}{" "}
              of {beats.length}{" "}
              registered beats
            </div>
          </div>

          {/* =================================================
              CREATE BEAT MODAL
          ================================================= */}

          {!isReadOnly &&
            showCreateBeat && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(15,23,42,0.4)",
                  backdropFilter: "blur(4px)",
                  zIndex: 1000,

                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",

                  padding: "24px 16px",
                  boxSizing: "border-box",

                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    backgroundColor:
                      "white",
                    padding:
                      "32px",
                    borderRadius:
                      "24px",
                    border:
                      "1px solid #e2e8f0",
                    boxShadow:
                      "0 25px 50px -12px rgba(0,0,0,0.15)",
                    position:
                      "relative",
                    width:
                      "100%",
                    maxWidth:
                      "560px",
                    overflowY:
                      "auto",
                    maxHeight:
                      "90vh",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateBeat(
                        false
                      )
                    }
                    style={{
                      position:
                        "absolute",
                      top:
                        "20px",
                      right:
                        "20px",
                      background:
                        "transparent",
                      border:
                        "none",
                      cursor:
                        "pointer",
                      color:
                        "#64748b",
                    }}
                  >
                    <X
                      size={20}
                    />
                  </button>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "10px",
                      marginBottom:
                        "20px",
                      paddingBottom:
                        "12px",
                      borderBottom:
                        "1px solid #f1f5f9",
                    }}
                  >
                    <Target
                      size={22}
                      color="#2563eb"
                    />

                    <h2
                      style={{
                        fontSize:
                          "1.15rem",
                        fontWeight:
                          800,
                        margin:
                          0,
                        color:
                          "#0f172a",
                      }}
                    >
                      Create New Beat
                    </h2>
                  </div>

                  <BeatForm
                    onSuccess={() => {
                      loadBeats();

                      setShowCreateBeat(
                        false
                      );
                    }}
                    geoVersion={
                      geoVersion
                    }
                  />
                </div>
              </div>
            )}

          {/* =================================================
              REGISTERED BEATS TABLE
          ================================================= */}

          <section>
            {loading ? (
              <div
                style={{
                  padding:
                    "40px",
                  textAlign:
                    "center",
                  backgroundColor:
                    "white",
                  borderRadius:
                    "20px",
                  border:
                    "1px solid #e2e8f0",
                }}
              >
                <div
                  className="animate-spin"
                  style={{
                    width:
                      "32px",
                    height:
                      "32px",
                    border:
                      "4px solid #f3f3f3",
                    borderTop:
                      "4px solid #2563eb",
                    borderRadius:
                      "50%",
                    margin:
                      "0 auto",
                  }}
                />

                <p
                  style={{
                    marginTop:
                      "16px",
                    marginBottom:
                      0,
                    color:
                      "#64748b",
                    fontWeight:
                      600,
                  }}
                >
                  Loading beats...
                </p>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor:
                    "white",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius:
                    "20px",
                  overflow:
                    "hidden",
                  boxShadow:
                    "0 2px 4px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    padding:
                      "18px 24px",
                    borderBottom:
                      "1px solid #f1f5f9",
                    backgroundColor:
                      "#fcfdfe",
                  }}
                >
                  <h3
                    style={{
                      margin:
                        0,
                      fontSize:
                        "0.95rem",
                      fontWeight:
                        900,
                      color:
                        "#0f172a",
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.04em",
                    }}
                  >
                    Registered Beats (
                    {
                      filteredBeats.length
                    }
                    )
                  </h3>
                </div>

                <BeatTable
                  beats={
                    filteredBeats
                  }
                  onRefresh={
                    loadBeats
                  }
                  onView={
                    setViewingBeat
                  }
                  onEdit={
                    setEditingBeat
                  }
                  onViewData={
                    setInspectingBeat
                  }
                  onAssign={
                    setAssigningBeat
                  }
                  onAssignEmployees={
                    setDeployingBeat
                  }
                  onViewUser={(
                    beat
                  ) =>
                    setDeployingBeat(
                      beat
                    )
                  }
                  assignmentActionLabel="Assign Supervisor"
                  isReadOnly={
                    isReadOnly
                  }
                />
              </div>
            )}
          </section>
        </div>

        {/* ===================================================
            EXISTING BEAT MODALS
        =================================================== */}

        {viewingBeat && (
          <BeatMapView
            beat={
              viewingBeat
            }
            onClose={() =>
              setViewingBeat(
                null
              )
            }
            onEdit={(b: any) => {
              setViewingBeat(
                null
              );

              setEditingBeat(
                b
              );
            }}
            onRefresh={
              loadBeats
            }
          />
        )}

        {editingBeat && (
          <EditBeatModal
            beat={
              editingBeat
            }
            onClose={() =>
              setEditingBeat(
                null
              )
            }
            onSuccess={
              loadBeats
            }
          />
        )}

        {inspectingBeat && (
          <KMLDataViewer
            beat={
              inspectingBeat
            }
            onClose={() =>
              setInspectingBeat(
                null
              )
            }
          />
        )}

        {assigningBeat && (
          <AssignBeatModal
            beat={
              assigningBeat
            }
            mode="SUPERVISOR"
            onClose={() =>
              setAssigningBeat(
                null
              )
            }
            onSuccess={
              loadBeats
            }
          />
        )}

        {deployingBeat && (
          <AssignBeatModal
            beat={
              deployingBeat
            }
            mode="EMPLOYEE"
            onClose={() =>
              setDeployingBeat(
                null
              )
            }
            onSuccess={
              loadBeats
            }
          />
        )}

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

          @media (max-width: 1050px) {
            .beat-filter-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 650px) {
            .beat-filter-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </RoleGuard>
  );
}

/* ===========================================================
   FILTER STYLE
=========================================================== */

const filterSelectStyle:
  React.CSSProperties = {
  width: "100%",
  height: "42px",
  padding: "0 12px",
  borderRadius: "11px",
  border:
    "1px solid #cbd5e1",
  backgroundColor:
    "white",
  color:
    "#334155",
  fontSize:
    "0.8rem",
  fontWeight:
    700,
  outline:
    "none",
  cursor:
    "pointer",
};