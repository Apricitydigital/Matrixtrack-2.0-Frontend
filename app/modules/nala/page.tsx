'use client';

import React, { useCallback, useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ModuleRecordsApi, NalaApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import SubmittedReportsTab from "../qc-shared/SubmittedReportsTab";
import NalaStaffAssignmentsTab from "./components/NalaStaffAssignmentsTab";
import NalaMasterTab from "./components/NalaMasterTab";
import NalaReviewModal from "./components/NalaReviewModal";
import NalaRequestsTab from "./components/NalaRequestsTab";
import dynamic from "next/dynamic";

// Leaflet needs the browser (Sweeping: GlobalBeatMapView).
const NalaMapView = dynamic(() => import("./components/NalaMapView"), { ssr: false });

type NalaTab =
  | "dashboard"
  | "submitted_reports"
  | "nalas"
  | "requests"
  | "assignments";

type PointOverview = {
  total: number;
  completed: number;
  inProgress: number;
  notDone: number;
  totalPoints: number;
  completedPoints: number;
};

type NalaStats = {
  totalNalas: number;
  totalPoints: number;
  submitted: number;
  pending: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  actionTaken: number;
};

const EMPTY_STATS: NalaStats = {
  totalNalas: 0,
  totalPoints: 0,
  submitted: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  actionRequired: 0,
  actionTaken: 0
};

export default function NalaModulePage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] =
    useState<NalaTab>("dashboard");

  const [nalas, setNalas] = useState<any[]>([]);
  const [reviewingRecord, setReviewingRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [stats, setStats] = useState<NalaStats>(EMPTY_STATS);
  const [overview, setOverview] = useState<PointOverview | null>(null);
  const [overviewNalas, setOverviewNalas] = useState<any[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [nalaViewMode, setNalaViewMode] = useState<"table" | "map">("table");

  const roleValues = [user?.role, ...(user?.roles || [])]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());

  // GET /city/nalas/pending-requests is QC / City Admin only.
  const canReviewRequests =
    roleValues.includes("CITY_ADMIN") || roleValues.includes("QC");

  const loadNalas = useCallback(async () => {
    try {
      setLoading(true);

      const response = await NalaApi.list();
      const items = response.nalas || [];

      setNalas(items);

      setStats((previous) => ({
        ...previous,
        totalNalas: items.length,
        totalPoints: items.reduce(
          (sum, nala) =>
            sum +
            Number(
              nala.pointCount ??
              nala.nalaPoints?.length ??
              0
            ),
          0
        )
      }));
    } catch (error) {
      console.error("Failed to load Nalas", error);
      setNalas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReportStats = useCallback(async () => {
    try {
      setReportLoading(true);

      const response = await ModuleRecordsApi.getRecords(
        "NALA",
        {
          page: 1,
          limit: 100
        }
      );

      const data = (response as any)?.data || [];
      const apiStats = (response as any)?.stats || {};

      const count = (status: string) =>
        data.filter(
          (record: any) =>
            String(record.status || "").toUpperCase() ===
            status
        ).length;

      setStats((previous) => ({
        ...previous,

        submitted:
          Number(apiStats.total) ||
          data.length,

        pending:
          Number(apiStats.pending) ||
          count("PENDING_QC") ||
          count("SUBMITTED"),

        approved:
          Number(apiStats.approved) ||
          count("APPROVED"),

        rejected:
          Number(apiStats.rejected) ||
          count("REJECTED"),

        actionRequired:
          Number(apiStats.actionRequired) ||
          count("ACTION_REQUIRED"),

        actionTaken:
          count("ACTION_TAKEN")
      }));
    } catch (error) {
      console.error(
        "Failed to load NALA report stats",
        error
      );
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Today's operational-day progress: a NalaPoint is complete at 3+ photos.
  const loadOverview = useCallback(async () => {
    try {
      const response = await NalaApi.statusOverview();
      setOverview(response.summary || null);
      setOverviewNalas(response.nalas || []);
    } catch (error) {
      console.error("Failed to load NALA status overview", error);
      setOverview(null);
      setOverviewNalas([]);
    }
  }, []);

  const loadPendingRequestCount = useCallback(async () => {
    if (!canReviewRequests) return;

    try {
      const response = await NalaApi.listPendingRequests("PENDING_QC");
      setPendingRequestCount(
        response.counts?.pending ?? response.pendingNalas?.length ?? 0
      );
    } catch (error) {
      console.error("Failed to load NALA requests", error);
    }
  }, [canReviewRequests]);

  useEffect(() => {
    loadNalas();
    loadReportStats();
    loadOverview();
    loadPendingRequestCount();
  }, [loadNalas, loadReportStats, loadOverview, loadPendingRequestCount]);

  const busy = loading || reportLoading;

  return (
    <Protected>
      <ModuleGuard
        module="NALA"
        roles={[
          "QC",
          "ACTION_OFFICER",
          "CITY_ADMIN",
          "HMS_SUPER_ADMIN",
          "COMMISSIONER"
        ]}
      >
        <div
          className="page"
          style={{
            padding: "24px 28px",
            minHeight: "100vh"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
              marginBottom: 24
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 26,
                  fontWeight: 900
                }}
              >
                Nala Management
              </h1>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                Manage Nalas, configured NalaPoints,
                assignments and inspection reports
                {user?.cityName
                  ? ` for ${user.cityName}`
                  : ""}.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 5,
                background: "#f1f5f9",
                padding: 4,
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                flexWrap: "wrap"
              }}
            >
              <TabButton
                label="Dashboard"
                active={activeTab === "dashboard"}
                onClick={() => setActiveTab("dashboard")}
              />

              <TabButton
                label="Inspection Reports"
                active={
                  activeTab === "submitted_reports"
                }
                badge={stats.pending}
                onClick={() =>
                  setActiveTab("submitted_reports")
                }
              />

              <TabButton
                label={`Registered Nalas (${nalas.length})`}
                active={activeTab === "nalas"}
                onClick={() => setActiveTab("nalas")}
              />

              {canReviewRequests && (
                <TabButton
                  label="Nala Requests"
                  active={activeTab === "requests"}
                  badge={pendingRequestCount}
                  onClick={() => setActiveTab("requests")}
                />
              )}

              <TabButton
                label="Nala Assignment"
                active={activeTab === "assignments"}
                onClick={() =>
                  setActiveTab("assignments")
                }
              />
            </div>
          </div>

          {busy ? (
            <LoadingCard />
          ) : activeTab === "submitted_reports" ? (
            <SubmittedReportsTab
              moduleKey="NALA"
              assetLabel="Nala"
              onViewReport={(record) =>
                setReviewingRecord(record)
              }
            />
          ) : activeTab === "nalas" ? (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 10 }}>
                  {(["table", "map"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setNalaViewMode(mode)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                        background: nalaViewMode === mode ? "#ffffff" : "transparent",
                        color: nalaViewMode === mode ? "#2563eb" : "#64748b"
                      }}
                    >
                      {mode === "table" ? "Table View" : "Map View"}
                    </button>
                  ))}
                </div>
              </div>

              {nalaViewMode === "table" ? (
                <NalaMasterTab
                  nalas={nalas}
                  onRefresh={loadNalas}
                />
              ) : (
                <NalaMapView nalas={nalas} />
              )}
            </div>
          ) : activeTab === "requests" ? (
            <NalaRequestsTab
              onChanged={async () => {
                await Promise.all([loadNalas(), loadPendingRequestCount()]);
              }}
            />
          ) : activeTab === "assignments" ? (
            <NalaStaffAssignmentsTab />
          ) : (
            <>
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3"
                style={{ marginBottom: 24 }}
              >
                <StatCard
                  label="REGISTERED NALAS"
                  value={stats.totalNalas}
                  sub="Nala Assets"
                />

                <StatCard
                  label="NALA POINTS"
                  value={stats.totalPoints}
                  sub="Configured Points"
                />

                <StatCard
                  label="SUBMITTED REPORTS"
                  value={stats.submitted}
                  sub="Inspection Reports"
                />

                <StatCard
                  label="PENDING REPORTS"
                  value={stats.pending}
                  sub="Awaiting Review"
                />

                <StatCard
                  label="APPROVED REPORTS"
                  value={stats.approved}
                  sub="Approved"
                />

                <StatCard
                  label="REJECTED REPORTS"
                  value={stats.rejected}
                  sub="Rejected"
                />

                <StatCard
                  label="ACTION REQUIRED"
                  value={stats.actionRequired}
                  sub="Needs Resolution"
                />
              </div>

              <TodayPointStatus
                overview={overview}
                nalas={overviewNalas}
              />
            </>
          )}
        </div>
      {reviewingRecord && (
          <NalaReviewModal
            record={reviewingRecord}
            onClose={() =>
              setReviewingRecord(null)
            }
            onRefresh={() => {
              setReviewingRecord(null);
              loadReportStats();
            }}
          />
        )}

      </ModuleGuard>
    </Protected>
  );
}

function TabButton({
  label,
  active,
  badge,
  onClick
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "9px 16px",
        borderRadius: 10,
        border: "none",
        fontSize: 13,
        fontWeight: 800,
        cursor: "pointer",
        background: active
          ? "#2563eb"
          : "transparent",
        color: active
          ? "#ffffff"
          : "#64748b",
        transition: "all 0.15s"
      }}
    >
      {label}

      {Boolean(badge) && (
        <span
          style={{
            marginLeft: 6,
            background: active
              ? "rgba(255,255,255,0.22)"
              : "#ef4444",
            color: "#ffffff",
            padding: "2px 6px",
            borderRadius: 10,
            fontSize: 10
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({
  label,
  value,
  sub
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
      <div className="text-[9.5px] font-black text-slate-400 tracking-wider uppercase">
        {label}
      </div>

      <div className="my-1.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
        {value}
      </div>

      <div className="text-xs text-slate-500 font-semibold">
        {sub}
      </div>
    </div>
  );
}

function TodayPointStatus({
  overview,
  nalas
}: {
  overview: PointOverview | null;
  nalas: any[];
}) {
  const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
    COMPLETED: { label: "COMPLETED", color: "#047857", bg: "#ecfdf5" },
    IN_PROGRESS: { label: "IN PROGRESS", color: "#b45309", bg: "#fffbeb" },
    NOT_DONE: { label: "NOT DONE", color: "#b91c1c", bg: "#fef2f2" }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        overflow: "hidden"
      }}
    >
      <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
          Today&apos;s NalaPoint Status
        </div>
        <div style={{ marginTop: 5, fontSize: 12, color: "#64748b" }}>
          Each NalaPoint needs 3-5 geo-tagged photos per day. At 3 photos the
          report goes to QC.
        </div>

        {overview && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <SummaryChip label="Points done" value={`${overview.completedPoints} / ${overview.totalPoints}`} color="#2563eb" />
            <SummaryChip label="Nalas completed" value={overview.completed} color="#047857" />
            <SummaryChip label="In progress" value={overview.inProgress} color="#b45309" />
            <SummaryChip label="Not started" value={overview.notDone} color="#b91c1c" />
          </div>
        )}
      </div>

      {nalas.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          No approved Nalas yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", fontSize: 11, textAlign: "left" }}>
                <th style={thStyle}>Nala</th>
                <th style={thStyle}>Ward</th>
                <th style={thStyle}>Points Done</th>
                <th style={thStyle}>Point Photos</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {nalas.map((nala) => {
                const status = statusStyle[nala.nalaCompletionStatus] || statusStyle.NOT_DONE;

                return (
                  <tr key={nala.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{nala.nalaName}</div>
                      {nala.nalaCode && (
                        <div style={{ marginTop: 2, fontSize: 11, color: "#64748b" }}>{nala.nalaCode}</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {[nala.wardName, nala.zoneName].filter(Boolean).join(" · ") || "-"}
                    </td>
                    <td style={tdStyle}>
                      {nala.completedPointsCount} / {nala.totalPoints}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(nala.nalaPoints || []).map((point: any) => (
                          <span
                            key={point.id}
                            title={`${point.pointName}: ${point.submittedPhotoCount}/5 photos`}
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: 6,
                              background: point.minimumRequirementMet
                                ? "#ecfdf5"
                                : point.submittedPhotoCount > 0
                                  ? "#fffbeb"
                                  : "#f1f5f9",
                              color: point.minimumRequirementMet
                                ? "#047857"
                                : point.submittedPhotoCount > 0
                                  ? "#b45309"
                                  : "#64748b"
                            }}
                          >
                            {point.pointCode} {point.submittedPhotoCount}/5
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          padding: "3px 9px",
                          borderRadius: 999,
                          color: status.color,
                          background: status.bg
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryChip({
  label,
  value,
  color
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid #e2e8f0",
        color
      }}
    >
      {label}: {value}
    </span>
  );
}


function NalaList({
  nalas
}: {
  nalas: any[];
}) {
  if (!nalas.length) {
    return (
      <ComingSection
        title="No Nalas Registered"
        description="No Nala master records are available for this city."
      />
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        overflow: "hidden"
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8fafc",
                color: "#475569",
                fontSize: 11,
                textAlign: "left"
              }}
            >
              <th style={thStyle}>Nala</th>
              <th style={thStyle}>Zone</th>
              <th style={thStyle}>Ward</th>
              <th style={thStyle}>Area</th>
              <th style={thStyle}>NalaPoints</th>
              <th style={thStyle}>Supervisor</th>
              <th style={thStyle}>Latest Status</th>
            </tr>
          </thead>

          <tbody>
            {nalas.map((nala) => (
              <tr
                key={nala.id}
                style={{
                  borderTop:
                    "1px solid #e2e8f0"
                }}
              >
                <td style={tdStyle}>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#0f172a"
                    }}
                  >
                    {nala.nalaName || "Nala"}
                  </div>

                  {nala.nalaCode && (
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        color: "#64748b"
                      }}
                    >
                      {nala.nalaCode}
                    </div>
                  )}
                </td>

                <td style={tdStyle}>
                  {nala.zoneName || "-"}
                </td>

                <td style={tdStyle}>
                  {nala.wardName || "-"}
                </td>

                <td style={tdStyle}>
                  {nala.areaName || "-"}
                </td>

                <td style={tdStyle}>
                  {nala.pointCount ??
                    nala.nalaPoints?.length ??
                    0}
                </td>

                <td style={tdStyle}>
                  {nala.assignedTo?.name ||
                    "Not fully assigned"}
                </td>

                <td style={tdStyle}>
                  {nala.latestRecord?.status ||
                    "NOT SUBMITTED"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComingSection({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 28
      }}
    >
      <div
        style={{
          fontSize: 17,
          fontWeight: 900,
          color: "#0f172a"
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#64748b",
          fontSize: 13
        }}
      >
        {description}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
        background: "#ffffff",
        borderRadius: 18,
        border: "1px solid #e2e8f0"
      }}
    >
      <div
        className="animate-spin"
        style={{
          width: 32,
          height: 32,
          border: "3px solid #f3f3f3",
          borderTop: "3px solid #2563eb",
          borderRadius: "50%",
          margin: "0 auto"
        }}
      />

      <p
        style={{
          marginTop: 14,
          color: "#64748b",
          fontSize: 13,
          fontWeight: 600
        }}
      >
        Syncing NALA workspace...
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontWeight: 800,
  whiteSpace: "nowrap"
};

const tdStyle: React.CSSProperties = {
  padding: "13px 16px",
  fontSize: 12,
  color: "#475569"
};
