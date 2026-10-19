"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, FileText, RefreshCw, X } from "lucide-react";
import { apiFetch } from "@lib/apiClient";

type DailyReport = { date: string; text: string };

export default function DailySubmissionReport({ initialDate }: { initialDate: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  useEffect(() => {
    if (!open || !date) return;
    let active = true;
    setLoading(true);
    setReport(null);
    setError("");
    setNotice("");
    apiFetch<DailyReport>(`/city/daily-report?date=${encodeURIComponent(date)}`)
      .then(result => { if (active) setReport(result); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Unable to load daily report."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, date, refresh]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input, textarea");
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  const ready = !loading && report?.date === date && Boolean(date);
  async function copyReport() {
    if (!ready || !report) return;
    try {
      await navigator.clipboard.writeText(report.text);
      setNotice("Report copied. You can paste it into WhatsApp or any message.");
    } catch {
      setNotice("Copy is unavailable. Select the report text below and copy it manually.");
    }
  }
  function downloadReport() {
    if (!ready || !report) return;
    const url = URL.createObjectURL(new Blob([report.text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Daily_Report_${report.date}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <>
    <button type="button" onClick={() => { setReport(null); setDate(initialDate); setOpen(true); }}
      className="flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[10px] font-extrabold text-blue-700 hover:bg-blue-100">
      <FileText size={13} /> Daily Report
    </button>
    {open && createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-3" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="daily-report-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
          <div className="flex items-start justify-between border-b p-4">
            <div>
              <h2 id="daily-report-title" className="font-bold text-slate-900">Daily Submission Report</h2>
              <p className="mt-1 text-xs text-slate-500">Sweeping, Litter Bin and Toilet reports by zone and ward.</p>
            </div>
            <button ref={closeRef} type="button" aria-label="Close daily report" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X size={18} /></button>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-b p-4">
            <label className="text-xs font-semibold text-slate-600">Submission date (IST)
              <input type="date" value={date} max={today} onChange={event => setDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
            </label>
            <button type="button" disabled={!date || loading} onClick={() => setRefresh(value => value + 1)} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={14} /> Refresh</button>
            <button type="button" disabled={!ready} onClick={() => void copyReport()} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Copy size={14} /> Copy Report</button>
            <button type="button" disabled={!ready} onClick={downloadReport} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"><Download size={14} /> Download TXT</button>
          </div>
          <div className="overflow-y-auto p-4" aria-busy={loading}>
            <p className="mb-3 text-xs text-slate-500">Counts use the submission date in India time. Statuses show the current review state. Drafts are excluded.</p>
            {loading && <p role="status" className="py-8 text-center text-sm text-slate-500">Loading daily report...</p>}
            {!date && <p className="text-sm text-slate-500">Select a submission date to generate the report.</p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} Use Refresh to try again.</p>}
            {notice && <p role="status" className="mb-3 text-sm text-blue-700">{notice}</p>}
            {ready && report && <textarea aria-label="Daily report text" readOnly value={report.text} rows={22} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800" />}
          </div>
        </div>
      </div>, document.body)}
  </>;
}
