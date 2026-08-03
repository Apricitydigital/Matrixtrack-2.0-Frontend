import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '../react-router-shim';
import api from '../api/axios';
import { ArrowLeft, Loader2, User, ClipboardList, ExternalLink } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';
import { CATEGORY_LABELS, formatParticipantDisplayId, getCategoryMeta } from '../utils/participants';

interface AssignmentRow {
    id: string;
    assignmentNo: number;
    assessor?: {
        id: string;
        name: string;
        email: string;
    } | null;
    status: string;
    totalScore: number;
    createdAt: string;
    updatedAt: string;
    answeredCount?: number;
    totalQuestions?: number;
}

interface ParticipantSummary {
    id: string;
    category: string;
    mobileNumber: string;
    status: string;
    details: Record<string, any>;
    assignedTo?: {
        id: string;
        name: string;
        role: string;
    } | null;
}

const ParticipantAssessments = () => {
    const { participantId } = useParams() as { participantId?: string };
    const navigate = useNavigate();
    const [participant, setParticipant] = useState<ParticipantSummary | null>(null);
    const [assessments, setAssessments] = useState<AssignmentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewParticipants = hasPermission(currentUser?.permissions, 'participants', 'view');

    useEffect(() => {
        const fetchAssessments = async () => {
            if (!participantId) return;
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            try {
                const response = await api.get(`/participants/${participantId}/assessments`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setParticipant(response.data.participant);
                setAssessments(response.data.assessments || []);
            } catch (err: any) {
                console.error('Failed to load participant assessments', err);
                setError(err.response?.data?.message || 'Failed to load assessments');
            } finally {
                setLoading(false);
            }
        };

        fetchAssessments();
    }, [participantId]);

    const resolveParticipantName = () => {
        if (!participant?.details) return 'Participant';
        return (
            participant.details.name ||
            participant.details.schoolName ||
            participant.details.hospitalName ||
            participant.details.officeName ||
            participant.details.marketName ||
            participant.details.type ||
            'Participant'
        );
    };

    const participantDisplayId = participant ? formatParticipantDisplayId(participant.id, participant.category) : '';
    const categoryMeta = getCategoryMeta(participant?.category || '');

    if (!currentUser || !canViewParticipants) {
        return <NoAccess title="Participant Assessments" message="You do not have permission to view participant assessments." />;
    }

    return (
        <div className="participant-assessments-view" style={{ paddingBottom: '3rem' }}>
            <button
                onClick={() => navigate('/admin/participants')}
                className="btn btn-outline"
                style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={18} /> Back to Participants
            </button>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                    <Loader2 className="animate-spin" size={32} />
                    <p style={{ marginTop: '1rem', fontWeight: 600 }}>Loading assessment history...</p>
                </div>
            ) : error ? (
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c' }}>
                    {error}
                </div>
            ) : (
                <>
                    <header style={{ marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                            Assessment History
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {resolveParticipantName()}
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                Participant ID: {participantDisplayId || '—'}
                            </span>
                        </p>
                    </header>

                    <div className="card shadow-lg" style={{ marginBottom: '2rem', border: 'none', padding: '1.75rem', boxShadow: 'var(--shadow-lg)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                    Category
                                </div>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '999px',
                                        fontWeight: 800,
                                        fontSize: '0.85rem',
                                        backgroundColor: `${categoryMeta.color}15`,
                                        color: categoryMeta.color,
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {CATEGORY_LABELS[participant?.category || ''] || categoryMeta.label}
                                </span>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                    Mobile
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{participant?.mobileNumber}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                    Current Status
                                </div>
                                <span className="badge badge-approved" style={{ textTransform: 'uppercase', fontWeight: 800 }}>
                                    {participant?.status}
                                </span>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                    Assigned To
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                                    {participant?.assignedTo?.name || 'Not Assigned'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-lg" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                        {assessments.length === 0 ? (
                            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <ClipboardList size={48} style={{ marginBottom: '1rem' }} />
                                <p style={{ fontSize: '1rem', fontWeight: 600 }}>No assessments have been filed for this participant yet.</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Assessment No</th>
                                            <th>Assessor</th>
                                            <th>Submission Date</th>
                                            <th>Status</th>
                                            <th>Total Score</th>
                                            <th style={{ textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assessments.map((row) => {
                                            const submittedDate = row.updatedAt
                                                ? new Date(row.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                                                : '—';
                                            const canView = row.status && row.status !== 'pending';
                                            return (
                                                <tr key={row.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>#{row.assignmentNo}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                            <div style={{
                                                                width: '36px',
                                                                height: '36px',
                                                                borderRadius: '10px',
                                                                backgroundColor: 'var(--primary-soft)',
                                                                color: 'var(--primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 800
                                                            }}>
                                                                <User size={18} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700 }}>{row.assessor?.name || 'Unassigned'}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.assessor?.email || '—'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{submittedDate}</td>
                                                    <td>
                                                        <span className="badge" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                                                            {row.status}
                                                        </span>
                                                        {row.status === 'in_progress' && (row.totalQuestions ?? 0) > 0 && (
                                                            <div style={{ marginTop: '0.4rem', minWidth: '130px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                                                                    <span>{row.answeredCount ?? 0} / {row.totalQuestions} questions</span>
                                                                    <span style={{ fontWeight: 700 }}>
                                                                        {Math.round(((row.answeredCount ?? 0) / row.totalQuestions!) * 100)}%
                                                                    </span>
                                                                </div>
                                                                <div style={{ height: '6px', borderRadius: '999px', backgroundColor: 'var(--border-color, #e5e7eb)', overflow: 'hidden' }}>
                                                                    <div style={{
                                                                        height: '100%',
                                                                        borderRadius: '999px',
                                                                        backgroundColor: 'var(--primary, #16a34a)',
                                                                        width: `${Math.round(((row.answeredCount ?? 0) / row.totalQuestions!) * 100)}%`,
                                                                        transition: 'width 0.3s ease'
                                                                    }} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{row.totalScore || 0}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {canView ? (
                                                            <button
                                                                onClick={() => navigate(row.status === 'in_progress' ? `/assessment-review/${row.id}` : `/assessment/${row.id}`)}
                                                                className="btn btn-outline"
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                                            >
                                                                <ExternalLink size={16} />
                                                                View
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ParticipantAssessments;
