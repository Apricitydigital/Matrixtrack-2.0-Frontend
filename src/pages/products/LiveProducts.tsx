import React, { useEffect, useState } from 'react';
import { api, pages } from '../../services/api';
import { matrixStore } from '../../services/store';
import type { City, User, AttendanceRecord } from '../../types';

export function LivePlantWorkspace({ city, onUpload }: { city: City; onUpload: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setRows([]);
    if (matrixStore.currentUser?.cityId !== city.id) { setError('Sign in with this city account to view its processing plant entries.'); setLoading(false); return; }
    pages('/modules/processing-plant/entries', 'data').then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [city.id, matrixStore.loadRevision]);
  return <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
    <div className="flex justify-between gap-4"><div><h1 className="text-xl font-bold">Plant & Processing — {city.name}</h1><p className="text-sm text-slate-500 mt-1">Daily submissions from MatrixTrack, with original values and units.</p></div><button onClick={onUpload} className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm">Upload plant workbook</button></div>
    {loading && <p role="status">Loading plant submissions…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    {!loading && !error && !rows.length && <p>No plant submissions are available.</p>}
    {!!rows.length && <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-3">Date</th><th>Plant</th><th>Type</th><th>Reported measurements</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="p-3">{row.entryDate?.slice(0, 10)}</td><td>{row.plant?.name}</td><td>{row.plant?.plantType}</td><td className="py-3">{row.values?.map((v: any) => <div key={v.id || v.parameterId}>{v.parameter?.label || v.parameter?.code}: {v.value ?? v.rawValue ?? '—'} {v.unit || v.parameter?.unit}</div>)}</td></tr>)}</tbody></table></div>}
  </section>;
}

export function LiveWorkforce({ city, users, attendance }: { city: City; users: User[]; attendance: AttendanceRecord[] }) {
  const staff = users.filter(u => u.cityId === city.id && u.status === 'active');
  const records = attendance.filter(a => a.cityId === city.id);
  const present = records.filter(a => a.status === 'present').length;
  return <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-5"><h1 className="text-xl font-bold">Workforce Monitoring — {city.name}</h1><p className="text-sm text-slate-500">Personnel and attendance loaded from MatrixTrack for the selected date range.</p><div className="grid sm:grid-cols-3 gap-4">{[['Registered staff', staff.length], ['Attendance records', records.length], ['Present records', present]].map(([name, value]) => <div key={String(name)} className="bg-slate-50 border rounded-xl p-4"><p className="text-xs text-slate-500">{name}</p><p className="text-2xl font-bold mt-2">{value}</p></div>)}</div><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-3">Name</th><th>Role</th><th>Email</th></tr></thead><tbody>{staff.map(u => <tr key={`${u.id}:${u.role}`} className="border-t"><td className="p-3">{u.name}</td><td>{u.role}</td><td>{u.email}</td></tr>)}</tbody></table></div></section>;
}

export function CommissionerCleanliness({ city }: { city: City }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setData(null); setError('');
    api('/cleanliness-issues/commissioner/summary').then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [city.id, matrixStore.loadRevision]);
  return <section className="bg-white rounded-xl border p-6 space-y-5"><h1 className="text-xl font-bold">IEC Cleanliness Oversight — {city.name}</h1>{error && <p role="alert" className="text-red-700">{error}</p>}{!data && !error && <p>Loading cleanliness summary…</p>}{data && <><div className="grid sm:grid-cols-4 gap-3">{[['Reported', data.kpis.totalReported], ['Closed', data.kpis.totalClosed], ['Open', data.kpis.openIssues], ['Overdue', data.kpis.overdueInspections]].map(([name, value]) => <div key={name} className="bg-slate-50 rounded-lg p-4"><p className="text-xs">{name}</p><strong className="text-2xl">{value}</strong></div>)}</div><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Ward</th><th>Reported</th><th>Open</th><th>Closed</th><th>Overdue</th></tr></thead><tbody>{data.wards.map((w: any) => <tr key={w.id} className="border-t"><td className="p-3">{w.name}</td><td>{w.total}</td><td>{w.open}</td><td>{w.closed}</td><td>{w.overdue}</td></tr>)}</tbody></table></>}</section>;
}
