"use client";

import { useState } from "react";
import { CityApi } from "@lib/apiClient";

type AutoAssignSummary = {
  cityId: string;
  beats: {
    eligibleSupervisors: number;
    supervisorsWithoutScope: number;
    totalAssets: number;
    assignedAssets: number;
    unmatchedAssets: number;
  };
  toilets: {
    eligibleSupervisors: number;
    supervisorsWithoutScope: number;
    totalAssets: number;
    assignedAssets: number;
    unmatchedAssets: number;
  };
  litterbins: {
    eligibleSupervisors: number;
    supervisorsWithoutScope: number;
    totalAssets: number;
    assignedAssets: number;
    unmatchedAssets: number;
  };
};

function formatSummary(summary: AutoAssignSummary) {
  return [
    `Beats: ${summary.beats.assignedAssets}/${summary.beats.totalAssets} matched, ${summary.beats.unmatchedAssets} unmatched`,
    `Toilets: ${summary.toilets.assignedAssets}/${summary.toilets.totalAssets} matched, ${summary.toilets.unmatchedAssets} unmatched`,
    `Litterbins: ${summary.litterbins.assignedAssets}/${summary.litterbins.totalAssets} matched, ${summary.litterbins.unmatchedAssets} unmatched`,
  ].join("\n");
}

export default function AutoAssignSupervisorsButton({
  onCompleted,
}: {
  onCompleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await CityApi.autoAssignSupervisors();

      setOpen(false);
      window.alert(
        `Auto assignment completed.\n\n${formatSummary(
          response.summary
        )}`
      );
      onCompleted?.();
    } catch (error: any) {
      window.alert(
        error?.message ||
          "Failed to auto assign supervisors."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid #fecaca",
          background:
            "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
          boxShadow:
            "0 10px 24px rgba(220,38,38,0.22)",
          whiteSpace: "nowrap",
        }}
      >
        Auto Assign Supervisors
      </button>

      {open && (
        <div
          onClick={() => {
            if (!submitting) {
              setOpen(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor:
              "rgba(15,23,42,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 560,
              padding: 28,
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                color: "#b91c1c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                marginBottom: 16,
              }}
            >
              !
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              Auto Assign Supervisors
            </h3>

            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                lineHeight: 1.6,
                color: "#64748b",
              }}
            >
              These changes could harm the system if
              supervisor scope is wrong.
            </p>

            <div
              style={{
                marginTop: 18,
                borderRadius: 16,
                border: "1px solid #fecaca",
                background: "#fff1f2",
                padding: 16,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#9f1239",
                }}
              >
                This action will:
              </p>
              <ul
                style={{
                  margin: "10px 0 0 18px",
                  padding: 0,
                  color: "#881337",
                  fontSize: 12,
                  lineHeight: 1.7,
                  fontWeight: 600,
                }}
              >
                <li>
                  Reassign matched sweeping beats
                  based on supervisor zone and ward
                  scope.
                </li>
                <li>
                  Reassign matched approved toilets
                  based on supervisor zone and ward
                  scope.
                </li>
                <li>
                  Reassign matched approved
                  litterbins based on supervisor
                  zone and ward scope.
                </li>
                <li>
                  Leave unmatched assets unchanged
                  if no scoped supervisor is found.
                </li>
              </ul>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 14,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 12,
                lineHeight: 1.6,
                color: "#475569",
                fontWeight: 600,
              }}
            >
              City Admin only. This does not appear
              for HMS Super Admin.
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 22,
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: submitting
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    submitting
                      ? "#fca5a5"
                      : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: submitting
                    ? "not-allowed"
                    : "pointer",
                  boxShadow:
                    "0 10px 24px rgba(220,38,38,0.22)",
                }}
              >
                {submitting
                  ? "Auto assigning..."
                  : "Yes, Auto Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
