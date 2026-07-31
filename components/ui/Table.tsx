import React from "react";
import { Inbox } from "lucide-react";

export function Table({
  headers,
  rows,
  emptyLabel = "No records found",
  emptyDescription,
  stickyHeader = true,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyLabel?: string;
  emptyDescription?: string;
  stickyHeader?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
          <Inbox size={22} />
        </div>
        <div className="text-sm font-semibold text-slate-600">{emptyLabel}</div>
        {emptyDescription && <div className="mt-1 text-xs text-slate-400">{emptyDescription}</div>}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className={stickyHeader ? "sticky top-0 z-10" : ""}>
            <tr className="bg-slate-50/80 backdrop-blur-sm">
              {headers.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="border-t border-slate-50 transition-colors duration-150 hover:bg-slate-50/60"
              >
                {row.map((cell, cidx) => (
                  <td key={cidx} className="px-5 py-4 text-sm text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}