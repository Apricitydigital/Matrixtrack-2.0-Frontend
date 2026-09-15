'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Eye, FileBarChart, X } from 'lucide-react';
import UniversalReportModal from '@components/UniversalReportModal';
import { moduleLabel } from '@lib/labels';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
  RESOLVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Resolved' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
  ACTION_TAKEN: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Action Taken' },
  REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Rejected' },
  ACTION_REQUIRED: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Action Required' },
};

function statusStyle(status: unknown) {
  const key = String(status || '').trim().toUpperCase();
  return STATUS_STYLES[key] || { bg: 'bg-slate-100', text: 'text-slate-600', label: key.replace(/_/g, ' ') || 'Pending' };
}

const MODULE_BADGE: Record<string, string> = {
  SWEEPING: 'SWEEPING ASSESSMENT',
  TOILET: 'HMS TOILET AUDIT',
  TWINBIN: 'LITTER BIN REPORT',
  TASKFORCE: 'CTU / GVP REPORT',
};

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  records: any[];
  onClose: () => void;
};

export default function CommissionerRecordsDrawer({ open, title, subtitle, records, onClose }: Props) {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/45 backdrop-blur-[1px]">
      <button type="button" aria-label="Close drilldown" onClick={onClose} className="absolute inset-0 cursor-default" />

      <aside className="relative z-10 flex h-full w-full max-w-[820px] flex-col bg-slate-50 shadow-2xl">
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileBarChart size={18} className="text-blue-600" />
                <h2 className="text-base font-black text-slate-900">{title}</h2>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
                  {records.length.toLocaleString('en-IN')} records
                </span>
              </div>
              {subtitle && <p className="mt-1 text-[11px] font-semibold text-slate-400">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {records.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
              <AlertTriangle size={26} />
              <p className="text-sm font-bold">No records for this selection</p>
              <p className="text-xs font-semibold">Try widening the date range or clearing zone/ward filters.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {records.map((record) => {
                const style = statusStyle(record.status);
                const submitter =
                  record.supervisorName || record.supervisor?.name || record.employee?.name || record.submittedBy?.name || record.createdBy?.name;
                return (
                  <div key={`${record.__module}:${record.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                          {moduleLabel(record.__module === 'TWINBIN' ? 'LITTERBINS' : record.__module, record.__module)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-sm font-bold text-slate-900">
                        {record.locationName || record.areaName || record.beatName || 'Unnamed location'}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                        {submitter ? `${submitter} • ` : ''}
                        {new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-[11px] font-black text-white transition hover:bg-blue-700"
                    >
                      <Eye size={13} /> View
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {selectedRecord && (
        <UniversalReportModal
          moduleTitle={moduleLabel(selectedRecord.__module === 'TWINBIN' ? 'LITTERBINS' : selectedRecord.__module, selectedRecord.__module)}
          moduleBadge={MODULE_BADGE[selectedRecord.__module] || selectedRecord.__module}
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>,
    document.body
  );
}
