import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ToiletApi, GeoApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { FilterTabs } from "../qc-shared";
import UniversalReportModal from "@components/UniversalReportModal";
import { isReportVisibleToAO } from "@lib/aoScope";

export default function ApprovalsTab({ cityId }: { cityId?: string }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
    const [items, setItems] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [fullReportModalItem, setFullReportModalItem] = useState<any>(null);
    const [wardMap, setWardMap] = useState<Record<string, { name: string, zoneName?: string }>>({});

    useEffect(() => {
        loadData();
    }, [user, activeTab, cityId]);

    // Pre-fetch ward names for better display
    useEffect(() => {
        GeoApi.list("WARD").then(res => {
            const mapping: any = {};
            res.nodes.forEach((n: any) => {
                mapping[n.id] = { name: n.name, zoneName: n.parent?.name };
            });
            setWardMap(mapping);
        }).catch(() => { });
    }, []);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const allItems: any[] = [];

            const isQC = user.roles.includes('QC') || user.roles.includes('HMS_SUPER_ADMIN');
            const isCityAdmin = user.roles.includes('CITY_ADMIN');
            const isAO = user.roles.includes('ACTION_OFFICER');

            // 1. Toilets (Registrations)
            if (isQC || isCityAdmin) {
                if (activeTab === 'PENDING') {
                    const res = await ToiletApi.listPendingToilets();
                    allItems.push(...(res.toilets || []).map((t: any) => ({ ...t, _type: 'REGISTRATION' })));
                } else {
                    try {
                        const res = await ToiletApi.listAllToilets();
                        const completed = (res.toilets || []).filter((t: any) => t.status !== 'PENDING').map((t: any) => ({ ...t, _type: 'REGISTRATION' }));
                        allItems.push(...completed);
                    } catch (e) { console.error("Error fetching toilet history", e); }
                }
            }

            // 2. Inspections
            if (isQC || isCityAdmin || isAO) {
                try {
                    const res = await ToiletApi.listInspections();
                    let inspections = res.inspections || [];

                    if (activeTab === 'PENDING') {
                        if (isAO && !isQC) {
                            inspections = inspections.filter((i: any) => i.status === 'ACTION_REQUIRED');
                        } else {
                            const statusesRaw: string[] = [];
                            if (isQC || isCityAdmin) statusesRaw.push('SUBMITTED');
                            if (isAO) statusesRaw.push('ACTION_REQUIRED');
                            inspections = inspections.filter((i: any) => statusesRaw.includes(i.status));
                        }
                    } else {
                        const statusesRaw = ['APPROVED', 'REJECTED', 'ACTION_TAKEN'];
                        inspections = inspections.filter((i: any) => statusesRaw.includes(i.status) || (isAO && i.actionTakenById));
                    }
                    inspections = inspections.filter((i: any) => isReportVisibleToAO(user, i, 'TOILET'));
                    allItems.push(...inspections.map((i: any) => ({ ...i, _type: 'INSPECTION' })));
                } catch (e) { console.error("Error fetching inspections", e); }
            }

            allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const unique = allItems.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            setItems(unique);

        } catch (err) {
            console.error("Failed to load data:", err);
        } finally {
            setLoading(false);
        }
    };

    const [processingText, setProcessingText] = useState<string | null>(null);

    const handleAction = async (id: string, status: string, isInspection = false, userComment?: string) => {
        try {
            setProcessingText(status === 'APPROVED' ? 'Approving request...' : 'Rejecting request...');
            if (!isInspection) {
                if (status === 'APPROVED') {
                    await ToiletApi.approveToilet(id);
                } else {
                    await ToiletApi.rejectToilet(id, userComment || "Rejected by Reviewing Officer");
                }
            } else {
                await ToiletApi.reviewInspection(id, { status, comment: userComment || (status === 'APPROVED' ? 'Approved' : 'Rejected') });
            }
            setSelectedRequest(null);
            setFullReportModalItem(null);
            await loadData();
        } catch (err: any) {
            console.error("Action failed:", err);
        } finally {
            setProcessingText(null);
        }
    };

    const isRegistration = (req: any) => req._type === 'REGISTRATION';

    // Helper to get formatted Zone/Ward string
    const getZoneWard = (req: any) => {
        const wId = isRegistration(req) ? req.wardId : req.toilet?.wardId;
        if (!wId) return 'N/A';
        const info = wardMap[wId];
        return info ? `${info.zoneName || 'Zone'} / ${info.name}` : 'Loading...';
    };

    const getSubmittedBy = (req: any) => {
        return isRegistration(req) ? req.requestedBy?.name : req.supervisor?.name;
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: selectedRequest ? '1fr 450px' : '1fr', gap: 24, transition: 'all 0.3s' }}>
            {/* Main List */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0 }}>Tasks Queue</h3>
                    <FilterTabs
                        tabs={[
                            { id: 'PENDING', label: `Pending (${activeTab === 'PENDING' ? items.length : '...'})` },
                            { id: 'COMPLETED', label: 'Completed' }
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setActiveTab(id)}
                    />
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Asset Details</th>
                                    <th>Zone / Ward</th>
                                    <th>Submitted By</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(req => (
                                    <tr
                                        key={req.id}
                                        className={selectedRequest?.id === req.id ? 'active-row' : ''}
                                        onClick={() => setFullReportModalItem(req)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                                                    {isRegistration(req) ? req.name : req.toilet?.name || 'Unknown Toilet'}
                                                </span>
                                                <span style={{
                                                    fontSize: 10,
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    background: isRegistration(req) ? '#dcfce7' : '#eff6ff',
                                                    color: isRegistration(req) ? '#15803d' : '#1d4ed8',
                                                    fontWeight: 800,
                                                    display: 'inline-block',
                                                    lineHeight: '1.2'
                                                }}>
                                                    {isRegistration(req) ? 'REG' : 'INS'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                                                {isRegistration(req) ? (req.type || 'Public Toilet') : (req.toilet?.type || 'Public Toilet')}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, color: '#334155', verticalAlign: 'middle' }}>
                                            {getZoneWard(req)}
                                        </td>
                                        <td style={{ fontSize: 13, color: '#334155', verticalAlign: 'middle', fontWeight: 500 }}>
                                            {getSubmittedBy(req)}
                                        </td>
                                        <td style={{ verticalAlign: 'middle' }}>
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td style={{ fontSize: 13, color: '#64748b', verticalAlign: 'middle' }}>
                                            <div style={{ fontWeight: 600, color: '#334155' }}>{new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                            <button
                                                style={{ fontSize: 12, padding: '8px 16px', borderRadius: 8, fontWeight: 700, background: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}
                                                onClick={(e) => { e.stopPropagation(); setFullReportModalItem(req); }}
                                            >
                                                View Report
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                            No {activeTab.toLowerCase()} items found in queue.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>



            {fullReportModalItem && (
                <UniversalReportModal
                    moduleTitle={fullReportModalItem._type === 'REGISTRATION' ? "Toilet Registration" : "Cleanliness of Toilet"}
                    moduleBadge="HMS TOILET AUDIT"
                    record={{
                        ...fullReportModalItem,
                        wardName: fullReportModalItem.wardName || (fullReportModalItem.wardId && wardMap[fullReportModalItem.wardId]?.name) || fullReportModalItem.ward?.name,
                        zoneName:
                            fullReportModalItem.zoneName ||
                            (fullReportModalItem.wardId &&
                                wardMap[fullReportModalItem.wardId]?.zoneName) ||
                            fullReportModalItem.ward?.parent?.name,
                    }}
                    onClose={() => setFullReportModalItem(null)}
                    onApprove={async (rec, comment) => {
                        await handleAction(rec.id, 'APPROVED', rec._type !== 'REGISTRATION', comment);
                    }}
                    onReject={async (rec, comment) => {
                        await handleAction(rec.id, 'REJECTED', rec._type !== 'REGISTRATION', comment);
                    }}
                    onActionRequired={async (rec, comment) => {
                        await handleAction(rec.id, 'ACTION_REQUIRED', true, comment);
                    }}
                    onActionTaken={async (rec, actionDescription, comment) => {
                        setProcessingText('Updating report status...');
                        try {
                            await ToiletApi.reviewInspection(rec.id, { status: 'ACTION_TAKEN', comment: actionDescription || comment });
                            setFullReportModalItem(null);
                            await loadData();
                        } finally {
                            setProcessingText(null);
                        }
                    }}
                />
            )}

            {/* Processing Spinner Overlay */}
            {processingText && typeof document !== 'undefined' && createPortal(
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 999999,
                    backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', gap: 16
                }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        border: '4px solid rgba(255,255,255,0.2)',
                        borderTop: '4px solid #2563eb',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', color: '#f8fafc' }}>
                        {processingText}
                    </div>
                </div>,
                document.body
            )}

            <style jsx>{`
                .table-responsive { overflow-x: auto; }
                .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .modern-table th { text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 16px 16px; border-bottom: 1px solid #e2e8f0; }
                .modern-table td { padding: 16px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
                .active-row { background-color: #eff6ff; }
                .active-row td { border-bottom-color: #bfdbfe; }
            `}</style>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: any = {
        'APPROVED': { bg: '#dcfce7', text: '#166534' },
        'REJECTED': { bg: '#fee2e2', text: '#991b1b' },
        'SUBMITTED': { bg: '#dbeafe', text: '#1e40af' },
        'ACTION_REQUIRED': { bg: '#ffedd5', text: '#9a3412' },
        'ACTION_TAKEN': { bg: '#dcfce7', text: '#166534' },
        'PENDING': { bg: '#f1f5f9', text: '#475569' }
    };
    const s = config[status] || config['PENDING'];
    return (
        <span style={{
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            backgroundColor: s.bg,
            color: s.text,
            whiteSpace: 'nowrap'
        }}>
            {status}
        </span>
    );
}

