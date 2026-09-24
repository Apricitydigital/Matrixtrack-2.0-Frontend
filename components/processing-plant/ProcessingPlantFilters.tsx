'use client';

import React from 'react';
import { CalendarRange, Factory, RotateCcw } from 'lucide-react';
import type { ProcessingPlant, ProcessingPlantFiltersState } from '../../types/processingPlant';
import { lastNDaysRange } from '../../utils/processingPlantAnalytics';

type Props = {
  filters: ProcessingPlantFiltersState;
  plants: ProcessingPlant[];
  onChange: (next: ProcessingPlantFiltersState) => void;
};

export default function ProcessingPlantFilters({ filters, plants, onChange }: Props) {
  const types = Array.from(
    new Set(
      plants
        .map((p) => String(p.plantType || p.type || '').trim())
        .filter(Boolean),
    ),
  ).sort();

  const update = (key: keyof ProcessingPlantFiltersState, value: string) => {
    const next = { ...filters, [key]: value };
    if (key === 'plantType') {
      const selected = plants.find((p) => p.id === next.plantId);
      const selectedType = String(selected?.plantType || selected?.type || '');
      if (selected && value && selectedType !== value) next.plantId = '';
    }
    onChange(next);
  };

  const quickRange = (days: number) => {
    const range = lastNDaysRange(days);
    onChange({ ...filters, ...range });
  };

  const filteredPlants = filters.plantType
    ? plants.filter((p) => String(p.plantType || p.type || '') === filters.plantType)
    : plants;

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <CalendarRange size={13} /> From
            </span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => update('from', e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <CalendarRange size={13} /> To
            </span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => update('to', e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <Factory size={13} /> Plant Type
            </span>
            <select
              value={filters.plantType}
              onChange={(e) => update('plantType', e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Plant Types</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <Factory size={13} /> Plant
            </span>
            <select
              value={filters.plantId}
              onChange={(e) => update('plantId', e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Plants</option>
              {filteredPlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            [1, 'Today'],
            [7, '7 Days'],
            [30, '30 Days'],
          ].map(([days, label]) => {
            const range = lastNDaysRange(days as number);
            const active = filters.from === range.from && filters.to === range.to;
            return (
              <button
                key={label as string}
                onClick={() => quickRange(days as number)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  active
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={() => onChange({ ...lastNDaysRange(30), plantType: '', plantId: '' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>
    </section>
  );
}
