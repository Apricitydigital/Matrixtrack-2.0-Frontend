'use client';

import React from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { FilterOptions } from "@lib/cleanlinessIssuesApi";
import { hasActiveFilters, normalizeFilters, statusLabel, type FilterState, type Tone } from "@lib/cleanlinessIssuesLogic";

const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200"
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${TONE[tone]}`}>{children}</span>;
}

export function StatusPill({ status }: { status: string }) {
  const tone: Tone = ({ CLOSED: "success", UNASSIGNED: "danger", REINSPECTION_REQUIRED: "danger", QC_PENDING: "warning", ULB_PENDING: "warning", REOPEN_REQUESTED: "warning", ASSIGNED: "primary", REOPENED: "primary" } as Record<string, Tone>)[status] ?? "neutral";
  return <Pill tone={tone}>{statusLabel(status)}</Pill>;
}

export function KpiTile({ label, value, hint, tone = "neutral", onClick }: { label: string; value: string | number; hint?: string; tone?: Tone; onClick?: () => void }) {
  const accent = ({ neutral: "text-slate-900", primary: "text-blue-700", success: "text-emerald-700", warning: "text-amber-700", danger: "text-red-700" } as Record<Tone, string>)[tone];
  const body = (
    <>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold tabular-nums ${accent}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div> : null}
    </>
  );
  const cls = "rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-card";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition hover:-translate-y-0.5 hover:border-blue-200`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-bold">
          <RefreshCw size={12} /> Retry
        </button>
      ) : null}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3 text-sm text-slate-500">
      <div>{total} {total === 1 ? "issue" : "issues"}</div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40">
          <ChevronLeft size={16} />
        </button>
        <span className="tabular-nums">Page {page} of {Math.max(1, totalPages)}</span>
        <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-40">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-[140px] flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
      {label}
      {children}
    </label>
  );
}
const inputCls = "h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium normal-case tracking-normal text-slate-700";

export type FilterFields = { status?: boolean; daroga?: boolean; overdue?: boolean; search?: boolean };

/** Date range, Zone > Ward, Module and (optionally) status / Daroga / overdue / issue-number search. */
export function FilterBar({ value, options, fields = {}, onChange }: { value: FilterState; options: Pick<FilterOptions, "zones" | "modules"> & Partial<FilterOptions> | null; fields?: FilterFields; onChange: (next: FilterState) => void }) {
  const zones = options?.zones ?? [];
  const wards = value.zoneId ? zones.find((z) => z.id === value.zoneId)?.wards ?? [] : zones.flatMap((z) => z.wards);
  const set = (patch: Partial<FilterState>) => onChange(normalizeFilters({ ...value, ...patch }, zones));
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <Field label="From">
        <input type="date" className={inputCls} value={value.from ?? ""} max={value.to || undefined} onChange={(e) => set({ from: e.target.value || undefined })} />
      </Field>
      <Field label="To">
        <input type="date" className={inputCls} value={value.to ?? ""} min={value.from || undefined} onChange={(e) => set({ to: e.target.value || undefined })} />
      </Field>
      <Field label="Zone">
        <select className={inputCls} value={value.zoneId ?? ""} onChange={(e) => set({ zoneId: e.target.value || undefined })}>
          <option value="">All zones</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </Field>
      <Field label="Ward">
        <select className={inputCls} value={value.wardId ?? ""} onChange={(e) => set({ wardId: e.target.value || undefined })}>
          <option value="">All wards</option>
          {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Field>
      <Field label="Module">
        <select className={inputCls} value={value.module ?? ""} onChange={(e) => set({ module: e.target.value || undefined })}>
          <option value="">All modules</option>
          {(options?.modules ?? []).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </Field>
      {fields.status ? (
        <Field label="Status">
          <select className={inputCls} value={value.status ?? ""} onChange={(e) => set({ status: e.target.value || undefined })}>
            <option value="">All statuses</option>
            {(options?.statuses ?? []).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </Field>
      ) : null}
      {fields.daroga ? (
        <Field label="Assigned Daroga">
          <select className={inputCls} value={value.darogaId ?? ""} onChange={(e) => set({ darogaId: e.target.value || undefined })}>
            <option value="">All Darogas</option>
            {(options?.darogas ?? []).map((d) => <option key={d.id} value={d.id}>{d.name ?? d.id}</option>)}
          </select>
        </Field>
      ) : null}
      {fields.overdue ? (
        <Field label="Overdue">
          <select className={inputCls} value={value.overdue ?? ""} onChange={(e) => set({ overdue: e.target.value || undefined })}>
            <option value="">Any</option>
            <option value="OVERDUE">Overdue (not inspected)</option>
            <option value="LATE">Inspected late</option>
            <option value="NOT_OVERDUE">Not overdue</option>
          </select>
        </Field>
      ) : null}
      {fields.search ? (
        <Field label="Issue number">
          <input type="search" maxLength={40} placeholder="CI-UJN-…" className={inputCls} value={value.search ?? ""} onChange={(e) => set({ search: e.target.value || undefined })} />
        </Field>
      ) : null}
      {hasActiveFilters(value) ? (
        <button type="button" onClick={() => onChange({})} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: Array<{ id: T; label: string; badge?: number | null }>; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold ${value === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          {t.label}
          {t.badge ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export const th = "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400";
export const td = "px-3 py-3 text-sm text-slate-700 align-top";
