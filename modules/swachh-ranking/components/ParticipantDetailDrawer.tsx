import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    ClipboardList,
    Edit3,
    History,
    ShieldCheck,
    Trash2,
    UserCheck,
    CheckCircle2
} from 'lucide-react';
import api from '../api/axios';
import ParticipantCategorySections from './ParticipantCategorySections';
import {
    createCitizenDetails,
    createHotelDetails,
    createHospitalDetails,
    createMarketDetails,
    createOfficeDetails,
    createSchoolDetails,
    createSocietyDetails,
    createWardDetails
} from '../constants/participantForms';
import { formatParticipantDisplayId, normalizeParticipantCategory } from '../utils/participants';

type Status = 'Awaiting Assignment' | 'In Progress' | 'Completed' | string;

export interface ParticipantRecord {
    id: string;
    category: string;
    mobileNumber: string;
    locationLat?: number | null;
    locationLng?: number | null;
    status: Status;
    createdAt: string;
    updatedAt?: string;
    assignedTo?: {
        id: string;
        name: string;
        role: string;
    } | null;
    details: Record<string, any>;
    assignmentStats?: {
        total?: number | null;
        completed?: number | null;
        pending?: number | null;
    };
    selfAssessment?: {
        id: string;
        status: string;
        submittedAt: string;
        qcRemarks?: string | null;
        qcReviewedBy?: string | null;
        qcReviewedAt?: string | null;
        qcTotalScore?: number | null;
        qcReviewComplete?: boolean;
        answers?: Record<string, any> | null;
    } | null;
}

interface HistoryRecord {
    field: string;
    oldValue: string;
    newValue: string;
    editedBy: string;
    timestamp: string;
}

interface ParticipantDetailDrawerProps {
    participant: ParticipantRecord;
    onClose: () => void;
    onDelete: (participantId: string) => void;
    onManageAssignment: (participant: ParticipantRecord) => void;
    canWriteParticipants: boolean;
    onSave?: (updatedParticipant: ParticipantRecord) => void;
    assignmentSummary: {
        label: string;
        percent: number;
        total?: number;
        completed?: number;
        pending?: number;
    };
    currentUserName?: string;
}

const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const mergeWithDefaults = <T extends Record<string, any>>(factory: () => T, source?: Record<string, any>): T => {
    const base = factory();
    const incoming = source || {};
    return Object.keys(base).reduce((acc, key) => {
        const value = incoming[key];
        (acc as Record<string, any>)[key] = value !== undefined && value !== null ? String(value) : '';
        return acc;
    }, { ...base });
};

const buildDefaultHistory = (participant: ParticipantRecord): HistoryRecord[] => {
    const createdStamp = participant.createdAt;
    const defaultEditor = participant.assignedTo?.name || 'System';
    const records: HistoryRecord[] = [
        {
            field: 'Status',
            oldValue: 'Pending Review',
            newValue: participant.status,
            editedBy: defaultEditor,
            timestamp: createdStamp
        },
        {
            field: 'Primary Contact',
            oldValue: '—',
            newValue: participant.mobileNumber,
            editedBy: defaultEditor,
            timestamp: createdStamp
        }
    ];
    return records;
};

const ParticipantDetailDrawer: React.FC<ParticipantDetailDrawerProps> = ({
    participant,
    onClose,
    onDelete,
    onManageAssignment,
    canWriteParticipants,
    onSave,
    assignmentSummary,
    currentUserName
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [saQcDetail, setSaQcDetail] = useState<{ loading: boolean; data: any | null }>({ loading: false, data: null });
    const [saQcExpanded, setSaQcExpanded] = useState(false);
    const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => buildDefaultHistory(participant));
    const [historyUserFilter, setHistoryUserFilter] = useState<string>('all');
    const [historyDateFilter, setHistoryDateFilter] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [saving, setSaving] = useState(false);

    const [officeDetails, setOfficeDetails] = useState(createOfficeDetails);
    const [societyDetails, setSocietyDetails] = useState(createSocietyDetails);
    const [hospitalDetails, setHospitalDetails] = useState(createHospitalDetails);
    const [wardDetails, setWardDetails] = useState(createWardDetails);
    const [hotelDetails, setHotelDetails] = useState(createHotelDetails);
    const [schoolDetails, setSchoolDetails] = useState(createSchoolDetails);
    const [marketDetails, setMarketDetails] = useState(createMarketDetails);
    const [citizenDetails, setCitizenDetails] = useState(createCitizenDetails);

    const loadSaQcDetail = async (saId: string) => {
        setSaQcDetail({ loading: true, data: null });
        setSaQcExpanded(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/self-assessment/qc/${saId}/detail`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaQcDetail({ loading: false, data: res.data });
        } catch {
            setSaQcDetail({ loading: false, data: null });
        }
    };

    const baselineDetailsRef = useRef<Record<string, any> | null>(null);
    const baselineMobileRef = useRef<string>(participant.mobileNumber || '');
    const normalizedCategory = useMemo(
        () => normalizeParticipantCategory(participant.category),
        [participant.category]
    );
    const participantDetails = participant.details;

    const hydrateDetails = useCallback(() => {
        setOfficeDetails(createOfficeDetails());
        setSocietyDetails(createSocietyDetails());
        setHospitalDetails(createHospitalDetails());
        setWardDetails(createWardDetails());
        setHotelDetails(createHotelDetails());
        setSchoolDetails(createSchoolDetails());
        setMarketDetails(createMarketDetails());
        setCitizenDetails(createCitizenDetails());

        const details = participantDetails;
        let merged: Record<string, any> | null = null;
        switch (normalizedCategory) {
            case 'offices': {
                const next = mergeWithDefaults(createOfficeDetails, details);
                setOfficeDetails(next);
                merged = next;
                break;
            }
            case 'societies - bwg': {
                const next = mergeWithDefaults(createSocietyDetails, details);
                setSocietyDetails(next);
                merged = next;
                break;
            }
            case 'hospitals': {
                const next = mergeWithDefaults(createHospitalDetails, details);
                setHospitalDetails(next);
                merged = next;
                break;
            }
            case 'wards': {
                const next = mergeWithDefaults(createWardDetails, details);
                setWardDetails(next);
                merged = next;
                break;
            }
            case 'hotels': {
                const next = mergeWithDefaults(createHotelDetails, details);
                setHotelDetails(next);
                merged = next;
                break;
            }
            case 'schools': {
                const next = mergeWithDefaults(createSchoolDetails, details);
                setSchoolDetails(next);
                merged = next;
                break;
            }
            case 'markets': {
                const next = mergeWithDefaults(createMarketDetails, details);
                setMarketDetails(next);
                merged = next;
                break;
            }
            case 'citizen_puraskar': {
                const next = mergeWithDefaults(createCitizenDetails, details);
                setCitizenDetails(next);
                merged = next;
                break;
            }
            default:
                merged = null;
        }
        baselineDetailsRef.current = merged;
    }, [normalizedCategory, participantDetails]);

    useEffect(() => {
        hydrateDetails();
        setHistoryRecords(buildDefaultHistory(participant));
        setIsEditing(false);
        baselineMobileRef.current = participant.mobileNumber || '';
    }, [participant, hydrateDetails]);

    const categoryStates = useMemo(() => ({
        offices: { value: officeDetails, onChange: setOfficeDetails },
        societies: { value: societyDetails, onChange: setSocietyDetails },
        hospitals: { value: hospitalDetails, onChange: setHospitalDetails },
        wards: { value: wardDetails, onChange: setWardDetails },
        hotels: { value: hotelDetails, onChange: setHotelDetails },
        schools: { value: schoolDetails, onChange: setSchoolDetails },
        markets: { value: marketDetails, onChange: setMarketDetails },
        citizen: { value: citizenDetails, onChange: setCitizenDetails }
    }), [
        officeDetails,
        societyDetails,
        hospitalDetails,
        wardDetails,
        hotelDetails,
        schoolDetails,
        marketDetails,
        citizenDetails
    ]);

    const filteredHistory = useMemo(() => {
        return historyRecords.filter((record) => {
            const matchesUser = historyUserFilter === 'all' || record.editedBy === historyUserFilter;
            const isoDate = record.timestamp ? record.timestamp.slice(0, 10) : '';
            const matchesDate = !historyDateFilter || isoDate === historyDateFilter;
            return matchesUser && matchesDate;
        });
    }, [historyRecords, historyUserFilter, historyDateFilter]);

    const getDetailsPayload = (): Record<string, any> => {
        switch (normalizedCategory) {
            case 'offices':
                return { ...officeDetails };
            case 'societies - bwg':
                return { ...societyDetails };
            case 'hospitals':
                return { ...hospitalDetails };
            case 'wards':
                return { ...wardDetails };
            case 'hotels':
                return { ...hotelDetails };
            case 'schools':
                return { ...schoolDetails };
            case 'markets':
                return { ...marketDetails };
            case 'citizen_puraskar':
                return { ...citizenDetails };
            default:
                return {};
        }
    };

    const derivePrimaryContact = (details: Record<string, any>) => {
        switch (normalizedCategory) {
            case 'offices':
                return details.inchargeContact;
            case 'societies - bwg':
                return details.chairmanContact;
            case 'hospitals':
                return details.adminContact;
            case 'wards':
                return details.officerContact;
            case 'hotels':
                return details.inchargeContact;
            case 'schools':
                return details.principalContact;
            case 'markets':
                return details.inchargeSIContact || details.associationHeadContact;
            case 'citizen_puraskar':
                return details.phoneNumber;
            default:
                return '';
        }
    };

    const formatFieldName = (field: string) =>
        field
            .replace(/([A-Z])/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^./, (char) => char.toUpperCase());

    const computeDiffEntries = (prevDetails: Record<string, any> | null, nextDetails: Record<string, any>, prevMobile: string, nextMobile: string) => {
        const records: HistoryRecord[] = [];
        const prev = prevDetails || {};
        const keys = new Set([...Object.keys(prev), ...Object.keys(nextDetails)]);
        keys.forEach((key) => {
            const before = prev[key] ?? '';
            const after = nextDetails[key] ?? '';
            if (String(before) !== String(after)) {
                records.push({
                    field: formatFieldName(key),
                    oldValue: before ? String(before) : '—',
                    newValue: after ? String(after) : '—',
                    editedBy: currentUserName || 'You',
                    timestamp: new Date().toISOString()
                });
            }
        });
        if (prevMobile !== nextMobile) {
            records.unshift({
                field: 'Primary Contact',
                oldValue: prevMobile || '—',
                newValue: nextMobile,
                editedBy: currentUserName || 'You',
                timestamp: new Date().toISOString()
            });
        }
        return records;
    };

    const handleSave = async () => {
        const detailsPayload = getDetailsPayload();
        const contactSource = derivePrimaryContact(detailsPayload) || participant.mobileNumber;
        const contact = (contactSource || '').replace(/\D/g, '');
        if (contact.length !== 10) {
            alert('Please enter a valid 10-digit primary contact number before saving.');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
            const response = await api.patch(
                `/participation/${participant.id}`,
                {
                    details: detailsPayload,
                    mobileNumber: contact
                },
                config
            );
            const updatedParticipant: ParticipantRecord = response.data.participant || response.data;
            onSave?.(updatedParticipant);
            const diffs = computeDiffEntries(baselineDetailsRef.current, detailsPayload, baselineMobileRef.current, contact);
            baselineDetailsRef.current = detailsPayload;
            baselineMobileRef.current = contact;
            if (diffs.length) {
                setHistoryRecords((prev) => [...diffs, ...prev]);
            }
            setIsEditing(false);
            setToastMessage('Details updated successfully');
            window.setTimeout(() => setToastMessage(''), 2800);
        } catch (error) {
            console.error('Failed to update participant', error);
            alert('Failed to update participant details. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        hydrateDetails();
        setIsEditing(false);
    };

    const handleEditClick = () => {
        if (!canWriteParticipants) {
            return;
        }
        hydrateDetails();
        setIsEditing(true);
    };

    const usersInHistory = useMemo(
        () => Array.from(new Set(historyRecords.map((record) => record.editedBy))).filter(Boolean),
        [historyRecords]
    );

    const assignmentCompleted = assignmentSummary.completed ?? participant.assignmentStats?.completed ?? 0;
    const assignmentTotal = assignmentSummary.total ?? participant.assignmentStats?.total ?? 0;
    const lastUpdatedAt = participant.updatedAt || participant.createdAt;
    const lastUpdatedBy = participant.assignedTo?.name || 'System';
    const derivedPercent =
        typeof assignmentSummary.percent === 'number' && Number.isFinite(assignmentSummary.percent)
            ? assignmentSummary.percent
            : assignmentTotal > 0
                ? (assignmentCompleted / assignmentTotal) * 100
                : 0;
    const assignmentPercent = Math.max(0, Math.min(100, derivedPercent));
    const statusBadgeClass = `participant-badge status-${(participant.status || '')
        .toString()
        .replace(/\s+/g, '-')
        .toLowerCase()}`;
    const formClassName = `participant-detail-form${isEditing ? ' editing' : ''}`;
    const formRole = normalizedCategory || participant.category;

    return (
        <div className="participant-detail-overlay">
            <div className="participant-detail-panel">
                <div className="participant-detail-header">
                    <div>
                        <p className="participant-detail-eyebrow">Participant</p>
                        <div className="participant-detail-title-row">
                            <h2>Participant Details</h2>
                            <span className={statusBadgeClass}>{participant.status}</span>
                        </div>
                        <div className="participant-detail-meta">
                            <span>ID: {formatParticipantDisplayId(participant.id, participant.category)}</span>
                            <span>
                                Last updated by {lastUpdatedBy} · {formatTimestamp(lastUpdatedAt)}
                            </span>
                        </div>
                    </div>
                    <div className="participant-detail-header-actions">
                        <button
                            className="primary-btn"
                            onClick={handleEditClick}
                            disabled={isEditing || !canWriteParticipants}
                        >
                            <Edit3 size={16} />
                            Edit
                        </button>
                        <button
                            className="danger-ghost-btn"
                            onClick={() => onDelete(participant.id)}
                            disabled={!canWriteParticipants}
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                        <button className="neutral-btn" onClick={onClose}>
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    </div>
                </div>

                <div className={formClassName}>
                    <ParticipantCategorySections role={formRole} states={categoryStates} disabled={!isEditing} />
                    {isEditing && (
                        <div className="edit-actions">
                            <button className="primary-btn" onClick={handleSave} disabled={saving}>
                                <CheckCircle2 size={16} />
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                            <button className="neutral-btn" onClick={handleCancel}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                <div className="participant-detail-columns">
                    <section className="detail-card">
                        <div className="card-header">
                            <ShieldCheck size={18} />
                            <div>
                                <h3>Assignment Details</h3>
                                <p>Monitor progress & manage assessors</p>
                            </div>
                        </div>
                        <div className="assignment-grid">
                            <div className="metric">
                                <span>Assignment Status</span>
                                <p>{participant.assignedTo ? `Assigned to ${participant.assignedTo.name}` : 'Awaiting Assignment'}</p>
                            </div>
                            <div className="metric">
                                <span>Assessments Completed</span>
                                <p>{assignmentCompleted} / {assignmentTotal}</p>
                                <span className="meta-label">{assignmentSummary.label}</span>
                                <div className="progress-bar">
                                    <div style={{ width: `${assignmentPercent}%` }} />
                                </div>
                            </div>
                        </div>
                        <button
                            className="outline-btn"
                            onClick={() => onManageAssignment(participant)}
                            disabled={!canWriteParticipants}
                        >
                            <ClipboardList size={16} />
                            Manage Assignment
                        </button>
                    </section>

                    {/* Self Assessment Status Card */}
                    <section className="detail-card" style={{ marginTop: '1.25rem' }}>
                        <div className="card-header">
                            <CheckCircle2 size={18} />
                            <div>
                                <h3>Self Assessment</h3>
                                <p>Submitted by the participant directly</p>
                            </div>
                        </div>
                        <div className="assignment-grid">
                            {(() => {
                                const sa = participant.selfAssessment;
                                if (!sa) {
                                    return (
                                        <div className="metric" style={{ gridColumn: '1 / -1' }}>
                                            <span>Status</span>
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d1d5db' }} />
                                                Not Started
                                            </p>
                                        </div>
                                    );
                                }
                                const statusColor: Record<string, string> = { Submitted: '#d97706', Approved: '#16a34a', Rejected: '#dc2626' };
                                const statusDot: Record<string, string> = { Submitted: '#fbbf24', Approved: '#22c55e', Rejected: '#ef4444' };
                                const reviewerName = sa.qcReviewedBy ||
                                    (sa.answers ? Object.values(sa.answers as Record<string, any>).find((a: any) => a?.qcReviewedByName)?.qcReviewedByName : null);
                                return (
                                    <>
                                        <div className="metric">
                                            <span>Status</span>
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: statusColor[sa.status] || '#374151', fontWeight: 700 }}>
                                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: statusDot[sa.status] || '#6b7280' }} />
                                                {sa.status === 'Submitted' ? 'Submitted – Pending Review' : sa.status}
                                            </p>
                                        </div>
                                        <div className="metric">
                                            <span>Submitted On</span>
                                            <p>{new Date(sa.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>

                                        {/* QC Review Info */}
                                        {sa.qcReviewComplete && (
                                            <>
                                                <div className="metric">
                                                    <span>Reviewed By</span>
                                                    <p style={{ fontWeight: 700, color: '#6d28d9' }}>{reviewerName || '—'}</p>
                                                </div>
                                                <div className="metric">
                                                    <span>Reviewed On</span>
                                                    <p>{sa.qcReviewedAt ? new Date(sa.qcReviewedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                                                </div>
                                                {typeof sa.qcTotalScore === 'number' && (
                                                    <div className="metric">
                                                        <span>QC Score</span>
                                                        <p style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>{sa.qcTotalScore}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {sa.qcRemarks && (
                                            <div className="metric" style={{ gridColumn: '1 / -1' }}>
                                                <span>QC Remarks</span>
                                                <p style={{ color: '#dc2626' }}>{sa.qcRemarks}</p>
                                            </div>
                                        )}

                                        {/* View Per-Question Remarks button */}
                                        {sa.qcReviewComplete && (
                                            <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                                                <button
                                                    onClick={() => {
                                                        if (saQcExpanded) {
                                                            setSaQcExpanded(false);
                                                        } else {
                                                            loadSaQcDetail(sa.id);
                                                        }
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#6d28d9' }}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    {saQcExpanded ? 'Hide QC Review' : 'View Per-Question QC Review'}
                                                </button>

                                                {saQcExpanded && (
                                                    <div style={{ marginTop: 12, borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                                        {saQcDetail.loading ? (
                                                            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</div>
                                                        ) : saQcDetail.data ? (() => {
                                                            const { selfAssessment: saD, questions } = saQcDetail.data;
                                                            const answersD = (saD?.answers || {}) as Record<string, any>;
                                                            return (
                                                                <div>
                                                                    {questions.map((q: any, i: number) => {
                                                                        const ans = answersD[q.id];
                                                                        if (!ans) return null;
                                                                        const statusClr: Record<string, string> = { approved: '#10b981', rejected: '#ef4444', edited: '#f59e0b', pending: '#9ca3af' };
                                                                        const statusBg: Record<string, string> = { approved: '#f0fdf4', rejected: '#fff5f5', edited: '#fffbeb', pending: '#f9fafb' };
                                                                        const st = ans.qcStatus || 'pending';
                                                                        return (
                                                                            <div key={q.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', background: statusBg[st] || '#fff', borderLeft: `3px solid ${statusClr[st] || '#e5e7eb'}` }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                                                                                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#111827', flex: 1 }}>
                                                                                        <span style={{ color: '#9ca3af', marginRight: 4 }}>{i + 1}.</span>{q.text}
                                                                                    </p>
                                                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, background: statusBg[st], color: statusClr[st] || '#6b7280', border: `1px solid ${statusClr[st] || '#e5e7eb'}`, borderRadius: 5, padding: '1px 7px', textTransform: 'capitalize' }}>{st === 'edited' ? 'Rescored' : st}</span>
                                                                                        <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 700, marginTop: 3 }}>
                                                                                            QC: {typeof ans.qcScore === 'number' ? ans.qcScore : '—'} / {q.marks}
                                                                                            {typeof ans.score === 'number' && typeof ans.qcScore === 'number' && ans.score !== ans.qcScore && (
                                                                                                <span style={{ color: ans.qcScore < ans.score ? '#ef4444' : '#10b981', marginLeft: 4, fontSize: '0.7rem' }}>
                                                                                                    (was {ans.score})
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {ans.qcRemark && (
                                                                                    <div style={{ fontSize: '0.78rem', color: '#374151', background: 'rgba(0,0,0,0.03)', borderRadius: 6, padding: '5px 8px', marginTop: 4 }}>
                                                                                        <span style={{ fontWeight: 700, color: '#6b7280' }}>Remark: </span>{ans.qcRemark}
                                                                                    </div>
                                                                                )}
                                                                                {ans.qcReviewedByName && (
                                                                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 3 }}>
                                                                                        by {ans.qcReviewedByName} · {ans.qcReviewedAt ? new Date(ans.qcReviewedAt).toLocaleDateString() : ''}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })() : (
                                                            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Could not load details.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </section>

                    <section className="detail-card history-card">
                        <div className="card-header">
                            <History size={18} />
                            <div>
                                <h3>Edit History</h3>
                                <p>Latest updates listed first</p>
                            </div>
                        </div>

                        <div className="history-filters">
                            <label>
                                <span>Filter by user</span>
                                <select value={historyUserFilter} onChange={(e) => setHistoryUserFilter(e.target.value)}>
                                    <option value="all">All users</option>
                                    {usersInHistory.map((user) => (
                                        <option key={user} value={user}>
                                            {user}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>Filter by date</span>
                                <input type="date" value={historyDateFilter} onChange={(e) => setHistoryDateFilter(e.target.value)} />
                            </label>
                        </div>

                        <div className="history-timeline">
                            {filteredHistory.length === 0 ? (
                                <p className="history-empty">No edit history for the selected filters.</p>
                            ) : (
                                filteredHistory.map((record, index) => (
                                    <div key={`${record.field}-${record.timestamp}-${index}`} className="history-item">
                                        <div className="history-icon">
                                            <UserCheck size={14} />
                                        </div>
                                        <div className="history-content">
                                            <div className="history-top-row">
                                                <strong>{record.field}</strong>
                                                <span>{formatTimestamp(record.timestamp)}</span>
                                            </div>
                                            <div className="history-values">
                                                <span className="old-value">{record.oldValue}</span>
                                                <span className="new-value">{record.newValue}</span>
                                            </div>
                                            <p className="history-author">Edited by {record.editedBy}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {toastMessage && (
                <div className="participant-detail-toast">
                    <CheckCircle2 size={18} />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

export default ParticipantDetailDrawer;
