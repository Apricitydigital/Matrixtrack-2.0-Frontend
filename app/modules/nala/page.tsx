'use client';

import React, { useCallback, useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ModuleRecordsApi, NalaApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import SubmittedReportsTab from "../qc-shared/SubmittedReportsTab";
import NalaStaffAssignmentsTab from "./components/NalaStaffAssignmentsTab";
import NalaMasterTab from "./components/NalaMasterTab";
import NalaReviewModal from "./components/NalaReviewModal";

type NalaTab =
  | "dashboard"
  | "submitted_reports"
  | "nalas"
  | "assignments";

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

  useEffect(() => {
    loadNalas();
    loadReportStats();
  }, [loadNalas, loadReportStats]);

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
            <NalaMasterTab
              nalas={nalas}
              onRefresh={loadNalas}
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

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 18,
                  padding: 22
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: "#0f172a"
                  }}
                >
                  NALA Operations
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 12,
                    color: "#64748b"
                  }}
                >
                  Inspection monitoring is based on
                  configured NalaPoints and submitted
                  geo-tagged photo reports.
                </div>
              </div>
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
