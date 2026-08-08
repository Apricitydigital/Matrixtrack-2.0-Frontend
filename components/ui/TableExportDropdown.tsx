'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';

interface TableExportDropdownProps {
  tableId?: string;
  data?: Record<string, any>[];
  filename?: string;
  headers?: string[];
  title?: string;
}

export function TableExportDropdown({
  tableId,
  data,
  filename = 'Export_Data',
  headers,
  title = 'Data Export'
}: TableExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTableData = (): { headers: string[]; rows: string[][] } => {
    if (data && data.length > 0) {
      const keys = headers || Object.keys(data[0]);
      const rows = data.map((item) => keys.map((k) => String(item[k] ?? '')));
      return { headers: keys, rows };
    }

    if (tableId) {
      const table = document.getElementById(tableId) as HTMLTableElement;
      if (table) {
        const headerEls = Array.from(table.querySelectorAll('th'));
        const extractedHeaders = headerEls.map((th) => th.innerText.trim());

        const rowEls = Array.from(table.querySelectorAll('tbody tr'));
        const extractedRows = rowEls.map((tr) =>
          Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim().replace(/\n/g, ' '))
        );

        return { headers: extractedHeaders, rows: extractedRows };
      }
    }

    return { headers: [], rows: [] };
  };

  const exportToExcel = () => {
    const { headers: h, rows: r } = getTableData();
    if (!h.length && !r.length) return;

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += h.map((head) => `"${head.replace(/"/g, '""')}"`).join(',') + '\n';

    r.forEach((row) => {
      csvContent += row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  const exportToPDF = () => {
    const { headers: h, rows: r } = getTableData();
    if (!h.length && !r.length) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${filename}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
            h2 { margin-bottom: 5px; color: #1e3a8a; }
            p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 11px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: right; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <p>Generated on ${new Date().toLocaleString('en-IN')} | MatrixTrack 2.0</p>
          <table>
            <thead>
              <tr>${h.map((head) => `<th>${head}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${r.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <div class="footer">MatrixTrack 2.0 Export System</div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
      >
        <Download size={14} className="text-blue-600" />
        <span>Export</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white border border-slate-200 shadow-lg ring-1 ring-black/5 z-50 overflow-hidden py-1 animate-page-entrance">
          <button
            type="button"
            onClick={exportToExcel}
            className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Excel (.CSV)</span>
          </button>
          <button
            type="button"
            onClick={exportToPDF}
            className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition border-t border-slate-100"
          >
            <FileText size={15} className="text-rose-600" />
            <span>PDF Document</span>
          </button>
        </div>
      )}
    </div>
  );
}
