'use client';

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    ApiError,
    AreaBeatApi,
    CityUserApi,
    SupervisorAssignmentApi,
    ModuleRecordsApi,
    NalaApi,
    TaskforceApi,
    ToiletApi,
    TwinbinApi
} from "@lib/apiClient";

export type OverviewModuleKey = 'LITTERBINS' | 'SWEEPING' | 'TOILET' | 'NALA' | 'TASKFORCE';

type CardId =
    | 'ASSETS' | 'APPROVED_ASSETS' | 'REJECTED_ASSETS' | 'ASSIGNED' | 'UNASSIGNED'
    | 'REPORTS' | 'SI_PENDING' | 'SI_APPROVED' | 'SI_REJECTED'
    | 'ULB_ACTION' | 'IEC_PENDING' | 'IEC_TAKEN';

type Props = {
    moduleKey: OverviewModuleKey;
    assetLabel: string; // e.g. "Litterbin"
    cityId?: string;
    refreshKey?: number;
    onViewReport: (record: any) => void;
};

const REPORT_PAGE_LIMIT = 500;
const REPORT_MAX_PAGES = 10;

// ---------- helpers ----------

const up = (v: any) => String(v ?? '').toUpperCase();

const REQUEST_TYPE_RE = /REQUEST|REGISTRATION/;
const isRequestRecord = (r: any) => REQUEST_TYPE_RE.test(up(r?.type));
const isAssetRecord = (r: any) => up(r?.type) === 'BIN' || up(r?.type) === 'TOILET';
const isInspectionRecord = (r: any) => !isRequestRecord(r) && !isAssetRecord(r);

/** Same status rules as the ULB inspection workspace so numbers reconcile. */
function reportStatus(item: any): string {
    const ws = up(item?.workspaceStatus);
    const as = up(item?.actionStatus);
    const raw = up(item?.status);
    if (ws === 'ACTION_TAKEN') return 'ACTION_TAKEN';
    if (ws === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';
    if (ws === 'APPROVED' || ws === 'REJECTED') return ws;
    if (['SUBMITTED', 'PENDING', 'PENDING_QC'].includes(ws)) return 'PENDING';
    if (as === 'ACTION_TAKEN' || as === 'ACTION_REQUIRED') return as;
    if (item?.actionOfficerRespondedAt || item?.actionTakenBy || item?.actionTakenById || raw === 'ACTION_TAKEN') return 'ACTION_TAKEN';
    if (raw === 'ACTION_REQUIRED' || raw === 'APPROVED' || raw === 'REJECTED') return raw;
    if (['SUBMITTED', 'PENDING', 'PENDING_QC', ''].includes(raw)) return 'PENDING';
    return raw;
}

function qcDecision(item: any): 'APPROVED' | 'REJECTED' | null {
    const d = up(item?.qcDecision);
    if (d === 'APPROVED' || d === 'REJECTED') return d;
    const s = reportStatus(item);
    if (s === 'APPROVED' || s === 'REJECTED') return s;
    if (s === 'ACTION_REQUIRED' || s === 'ACTION_TAKEN') return 'APPROVED';
    return null;
}

const requestState = (r: any): 'PENDING' | 'APPROVED' | 'REJECTED' => {
    const s = up(r?.status);
    if (s === 'REJECTED') return 'REJECTED';
    if (s === 'APPROVED' || s === 'ACTIVE') return 'APPROVED';
    return 'PENDING';
};

const assigneeIds = (a: any): string[] => {
    const ids = new Set<string>();
    (a?.assignedEmployeeIds || []).forEach((i: any) => i && ids.add(String(i)));
    (a?.assignedEmployees || []).forEach((e: any) => e?.id && ids.add(String(e.id)));
    (a?.assignments || []).forEach((x: any) => {
        const id = x?.supervisor?.id || x?.supervisorId || x?.userId;
        if (id) ids.add(String(id));
    });
    (a?.supervisorsSummary || []).forEach((s: any) => (s?.id || s?.userId) && ids.add(String(s.id || s.userId)));
    if (a?.assignedToId) ids.add(String(a.assignedToId));
    if (a?.assignedTo && typeof a.assignedTo === 'object' && a.assignedTo.id) ids.add(String(a.assignedTo.id));
    return Array.from(ids);
};

const assetTitle = (a: any) =>
    a?.areaName || a?.locationName || a?.name || a?.toiletName || a?.beatName || a?.nalaName || a?.feederPointName || a?.title || 'Asset';

const assetSub = (a: any) => {
    const loc = a?.locationName || a?.address || a?.locationDescription || a?.landmark;
    return loc && loc !== assetTitle(a) ? String(loc) : '';
};

const wardZone = (a: any) => ({
    ward: a?.wardName || a?.ward?.name || 'Ward N/A',
    zone: a?.zoneName || a?.zone?.name || a?.ward?.parent?.name || 'Zone N/A'
});

const staffOf = (u: any) => ({
    id: String(u.id),
    name: u.name || u.email || 'User',
    phone: u.phone || '',
    email: u.email || '',
    role: up(u.role)
});

const fmtDate = (v: any) => {
    if (!v) return '-';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_STYLE: Record<string, { bg: string; fg: string; bd: string }> = {
    APPROVED: { bg: '#dcfce7', fg: '#15803d', bd: '#bbf7d0' },
    REJECTED: { bg: '#fee2e2', fg: '#b91c1c', bd: '#fecaca' },
    PENDING: { bg: '#eff6ff', fg: '#2563eb', bd: '#bfdbfe' },
    ACTION_REQUIRED: { bg: '#fff7ed', fg: '#c2410c', bd: '#fed7aa' },
    ACTION_TAKEN: { bg: '#ecfeff', fg: '#0e7490', bd: '#a5f3fc' },
    ASSIGNED: { bg: '#dcfce7', fg: '#15803d', bd: '#bbf7d0' },
    UNASSIGNED: { bg: '#f1f5f9', fg: '#475569', bd: '#e2e8f0' }
};

function Pill({ status, label }: { status: string; label?: string }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE.UNASSIGNED;
    return (
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: s.bg, color: s.fg, border: `1px solid ${s.bd}`, whiteSpace: 'nowrap' }}>
            {(label || status).replace(/_/g, ' ')}
        </span>
    );
}

// ---------- module adapters ----------

type Adapter = {
    loadAssets: (cityId?: string) => Promise<any[]>;
    loadRequests: () => Promise<any[]>;
    /** Replace the assignee of an asset (null = unassign). Undefined = module has no assignment API here. */
    assign?: (asset: any, userId: string | null, currentIds: string[]) => Promise<unknown>;
    remove?: (asset: any) => Promise<unknown>;
};

const ADAPTERS: Record<OverviewModuleKey, Adapter> = {
    LITTERBINS: {
        loadAssets: async (cityId) => (await TwinbinApi.all(cityId && cityId !== 'ALL' ? cityId : undefined)).bins || [],
        loadRequests: async () => [],
        assign: (a, userId) => TwinbinApi.assign(a.id, { assignedEmployeeIds: userId ? [userId] : [] }),
        remove: (a) => TwinbinApi.deleteBin(a.id)
    },
    TOILET: {
        loadAssets: async () => (await ToiletApi.listAllToilets()).toilets || [],
        loadRequests: async () => (await ToiletApi.listPendingToilets()).toilets || [],
        assign: async (a, userId, currentIds) => {
            for (const old of currentIds) {
                if (old !== userId) await ToiletApi.unassignToilet(old, a.id);
            }
            if (userId && !currentIds.includes(userId)) {
                return ToiletApi.bulkAssignToilets(userId, [a.id], a.type || a.category || 'PUBLIC');
            }
        },
        remove: (a) => ToiletApi.deleteToilet(a.id)
    },
    SWEEPING: {
        loadAssets: async () => (await AreaBeatApi.list()).beats || [],
        loadRequests: async () => (await AreaBeatApi.listPendingRequests('ALL')).pendingBeats || [],
        assign: (a, userId) => AreaBeatApi.bulkAssign([a.id], userId, 'SUPERVISOR'),
        remove: (a) => AreaBeatApi.remove(a.id)
    },
    NALA: {
        loadAssets: async () => (await NalaApi.list()).nalas || [],
        loadRequests: async () => (await NalaApi.listPendingRequests('ALL')).pendingNalas || [],
        assign: (a, userId) => NalaApi.bulkAssign([a.id], userId, 'SUPERVISOR'),
        remove: (a) => NalaApi.remove(a.id)
    },
    TASKFORCE: {
        loadAssets: async () => (await TaskforceApi.workspaceAssets()).feederPoints || [],
        // /feeder-points/requests is QC-scoped on the backend; admins get 403 and rely on request records instead.
        loadRequests: async () => {
            try {
                return (await TaskforceApi.feederRequests()).feederPoints || [];
            } catch (error: any) {
                if (/forbidden|403/i.test(String(error?.message || error?.status || ''))) return [];
                throw error;
            }
        },
        assign: (a, userId) => (userId ? TaskforceApi.assignFeederPoint(a.id, userId) : Promise.reject(new Error('Pick a replacement daroga; GVP unassign is not supported by the API.'))),
        remove: (a) => TaskforceApi.deleteFeederPoint(a.id)
    }
};

// ---------- component ----------

type Row =
    | { kind: 'asset'; key: string; data: any }
    | { kind: 'request'; key: string; data: any }
    | { kind: 'report'; key: string; data: any };

export default function ModuleOverviewCards({ moduleKey, assetLabel, cityId, refreshKey = 0, onViewReport }: Props) {
    const adapter = ADAPTERS[moduleKey];

    const [records, setRecords] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [audit, setAudit] = useState<{ total: number; unassigned: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<string[]>([]);
    const [openCard, setOpenCard] = useState<CardId | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const cid = cityId && cityId !== 'ALL' ? cityId : undefined;

        const fetchRecords = async () => {
            const first = await ModuleRecordsApi.getRecords(moduleKey, { tab: 'ALL', limit: REPORT_PAGE_LIMIT, page: 1, cityId: cid });
            let all = first.data || [];
            const pages = Math.min(first.meta?.totalPages || 1, REPORT_MAX_PAGES);
            for (let p = 2; p <= pages; p++) {
                const next = await ModuleRecordsApi.getRecords(moduleKey, { tab: 'ALL', limit: REPORT_PAGE_LIMIT, page: p, cityId: cid });
                all = all.concat(next.data || []);
            }
            return all;
        };

        const [rec, ast, req, usr, aud] = await Promise.allSettled([
            fetchRecords(),
            adapter.loadAssets(cityId),
            adapter.loadRequests(),
            CityUserApi.list(),
            SupervisorAssignmentApi.status()
        ]);

        const errs: string[] = [];
        const take = <T,>(r: PromiseSettledResult<T>, label: string, fallback: T): T => {
            if (r.status === 'fulfilled') return r.value;
            errs.push(`${label}: ${(r.reason as any)?.message || 'failed'}`);
            return fallback;
        };

        setRecords(take(rec, 'Reports', []));
        setAssets(take(ast, 'Assets', []));
        setRequests(take(req, 'Requests', []));
        setUsers(take(usr, 'Staff', { users: [] } as any).users || []);
        // Same source as the Daroga Assignment Audit on the portal home.
        const mod = aud.status === 'fulfilled' ? (aud.value.modules as any)?.[moduleKey] : null;
        setAudit(mod ? { total: Number(mod.totalAssets) || 0, unassigned: mod.unassignedItems || [] } : null);
        setErrors(errs);
        setLoading(false);
    }, [moduleKey, cityId, adapter]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    // ----- derived data -----

    const daroga = useMemo(() => {
        const inModule = users.filter((u) => (u.modules || []).some((m: any) => up(m.key) === moduleKey));
        return inModule.filter((u) => up(u.role) === 'SUPERVISOR').map(staffOf);
    }, [users, moduleKey]);

    const inspections = useMemo(() => records.filter(isInspectionRecord).filter((r) => reportStatus(r) !== 'DRAFT'), [records]);

    /** Daroga-raised asset requests = module pending feed + request records, deduped by id. */
    const allRequests = useMemo(() => {
        const map = new Map<string, any>();
        records.filter(isRequestRecord).forEach((r) => map.set(String(r.binId || r.id), r));
        requests.forEach((r) => {
            const id = String(r.id);
            map.set(id, { ...(map.get(id) || {}), ...r });
        });
        return Array.from(map.values());
    }, [records, requests]);

    // Assets are "registered" once approved; approved/rejected request lists feed the other cards.
    const registered = useMemo(
        () => assets.filter((a) => !a?.eliminatedAt && (!a?.status || requestState(a) === 'APPROVED')),
        [assets]
    );
    const approvedRequests = useMemo(() => allRequests.filter((r) => requestState(r) === 'APPROVED'), [allRequests]);
    const rejectedRequests = useMemo(() => allRequests.filter((r) => requestState(r) === 'REJECTED'), [allRequests]);
    const { assignedAssets, unassignedAssets, totalAssets } = useMemo(() => {
        if (!audit) {
            return {
                assignedAssets: registered.filter((a) => assigneeIds(a).length > 0),
                unassignedAssets: registered.filter((a) => assigneeIds(a).length === 0),
                totalAssets: registered.length
            };
        }
        const unIds = new Set(audit.unassigned.map((i: any) => String(i.id)));
        const known = new Set(registered.map((a) => String(a.id)));
        const unassigned = [
            ...registered.filter((a) => unIds.has(String(a.id))),
            // audit items the asset list did not return
            ...audit.unassigned.filter((i: any) => !known.has(String(i.id)))
        ];
        return {
            assignedAssets: registered.filter((a) => !unIds.has(String(a.id))),
            unassignedAssets: unassigned,
            totalAssets: audit.total
        };
    }, [audit, registered]);

    const siPending = useMemo(() => inspections.filter((r) => reportStatus(r) === 'PENDING'), [inspections]);
    const siApproved = useMemo(() => inspections.filter((r) => qcDecision(r) === 'APPROVED'), [inspections]);
    const siRejected = useMemo(() => inspections.filter((r) => qcDecision(r) === 'REJECTED'), [inspections]);
    const ulbAction = useMemo(() => inspections.filter((r) => ['ACTION_REQUIRED', 'ACTION_TAKEN'].includes(reportStatus(r))), [inspections]);
    const iecPending = useMemo(() => inspections.filter((r) => reportStatus(r) === 'ACTION_REQUIRED'), [inspections]);
    const iecTaken = useMemo(() => inspections.filter((r) => reportStatus(r) === 'ACTION_TAKEN'), [inspections]);

    const cards: { id: CardId; label: string; sub: string; color: string; value: number; rows: Row[] }[] = useMemo(() => {
        const A = (list: any[]): Row[] => list.map((d) => ({ kind: 'asset', key: String(d.id), data: d }));
        const Q = (list: any[]): Row[] => list.map((d) => ({ kind: 'request', key: String(d.id), data: d }));
        const R = (list: any[]): Row[] => list.map((d) => ({ kind: 'report', key: String(d.id), data: d }));
        return [
            { id: 'ASSETS', label: `TOTAL REGISTERED ${assetLabel.toUpperCase()}S`, sub: 'Registered Assets', color: '#0f172a', value: totalAssets, rows: A(registered) },
            { id: 'APPROVED_ASSETS', label: 'APPROVED ASSETS', sub: 'Requests approved', color: '#10b981', value: approvedRequests.length, rows: Q(approvedRequests) },
            { id: 'REJECTED_ASSETS', label: 'REJECTED ASSETS', sub: 'Requests rejected', color: '#ef4444', value: rejectedRequests.length, rows: Q(rejectedRequests) },
            { id: 'ASSIGNED', label: 'DAROGA ASSIGNED', sub: 'Assets with a daroga', color: '#0891b2', value: audit ? Math.max(0, totalAssets - unassignedAssets.length) : assignedAssets.length, rows: A(assignedAssets) },
            { id: 'UNASSIGNED', label: 'DAROGA UNASSIGNED', sub: 'Needs a daroga', color: '#d97706', value: unassignedAssets.length, rows: A(unassignedAssets) },
            { id: 'REPORTS', label: 'TOTAL REPORTS', sub: 'Inspections submitted', color: '#6366f1', value: inspections.length, rows: R(inspections) },
            { id: 'SI_PENDING', label: 'SI PENDING', sub: 'Awaiting SI review', color: '#f59e0b', value: siPending.length, rows: R(siPending) },
            { id: 'SI_APPROVED', label: 'SI APPROVED', sub: 'Verified by SI', color: '#16a34a', value: siApproved.length, rows: R(siApproved) },
            { id: 'SI_REJECTED', label: 'SI REJECTED', sub: 'Non-compliant', color: '#e11d48', value: siRejected.length, rows: R(siRejected) },
            { id: 'ULB_ACTION', label: 'ULB ACTION REQUIRED', sub: 'Sent for action', color: '#ea580c', value: ulbAction.length, rows: R(ulbAction) },
            { id: 'IEC_PENDING', label: 'PENDING ACTION FROM IEC', sub: 'With IEC member', color: '#f97316', value: iecPending.length, rows: R(iecPending) },
            { id: 'IEC_TAKEN', label: 'ACTION TAKEN BY IEC', sub: 'Action completed', color: '#06b6d4', value: iecTaken.length, rows: R(iecTaken) }
        ];
    }, [
        assetLabel, registered, totalAssets, audit, approvedRequests, rejectedRequests, assignedAssets,
        unassignedAssets, inspections, siPending, siApproved, siRejected, ulbAction, iecPending, iecTaken
    ]);

    const active = cards.find((c) => c.id === openCard) || null;

    return (
        <>
            {errors.length > 0 && (
                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontSize: 12, fontWeight: 700 }}>
                    Some data could not be loaded — {errors.join(' | ')}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-3.5 mb-6" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                {cards.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => setOpenCard(c.id)}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-left"
                        style={{ borderLeft: `5px solid ${c.color}` }}
                    >
                        <div className="text-[9.5px] font-black text-slate-400 tracking-wider uppercase truncate" title={c.label}>{c.label}</div>
                        <div className="my-1.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{loading ? '…' : c.value}</div>
                        <div className="text-xs text-slate-500 font-semibold truncate">{c.sub}</div>
                    </button>
                ))}
            </div>

            {active && (
                <ListDrawer
                    card={active}
                    moduleKey={moduleKey}
                    assetLabel={assetLabel}
                    adapter={adapter}
                    daroga={daroga}
                    onClose={() => setOpenCard(null)}
                    onViewReport={(r) => {
                        setOpenCard(null);
                        onViewReport(r);
                    }}
                    onChanged={load}
                />
            )}
        </>
    );
}

// ---------- list drawer ----------

function ListDrawer({
    card, moduleKey, assetLabel, adapter, daroga, onClose, onViewReport, onChanged
}: {
    card: { id: CardId; label: string; color: string; value: number; rows: Row[] };
    moduleKey: OverviewModuleKey;
    assetLabel: string;
    adapter: Adapter;
    daroga: ReturnType<typeof staffOf>[];
    onClose: () => void;
    onViewReport: (r: any) => void;
    onChanged: () => void;
}) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [assignTarget, setAssignTarget] = useState<any | null>(null);
    const [pickedDaroga, setPickedDaroga] = useState('');
    const [confirm, setConfirm] = useState<{ asset: any; mode: 'unassign' | 'delete' } | null>(null);
    const [detail, setDetail] = useState<Row | null>(null);
    const PAGE = 15;

    useEffect(() => setPage(1), [search, card.id]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return card.rows;
        return card.rows.filter((r) => {
            const d: any = r.data;
            const hay = [assetTitle(d), d.locationName, d.wardName, d.zoneName, d.supervisor?.name, d.createdByName, d.id];
            return hay.filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
        });
    }, [card.rows, search]);

    const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
    const visible = filtered.slice((page - 1) * PAGE, page * PAGE);
    const kind = card.rows[0]?.kind;
    const isAssetList = ['ASSETS', 'ASSIGNED', 'UNASSIGNED'].includes(card.id);

    const run = async (id: string, fn: () => Promise<unknown>, okText: string) => {
        setBusyId(id);
        setMessage(null);
        try {
            await fn();
            setMessage({ ok: true, text: okText });
            onChanged();
        } catch (err) {
            setMessage({ ok: false, text: err instanceof ApiError || err instanceof Error ? err.message : 'Action failed' });
        } finally {
            setBusyId(null);
        }
    };

    const doAssign = async () => {
        if (!assignTarget || !pickedDaroga || !adapter.assign) return;
        const asset = assignTarget;
        setAssignTarget(null);
        await run(asset.id, () => adapter.assign!(asset, pickedDaroga, assigneeIds(asset)), 'Daroga assigned.');
        setPickedDaroga('');
    };

    const doConfirm = async () => {
        if (!confirm) return;
        const { asset, mode } = confirm;
        setConfirm(null);
        if (mode === 'unassign') await run(asset.id, () => adapter.assign!(asset, null, assigneeIds(asset)), 'Daroga unassigned.');
        else await run(asset.id, () => adapter.remove!(asset), `${assetLabel} deleted.`);
    };

    const exportCsv = () => {
        const headers = ['Name', 'Location', 'Ward', 'Zone', 'Status'];
        const lines = filtered.map((r) => {
            const d: any = r.data;
            const wz = wardZone(d);
            return [assetTitle(d), d.locationName || '', wz.ward, wz.zone, d.status || ''];
        });
        const csv = [headers, ...lines].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `${moduleKey.toLowerCase()}_${card.id.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' };
    const td: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
    const btn = (bg: string, fg: string, bd = 'none'): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 8, border: bd, background: bg, color: fg, fontSize: 11, fontWeight: 800, cursor: 'pointer' });

    const nameOfAssignee = (a: any) => {
        const ids = assigneeIds(a);
        const named = [
            ...(a.assignedEmployees || []).map((e: any) => e?.name),
            ...(a.assignments || []).map((x: any) => x?.supervisor?.name),
            ...(a.supervisorsSummary || []).map((s: any) => s?.name),
            ...ids.map((id) => daroga.find((d) => d.id === id)?.name)
        ].filter(Boolean);
        return Array.from(new Set(named)).join(', ');
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 980, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 50px rgba(0,0,0,0.25)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', borderLeft: `6px solid ${card.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{card.label}</h2>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{filtered.length} of {card.value} record(s)</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button" onClick={exportCsv} style={btn('#fff', '#0f172a', '1px solid #cbd5e1')}>📥 Export CSV</button>
                            <button type="button" onClick={onClose} style={btn('#f1f5f9', '#475569')}>Close</button>
                        </div>
                    </div>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, location, ward, daroga…"
                        style={{ marginTop: 14, width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 700, outline: 'none' }}
                    />
                    {message && (
                        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: message.ok ? '#f0fdf4' : '#fef2f2', color: message.ok ? '#166534' : '#991b1b', border: `1px solid ${message.ok ? '#bbf7d0' : '#fecaca'}` }}>
                            {message.text}
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, overflow: 'auto' }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '64px 24px', color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Nothing to show here.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                                {kind === 'report' ? (
                                    <tr><th style={th}>Date</th><th style={th}>Location / Asset</th><th style={th}>Zone & Ward</th><th style={th}>Daroga</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Actions</th></tr>
                                ) : (
                                    <tr><th style={th}>{assetLabel}</th><th style={th}>Zone & Ward</th><th style={th}>Daroga</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Actions</th></tr>
                                )}
                            </thead>
                            <tbody>
                                {visible.map((row) => {
                                    const d: any = row.data;
                                    const wz = wardZone(d);
                                    if (row.kind === 'report') {
                                        const st = reportStatus(d);
                                        return (
                                            <tr key={row.key}>
                                                <td style={td}><div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{fmtDate(d.createdAt)}</div></td>
                                                <td style={td}><div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{d.nalaName ? [d.nalaName, d.nalaPointName].filter(Boolean).join(' - ') : assetTitle(d)}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>ID: {String(d.id).slice(0, 8)}</div></td>
                                                <td style={td}><div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{wz.ward}</div><div style={{ fontSize: 11, color: '#64748b' }}>{wz.zone}</div></td>
                                                <td style={td}><span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{d.supervisor?.name || d.employee?.name || d.submittedBy?.name || d.createdByName || (typeof d.createdBy === 'object' ? d.createdBy?.name : '') || '-'}</span></td>
                                                <td style={td}><Pill status={st} /></td>
                                                <td style={{ ...td, textAlign: 'right' }}><button style={btn('#2563eb', '#fff')} onClick={() => onViewReport(d)}>View Report</button></td>
                                            </tr>
                                        );
                                    }
                                    const who = nameOfAssignee(d);
                                    const state = row.kind === 'request' ? requestState(d) : who || assigneeIds(d).length ? 'ASSIGNED' : 'UNASSIGNED';
                                    return (
                                        <tr key={row.key}>
                                            <td style={td}>
                                                <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{assetTitle(d)}</div>
                                                {assetSub(d) && <div style={{ fontSize: 11, color: '#475569' }}>📍 {assetSub(d)}</div>}
                                            </td>
                                            <td style={td}><div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{wz.ward}</div><div style={{ fontSize: 11, color: '#64748b' }}>{wz.zone}</div></td>
                                            <td style={td}><span style={{ fontSize: 12, fontWeight: 700, color: who ? '#1e293b' : '#94a3b8' }}>{who || (row.kind === 'request' ? d.requestedBy?.name || d.createdByName || '-' : 'Unassigned')}</span></td>
                                            <td style={td}><Pill status={state} label={row.kind === 'request' ? state : state} /></td>
                                            <td style={{ ...td, textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                    <button style={btn('#eff6ff', '#1d4ed8', '1px solid #bfdbfe')} onClick={() => setDetail(row)}>View</button>
                                                    {isAssetList && adapter.assign && (
                                                        <>
                                                            <button disabled={busyId === d.id} style={btn('#2563eb', '#fff')} onClick={() => { setAssignTarget(d); setPickedDaroga(''); }}>
                                                                {assigneeIds(d).length ? 'Reassign' : 'Assign'}
                                                            </button>
                                                            {assigneeIds(d).length > 0 && moduleKey !== 'TASKFORCE' && (
                                                                <button disabled={busyId === d.id} style={btn('#fff7ed', '#c2410c', '1px solid #fed7aa')} onClick={() => setConfirm({ asset: d, mode: 'unassign' })}>Unassign</button>
                                                            )}
                                                        </>
                                                    )}
                                                    {isAssetList && adapter.remove && (
                                                        <button disabled={busyId === d.id} style={btn('#fef2f2', '#dc2626', '1px solid #fecaca')} onClick={() => setConfirm({ asset: d, mode: 'delete' })}>🗑 Delete</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, color: '#64748b' }}>
                    <span>Page {page} of {pages}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={btn('#fff', '#0f172a', '1px solid #cbd5e1')}>Previous</button>
                        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={btn('#fff', '#0f172a', '1px solid #cbd5e1')}>Next</button>
                    </div>
                </div>
            </div>

            {assignTarget && (
                <Modal onClose={() => setAssignTarget(null)}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>Assign Daroga</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 14px' }}>{assetTitle(assignTarget)}</p>
                    <select value={pickedDaroga} onChange={(e) => setPickedDaroga(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}>
                        <option value="">Select daroga…</option>
                        {daroga.map((d) => <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                        <button onClick={() => setAssignTarget(null)} style={{ ...btn('#fff', '#64748b', '1px solid #e2e8f0'), flex: 1, padding: 11 }}>Cancel</button>
                        <button disabled={!pickedDaroga} onClick={doAssign} style={{ ...btn('#2563eb', '#fff'), flex: 1, padding: 11, opacity: pickedDaroga ? 1 : 0.5 }}>Assign</button>
                    </div>
                </Modal>
            )}

            {confirm && (
                <Modal onClose={() => setConfirm(null)}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a', textAlign: 'center' }}>
                        {confirm.mode === 'delete' ? `Delete ${assetLabel}?` : 'Unassign daroga?'}
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
                        <strong style={{ color: '#0f172a' }}>{assetTitle(confirm.asset)}</strong>
                        {confirm.mode === 'delete' ? ' will be permanently deleted. This cannot be undone.' : ' will have no daroga assigned.'}
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                        <button onClick={() => setConfirm(null)} style={{ ...btn('#fff', '#64748b', '1px solid #e2e8f0'), flex: 1, padding: 11 }}>Cancel</button>
                        <button onClick={doConfirm} style={{ ...btn('#dc2626', '#fff'), flex: 1, padding: 11 }}>{confirm.mode === 'delete' ? 'Yes, Delete' : 'Yes, Unassign'}</button>
                    </div>
                </Modal>
            )}

            {detail && (
                <Modal onClose={() => setDetail(null)} wide>
                    <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                        {assetTitle(detail.data)}
                    </h3>
                    <DetailGrid row={detail} daroga={daroga} />
                    <button onClick={() => setDetail(null)} style={{ ...btn('#f1f5f9', '#475569'), marginTop: 18 }}>Close</button>
                </Modal>
            )}
        </div>,
        document.body
    );
}

function DetailGrid({ row, daroga }: { row: Row; daroga: ReturnType<typeof staffOf>[] }) {
    const d: any = row.data;
    const wz = wardZone(d);
    const items: [string, any][] =
        [
                ['Name', assetTitle(d)],
                ['Location', d.locationName || d.address || '-'],
                ['Zone', wz.zone],
                ['Ward', wz.ward],
                ['Status', d.status || '-'],
                ['Created', fmtDate(d.createdAt)],
                ['Assigned to', assigneeIds(d).map((id) => daroga.find((x) => x.id === id)?.name || id).join(', ') || 'Unassigned'],
                ['Coordinates', (d.latitude ?? d.lat) != null ? `${d.latitude ?? d.lat}, ${d.longitude ?? d.lng}` : '-']
        ];
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {items.map(([k, v]) => (
                <div key={k} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2, wordBreak: 'break-word' }}>{String(v)}</div>
                </div>
            ))}
        </div>
    );
}

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 26, width: '100%', maxWidth: wide ? 560 : 420, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
                {children}
            </div>
        </div>
    );
}
