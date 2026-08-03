import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '../react-router-shim';
import api from '../api/axios';
import { ArrowLeft, Loader2, User, ShieldCheck, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';

const resolveImageUrl = (src?: string) => {
    if (!src) return '';
    const trimmed = src.trim();
    if (/^(https?:|data:|blob:)/i.test(trimmed)) {
        return trimmed;
    }

    const mediaBase = (import.meta as any).env?.VITE_MEDIA_BASE_URL?.replace(/\/+$/, '');
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, '');
    const fallback = (import.meta as any).env?.DEV
        ? 'http://localhost:5000'
        : (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');

    const base = mediaBase || apiBase || fallback;
    const needsSlash = trimmed.startsWith('/') ? '' : '/';
    return `${base}${needsSlash}${trimmed}`;
};

const AssessmentDetails = () => {
    const { assessmentId } = useParams() as { assessmentId?: string };
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedScoreSource, setSelectedScoreSource] = useState<'SELF' | 'QC'>('SELF');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'APPROVED' | 'REJECTED' | 'RE_REVIEW' | null>(null);
    const [adminActionLoading, setAdminActionLoading] = useState(false);
    const [adminActionError, setAdminActionError] = useState<string | null>(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewReports = hasPermission(currentUser?.permissions, 'reports', 'view');
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        const fetchAssessment = async () => {
            if (!assessmentId) return;
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            try {
                const response = await api.get(`/assessments/${assessmentId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAssessment(response.data);
                try {
                    const logsRes = await api.get(`/assessments/${assessmentId}/qc-audit-logs`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setAuditLogs(logsRes.data);
                } catch { /* audit logs optional */ }
            } catch (err: any) {
                console.error('Failed to load assessment', err);
                setError(err.response?.data?.message || 'Unable to load assessment report');
            } finally {
                setLoading(false);
            }
        };

        fetchAssessment();
    }, [assessmentId]);

    const responses = Array.isArray(assessment?.responses) ? assessment.responses : [];

    const selfScore = assessment?.totalScore ?? 0;
    const qcScore = assessment?.qcReviewComplete ? (assessment?.qcTotalScore ?? null) : null;
    const maxScore = assessment?.questionnaire?.maxMarks ?? 7800;
    const selectedFinalScore = selectedScoreSource === 'QC' ? (qcScore ?? selfScore) : selfScore;
    const isAlreadyAdminActioned = !!assessment?.adminStatus;

    const handleAdminAction = (action: 'APPROVED' | 'REJECTED' | 'RE_REVIEW') => {
        setPendingAction(action);
        setAdminActionError(null);
        setShowConfirmModal(true);
    };

    const confirmAdminAction = async () => {
        if (!pendingAction || !assessmentId) return;
        setAdminActionLoading(true);
        setAdminActionError(null);
        const token = localStorage.getItem('token');
        try {
            const payload: any = { action: pendingAction };
            if (pendingAction === 'APPROVED') payload.finalScoreSource = selectedScoreSource;
            const res = await api.patch(`/assessments/${assessmentId}/admin-finalize`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssessment((prev: any) => ({ ...prev, ...res.data.assessment }));
            setShowConfirmModal(false);
            setPendingAction(null);
        } catch (err: any) {
            setAdminActionError(err.response?.data?.message || 'Action failed');
        } finally {
            setAdminActionLoading(false);
        }
    };

    if (!currentUser || !canViewReports) {
        return <NoAccess title="Assessment Report" message="You do not have permission to view assessment reports." />;
    }

    const renderParticipantName = () => {
        const details = assessment?.participant?.details || {};
        return (
            details.name ||
            details.schoolName ||
            details.hospitalName ||
            details.officeName ||
            details.marketName ||
            details.type ||
            'Participant'
        );
    };

    return (
        <div className="assessment-details-view" style={{ paddingBottom: '3rem' }}>
            <button
                onClick={() => navigate(-1)}
                className="btn btn-outline"
                style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <ArrowLeft size={18} /> Back
            </button>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                    <Loader2 className="animate-spin" size={32} />
                    <p style={{ marginTop: '1rem', fontWeight: 600 }}>Loading assessment report...</p>
                </div>
            ) : error ? (
                <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c' }}>
                    {error}
                </div>
            ) : (
                assessment && (
                    <>
                        <header style={{ marginBottom: '2rem' }}>
                            <h1 style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                                Assessment #{assessment.assignmentNo}
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                                {renderParticipantName()} &middot; {assessment.participant?.category}
                            </p>
                        </header>

                        <div className="card shadow-lg" style={{ marginBottom: '2rem', border: 'none', padding: '1.75rem', boxShadow: 'var(--shadow-lg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                        Assessor
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>{assessment.assessor?.name || 'Unknown'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{assessment.assessor?.email || '—'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                        Submitted On
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                                        {new Date(assessment.updatedAt).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                        QC Status
                                    </div>
                                    <span className="badge" style={{ textTransform: 'uppercase', fontWeight: 800 }}>{assessment.status}</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                        Total Score
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{assessment.totalScore}</div>
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-lg" style={{ padding: '1.75rem', border: 'none', boxShadow: 'var(--shadow-lg)', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={18} /> Participant Details
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                {Object.entries(assessment.participant?.details || {}).map(([key, value]) => (
                                    <div key={key}>
                                        <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                                            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                        </label>
                                        <p style={{ fontWeight: 700 }}>{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Admin Final Approval Panel */}
                        {isAdmin && (
                            <>
                                {isAlreadyAdminActioned ? (
                                    /* Post-approval read-only result */
                                    <div className="card shadow-lg" style={{ padding: '1.75rem', border: 'none', boxShadow: 'var(--shadow-lg)', marginBottom: '2rem', background: assessment.adminStatus === 'APPROVED' ? '#f0fdf4' : assessment.adminStatus === 'REJECTED' ? '#fef2f2' : '#fffbeb' }}>
                                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: assessment.adminStatus === 'APPROVED' ? '#15803d' : assessment.adminStatus === 'REJECTED' ? '#b91c1c' : '#92400e' }}>
                                            {assessment.adminStatus === 'APPROVED' ? <CheckCircle2 size={20} /> : assessment.adminStatus === 'REJECTED' ? <XCircle size={20} /> : <RotateCcw size={20} />}
                                            Admin Decision: {assessment.adminStatus}
                                        </h2>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                                            {assessment.adminStatus === 'APPROVED' && (
                                                <>
                                                    <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem 1.25rem', border: '2px solid #bbf7d0' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.35rem' }}>Final Approved Score</div>
                                                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d' }}>{assessment.finalScore} <span style={{ fontSize: '1rem', fontWeight: 700, color: '#6b7280' }}>/ {maxScore}</span></div>
                                                    </div>
                                                    <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem 1.25rem', border: '2px solid #bbf7d0' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.35rem' }}>Score Source</div>
                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1d4ed8' }}>{assessment.finalScoreSource === 'QC' ? 'QC Reviewed Score' : 'Self Assessment Score'}</div>
                                                    </div>
                                                </>
                                            )}
                                            <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem 1.25rem', border: '2px solid #e5e7eb' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.35rem' }}>Approved By</div>
                                                <div style={{ fontWeight: 700 }}>{assessment.approvedBy || '—'}</div>
                                            </div>
                                            <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem 1.25rem', border: '2px solid #e5e7eb' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.35rem' }}>Actioned At</div>
                                                <div style={{ fontWeight: 700 }}>{assessment.approvedAt ? new Date(assessment.approvedAt).toLocaleString() : '—'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Active admin approval panel */
                                    <div className="card shadow-lg" style={{ padding: '1.75rem', border: '2px solid #c7d2fe', boxShadow: 'var(--shadow-lg)', marginBottom: '2rem', background: '#f8f9ff' }}>
                                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: '#3730a3' }}>Admin Final Approval</h2>

                                        {/* Score comparison cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{ background: '#fff7ed', borderRadius: '12px', padding: '1rem 1.25rem', border: '2px solid #fed7aa', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#9a3412', marginBottom: '0.35rem' }}>Self Assessment Score</div>
                                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#c2410c' }}>{selfScore}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>/ {maxScore}</div>
                                            </div>
                                            <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '1rem 1.25rem', border: '2px solid #bfdbfe', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a', marginBottom: '0.35rem' }}>QC Reviewed Score</div>
                                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1d4ed8' }}>{qcScore !== null ? qcScore : '—'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#1e3a8a', fontWeight: 600 }}>/ {maxScore}</div>
                                            </div>
                                            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '1rem 1.25rem', border: `2px solid ${selectedScoreSource === 'QC' ? '#86efac' : '#fcd34d'}`, textAlign: 'center', transition: 'border-color 0.2s' }}>
                                                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#14532d', marginBottom: '0.35rem' }}>Selected Final Score</div>
                                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d' }}>{selectedFinalScore}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#14532d', fontWeight: 600 }}>/ {maxScore}</div>
                                            </div>
                                        </div>

                                        {/* Score source selection */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: '#374151' }}>Choose Final Score Source</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem 1rem', borderRadius: '10px', border: `2px solid ${selectedScoreSource === 'SELF' ? '#f97316' : '#e5e7eb'}`, background: selectedScoreSource === 'SELF' ? '#fff7ed' : '#fff', fontWeight: 700, transition: 'all 0.15s' }}>
                                                    <input type="radio" name="scoreSource" value="SELF" checked={selectedScoreSource === 'SELF'} onChange={() => setSelectedScoreSource('SELF')} style={{ accentColor: '#f97316', width: '16px', height: '16px' }} />
                                                    <span>Self Assessment Score</span>
                                                    <span style={{ marginLeft: 'auto', fontWeight: 900, color: '#c2410c' }}>{selfScore}/{maxScore}</span>
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: qcScore !== null ? 'pointer' : 'not-allowed', padding: '0.75rem 1rem', borderRadius: '10px', border: `2px solid ${selectedScoreSource === 'QC' ? '#3b82f6' : '#e5e7eb'}`, background: selectedScoreSource === 'QC' ? '#eff6ff' : qcScore === null ? '#f9fafb' : '#fff', fontWeight: 700, transition: 'all 0.15s', opacity: qcScore === null ? 0.5 : 1 }}>
                                                    <input type="radio" name="scoreSource" value="QC" checked={selectedScoreSource === 'QC'} onChange={() => setSelectedScoreSource('QC')} disabled={qcScore === null} style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }} />
                                                    <span>QC Reviewed Score</span>
                                                    {qcScore === null && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>(QC not completed)</span>}
                                                    <span style={{ marginLeft: 'auto', fontWeight: 900, color: '#1d4ed8' }}>{qcScore !== null ? `${qcScore}/${maxScore}` : '—'}</span>
                                                </label>
                                            </div>
                                        </div>

                                        {adminActionError && (
                                            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
                                                {adminActionError}
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <button onClick={() => handleAdminAction('APPROVED')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
                                                <CheckCircle2 size={16} /> Approve Selected Score
                                            </button>
                                            <button onClick={() => handleAdminAction('REJECTED')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
                                                <XCircle size={16} /> Reject Assessment
                                            </button>
                                            <button onClick={() => handleAdminAction('RE_REVIEW')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '10px', border: '2px solid #d97706', background: '#fff', color: '#d97706', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
                                                <RotateCcw size={16} /> Request Re-Review
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Confirmation Modal */}
                                {showConfirmModal && (
                                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                        <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '460px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>Confirm Action</h3>
                                            <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.9rem' }}>Are you sure you want to finalize the selected score?</p>

                                            {pendingAction === 'APPROVED' && (
                                                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e5e7eb' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Score Source</span>
                                                        <span style={{ fontWeight: 800, color: selectedScoreSource === 'QC' ? '#1d4ed8' : '#c2410c' }}>
                                                            {selectedScoreSource === 'QC' ? 'QC Reviewed Score' : 'Self Assessment Score'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Final Score</span>
                                                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#15803d' }}>{selectedFinalScore} / {maxScore}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {pendingAction === 'REJECTED' && (
                                                <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 700, fontSize: '0.9rem' }}>
                                                    This assessment will be marked as Rejected.
                                                </div>
                                            )}
                                            {pendingAction === 'RE_REVIEW' && (
                                                <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', border: '1px solid #fcd34d', color: '#92400e', fontWeight: 700, fontSize: '0.9rem' }}>
                                                    This assessment will be sent back for re-review.
                                                </div>
                                            )}

                                            {adminActionError && (
                                                <div style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', marginBottom: '1rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                                    {adminActionError}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => { setShowConfirmModal(false); setPendingAction(null); setAdminActionError(null); }} disabled={adminActionLoading} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '2px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                                                    Cancel
                                                </button>
                                                <button onClick={confirmAdminAction} disabled={adminActionLoading} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: pendingAction === 'APPROVED' ? '#16a34a' : pendingAction === 'REJECTED' ? '#dc2626' : '#d97706', color: '#fff', fontWeight: 800, cursor: adminActionLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {adminActionLoading && <Loader2 size={14} className="animate-spin" />}
                                                    Confirm {pendingAction === 'APPROVED' ? 'Approval' : pendingAction === 'REJECTED' ? 'Rejection' : 'Re-Review'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="card shadow-lg" style={{ padding: '1.75rem', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>Responses</h2>
                            {responses.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>No responses recorded.</p>
                            ) : (
                                <div className="table-container" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Question</th>
                                                <th style={{ width: '90px' }}>Submitted</th>
                                                <th style={{ width: '90px' }}>QC Score</th>
                                                <th style={{ width: '80px' }}>Diff</th>
                                                <th style={{ width: '100px' }}>QC Status</th>
                                                <th>QC Remarks</th>
                                                <th>Reviewed By</th>
                                                <th>Reviewed At</th>
                                                <th>Images</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {responses.map((response: any, idx: number) => {
                                                const hasQc = response.qcStatus && response.qcStatus !== 'pending';
                                                const diff = hasQc ? (response.qcScore ?? response.obtainedMarks) - response.obtainedMarks : null;
                                                const statusColors: Record<string, { bg: string; color: string }> = {
                                                    approved: { bg: '#dcfce7', color: '#16a34a' },
                                                    rejected: { bg: '#fee2e2', color: '#dc2626' },
                                                    edited:   { bg: '#fef3c7', color: '#d97706' },
                                                    pending:  { bg: '#f3f4f6', color: '#6b7280' }
                                                };
                                                const sc = statusColors[response.qcStatus || 'pending'];
                                                return (
                                                <tr key={`${response.questionId}-${idx}`}>
                                                    <td style={{ fontWeight: 700 }}>{response.questionText || response.text}</td>
                                                    <td style={{ fontWeight: 800 }}>{response.obtainedMarks}</td>
                                                    <td style={{ fontWeight: 800, color: hasQc ? '#1d4ed8' : 'var(--text-muted)' }}>
                                                        {hasQc ? (response.qcScore ?? response.obtainedMarks) : '—'}
                                                    </td>
                                                    <td style={{ fontWeight: 700, color: diff === null ? 'var(--text-muted)' : diff < 0 ? '#dc2626' : diff > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                                                        {diff === null ? '—' : diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${diff}`}
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '99px', background: sc.bg, color: sc.color }}>
                                                            {response.qcStatus || 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '0.85rem', fontStyle: response.qcRemark ? 'italic' : 'normal', color: 'var(--text-muted)' }}>
                                                        {response.qcRemark || '—'}
                                                    </td>
                                                    <td style={{ fontSize: '0.8rem' }}>{response.qcReviewedByName || '—'}</td>
                                                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                        {response.qcReviewedAt ? new Date(response.qcReviewedAt).toLocaleString() : '—'}
                                                    </td>
                                                    <td>
                                                    {Array.isArray(response.images) && response.images.length > 0 ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                            {response.images.map((img: string, index: number) => {
                                                                const resolved = resolveImageUrl(img);
                                                                if (!resolved) return null;
                                                                return (
                                                                    <a key={index} href={resolved} target="_blank" rel="noreferrer"
                                                                        style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                                                                        <img src={resolved} alt={`Q${idx + 1} img ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
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

                        {(assessment.reviewRemarks || assessment.qcRemarks) && (
                            <div className="card shadow-lg" style={{ padding: '1.5rem', marginTop: '2rem', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>QC Remarks</h3>
                                {assessment.reviewRemarks && (
                                    <p style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                        <strong>Review:</strong> {assessment.reviewRemarks}
                                    </p>
                                )}
                                {assessment.qcRemarks && (
                                    <p style={{ color: 'var(--text-primary)' }}>
                                        <strong>QC:</strong> {assessment.qcRemarks}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* QC Review Summary */}
                        {assessment.qcReviewComplete && (
                            <div className="card shadow-lg" style={{ padding: '1.5rem', marginTop: '2rem', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ShieldCheck size={18} style={{ color: '#16a34a' }} /> QC Review Summary
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Original Score</div>
                                        <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{assessment.totalScore}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>QC Score</div>
                                        <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#1d4ed8' }}>{assessment.qcTotalScore ?? '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Difference</div>
                                        {assessment.qcTotalScore != null ? (
                                            <div style={{ fontWeight: 900, fontSize: '1.2rem', color: assessment.qcTotalScore < assessment.totalScore ? '#dc2626' : assessment.qcTotalScore > assessment.totalScore ? '#16a34a' : 'var(--text-muted)' }}>
                                                {assessment.qcTotalScore - assessment.totalScore > 0 ? '+' : ''}{assessment.qcTotalScore - assessment.totalScore}
                                            </div>
                                        ) : <div style={{ fontWeight: 700 }}>—</div>}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reviewed By</div>
                                        <div style={{ fontWeight: 700 }}>{assessment.qcReviewedBy || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reviewed At</div>
                                        <div style={{ fontWeight: 700 }}>{assessment.qcReviewedAt ? new Date(assessment.qcReviewedAt).toLocaleString() : '—'}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* QC Audit Trail */}
                        {auditLogs.length > 0 && (
                            <div className="card shadow-lg" style={{ padding: '1.5rem', marginTop: '2rem', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>QC Audit Trail</h3>
                                <div className="table-container" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Action</th>
                                                <th>Question</th>
                                                <th>Old Score</th>
                                                <th>New Score</th>
                                                <th>Remark</th>
                                                <th>By</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs.map((log: any) => (
                                                <tr key={log.id}>
                                                    <td>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.15rem 0.5rem', borderRadius: '6px',
                                                            background: log.action === 'approve_question' ? '#dcfce7' : log.action === 'reject_question' ? '#fee2e2' : log.action === 'edit_score' ? '#fef3c7' : '#f3f4f6',
                                                            color: log.action === 'approve_question' ? '#16a34a' : log.action === 'reject_question' ? '#dc2626' : log.action === 'edit_score' ? '#d97706' : '#6b7280'
                                                        }}>
                                                            {log.action.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {log.questionText || '—'}
                                                    </td>
                                                    <td style={{ fontWeight: 700 }}>{log.oldScore ?? '—'}</td>
                                                    <td style={{ fontWeight: 700 }}>{log.newScore ?? '—'}</td>
                                                    <td style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{log.remark || '—'}</td>
                                                    <td style={{ fontSize: '0.85rem' }}>{log.actionByName}</td>
                                                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )
            )}
        </div>
    );
};

export default AssessmentDetails;
