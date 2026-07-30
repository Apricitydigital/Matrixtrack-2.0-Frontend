'use client';

import { useEffect, useState } from "react";
import { Layers, ToggleLeft } from "lucide-react";
import { ApiError, CityApi, getModuleId } from "@lib/apiClient";
import { Card } from "@components/ui/Card";
import { EmptyState } from "@components/ui/EmptyState";
import { SkeletonCard } from "@components/ui/Skeleton";
import { moduleLabel } from "@lib/labels";

type City = { id: string; name: string; modules: { moduleId: string; enabled: boolean; name: string }[] };

const AVAILABLE_MODULES = ["TASKFORCE", "TOILET", "MODULE3", "MODULE4", "MODULE5", "MODULE6", "MODULE7", "MODULE8"] as const;

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function CityModulesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    CityApi.list()
      .then((data: any) => setCities(data.cities || []))
      .catch(() => {
        setError("Failed to load cities");
        setCities([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (cityId: string, moduleId: string, enabled: boolean) => {
    await CityApi.toggleModule(cityId, moduleId, enabled);
    setCities((prev) =>
      prev.map((c) =>
        c.id === cityId
          ? { ...c, modules: c.modules.map((m) => (m.moduleId === moduleId ? { ...m, enabled } : m)) }
          : c
      )
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  if (!cities.length) {
    return (
      <EmptyState
        icon={<Layers size={22} />}
        title="No cities to configure"
        description="Onboard a city first before enabling modules."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg bg-danger-bg px-4 py-2.5 text-sm font-medium text-danger">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {cities.map((city) => (
          <Card key={city.id} title={city.name} subtitle="Module access configuration">
            <div className="flex flex-col divide-y divide-slate-50">
              {AVAILABLE_MODULES.map((m) => {
                const existing = city.modules.find((cm) => cm.name.toUpperCase() === m);
                const enabled = existing?.enabled ?? false;
                const key = `${city.id}-${m}`;
                const isPending = pendingKey === key;
                return (
                  <div key={m} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <ToggleLeft size={15} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{moduleLabel(m, m)}</span>
                    </div>
                    <Toggle
                      checked={enabled}
                      disabled={isPending}
                      onChange={async (next) => {
                        setPendingKey(key);
                        try {
                          const resolvedId = existing?.moduleId || (await getModuleId(m));
                          if (!resolvedId) throw new ApiError(400, "Module not found");
                          await toggle(city.id, resolvedId, next);
                        } catch {
                          setError("Failed to toggle module");
                        } finally {
                          setPendingKey(null);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}