import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function paginate<T>(rows: T[], page: number, size: number) {
  const count = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(Math.max(1, page), count);
  return { rows: rows.slice((current - 1) * size, current * size), page: current, pages: count, total: rows.length };
}
export function usePagination<T>(rows: T[], resetKey: string, initialSize = 10) {
  const [state, setState] = useState({ page: 1, size: initialSize, key: resetKey });
  const current = state.key === resetKey ? state.page : 1;
  const result = paginate(rows, current, state.size);
  return { ...result, size: state.size, onPage: (page: number) => setState({ ...state, key: resetKey, page }), onSize: (size: number) => setState({ page: 1, size, key: resetKey }) };
}
export function Pagination({ page, pages, total, size, onPage, onSize, noun = 'records' }: { page: number; pages: number; total: number; size: number; onPage: (page: number) => void; onSize: (size: number) => void; noun?: string }) {
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter(n => n >= 1 && n <= pages).sort((a,b) => a-b);
  return <nav className="pagination-bar no-print" aria-label={`${noun} pagination`}><span>{total ? `${(page-1)*size+1}–${Math.min(page*size,total)} of ${total.toLocaleString('en-IN')}` : '0'} {noun}</span><div><label>Per page <select aria-label={`${noun} per page`} value={size} onChange={e => onSize(Number(e.target.value))}>{[10,20,50].map(n => <option key={n}>{n}</option>)}</select></label><button aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page-1)}><ChevronLeft size={15} /></button>{numbers.map((n,i) => <React.Fragment key={n}>{i > 0 && n - numbers[i-1] > 1 && <span>…</span>}<button aria-label={`Page ${n}`} aria-current={page === n ? 'page' : undefined} onClick={() => onPage(n)}>{n}</button></React.Fragment>)}<button aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page+1)}><ChevronRight size={15} /></button></div></nav>;
}
