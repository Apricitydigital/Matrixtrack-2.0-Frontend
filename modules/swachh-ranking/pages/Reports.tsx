import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
    Search,
    Filter,
    RefreshCw,
    Calendar,
    FileText,
    Eye,
    User,
    Building,
    CheckCircle2,
    X,
    TrendingUp,
    MapPin,
    Clock,
    Send,
    AlertOctagon,
    Award,
    ThumbsUp,
    ThumbsDown,
    Edit3,
    Save,
    BarChart2
} from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';

const reportEffectiveScore = (r: any) => r.finalScore ?? r.totalScore;

interface AssessmentReport {
    id: string;
    totalScore: number;
    maxScore: number;
    finalScore?: number | null;
    finalScoreSource?: string | null;
    responses: any[];
    status: string;
    reviewRemarks?: string;
    approvedBy?: string;
    createdAt: string;
    updatedAt: string;
    qcTotalScore?: number;
    qcReviewedBy?: string;
    qcReviewedAt?: string;
    qcReviewComplete?: boolean;
    participant: {
        id: string;
        category: string;
        details: any;
    };
    assessor: {
        name: string;
        role: string;
    };
    questionnaire?: {
        questions: { id: string; marks: number; text: string }[];
    };
}

interface QcQuestionReview {
    qcStatus: 'pending' | 'approved' | 'rejected' | 'edited';
    qcScore: number;
    qcRemark: string;
}

const Reports = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewReports = hasPermission(currentUser?.permissions, 'reports', 'view');

    if (!currentUser || !canViewReports) {
        return <NoAccess title="Reports" message="You do not have permission to view reports." />;
    }
    const [reports, setReports] = useState<AssessmentReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedReport, setSelectedReport] = useState<AssessmentReport | null>(null);
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [rejectedQuestions, setRejectedQuestions] = useState<any[]>([]);
    const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);
    const [qcReviews, setQcReviews] = useState<Record<string, QcQuestionReview>>({});
    const [qcSaving, setQcSaving] = useState(false);
    // ⭐ PAGINATION
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const resolveImageUrl = (src?: string) => {
        if (!src) return '';
        const trimmed = src.trim();
        if (/^(https?:|data:|blob:)/i.test(trimmed)) {
            return trimmed;
        }

        // Ensure remote images load correctly from the VITE_MEDIA_BASE_URL config (or standard fallback)
        const mediaBase =
            process.env.NEXT_PUBLIC_SWACHH_MEDIA_URL?.replace(/\/+$/, "");

        const envBase =
            process.env.NEXT_PUBLIC_SWACHH_API_URL?.replace(/\/+$/, "");

        const devFallback =
            process.env.NODE_ENV !== "production"
                ? "http://localhost:5000"
                : "";
        let base = '';
        if (mediaBase && mediaBase.length > 0) {
            base = mediaBase;
        } else if (envBase && envBase.length > 0) {
            base = envBase;
        } else {
            base = devFallback || (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');
        }

        const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        return `${base}${normalizedPath}`;
    };

    useEffect(() => {
        if (!selectedReport) { setQcReviews({}); return; }
        const init: Record<string, QcQuestionReview> = {};
        selectedReport.responses.forEach((r: any) => {
            if (r.questionId) {
                init[r.questionId] = {
                    qcStatus: r.qcStatus || 'pending',
                    qcScore: typeof r.qcScore === 'number' ? r.qcScore : (r.obtainedMarks ?? 0),
                    qcRemark: r.qcRemark || ''
                };
            }
        });
        setQcReviews(init);
    }, [selectedReport?.id]);

    const updateQcReview = (questionId: string, updates: Partial<QcQuestionReview>) => {
        setQcReviews(prev => ({ ...prev, [questionId]: { ...prev[questionId], ...updates } }));
    };

    const handleQcAction = (questionId: string, qcStatus: QcQuestionReview['qcStatus'], qcScore: number) => {
        setQcReviews(prev => ({
            ...prev,
            [questionId]: { ...prev[questionId], qcStatus, qcScore, qcRemark: prev[questionId]?.qcRemark || '' }
        }));
    };

    const qcStatusColor = (s?: string) => {
        if (s === 'approved') return { bg: '#dcfce7', color: '#16a34a', border: '#16a34a' };
        if (s === 'rejected') return { bg: '#fee2e2', color: '#dc2626', border: '#dc2626' };
        if (s === 'edited') return { bg: '#fef3c7', color: '#d97706', border: '#d97706' };
        return { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };
    };

    const computeQcTotal = () => {
        if (!selectedReport) return 0;
        return selectedReport.responses.reduce((sum: number, r: any) => {
            const rev = qcReviews[r.questionId];
            if (!rev || rev.qcStatus === 'pending') return sum + (typeof r.qcScore === 'number' ? r.qcScore : (r.obtainedMarks ?? 0));
            return sum + (rev.qcScore ?? 0);
        }, 0);
    };

    const allQuestionsReviewed = () =>
        !!selectedReport && selectedReport.responses.every((r: any) => {
            const rev = qcReviews[r.questionId];
            return rev && rev.qcStatus !== 'pending';
        });

    const hasMissingRemarks = () =>
        selectedReport?.responses.some((r: any) => {
            const rev = qcReviews[r.questionId];
            return rev && (rev.qcStatus === 'rejected' || rev.qcStatus === 'edited') && !rev.qcRemark?.trim();
        }) ?? false;

    const handleSaveQcReview = async (finalize: boolean) => {
        if (finalize && !allQuestionsReviewed()) {
            alert('Please review all questions before finalizing.');
            return;
        }
        if (hasMissingRemarks()) {
            alert('Remarks are mandatory for Rejected and Rescored questions.');
            return;
        }
        setQcSaving(true);
        try {
            const token = localStorage.getItem('token');
            const questionReviews = Object.entries(qcReviews)
                .filter(([, d]) => d.qcStatus !== 'pending')
                .map(([questionId, d]) => ({ questionId, ...d }));
            await api.patch(`/assessments/${selectedReport!.id}/qc-question-review`, {
                questionReviews, finalize,
                qcUserId: user.id,
                qcUserName: user.name
            }, { headers: { Authorization: `Bearer ${token}` } });
            if (finalize) {
                alert('QC Review finalized! Assessment sent to Administrator.');
                setSelectedReport(null);
                fetchReports();
            } else {
                alert('Progress saved.');
                fetchReports();
            }
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setQcSaving(false);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/assessments/all-completed', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(response.data);
        } catch (err) {
            console.error('Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (assessmentId: string, status: string) => {
        setUpdatingStatus(true);
        try {
            const token = localStorage.getItem('token');
            const payload: Record<string, any> = {
                status,
                reviewRemarks
            };

            if (status === 'published') {
                payload.approvedBy = user?.name || 'Administrator';
            } else if (status !== 'published') {
                payload.approvedBy = null;
            }

            // await api.patch(`/assessments/${assessmentId}/status`, payload, {
            //     headers: { Authorization: `Bearer ${token}` }
            // });
            await api.patch(`/assessments/${assessmentId}/status`, {
                status,
                reviewRemarks,
                rejectedQuestions
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            let message = "Assessment updated!";
            if (status === 'under_review') message = "Assessment sent to Administrator for final review.";
            if (status === 'published') message = "Assessment has been officially published to the portal!";
            if (status === 'reassessment') message = "Assessment rejected. Assessor will be notified to re-evaluate.";

            alert(message);
            setSelectedReport(null);
            setReviewRemarks('');
            fetchReports();
        } catch (err: any) {
            alert('Failed to update status: ' + (err.response?.data?.message || err.message));
        } finally {
            setUpdatingStatus(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    useEffect(() => {
        if (!previewImage) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPreviewImage(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewImage]);

    const getParticipantName = (p: any) => {
        if (!p) return 'Unknown Entity';
        return p.details?.name || p.details?.schoolName || p.details?.hospitalName || p.details?.officeName || p.details?.marketName || 'Unnamed Participant';
    };

    const filteredReports = reports.filter(r => {
        const participantName = getParticipantName(r.participant).toLowerCase();
        const assessorName = (r.assessor?.name || '').toLowerCase();
        const search = searchTerm.toLowerCase();

        const matchesSearch = participantName.includes(search) || assessorName.includes(search);
        const matchesCategory = categoryFilter ? r.participant?.category === categoryFilter : true;
        return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const indexOfLast = currentPage * rowsPerPage;
    const indexOfFirst = indexOfLast - rowsPerPage;

    const currentReports = filteredReports.slice(indexOfFirst, indexOfLast);

    const totalPages = Math.ceil(filteredReports.length / rowsPerPage);

    const startRecord = filteredReports.length === 0 ? 0 : indexOfFirst + 1;
    const endRecord = Math.min(indexOfLast, filteredReports.length);
    const openImageInNewTab = (base64: string) => {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        const blobUrl = URL.createObjectURL(blob);

        window.open(blobUrl, '_blank');
    };
    return (
        <div className="reports-view">
            {/* <header style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
                            Assessment Intelligence
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 500 }}>
                            Comprehensive audit of all completed rankings and field activities.
                        </p>
                    </div>
                    <div className="card shadow-premium" style={{ padding: '1rem 1.5rem', border: 'none', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--primary-soft)' }}>
                        <div style={{ color: 'var(--primary)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Total Audits</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{reports.length}</div>
                        </div>
                    </div>
                </div>
            </header> */}
            <header style={{ marginBottom: '3rem' }}>
                <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
                            Assessment Intelligence
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 500 }}>
                            Comprehensive audit of all completed rankings and field activities.
                        </p>
                    </div>
                    <div className="card shadow-premium" style={{ padding: '1rem 1.5rem', border: 'none', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--primary-soft)', flexShrink: 0 }}>
                        <div style={{ color: 'var(--primary)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase' }}>Total Audits</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{reports.length}</div>
                        </div>
                    </div>
                </div>
            </header>
            <div className="card shadow-lg" style={{ marginBottom: '2.5rem', padding: '1.5rem', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '320px', position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Search by participant or assessor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '3.5rem', height: '52px', fontWeight: 500 }}
                        />
                    </div>

                    <div style={{ width: '220px', position: 'relative' }}>
                        <Filter style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            aria-label="Filter by category"
                            style={{ paddingLeft: '3.5rem', height: '52px', fontWeight: 600 }}
                        >
                            <option value="">All Categories</option>
                            <option value="wards">Wards</option>
                            <option value="schools">Schools</option>
                            <option value="hospitals">Hospitals</option>
                            <option value="offices">Offices</option>
                            <option value="markets">Markets</option>
                            <option value="societies - bwg">Societies - BWG</option>
                            <option value="hotels">Hotels</option>
                        </select>
                    </div>

                    <button
                        onClick={fetchReports}
                        className="btn btn-outline"
                        aria-label="Refresh reports"
                        style={{ width: '52px', height: '52px', padding: 0 }}
                        disabled={loading}
                    >
                        <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="card shadow-premium" style={{ border: 'none', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                        <RefreshCw size={40} style={{ margin: '0 auto 1.5rem', display: 'block', color: 'var(--primary)' }} className="animate-spin" />
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Analyzing reports...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                        <FileText size={48} style={{ margin: '0 auto 1.5rem', display: 'block', color: 'var(--text-secondary)' }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 600 }}>No reports found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Participant Entity</th>
                                    <th>Assigned Area</th>
                                    <th>Assessed By</th>
                                    <th>Status</th>
                                    <th>Performance Score</th>
                                    <th>Completed On</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentReports.map((report) => (<tr key={report.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                backgroundColor: 'var(--primary-soft)',
                                                color: 'var(--primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 800
                                            }}>
                                                <Building size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{getParticipantName(report.participant)}</div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{report.participant?.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>
                                            <MapPin size={16} style={{ color: 'var(--swachh-green)' }} />
                                            {report.participant?.details?.zone ? `Z: ${report.participant.details.zone}` : 'N/A'} {report.participant?.details?.ward ? `| W: ${report.participant.details.ward}` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{report.assessor.name}</div>
                                    </td>
                                    <td>
                                        <span className={`badge ${report.status === 'published' ? 'badge-approved' :
                                            report.status === 'rejected' ? 'badge-rejected' :
                                                'badge-pending'
                                            }`} style={{
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                fontSize: '0.65rem',
                                                backgroundColor: report.status === 'published' ? 'var(--swachh-green-soft)' :
                                                    report.status === 'rejected' ? 'var(--error-soft)' :
                                                        'var(--primary-soft)',
                                                color: report.status === 'published' ? 'var(--swachh-green)' :
                                                    report.status === 'rejected' ? '#be123c' :
                                                        '#3730a3'
                                            }}>
                                            {report.status.replace('_', ' ')}
                                        </span>
                                        {report.status === 'published' && report.approvedBy && (
                                            <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                Approved by {report.approvedBy}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                fontSize: '1rem',
                                                fontWeight: 900,
                                                color: reportEffectiveScore(report) > (report.maxScore / 2) ? '#047857' : '#92400e'
                                            }}>
                                                {Math.min(reportEffectiveScore(report), report.maxScore)} <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>/ {report.maxScore}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
                                            <Calendar size={16} />
                                            {new Date(report.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => {
                                                setSelectedReport(report);
                                                setReviewRemarks(report.reviewRemarks || '');
                                            }}
                                            className="btn btn-primary"
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', gap: '0.5rem' }}
                                        >
                                            <Eye size={16} />
                                            Audit Report
                                        </button>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "14px 18px",
                                background: "#f8fafc",
                                borderTop: "1px solid #e5e7eb"
                            }}
                        >
                            {/* LEFT */}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", whiteSpace: "nowrap" }}>

                                <span style={{ fontWeight: 600 }}>Rows per page</span>

                                <select
                                    value={rowsPerPage}
                                    aria-label="Rows per page"
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: "8px",
                                        border: "1px solid #d1d5db",
                                        background: "white",
                                        fontWeight: 600
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>

                                <span style={{ color: "#6b7280", fontWeight: 600 }}>
                                    {startRecord}-{endRecord} of {filteredReports.length}
                                </span>

                            </div>

                            {/* RIGHT */}
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>

                                <span style={{ fontWeight: 600 }}>
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                    disabled={currentPage === 1}
                                    className="btn btn-outline"
                                >
                                    ‹
                                </button>

                                <button
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                    disabled={currentPage === totalPages}
                                    className="btn btn-outline"
                                >
                                    ›
                                </button>

                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================================
    RESPONSIVE ASSESSMENT MODAL + IMAGE PREVIEW
    Replace your existing selectedReport modal and previewImage
    modal blocks with this entire snippet.
    ============================================================ */}

            {selectedReport && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0,
                        width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000,
                        padding: 'clamp(0.75rem, 3vw, 2rem)'
                    }}
                    onClick={() => setSelectedReport(null)}
                >
                    <div
                        className="card shadow-premium"
                        style={{
                            width: '100%', maxWidth: '850px',
                            maxHeight: '90vh',
                            padding: 0, overflow: 'hidden', border: 'none',
                            display: 'flex', flexDirection: 'column',
                            borderRadius: 'clamp(16px, 3vw, 24px)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ── Modal Header ── */}
                        <div style={{
                            padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 4vw, 2rem)',
                            backgroundColor: 'white',
                            borderBottom: '1px solid var(--border-light)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            gap: '1rem', flexShrink: 0
                        }}>
                            <div style={{ minWidth: 0 }}>
                                <h2 style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 900, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Assessment Analysis
                                </h2>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Ref ID: {selectedReport.id.split('-')[0].toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                aria-label="Close report details"
                                style={{ flexShrink: 0, background: 'var(--primary-soft)', border: 'none', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer', color: '#3730a3' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* ── Modal Body ── */}
                        <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', overflowY: 'auto', flex: 1, backgroundColor: '#fcfdfe' }}>

                            {/* Summary Cards: 3-col → 1-col */}
                            <div className="modal-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>

                                <div className="card" style={{ padding: '1.1rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', color: '#3730a3' }}>
                                        <Building size={16} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Participant</span>
                                    </div>
                                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {getParticipantName(selectedReport.participant)}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        {selectedReport.participant?.category}
                                    </div>
                                </div>

                                <div className="card" style={{ padding: '1.1rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', color: 'var(--swachh-green)' }}>
                                        <CheckCircle2 size={16} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                            {selectedReport.qcReviewComplete ? 'QC Score' : 'Self Score'}
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.4rem', lineHeight: 1.1 }}>
                                        {selectedReport.qcReviewComplete
                                            ? (selectedReport.qcTotalScore !== undefined && selectedReport.qcTotalScore !== null
                                                ? Math.min(selectedReport.qcTotalScore, selectedReport.maxScore)
                                                : '—')
                                            : Math.min(selectedReport.totalScore, selectedReport.maxScore)}
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}> / {selectedReport.maxScore}</span>
                                    </div>
                                </div>

                                <div className="card" style={{ padding: '1.1rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', color: 'var(--text-secondary)' }}>
                                        <Clock size={16} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Timestamp</span>
                                    </div>
                                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                        {new Date(selectedReport.createdAt).toLocaleDateString()}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        {new Date(selectedReport.createdAt).toLocaleTimeString()}
                                    </div>
                                </div>

                            </div>

                            {/* Approval Banner */}
                            {selectedReport.status === 'published' && selectedReport.approvedBy && (
                                <div style={{ marginBottom: '2rem', padding: '0.875rem 1.1rem', borderRadius: '12px', backgroundColor: 'var(--swachh-green-soft)', border: '1px solid var(--swachh-green)' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--swachh-green)', marginBottom: '0.25rem' }}>
                                        Approval
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--swachh-green)', fontSize: '0.9rem' }}>
                                        Approved by {selectedReport.approvedBy} on {new Date(selectedReport.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            )}

                            {/* Detailed Responses */}
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <FileText size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                Detailed Responses
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {selectedReport.responses.map((resp, idx) => {
                                    const rev = qcReviews[resp.questionId];
                                    const sc = qcStatusColor(rev?.qcStatus);
                                    const maxMarks = selectedReport.questionnaire?.questions.find(q => q.id === resp.questionId)?.marks ?? resp.obtainedMarks ?? 0;
                                    return (
                                        <div key={idx} style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', borderRadius: '16px', border: `2px solid ${sc.border}`, backgroundColor: 'white', transition: 'border-color 0.2s' }}>

                                            {/* Question header: text left, marks right — stacks on very small screens */}
                                            <div className="question-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                                                        Question {idx + 1}
                                                    </div>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                                        {resp.questionText || 'Assessment Parameter'}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                                                        Marks
                                                    </div>
                                                    <div style={{ fontWeight: 900, color: resp.obtainedMarks > 0 ? 'var(--success)' : 'var(--text-secondary)', fontSize: '1.1rem' }}>
                                                        {resp.obtainedMarks}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Response Value */}
                                            {resp.text && (
                                                <div style={{ marginTop: '0.875rem', padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Response Value</div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{resp.text}</div>
                                                </div>
                                            )}

                                            {/* Assessor Remarks */}
                                            {resp.remarks && (
                                                <div style={{ marginTop: '0.875rem', padding: '0.875rem', backgroundColor: 'var(--warning-soft)', borderRadius: '12px', border: '1px dashed var(--warning)' }}>
                                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Assessor Remarks</div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', fontStyle: 'italic' }}>"{resp.remarks}"</div>
                                                </div>
                                            )}

                                            {/* Submitted Images */}
                                            {resp.images?.length > 0 && (
                                                <div style={{ marginTop: '1.1rem' }}>
                                                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                                        Submitted Images
                                                    </div>
                                                    <div className="assessment-image-grid">
                                                        {resp.images.map((imageUrl: string, imageIdx: number) => {
                                                            const resolvedImageUrl = resolveImageUrl(imageUrl);
                                                            if (!resolvedImageUrl) return null;
                                                            return (
                                                                <button
                                                                    key={`${idx}-image-${imageIdx}`}
                                                                    type="button"
                                                                    className="assessment-image-thumb"
                                                                    aria-label={`Open image ${imageIdx + 1} for question ${idx + 1}`}
                                                                    onClick={() => setPreviewImage({ url: resolvedImageUrl, alt: `Question ${idx + 1} submission ${imageIdx + 1}` })}
                                                                >
                                                                    <img
                                                                        src={resolvedImageUrl}
                                                                        alt={`Question ${idx + 1} submission ${imageIdx + 1}`}
                                                                        loading="lazy"
                                                                    />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* QC Review Controls */}
                                            <div style={{ marginTop: '0.875rem', borderTop: '1px solid #eee', paddingTop: '0.875rem' }}>
                                                {/* Header row: label + status badge */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                        QC Review
                                                    </span>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.2rem 0.7rem', borderRadius: '99px', background: sc.bg, color: sc.color }}>
                                                        {rev?.qcStatus || 'Pending'}
                                                    </span>
                                                </div>

                                                {/* Score row */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        Submitted: <strong>{resp.obtainedMarks}</strong> / {maxMarks}
                                                    </span>
                                                    {(user.role === 'qc' || user.role === 'admin') && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>QC Score:</span>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={maxMarks}
                                                                value={rev?.qcScore ?? resp.obtainedMarks ?? 0}
                                                                onChange={(e) => updateQcReview(resp.questionId, { qcScore: Math.min(maxMarks, Math.max(0, Number(e.target.value))), qcStatus: 'edited' })}
                                                                disabled={user.role !== 'qc' || rev?.qcStatus === 'approved' || rev?.qcStatus === 'rejected'}
                                                                style={{ width: '64px', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', fontWeight: 700, textAlign: 'center' }}
                                                            />
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {maxMarks}</span>
                                                            {typeof rev?.qcScore === 'number' && rev.qcScore !== resp.obtainedMarks && (
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: rev.qcScore < resp.obtainedMarks ? '#dc2626' : '#16a34a' }}>
                                                                    ({rev.qcScore > resp.obtainedMarks ? '+' : ''}{rev.qcScore - resp.obtainedMarks})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action buttons — QC role only */}
                                                {user.role === 'qc' && (
                                                    <>
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQcAction(resp.questionId, 'approved', resp.obtainedMarks ?? 0)}
                                                                className="btn btn-outline"
                                                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', ...(rev?.qcStatus === 'approved' ? { background: '#dcfce7', color: '#16a34a', borderColor: '#16a34a' } : {}) }}
                                                            >
                                                                <ThumbsUp size={13} /> Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQcAction(resp.questionId, 'rejected', 0)}
                                                                className="btn btn-outline"
                                                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', ...(rev?.qcStatus === 'rejected' ? { background: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' } : {}) }}
                                                            >
                                                                <ThumbsDown size={13} /> Reject
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQcAction(resp.questionId, 'edited', rev?.qcScore ?? resp.obtainedMarks ?? 0)}
                                                                className="btn btn-outline"
                                                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', ...(rev?.qcStatus === 'edited' ? { background: '#fef3c7', color: '#d97706', borderColor: '#d97706' } : {}) }}
                                                            >
                                                                <Edit3 size={13} /> Rescore
                                                            </button>
                                                        </div>

                                                        {(rev?.qcStatus === 'rejected' || rev?.qcStatus === 'edited') && (
                                                            <div>
                                                                <textarea
                                                                    placeholder={rev.qcStatus === 'rejected' ? 'Rejection reason (mandatory)' : 'Edit reason (mandatory)'}
                                                                    value={rev.qcRemark || ''}
                                                                    onChange={(e) => updateQcReview(resp.questionId, { qcRemark: e.target.value })}
                                                                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: `1px solid ${!rev.qcRemark?.trim() ? '#f87171' : '#d1d5db'}`, fontSize: '0.875rem', resize: 'vertical', minHeight: '60px', boxSizing: 'border-box' }}
                                                                />
                                                                {!rev.qcRemark?.trim() && (
                                                                    <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.2rem', fontWeight: 600 }}>Remarks are mandatory</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Admin read-only QC results */}
                                                {user.role === 'admin' && rev?.qcStatus && rev.qcStatus !== 'pending' && (
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {rev.qcRemark && <span>Remark: <em>{rev.qcRemark}</em></span>}
                                                        {resp.qcReviewedByName && <span style={{ marginLeft: '0.75rem' }}>By: {resp.qcReviewedByName}</span>}
                                                        {resp.qcReviewedAt && <span style={{ marginLeft: '0.75rem' }}>{new Date(resp.qcReviewedAt).toLocaleString()}</span>}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Modal Footer ── */}
                        <div style={{
                            padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 4vw, 2rem)',
                            backgroundColor: 'white',
                            borderTop: '1px solid var(--border-light)',
                            display: 'flex', flexDirection: 'column', gap: '1rem',
                            flexShrink: 0
                        }}>
                            {/* QC Score Summary */}
                            {(user.role === 'qc' || (user.role === 'admin' && selectedReport.qcReviewComplete)) && (
                                <div style={{ display: 'flex', gap: '1rem', padding: '0.875rem 1.1rem', background: '#f8fafc', borderRadius: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <BarChart2 size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>QC Total Score</div>
                                        <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>
                                            {computeQcTotal()}
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}> / {selectedReport.maxScore}</span>
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: '1rem' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>QC %</div>
                                        <div style={{ fontWeight: 800 }}>{selectedReport.maxScore > 0 ? Math.round((computeQcTotal() / selectedReport.maxScore) * 100) : 0}%</div>
                                    </div>
                                    <div style={{ marginLeft: '1rem' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reviewed</div>
                                        <div style={{ fontWeight: 800 }}>
                                            {selectedReport.responses.filter((r: any) => qcReviews[r.questionId]?.qcStatus && qcReviews[r.questionId]?.qcStatus !== 'pending').length} / {selectedReport.responses.length}
                                        </div>
                                    </div>
                                    {!allQuestionsReviewed() && user.role === 'qc' && (
                                        <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#d97706', fontWeight: 700 }}>
                                            ⚠ Review all questions to finalize
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>
                                    Overall Review Remarks
                                </label>
                                <textarea
                                    placeholder="Add overall notes for the assessor or internal review..."
                                    value={reviewRemarks}
                                    onChange={(e) => setReviewRemarks(e.target.value)}
                                    style={{ minHeight: '64px', borderRadius: '12px', padding: '0.875rem', width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                />
                            </div>

                            {/* Action buttons */}
                            <div className="modal-footer-actions" style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <button onClick={() => setSelectedReport(null)} className="btn btn-outline" style={{ padding: '0.75rem 1.25rem' }}>
                                    Cancel
                                </button>

                                <button
                                    onClick={() => handleUpdateStatus(selectedReport.id, 'reassessment')}
                                    disabled={updatingStatus}
                                    className="btn btn-outline"
                                    style={{ padding: '0.75rem 1.25rem', borderColor: 'var(--error)', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <AlertOctagon size={16} /> Reject & Re-eval
                                </button>

                                {user.role === 'qc' && (
                                    <>
                                        <button
                                            onClick={() => handleSaveQcReview(false)}
                                            disabled={qcSaving}
                                            className="btn btn-outline"
                                            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            <Save size={16} /> Save Progress
                                        </button>
                                        <button
                                            onClick={() => handleSaveQcReview(true)}
                                            disabled={qcSaving || !allQuestionsReviewed() || hasMissingRemarks()}
                                            className="btn btn-primary"
                                            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--swachh-green)', borderColor: 'var(--swachh-green)', opacity: (!allQuestionsReviewed() || hasMissingRemarks()) ? 0.5 : 1 }}
                                        >
                                            <Send size={16} /> Finalize & Send to Admin
                                        </button>
                                    </>
                                )}

                                {user.role === 'admin' && (
                                    <button
                                        onClick={() => handleUpdateStatus(selectedReport.id, 'published')}
                                        disabled={updatingStatus}
                                        className="btn btn-primary"
                                        style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Award size={16} /> Approve & Publish
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ── Image Preview Lightbox ── */}
            {previewImage && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 3000,
                        padding: '1rem'
                    }}
                    onClick={() => setPreviewImage(null)}
                    role="presentation"
                >
                    <div
                        style={{
                            position: 'relative',
                            maxWidth: '90vw', maxHeight: '90vh',
                            backgroundColor: '#000',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 25px 70px rgba(0,0,0,0.4)',
                            display: 'flex', flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={previewImage.url}
                            alt={previewImage.alt}
                            style={{ display: 'block', maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain', flex: 1 }}
                        />
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem',
                            background: 'rgba(0,0,0,0.75)', color: 'white',
                            flexWrap: 'wrap', gap: '0.5rem',
                            flexShrink: 0
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {previewImage.alt}
                            </span>
                            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                                <a
                                    href={previewImage.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'white', fontWeight: 600, textDecoration: 'underline', fontSize: '0.875rem' }}
                                >
                                    Open Original
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setPreviewImage(null)}
                                    style={{ background: 'var(--primary)', border: 'none', borderRadius: '999px', padding: '0.35rem 1rem', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
