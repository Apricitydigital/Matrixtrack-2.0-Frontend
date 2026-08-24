'use client';

import { useState, useEffect, useMemo } from 'react';
import { ToiletApi } from '@lib/apiClient';
import { useRouter } from 'next/navigation';

type Tab = 'MANUAL' | 'CSV';
type TableFilter = 'ALL' | 'VALID' | 'INVALID';

type PreviewRow = {
    index: number;
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
    { value: 'COMMERCIAL_AREA', label: 'Commercial Area' },
    { value: 'RELIGIOUS_PLACE', label: 'Religious Place' },
    { value: 'TOURIST_AREAS', label: 'Tourist Areas' },
    { value: 'TRANSPORT_HUB', label: 'Transport Hub' },
    { value: 'PARKS_AND_GARDENS', label: 'Parks and Gardens' },
    { value: 'MARKET', label: 'Market' },
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
            } catch (err) {
                console.error("Failed to load geo nodes", err);
            }
        };
        loadGeo();
    }, []);

    const filteredWards = formData.zoneId
        ? wards.filter(w => w.zoneId === formData.zoneId)
        : wards;

    const parseAndValidateCSV = async (csvFile: File) => {
        try {
            const text = await csvFile.text();
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length < 2) {
                setError('CSV file is empty or missing data rows');
                setPreviewRows([]);
                return;
            }

            const headerRow = lines[0].toLowerCase().split(',').map(h => h.trim());
            const is9ColFormat = headerRow.includes('toilet type') || headerRow.includes('area type') || headerRow.includes('toilet name / id') || headerRow[0].includes('zone');

            const parsed: PreviewRow[] = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length < 3) continue;

                let zoneName = '', wardName = '', areaType = 'RESIDENTIAL', areaName = '', name = '', address = '', typeStr = 'CT', latStr = '', lonStr = '';

                if (is9ColFormat) {
                    // Zone Name,Ward Name,Area Type,Area Name,Toilet Name / ID,Address,Toilet Type,Latitude,Longitude
                    zoneName = values[0] || '';
                    wardName = values[1] || '';
                    areaType = values[2] || 'RESIDENTIAL';
                    areaName = values[3] || '';
                    name = values[4] || '';
                    address = values[5] || '';
                    typeStr = values[6] || 'CT';
                    latStr = values[7] || '';
                    lonStr = values[8] || '';
                } else {
                    // Name,Zone Name,Ward Name,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address
                    name = values[0] || '';
                    zoneName = values[1] || '';
                    wardName = values[2] || '';
                    typeStr = values[3] || 'CT';
                    latStr = values[8] || '';
                    lonStr = values[9] || '';
                    address = values.slice(10).join(',');
                }

                // Skip completely blank trailing rows exported by Excel
                if (!zoneName.trim() && !wardName.trim() && !name.trim() && !address.trim() && (!latStr || latStr === '0')) {
                    continue;
                }
                if (!zoneName.trim() && !wardName.trim()) {
                    continue;
                }

                // Flexible Zone Matching against system registered Master Data
                let matchedZone = zones.find(z => z.name.trim().toLowerCase() === zoneName.toLowerCase());
                if (!matchedZone) {
                    const zoneNum = zoneName.replace(/\D/g, "");
                    if (zoneNum) {
                        matchedZone = zones.find(z => z.name.replace(/\D/g, "") === zoneNum);
                    }
                }
                if (!matchedZone) {
                    matchedZone = zones.find(z => z.name.toLowerCase().includes(zoneName.toLowerCase()) || zoneName.toLowerCase().includes(z.name.toLowerCase()));
                }

                // Flexible Ward Matching against system registered Master Data
                const candidateWards = matchedZone ? wards.filter(w => w.zoneId === matchedZone.id) : wards;
                let matchedWard = candidateWards.find(w => w.name.trim().toLowerCase() === wardName.toLowerCase());
                if (!matchedWard) {
                    const wardNum = wardName.replace(/\D/g, "");
                    if (wardNum) {
                        matchedWard = candidateWards.find(w => {
                            const wNum = w.name.split('-')[0]?.trim().replace(/\D/g, "") || w.name.replace(/\D/g, "");
                            return wNum === wardNum;
                        });
                    }
                }
                if (!matchedWard) {
                    const cleanWard = wardName.replace(/ward/i, "").trim().toLowerCase();
                    if (cleanWard) {
                        matchedWard = candidateWards.find(w => w.name.toLowerCase().includes(cleanWard) || cleanWard.includes(w.name.toLowerCase()));
                    }
                }
                if (!matchedWard && matchedZone) {
                    const wardNum = wardName.replace(/\D/g, "");
                    const cleanWard = wardName.replace(/ward/i, "").trim().toLowerCase();
                    matchedWard = wards.find(w => 
                        (wardNum && (w.name.split('-')[0]?.trim().replace(/\D/g, "") === wardNum)) ||
                        (cleanWard && w.name.toLowerCase().includes(cleanWard))
                    );
                }

                let isValid = true;
                let validationError = '';

                if (!matchedZone) {
                    isValid = false;
                    validationError = `Zone '${zoneName}' not registered in system Master Data`;
                } else if (!matchedWard) {
                    isValid = false;
                    validationError = `Ward '${wardName}' not registered under ${matchedZone?.name || 'Zone'}`;
                }

                parsed.push({
                    index: parsed.length + 1,
                    zoneName: matchedZone ? matchedZone.name : zoneName,
                    wardName: matchedWard ? matchedWard.name : wardName,
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
            // Build validated CSV containing only valid rows
            const csvLines = [
                'Zone Name,Ward Name,Area Type,Area Name,Toilet Name / ID,Address,Toilet Type,Latitude,Longitude',
                ...validRows.map(r => `${r.zoneName},${r.wardName},${r.areaType},${r.areaName},${r.name},${r.address},${r.type},${r.latitude},${r.longitude}`)
            ];
            const csvText = csvLines.join('\n');

            const response = await ToiletApi.bulkImport(csvText);
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

            const csvData = `Zone Name,Ward Name,Area Type,Area Name,Toilet Name / ID,Address,Toilet Type,Latitude,Longitude\n${zoneName},${wardName},${formData.areaType},${formData.areaName},${toiletName},${formData.address},${formData.type},${formData.latitude},${formData.longitude}`;
            
            const response = await ToiletApi.bulkImport(csvData);
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
                                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Upload CSV File for Validation</h3>
                                        <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, fontWeight: 500 }}>Select a CSV dataset. The system will preview data & validate Zones/Wards before importing.</p>

                                        <label style={{ display: 'inline-block', marginTop: 24, backgroundColor: '#1e293b', color: 'white', padding: '14px 28px', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,41,59,0.2)' }}>
                                            Select CSV File
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
