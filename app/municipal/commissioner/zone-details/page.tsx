'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle2,
    Calendar,
    ChevronDown,
    Clock,
    Eye,
    FileText,
    Filter,
    Layers3,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    XCircle,
    AlertTriangle,
    ClipboardList,
    Trash2,
    Brush,
    Waves,
    Flag,
    UserCheck,
    Building2,
    Activity,
    Check,
    X,
    ExternalLink,
} from 'lucide-react';

import { RoleGuard } from '@components/Guards';
import UniversalReportModal from '@components/UniversalReportModal';
import { useAuth } from '@hooks/useAuth';
import {
    apiFetch,
    GeoApi,
    ModuleRecordsApi,
} from '@lib/apiClient';

/* =========================================================
   TYPES & HELPERS
========================================================= */

type InspectionModuleKey = 'TOILET' | 'LITTERBINS' | 'SWEEPING' | 'NALA' | 'TASKFORCE';

interface InspectionReportRecord {
    id: string;
    moduleKey: InspectionModuleKey;
    dashboardModuleLabel: string;
    title: string;
    zoneName: string;
    wardName: string;
    submittedBy: string;
    reviewedBy: string;
    submittedAt: string;
    status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'ACTION_REQUIRED' | 'ACTION_TAKEN';
    rawRecord: any;
}

interface WardMetricBreakdown {
    wardName: string;
    expectedCount: number;
    receivedCount: number;
    pendingCount: number;
    siReviewedCount: number;
    approvedCount: number;
    rejectedCount: number;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
    TOILET: <ClipboardList className="h-4 w-4 text-amber-600" />,
    LITTERBINS: <Trash2 className="h-4 w-4 text-emerald-600" />,
    SWEEPING: <Brush className="h-4 w-4 text-indigo-600" />,
    NALA: <Waves className="h-4 w-4 text-sky-600" />,
    TASKFORCE: <Flag className="h-4 w-4 text-rose-600" />,
};

function getInclusiveDays(fromDate?: string, toDate?: string): number {
    if (!fromDate || !toDate) return 1;
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
}

function getTodayString(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
}

function getRecordZone(item: any): string {
    return (
        item?.zoneName ||
        item?.zone?.name ||
        item?.beat?.zoneName ||
        item?.toilet?.zoneName ||
        item?.bin?.zoneName ||
        item?.feederPoint?.zoneName ||
        ''
    );
}

function getRecordWard(item: any): string {
    return (
        item?.wardName ||
        item?.ward?.name ||
        item?.beat?.wardName ||
        item?.toilet?.wardName ||
        item?.bin?.wardName ||
        item?.feederPoint?.wardName ||
        ''
    );
}

function getRecordTitle(item: any, module: InspectionModuleKey): string {
    if (module === 'TOILET') {
        const tObj = item?.toilet || {};
        const tName = item?.toiletName || tObj.name || tObj.toiletName || tObj.locationName || item?.locationName;
        const tCode = item?.toiletCode || tObj.code || tObj.toiletCode || item?.code || item?.name;

        if (tName && tCode && tName !== tCode) {
            return `${tName} (${tCode})`;
        }
        return tName || tCode || 'Toilet Inspection';
    }
    if (module === 'SWEEPING') return item?.beatName || item?.beat?.beatName || item?.areaName || 'Sweeping Beat';
    if (module === 'NALA') return [item?.nalaName || item?.nala?.nalaName, item?.nalaPointName].filter(Boolean).join(' - ') || 'Nala Point';
    if (module === 'TASKFORCE') return item?.feederPointName || item?.feederPoint?.feederPointName || item?.areaName || 'GVP Point';
    return item?.locationName || item?.bin?.locationName || item?.areaName || 'Litter Bin';
}

function getSubmitterName(item: any): string {
    return (
        item?.supervisor?.name ||
        item?.supervisorName ||
        item?.submittedBy?.name ||
        item?.employee?.name ||
        item?.createdBy?.name ||
        'Supervisor'
    );
}

function getSiName(item: any): string {
    return (
        item?.reviewedBy?.name ||
        item?.reviewedByQc?.name ||
        item?.qcReviewer?.name ||
        item?.sanitaryInspector?.name ||
        item?.si?.name ||
        item?.reviewedByName ||
        ''
    );
}

function getStatusBadge(status: string) {
    const s = String(status || '').toUpperCase();
    if (s === 'APPROVED') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50">
                <CheckCircle2 size={12} /> Approved
            </span>
        );
    }
    if (s === 'REJECTED') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-black text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50">
                <XCircle size={12} /> Rejected
            </span>
        );
    }
    if (s === 'ACTION_REQUIRED') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50">
                <AlertTriangle size={12} /> Action Needed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/50">
            <Clock size={12} /> Pending SI
        </span>
    );
}

function getApiToDate(to: string): string {
    if (!to) return '';
    const d = new Date(`${to}T00:00:00`);
    if (isNaN(d.getTime())) return to;
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function ZoneDetailsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const zoneParam = searchParams.get('zone') || searchParams.get('zoneId') || 'Zone 1';
    const paramFrom = searchParams.get('from') || getTodayString();
    const paramTo = searchParams.get('to') || getTodayString();

    const [fromDate, setFromDate] = useState<string>(paramFrom);
    const [toDate, setToDate] = useState<string>(paramTo);

    const [loading, setLoading] = useState(true);
    const [selectedWard, setSelectedWard] = useState<string>('ALL');
    const [selectedModule, setSelectedModule] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const [geoWards, setGeoWards] = useState<any[]>([]);
    const [allReports, setAllReports] = useState<InspectionReportRecord[]>([]);
    const [activeReportModal, setActiveReportModal] = useState<any | null>(null);

    // Fetch Ward list & Inspection records for this Zone
    const fetchZoneData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Geo Wards
            const geoRes = await GeoApi.list('WARD').catch(() => ({ nodes: [] }));
            const wardsList = (geoRes.nodes || []).filter(
                (n: any) => !zoneParam || n.parentName === zoneParam || n.zoneName === zoneParam || n.zoneId === zoneParam
            );
            setGeoWards(wardsList);

            // 2. Fetch Module Records
            const modules: InspectionModuleKey[] = ['SWEEPING', 'TOILET', 'LITTERBINS', 'NALA', 'TASKFORCE'];
            const fetchedRecords: InspectionReportRecord[] = [];

            await Promise.all(
                modules.map(async (modKey) => {
                    try {
                        const res = await ModuleRecordsApi.getRecords(modKey, {
                            limit: 500,
                            tab: 'HISTORY',
                            fromDate: fromDate,
                            toDate: getApiToDate(toDate) || toDate,
                        });
                        const rows = res?.data || [];
                        rows.forEach((row: any) => {
                            const rZone = getRecordZone(row);
                            const rWard = getRecordWard(row);

                            // Filter to current zone
                            if (zoneParam && rZone && rZone.toLowerCase() !== zoneParam.toLowerCase()) {
                                return;
                            }

                            const submittedTime = row.createdAt || row.submittedAt || row.visitedAt || '';
                            const dateStr = submittedTime ? submittedTime.split('T')[0] : '';

                            // Filter strictly by selected date range
                            if (fromDate && dateStr && dateStr < fromDate) return;
                            if (toDate && dateStr && dateStr > toDate) return;

                            const statusRaw = row?.qcDecision || row?.status || (row?.reviewedBy ? 'APPROVED' : 'PENDING');
                            let statusNorm: 'APPROVED' | 'REJECTED' | 'PENDING' | 'ACTION_REQUIRED' | 'ACTION_TAKEN' = 'PENDING';
                            if (String(statusRaw).toUpperCase().includes('APPROV')) statusNorm = 'APPROVED';
                            else if (String(statusRaw).toUpperCase().includes('REJECT')) statusNorm = 'REJECTED';
                            else if (String(statusRaw).toUpperCase().includes('ACTION_REQ')) statusNorm = 'ACTION_REQUIRED';
                            else if (String(statusRaw).toUpperCase().includes('ACTION_TAKEN')) statusNorm = 'ACTION_TAKEN';

                            fetchedRecords.push({
                                id: row.id || `rep-${Math.random()}`,
                                moduleKey: modKey,
                                dashboardModuleLabel: modKey,
                                title: getRecordTitle(row, modKey),
                                zoneName: rZone || zoneParam,
                                wardName: rWard || 'Ward Unassigned',
                                submittedBy: getSubmitterName(row),
                                reviewedBy: getSiName(row),
                                submittedAt: submittedTime || new Date().toISOString(),
                                status: statusNorm,
                                rawRecord: { ...row, dashboardModule: modKey, dashboardModuleLabel: modKey },
                            });
                        });
                    } catch (err) {
                        console.warn(`Failed loading records for ${modKey}`, err);
                    }
                })
            );

            setAllReports(fetchedRecords);
        } catch (error) {
            console.error('Error loading zone details', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && zoneParam && fromDate && toDate) {
            const url = new URL(window.location.href);
            url.searchParams.set('zone', zoneParam);
            url.searchParams.set('from', fromDate);
            url.searchParams.set('to', toDate);
            window.history.replaceState({}, '', url.toString());
        }
        fetchZoneData();
    }, [zoneParam, fromDate, toDate]);

    // Derived Ward List
    const wardOptions = useMemo(() => {
        const wardSet = new Set<string>();
        geoWards.forEach((w) => {
            if (w.name) wardSet.add(w.name);
        });
        allReports.forEach((r) => {
            if (r.wardName && r.wardName !== 'Ward Unassigned') wardSet.add(r.wardName);
        });
        return Array.from(wardSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [geoWards, allReports]);

    // Filtered Reports
    const filteredReports = useMemo(() => {
        return allReports.filter((r) => {
            if (selectedWard !== 'ALL' && r.wardName.toLowerCase() !== selectedWard.toLowerCase()) return false;
            if (selectedModule !== 'ALL' && r.moduleKey !== selectedModule) return false;
            if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    r.title.toLowerCase().includes(q) ||
                    r.wardName.toLowerCase().includes(q) ||
                    r.submittedBy.toLowerCase().includes(q) ||
                    r.reviewedBy.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [allReports, selectedWard, selectedModule, selectedStatus, searchQuery]);

    // Calculate dynamic days selected for target expected reports
    const selectedDaysCount = useMemo(() => {
        return getInclusiveDays(fromDate, toDate);
    }, [fromDate, toDate]);

    // Ward Breakdown Metrics
    const wardBreakdowns = useMemo<WardMetricBreakdown[]>(() => {
        const map = new Map<string, WardMetricBreakdown>();

        const getOrInit = (wName: string): WardMetricBreakdown => {
            if (!map.has(wName)) {
                map.set(wName, {
                    wardName: wName,
                    expectedCount: 15 * selectedDaysCount, // Dynamic expected based on date range
                    receivedCount: 0,
                    pendingCount: 0,
                    siReviewedCount: 0,
                    approvedCount: 0,
                    rejectedCount: 0,
                });
            }
            return map.get(wName)!;
        };

        wardOptions.forEach((w) => getOrInit(w));

        allReports.forEach((r) => {
            const b = getOrInit(r.wardName);
            b.receivedCount += 1;
            if (r.reviewedBy) b.siReviewedCount += 1;
            if (r.status === 'APPROVED') b.approvedCount += 1;
            else if (r.status === 'REJECTED' || r.status === 'ACTION_REQUIRED') b.rejectedCount += 1;
            else b.pendingCount += 1;
        });

        return Array.from(map.values());
    }, [wardOptions, allReports, selectedDaysCount]);

    // Active Ward Aggregated Summary
    const currentSummary = useMemo(() => {
        const activeRows =
            selectedWard === 'ALL'
                ? wardBreakdowns
                : wardBreakdowns.filter((w) => w.wardName.toLowerCase() === selectedWard.toLowerCase());

        const expected = activeRows.reduce((sum, w) => sum + w.expectedCount, 0);
        const received = activeRows.reduce((sum, w) => sum + w.receivedCount, 0);
        const pending = activeRows.reduce((sum, w) => sum + w.pendingCount, 0);
        const siReviewed = activeRows.reduce((sum, w) => sum + w.siReviewedCount, 0);
        const approved = activeRows.reduce((sum, w) => sum + w.approvedCount, 0);
        const rejected = activeRows.reduce((sum, w) => sum + w.rejectedCount, 0);

        return {
            expected,
            received,
            pending: Math.max(0, expected - received) + pending,
            siReviewed,
            approved,
            rejected,
        };
    }, [selectedWard, wardBreakdowns]);

    return (
        <RoleGuard roles={['COMMISSIONER', 'HMS_SUPER_ADMIN']}>
            <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 pb-16 px-4 sm:px-6 lg:px-8 pt-6">
                {/* TOP NAVBAR / BREADCRUMB */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.push(`/municipal/commissioner?from=${fromDate}&to=${toDate}`)}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    {zoneParam} Details
                                </span>
                                <span className="text-xs font-bold text-slate-400">/ Commissioner Console</span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                                <MapPin className="text-indigo-600" size={24} />
                                {zoneParam} Ward & Inspection Analytics
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={fetchZoneData}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Refresh Data
                        </button>
                    </div>
                </div>

                {/* TOP FILTER & DATE SELECTOR BAR */}
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        {/* Left Controls: Ward, Module & Status Selectors */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Building2 size={14} className="text-indigo-500" />
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Ward:</span>
                                <select
                                    value={selectedWard}
                                    onChange={(e) => setSelectedWard(e.target.value)}
                                    className="bg-transparent text-xs font-black text-indigo-700 dark:text-indigo-300 focus:outline-none cursor-pointer"
                                >
                                    <option value="ALL">All Wards ({wardOptions.length} Wards)</option>
                                    {wardOptions.map((w) => (
                                        <option key={w} value={w}>
                                            {w}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Module Filter */}
                            <select
                                value={selectedModule}
                                onChange={(e) => setSelectedModule(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="ALL">All Modules</option>
                                <option value="SWEEPING">Sweeping</option>
                                <option value="TOILET">Toilet</option>
                                <option value="LITTERBINS">Litter Bin</option>
                                <option value="NALA">Nala</option>
                                <option value="TASKFORCE">GVP</option>
                            </select>

                            {/* Status Filter */}
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="APPROVED">Approved Only</option>
                                <option value="REJECTED">Rejected Only</option>
                                <option value="PENDING">Pending SI Review</option>
                            </select>
                        </div>

                        {/* Right Controls: Date Range Picker & Search */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Date Filter Inputs */}
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                                <Calendar size={14} className="text-indigo-500" />
                                <span className="text-[11px] font-bold text-slate-500">From:</span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                                />
                                <span className="text-[11px] font-bold text-slate-500">To:</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                                />
                            </div>

                            {/* Search */}
                            <div className="relative min-w-[200px]">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search ward/supervisor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* METRICS SUMMARY CARDS */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {/* Expected Reports */}
                    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-slate-900">
                        <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Expected Reports
                        </div>
                        <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                            {currentSummary.expected.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-400">
                            Target ({selectedDaysCount} {selectedDaysCount === 1 ? 'Day' : 'Days'})
                        </div>
                    </div>

                    {/* Received Reports */}
                    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-4 shadow-sm dark:border-blue-900/50 dark:from-blue-950/40 dark:to-slate-900">
                        <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Received Reports
                        </div>
                        <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                            {currentSummary.received.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-400">Submitted Inspections</div>
                    </div>

                    {/* Pending Reports */}
                    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-4 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:to-slate-900">
                        <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Pending Reports
                        </div>
                        <div className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-400">
                            {currentSummary.pending.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-400">Awaiting Submission/Review</div>
                    </div>

                    {/* SI Reviewed */}
                    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-white p-4 shadow-sm dark:border-purple-900/50 dark:from-purple-950/40 dark:to-slate-900">
                        <div className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            SI Reviewed
                        </div>
                        <div className="mt-1 text-2xl font-black text-purple-700 dark:text-purple-400">
                            {currentSummary.siReviewed.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-400">Checked by Sanitary Inspector</div>
                    </div>

                    {/* Approved Reports */}
                    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-slate-900">
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Approved
                        </div>
                        <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">
                            {currentSummary.approved.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-400">Clean Inspections</div>
                    </div>

                    {/* Rejected Reports */}
                    <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 to-white p-4 shadow-sm dark:border-rose-900/50 dark:from-rose-950/40 dark:to-slate-900">
                        <div className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            Rejected
                        </div>
                        <div className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-400">
                            {currentSummary.rejected.toLocaleString('en-IN')}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-400">Action Needed / Rejected</div>
                    </div>
                </div>

                {/* WARD BREAKDOWN TABLE */}
                <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Layers3 size={16} className="text-indigo-500" /> Ward Inspection Performance Breakdown
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <tr>
                                    <th className="p-3">Ward Name</th>
                                    <th className="p-3">Expected Reports</th>
                                    <th className="p-3">Received Reports</th>
                                    <th className="p-3">Pending</th>
                                    <th className="p-3">SI Reviewed</th>
                                    <th className="p-3">Approved</th>
                                    <th className="p-3">Rejected</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {wardBreakdowns.map((wb) => (
                                    <tr
                                        key={wb.wardName}
                                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${selectedWard === wb.wardName ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                                            }`}
                                    >
                                        <td className="p-3 font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <MapPin size={14} className="text-indigo-500" />
                                            {wb.wardName}
                                        </td>
                                        <td className="p-3 font-bold text-slate-600 dark:text-slate-400">{wb.expectedCount}</td>
                                        <td className="p-3 font-black text-indigo-600 dark:text-indigo-400">{wb.receivedCount}</td>
                                        <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{wb.pendingCount}</td>
                                        <td className="p-3 font-bold text-purple-600 dark:text-purple-400">{wb.siReviewedCount}</td>
                                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{wb.approvedCount}</td>
                                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{wb.rejectedCount}</td>
                                        <td className="p-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedWard(wb.wardName)}
                                                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                                            >
                                                Filter Ward
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* REPORTS GALLERY / LIST */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <FileText size={16} className="text-indigo-500" /> Inspection Reports ({filteredReports.length})
                        </h2>

                        <span className="text-xs font-medium text-slate-400">Click any report card to open proof modal</span>
                    </div>

                    {filteredReports.length === 0 ? (
                        <div className="py-12 text-center text-xs font-bold text-slate-400">
                            No inspection reports found matching selected date range and filters.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredReports.map((report) => (
                                <div
                                    key={report.id}
                                    onClick={() => setActiveReportModal(report.rawRecord)}
                                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                {MODULE_ICONS[report.moduleKey]}
                                                {report.dashboardModuleLabel}
                                            </span>
                                            {getStatusBadge(report.status)}
                                        </div>

                                        <h3 className="mt-2 text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                            {report.title}
                                        </h3>

                                        <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                                            <MapPin size={12} className="text-indigo-500" />
                                            {report.wardName}
                                        </div>

                                        <div className="mt-3 space-y-1 text-[11px] font-medium text-slate-500 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                                            <div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">Submitted by:</span>{' '}
                                                {report.submittedBy}
                                            </div>
                                            {report.reviewedBy && (
                                                <div>
                                                    <span className="font-bold text-purple-600 dark:text-purple-400">SI Reviewed by:</span>{' '}
                                                    {report.reviewedBy}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-semibold text-slate-400 dark:border-slate-800">
                                        <span>{new Date(report.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                        <span className="font-extrabold text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                            View Proof <ExternalLink size={12} />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* UNIVERSAL REPORT MODAL */}
                {activeReportModal && (
                    <UniversalReportModal
                        moduleTitle={activeReportModal.dashboardModuleLabel || 'Inspection Report'}
                        moduleBadge="ZONE AUDIT"
                        record={activeReportModal}
                        onClose={() => setActiveReportModal(null)}
                    />
                )}
            </div>
        </RoleGuard>
    );
}
