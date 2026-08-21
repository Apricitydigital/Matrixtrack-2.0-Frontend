'use client';

import { useEffect, useState, useMemo } from 'react';
import { ModuleGuard, Protected } from '@components/Guards';
import { ApiError, AuthApi, PublicGeoApi, TwinbinApi, ToiletApi } from '@lib/apiClient';
import { useRouter } from 'next/navigation';

type GeoNode = { id: string; name: string };
type Tab = 'MANUAL' | 'CSV';
type TableFilter = 'ALL' | 'VALID' | 'INVALID';

type PreviewRow = {
    index: number;
    zoneName: string;
    wardName: string;
    areaType: string;
    areaName: string;
    latitude: string;
    longitude: string;
    isValid: boolean;
    validationError?: string;
};

const AREA_TYPES = [
    { value: 'RESIDENTIAL', label: 'Residential' },
    { value: 'COMMERCIAL', label: 'Commercial Area' },
    { value: 'SLUM', label: 'Slum' },
    { value: 'RELIGIOUS_PLACE', label: 'Religious Place' },
    { value: 'TOURIST_AREA', label: 'Tourist Areas' },
    { value: 'TRANSPORT_HUB', label: 'Transport Hub' },
    { value: 'PARKS_AND_GARDENS', label: 'Parks and Gardens' },
    { value: 'MARKET_AREA', label: 'Market' },
    { value: 'PARKING', label: 'Parking' },
];

export default function TwinbinRegisterPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('MANUAL');
    const [zones, setZones] = useState<GeoNode[]>([]);
    const [wards, setWards] = useState<GeoNode[]>([]);
    const [allWardsWithZone, setAllWardsWithZone] = useState<any[]>([]);

    // Manual Form State (6 Mobile App Fields)
    const [form, setForm] = useState({
        zoneId: '',
        wardId: '',
        areaType: 'RESIDENTIAL',
        areaName: '',
        latitude: '',
        longitude: '',
        photoUrl: ''
    });

    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [locFetching, setLocFetching] = useState(false);

    // CSV Bulk Upload State
    const [file, setFile] = useState<File | null>(null);
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [tableFilter, setTableFilter] = useState<TableFilter>('ALL');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const loadGeoNodes = async () => {
            try {
                const { user } = await AuthApi.getMe();
                const module = user.modules?.find((m: any) => m.key === 'LITTERBINS' || m.name === 'LITTERBINS');
                const effectiveCityId = module?.cityId || user.cityId;

                if (effectiveCityId) {
                    const { zones: fetchedZones } = await PublicGeoApi.zones(effectiveCityId);
                    setZones(fetchedZones);

                    const collectedWards: any[] = [];
                    for (const z of fetchedZones) {
                        try {
                            const { wards: wList } = await PublicGeoApi.wards(z.id);
                            collectedWards.push(...(wList || []).map((w: any) => ({ ...w, zoneId: z.id, zoneName: z.name })));
                        } catch (e) {
                            // ignore individual ward errors
                        }
                    }
                    setAllWardsWithZone(collectedWards);
                }
            } catch (err) {
                console.error('Failed to load geo nodes:', err);
            }
        };
        loadGeoNodes();
    }, []);

    const filteredWards = useMemo(() => {
        if (!form.zoneId) return allWardsWithZone;
        return allWardsWithZone.filter(w => w.zoneId === form.zoneId);
    }, [form.zoneId, allWardsWithZone]);

    const fetchLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }
        setLocFetching(true);
        setError('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm(f => ({
                    ...f,
                    latitude: pos.coords.latitude.toFixed(6),
                    longitude: pos.coords.longitude.toFixed(6)
                }));
                setLocFetching(false);
            },
            (err) => {
                setError('Failed to fetch live location: ' + err.message);
                setLocFetching(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.zoneId || !form.wardId || !form.areaName.trim() || !form.latitude || !form.longitude) {
            setError('Please fill in all mandatory fields: Zone, Ward, Area Name, and Coordinates.');
            return;
        }

        setSubmitting(true);
        setError('');
        setStatus('');

        try {
            await TwinbinApi.requestBin({
                zoneId: form.zoneId,
                wardId: form.wardId,
                areaName: form.areaName.trim(),
                areaType: form.areaType,
                locationName: form.areaName.trim(),
                roadType: 'N/A',
                isFixedProperly: true,
                hasLid: true,
                condition: 'GOOD',
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude)
            });
            setStatus('Litterbin registered successfully!');
            setTimeout(() => router.push('/modules/twinbin'), 2000);
        } catch (err: any) {
            const msg = err instanceof ApiError ? err.message : 'Failed to submit bin registration';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const parseAndValidateCSV = async (csvFile: File) => {
        try {
            const text = await csvFile.text();
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length < 2) {
                setError('CSV file is empty or missing data rows');
                setPreviewRows([]);
                return;
            }

            const parsed: PreviewRow[] = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length < 4) continue;

                // Zone Name, Ward Name, Area Type, Area Name, Latitude, Longitude
                const zoneName = values[0] || '';
                const wardName = values[1] || '';
                const areaType = values[2] || 'RESIDENTIAL';
                const areaName = values[3] || '';
                const latStr = values[4] || '';
                const lonStr = values[5] || '';

                const matchedZone = zones.find(z => z.name.trim().toLowerCase() === zoneName.toLowerCase());
                const matchedWard = allWardsWithZone.find(w =>
                    w.name.trim().toLowerCase() === wardName.toLowerCase() &&
                    (!matchedZone || w.zoneId === matchedZone.id)
                );

                let isValid = true;
                let validationError = '';

                if (!matchedZone) {
                    isValid = false;
                    validationError = `Zone '${zoneName}' not registered in system Master Data`;
                } else if (!matchedWard) {
                    isValid = false;
                    validationError = `Ward '${wardName}' not registered under ${matchedZone.name}`;
                }

                parsed.push({
                    index: i,
                    zoneName,
                    wardName,
                    areaType,
                    areaName: areaName || 'Litterbin Location',
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
            setStatus('');
            parseAndValidateCSV(selected);
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
            const csvLines = [
                'Zone Name,Ward Name,Area Type,Area Name,Latitude,Longitude',
                ...validRows.map(r => `${r.zoneName},${r.wardName},${r.areaType},${r.areaName},${r.latitude},${r.longitude}`)
            ];
            const csvText = csvLines.join('\n');

            const response = await TwinbinApi.bulkImport(csvText);
            setStatus(`Successfully registered ${response.count} litterbin assets!`);
            setTimeout(() => router.push('/modules/twinbin'), 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to process bulk import');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'Zone Name,Ward Name,Area Type,Area Name,Latitude,Longitude\n' +
            'Central Zone,Ward 5,RESIDENTIAL,Near Community Center,28.6139,77.2090\n' +
            'West Zone,Ward 10,COMMERCIAL,Main Market Square,28.6140,77.2091';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'litterbin-registration-template.csv';
        a.click();
    };

    const clearFile = () => {
        setFile(null);
        setPreviewRows([]);
        setError('');
        setStatus('');
    };

    return (
        <Protected>
            <ModuleGuard module="LITTERBINS" roles={["SUPERVISOR", "CITY_ADMIN", "HMS_SUPER_ADMIN", "ULB_OFFICER", "QC"]}>
                <div style={{ padding: '24px 0 40px 0', animation: 'fadeIn 0.5s ease-out' }}>
                    <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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
                            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>Register Litterbin</h1>
                            <p style={{ color: '#64748b', fontSize: 15, marginTop: 4, fontWeight: 500 }}>Register new litterbin infrastructure via manual form or preview & import bulk CSV datasets.</p>
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
                            <form onSubmit={handleManualSubmit} style={{ padding: 40 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                                    {/* 1. Zone */}
                                    <div>
                                        <label className="label">Zone *</label>
                                        <select
                                            className="input-field"
                                            value={form.zoneId}
                                            onChange={e => setForm({ ...form, zoneId: e.target.value, wardId: '' })}
                                            required
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
                                            value={form.wardId}
                                            onChange={e => setForm({ ...form, wardId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Ward</option>
                                            {filteredWards.map(w => (
                                                <option key={w.id} value={w.id}>{w.zoneName ? `${w.zoneName} / ` : ''}{w.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 3. Area Type */}
                                    <div>
                                        <label className="label">Area Type *</label>
                                        <select
                                            className="input-field"
                                            value={form.areaType}
                                            onChange={e => setForm({ ...form, areaType: e.target.value })}
                                            required
                                        >
                                            {AREA_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 4. Area Name */}
                                    <div>
                                        <label className="label">Area Name *</label>
                                        <input
                                            className="input-field"
                                            value={form.areaName}
                                            onChange={e => setForm({ ...form, areaName: e.target.value })}
                                            placeholder="e.g. Community Park / Market Square"
                                            required
                                        />
                                    </div>

                                    {/* 5. Latitude */}
                                    <div>
                                        <label className="label">Latitude *</label>
                                        <input
                                            className="input-field"
                                            value={form.latitude}
                                            onChange={e => setForm({ ...form, latitude: e.target.value })}
                                            placeholder="Decimal (e.g. 28.6139)"
                                            required
                                        />
                                    </div>

                                    {/* 5. Longitude */}
                                    <div>
                                        <label className="label">Longitude *</label>
                                        <input
                                            className="input-field"
                                            value={form.longitude}
                                            onChange={e => setForm({ ...form, longitude: e.target.value })}
                                            placeholder="Decimal (e.g. 77.2090)"
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={fetchLocation}
                                        disabled={locFetching}
                                        style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: 12, background: '#f8fafc', color: '#334155', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                                    >
                                        {locFetching ? 'Fetching Live Location...' : '📍 Fetch Live Location'}
                                    </button>
                                </div>

                                <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{ flex: 1, backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: 16, padding: '16px', fontWeight: 900, fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px -5px rgba(15,23,42,0.3)' }}
                                    >
                                        {submitting ? 'Submitting...' : 'Complete Litterbin Registration'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        style={{ padding: '16px 32px', border: '1px solid #e2e8f0', borderRadius: 16, background: 'transparent', color: '#64748b', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                                    >Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <div style={{ padding: 40 }}>
                                {!file || previewRows.length === 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'start' }}>
                                        <div>
                                            <div style={{ backgroundColor: '#f8fafc', borderRadius: 24, padding: 36, border: '2px dashed #cbd5e1', textAlign: 'center', transition: 'all 0.3s' }}>
                                                <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
                                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Upload Litterbin CSV File for Validation</h3>
                                                <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, fontWeight: 500 }}>Select a CSV dataset. The system will preview data & validate Zones/Wards before importing.</p>

                                                <label style={{ display: 'inline-block', marginTop: 24, backgroundColor: '#1e293b', color: 'white', padding: '14px 28px', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,41,59,0.2)' }}>
                                                    Select Litterbin CSV File
                                                    <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                                                </label>
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
                                                    { f: 'Area Type', d: 'RESIDENTIAL, COMMERCIAL, SLUM, etc.' },
                                                    { f: 'Area Name', d: 'Name of location / area' },
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
                                                                        Registered
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

                    {status && <div style={{ marginTop: 24, padding: '24px', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 24, color: '#065f46', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                        <h3 style={{ margin: 0, fontWeight: 900 }}>Synchronized Successfully</h3>
                        <p style={{ margin: '8px 0 0 0', fontWeight: 500 }}>{status}. Redirecting to workspace...</p>
                    </div>}
                </div>
            </ModuleGuard>
        </Protected>
    );
}
