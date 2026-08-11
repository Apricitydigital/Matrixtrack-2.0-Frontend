"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Activity,
  CircleDot,
  FileText,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";

const BeatMapView = dynamic<BeatMapViewProps>(
  () => import("./components/BeatMapView"),
  { ssr: false }
);

const POINT_TARGET = 5;

export default function BeatsPage() {
  const { user } = useAuth();

  const isReadOnly = user?.roles?.some((r) =>
    ["COMMISSIONER", "ULB_OFFICER"].includes(r)
  );

  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const [viewingBeat, setViewingBeat] = useState<any | null>(null);
  const [editingBeat, setEditingBeat] = useState<any | null>(null);
  const [inspectingBeat, setInspectingBeat] = useState<any | null>(null);
  const [assigningBeat, setAssigningBeat] = useState<any | null>(null);
  const [deployingBeat, setDeployingBeat] = useState<any | null>(null);
  const [showCreateBeat, setShowCreateBeat] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [wardFilter, setWardFilter] = useState("ALL");
  const [areaFilter, setAreaFilter] = useState("ALL");

  const [geoVersion] = useState(0);

  const stats = useMemo(() => {
    const total = beats.length;

    const totalRegisteredPoints = beats.reduce(
      (sum, beat) => sum + getRegisteredPointCount(beat),
      0
    );

    const totalRequiredPoints = total * POINT_TARGET;

    const remainingPoints = beats.reduce(
      (sum, beat) =>
        sum + Math.max(0, POINT_TARGET - getRegisteredPointCount(beat)),
      0
    );

    const pointCompleteBeats = beats.filter(
      (beat) => getRegisteredPointCount(beat) >= POINT_TARGET
    ).length;

    const supervisorAssigned = beats.filter(
      (beat) => getSupervisorCount(beat) > 0
    ).length;

    const employeeAssigned = beats.filter(
      (beat) => getEmployeeCount(beat) > 0
    ).length;

    const totalSupervisors = beats.reduce(
      (sum, beat) => sum + getSupervisorCount(beat),
      0
    );

    const totalEmployees = beats.reduce(
      (sum, beat) => sum + getEmployeeCount(beat),
      0
    );

    return {
      total,
      totalRegisteredPoints,
      totalRequiredPoints,
      remainingPoints,
      pointCompleteBeats,
      supervisorAssigned,
      employeeAssigned,
      totalSupervisors,
      totalEmployees,
    };
  }, [beats]);

  const availableZones = useMemo(() => {
    return Array.from(
      new Set(beats.map((beat) => beat.zoneName).filter(Boolean))
    ).sort();
  }, [beats]);

  const availableWards = useMemo(() => {
    return Array.from(
      new Set(
        beats
          .filter((beat) =>
            zoneFilter === "ALL" ? true : beat.zoneName === zoneFilter
          )
          .map((beat) => beat.wardName)
          .filter(Boolean)
      )
    ).sort();
  }, [beats, zoneFilter]);

  const availableAreas = useMemo(() => {
    return Array.from(
      new Set(
        beats
          .filter((beat) =>
            zoneFilter === "ALL" ? true : beat.zoneName === zoneFilter
          )
          .filter((beat) =>
            wardFilter === "ALL" ? true : beat.wardName === wardFilter
          )
          .map((beat) => beat.areaName)
          .filter(Boolean)
      )
    ).sort();
  }, [beats, zoneFilter, wardFilter]);

  const filteredBeats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return beats.filter((beat) => {
      const matchesSearch =
        !q ||
        beat.beatName?.toLowerCase().includes(q) ||
        beat.beatCode?.toLowerCase().includes(q) ||
        String(beat.beatNumber || "").toLowerCase().includes(q) ||
        beat.zoneName?.toString().toLowerCase().includes(q) ||
        beat.wardName?.toString().toLowerCase().includes(q) ||
        beat.areaName?.toLowerCase().includes(q);

      const matchesZone =
        zoneFilter === "ALL" || beat.zoneName === zoneFilter;

      const matchesWard =
        wardFilter === "ALL" || beat.wardName === wardFilter;

      const matchesArea =
        areaFilter === "ALL" || beat.areaName === areaFilter;

      return matchesSearch && matchesZone && matchesWard && matchesArea;
    });
  }, [beats, searchQuery, zoneFilter, wardFilter, areaFilter]);

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

  const loadBeats = useCallback(async () => {
    try {
      setLoading(true);

      const [beatsRes, pendingRes] = await Promise.allSettled([
        AreaBeatApi.list(),
        AreaBeatApi.listPendingRequests(),
      ]);

      if (beatsRes.status === "fulfilled") {
        setBeats(beatsRes.value.beats || []);
      }

      if (pendingRes.status === "fulfilled") {
        setPendingCount(pendingRes.value.pendingBeats?.length || 0);
      }
    } catch (err) {
      console.error("Failed to load beats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeats();
  }, [loadBeats]);

  const exportRows = filteredBeats.map((beat, index) => ({
    SrNo: index + 1,
    BeatNumber:
      beat.beatNumber ||
      beat.beatNo ||
      beat.beatCode ||
      `BEAT-${String(index + 1).padStart(2, "0")}`,
    BeatName: beat.beatName || beat.name || "-",
    Zone: beat.zoneName || "-",
    Ward: beat.wardName || "-",
    Area: beat.areaName || "-",
    RegisteredPoints: getRegisteredPointCount(beat),
    PointTarget: POINT_TARGET,
    RemainingPoints: Math.max(
      0,
      POINT_TARGET - getRegisteredPointCount(beat)
    ),
    SupervisorCount: getSupervisorCount(beat),
    EmployeeCount: getEmployeeCount(beat),
    RegisteredOn: beat.createdAt || "-",
  }));

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
        <div style={{ width: "100%" }}>
          <div
            style={{
              marginBottom: "24px",
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
                <span>Beats</span>
                <span>/</span>
                <span style={{ color: "#3b82f6" }}>Beat Management</span>
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
                Beat Management
              </h1>

              <p
                style={{
                  marginTop: "2px",
                  marginBottom: 0,
                  color: "#64748b",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                Registered beat details, geo points and workforce assignment.
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
              <TableExportDropdown
                data={exportRows}
                filename="Registered_Beats"
                title="Registered Beats Report"
              />

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setShowCreateBeat(true)}
                  style={primaryButton}
                >
                  <Plus size={15} />
                  Create Beat
                </button>
              )}

              {!isReadOnly && (
                <>
                  <Link
                    href="/city/beat-requests"
                    style={{
                      height: "40px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 700,
                      padding: "0 14px",
                      backgroundColor: pendingCount > 0 ? "#fef3c7" : "white",
                      border:
                        pendingCount > 0
                          ? "1px solid #fde68a"
                          : "1px solid #cbd5e1",
                      color: pendingCount > 0 ? "#b45309" : "#0f172a",
                      textDecoration: "none",
                      fontSize: "0.8rem",
                    }}
                  >
                    <FileText size={15} />
                    <span>Beat Requests</span>

                    {pendingCount > 0 && (
                      <span
                        style={{
                          backgroundColor: "#d97706",
                          color: "white",
                          borderRadius: "9999px",
                          padding: "1px 6px",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                        }}
                      >
                        {pendingCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/city/beats/assignments?view=employee"
                    style={secondaryLinkButton}
                  >
                    <Users size={15} />
                    <span>Employee Assignment</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div
            className="beat-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <StatCard
              label="Total Registered Beats"
              value={stats.total}
              helper={`${stats.pointCompleteBeats} point-complete`}
              icon={<Target size={19} />}
              tone="blue"
            />

            <StatCard
              label="Registered Points"
              value={stats.totalRegisteredPoints}
              helper={`Target ${stats.totalRequiredPoints}`}
              icon={<CircleDot size={19} />}
              tone="violet"
            />

            <StatCard
              label="Points Remaining"
              value={stats.remainingPoints}
              helper={`5 required per beat`}
              icon={<Activity size={19} />}
              tone="orange"
            />

            <StatCard
              label="Supervisor Assigned Beats"
              value={stats.supervisorAssigned}
              helper={`${stats.totalSupervisors} assignment(s)`}
              icon={<ShieldCheck size={19} />}
              tone="green"
            />

            <StatCard
              label="Employee Assigned Beats"
              value={stats.employeeAssigned}
              helper={`${stats.totalEmployees} employee assignment(s)`}
              icon={<Users size={19} />}
              tone="cyan"
            />
          </div>

          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "14px",
              marginBottom: "20px",
              boxShadow: "0 2px 8px rgba(15,23,42,0.03)",
            }}
          >
            <div
              className="beat-filter-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px, 1.4fr) repeat(3, minmax(145px, 1fr)) auto",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  color="#94a3b8"
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />

                <input
                  type="text"
                  placeholder="Search beat number, name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    height: "42px",
                    padding: "0 12px 0 36px",
                    borderRadius: "11px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    outline: "none",
                    backgroundColor: "white",
                    color: "#0f172a",
                  }}
                />
              </div>

              <select
                value={zoneFilter}
                onChange={(e) => {
                  setZoneFilter(e.target.value);
                  setWardFilter("ALL");
                  setAreaFilter("ALL");
                }}
                style={filterSelectStyle}
              >
                <option value="ALL">All Zones</option>
                {availableZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>

              <select
                value={wardFilter}
                onChange={(e) => {
                  setWardFilter(e.target.value);
                  setAreaFilter("ALL");
                }}
                style={filterSelectStyle}
              >
                <option value="ALL">All Wards</option>
                {availableWards.map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>

              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="ALL">All Areas</option>
                {availableAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                style={{
                  height: "42px",
                  padding: "0 14px",
                  borderRadius: "11px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: hasActiveFilters ? "#475569" : "#94a3b8",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  cursor: hasActiveFilters ? "pointer" : "default",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>

            <div
              style={{
                marginTop: "10px",
                fontSize: "0.7rem",
                color: "#94a3b8",
                fontWeight: 700,
              }}
            >
              Showing {filteredBeats.length} of {beats.length} registered beats
            </div>
          </div>

          {!isReadOnly && showCreateBeat && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(15,23,42,0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "32px",
                  borderRadius: "24px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
                  position: "relative",
                  width: "100%",
                  maxWidth: "560px",
                  overflowY: "auto",
                  maxHeight: "90vh",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateBeat(false)}
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  <X size={20} />
                </button>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "20px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <Target size={22} color="#2563eb" />
                  <h2
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    Create New Beat
                  </h2>
                </div>

                <BeatForm
                  onSuccess={() => {
                    loadBeats();
                    setShowCreateBeat(false);
                  }}
                  geoVersion={geoVersion}
                />
              </div>
            </div>
          )}

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

                <p
                  style={{
                    marginTop: "16px",
                    marginBottom: 0,
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  Loading beats...
                </p>
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

        {viewingBeat && (
          <BeatMapView
            beat={viewingBeat}
            onClose={() => setViewingBeat(null)}
            onEdit={(beat: any) => {
              setViewingBeat(null);
              setEditingBeat(beat);
            }}
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
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 1350px) {
            .beat-stats-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 1050px) {
            .beat-filter-grid {
              grid-template-columns: 1fr 1fr !important;
            }

            .beat-stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 650px) {
            .beat-filter-grid,
            .beat-stats-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </RoleGuard>
  );
}

function getRegisteredPointCount(beat: any): number {
  if (typeof beat?.totalPoints === "number") {
    return Math.max(0, beat.totalPoints);
  }

  if (Array.isArray(beat?.points)) {
    return beat.points.length;
  }

  return getGeometryPointCount(beat?.geometry);
}

function getSupervisorCount(beat: any): number {
  const ids = new Set<string>();

  if (Array.isArray(beat?.supervisorsSummary)) {
    beat.supervisorsSummary.forEach((item: any) => {
      const value = item?.id ?? item?.name;
      if (value) ids.add(String(value));
    });
  }

  if (beat?.assignedToId) ids.add(String(beat.assignedToId));
  if (beat?.supervisorId) ids.add(String(beat.supervisorId));

  return ids.size;
}

function getEmployeeCount(beat: any): number {
  const ids = new Set<string>();

  if (Array.isArray(beat?.employeesSummary)) {
    beat.employeesSummary.forEach((item: any) => {
      const value = item?.id ?? item?.name;
      if (value) ids.add(String(value));
    });
  }

  if (beat?.employeeAssignedToId) ids.add(String(beat.employeeAssignedToId));
  if (beat?.employeeId) ids.add(String(beat.employeeId));

  if (Array.isArray(beat?.segments)) {
    beat.segments.forEach((item: any) => {
      const value =
        item?.employeeAssignedToId ??
        item?.employee?.id ??
        item?.employeeAssignedToName ??
        item?.employee?.name;

      if (value) ids.add(String(value));
    });
  }

  return ids.size;
}

function getGeometryPointCount(geometry: any): number {
  if (!geometry) return 0;

  let parsed = geometry;

  if (typeof geometry === "string") {
    try {
      parsed = JSON.parse(geometry);
    } catch {
      return 0;
    }
  }

  if (parsed?.type === "Feature") {
    return getGeometryPointCount(parsed.geometry);
  }

  if (parsed?.type === "FeatureCollection") {
    return (parsed.features || []).reduce(
      (sum: number, feature: any) => sum + getGeometryPointCount(feature?.geometry),
      0
    );
  }

  if (parsed?.type === "Point") return 1;

  if (parsed?.type === "LineString") {
    return Array.isArray(parsed.coordinates) ? parsed.coordinates.length : 0;
  }

  if (parsed?.type === "MultiLineString" || parsed?.type === "Polygon") {
    return (parsed.coordinates || []).reduce(
      (sum: number, line: any[]) => sum + (Array.isArray(line) ? line.length : 0),
      0
    );
  }

  if (parsed?.type === "MultiPolygon") {
    return (parsed.coordinates || []).reduce(
      (sum: number, polygon: any[]) =>
        sum +
        (polygon || []).reduce(
          (inner: number, line: any[]) =>
            inner + (Array.isArray(line) ? line.length : 0),
          0
        ),
      0
    );
  }

  return 0;
}

function StatCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  tone: "blue" | "green" | "orange" | "violet" | "cyan";
}) {
  const tones = {
    blue: {
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#dbeafe",
    },
    green: {
      color: "#059669",
      bg: "#ecfdf5",
      border: "#d1fae5",
    },
    orange: {
      color: "#d97706",
      bg: "#fff7ed",
      border: "#fed7aa",
    },
    violet: {
      color: "#7c3aed",
      bg: "#f5f3ff",
      border: "#ddd6fe",
    },
    cyan: {
      color: "#0891b2",
      bg: "#ecfeff",
      border: "#cffafe",
    },
  };

  const selected = tones[tone];

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "14px 15px",
        borderRadius: "15px",
        border: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          backgroundColor: selected.bg,
          color: selected.color,
          width: "40px",
          height: "40px",
          borderRadius: "11px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${selected.border}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.62rem",
            fontWeight: 850,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.045em",
            lineHeight: 1.25,
          }}
        >
          {label}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "7px",
            marginTop: "3px",
            minWidth: 0,
          }}
        >
          <strong
            style={{
              fontSize: "1.18rem",
              color: "#0f172a",
              lineHeight: 1,
            }}
          >
            {value}
          </strong>

          <span
            style={{
              color: "#94a3b8",
              fontSize: "0.62rem",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={helper}
          >
            {helper}
          </span>
        </div>
      </div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  height: "40px",
  padding: "0 16px",
  borderRadius: "10px",
  backgroundColor: "#2563eb",
  border: "none",
  color: "white",
  fontWeight: 700,
  fontSize: "0.8rem",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
};

const secondaryLinkButton: React.CSSProperties = {
  height: "40px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontWeight: 700,
  padding: "0 14px",
  backgroundColor: "white",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  textDecoration: "none",
  fontSize: "0.8rem",
};

const filterSelectStyle: React.CSSProperties = {
  width: "100%",
  height: "42px",
  padding: "0 12px",
  borderRadius: "11px",
  border: "1px solid #cbd5e1",
  backgroundColor: "white",
  color: "#334155",
  fontSize: "0.8rem",
  fontWeight: 700,
  outline: "none",
  cursor: "pointer",
};