'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, FileDown, Loader2, MapPin, X } from 'lucide-react';

import { ApiError } from '@lib/apiClient';
import { ZoneExportApi, type ZoneOption } from '@lib/zoneExportApi';

type Preset = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'THIS_MONTH' | 'CUSTOM';

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: 'TODAY', label: 'Today' },
  { key: 'YESTERDAY', label: 'Yesterday' },
  { key: 'WEEK', label: 'Last 7 days' },
  { key: 'MONTH', label: 'Last 30 days' },
  { key: 'THIS_MONTH', label: 'This month' },
  { key: 'CUSTOM', label: 'Custom' },
];

const MAX_DAYS = 366;

function localDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function rangeFor(preset: Preset): { from: string; to: string } | null {
  const today = new Date();
  const back = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date;
  };

  switch (preset) {
    case 'TODAY':
      return { from: localDay(today), to: localDay(today) };
    case 'YESTERDAY':
      return { from: localDay(back(1)), to: localDay(back(1)) };
    case 'WEEK':
      return { from: localDay(back(6)), to: localDay(today) };
    case 'MONTH':
      return { from: localDay(back(29)), to: localDay(today) };
    case 'THIS_MONTH':
      return { from: localDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: localDay(today) };
    default:
      return null;
  }
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();

  return Math.round((end - start) / 86_400_000) + 1;
}

type Props = {
  /** 'light' sits on a white page, 'dark' on the Commissioner's dark header. */
  variant?: 'light' | 'dark';
};

export default function ZoneExportButton({ variant = 'light' }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const [preset, setPreset] = useState<Preset>('WEEK');
  const [from, setFrom] = useState(() => rangeFor('WEEK')!.from);
  const [to, setTo] = useState(() => rangeFor('WEEK')!.to);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    if (!busy) setOpen(false);
  }, [busy]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open || zones.length) return;

    let active = true;
    setZonesLoading(true);
    setError('');

    ZoneExportApi.zones()
      .then((list) => {
        if (!active) return;
        setZones(list);
        setSelected(list.map((zone) => zone.id));
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Unable to load zones.');
      })
      .finally(() => {
        if (active) setZonesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, zones.length]);

  const allSelected = zones.length > 0 && selected.length === zones.length;

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const pickPreset = (next: Preset) => {
    setPreset(next);

    const range = rangeFor(next);

    if (range) {
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const rangeError = useMemo(() => {
    if (!from || !to) return 'Choose a start and an end date.';
    if (to < from) return 'The end date cannot be before the start date.';
    if (daysBetween(from, to) > MAX_DAYS) return `Choose at most ${MAX_DAYS} days.`;
    return '';
  }, [from, to]);

  const canDownload = selected.length > 0 && !rangeError && !busy && !zonesLoading;

  const download = async () => {
    if (!canDownload) return;

    setBusy(true);
    setError('');

    try {
      const [data, pdf] = await Promise.all([
        ZoneExportApi.report({ zoneIds: selected, from, to }),
        import('@lib/zoneExportPdf'),
      ]);

      await pdf.downloadZonePdf(data);
      setOpen(false);
    } catch (err) {
      console.error('Zone PDF failed', err);
      setError(err instanceof ApiError ? err.message : 'Could not create the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const trigger =
    variant === 'dark' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff',
          borderRadius: '12px',
          padding: '9px 14px',
          fontSize: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
        }}
      >
        <FileDown size={14} />
        Export PDF
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-extrabold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 transition"
      >
        <FileDown size={12} />
        Export PDF
      </button>
    );

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Export zone PDF"
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <FileDown size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Export Zone PDF</h2>
                    <p className="text-xs font-semibold text-slate-500">
                      Pick the zones and the dates. The report has a table for each zone.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto px-6 py-5">
                {/* ZONES */}
                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      <MapPin size={13} />
                      Zones
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                        {selected.length}/{zones.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!zones.length}
                      onClick={() => setSelected(allSelected ? [] : zones.map((zone) => zone.id))}
                      className="text-xs font-black text-blue-600 hover:text-blue-800 disabled:opacity-40"
                    >
                      {allSelected ? 'Clear all' : 'Select all'}
                    </button>
                  </div>

                  {zonesLoading ? (
                    <div className="flex h-24 items-center justify-center gap-2 text-sm font-bold text-slate-500">
                      <Loader2 size={16} className="animate-spin" />
                      Loading zones...
                    </div>
                  ) : zones.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                      No zones found for this city.
                    </div>
                  ) : (
                    <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {zones.map((zone) => {
                        const checked = selected.includes(zone.id);

                        return (
                          <label
                            key={zone.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                              checked
                                ? 'border-blue-300 bg-blue-50 text-blue-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(zone.id)}
                              className="sr-only"
                            />
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {checked && <Check size={13} strokeWidth={3} />}
                            </span>
                            <span className="truncate">{zone.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* DATES */}
                <section>
                  <div className="mb-2.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    <CalendarDays size={13} />
                    Date range
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => pickPreset(item.key)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-black transition ${
                          preset === item.key
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                      From
                      <input
                        type="date"
                        value={from}
                        max={to || undefined}
                        onChange={(event) => {
                          setPreset('CUSTOM');
                          setFrom(event.target.value);
                        }}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      />
                    </label>

                    <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                      To
                      <input
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={(event) => {
                          setPreset('CUSTOM');
                          setTo(event.target.value);
                        }}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      />
                    </label>
                  </div>

                  {rangeError && <p className="mt-2 text-xs font-bold text-rose-600">{rangeError}</p>}
                </section>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                <p className="text-xs font-semibold text-slate-500">
                  {selected.length} {selected.length === 1 ? 'zone' : 'zones'} selected
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void download()}
                    disabled={!canDownload}
                    className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                    {busy ? 'Preparing PDF...' : 'Download Zone PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {modal}
    </>
  );
}
