import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { matrixStore } from '../../services/store';
import {GeographicImport} from './GeographicImport';
import type { User } from '../../types';

interface Props { isOpen: boolean; onClose: () => void; type: 'attendance' | 'beats' | 'plantLogs'; title: string; currentUser: User; cityId: string; onSuccess: () => void; }
export function CsvImportModal({ isOpen, onClose, type, title, cityId, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!file || busy || type === 'beats') return;
    setBusy(true); setError(''); setResult(null);
    try { setResult(await matrixStore.uploadFile(file, type, cityId)); onSuccess(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!busy) { setFile(null); setResult(null); setError(''); onClose(); } }} title={title} maxWidth={type==='beats'?'4xl':'lg'}>
    {type === 'beats' ? <GeographicImport city={matrixStore.getCityById(cityId)!} zones={matrixStore.getZones(cityId)} wards={matrixStore.getWards(cityId)} kind="beats" onDone={()=>{onSuccess();onClose();}}/> : <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">{type === 'attendance' ? 'Upload the original attendance CSV or XLSX using the existing MatrixTrack attendance template.' : 'Upload the existing “All Plants Data Format” Excel workbook.'} The backend validates the file and reports accepted and rejected rows.</p>
      <input aria-label="Upload file" type="file" accept={type === 'attendance' ? '.csv,.xlsx' : '.xlsx'} required disabled={busy} onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); }} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {result && <div role="status" className="text-sm bg-emerald-50 p-3 rounded-lg"><p className="font-semibold">Backend processed the file.</p>{result.upload && <p>Valid rows: {result.upload.validRows}; invalid rows: {result.upload.invalidRows}; inserted: {result.upload.insertedRows}; updated: {result.upload.updatedRows}.</p>}{result.rejectedRows?.map((r: any) => <p key={r.row}>Row {r.row}: {r.reason}</p>)}{result.message && <p>{result.message}</p>}</div>}
      <button type="submit" disabled={!file || busy || Boolean(result)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{busy ? 'Uploading…' : 'Upload to MatrixTrack'}</button>
    </form>}
  </Modal>;
}
