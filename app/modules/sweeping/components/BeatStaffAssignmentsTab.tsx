'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AreaBeatApi, GeoApi } from '@lib/apiClient';
import AssignBeatModal from '../../../city/areas/components/AssignBeatModal';

export default function BeatStaffAssignmentsTab() {
    const [viewMode, setViewMode] = useState<'supervisor' | 'employee'>('supervisor');
    const [beats, setBeats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [selectedZone, setSelectedZone] = useState('');
    const [selectedWard, setSelectedWard] = useState('');

    const [zones, setZones] = useState<any[]>([]);
    const [allWards, setAllWards] = useState<any[]>([]);

    const [selectedBeat, setSelectedBeat] = useState<any | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [beatsRes, zoneRes, wardRes] = await Promise.allSettled([
                AreaBeatApi.list(),
                GeoApi.list("ZONE"),
                GeoApi.list("WARD")
            ]);

            if (beatsRes.status === 'fulfilled') setBeats(beatsRes.value.beats || []);
            if (zoneRes.status === 'fulfilled') setZones(zoneRes.value.nodes || []);
            if (wardRes.status === 'fulfilled') setAllWards(wardRes.value.nodes || []);
        } catch (err) {
            console.error('Failed to load beat assignments data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const visibleWards = selectedZone
        ? allWards.filter(w => w.parentId === selectedZone || w.parent?.id === selectedZone)
        : allWards;

    const handleZoneChange = (zId: string) => {
        setSelectedZone(zId);
        if (selectedWard) {
            const wardObj = allWards.find(w => w.id === selectedWard);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (zId && parentZ !== zId) setSelectedWard('');
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

    // Filter Beats
    const filteredBeats = useMemo(() => {
        const q = search.trim().toLowerCase();
        return beats.filter(beat => {
            const matchesSearch = !q ||
                beat.beatName?.toLowerCase().includes(q) ||
                beat.zoneName?.toLowerCase().includes(q) ||
                beat.wardName?.toLowerCase().includes(q) ||
                beat.areaName?.toLowerCase().includes(q) ||
                (beat.supervisorsSummary || []).some((s: any) => s.name?.toLowerCase().includes(q));

            const matchesZone = !selectedZone || beat.zoneId === selectedZone || beat.zoneName === zones.find(z => z.id === selectedZone)?.name;
            const selectedWardObj = allWards.find(w => w.id === selectedWard);
            const matchesWard = !selectedWard || beat.wardId === selectedWard || beat.wardName === selectedWardObj?.name;

            return matchesSearch && matchesZone && matchesWard;
        });
    }, [beats, search, selectedZone, selectedWard, zones, allWards]);

    const exportCSV = () => {
        if (filteredBeats.length === 0) return;
        const headers = ['S.No', 'Beat Name', 'Beat ID', 'Zone', 'Ward', 'Total Segments', 'Supervisors / Staff'];
        const rows = filteredBeats.map((b, i) => [
            i + 1,
            `"${b.beatName || 'Beat'}"`,
            `"${b.id}"`,
            `"${b.zoneName || 'Zone 1'}"`,
            `"${b.wardName || 'Ward 1'}"`,
            b.totalSegments || b.segments?.length || 0,
            `"${(b.supervisorsSummary || []).map((s: any) => s.name).join(', ') || 'Unassigned'}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `beat_staff_assignments_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isSupervisorView = viewMode === 'supervisor';

    const totalSupervisors = useMemo(() => {
        const supervisorKeys = new Set<string>();

        beats.forEach((beat: any) => {
            (beat.supervisorsSummary || []).forEach((supervisor: any) => {
                const key = String(
                    supervisor?.id ||
                    supervisor?.userId ||
                    supervisor?.name ||
                    ""
                ).trim();

                if (key) {
                    supervisorKeys.add(key);
                }
            });
        });

        return supervisorKeys.size;
    }, [beats]);
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

            {/* SINGLE ROW TOOLBAR WITH FILTERS & ACTIONS */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                    {/* Left: View Mode Toggle, Search & Filters */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 320 }}>
                        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <button
                                onClick={() => setViewMode('supervisor')}
                                style={{
                                    padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    background: isSupervisorView ? '#ffffff' : 'transparent',
                                    color: isSupervisorView ? '#2563eb' : '#64748b',
                                    boxShadow: isSupervisorView ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                                }}
                            >
                                Supervisor View
                            </button>
                            <button
                                onClick={() => setViewMode('employee')}
                                style={{
                                    padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    background: !isSupervisorView ? '#ffffff' : 'transparent',
                                    color: !isSupervisorView ? '#2563eb' : '#64748b',
                                    boxShadow: !isSupervisorView ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                                }}
                            >
                                Employee View
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="🔍 Search beat, supervisor, ward..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="filter-select"
                            style={{ flex: 1, minWidth: 160, maxWidth: 220 }}
                        />

                        <select value={selectedZone} onChange={e => handleZoneChange(e.target.value)} className="filter-select">
                            <option value="">All Zones</option>
                            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>

                        <select value={selectedWard} onChange={e => handleWardChange(e.target.value)} className="filter-select">
                            <option value="">All Wards</option>
                            {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>

                        {(search || selectedZone || selectedWard) && (
                            <button
                                onClick={() => { setSearch(''); setSelectedZone(''); setSelectedWard(''); }}
                                style={{ padding: '0 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer', height: 34 }}
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Right: Export & Add Action */}
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
                    </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ background: '#eff6ff', padding: '6px 12px', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600, color: '#1e40af' }}>
                        👨‍💼 Total Supervisors: <strong>{totalSupervisors}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#475569' }}>
                        📍 Total Beat Assignments: <strong>{filteredBeats.length}</strong> Street Beats
                    </div>
                </div>
            </div>

            {/* TABLE STREAM */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid #f3f3f3', borderTop: '3px solid #2563eb', borderRadius: '50%', margin: '0 auto' }} />
                    <p style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: 500 }}>Loading beat staff assignments...</p>
                </div>
            ) : filteredBeats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>No beat assignments match your filters</h4>
                    <p style={{ fontSize: 12, margin: '4px 0 0' }}>Try clearing filters or search criteria above.</p>
                </div>
            ) : (
                <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>BEAT DETAILS & ID</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ZONE & WARD</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>TOTAL SEGMENTS</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    {isSupervisorView ? 'ASSIGNED SUPERVISORS' : 'ASSIGNED EMPLOYEES'}
                                </th>
                                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBeats.map(beat => {
                                const sups = beat.supervisorsSummary || [];
                                const totalSegs = beat.totalSegments || beat.segments?.length || 0;
                                const assignedSegs = (beat.segments || []).filter((s: any) => !!s.employeeAssignedToId).length;

                                return (
                                    <tr key={beat.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}>
                                        {/* Beat Details */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{beat.beatName || 'Unnamed Beat'}</div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>ID: {beat.id.slice(0, 10)}</div>
                                        </td>

                                        {/* Location */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{beat.wardName || 'Ward 1'}</div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>{beat.zoneName || 'Zone 1'}</div>
                                        </td>

                                        {/* Total Segments */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '3px 8px', borderRadius: 8, background: '#f1f5f9', color: '#334155',
                                                fontSize: 11, fontWeight: 600
                                            }}>
                                                📍 {totalSegs} {totalSegs === 1 ? 'Segment' : 'Segments'}
                                            </span>
                                        </td>

                                        {/* Assigned Supervisors / Employees */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                            {isSupervisorView ? (
                                                sups.length > 0 ? (
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        {sups.map((s: any, idx: number) => (
                                                            <span key={idx} style={{
                                                                padding: '3px 8px', borderRadius: 8, background: '#eff6ff',
                                                                color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 11, fontWeight: 600
                                                            }}>
                                                                👤 {s.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Unassigned</span>
                                                )
                                            ) : (
                                                (() => {
                                                    const empMap = new Map<string, number>();
                                                    (beat.segments || []).forEach((s: any) => {
                                                        const eName = s.employeeAssignedTo?.name || s.employeeAssignedName || s.employeeName || s.assignedEmployee?.name || s.employee?.name;
                                                        if (eName) empMap.set(eName, (empMap.get(eName) || 0) + 1);
                                                    });

                                                    if (beat.employeesSummary && Array.isArray(beat.employeesSummary)) {
                                                        beat.employeesSummary.forEach((e: any) => {
                                                            const eName = typeof e === 'string' ? e : e.name;
                                                            if (eName && !empMap.has(eName)) empMap.set(eName, e.segmentCount || 1);
                                                        });
                                                    }

                                                    const empList = Array.from(empMap.entries()).map(([name, count]) => ({ name, count }));

                                                    return empList.length > 0 ? (
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                            {empList.map((emp, idx) => (
                                                                <span key={idx} style={{
                                                                    padding: '3px 8px', borderRadius: 8, background: '#f0fdf4',
                                                                    color: '#15803d', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 600
                                                                }}>
                                                                    👷 {emp.name} ({emp.count} {emp.count === 1 ? 'segment' : 'segments'})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: 12, fontWeight: 600, color: assignedSegs === totalSegs && totalSegs > 0 ? '#15803d' : '#334155' }}>
                                                            {assignedSegs} / {totalSegs} Segments Assigned
                                                        </div>
                                                    );
                                                })()
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                            <button
                                                onClick={() => setSelectedBeat(beat)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff',
                                                    fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                Assign Staff
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedBeat && (
                <AssignBeatModal
                    beat={selectedBeat}
                    onClose={() => setSelectedBeat(null)}
                    onSuccess={() => { setSelectedBeat(null); loadData(); }}
                />
            )}
        </div>
    );
}
