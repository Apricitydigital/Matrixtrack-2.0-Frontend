'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { EmptyState } from "@components/ui/EmptyState";
import { SkeletonCard } from "@components/ui/Skeleton";
import { RankingGatewayHealthCard } from "@components/ranking/RankingGatewayHealthCard";
import { useAuth } from "@hooks/useAuth";
import {
  RankingGatewayApi,
  type RankingParticipantPage,
  type RankingResponse,
  type RankingSummary,
  type RankingZone,
} from "@lib/rankingGatewayApi";

type Tab = "rankings" | "areas" | "participants";

const PAGE_SIZE = 25;

const TABS: { key: Tab; label: string }[] = [
  { key: "rankings", label: "Rankings" },
  { key: "areas", label: "Zones & Wards" },
  { key: "participants", label: "Participants" },
];

function categoryLabel(key: string, summary: RankingSummary | null) {
  return (
    summary?.categories.find((c) => c.key === key)?.label ||
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function RankingApiWorkspace() {
  const { user } = useAuth();
  const isSuperAdmin = [user?.role, ...(user?.roles || [])]
    .filter(Boolean)
    .some((role) => /HMS|SUPER_ADMIN/i.test(String(role)));

  const [tab, setTab] = useState<Tab>("rankings");
  const [summary, setSummary] = useState<RankingSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [rankings, setRankings] = useState<RankingResponse | null>(null);
  const [zones, setZones] = useState<RankingZone[] | null>(null);
  const [participants, setParticipants] = useState<RankingParticipantPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    RankingGatewayApi.summary()
      .then((res) => {
        setSummary(res);
        setCategory((current) => current || res.categories[0]?.key || "");
      })
      .catch((err) => setSummaryError(err?.message || "Could not load ranking summary"));
  }, []);

  const loadTab = useCallback(async () => {
    if (!category && tab !== "areas") return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "rankings") setRankings(await RankingGatewayApi.rankings(category, 100));
      else if (tab === "areas") setZones((await RankingGatewayApi.zones()).data);
      else setParticipants(await RankingGatewayApi.participants(category, page, PAGE_SIZE));
    } catch (err: any) {
      setError(err?.message || "Could not load data");
    } finally {
      setLoading(false);
    }
  }, [tab, category, page]);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  const rows = useMemo(
    () => rankings?.categories.find((c) => c.category === category)?.data ?? [],
    [rankings, category],
  );
  const rankedCount = rankings?.categories.find((c) => c.category === category)?.participantsRanked;

  return (
    <div className="min-w-0 space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Ward Ranking</h1>
        <p className="text-sm text-slate-500">
          Swachhta Parv ranking for {summary?.organization?.name || "your city"} · ranked by QC-verified score
        </p>
      </div>

      {isSuperAdmin && <RankingGatewayHealthCard />}

      {summaryError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {summaryError}
        </div>
      )}

      {!summary && !summaryError && <SkeletonCard />}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Approved participants" value={summary.participants.approved} hint={`${summary.participants.registered} registered`} />
          <Stat label="Wards" value={summary.wards} />
          <Stat label="Field assessments" value={summary.surveys.fieldAssessmentsCompleted} />
          <Stat label="Self assessments" value={summary.surveys.selfAssessmentsCompleted} />
        </div>
      )}

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex gap-1">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  tab === item.key ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {tab !== "areas" && summary && (
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              {summary.categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} ({c.participants})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="p-4">
          {error && <p className="mb-3 text-sm font-semibold text-rose-600">{error}</p>}
          {loading && <SkeletonCard />}

          {!loading && tab === "rankings" && (
            rows.length === 0 ? (
              <EmptyState title="No ranked participants" description="No QC-verified scores in this category yet." />
            ) : (
              <>
                <p className="mb-2 text-xs text-slate-400">
                  Showing top {rows.length} of {rankedCount ?? rows.length} ranked · {rankings?.basis}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-2 pr-3">Rank</th>
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Ward</th>
                        <th className="py-2 pr-3 text-right">Score</th>
                        <th className="py-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.participantId} className="border-t border-slate-100">
                          <td className="py-2 pr-3 font-bold text-slate-900">#{row.rank}</td>
                          <td className="py-2 pr-3 text-slate-800">{row.name || "-"}</td>
                          <td className="py-2 pr-3 text-slate-500">{row.ward || "-"}</td>
                          <td className="py-2 pr-3 text-right font-semibold">{row.score} / {row.maxScore}</td>
                          <td className="py-2 text-right">
                            <Badge tone={row.percentage >= 80 ? "success" : row.percentage >= 50 ? "warning" : "danger"}>
                              {row.percentage}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}

          {!loading && tab === "areas" && (
            !zones || zones.length === 0 ? (
              <EmptyState title="No zones found" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {zones.map((zone) => (
                  <div key={zone.id} className="rounded-xl border border-slate-100 p-3">
                    <p className="font-bold text-slate-900">{zone.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {zone.wards.length ? zone.wards.map((w) => w.name).join(", ") : "No wards"}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}

          {!loading && tab === "participants" && (
            !participants || participants.data.length === 0 ? (
              <EmptyState title="No participants" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-2 pr-3">Name</th>
                        <th className="py-2 pr-3">Category</th>
                        <th className="py-2 pr-3">Ward</th>
                        <th className="py-2">Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.data.map((p) => (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="py-2 pr-3 text-slate-800">{p.name || "-"}</td>
                          <td className="py-2 pr-3 text-slate-500">{categoryLabel(p.category, summary)}</td>
                          <td className="py-2 pr-3 text-slate-500">{p.ward || "-"}</td>
                          <td className="py-2 text-slate-500">{p.registeredAt ? p.registeredAt.slice(0, 10) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Page {participants.page} of {participants.totalPages} · {participants.total} total
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= participants.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )
          )}
        </div>
      </Card>
    </div>
  );
}
