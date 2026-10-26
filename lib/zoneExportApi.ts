import { apiFetch } from "@lib/apiClient";

export type ZoneExportModuleRow = {
  module: string;
  label: string;
  /** Assigned target as a count (a percentage target is already turned into a count). */
  target: number;
  pending: number;
  completed: number;
  cleaned: number;
  notCleaned: number;
  actionRequired: number;
  actionTaken: number;
  actionPending: number;
};

export type ZoneExportWard = {
  wardId: string;
  wardName: string;
  target: number;
  completed: number;
  cleaned: number;
  notCleaned: number;
  cleanedPct: number | null;
  notCleanedPct: number | null;
  targetPct: number | null;
  score: number;
};

export type ZoneExportZone = {
  zoneId: string;
  zoneName: string;
  modules: ZoneExportModuleRow[];
  total: ZoneExportModuleRow | null;
  bestWards: ZoneExportWard[];
  worstWards: ZoneExportWard[];
};

export type ZoneExportData = {
  city: { id: string; name: string };
  range: { from: string; to: string; days: number };
  generatedAt: string;
  zones: ZoneExportZone[];
};

export type ZoneOption = {
  id: string;
  name: string;
};

type GeoNodeRow = {
  id: string;
  name: string;
  displayName?: string | null;
};

export const ZoneExportApi = {
  async zones(): Promise<ZoneOption[]> {
    const response = await apiFetch<{ nodes: GeoNodeRow[] }>("/city/geo?level=ZONE");

    return (response.nodes || [])
      .map((node) => ({
        id: node.id,
        name:
          node.displayName && !node.name.toLowerCase().includes(node.displayName.toLowerCase())
            ? `${node.name} - ${node.displayName}`
            : node.name || node.displayName || "Zone",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  },

  report(params: { zoneIds: string[]; from: string; to: string }) {
    const query = new URLSearchParams({
      zoneIds: params.zoneIds.join(","),
      from: params.from,
      to: params.to,
    });

    return apiFetch<ZoneExportData>(`/city/dashboard/zone-export?${query.toString()}`);
  },
};
