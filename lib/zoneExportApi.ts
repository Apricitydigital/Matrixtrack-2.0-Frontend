import { apiFetch } from "@lib/apiClient";

export type ZoneExportModuleRow = {
  module: string;
  label: string;
  /** Assigned target as a count (a percentage target is already turned into a count). */
  target: number;
  /** Pending Target = Assigned Target - Completed. */
  pending: number;
  completed: number;
  cleaned: number;
  /** Submitted, waiting for the SI (QC) review. */
  siPending: number;
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
  /** Set when only some wards of the zone were picked: every number in the zone covers just those wards. */
  wardFilter?: { selected: number; total: number } | null;
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

export type WardOption = {
  id: string;
  name: string;
  zoneId: string;
};

type GeoNodeRow = {
  id: string;
  name: string;
  displayName?: string | null;
  parentId?: string | null;
  parent_id?: string | null;
  parent?: { id?: string } | null;
};

const geoName = (node: GeoNodeRow, fallback: string) =>
  node.displayName && !node.name.toLowerCase().includes(node.displayName.toLowerCase())
    ? `${node.name} - ${node.displayName}`
    : node.name || node.displayName || fallback;

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { numeric: true });

export const ZoneExportApi = {
  async zones(): Promise<ZoneOption[]> {
    const response = await apiFetch<{ nodes: GeoNodeRow[] }>("/city/geo?level=ZONE");

    return (response.nodes || []).map((node) => ({ id: node.id, name: geoName(node, "Zone") })).sort(byName);
  },

  async wards(): Promise<WardOption[]> {
    const response = await apiFetch<{ nodes: GeoNodeRow[] }>("/city/geo?level=WARD");

    return (response.nodes || [])
      .map((node) => ({
        id: node.id,
        name: geoName(node, "Ward"),
        zoneId: node.parentId || node.parent_id || node.parent?.id || "",
      }))
      .filter((ward) => ward.zoneId)
      .sort(byName);
  },

  report(params: { zoneIds: string[]; wardIds?: string[]; from: string; to: string }) {
    const query = new URLSearchParams({
      zoneIds: params.zoneIds.join(","),
      from: params.from,
      to: params.to,
    });

    if (params.wardIds?.length) query.set("wardIds", params.wardIds.join(","));

    return apiFetch<ZoneExportData>(`/city/dashboard/zone-export?${query.toString()}`);
  },
};
