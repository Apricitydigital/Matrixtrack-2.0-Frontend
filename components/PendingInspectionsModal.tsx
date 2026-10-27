'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { PendingInspectionRow } from '@lib/inspectionOverview';

export type PendingInspectionDetail = PendingInspectionRow & {
  moduleLabel: string; zoneName: string; wardName: string; reports: any[];
};

export default function PendingInspectionsModal({ rows, total, from, to, onClose, overlayOpen, renderReport }: {
  rows: PendingInspectionDetail[]; total: number; from: string; to: string; onClose: () => void;
  overlayOpen: boolean; renderReport: (report: any) => ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  useEffect(() => {
    if (overlayOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); close.current(); }
      if (event.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
        if (!buttons?.length) return;
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [overlayOpen]);
  if (typeof document === 'undefined') return null;
  return createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Pending inspections" onClick={event => event.stopPropagation()} className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div><h2 className="font-black text-slate-800">Pending Inspections: {total.toLocaleString()}</h2><p className="mt-1 text-xs text-slate-500">{from} to {to}</p></div>
        <button type="button" aria-label="Close pending inspections" onClick={onClose} className="rounded-lg bg-slate-100 p-2"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-4 overflow-y-auto p-4">
        {rows.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No pending inspections for this selection.</p> : rows.map(row => <section key={`${row.module}-${row.wardId ?? ''}-${row.zoneId ?? ''}`} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-800">{row.moduleLabel}</h3><p className="mt-1 text-xs text-slate-500">{[row.zoneName, row.wardName].filter(Boolean).join(' / ') || 'Location not assigned'}</p></div><span className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">{row.pending.toLocaleString()} pending</span></div>
          <p className="mt-3 text-xs text-slate-500">Targeted: {row.target.toLocaleString()} &middot; Completed: {row.credit.toLocaleString()}</p>
          {row.reports.length > 0 ? <><h4 className="mb-3 mt-4 text-xs font-bold text-slate-600">Draft / incomplete inspection reports</h4><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{row.reports.map(report => <div key={`${report.dashboardModule}-${report.id}`}>{renderReport(report)}</div>)}</div></> : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Awaiting inspection submission.</p>}
        </section>)}
      </div>
    </div>
  </div>, document.body);
}
