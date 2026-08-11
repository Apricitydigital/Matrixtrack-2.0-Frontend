"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileText,
  Loader2,
  MapPin,
  MoreVertical,
  Route,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { AreaBeatApi } from "@lib/apiClient";

interface BeatTableProps {
  beats: any[];
  onRefresh: () => void;
  onView: (beat: any) => void;
  onEdit: (beat: any) => void;
  onViewData: (beat: any) => void;
  onAssign: (beat: any) => void;
  onAssignEmployees?: (beat: any) => void;
  onViewUser?: (beat: any, userId: string) => void;
  assignmentActionLabel?: string;
  isQC?: boolean;
  isAO?: boolean;
  isReadOnly?: boolean;
}

type BeatCoordinate = {
  lat: number;
  lng: number;
  name?: string;
};

const POINT_TARGET = 5;

export default function BeatTable({
  beats,
  onRefresh,
  onView,
  onEdit,
  onViewData,
  isQC = false,
  isAO = false,
  isReadOnly = false,
}: BeatTableProps) {
  const router = useRouter();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const totalPages = Math.max(1, Math.ceil(beats.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [beats, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (openActionId) setOpenActionId(null);
    };

    if (openActionId) {
      window.addEventListener("click", handleGlobalClick);
    }

    return () => window.removeEventListener("click", handleGlobalClick);
  }, [openActionId]);

  const paginatedBeats = useMemo(() => {
    const start = (page - 1) * pageSize;
    return beats.slice(start, start + pageSize);
  }, [beats, page, pageSize]);

  const startItem = beats.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, beats.length);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this beat?")) return;

    setDeletingId(id);
    try {
      await AreaBeatApi.remove(id);
      onRefresh();
    } catch {
      alert("Failed to delete beat");
    } finally {
      setDeletingId(null);
    }
  };

  const goToSupervisorAssignment = () => {
    setOpenActionId(null);
    router.push("/city/beats/assignments?view=supervisor");
  };

  const goToEmployeeAssignment = () => {
    setOpenActionId(null);
    router.push("/city/beats/assignments?view=employee");
  };

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "visible",
        borderRadius: "20px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid #f1f5f9",
          background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
          borderRadius: "20px 20px 0 0",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "-0.01em",
            }}
          >
            Registered Beats
          </h3>

          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            Beat registration, points, location and workforce assignment summary
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
          <span
            style={{
              fontSize: "0.7rem",
              color: "#64748b",
              fontWeight: 750,
            }}
          >
            {beats.length} record{beats.length === 1 ? "" : "s"}
          </span>

          {isReadOnly && (
            <span
              style={{
                fontSize: "0.64rem",
                fontWeight: 850,
                color: "#64748b",
                backgroundColor: "#f1f5f9",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              READ ONLY
            </span>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: "1650px",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead
            style={{
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <tr>
              <th style={headCell(58)}>Sr. No.</th>
              <th style={headCell(115)}>Beat Number</th>
              <th style={headCell(175)}>Beat Name</th>
              <th style={headCell(245)}>Latitude / Longitude</th>
              <th style={headCell(115)}>Zone</th>
              <th style={headCell(115)}>Ward</th>
              <th style={headCell(135)}>Area</th>
              <th style={headCell(150)}>Registered On</th>
              <th style={headCell(205)}>5 Point Registration</th>
              <th style={headCell(145)}>Supervisors</th>
              <th style={headCell(145)}>Employees</th>
              <th style={{ ...headCell(90), textAlign: "right" }}>Action</th>
            </tr>
          </thead>

          <tbody style={{ backgroundColor: "white" }}>
            {paginatedBeats.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  style={{
                    padding: "64px 24px",
                    textAlign: "center",
                    color: "#64748b",
                    fontWeight: 650,
                  }}
                >
                  No registered beats found.
                </td>
              </tr>
            ) : (
              paginatedBeats.map((beat, pageIndex) => {
                const absoluteIndex = (page - 1) * pageSize + pageIndex;
                const coordinates = getBeatCoordinates(beat);
                const pointCount = getRegisteredPointCount(beat, coordinates);
                const remainingPoints = Math.max(0, POINT_TARGET - pointCount);
                const firstPoint = coordinates[0];
                const lastPoint =
                  coordinates.length > 1
                    ? coordinates[coordinates.length - 1]
                    : undefined;

                const supervisorCount = getSupervisorCount(beat);
                const employeeCount = getEmployeeCount(beat);

                return (
                  <tr
                    key={beat.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fbfdff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                    }}
                    onClick={() => onView(beat)}
                  >
                    <td style={bodyCell()}>
                      <span
                        style={{
                          fontSize: "0.76rem",
                          fontWeight: 850,
                          color: "#64748b",
                        }}
                      >
                        {absoluteIndex + 1}
                      </span>
                    </td>

                    <td style={bodyCell()}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 9px",
                          borderRadius: "8px",
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          color: "#334155",
                          fontSize: "0.72rem",
                          fontWeight: 850,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getBeatNumber(beat, absoluteIndex)}
                      </span>
                    </td>

                    <td style={bodyCell()}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #dbeafe",
                            flexShrink: 0,
                          }}
                        >
                          <Route size={16} />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            maxWidth: "170px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: 850,
                              color: "#0f172a",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={beat.beatName || "Registered Beat"}
                          >
                            {beat.beatName || "Registered Beat"}
                          </div>

                          {beat.beatCode && beat.beatCode !== getBeatNumber(beat, absoluteIndex) && (
                            <div
                              style={{
                                marginTop: "3px",
                                fontSize: "0.64rem",
                                color: "#94a3b8",
                                fontWeight: 700,
                              }}
                            >
                              {beat.beatCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={bodyCell()}>
                      {firstPoint ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "5px",
                            minWidth: "210px",
                          }}
                        >
                          <CoordinateRow
                            label={lastPoint ? "Start" : "Point"}
                            point={firstPoint}
                          />

                          {lastPoint && (
                            <CoordinateRow label="End" point={lastPoint} />
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: "0.72rem",
                            fontWeight: 650,
                          }}
                        >
                          Coordinates not available
                        </span>
                      )}
                    </td>

                    <td style={bodyCell()}>
                      <GeoValue value={beat.zoneName} fallback="—" />
                    </td>

                    <td style={bodyCell()}>
                      <GeoValue value={beat.wardName} fallback="—" />
                    </td>

                    <td style={bodyCell()}>
                      <GeoValue value={beat.areaName} fallback="—" />
                    </td>

                    <td style={bodyCell()}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 780,
                            color: "#1e293b",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(beat.createdAt)}
                        </span>

                        <span
                          style={{
                            fontSize: "0.66rem",
                            color: "#94a3b8",
                            marginTop: "3px",
                            fontWeight: 650,
                          }}
                        >
                          {formatTime(beat.createdAt)}
                        </span>
                      </div>
                    </td>

                    <td style={bodyCell()}>
                      <PointProgress
                        registered={pointCount}
                        remaining={remainingPoints}
                      />
                    </td>

                    <td style={bodyCell()}>
                      <AssignmentCount
                        count={supervisorCount}
                        label="Supervisor"
                        tone="blue"
                      />
                    </td>

                    <td style={bodyCell()}>
                      <AssignmentCount
                        count={employeeCount}
                        label="Employee"
                        tone="green"
                      />
                    </td>

                    <td
                      style={{
                        ...bodyCell(),
                        textAlign: "right",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          aria-label="Open beat actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(
                              openActionId === beat.id ? null : beat.id
                            );
                          }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            backgroundColor:
                              openActionId === beat.id ? "#f8fafc" : "white",
                            color: "#64748b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      {openActionId === beat.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            right: 44,
                            top: 4,
                            width: 220,
                            backgroundColor: "white",
                            borderRadius: 12,
                            boxShadow: "0 20px 35px -10px rgba(15,23,42,0.2)",
                            border: "1px solid #e2e8f0",
                            zIndex: 100,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            padding: 6,
                          }}
                        >
                          <MenuBtn
                            icon={<Eye size={16} />}
                            label="View on Map"
                            onClick={() => {
                              onView(beat);
                              setOpenActionId(null);
                            }}
                          />

                          <MenuBtn
                            icon={<FileText size={16} />}
                            label="View KML Data"
                            onClick={() => {
                              onViewData(beat);
                              setOpenActionId(null);
                            }}
                          />

                          {!isAO && !isReadOnly && (
                            <>
                              <MenuBtn
                                icon={<UserPlus size={16} />}
                                label="Assign Supervisor"
                                color="#2563eb"
                                hover="#eff6ff"
                                onClick={goToSupervisorAssignment}
                              />

                              <MenuBtn
                                icon={<Users size={16} />}
                                label="Assign Employee"
                                color="#059669"
                                hover="#ecfdf5"
                                onClick={goToEmployeeAssignment}
                              />
                            </>
                          )}

                          {!isQC && !isReadOnly && (
                            <MenuBtn
                              icon={<Edit2 size={16} />}
                              label="Edit Beat"
                              onClick={() => {
                                onEdit(beat);
                                setOpenActionId(null);
                              }}
                            />
                          )}

                          {!isQC && !isReadOnly && (
                            <MenuBtn
                              icon={
                                deletingId === beat.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )
                              }
                              label="Delete Beat"
                              color="#dc2626"
                              hover="#fef2f2"
                              onClick={() => {
                                handleDelete(beat.id);
                                setOpenActionId(null);
                              }}
                            />
                          )}
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

      <div
        style={{
          padding: "14px 18px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
          backgroundColor: "#fcfdff",
          borderRadius: "0 0 20px 20px",
        }}
      >
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#64748b",
          }}
        >
          Showing <strong style={{ color: "#0f172a" }}>{startItem}</strong>–
          <strong style={{ color: "#0f172a" }}>{endItem}</strong> of{" "}
          <strong style={{ color: "#0f172a" }}>{beats.length}</strong> beats
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#64748b",
            }}
          >
            Rows
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                height: "34px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "white",
                color: "#334155",
                fontSize: "0.72rem",
                fontWeight: 750,
                padding: "0 8px",
                outline: "none",
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            style={paginationButton(page === 1)}
          >
            <ChevronLeft size={15} />
          </button>

          <span
            style={{
              minWidth: "82px",
              textAlign: "center",
              fontSize: "0.72rem",
              fontWeight: 800,
              color: "#334155",
            }}
          >
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={page === totalPages}
            style={paginationButton(page === totalPages)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function getBeatNumber(beat: any, index: number): string {
  const raw =
    beat?.beatNumber ??
    beat?.beatNo ??
    beat?.beatCode ??
    beat?.code;

  if (raw !== null && raw !== undefined && String(raw).trim()) {
    return String(raw);
  }

  return `BEAT-${String(index + 1).padStart(2, "0")}`;
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

  if (beat?.employeeAssignedToId) {
    ids.add(String(beat.employeeAssignedToId));
  }

  if (beat?.employeeId) {
    ids.add(String(beat.employeeId));
  }

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

function PointProgress({
  registered,
  remaining,
}: {
  registered: number;
  remaining: number;
}) {
  const progress = Math.min(100, Math.round((registered / POINT_TARGET) * 100));
  const complete = remaining === 0;

  return (
    <div style={{ minWidth: "175px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 850,
            color: complete ? "#059669" : "#2563eb",
          }}
        >
          {registered} registered
        </span>

        <span
          style={{
            fontSize: "0.66rem",
            fontWeight: 750,
            color: remaining > 0 ? "#d97706" : "#059669",
          }}
        >
          {remaining > 0 ? `${remaining} remaining` : "Target met"}
        </span>
      </div>

      <div
        style={{
          width: "100%",
          height: "6px",
          borderRadius: "999px",
          backgroundColor: "#eaf0f7",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: "999px",
            backgroundColor: complete ? "#10b981" : "#3b82f6",
            transition: "width .25s ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: "5px",
          fontSize: "0.61rem",
          color: "#94a3b8",
          fontWeight: 700,
        }}
      >
        Target: {POINT_TARGET} points
      </div>
    </div>
  );
}

function AssignmentCount({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "blue" | "green";
}) {
  const active = count > 0;

  const colors =
    tone === "blue"
      ? {
          bg: active ? "#eff6ff" : "#f8fafc",
          border: active ? "#bfdbfe" : "#e2e8f0",
          text: active ? "#2563eb" : "#94a3b8",
        }
      : {
          bg: active ? "#ecfdf5" : "#f8fafc",
          border: active ? "#a7f3d0" : "#e2e8f0",
          text: active ? "#059669" : "#94a3b8",
        };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "7px 10px",
        borderRadius: "10px",
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        whiteSpace: "nowrap",
      }}
    >
      <Users size={14} />

      <div>
        <div
          style={{
            fontSize: "0.78rem",
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {count}
        </div>

        <div
          style={{
            marginTop: "3px",
            fontSize: "0.58rem",
            fontWeight: 750,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {count === 1 ? label : `${label}s`}
        </div>
      </div>
    </div>
  );
}

function parseGeometry(geometry: any): any {
  if (!geometry) return null;

  if (typeof geometry === "string") {
    try {
      return JSON.parse(geometry);
    } catch {
      return null;
    }
  }

  return geometry;
}

function geometryCoordinates(geometry: any): BeatCoordinate[] {
  const g = parseGeometry(geometry);
  if (!g) return [];

  if (g.type === "FeatureCollection") {
    return (g.features || []).flatMap((feature: any) =>
      geometryCoordinates(feature?.geometry)
    );
  }

  if (g.type === "Feature") {
    return geometryCoordinates(g.geometry);
  }

  if (g.type === "Point") {
    const [lng, lat] = g.coordinates || [];
    return isCoordinate(lat, lng) ? [{ lat: Number(lat), lng: Number(lng) }] : [];
  }

  if (g.type === "LineString") {
    return (g.coordinates || [])
      .map((coordinate: any) => {
        const [lng, lat] = coordinate || [];
        return isCoordinate(lat, lng)
          ? { lat: Number(lat), lng: Number(lng) }
          : null;
      })
      .filter(Boolean) as BeatCoordinate[];
  }

  if (g.type === "MultiLineString" || g.type === "Polygon") {
    return (g.coordinates || []).flatMap((line: any[]) =>
      (line || [])
        .map((coordinate: any) => {
          const [lng, lat] = coordinate || [];
          return isCoordinate(lat, lng)
            ? { lat: Number(lat), lng: Number(lng) }
            : null;
        })
        .filter(Boolean)
    ) as BeatCoordinate[];
  }

  if (g.type === "MultiPolygon") {
    return (g.coordinates || []).flatMap((polygon: any[]) =>
      (polygon || []).flatMap((line: any[]) =>
        (line || [])
          .map((coordinate: any) => {
            const [lng, lat] = coordinate || [];
            return isCoordinate(lat, lng)
              ? { lat: Number(lat), lng: Number(lng) }
              : null;
          })
          .filter(Boolean)
      )
    ) as BeatCoordinate[];
  }

  return [];
}

function getBeatCoordinates(beat: any): BeatCoordinate[] {
  const directPoints: BeatCoordinate[] = Array.isArray(beat?.points)
    ? beat.points
        .map((point: any, index: number) => {
          const lat = point?.latitude ?? point?.lat;
          const lng = point?.longitude ?? point?.lng ?? point?.lon;

          if (!isCoordinate(lat, lng)) return null;

          return {
            lat: Number(lat),
            lng: Number(lng),
            name: point?.name || `Point ${index + 1}`,
          };
        })
        .filter(Boolean)
    : [];

  if (directPoints.length > 0) return dedupeCoordinates(directPoints);

  const beatGeometry = geometryCoordinates(beat?.geometry);
  if (beatGeometry.length > 0) return dedupeCoordinates(beatGeometry);

  const fallbackFromBeatParts = Array.isArray(beat?.segments)
    ? beat.segments.flatMap((part: any) => geometryCoordinates(part?.geometry))
    : [];

  return dedupeCoordinates(fallbackFromBeatParts);
}

function getRegisteredPointCount(
  beat: any,
  coordinates: BeatCoordinate[]
): number {
  if (typeof beat?.totalPoints === "number") {
    return Math.max(0, beat.totalPoints);
  }

  if (Array.isArray(beat?.points)) {
    return beat.points.length;
  }

  return coordinates.length;
}

function dedupeCoordinates(points: BeatCoordinate[]): BeatCoordinate[] {
  const seen = new Set<string>();

  return points.filter((point) => {
    const key = `${point.lat.toFixed(7)}:${point.lng.toFixed(7)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCoordinate(lat: any, lng: any): boolean {
  return (
    lat !== null &&
    lat !== undefined &&
    lng !== null &&
    lng !== undefined &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))
  );
}

function CoordinateRow({
  label,
  point,
}: {
  label: string;
  point: BeatCoordinate;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.69rem",
      }}
    >
      <span
        style={{
          width: "34px",
          color: "#94a3b8",
          fontWeight: 850,
          textTransform: "uppercase",
          fontSize: "0.56rem",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "#334155",
          fontWeight: 720,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
      </span>
    </div>
  );
}

function GeoValue({ value, fallback }: { value?: string; fallback: string }) {
  return (
    <span
      style={{
        fontSize: "0.76rem",
        fontWeight: 720,
        color: value ? "#475569" : "#94a3b8",
        whiteSpace: "nowrap",
      }}
    >
      {value || fallback}
    </span>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function headCell(width?: number): React.CSSProperties {
  return {
    padding: "12px 13px",
    fontSize: "0.65rem",
    fontWeight: 900,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.045em",
    whiteSpace: "nowrap",
    ...(width ? { width } : {}),
  };
}

function bodyCell(): React.CSSProperties {
  return {
    padding: "13px",
    verticalAlign: "middle",
  };
}

function paginationButton(disabled: boolean): React.CSSProperties {
  return {
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    border: "1px solid #cbd5e1",
    backgroundColor: disabled ? "#f8fafc" : "#ffffff",
    color: disabled ? "#cbd5e1" : "#334155",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function MenuBtn({
  icon,
  label,
  onClick,
  color = "#475569",
  hover = "#f8fafc",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  hover?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 8,
        border: "none",
        backgroundColor: "transparent",
        color,
        cursor: "pointer",
        width: "100%",
        fontSize: "0.8rem",
        fontWeight: 700,
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}