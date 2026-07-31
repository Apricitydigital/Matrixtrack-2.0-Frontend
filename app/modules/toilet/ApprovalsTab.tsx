import { useEffect, useState } from "react";
import { ToiletApi, GeoApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { FilterTabs } from "../qc-shared";

export default function ApprovalsTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
    const [items, setItems] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [wardMap, setWardMap] = useState<Record<string, { name: string, zoneName?: string }>>({});

    useEffect(() => {
        loadData();
    }, [user, activeTab]);

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
                    // For completed, we try to fetch all and filter
                    // Note: This fetches assigned toilets. Rejected ones might be missing if API doesn't return them.
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
                    // Client-side filtering as API returns paginated but usually sufficient for recent tasks
                    let inspections = res.inspections || [];

                    if (activeTab === 'PENDING') {
                        if (isAO && !isQC) { // Pure AO
                            inspections = inspections.filter((i: any) => i.status === 'ACTION_REQUIRED');
                        } else {
                            // QC / Admin sees SUBMITTED. AO also sees ACTION_REQUIRED? 
                            // If user is both QC and AO, they see everything needing action.
                            const statusesRaw: string[] = [];
                            if (isQC || isCityAdmin) statusesRaw.push('SUBMITTED');
                            if (isAO) statusesRaw.push('ACTION_REQUIRED');
                            inspections = inspections.filter((i: any) => statusesRaw.includes(i.status));
                        }
                    } else {
                        // Completed
                        const statusesRaw = ['APPROVED', 'REJECTED', 'ACTION_TAKEN'];
                        if (isAO && !isQC) {
                            // AO sees items that were Action Required but now resolved
                            // Or items they acted on.
                        }
                        inspections = inspections.filter((i: any) => statusesRaw.includes(i.status) || (isAO && i.actionTakenById));
                    }

                    allItems.push(...inspections.map((i: any) => ({ ...i, _type: 'INSPECTION' })));
                } catch (e) { console.error("Error fetching inspections", e); }
            }

            // Sort by Date Desc
            allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Remove duplicates
            const unique = allItems.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            setItems(unique);

        } catch (err) {
            console.error("Failed to load data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: string, isInspection = false) => {
        try {
            if (!isInspection) {
                if (status === 'APPROVED') {
                    await ToiletApi.approveToilet(id);
                } else {
                    const reason = prompt("Enter rejection reason:");
                    if (reason === null) return;
                    await ToiletApi.rejectToilet(id, reason || "Rejected by QC");
                }
            } else {
                let comment = '';
                if (status === 'ACTION_REQUIRED' || status === 'REJECTED') {
                    comment = prompt(status === 'ACTION_REQUIRED' ? "Enter instructions for Action Officer:" : "Enter action taken notes:") || '';
                    if (comment === null) return;
                }
                // For AO 'APPROVED' on Action Required means "No Action Needed" or resolved without note? usually implies resolved.
                // The API expects 'APPROVED', 'REJECTED' (AO takes action -> REJECTED logic in backend for AO?? wait check backend logic)

                // Backend logic check:
                // If AO reviews: 
                //   UpdateData.actionTakenById = userId
                //   If REJECTED -> update.actionNote = comment
                //   Must be APPROVED or REJECTED.

                await ToiletApi.reviewInspection(id, { status, comment });
            }
            alert("Action successful");
            setSelectedRequest(null);
            loadData();
        } catch (err: any) {
            alert(err.message || "Action failed");
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
                                        onClick={() => setSelectedRequest(req)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                                {isRegistration(req) ? req.name : req.toilet?.name || 'Unknown Toilet'}
                                                <span style={{
                                                    marginLeft: 8,
                                                    fontSize: 10,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: isRegistration(req) ? '#dcfce7' : '#eff6ff',
                                                    color: isRegistration(req) ? '#166534' : '#1e40af',
                                                    fontWeight: 800
                                                }}>
                                                    {isRegistration(req) ? 'REG' : 'INS'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                                {isRegistration(req) ? req.type : req.toilet?.type}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, color: '#334155' }}>
                                            {getZoneWard(req)}
                                        </td>
                                        <td style={{ fontSize: 13, color: '#334155' }}>
                                            {getSubmittedBy(req)}
                                        </td>
                                        <td>
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td style={{ fontSize: 13, color: '#64748b' }}>
                                            {new Date(req.createdAt).toLocaleDateString()} <span style={{ fontSize: 11 }}>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className="flex gap-2 justify-end">
                                                <button className="btn btn-sm btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}>
                                                    View
                                                </button>
                                            </div>
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

            {/* Sidebar Inspector */}
            {selectedRequest && (
                <div className="card" style={{ borderLeft: '4px solid #2563eb', position: 'sticky', top: 20, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h4 style={{ margin: 0 }}>{isRegistration(selectedRequest) ? 'Registration Request' : 'Inspection Report'}</h4>
                        <button className="btn btn-sm" onClick={() => setSelectedRequest(null)}>✕</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Common Header Info */}
                        <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Submission Details</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                <span style={{ color: '#64748b' }}>Submitted By:</span>
                                <span style={{ fontWeight: 600 }}>{getSubmittedBy(selectedRequest)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                <span style={{ color: '#64748b' }}>Date:</span>
                                <span>{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: '#64748b' }}>Location:</span>
                                <span>{getZoneWard(selectedRequest)}</span>
                            </div>
                        </div>

                        {/* Registration Specifics */}
                        {isRegistration(selectedRequest) && (
                            <>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Asset Details</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{selectedRequest.name}</div>
                                    <div style={{ fontSize: 13, color: '#334155' }}>{selectedRequest.type} • {selectedRequest.gender}</div>
                                    <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>Seats: {selectedRequest.numberOfSeats || 'N/A'}</div>
                                    {selectedRequest.address && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>📍 {selectedRequest.address}</div>}
                                </div>
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                                    {/* Actions for QC and Admin */}
                                    {(user?.roles.includes('QC') || user?.roles.includes('CITY_ADMIN') || user?.roles.includes('HMS_SUPER_ADMIN')) ? (
                                        selectedRequest.status === 'PENDING' ? (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => handleAction(selectedRequest.id, 'APPROVED')}>
                                                    Approve
                                                </button>
                                                <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleAction(selectedRequest.id, 'REJECTED')}>
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="badge" style={{ width: '100%', textAlign: 'center', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                                Status: {selectedRequest.status}
                                            </div>
                                        )
                                    ) : (
                                        <div className="badge" style={{ width: '100%', textAlign: 'center', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                            Read Only
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Inspection Specifics */}
                        {!isRegistration(selectedRequest) && (
                            <>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Inspection Report</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {selectedRequest.answers && Object.entries(selectedRequest.answers).map(([qId, val]: [string, any]) => {
                                            const isNewFormat = val && typeof val === 'object' && 'answer' in val;
                                            const displayVal = isNewFormat ? val.answer : val;
                                            return (
                                                <div key={qId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 6, borderBottom: '1px solid #f8fafc' }}>
                                                    <span style={{ color: '#334155', maxWidth: '70%' }}>{qId}</span>
                                                    <span style={{ fontWeight: 700 }}>
                                                        {displayVal === true || displayVal === 'YES' ? '✅ YES' :
                                                            displayVal === false || displayVal === 'NO' ? '❌ NO' : String(displayVal)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        <a href={`/modules/toilet/inspection/${selectedRequest.id}`} target="_blank" className="btn btn-xs btn-outline" style={{ width: '100%' }}>View Full Report Document</a>
                                    </div>
                                </div>

                                {/* Audit Trail */}
                                {(selectedRequest.reviewedByQc || selectedRequest.actionTakenBy) && (
                                    <div style={{ backgroundColor: '#f0f9ff', padding: 12, borderRadius: 8, fontSize: 13 }}>
                                        {selectedRequest.qcComment && (
                                            <div style={{ marginBottom: 8 }}>
                                                <div style={{ fontWeight: 700, color: '#0369a1' }}>QC Note:</div>
                                                <div>{selectedRequest.qcComment}</div>
                                            </div>
                                        )}
                                        {selectedRequest.actionNote && (
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#15803d' }}>Action Note:</div>
                                                <div>{selectedRequest.actionNote}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                                    {/* Actions */}
                                    {(user?.roles.includes('QC') || user?.roles.includes('CITY_ADMIN') || user?.roles.includes('HMS_SUPER_ADMIN')) && selectedRequest.status === 'SUBMITTED' && (
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <button className="btn btn-sm btn-primary" style={{ flex: 1, backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => handleAction(selectedRequest.id, 'APPROVED', true)}>Approve</button>
                                            <button className="btn btn-sm btn-primary" style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleAction(selectedRequest.id, 'REJECTED', true)}>Reject</button>
                                            <button className="btn btn-sm btn-outline" style={{ width: '100%', borderColor: '#f59e0b', color: '#d97706' }} onClick={() => handleAction(selectedRequest.id, 'ACTION_REQUIRED', true)}>Action Required</button>
                                        </div>
                                    )}

                                    {user?.roles.includes('ACTION_OFFICER') && selectedRequest.status === 'ACTION_REQUIRED' && (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={() => handleAction(selectedRequest.id, 'APPROVED', true)}>No Issue</button>
                                            <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => handleAction(selectedRequest.id, 'REJECTED', true)}>Action Taken</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                    </div>
                </div>
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

