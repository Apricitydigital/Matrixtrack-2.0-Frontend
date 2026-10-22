'use client';

import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@components/ui/Modal";
import { validateRemarks, type DecisionAction } from "@lib/ulbCleanlinessLogic";

const BTN: Record<DecisionAction<string>["tone"], string> = {
  positive: "bg-emerald-600 hover:bg-emerald-700 text-white",
  negative: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-amber-500 hover:bg-amber-600 text-white"
};

/**
 * Two steps: (1) remarks, validated before anything is sent, then (2) an explicit confirmation. The submit handler
 * runs once per confirmation: a ref blocks a second click before React re-renders the disabled button. The dialog
 * stays open on failure and shows the server's message; it never reports success itself.
 */
export function DecisionDialog<D extends string>({
  action,
  subject,
  onSubmit,
  onClose
}: {
  action: DecisionAction<D>;
  subject: string;
  /** Resolves when the SERVER accepted the decision; throws a string-bearing Error otherwise. */
  onSubmit: (action: DecisionAction<D>, remarks: string) => Promise<void>;
  onClose: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [step, setStep] = useState<"remarks" | "confirm">("remarks");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const next = () => {
    const problem = validateRemarks(action, remarks);
    if (problem) return setError(problem);
    setError(null);
    setStep("confirm");
  };

  const confirm = async () => {
    if (inFlight.current) return;
    const problem = validateRemarks(action, remarks);
    if (problem) {
      setStep("remarks");
      return setError(problem);
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(action, remarks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The decision could not be saved.");
      setStep("remarks");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const close = () => {
    if (!inFlight.current) onClose();
  };

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      title={step === "confirm" ? action.confirmTitle : action.label}
      subtitle={subject}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {step === "confirm" ? (
            <>
              <button type="button" disabled={busy} onClick={() => setStep("remarks")} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:opacity-50">
                Back
              </button>
              <button type="button" disabled={busy} onClick={confirm} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-60 ${BTN[action.tone]}`}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                {busy ? "Saving…" : action.confirmLabel}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={close} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">
                Cancel
              </button>
              <button type="button" onClick={next} className={`rounded-lg px-4 py-2 text-sm font-bold ${BTN[action.tone]}`}>
                Continue
              </button>
            </>
          )}
        </div>
      }
    >
      {step === "confirm" ? (
        <div className="space-y-3 text-sm text-slate-700">
          <p>{action.confirmMessage}</p>
          {remarks.trim() ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your remarks</div>
              <p className="mt-1 whitespace-pre-wrap">{remarks.trim()}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <label className="block text-sm">
          <span className="text-xs font-bold text-slate-600">{action.remarksLabel}</span>
          <textarea
            autoFocus
            rows={4}
            maxLength={2000}
            value={remarks}
            placeholder={action.remarksHint}
            onChange={(e) => {
              setRemarks(e.target.value);
              if (error) setError(null);
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm"
          />
        </label>
      )}
      {error ? (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
    </Modal>
  );
}
