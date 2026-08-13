"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Download,
  Trophy,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@hooks/useAuth";

import {
  CityApi,
  CityModulesApi,
  ModuleRecordsApi,
} from "@lib/apiClient";

/* =========================================================
   TYPES
========================================================= */

type AnalyticsRecord = {
  id?: string;
  status?: string;
  createdAt?: string;

  user?: any;
  employee?: any;
  supervisor?: any;
  inspector?: any;
  createdByUser?: any;

  __cityId?: string;
  __cityName?: string;
  __moduleKey?: string;

  [key: string]: any;
};

type TrendRow = {
  date: string;
  fullDate: string;

  Total: number;
  Approved: number;
  Rejected: number;
  ActionRequired: number;
};

type LeaderboardRow = {
  id: string;
  name: string;
  cityName?: string;

  total: number;
  approved: number;
  rejected: number;
  actionRequired: number;

  rate: number;
};

type SupportedModule = {
  identity: string;
  candidates: string[];
};

/* =========================================================
   MODULES
========================================================= */

const SUPPORTED_MODULES: SupportedModule[] = [
  {
    identity: "SWEEPING",
    candidates: ["SWEEPING"],
  },
  {
    identity: "TOILET",
    candidates: ["TOILET"],
  },
  {
    identity: "TWINBIN",
    candidates: ["TWINBIN", "LITTERBINS"],
  },
  {
    identity: "TASKFORCE",
    candidates: ["TASKFORCE"],
  },
];

/* =========================================================
   HELPERS
========================================================= */

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function resolveModule(
  value: unknown
): SupportedModule | null {
  const text = normalize(value);

  if (text.includes("SWEEP")) {
    return SUPPORTED_MODULES[0];
  }

  if (text.includes("TOILET")) {
    return SUPPORTED_MODULES[1];
  }

  if (
    text.includes("TWINBIN") ||
    text.includes("TWIN BIN") ||
    text.includes("LITTER")
  ) {
    return SUPPORTED_MODULES[2];
  }

  if (
    text.includes("TASKFORCE") ||
    text.includes("GVP") ||
    text.includes("CTU")
  ) {
    return SUPPORTED_MODULES[3];
  }

  return null;
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isApprovedStatus(status: unknown) {
  const value = normalize(status);

  return [
    "APPROVED",
    "RESOLVED",
    "ACTION_TAKEN",
  ].includes(value);
}

function isRejectedStatus(status: unknown) {
  return normalize(status) === "REJECTED";
}

function isActionRequiredStatus(status: unknown) {
  return normalize(status) === "ACTION_REQUIRED";
}

function getRecordOwner(record: AnalyticsRecord) {
  return (
    record.user ||
    record.employee ||
    record.supervisor ||
    record.inspector ||
    record.createdByUser ||
    null
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function CompliancePerformanceAnalytics() {
  const { user } = useAuth();

  /* =======================================================
     ROLE
  ======================================================= */

  const normalizedRoles = useMemo(() => {
    return Array.from(
      new Set(
        [
          user?.role,
          ...(user?.roles || []),
        ]
          .filter(Boolean)
          .map((role) => normalize(role))
      )
    );
  }, [user?.role, user?.roles]);

  const isSuperAdmin =
    normalizedRoles.includes("SUPER_ADMIN") ||
    normalizedRoles.includes("HMS_SUPER_ADMIN");

  const isCityAdmin =
    normalizedRoles.includes("CITY_ADMIN");

  const canViewAnalytics =
    isSuperAdmin || isCityAdmin;

  /* =======================================================
     DATE RANGE
  ======================================================= */

  const dateRange = useMemo(() => {
    const end = new Date();

    const start = new Date();

    start.setDate(
      end.getDate() - 29
    );

    return {
      start,
      end,

      startDate: formatApiDate(start),
      endDate: formatApiDate(end),
    };
  }, []);

  /* =======================================================
     STATE
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [records, setRecords] =
    useState<AnalyticsRecord[]>([]);

  const [
    activeModuleCount,
    setActiveModuleCount,
  ] = useState(0);

  /* =======================================================
     FETCH MODULE
  ======================================================= */

  const fetchModuleRecords = useCallback(
    async (
      candidates: string[],
      cityId?: string,
      cityName?: string
    ) => {
      const uniqueCandidates =
        Array.from(
          new Set(
            candidates
              .filter(Boolean)
              .map((item) =>
                normalize(item)
              )
          )
        );

      for (const moduleKey of uniqueCandidates) {
        try {
          const allRecords: AnalyticsRecord[] = [];

          let page = 1;
          let totalPages = 1;

          do {
            const response =
              await ModuleRecordsApi.getRecords(
                moduleKey,
                {
                  page,
                  limit: 200,

                  fromDate:
                    dateRange.startDate,

                  toDate:
                    dateRange.endDate,

                  ...(cityId
                    ? { cityId }
                    : {}),
                }
              );

            const pageRecords =
              (response?.data || []).map(
                (record: AnalyticsRecord) => ({
                  ...record,

                  __cityId: cityId,
                  __cityName: cityName,
                  __moduleKey: moduleKey,
                })
              );

            allRecords.push(
              ...pageRecords
            );

            totalPages = Number(
              response?.meta?.totalPages || 1
            );

            page += 1;

            if (page > 100) {
              break;
            }
          } while (page <= totalPages);

          return {
            success: true,
            records: allRecords,
            moduleKey,
          };
        } catch {
          // try next known alias
        }
      }

      return {
        success: false,
        records: [] as AnalyticsRecord[],
        moduleKey: "",
      };
    },
    [
      dateRange.startDate,
      dateRange.endDate,
    ]
  );

  /* =======================================================
     CITY ADMIN DATA
  ======================================================= */

  const loadCityAdminData =
    useCallback(async () => {
      const moduleResponse =
        await CityModulesApi.list().catch(
          () => []
        );

      const enabledModules =
        (
          Array.isArray(moduleResponse)
            ? moduleResponse
            : []
        )
          .filter(
            (module: any) =>
              module.enabled
          )
          .map((module: any) => {
            const resolved =
              resolveModule(
                module.key ||
                module.name
              );

            if (!resolved) {
              return null;
            }

            return {
              ...resolved,

              candidates: Array.from(
                new Set(
                  [
                    normalize(module.key),
                    ...resolved.candidates,
                  ].filter(Boolean)
                )
              ),
            };
          })
          .filter(Boolean) as SupportedModule[];

      const uniqueModules =
        Array.from(
          new Map(
            enabledModules.map(
              (module) => [
                module.identity,
                module,
              ]
            )
          ).values()
        );

      const cityName =
        (user as any)?.city?.name ||
        undefined;

      const responses =
        await Promise.all(
          uniqueModules.map(
            (module) =>
              fetchModuleRecords(
                module.candidates,
                undefined,
                cityName
              )
          )
        );

      const successfulModules =
        responses.filter(
          (response) =>
            response.success
        );

      setActiveModuleCount(
        successfulModules.length
      );

      return successfulModules.flatMap(
        (response) =>
          response.records
      );
    }, [
      fetchModuleRecords,
      user,
    ]);

  /* =======================================================
     SUPER ADMIN DATA
  ======================================================= */

  const loadSuperAdminData =
    useCallback(async () => {
      const response =
        await CityApi.list().catch(
          () => ({
            cities: [],
          })
        );

      const activeCities =
        (response?.cities || []).filter(
          (city: any) =>
            city.enabled
        );

      const requests: Promise<{
        success: boolean;
        records: AnalyticsRecord[];
        moduleKey: string;
      }>[] = [];

      const uniqueModuleIdentities =
        new Set<string>();

      activeCities.forEach(
        (city: any) => {
          const cityModules =
            (city.modules || []).filter(
              (module: any) =>
                module.enabled
            );

          cityModules.forEach(
            (module: any) => {
              const resolved =
                resolveModule(
                  module.name
                );

              if (!resolved) {
                return;
              }

              uniqueModuleIdentities.add(
                resolved.identity
              );

              requests.push(
                fetchModuleRecords(
                  resolved.candidates,
                  city.id,
                  city.name
                )
              );
            }
          );
        }
      );

      const responses =
        await Promise.all(requests);

      setActiveModuleCount(
        uniqueModuleIdentities.size
      );

      return responses
        .filter(
          (result) =>
            result.success
        )
        .flatMap(
          (result) =>
            result.records
        );
    }, [fetchModuleRecords]);

  /* =======================================================
     LOAD
  ======================================================= */

  const loadAnalytics =
    useCallback(async () => {
      if (!canViewAnalytics) {
        setRecords([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const nextRecords =
          isSuperAdmin
            ? await loadSuperAdminData()
            : await loadCityAdminData();

        setRecords(nextRecords);
      } catch (error) {
        console.error(
          "Failed to load compliance analytics",
          error
        );

        setRecords([]);
      } finally {
        setLoading(false);
      }
    }, [
      canViewAnalytics,
      isSuperAdmin,
      loadCityAdminData,
      loadSuperAdminData,
    ]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  /* =======================================================
     TREND
  ======================================================= */

  const trendData =
    useMemo<TrendRow[]>(() => {
      const rows =
        Array.from(
          { length: 30 },
          (_, index) => {
            const date =
              new Date(
                dateRange.start
              );

            date.setDate(
              date.getDate() +
                index
            );

            return {
              date:
                date.toLocaleDateString(
                  "en-GB",
                  {
                    day: "2-digit",
                    month: "short",
                  }
                ),

              fullDate:
                formatApiDate(date),

              Total: 0,
              Approved: 0,
              Rejected: 0,
              ActionRequired: 0,
            };
          }
        );

      const rowMap =
        new Map(
          rows.map((row) => [
            row.fullDate,
            row,
          ])
        );

      records.forEach(
        (record) => {
          if (!record.createdAt) {
            return;
          }

          const created =
            new Date(
              record.createdAt
            );

          if (
            Number.isNaN(
              created.getTime()
            )
          ) {
            return;
          }

          const dateKey =
            formatApiDate(
              created
            );

          const row =
            rowMap.get(dateKey);

          if (!row) {
            return;
          }

          row.Total += 1;

          if (
            isApprovedStatus(
              record.status
            )
          ) {
            row.Approved += 1;
          }

          if (
            isRejectedStatus(
              record.status
            )
          ) {
            row.Rejected += 1;
          }

          if (
            isActionRequiredStatus(
              record.status
            )
          ) {
            row.ActionRequired += 1;
          }
        }
      );

      return rows;
    }, [
      records,
      dateRange.start,
    ]);

  /* =======================================================
     TOTALS
  ======================================================= */

  const totals =
    useMemo(() => {
      let approved = 0;
      let rejected = 0;
      let actionRequired = 0;

      records.forEach(
        (record) => {
          if (
            isApprovedStatus(
              record.status
            )
          ) {
            approved += 1;
          }

          if (
            isRejectedStatus(
              record.status
            )
          ) {
            rejected += 1;
          }

          if (
            isActionRequiredStatus(
              record.status
            )
          ) {
            actionRequired += 1;
          }
        }
      );

      return {
        total: records.length,
        approved,
        rejected,
        actionRequired,
      };
    }, [records]);

  const todayData =
    trendData[
      trendData.length - 1
    ];

  /* =======================================================
     LEADERBOARD
  ======================================================= */

  const leaderboard =
    useMemo<LeaderboardRow[]>(() => {
      const map =
        new Map<
          string,
          LeaderboardRow
        >();

      records.forEach(
        (record) => {
          const owner =
            getRecordOwner(record);

          if (
            !owner ||
            !owner.name
          ) {
            return;
          }

          const id = String(
            owner.id ||
            `${
              record.__cityName || ""
            }-${owner.name}`
          );

          if (!map.has(id)) {
            map.set(id, {
              id,
              name: owner.name,

              cityName:
                record.__cityName,

              total: 0,
              approved: 0,
              rejected: 0,
              actionRequired: 0,

              rate: 0,
            });
          }

          const row =
            map.get(id)!;

          row.total += 1;

          if (
            isApprovedStatus(
              record.status
            )
          ) {
            row.approved += 1;
          }

          if (
            isRejectedStatus(
              record.status
            )
          ) {
            row.rejected += 1;
          }

          if (
            isActionRequiredStatus(
              record.status
            )
          ) {
            row.actionRequired += 1;
          }
        }
      );

      return Array.from(
        map.values()
      )
        .map((row) => ({
          ...row,

          rate:
            row.total > 0
              ? Math.round(
                  (
                    row.approved /
                    row.total
                  ) *
                    100
                )
              : 0,
        }))
        .sort((a, b) => {
          if (
            b.rate !== a.rate
          ) {
            return b.rate - a.rate;
          }

          const aIssues =
            a.rejected +
            a.actionRequired;

          const bIssues =
            b.rejected +
            b.actionRequired;

          if (
            aIssues !== bIssues
          ) {
            return (
              aIssues -
              bIssues
            );
          }

          return (
            b.approved -
            a.approved
          );
        })
        .slice(0, 5);
    }, [records]);

  /* =======================================================
     EXPORT
  ======================================================= */

  const exportExcel = () => {
    const trendRows =
      trendData
        .map(
          (row) => `
            <tr>
              <td>${row.fullDate}</td>
              <td>${row.Total}</td>
              <td>${row.Approved}</td>
              <td>${row.Rejected}</td>
              <td>${row.ActionRequired}</td>
            </tr>
          `
        )
        .join("");

    const leaderboardRows =
      leaderboard
        .map(
          (row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${row.name}</td>
              <td>${row.cityName || ""}</td>
              <td>${row.total}</td>
              <td>${row.approved}</td>
              <td>${row.rejected}</td>
              <td>${row.actionRequired}</td>
              <td>${row.rate}%</td>
            </tr>
          `
        )
        .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>

        <body>
          <h2>
            MatrixTrack 2.0 -
            Compliance Performance Analytics
          </h2>

          <p>
            Period:
            ${dateRange.startDate}
            to
            ${dateRange.endDate}
          </p>

          <h3>
            Compliance Trend
          </h3>

          <table border="1">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Reports</th>
                <th>Approved</th>
                <th>Rejected</th>
                <th>Action Required</th>
              </tr>
            </thead>

            <tbody>
              ${trendRows}
            </tbody>
          </table>

          <br />

          <h3>
            Team Leaderboard
          </h3>

          <table border="1">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team / Supervisor</th>
                <th>City</th>
                <th>Total</th>
                <th>Approved</th>
                <th>Rejected</th>
                <th>Action Required</th>
                <th>Approval Rate</th>
              </tr>
            </thead>

            <tbody>
              ${leaderboardRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob =
      new Blob(
        [html],
        {
          type:
            "application/vnd.ms-excel;charset=utf-8",
        }
      );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download =
      `Compliance_Performance_${dateRange.endDate}.xls`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    document.body.removeChild(
      anchor
    );

    URL.revokeObjectURL(url);
  };

  /* =======================================================
     ACCESS
  ======================================================= */

  if (!canViewAnalytics) {
    return null;
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 2fr) minmax(350px, 1fr)",
          gap: 18,
        }}
      >
        <div
          style={{
            height: 380,
            borderRadius: 22,
            border:
              "1px solid #e4ebf5",
            background: "#fff",

            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,

              color: "#94a3b8",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <Activity
              size={16}
              className="animate-spin"
            />

            Loading compliance trend...
          </div>
        </div>

        <div
          style={{
            height: 380,
            borderRadius: 22,
            border:
              "1px solid #e4ebf5",
            background: "#fff",

            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",

            color: "#94a3b8",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Loading team leaderboard...
        </div>
      </section>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <style>{`
        .cp-analytics-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 2fr)
            minmax(380px, 1fr);
          gap: 18px;
        }

        .cp-panel {
          min-width: 0;
          overflow: hidden;

          border:
            1px solid #e4ebf5;

          border-radius:
            22px;

          background:
            #ffffff;

          box-shadow:
            0 10px 30px
            rgba(
              25,
              51,
              89,
              0.055
            );
        }

        .cp-header {
          padding:
            20px 22px 12px;

          display: flex;
          justify-content:
            space-between;
          align-items:
            flex-start;
          gap: 15px;
        }

        .cp-heading {
          display: flex;
          align-items:
            flex-start;
          gap: 10px;
          min-width: 0;
        }

        .cp-line {
          width: 4px;
          height: 29px;
          flex-shrink: 0;
          border-radius:
            999px;
          background:
            #2f6fed;
        }

        .cp-line.gold {
          background:
            #e3a326;
        }

        .cp-title {
          margin: 0;

          color: #1b2942;

          font-size: 14px;
          line-height: 1.2;

          font-weight: 850;

          letter-spacing:
            0.035em;

          text-transform:
            uppercase;
        }

        .cp-subtitle {
          margin-top: 4px;

          color: #8795a9;

          font-size: 10px;

          font-weight: 600;
        }

        .cp-export {
          min-height: 34px;

          padding:
            0 11px;

          border:
            1px solid #dfe7f2;

          border-radius:
            10px;

          background:
            #fafcff;

          color:
            #607089;

          display:
            inline-flex;

          align-items:
            center;

          gap: 6px;

          font-size:
            10px;

          font-weight:
            750;

          cursor:
            pointer;
        }

        .cp-chart {
          height: 300px;

          padding:
            4px 10px 0;
        }

        .cp-summary {
          padding:
            0 22px 16px;

          display: flex;
          justify-content:
            space-between;
          align-items:
            center;

          gap: 12px;

          flex-wrap: wrap;
        }

        .cp-summary-left {
          display: flex;
          align-items:
            center;
          gap: 15px;

          flex-wrap: wrap;
        }

        .cp-stat {
          color:
            #7c8a9e;

          font-size:
            10px;

          font-weight:
            650;
        }

        .cp-stat strong {
          margin-left: 3px;

          font-weight:
            850;
        }

        .cp-today {
          display:
            inline-flex;

          align-items:
            center;

          gap: 6px;

          color:
            #8795a9;

          font-size:
            10px;

          font-weight:
            700;
        }

        .cp-today-dot {
          width: 7px;
          height: 7px;

          border-radius:
            50%;

          background:
            #17a673;
        }

        .cp-table-wrap {
          overflow-x: auto;
        }

        .cp-table {
          width: 100%;

          min-width: 575px;

          border-collapse:
            collapse;
        }

        .cp-table th {
          padding:
            11px 9px;

          border-top:
            1px solid #f0f3f7;

          border-bottom:
            1px solid #e5eaf2;

          color:
            #8794a7;

          background:
            #fbfcfe;

          font-size:
            8px;

          font-weight:
            850;

          letter-spacing:
            0.06em;

          text-transform:
            uppercase;

          text-align:
            center;
        }

        .cp-table th:nth-child(2) {
          text-align:
            left;
        }

        .cp-table td {
          padding:
            13px 9px;

          border-bottom:
            1px solid #f1f4f8;

          text-align:
            center;

          color:
            #536179;

          font-size:
            10px;

          font-weight:
            700;
        }

        .cp-table td:nth-child(2) {
          text-align:
            left;
        }

        .cp-table tr:last-child td {
          border-bottom:
            none;
        }

        .cp-rank {
          font-size:
            17px;
        }

        .cp-name {
          max-width:
            145px;

          overflow:
            hidden;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;

          color:
            #1f2d44;

          font-size:
            11px;

          font-weight:
            800;
        }

        .cp-city {
          margin-top: 2px;

          color:
            #97a3b4;

          font-size:
            8px;

          font-weight:
            650;
        }

        .cp-rate {
          min-width:
            100px;

          display: flex;

          align-items:
            center;

          justify-content:
            flex-start;

          gap: 7px;
        }

        .cp-rate-track {
          width: 58px;
          height: 5px;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            #e8edf4;
        }

        .cp-rate-fill {
          height: 100%;

          border-radius:
            999px;
        }

        .cp-empty {
          padding:
            60px 20px;

          text-align:
            center;

          color:
            #97a3b4;

          font-size:
            11px;

          font-weight:
            650;
        }

        .cp-footer {
          padding:
            10px 18px;

          border-top:
            1px solid #f0f3f7;

          background:
            #fafcff;

          color:
            #9aa6b5;

          font-size:
            9px;

          font-weight:
            600;
        }

        @media (
          max-width: 1150px
        ) {
          .cp-analytics-grid {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 650px
        ) {
          .cp-header {
            padding:
              17px;
          }

          .cp-summary {
            padding:
              0 17px 15px;
          }

          .cp-chart {
            height:
              270px;
          }
        }
      `}</style>

      <section className="cp-analytics-grid">

        {/* =================================================
            COMPLIANCE TREND
        ================================================= */}

        <article className="cp-panel">

          <div className="cp-header">

            <div className="cp-heading">

              <span className="cp-line" />

              <div>
                <h2 className="cp-title">
                  Compliance Trend
                </h2>

                <div className="cp-subtitle">
                  {totals.total.toLocaleString(
                    "en-IN"
                  )}{" "}
                  reports ·{" "}
                  {activeModuleCount}{" "}
                  active modules ·{" "}
                  {dateRange.startDate} →{" "}
                  {dateRange.endDate}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cp-export"
              onClick={exportExcel}
            >
              <Download size={13} />
              Excel
            </button>
          </div>

          <div className="cp-chart">

            {totals.total > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={trendData}
                  margin={{
                    top: 8,
                    right: 18,
                    left: -13,
                    bottom: 0,
                  }}
                >

                  <defs>

                    <linearGradient
                      id="cpTotalGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#2f6fed"
                        stopOpacity={0.12}
                      />

                      <stop
                        offset="95%"
                        stopColor="#2f6fed"
                        stopOpacity={0}
                      />
                    </linearGradient>

                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#edf1f6"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                    tick={{
                      fontSize: 9,
                      fill: "#93a0b2",
                      fontWeight: 650,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={35}
                    tick={{
                      fontSize: 9,
                      fill: "#93a0b2",
                      fontWeight: 650,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      border:
                        "1px solid #e2e8f0",

                      borderRadius:
                        "11px",

                      boxShadow:
                        "0 8px 24px rgba(15,23,42,.08)",
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    iconType="plainline"
                    formatter={(value) =>
                      value ===
                      "ActionRequired"
                        ? "Action Required"
                        : value
                    }
                    wrapperStyle={{
                      fontSize: "10px",
                      fontWeight: 650,
                      color: "#64748b",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="Total"
                    stroke="#2f6fed"
                    strokeWidth={2.5}
                    fill="url(#cpTotalGradient)"
                    dot={false}
                  />

                  <Area
                    type="monotone"
                    dataKey="Approved"
                    stroke="#18a66f"
                    strokeWidth={2}
                    fill="transparent"
                    dot={false}
                  />

                  <Area
                    type="monotone"
                    dataKey="Rejected"
                    stroke="#eb5757"
                    strokeWidth={2}
                    fill="transparent"
                    dot={false}
                  />

                  <Area
                    type="monotone"
                    dataKey="ActionRequired"
                    stroke="#e99124"
                    strokeWidth={2}
                    fill="transparent"
                    dot={false}
                  />

                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="cp-empty">
                <Activity
                  size={23}
                  style={{
                    margin:
                      "0 auto 8px",
                  }}
                />

                No inspection reports found
                for the last 30 days.
              </div>
            )}
          </div>

          <div className="cp-summary">

            <div className="cp-summary-left">

              <span className="cp-stat">
                Total
                <strong
                  style={{
                    color:
                      "#2f6fed",
                  }}
                >
                  {totals.total}
                </strong>
              </span>

              <span className="cp-stat">
                Approved
                <strong
                  style={{
                    color:
                      "#18a66f",
                  }}
                >
                  {totals.approved}
                </strong>
              </span>

              <span className="cp-stat">
                Rejected
                <strong
                  style={{
                    color:
                      "#eb5757",
                  }}
                >
                  {totals.rejected}
                </strong>
              </span>

              <span className="cp-stat">
                Action Required
                <strong
                  style={{
                    color:
                      "#e99124",
                  }}
                >
                  {totals.actionRequired}
                </strong>
              </span>

            </div>

            <span className="cp-today">

              <span
                className="cp-today-dot"
                style={{
                  background:
                    (todayData?.Total ||
                      0) > 0
                      ? "#18a66f"
                      : "#cbd5e1",
                }}
              />

              {todayData?.Total || 0} today

            </span>
          </div>

        </article>

        {/* =================================================
            TEAM LEADERBOARD
        ================================================= */}

        <article className="cp-panel">

          <div className="cp-header">

            <div className="cp-heading">

              <span className="cp-line gold" />

              <div>
                <h2 className="cp-title">
                  <span
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap: 6,
                    }}
                  >
                    <Trophy
                      size={14}
                      color="#d89a19"
                    />

                    Team Leaderboard
                  </span>
                </h2>

                <div className="cp-subtitle">
                  {leaderboard.length}{" "}
                  performers · ranked by
                  approval rate
                </div>
              </div>
            </div>

          </div>

          <div className="cp-table-wrap">

            <table className="cp-table">

              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team / Supervisor</th>
                  <th>Total</th>
                  <th>Approved</th>
                  <th>Rejected</th>
                  <th>Action</th>
                  <th>Rate</th>
                </tr>
              </thead>

              <tbody>

                {leaderboard.length > 0 ? (
                  leaderboard.map(
                    (row, index) => {

                      const fillColor =
                        row.rate >= 80
                          ? "#18a66f"
                          : row.rate >= 60
                          ? "#e99124"
                          : "#eb5757";

                      return (
                        <tr key={row.id}>

                          <td>
                            <span className="cp-rank">
                              {index === 0
                                ? "🥇"
                                : index === 1
                                ? "🥈"
                                : index === 2
                                ? "🥉"
                                : `#${index + 1}`}
                            </span>
                          </td>

                          <td>
                            <div className="cp-name">
                              {row.name}
                            </div>

                            {isSuperAdmin &&
                              row.cityName && (
                                <div className="cp-city">
                                  {row.cityName}
                                </div>
                              )}
                          </td>

                          <td>
                            {row.total}
                          </td>

                          <td
                            style={{
                              color:
                                "#18a66f",
                            }}
                          >
                            {row.approved}
                          </td>

                          <td
                            style={{
                              color:
                                "#eb5757",
                            }}
                          >
                            {row.rejected}
                          </td>

                          <td
                            style={{
                              color:
                                "#e99124",
                            }}
                          >
                            {
                              row.actionRequired
                            }
                          </td>

                          <td>
                            <div className="cp-rate">

                              <div className="cp-rate-track">
                                <div
                                  className="cp-rate-fill"
                                  style={{
                                    width:
                                      `${Math.min(
                                        100,
                                        Math.max(
                                          0,
                                          row.rate
                                        )
                                      )}%`,

                                    background:
                                      fillColor,
                                  }}
                                />
                              </div>

                              <strong
                                style={{
                                  color:
                                    fillColor,
                                }}
                              >
                                {row.rate}%
                              </strong>
                            </div>
                          </td>

                        </tr>
                      );
                    }
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding:
                          "60px 15px",
                      }}
                    >
                      <Trophy
                        size={22}
                        style={{
                          margin:
                            "0 auto 8px",
                          color:
                            "#cbd5e1",
                        }}
                      />

                      No supervisor /
                      team activity found
                      in this period.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

          <div className="cp-footer">
            Approval rate = approved
            reports ÷ total submitted
            reports
          </div>

        </article>

      </section>
    </>
  );
}