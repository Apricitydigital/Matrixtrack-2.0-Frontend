'use client';

import * as XLSX from 'xlsx';
import { useState, useEffect, useMemo, useRef } from 'react';
import { ToiletApi } from '@lib/apiClient';
import { useRouter } from 'next/navigation';

type Tab = 'MANUAL' | 'CSV';
type TableFilter = 'ALL' | 'VALID' | 'INVALID';

type PreviewRow = {
    index: number;
    zoneId?: string;
    wardId?: string;
    zoneName: string;
    wardName: string;
    areaType: string;
    areaName: string;
    name: string;
    address: string;
    type: string;
    latitude: string;
    longitude: string;
    isValid: boolean;
    validationError?: string;
};

const AREA_TYPES = [
    { value: 'RESIDENTIAL', label: 'Residential' },
    { value: 'SLUM', label: 'Slum Area' },
    { value: 'COMMERCIAL', label: 'Commercial Area' },
    { value: 'RELIGIOUS_PLACE', label: 'Religious Place' },
    { value: 'TOURIST_AREA', label: 'Tourist Areas' },
    { value: 'TRANSPORT_HUB', label: 'Transport Hub' },
    { value: 'PARKS_AND_GARDENS', label: 'Parks and Gardens' },
    { value: 'MARKET_AREA', label: 'Market' },
    { value: 'PARKING', label: 'Parking' },
];

export default function BulkImportPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('MANUAL');
    const [file, setFile] = useState<File | null>(null);
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [tableFilter, setTableFilter] = useState<TableFilter>('ALL');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [geoLoaded, setGeoLoaded] = useState(false);
    // Keep a ref to the pending file so we can re-validate once geo data arrives
    const pendingFileRef = useRef<File | null>(null);

    // Manual form state
    const [formData, setFormData] = useState({
        zoneId: '',
        wardId: '',
        areaType: 'RESIDENTIAL',
        areaName: '',
        name: '',
        address: '',
        type: 'CT',
        latitude: '',
        longitude: '',
        photo: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadGeo = async () => {
            try {
                const zonesRes = await ToiletApi.getZones();
                const loadedZones = zonesRes.nodes || [];
                setZones(loadedZones);

                const allWards: any[] = [];
                for (const zone of loadedZones) {
                    const wardsRes = await ToiletApi.getWardsByZone(zone.id);
                    allWards.push(...(wardsRes.nodes || []).map((w: any) => ({ ...w, zoneId: zone.id, zoneName: zone.name })));
                }
                setWards(allWards);
                setGeoLoaded(true);
            } catch (err) {
                console.error("Failed to load geo nodes", err);
                setGeoLoaded(true); // Allow usage even on partial failure
            }
        };
        loadGeo();
    }, []);

    // Re-validate the pending CSV file once zone+ward master data is fully loaded
    useEffect(() => {
        if (geoLoaded && pendingFileRef.current) {
            parseAndValidateCSV(pendingFileRef.current, zones, wards);
            pendingFileRef.current = null;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geoLoaded]);

    const filteredWards = formData.zoneId
        ? wards.filter(w => w.zoneId === formData.zoneId)
        : wards;

    const parseAndValidateCSV = async (csvFile: File, zoneList = zones, wardList = wards) => {
        try {
            let rawText = '';
            const isExcel = csvFile.name.endsWith('.xlsx') || csvFile.name.endsWith('.xls');

            if (isExcel) {
                const buffer = await csvFile.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                rawText = XLSX.utils.sheet_to_csv(worksheet);
            } else {
                rawText = await csvFile.text();
            }

            // ── RFC-4180 full-document tokenizer ──────────────────────────────────
            // MUST tokenize before splitting rows, because Address cells frequently
            // contain embedded newlines (common Excel export behaviour).
            const tokenizeCSV = (raw: string): string[][] => {
                const rows: string[][] = [];
                let row: string[] = [];
                let cell = '';
                let inQ = false;
                for (let i = 0; i < raw.length; i++) {
                    const ch   = raw[i];
                    const next = raw[i + 1];
                    if (inQ) {
                        if (ch === '"' && next === '"') { cell += '"'; i++; }   // escaped "
                        else if (ch === '"')             { inQ = false; }        // close quote
                        else                             { cell += ch; }         // embedded \n ok
                    } else {
                        if      (ch === '"')  { inQ = true; }
                        else if (ch === ',')  { row.push(cell.trim()); cell = ''; }
                        else if (ch === '\r' && next === '\n') {
                            row.push(cell.trim());
                            if (row.some(c => c)) rows.push(row);
                            row = []; cell = ''; i++;
                        } else if (ch === '\n' || ch === '\r') {
                            row.push(cell.trim());
                            if (row.some(c => c)) rows.push(row);
                            row = []; cell = '';
                        } else { cell += ch; }
                    }
                }
                if (cell || row.length) { row.push(cell.trim()); if (row.some(c => c)) rows.push(row); }
                return rows;
            };

            const allRows = tokenizeCSV(rawText);
            if (allRows.length < 2) {
                setError('CSV file is empty or missing data rows');
                setPreviewRows([]);
                return;
            }

            const headerRow = allRows[0].map(h => h.toLowerCase());
            const is9ColFormat =
                headerRow.includes('toilet type') ||
                headerRow.includes('area type')   ||
                headerRow.includes('toilet name / id') ||
                (headerRow[0] && headerRow[0].includes('zone'));

            const parsed: PreviewRow[] = [];
            // Carry-forward: Excel merged cells export as blank for child rows
            let lastZone = '', lastWard = '', lastAreaType = 'RESIDENTIAL';

            for (let i = 1; i < allRows.length; i++) {
                const v = allRows[i];
                if (v.length < 3) continue;

                let zoneName = '', wardName = '', areaType = '', areaName = '', name = '', address = '', typeStr = 'CT', latStr = '', lonStr = '';

                if (is9ColFormat) {
                    zoneName = v[0]?.trim() || ''; wardName = v[1]?.trim() || '';
                    areaType = v[2]?.trim() || ''; areaName = v[3]?.trim() || '';
                    name     = v[4]?.trim() || ''; address  = v[5]?.trim() || '';
                    typeStr  = v[6]?.trim() || 'CT';
                    latStr   = v[7]?.trim() || ''; lonStr   = v[8]?.trim() || '';
                } else {
                    name     = v[0]?.trim() || ''; zoneName = v[1]?.trim() || '';
                    wardName = v[2]?.trim() || ''; typeStr  = v[3]?.trim() || 'CT';
                    latStr   = v[8]?.trim() || ''; lonStr   = v[9]?.trim() || '';
                    address  = v.slice(10).join(',').trim();
                }

                // Apply carry-forward for merged/blank cells
                if (zoneName)  lastZone     = zoneName;     else zoneName  = lastZone;
                if (wardName)  lastWard     = wardName;     else wardName  = lastWard;
                if (areaType)  lastAreaType = areaType;     else areaType  = lastAreaType;

                // Skip fully blank rows
                if (!zoneName && !wardName && !name) continue;

                // Zone match: exact → number → substring
                let matchedZone = zoneList.find(z => z.name.trim().toLowerCase() === zoneName.toLowerCase());
                if (!matchedZone) {
                    const zNum = zoneName.replace(/\D/g, '');
                    if (zNum) matchedZone = zoneList.find(z => z.name.replace(/\D/g, '') === zNum);
                }
                if (!matchedZone) {
                    matchedZone = zoneList.find(z =>
                        z.name.toLowerCase().includes(zoneName.toLowerCase()) ||
                        zoneName.toLowerCase().includes(z.name.toLowerCase())
                    );
                }

                // Ward match: exact → number → clean-name → global fallback
                const pool        = matchedZone ? wardList.filter(w => w.zoneId === matchedZone!.id) : wardList;
                const wNum        = wardName.replace(/\D/g, '');
                const wClean      = wardName.replace(/ward/i, '').trim().toLowerCase();

                let matchedWard = pool.find(w => w.name.trim().toLowerCase() === wardName.toLowerCase());
                if (!matchedWard && wNum) {
                    matchedWard = pool.find(w => {
                        const n = w.name.split('-')[0]?.trim().replace(/\D/g, '') || w.name.replace(/\D/g, '');
                        return n === wNum;
                    });
                }
                if (!matchedWard && wClean) {
                    matchedWard = pool.find(w =>
                        w.name.toLowerCase().includes(wClean) || wClean.includes(w.name.toLowerCase())
                    );
                }
                // Global fallback — drop zone constraint
                if (!matchedWard) {
                    matchedWard = wardList.find(w => {
                        const n = w.name.split('-')[0]?.trim().replace(/\D/g, '') || w.name.replace(/\D/g, '');
                        return (wNum && n === wNum) || (wClean && w.name.toLowerCase().includes(wClean));
                    });
                }

                const isValid = !!(matchedZone && matchedWard);
                const validationError = !matchedZone
                    ? `Zone '${zoneName}' not found in Master Data`
                    : !matchedWard
                    ? `Ward '${wardName}' not found under ${matchedZone.name}`
                    : '';

                parsed.push({
                    index: parsed.length + 1,
                    zoneId: matchedZone?.id,
                    wardId: matchedWard?.id,
                    zoneName: matchedZone?.name || zoneName,
                    wardName: matchedWard?.name || wardName,
                    areaType,
                    areaName,
                    name: name || 'Toilet Asset',
                    address,
                    type: typeStr || 'CT',
                    latitude: latStr,
                    longitude: lonStr,
                    isValid,
                    validationError
                });
            }

            setPreviewRows(parsed);
            setError('');
        } catch (err: any) {
            setError('Failed to parse CSV file: ' + err.message);
            setPreviewRows([]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setFile(selected);
            setError('');
            setResult(null);
            if (!geoLoaded) {
                pendingFileRef.current = selected;
                setPreviewRows([]);
            } else {
                parseAndValidateCSV(selected, zones, wards);
            }
        }
    };

    const validRows = useMemo(() => previewRows.filter(r => r.isValid), [previewRows]);
    const invalidRows = useMemo(() => previewRows.filter(r => !r.isValid), [previewRows]);

    const filteredTableRows = useMemo(() => {
        if (tableFilter === 'VALID') return validRows;
        if (tableFilter === 'INVALID') return invalidRows;
        return previewRows;
    }, [tableFilter, previewRows, validRows, invalidRows]);

    const handleConfirmImport = async () => {
        if (validRows.length === 0) {
            setError('No valid records to import. All rows contain unregistered Zones or Wards.');
            return;
        }

        setUploading(true);
        setError('');
        try {
            const formatCSVValue = (val: any) => {
                const str = String(val ?? '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const csvLines = [
                'Zone Name,Ward Name,Area Type,Area Name,Toilet Name / ID,Address,Toilet Type,Latitude,Longitude',
                ...validRows.map(r => [
                    formatCSVValue(r.zoneName),
                    formatCSVValue(r.wardName),
                    formatCSVValue(r.areaType),
                    formatCSVValue(r.areaName),
                    formatCSVValue(r.name),
                    formatCSVValue(r.address),
                    formatCSVValue(r.type),
                    formatCSVValue(r.latitude),
                    formatCSVValue(r.longitude)
                ].join(','))
            ];
            const csvText = csvLines.join('\n');

            const response = await ToiletApi.bulkImport({ rows: validRows, csvText });
            setResult(response);
            setTimeout(() => router.push('/modules/toilet'), 2500);
        } catch (err: any) {
            setError(err.message || 'Failed to process infrastructure data');
        } finally {
            setUploading(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!formData.wardId || !formData.latitude || !formData.longitude) {
            setError('Mandatory fields: Ward and Coordinates (Latitude & Longitude).');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const selectedWard = wards.find(w => w.id === formData.wardId);
            const wardName = selectedWard ? selectedWard.name : 'Ward';
            const zoneName = selectedWard ? selectedWard.zoneName : 'Zone';
            const toiletName = formData.name.trim() || 'Toilet Asset';

            const formatCSVValue = (val: any) => {
                const str = String(val ?? '');
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const singleRow = {
                zoneName,
                wardName,
                areaType: formData.areaType,
                areaName: formData.areaName,
                name: toiletName,
                address: formData.address,
                type: formData.type,
                latitude: formData.latitude,
                longitude: formData.longitude
            };

            const csvText = `Zone Name,Ward Name,Area Type,Area Name,Toilet Name / ID,Address,Toilet Type,Latitude,Longitude\n${formatCSVValue(zoneName)},${formatCSVValue(wardName)},${formatCSVValue(formData.areaType)},${formatCSVValue(formData.areaName)},${formatCSVValue(toiletName)},${formatCSVValue(formData.address)},${formatCSVValue(formData.type)},${formatCSVValue(formData.latitude)},${formatCSVValue(formData.longitude)}`;
            
            const response = await ToiletApi.bulkImport({ rows: [singleRow], csvText });
            setResult(response);
            setTimeout(() => router.push('/modules/toilet'), 2500);
        } catch (err: any) {
            setError(err.message || 'Registry sync failed');
        } finally {
            setSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'Zone Name,Ward Name,Area Type,Area Name,Toilet Name / ID,Address,Toilet Type,Latitude,Longitude\n' +
            'Central Zone,Ward 5,RESIDENTIAL,Market Yard,CT-101,Near Main Market,CT,28.6139,77.2090\n' +
            'West Zone,Ward 10,COMMERCIAL_AREA,Bus Stand,PT-202,Station Road,PT,28.6140,77.2091';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'toilet-registration-template.csv';
        a.click();
    };

    const clearFile = () => {
        setFile(null);
        setPreviewRows([]);
        setError('');
        setResult(null);
    };

    return (
        <div style={{ padding: '0 0 40px 0', animation: 'fadeIn 0.5s ease-out' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .glass-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid #edf2f7;
                    border-radius: 32px;
                    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05);
                    overflow: hidden;
                }
                .input-field {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #1e293b;
                    transition: all 0.2s;
                    width: 100%;
                    outline: none;
                }
                .input-field:focus {
                    border-color: #1e293b;
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(30, 41, 59, 0.05);
                }
                .label {
                    font-size: 11px;
                    font-weight: 900;
                    color: #94a3b8;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    display: block;
                }
                .tab-btn {
                    padding: 12px 24px;
                    font-size: 13px;
                    font-weight: 800;
                    border-radius: 12px;
                    transition: all 0.2s;
                    cursor: pointer;
                    border: none;
                }
                .status-badge {
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 800;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }
            ` }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>Asset Onboarding</h1>
                    <p style={{ color: '#64748b', fontSize: 15, marginTop: 4, fontWeight: 500 }}>Register new toilet infrastructure via manual form or preview & import bulk CSV datasets.</p>
                </div>
                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 16 }}>
                    <button
                        className="tab-btn"
                        onClick={() => setActiveTab('MANUAL')}
                        style={{ backgroundColor: activeTab === 'MANUAL' ? '#ffffff' : 'transparent', color: activeTab === 'MANUAL' ? '#0f172a' : '#64748b', boxShadow: activeTab === 'MANUAL' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}
                    >Manual</button>
                    <button
                        className="tab-btn"
                        onClick={() => setActiveTab('CSV')}
                        style={{ backgroundColor: activeTab === 'CSV' ? '#ffffff' : 'transparent', color: activeTab === 'CSV' ? '#0f172a' : '#64748b', boxShadow: activeTab === 'CSV' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}
                    >Bulk (CSV)</button>
                </div>
            </div>

            <div className="glass-card">
                {activeTab === 'MANUAL' ? (
                    <div style={{ padding: 40 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                            {/* 1. Zone */}
                            <div>
                                <label className="label">Zone</label>
                                <select
                                    className="input-field"
                                    value={formData.zoneId}
                                    onChange={e => setFormData({ ...formData, zoneId: e.target.value, wardId: '' })}
                                >
                                    <option value="">Select Zone</option>
                                    {zones.map(z => (
                                        <option key={z.id} value={z.id}>{z.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Ward */}
                            <div>
                                <label className="label">Ward *</label>
                                <select
                                    className="input-field"
                                    value={formData.wardId}
                                    onChange={e => setFormData({ ...formData, wardId: e.target.value })}
                                >
                                    <option value="">Select Ward</option>
                                    {filteredWards.map(w => (
                                        <option key={w.id} value={w.id}>{w.zoneName ? `${w.zoneName} / ` : ''}{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Area Type */}
                            <div>
                                <label className="label">Area Type</label>
                                <select
                                    className="input-field"
                                    value={formData.areaType}
                                    onChange={e => setFormData({ ...formData, areaType: e.target.value })}
                                >
                                    {AREA_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 4. Area Name */}
                            <div>
                                <label className="label">Area Name</label>
                                <input
                                    className="input-field"
                                    value={formData.areaName}
                                    onChange={e => setFormData({ ...formData, areaName: e.target.value })}
                                    placeholder="e.g. Market Yard / Central Square"
                                />
                            </div>

                            {/* 5. Toilet Name / ID (Optional) */}
                            <div>
                                <label className="label">Toilet Name / ID</label>
                                <input
                                    className="input-field"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Sulabh Complex 101 or CT-01 (Optional)"
                                />
                            </div>

                            {/* 6. Toilet Type */}
                            <div>
                                <label className="label">Toilet Type</label>
                                <select
                                    className="input-field"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="CT">Community Toilet (CT)</option>
                                    <option value="PT">Public Toilet (PT)</option>
                                    <option value="URINALS">Urinals</option>
                                </select>
                            </div>

                            {/* 7. Latitude */}
                            <div>
                                <label className="label">Latitude *</label>
                                <input
                                    className="input-field"
                                    value={formData.latitude}
                                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                    placeholder="Coordinates Decimal (e.g. 28.6139)"
                                />
                            </div>

                            {/* 8. Longitude */}
                            <div>
                                <label className="label">Longitude *</label>
                                <input
                                    className="input-field"
                                    value={formData.longitude}
                                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                    placeholder="Coordinates Decimal (e.g. 77.2090)"
                                />
                            </div>
                        </div>

                        {/* 9. Address / Location */}
                        <div style={{ marginTop: 24 }}>
                            <label className="label">Address / Location</label>
                            <textarea
                                className="input-field"
                                style={{ minHeight: 90, resize: 'none' }}
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Full address / location details..."
                            />
                        </div>

                        <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                            <button
                                onClick={handleManualSubmit}
                                disabled={submitting}
                                style={{ flex: 1, backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: 16, padding: '16px', fontWeight: 900, fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px -5px rgba(15,23,42,0.3)' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {submitting ? 'Syncing...' : 'Complete Registry Entry'}
                            </button>
                            <button
                                onClick={() => router.back()}
                                style={{ padding: '16px 32px', border: '1px solid #e2e8f0', borderRadius: 16, background: 'transparent', color: '#64748b', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                            >Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: 40 }}>
                        {!file || previewRows.length === 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'start' }}>
                                <div>
                                    <div style={{ backgroundColor: '#f8fafc', borderRadius: 24, padding: 36, border: '2px dashed #cbd5e1', textAlign: 'center', transition: 'all 0.3s' }} onDragOver={e => e.preventDefault()} onMouseEnter={e => e.currentTarget.style.borderColor = '#1e293b'}>
                                        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Upload CSV / Excel File for Validation</h3>
                                        <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, fontWeight: 500 }}>Select a CSV or Excel dataset (.xlsx, .xls). The system will preview data & validate Zones/Wards before importing.</p>

                                        {!geoLoaded ? (
                                            <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: '#f1f5f9', color: '#64748b', padding: '14px 28px', borderRadius: 14, fontSize: 14, fontWeight: 700 }}>
                                                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #94a3b8', borderTopColor: '#1e293b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                Loading Zone & Ward Data...
                                            </div>
                                        ) : (
                                        <label style={{ display: 'inline-block', marginTop: 24, backgroundColor: '#1e293b', color: 'white', padding: '14px 28px', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,41,59,0.2)' }}>
                                            Select CSV / Excel File
                                            <input type="file" accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} style={{ display: 'none' }} />
                                        </label>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                        <button
                                            onClick={downloadTemplate}
                                            style={{ padding: '14px 24px', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', color: '#1e293b', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                                        >📥 Download Sample Template</button>
                                    </div>
                                </div>

                                <div>
                                    <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 900, color: '#1e293b' }}>Protocol Guard Specs</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {[
                                            { f: 'Zone Name', d: 'Natural language name of Zone' },
                                            { f: 'Ward Name', d: 'Natural language name of Ward' },
                                            { f: 'Area Type', d: 'RESIDENTIAL, SLUM, COMMERCIAL_AREA, etc.' },
                                            { f: 'Area Name', d: 'Name of location / area' },
                                            { f: 'Toilet Name / ID', d: 'Optional site name or unique identifier' },
                                            { f: 'Address / Location', d: 'Detailed positioning details' },
                                            { f: 'Toilet Type', d: 'CT, PT, or URINALS' },
                                            { f: 'Coordinates', d: 'Latitude & Longitude in decimal' }
                                        ].map((item, i) => (
                                            <div key={i} style={{ padding: '12px 14px', backgroundColor: '#fcfdfe', borderRadius: 14, border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 800, fontSize: 12, color: '#1e293b' }}>{item.f}</span>
                                                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{item.d}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Preview & Master Data Validation Table */
                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                {/* File Header & Controls */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '14px 20px', backgroundColor: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uploaded File</span>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{file?.name}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: 8, backgroundColor: '#f1f5f9', padding: 4, borderRadius: 12 }}>
                                            <button
                                                onClick={() => setTableFilter('ALL')}
                                                style={{ border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', backgroundColor: tableFilter === 'ALL' ? '#ffffff' : 'transparent', color: tableFilter === 'ALL' ? '#0f172a' : '#64748b' }}
                                            >All Rows ({previewRows.length})</button>
                                            <button
                                                onClick={() => setTableFilter('VALID')}
                                                style={{ border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', backgroundColor: tableFilter === 'VALID' ? '#ffffff' : 'transparent', color: tableFilter === 'VALID' ? '#047857' : '#64748b' }}
                                            >Valid Only ({validRows.length})</button>
                                            <button
                                                onClick={() => setTableFilter('INVALID')}
                                                style={{ border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', backgroundColor: tableFilter === 'INVALID' ? '#ffffff' : 'transparent', color: tableFilter === 'INVALID' ? '#b91c1c' : '#64748b' }}
                                            >Unregistered Only ({invalidRows.length})</button>
                                        </div>

                                        <button
                                            onClick={clearFile}
                                            style={{ border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: 10, backgroundColor: '#ffffff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                        >Clear / Select Different CSV</button>
                                    </div>
                                </div>

                                {/* Data Preview Table */}
                                <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid #e2e8f0', maxHeight: 420 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>#</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Master Status</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Zone Name</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Ward Name</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Area Type</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Area Name</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Toilet Name / ID</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Address</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Toilet Type</th>
                                                <th style={{ padding: '12px 14px', fontWeight: 600, fontSize: 12 }}>Coordinates</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTableRows.map((row) => (
                                                <tr key={row.index} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: row.isValid ? '#ffffff' : '#fff5f5' }}>
                                                    <td style={{ padding: '12px 14px', fontWeight: 500, color: '#94a3b8' }}>{row.index}</td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        {row.isValid ? (
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>
                                                                Ready to Import
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#b91c1c' }} title={row.validationError}>
                                                                {row.validationError}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', fontWeight: 500, color: '#0f172a' }}>{row.zoneName || '—'}</td>
                                                    <td style={{ padding: '12px 14px', fontWeight: 500, color: '#0f172a' }}>{row.wardName || '—'}</td>
                                                    <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 500 }}>{row.areaType}</td>
                                                    <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 500 }}>{row.areaName || '—'}</td>
                                                    <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1e293b' }}>{row.name}</td>
                                                    <td style={{ padding: '12px 14px', color: '#64748b', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{row.address || '—'}</td>
                                                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>{row.type}</td>
                                                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12, fontWeight: 500 }}>{row.latitude}, {row.longitude}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bottom Action Buttons */}
                                <div style={{ marginTop: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <button
                                        onClick={handleConfirmImport}
                                        disabled={uploading || validRows.length === 0}
                                        style={{ flex: 1, backgroundColor: validRows.length > 0 ? '#0f172a' : '#94a3b8', color: 'white', border: 'none', borderRadius: 16, padding: '16px', fontWeight: 900, fontSize: 15, cursor: validRows.length > 0 ? 'pointer' : 'not-allowed', boxShadow: '0 10px 20px -5px rgba(15,23,42,0.3)' }}
                                    >
                                        {uploading ? 'Importing Valid Records...' : `Confirm & Import (${validRows.length} Valid Records)`}
                                    </button>

                                    {invalidRows.length > 0 && (
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>
                                            ⚠️ {invalidRows.length} unregistered rows will be skipped during import.
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && <div style={{ marginTop: 24, padding: '16px 24px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 20, color: '#991b1b', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚠️</span> {error}
            </div>}

            {result && <div style={{ marginTop: 24, padding: '24px', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 24, color: '#065f46', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                <h3 style={{ margin: 0, fontWeight: 900 }}>Synchronized Successfully</h3>
                <p style={{ margin: '8px 0 0 0', fontWeight: 500 }}>{result.count} new infrastructure nodes added to registry. Redirecting to workspace...</p>
            </div>}
        </div>
    );
}
