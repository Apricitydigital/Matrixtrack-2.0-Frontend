'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@components/ui/Modal";
import { CleanlinessIssuesAdminApi, type EligibleDarogas } from "@lib/cleanlinessIssuesApi";
import { formatDateTimeIst, statusLabel } from "@lib/cleanlinessIssuesLogic";
import { LoadError } from "./ui";

/**
 * Manual assignment / reassignment. Only Darogas the server reports as eligible are offered; the server checks
 * eligibility again when the assignment is saved. The inspection deadline is NOT changed by this action.
 */
export function AssignDarogaModal({ issueId, onClose, onDone }: { issueId: string | null; onClose: () => void; onDone: (message: string) => void }) {
  const [data, setData] = useState<EligibleDarogas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await CleanlinessIssuesAdminApi.eligible(issueId);
      setData(result);
      setSelected("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the eligible Darogas.");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    setData(null);
    setRemarks("");
    setError(null);
    if (issueId) load();
  }, [issueId, load]);

  const save = async () => {
    // Synchronous guard: a double click can fire before React re-renders the disabled button.
    if (!issueId || !selected || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await CleanlinessIssuesAdminApi.assign(issueId, { assigneeId: selected, ...(remarks.trim() ? { remarks: remarks.trim() } : {}) });
      onDone(result.changed ? `${result.issue.issueNumber} assigned to ${result.assignee.name ?? "the Daroga"}.` : `${result.issue.issueNumber} was already assigned to ${result.assignee.name ?? "this Daroga"}.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assignment could not be saved.");
      load(); // eligibility may have changed
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const eligible = data?.eligible ?? [];
  return (
    <Modal
      open={!!issueId}
      onClose={saving ? () => undefined : onClose}
      title={data?.currentAssignee ? "Reassign Daroga" : "Assign Daroga"}
      subtitle={data ? `${data.issueNumber} · ${data.ward.name ?? ""} · ${statusLabel(data.status)}` : undefined}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
          <button type="button" onClick={save} disabled={!selected || saving || !data?.canAssign} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Saving…" : "Confirm assignment"}
          </button>
        </div>
      }
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
        {loading && !data ? <p className="text-sm text-slate-400">Loading eligible Darogas…</p> : null}
        {error ? <LoadError message={error} /> : null}
        {data ? (
          <>
            <p className="text-sm text-slate-500">
              The 24-hour inspection deadline ({formatDateTimeIst(data.inspectionDueAt)}) does <b>not</b> change when a Daroga is assigned or reassigned.
            </p>
            {data.currentAssignee ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm">
                Current Daroga: <b>{data.currentAssignee.name ?? "—"}</b>
                {!data.currentAssignee.eligible ? <span className="ml-2 font-bold text-red-600">(no longer eligible for this ward / module)</span> : null}
              </p>
            ) : null}
            {!data.canAssign ? <LoadError message={data.blockReason ?? "A Daroga cannot be assigned to this issue."} /> : null}
            {data.canAssign && eligible.length === 0 ? (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{data.message}</div>
            ) : null}
            {data.canAssign && eligible.length > 0 ? (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Eligible Darogas (fewest open issues first)</legend>
                {eligible.map((d) => (
                  <label key={d.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${selected === d.id ? "border-blue-500 bg-blue-50" : "border-slate-200"} ${d.isCurrent ? "opacity-60" : ""}`}>
                    <input type="radio" name="daroga" value={d.id} disabled={d.isCurrent} checked={selected === d.id} onChange={() => setSelected(d.id)} />
                    <span className="flex-1 font-semibold">{d.name ?? d.id}{d.isCurrent ? " (current)" : ""}</span>
                    <span className="text-xs text-slate-500">{d.openIssues} open {d.openIssues === 1 ? "issue" : "issues"}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            {data.canAssign && eligible.length > 0 ? (
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Note (optional, kept in the audit history)
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm font-normal normal-case tracking-normal text-slate-700" />
              </label>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
