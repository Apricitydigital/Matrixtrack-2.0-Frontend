'use client';

import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { uploadProcessingPlantExcel } from '../../services/processingPlantService';
import type { ProcessingPlantUploadResult, ProcessingPlantUploadSheetStatus } from '../../types/processingPlant';

type Props = {
  /** Called after a successful upload so the dashboard can show the uploaded period. */
  onUploaded: (range: { from: string; to: string } | null) => void;
};

const STATUS_STYLE: Record<ProcessingPlantUploadSheetStatus, { label: string; className: string }> = {
  IMPORTED: { label: 'Imported', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  IMPORTED_WITH_WARNINGS: { label: 'Imported with warnings', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  NO_DATA: { label: 'No data', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  FAILED: { label: 'Failed', className: 'bg-rose-50 text-rose-700 border-rose-100' },
};

function formatDate(value: string | null) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Upload failed. Please try again.';
}

export default function ProcessingPlantExcelUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProcessingPlantUploadResult | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // allow choosing the same file again later
    event.target.value = '';
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      setError('Only .xlsx Excel files can be uploaded.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const data = await uploadProcessingPlantExcel(file);
      setResult(data);
      onUploaded(data.summary.rowsImported > 0 ? data.dateRange : null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload the plant-wise Excel file instead of filling the form"
        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-black text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 disabled:opacity-60"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? 'Uploading...' : 'Upload Excel'}
      </button>

      {error && (
        <div className="flex w-full items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          <CircleAlert size={14} className="mt-0.5 shrink-0" />
          <span className="whitespace-pre-wrap break-words">{error}</span>
          <button onClick={() => setError('')} className="ml-auto shrink-0" aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {result && <UploadResultDialog result={result} onClose={() => setResult(null)} />}
    </>
  );
}

function UploadResultDialog({ result, onClose }: { result: ProcessingPlantUploadResult; onClose: () => void }) {
  const { summary } = result;
  const nothingImported = summary.rowsImported === 0;

  const tiles: [string, number][] = [
    ['Days imported', summary.rowsImported],
    ['Plants updated', summary.plantsImported],
    ['Values saved', summary.valuesImported],
    ['Rows skipped', summary.rowsSkipped],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Excel upload result">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${nothingImported ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {nothingImported ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">Excel Upload</div>
              <h2 className="text-lg font-black text-slate-900">{nothingImported ? 'No data was imported' : 'Upload completed'}</h2>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
                <FileSpreadsheet size={13} className="shrink-0" />
                <span className="truncate">{result.fileName}</span>
                {result.dateRange && <span className="shrink-0">· {formatDate(result.dateRange.from)} to {formatDate(result.dateRange.to)}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
              </div>
            ))}
          </div>

          {(summary.errors > 0 || summary.warnings > 0) && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-3.5 text-xs font-bold text-amber-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                {summary.errors} error{summary.errors === 1 ? '' : 's'} and {summary.warnings} warning{summary.warnings === 1 ? '' : 's'}. Missing or invalid data was not imported and will show as not reported on the dashboard.
              </span>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Plant-wise result</div>
            {result.sheets.map((sheet) => {
              const style = STATUS_STYLE[sheet.status];
              return (
                <div key={sheet.sheetName} className="rounded-2xl border border-slate-200 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-800">{sheet.plantName || sheet.sheetName}</div>
                      <div className="text-[11px] font-medium text-slate-500">
                        Sheet: {sheet.sheetName}
                        {sheet.rowsImported > 0 && ` · ${sheet.rowsImported} day${sheet.rowsImported === 1 ? '' : 's'} (${formatDate(sheet.fromDate)} to ${formatDate(sheet.toDate)})`}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${style.className}`}>{style.label}</span>
                  </div>

                  {sheet.missingRequired.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {sheet.missingRequired.map((item) => (
                        <li key={item.code} className="rounded-xl bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                          {item.label} is missing on {item.days} day{item.days === 1 ? '' : 's'}
                          {item.dates.length > 0 && `: ${item.dates.map(formatDate).join(', ')}${item.days > item.dates.length ? ', ...' : ''}`}
                        </li>
                      ))}
                    </ul>
                  )}

                  {sheet.issues.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {sheet.issues.slice(0, 5).map((issue, index) => (
                        <li
                          key={`${issue.row ?? 'sheet'}-${index}`}
                          className={`rounded-xl px-3 py-1.5 text-[11px] font-medium ${issue.severity === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'}`}
                        >
                          {issue.row ? `Row ${issue.row}: ` : ''}{issue.message}
                        </li>
                      ))}
                      {sheet.issues.length > 5 && (
                        <li className="px-3 text-[11px] font-bold text-slate-400">+ {sheet.issues.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {result.plantsWithoutData.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">No data from this file ({result.plantsWithoutData.length})</div>
              <p className="mt-1 text-xs font-medium text-slate-500">These plants received nothing from this upload and appear as not reported on the dashboard unless they already have form submissions.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.plantsWithoutData.map((plant) => (
                  <span key={plant.id} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">{plant.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 p-4">
          <button onClick={onClose} className="rounded-xl bg-[linear-gradient(145deg,#312e81_0%,#4f46e5_45%,#7c3aed_100%)] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5">
            {nothingImported ? 'Close' : 'View dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
