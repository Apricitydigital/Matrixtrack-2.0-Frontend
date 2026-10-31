'use client';

import { useCallback, useEffect, useState } from "react";
import { Card } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { RankingGatewayApi, type RankingGatewayHealth } from "@lib/rankingGatewayApi";

/** Super-admin only: connection status of the external ranking API (key is never shown in full). */
export function RankingGatewayHealthCard() {
  const [health, setHealth] = useState<RankingGatewayHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setHealth(await RankingGatewayApi.health());
    } catch (err: any) {
      setError(err?.message || "Could not check the ranking API");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshCache = async () => {
    setBusy(true);
    try {
      await RankingGatewayApi.clearCache();
    } catch {
      /* the re-check below reports any failure */
    }
    await load();
  };

  const tone = !health ? "neutral" : health.connected ? "success" : "danger";
  const label = !health
    ? "Checking..."
    : !health.configured
      ? "Not configured"
      : health.connected
        ? "Connected"
        : "Connection failed";

  return (
    <Card
      title="Ranking API (Swachhta Parv)"
      subtitle="Ward Ranking data comes from this external API through the MatrixTrack gateway"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refreshCache} disabled={busy}>
            Refresh data
          </Button>
          <Button variant="secondary" size="sm" onClick={load} disabled={busy}>
            Test connection
          </Button>
        </div>
      }
    >
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
      {health && (
        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Status</p>
            <Badge tone={tone} dot>{label}</Badge>
            {health.error && <p className="mt-1 text-xs text-rose-600">{health.error}</p>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Organization</p>
            <p className="font-semibold text-slate-800">{health.organization?.name || "-"}</p>
            <p className="text-xs text-slate-400">Key {health.apiKeyHint || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Scopes</p>
            <p className="font-semibold text-slate-800">{health.client?.scopes?.join(", ") || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Limits</p>
            <p className="font-semibold text-slate-800">
              {health.client?.rateLimitPerMinute ?? "-"} / min
              {health.rateLimit?.remaining ? ` (${health.rateLimit.remaining} left)` : ""}
            </p>
            <p className="text-xs text-slate-400">
              Used this month: {health.client?.usageThisMonth ?? "-"}
              {health.client?.expiresAt ? ` · Key expires ${health.client.expiresAt.slice(0, 10)}` : ""}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
