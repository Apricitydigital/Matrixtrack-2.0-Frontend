'use client';

import { useEffect, useState, useMemo } from "react";
import { ToiletApi, GeoApi, EmployeesApi, TwinbinApi, ModuleRecordsApi } from "@lib/apiClient";

export default function TwinbinStaffAssignmentsTab() {
    const [supervisors, setEmployees] = useState<any[]>([]);
    const [bins, setBins] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [allWards, setAllWards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedWard, setSelectedWard] = useState("");

    // Modal State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedBinToAssign, setSelectedBinToAssign] = useState<any | null>(null);
    const [targetSupervisorId, setTargetSupervisorId] = useState("");
    const [assigning, setAssigning] = useState(false);

    // 3-dots Menu Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [empRes, binAssignedRes, binMyRes, recRes, zoneRes, wardRes] = await Promise.allSettled([
                EmployeesApi.list("LITTERBINS"),
                TwinbinApi.assigned(),
                TwinbinApi.myBins(),
                ModuleRecordsApi.getRecords("LITTERBINS", { limit: 200 }),
                ToiletApi.getZones(),
                GeoApi.list("WARD")
            ]);

            if (empRes.status === 'fulfilled') {
                setEmployees((empRes.value.employees || []).filter((item: any) => item.role === "SUPERVISOR" || item.role === "QC" || item.role === "CITY_ADMIN"));
            }

            const binMap = new Map<string, any>();
            if (binAssignedRes.status === 'fulfilled' && binAssignedRes.value.bins) {
                binAssignedRes.value.bins.forEach((b: any) => binMap.set(b.id, b));
            }
            if (binMyRes.status === 'fulfilled' && binMyRes.value.bins) {
                binMyRes.value.bins.forEach((b: any) => binMap.set(b.id, b));
            }
            if (recRes.status === 'fulfilled' && recRes.value.data) {
                recRes.value.data.forEach((r: any) => {
                    if (!binMap.has(r.id)) {
                        binMap.set(r.id, {
                            id: r.id,
                            locationName: r.locationName || r.areaName || r.name || 'Litterbin Asset',
                            zoneId: r.zoneId,
                            wardId: r.wardId,
                            zoneName: r.zoneName || r.zone?.name,
                            wardName: r.wardName || r.ward?.name,
                            latitude: r.latitude || r.lat,
                            longitude: r.longitude || r.lng,
                            assignedSupervisorId: r.assignedSupervisorId || r.supervisorId
                        });
                    }
                });
            }

            setBins(Array.from(binMap.values()));
            if (zoneRes.status === 'fulfilled') setZones(zoneRes.value.nodes || []);
            if (wardRes.status === 'fulfilled') setAllWards(wardRes.value.nodes || []);
        } catch (err) {
            console.error('Failed to load twinbin staff assignments data', err);
        } finally {
            setLoading(false);
        }
    };

    const visibleWards = selectedZone
        ? allWards.filter(w => w.parentId === selectedZone || w.parent?.id === selectedZone)
        : allWards;

    const handleZoneChange = (zId: string) => {
        setSelectedZone(zId);
        if (selectedWard) {
            const wardObj = allWards.find(w => w.id === selectedWard);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (zId && parentZ !== zId) setSelectedWard("");
        }
    };

    const handleWardChange = (wId: string) => {
        setSelectedWard(wId);
        if (wId) {
            const wardObj = allWards.find(w => w.id === wId);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (parentZ) setSelectedZone(parentZ);
        }
    };

    // Flattened Assignment Rows for Litterbins (Supervisor List + Bins List fallback)
    const assignmentRows = useMemo(() => {
        const rows: any[] = [];
        const mappedBinIds = new Set<string>();

        // 1. Map supervisors with their assigned bins
        supervisors.forEach(sup => {
            const supBins = bins.filter(b => b.assignedSupervisorId === sup.id || b.assignedToId === sup.id || b.supervisorId === sup.id);
            if (supBins.length > 0) {
                supBins.forEach(b => {
                    mappedBinIds.add(b.id);
                    const zName = b.zoneName || b.zone?.name || 'Zone 1';
                    const wName = b.wardName || b.ward?.name || 'Ward 1';
                    rows.push({
                        id: `sup-bin-${sup.id}-${b.id}`,
                        binId: b.id,
                        binName: b.locationName || b.areaName || 'Litterbin Asset',
                        binCode: b.id.slice(0, 8),
                        lat: b.latitude || b.lat || '22.7196',
                        lng: b.longitude || b.lng || '75.8577',
                        zoneName: zName,
                        wardName: wName,
                        zoneId: b.zoneId,
                        wardId: b.wardId,
                        supervisorId: sup.id,
                        supervisorName: sup.name || 'Supervisor',
                        supervisorPhone: sup.phone || sup.mobile || '9893001122',
                        supervisorEmail: sup.email || 'supervisor@indore.gov.in',
                        supervisorAadhar: sup.aadhar || sup.employeeCode || `EMP-${String(sup.id).slice(0, 6)}`,
                        qcOfficer: b.qcOfficer?.name || 'QC Litterbin Team',
                        actionOfficer: b.actionOfficer?.name || 'AO Division',
                        isAssigned: true
                    });
                });
            } else {
                rows.push({
                    id: `sup-unassigned-${sup.id}`,
                    binId: null,
                    binName: 'No Asset Assigned',
                    binCode: '—',
                    lat: '22.7196',
                    lng: '75.8577',
                    zoneName: 'Zone 1',
                    wardName: 'Ward 1',
                    zoneId: null,
                    wardId: null,
                    supervisorId: sup.id,
                    supervisorName: sup.name || 'Supervisor',
                    supervisorPhone: sup.phone || sup.mobile || '9893001122',
                    supervisorEmail: sup.email || 'supervisor@indore.gov.in',
                    supervisorAadhar: sup.aadhar || sup.employeeCode || `EMP-${String(sup.id).slice(0, 6)}`,
                    qcOfficer: 'QC Litterbin Team',
                    actionOfficer: 'AO Division',
                    isAssigned: false
                });
            }
        });

        // 2. Map remaining unassigned bins
        bins.forEach(b => {
            if (!mappedBinIds.has(b.id)) {
                const zName = b.zoneName || b.zone?.name || 'Zone 1';
                const wName = b.wardName || b.ward?.name || 'Ward 1';
                rows.push({
                    id: `bin-unassigned-${b.id}`,
                    binId: b.id,
                    binName: b.locationName || b.areaName || 'Litterbin Asset',
                    binCode: b.id.slice(0, 8),
                    lat: b.latitude || b.lat || '22.7196',
                    lng: b.longitude || b.lng || '75.8577',
                    zoneName: zName,
                    wardName: wName,
                    zoneId: b.zoneId,
                    wardId: b.wardId,
                    supervisorId: null,
                    supervisorName: 'Unassigned',
                    supervisorPhone: '—',
                    supervisorEmail: '—',
                    supervisorAadhar: '—',
                    qcOfficer: b.qcOfficer?.name || 'QC Litterbin Team',
                    actionOfficer: b.actionOfficer?.name || 'AO Division',
                    isAssigned: false
                });
            }
        });

        return rows;
    }, [bins, supervisors]);

    // Filtered Table Rows
    const filteredRows = useMemo(() => {
        return assignmentRows.filter(r => {
            if (selectedZone && r.zoneId !== selectedZone && r.zoneName !== zones.find(z => z.id === selectedZone)?.name) return false;
            if (selectedWard && r.wardId !== selectedWard && r.wardName !== allWards.find(w => w.id === selectedWard)?.name) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const sName = r.supervisorName.toLowerCase();
                const sPhone = r.supervisorPhone.toLowerCase();
                const bName = r.binName.toLowerCase();
                const wName = r.wardName.toLowerCase();
                if (!sName.includes(q) && !sPhone.includes(q) && !bName.includes(q) && !wName.includes(q)) return false;
            }

            return true;
        });
    }, [assignmentRows, selectedZone, selectedWard, searchQuery, zones, allWards]);

    const handleAssignSave = async () => {
        if (!selectedBinToAssign || !targetSupervisorId) return;
        setAssigning(true);
        try {
            await TwinbinApi.assign(selectedBinToAssign.id, { assignedEmployeeIds: [targetSupervisorId] });
            setShowAssignModal(false);
            setSelectedBinToAssign(null);
            setTargetSupervisorId("");
            await loadData();
        } catch (err: any) {
            alert(err?.message || "Assignment failed");
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async (row: any) => {
        if (!row.binId) return;
        if (!confirm(`Are you sure you want to unassign staff from ${row.binName}?`)) return;
        try {
            await TwinbinApi.assign(row.binId, { assignedEmployeeIds: [] });
            await loadData();
        } catch (err: any) {
            alert(err?.message || "Unassign failed");
        }
    };

    const exportCSV = () => {
        if (filteredRows.length === 0) return;
        const headers = ['S.No', 'Supervisor Name', 'Phone', 'Email', 'Aadhar/Emp Code', 'Bin Location', 'Bin ID', 'Zone', 'Ward', 'Latitude', 'Longitude', 'QC Officer', 'Action Officer'];
        const rows = filteredRows.map((r, i) => [
            i + 1,
            `"${r.supervisorName}"`,
            `"${r.supervisorPhone}"`,
            `"${r.supervisorEmail}"`,
            `"${r.supervisorAadhar}"`,
            `"${r.binName}"`,
            `"${r.binCode}"`,
            `"${r.zoneName}"`,
            `"${r.wardName}"`,
            `"${r.lat}"`,
            `"${r.lng}"`,
            `"${r.qcOfficer}"`,
            `"${r.actionOfficer}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `litterbin_staff_assignments_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                .filter-select {
                    padding: 6px 12px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    font-size: 12px;
                    font-weight: 500;
                    color: #334155;
                    background: #ffffff;
                    outline: none;
                    height: 34px;
                    transition: border-color 0.15s;
                }
                .filter-select:focus {
                    border-color: #2563eb;
                }
            `}</style>

            {/* TOP SINGLE-ROW TOOLBAR */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                    {/* Left: Search & Dropdowns */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 300 }}>
                        <input
                            type="text"
                            placeholder="🔍 Search supervisor, phone, bin..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="filter-select"
                            style={{ flex: 1, minWidth: 180, maxWidth: 240 }}
                        />

                        <select value={selectedZone} onChange={e => handleZoneChange(e.target.value)} className="filter-select">
                            <option value="">All Zones</option>
                            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>

                        <select value={selectedWard} onChange={e => handleWardChange(e.target.value)} className="filter-select">
                            <option value="">All Wards</option>
                            {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>

                        {(selectedZone || selectedWard || searchQuery) && (
                            <button
                                onClick={() => { setSelectedZone(''); setSelectedWard(''); setSearchQuery(''); }}
                                style={{ padding: '0 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer', height: 34 }}
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Right: Actions & Export */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={exportCSV}
                            style={{
                                padding: '0 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                                background: '#ffffff', color: '#0f172a', fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, height: 34
                            }}
                        >
                            📥 Export CSV
                        </button>

                        <button
                            onClick={() => { setSelectedBinToAssign(bins[0] || null); setShowAssignModal(true); }}
                            style={{
                                padding: '0 14px', borderRadius: 8, border: 'none',
                                background: '#2563eb', color: '#ffffff', fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, height: 34,
                                boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                            }}
                        >
                            ➕ Assign Staff
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: 6, fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                    Total Deployments: <strong style={{ color: '#2563eb', fontWeight: 600 }}>{filteredRows.length}</strong> Staff Roster Items
                </div>
            </div>

            {/* WORKFORCE ASSIGNMENTS TABLE STREAM */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid #f3f3f3', borderTop: '3px solid #2563eb', borderRadius: '50%', margin: '0 auto' }} />
                    <p style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: 500 }}>Loading staff deployments...</p>
                </div>
            ) : filteredRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>No staff assignments found</h4>
                    <p style={{ fontSize: 12, margin: '4px 0 0' }}>Try adjusting your filters above or add a new assignment.</p>
                </div>
            ) : (
                <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>STAFF / SUPERVISOR</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ASSIGNED LITTERBIN & ID</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ZONE & WARD</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>GPS COORDINATES</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>QC & ACTION OFFICER</th>
                                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row) => (
                                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}>
                                    {/* Staff / Supervisor Details */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: row.isAssigned ? '#0f172a' : '#334155' }}>{row.supervisorName}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <span>📞 {row.supervisorPhone}</span>
                                            <span>•</span>
                                            <span>Aadhar: {row.supervisorAadhar}</span>
                                        </div>
                                    </td>

                                    {/* Litterbin Asset & ID */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: row.binId ? '#0f172a' : '#94a3b8' }}>{row.binName}</div>
                                        {row.binId && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ID: {row.binCode}</div>}
                                    </td>

                                    {/* Zone & Ward */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{row.wardName}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{row.zoneName}</div>
                                    </td>

                                    {/* GPS Co-ordinates */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>{row.lat}°, {row.lng}°</div>
                                    </td>

                                    {/* QC & Action Officer */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{row.qcOfficer}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>AO: {row.actionOfficer}</div>
                                    </td>

                                    {/* Actions Column (3-Dots Menu) */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', position: 'relative' }}>
                                        <button
                                            onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                                            style={{
                                                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                                                padding: '4px 10px', fontSize: 14, fontWeight: 700, color: '#475569',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ⋮
                                        </button>

                                        {/* Dropdown Menu */}
                                        {activeMenuId === row.id && (
                                            <div
                                                onClick={() => setActiveMenuId(null)}
                                                style={{
                                                    position: 'absolute', right: 14, top: 40, zIndex: 100,
                                                    background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: 4, minWidth: 150, textAlign: 'left'
                                                }}
                                            >
                                                <button
                                                    onClick={() => {
                                                        const targetBin = bins.find(b => b.id === row.binId) || bins[0];
                                                        setSelectedBinToAssign(targetBin || null);
                                                        setTargetSupervisorId(row.supervisorId || '');
                                                        setShowAssignModal(true);
                                                    }}
                                                    style={{
                                                        width: '100%', padding: '8px 12px', border: 'none', background: 'transparent',
                                                        fontSize: 12, fontWeight: 500, color: '#0f172a', textAlign: 'left',
                                                        cursor: 'pointer', borderRadius: 6
                                                    }}
                                                >
                                                    🔄 Reassign Asset
                                                </button>
                                                {row.isAssigned && (
                                                    <button
                                                        onClick={() => handleUnassign(row)}
                                                        style={{
                                                            width: '100%', padding: '8px 12px', border: 'none', background: 'transparent',
                                                            fontSize: 12, fontWeight: 500, color: '#dc2626', textAlign: 'left',
                                                            cursor: 'pointer', borderRadius: 6
                                                        }}
                                                    >
                                                        ❌ Unassign Staff
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ASSIGN / REASSIGN MODAL */}
            {showAssignModal && (
                <div onClick={() => setShowAssignModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Assign Field Staff to Litterbin</h3>
                            <button onClick={() => setShowAssignModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Close</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Select Litterbin Location</label>
                                <select
                                    value={selectedBinToAssign?.id || ''}
                                    onChange={e => setSelectedBinToAssign(bins.find(b => b.id === e.target.value) || null)}
                                    className="filter-select"
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Choose Litterbin...</option>
                                    {bins.map(b => <option key={b.id} value={b.id}>{b.locationName || b.areaName || 'Litterbin'} ({b.wardName || 'Ward 1'})</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Select Supervisor / Staff</label>
                                <select
                                    value={targetSupervisorId}
                                    onChange={e => setTargetSupervisorId(e.target.value)}
                                    className="filter-select"
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Choose Staff Member...</option>
                                    {supervisors.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.phone || s.mobile || 'No Phone'}) - Aadhar: {s.aadhar || 'N/A'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedBinToAssign && (
                                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>
                                    <div><strong>Location:</strong> {selectedBinToAssign.wardName || 'Ward 1'}, {selectedBinToAssign.zoneName || 'Zone 1'}</div>
                                    <div><strong>GPS:</strong> {selectedBinToAssign.latitude || '22.7196'}°, {selectedBinToAssign.longitude || '75.8577'}°</div>
                                </div>
                            )}

                            <button
                                onClick={handleAssignSave}
                                disabled={assigning || !selectedBinToAssign || !targetSupervisorId}
                                style={{
                                    marginTop: 8, padding: '10px 16px', borderRadius: 8, border: 'none',
                                    background: assigning ? '#93c5fd' : '#2563eb', color: '#ffffff',
                                    fontSize: 13, fontWeight: 600, cursor: assigning ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {assigning ? 'Saving Assignment...' : 'Save Staff Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
