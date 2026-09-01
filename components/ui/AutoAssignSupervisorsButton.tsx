"use client";

import { useState } from "react";
import { CityApi } from "@lib/apiClient";

type AutoAssignModule = "SWEEPING" | "LITTERBINS" | "TOILET";
type ModuleSummary = {
  eligibleSupervisors: number;
  supervisorsWithoutScope: number;
  totalAssets: number;
  assignedAssets: number;
  unmatchedAssets: number;
};
type AutoAssignSummary = {
  cityId: string;
  selectedModules: AutoAssignModule[];
  beats: ModuleSummary;
  toilets: ModuleSummary;
  litterbins: ModuleSummary;
};

const MODULE_OPTIONS: Array<{
  key: AutoAssignModule;
  label: string;
  description: string;
}> = [
  { key: "SWEEPING", label: "Sweeping", description: "Assign approved sweeping beats" },
  { key: "LITTERBINS", label: "Litter Bin", description: "Assign approved litter bins" },
  { key: "TOILET", label: "Toilet", description: "Assign approved toilets" },
];

function formatSummary(summary: AutoAssignSummary) {
  const rows: string[] = [];
  if (summary.selectedModules.includes("SWEEPING")) {
    rows.push(`Sweeping: ${summary.beats.assignedAssets}/${summary.beats.totalAssets} matched, ${summary.beats.unmatchedAssets} unmatched`);
  }
  if (summary.selectedModules.includes("LITTERBINS")) {
    rows.push(`Litter Bin: ${summary.litterbins.assignedAssets}/${summary.litterbins.totalAssets} matched, ${summary.litterbins.unmatchedAssets} unmatched`);
  }
  if (summary.selectedModules.includes("TOILET")) {
    rows.push(`Toilet: ${summary.toilets.assignedAssets}/${summary.toilets.totalAssets} matched, ${summary.toilets.unmatchedAssets} unmatched`);
  }
  return rows.join("\n");
}

export default function AutoAssignSupervisorsButton({ onCompleted }: { onCompleted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedModules, setSelectedModules] = useState<AutoAssignModule[]>([]);

  const toggleModule = (module: AutoAssignModule) => {
    setSelectedModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module]
    );
  };

  const handleConfirm = async () => {
    if (submitting || selectedModules.length === 0) return;
    setSubmitting(true);
    try {
      const response = await CityApi.autoAssignSupervisors(selectedModules);
      setOpen(false);
      window.alert(`Auto assignment completed.\n\n${formatSummary(response.summary)}`);
      onCompleted?.();
    } catch (error: any) {
      window.alert(error?.message || "Failed to auto assign supervisors.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedModules([]);
          setOpen(true);
        }}
        style={{
          padding: "10px 16px", borderRadius: 12, border: "1px solid #fecaca",
          background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
          color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 10px 24px rgba(220,38,38,0.22)", whiteSpace: "nowrap",
        }}
      >
        Auto Assign Supervisors
      </button>

      {open && (
        <div
          onClick={() => !submitting && setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "rgba(15,23,42,0.65)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 20,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-assign-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 560,
              padding: 28, boxShadow: "0 25px 60px rgba(0,0,0,0.28)",
            }}
          >
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
              color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, marginBottom: 16,
            }}>✓</div>

            <h3 id="auto-assign-title" style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
              Auto Assign Supervisors
            </h3>
            <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "#64748b" }}>
              Choose which module assets you want to assign using supervisor ward and zone scope.
            </p>

            <div style={{ marginTop: 18, borderRadius: 16, border: "1px solid #e2e8f0", background: "#f8fafc", padding: 16 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#334155" }}>
                Select modules to auto assign
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {MODULE_OPTIONS.map((option) => {
                  const selected = selectedModules.includes(option.key);
                  return (
                    <label key={option.key} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      borderRadius: 12, border: selected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: selected ? "#eff6ff" : "#fff",
                      cursor: submitting ? "not-allowed" : "pointer",
                    }}>
                      <input
                        type="checkbox" checked={selected} disabled={submitting}
                        onChange={() => toggleModule(option.key)}
                        style={{ width: 18, height: 18, accentColor: "#2563eb" }}
                      />
                      <span>
                        <span style={{ display: "block", color: "#0f172a", fontSize: 13, fontWeight: 800 }}>{option.label}</span>
                        <span style={{ display: "block", marginTop: 2, color: "#64748b", fontSize: 11, fontWeight: 600 }}>{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 11, lineHeight: 1.5, fontWeight: 600 }}>
                Existing assignments are replaced only for selected modules. Unmatched assets remain unchanged.
              </p>
            </div>

            <div style={{
              marginTop: 18, padding: 14, borderRadius: 14, background: "#f8fafc",
              border: "1px solid #e2e8f0", fontSize: 12, lineHeight: 1.6,
              color: "#475569", fontWeight: 600,
            }}>
              City Admin only. Supervisor scope must be correct before running this action.
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              <button
                type="button" onClick={() => setOpen(false)} disabled={submitting}
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #cbd5e1",
                  background: "#fff", color: "#475569", fontSize: 13, fontWeight: 800,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleConfirm}
                disabled={submitting || selectedModules.length === 0}
                style={{
                  flex: 1, padding: "12px 14px", borderRadius: 12, border: "none",
                  background: submitting || selectedModules.length === 0
                    ? "#94a3b8" : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#fff", fontSize: 13, fontWeight: 900,
                  cursor: submitting || selectedModules.length === 0 ? "not-allowed" : "pointer",
                  boxShadow: "0 10px 24px rgba(37,99,235,0.22)",
                }}
              >
                {submitting
                  ? "Auto assigning..."
                  : selectedModules.length === 0
                    ? "Select a Module"
                    : `Auto Assign (${selectedModules.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
