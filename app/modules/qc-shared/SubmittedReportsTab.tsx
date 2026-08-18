'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ModuleRecordsApi, GeoApi } from '@lib/apiClient';
import { useAuth } from '@hooks/useAuth';
import { isReportVisibleToAO } from '@lib/aoScope';

interface SubmittedReportsTabProps {
    moduleKey: 'TOILET' | 'SWEEPING' | 'LITTERBINS';
    assetLabel: string;
    cityId?: string;
    initialStatus?: string;
    onViewReport: (record: any) => void;
}

const getStaffName = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed && !trimmed.startsWith('cl') && trimmed !== 'Field Supervisor' && trimmed.length < 50) return trimmed;
    }
    if (typeof val === 'object') {
        return val.name || val.fullName || val.userName || val.email || '';
    }
    return '';
};

export default function SubmittedReportsTab({ moduleKey, assetLabel, cityId, onViewReport, initialStatus }: SubmittedReportsTabProps) {
    const { user } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dateFilter, setDateFilter] = useState<'current_month' | 'today' | 'week' | 'all' | 'custom'>('current_month');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [selectedZone, setSelectedZone] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(initialStatus || '');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (initialStatus !== undefined) {
            setSelectedStatus(initialStatus);
        }
    }, [initialStatus]);

    // Geo Metadata
    const [zones, setZones] = useState<any[]>([]);
    const [allWards, setAllWards] = useState<any[]>([]);

    useEffect(() => {
        loadGeo();
    }, []);

    const loadGeo = async () => {
        try {
            const [zRes, wRes] = await Promise.allSettled([
                GeoApi.list("ZONE"),
                GeoApi.list("WARD")
            ]);
            if (zRes.status === 'fulfilled') setZones(zRes.value.nodes || []);
            if (wRes.status === 'fulfilled') setAllWards(wRes.value.nodes || []);
        } catch (e) {
            console.error('Failed to load geo metadata', e);
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

    const getWardDisplay = useCallback((record: any) => {
        if (record.wardName) return record.wardName;
        if (record.ward?.name) return record.ward.name;
        if (record.toilet?.wardName) return record.toilet.wardName;
        if (record.beat?.wardName) return record.beat.wardName;
        if (record.bin?.wardName) return record.bin.wardName;
        if (record.wardId) {
            const found = allWards.find(w => w.id === record.wardId || String(w.code) === String(record.wardId));
            if (found) return found.name;
        }
        return 'Ward 1';
    }, [allWards]);

    const getZoneDisplay = useCallback((record: any) => {
        if (record.zoneName) return record.zoneName;
        if (record.zone?.name) return record.zone.name;
        if (record.toilet?.zoneName) return record.toilet.zoneName;
        if (record.beat?.zoneName) return record.beat.zoneName;
        if (record.bin?.zoneName) return record.bin.zoneName;
        if (record.zoneId) {
            const found = zones.find(z => z.id === record.zoneId || String(z.code) === String(record.zoneId));
            if (found) return found.name;
        }
        const wName = getWardDisplay(record);
        const wardObj = allWards.find(w => w.name === wName);
        const pId = wardObj?.parentId || wardObj?.parent?.id;
        if (pId) {
            const zObj = zones.find(z => z.id === pId);
            if (zObj) return zObj.name;
        }
        return 'Zone 1';
    }, [zones, allWards, getWardDisplay]);

    const getReviewerDisplay = (record: any): string => {
        const st = (record.status || '').toUpperCase();
        if (st === 'APPROVED') {
            const name = getStaffName(record.approvedBy || record.reviewedBy || record.qcOfficer || record.verifiedBy);
            return name ? `Approved by ${name}` : '';
        }
        if (st === 'ACTION_TAKEN' || st === 'RESOLVED') {
            const name = getStaffName(record.resolvedBy || record.actionTakenBy || record.actionOfficer || record.reviewedBy);
            return name ? `Resolved by ${name}` : '';
        }
        if (st === 'REJECTED') {
            const name = getStaffName(record.rejectedBy || record.reviewedBy || record.qcOfficer);
            return name ? `Rejected by ${name}` : '';
        }
        return '';
    };

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            let startDate: string | undefined;
            let endDate: string | undefined;
            const now = new Date();

            if (dateFilter === 'current_month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
            } else if (dateFilter === 'today') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
            } else if (dateFilter === 'week') {
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
            } else if (dateFilter === 'custom' && fromDate && toDate) {
                startDate = new Date(fromDate).toISOString();
                endDate = new Date(toDate).toISOString();
            }

            const res = await ModuleRecordsApi.getRecords(moduleKey, {
                limit: 500,
                fromDate: startDate,
                toDate: endDate,
                cityId: cityId && cityId !== 'ALL' ? cityId : undefined,
                tab: 'DAILY_REPORTS'
            });
            const rawList = res.data || [];
            const inspectionOnly = rawList.filter((r: any) => {
                const t = (r.type || '').toUpperCase();
                return t !== 'BIN_REGISTRATION' && t !== 'ASSET_REGISTRATION' && t !== 'TOILET_REGISTRATION' && t !== 'BIN_REQUEST';
            });
            setReports(inspectionOnly);
        } catch (err) {
            console.error('Failed to load submitted reports', err);
        } finally {
            setLoading(false);
        }
    }, [moduleKey, dateFilter, fromDate, toDate, cityId]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    // Filtered Reports
    const filteredReports = useMemo(() => {
        return reports.filter(rec => {
            if (!isReportVisibleToAO(user, rec, moduleKey)) return false;

            if (selectedStatus && (rec.status || '').toUpperCase() !== selectedStatus) return false;

            if (selectedZone) {
                const selectedZoneObj = zones.find(z => z.id === selectedZone);
                const zName = selectedZoneObj?.name?.toLowerCase() || '';
                const recZone = (getZoneDisplay(rec) || '').toLowerCase();
                if (zName && !recZone.includes(zName)) return false;
            }

            if (selectedWard) {
                const selectedWardObj = allWards.find(w => w.id === selectedWard);
                const wName = selectedWardObj?.name?.toLowerCase() || '';
                const recWard = (getWardDisplay(rec) || '').toLowerCase();
                if (wName && !recWard.includes(wName)) return false;
            }

            if (selectedArea && (rec.areaName || rec.area?.name) !== selectedArea) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const name = (rec.toiletName || rec.beatName || rec.locationName || rec.areaName || '').toLowerCase();
                const staff = getStaffName(rec.createdBy || rec.supervisor || rec.submittedBy).toLowerCase();
                if (!name.includes(q) && !staff.includes(q)) return false;
            }

            return true;
        });
    }, [reports, selectedStatus, selectedZone, selectedWard, selectedArea, searchQuery, zones, allWards, getZoneDisplay, getWardDisplay]);

    const uniqueAreas = useMemo(() => {
        const set = new Set<string>();
        reports.forEach(r => {
            const a = r.areaName || r.area?.name || r.beat?.areaName || r.beat?.area?.name || r.payload?.areaName || r.segment?.areaName;
            if (a) set.add(a);
        });
        return Array.from(set).sort();
    }, [reports]);

    const formatTypeDisplay = (rawType: any): string => {
        if (!rawType || typeof rawType !== 'string') return 'Street Beat';
        const t = rawType.trim().toUpperCase();
        if (t === 'SWEEPING_ASSESSMENT' || t === 'BEAT_INSPECTION' || t === 'SWEEPING') return 'Street Beat';
        if (t === 'MAIN_ROAD') return 'Main Road Sweeping';
        if (t === 'RESIDENTIAL') return 'Residential Area';
        if (t === 'COMMERCIAL') return 'Commercial Zone';
        return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    // Export CSV
    const exportCSV = () => {
        if (filteredReports.length === 0) {
            alert('No reports to export.');
            return;
        }
        const headers = ['S.No', 'Date & Time', `${assetLabel} Name`, 'Asset ID', 'Zone', 'Ward', ...(moduleKey === 'SWEEPING' ? ['Area'] : []), 'Submitted By', 'Reviewed / Approved By', 'Status'];
        const rows = filteredReports.map((r, idx) => {
            const dt = new Date(r.createdAt);
            const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const name = r.toiletName || r.beatName || r.locationName || r.areaName || assetLabel;
            const assetId = r.toiletId || r.beatId || r.binId || r.id;
            return [
                idx + 1,
                `"${dateStr}"`,
                `"${name}"`,
                `"${assetId}"`,
                `"${getZoneDisplay(r)}"`,
                `"${getWardDisplay(r)}"`,
                ...(moduleKey === 'SWEEPING' ? [`"${r.areaName || ''}"`] : []),
                `"${getStaffName(r.createdBy || r.supervisor || r.submittedBy) || 'Field Associate'}"`,
                `"${getReviewerDisplay(r) || 'N/A'}"`,
                `"${r.status || 'SUBMITTED'}"`
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${moduleKey.toLowerCase()}_submitted_reports_${new Date().toISOString().slice(0, 10)}.csv`);
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

            {/* SINGLE ROW SLEEK FILTER TOOLBAR */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                    {/* Left: Search Input & Dropdowns */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 300 }}>
                        <input
                            type="text"
                            placeholder={`🔍 Search ${assetLabel.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
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

                        <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} className="filter-select">
                            <option value="">All Areas</option>
                            {uniqueAreas.map((area: any) => <option key={area} value={area}>{area}</option>)}
                        </select>

                        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="filter-select">
                            <option value="">All Status</option>
                            <option value="PENDING_QC">Pending QC</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="ACTION_REQUIRED">Action Required</option>
                            <option value="ACTION_TAKEN">Resolved</option>
                        </select>

                        {(selectedZone || selectedWard || selectedArea || selectedStatus || searchQuery || fromDate || toDate) && (
                            <button
                                onClick={() => {
                                    setSelectedZone(''); setSelectedWard(''); setSelectedArea('');
                                    setSelectedStatus(''); setSearchQuery(''); setFromDate(''); setToDate('');
                                    setDateFilter('current_month');
                                }}
                                style={{ padding: '0 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: 11, fontWeight: 700, cursor: 'pointer', height: 34 }}
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Right: Date Range Pills & Export Button */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Quick Date Pills */}
                        <div style={{ display: 'flex', gap: 2, background: '#f8fafc', padding: 2, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            {[
                                { id: 'current_month', label: 'This Month' },
                                { id: 'today', label: 'Today' },
                                { id: 'week', label: 'This Week' },
                                { id: 'all', label: 'All Time' },
                            ].map((d) => (
                                <button
                                    key={d.id}
                                    onClick={() => setDateFilter(d.id as any)}
                                    style={{
                                        padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11,
                                        fontWeight: dateFilter === d.id ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                                        background: dateFilter === d.id ? '#2563eb' : 'transparent',
                                        color: dateFilter === d.id ? '#ffffff' : '#64748b'
                                    }}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom Date Inputs */}
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={e => { setFromDate(e.target.value); setDateFilter('custom'); }}
                                className="filter-select"
                                style={{ height: 34, padding: '0 8px', fontSize: 11 }}
                            />
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>to</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={e => { setToDate(e.target.value); setDateFilter('custom'); }}
                                className="filter-select"
                                style={{ height: 34, padding: '0 8px', fontSize: 11 }}
                            />
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={exportCSV}
                            style={{
                                padding: '0 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                                background: '#ffffff', color: '#0f172a', fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, height: 34
                            }}
                        >
                            📥 Export
                        </button>
                    </div>
                </div>

                {/* Subtitle Count Summary */}
                <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                    Showing <strong style={{ color: '#2563eb', fontWeight: 700 }}>{filteredReports.length}</strong> reports
                </div>
            </div>

            {/* DETAILED TABLE STREAM */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid #f3f3f3', borderTop: '3px solid #2563eb', borderRadius: '50%', margin: '0 auto' }} />
                    <p style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: 500 }}>Loading submitted reports...</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#334155' }}>No inspection reports found</h4>
                    <p style={{ fontSize: 12, margin: '4px 0 0' }}>Try adjusting your date range or filters above.</p>
                </div>
            ) : (
                <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: 45 }}>S.NO</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>SUBMISSION DATE & TIME</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{assetLabel.toUpperCase()} NAME & ID</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ZONE & WARD</th>
                                {moduleKey === 'SWEEPING' && (
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>AREA & TYPE</th>
                                )}
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>SUBMITTED & REVIEWED BY</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>STATUS</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((record, idx) => {
                                const st = (record.status || 'SUBMITTED').toUpperCase();
                                const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
                                    PENDING_QC: { bg: '#eff6ff', color: '#2563eb', label: 'PENDING QC' },
                                    SUBMITTED: { bg: '#eff6ff', color: '#2563eb', label: 'SUBMITTED' },
                                    APPROVED: { bg: '#ecfdf5', color: '#059669', label: 'APPROVED' },
                                    REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'REJECTED' },
                                    ACTION_REQUIRED: { bg: '#fff7ed', color: '#c2410c', label: 'ACTION REQ.' },
                                    ACTION_TAKEN: { bg: '#f0fdf4', color: '#15803d', label: 'RESOLVED' },
                                };
                                const sc = statusConfig[st] || { bg: '#f1f5f9', color: '#64748b', label: st };
                                const dt = new Date(record.createdAt);

                                const assetName = record.toiletName || record.beatName || record.locationName || record.areaName || assetLabel;
                                const assetId = record.toiletId || record.beatId || record.binId || record.id;
                                const submitterName = getStaffName(record.supervisor)
                                    || getStaffName(record.employee)
                                    || getStaffName(record.submittedBy)
                                    || getStaffName(record.user)
                                    || getStaffName(record.createdBy)
                                    || getStaffName(record.createdByName)
                                    || getStaffName(record.requestedBy)
                                    || getStaffName(record.assignedEmployee)
                                    || getStaffName(record.payload?.submittedBy)
                                    || getStaffName(record.payload?.supervisor)
                                    || 'Supervisor';
                                const reviewerText = getReviewerDisplay(record);

                                const wardNameDisplay = getWardDisplay(record);
                                const zoneNameDisplay = getZoneDisplay(record);

                                return (
                                    <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}>
                                        {/* S.NO */}
                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                                            {idx + 1}
                                        </td>

                                        {/* Submission Date & Time */}
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                                {dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                                                {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>

                                        {/* Asset Name & ID */}
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{assetName}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>ID: {String(assetId).slice(0, 10)}</div>
                                        </td>

                                        {/* Zone & Ward */}
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{wardNameDisplay}</div>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{zoneNameDisplay}</div>
                                        </td>

                                        {/* Area & Type (Only for Sweeping) */}
                                        {moduleKey === 'SWEEPING' && (
                                            <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                                                    {record.areaName || record.area?.name || record.beat?.areaName || record.locationName || record.payload?.areaName || record.segment?.areaName || 'Indore Sector'}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                                                    {formatTypeDisplay(record.areaType || record.type || record.category)}
                                                </div>
                                            </td>
                                        )}

                                        {/* Submitted By & Reviewed By */}
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{submitterName}</div>
                                            {reviewerText ? (
                                                <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 1 }}>
                                                    {reviewerText}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                                                    {record.role || 'Supervisor'}
                                                </div>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                                background: sc.bg, color: sc.color, letterSpacing: '0.02em',
                                                border: `1px solid ${sc.color}22`
                                            }}>{sc.label}</span>
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                            <button
                                                onClick={() => onViewReport(record)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                                    background: '#2563eb', color: '#ffffff', border: 'none',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}
                                            >
                                                View Report
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
