import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '../react-router-shim';
import api from '../api/axios';
import {
    ArrowLeft,
    Loader2,
    User,
    MapPin,
    Calendar,
    Star,
    Camera,
    CheckCircle2,
    XCircle,
    Info,
    ZoomIn,
    ZoomOut,
    Maximize2,
    X,
    FileText
} from 'lucide-react';
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

const AssessmentReview = () => {
    const { assessmentId } = useParams() as { assessmentId?: string };
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Lightbox state
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewReports = hasPermission(currentUser?.permissions, 'reports', 'view');

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
            } catch (err: any) {
                console.error('Failed to load assessment', err);
                setError(err.response?.data?.message || 'Unable to load assessment draft details');
            } finally {
                setLoading(false);
            }
        };

        fetchAssessment();
    }, [assessmentId]);

    // Handle Lightbox Zoom / Pan
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPanOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (!currentUser || !canViewReports) {
        return <NoAccess title="Assessment Review" message="You do not have permission to view assessment reports." />;
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

    const responses = Array.isArray(assessment?.responses) ? assessment.responses : [];
    const maxScore = assessment?.questionnaire?.questions?.reduce((sum: number, q: any) => sum + (q.marks || 0), 0) || 7800;

    return (
        <div className="assessment-review-view" style={{ paddingBottom: '4rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
                >
                    <ArrowLeft size={18} /> Back
                </button>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
                            Draft Assessment Review
                        </h1>
                        <span style={{
                            padding: '0.3rem 0.75rem',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '100px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            In Progress
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0' }}>
                        Read-only inspection of assessor field drafts
                    </p>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-secondary)' }}>
                    <Loader2 className="animate-spin" size={36} style={{ margin: '0 auto 1rem', color: 'var(--swachh-green)' }} />
                    <p style={{ fontWeight: 600 }}>Loading draft responses...</p>
                </div>
            ) : error ? (
                <div style={{ padding: '1.25rem', borderRadius: '16px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 600 }}>
                    {error}
                </div>
            ) : assessment && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
                    
                    {/* Left Column: Questionnaire responses */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '16px',
                            border: '1px solid var(--border-light)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                This assessment is currently in-progress. The values below represent the saved answers exactly as inputted by the assessor up to their last sync.
                            </p>
                        </div>

                        {responses.length === 0 ? (
                            <div className="card shadow-premium" style={{ padding: '4rem 2rem', textAlign: 'center', border: 'none' }}>
                                <FileText size={48} style={{ color: '#cbd5e1', marginBottom: '1rem', display: 'block', margin: '0 auto' }} />
                                <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Responses Saved</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto' }}>
                                    The assessor has not saved any draft responses for this segment yet.
                                </p>
                            </div>
                        ) : (
                            responses.map((resp: any, idx: number) => {
                                const questionnaireQuestion = assessment?.questionnaire?.questions?.find((q: any) => q.id === resp.questionId);
                                const qMarks = questionnaireQuestion?.marks || 0;
                                return (
                                    <div key={`${resp.questionId}-${idx}`} className="card shadow-premium" style={{ border: 'none', padding: '2rem', borderRadius: '24px' }}>
                                        {/* Question Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{
                                                    width: '34px',
                                                    height: '34px',
                                                    backgroundColor: 'var(--primary-soft)',
                                                    color: 'var(--primary)',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 900,
                                                    fontSize: '0.9rem',
                                                    flexShrink: 0
                                                }}>
                                                    {idx + 1}
                                                </div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.45, margin: 0 }}>
                                                    {resp.questionText || resp.text}
                                                </h3>
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                backgroundColor: 'var(--primary-soft)',
                                                padding: '0.4rem 0.75rem',
                                                borderRadius: '8px',
                                                height: 'fit-content',
                                                flexShrink: 0
                                            }}>
                                                <Star size={14} color="var(--primary)" />
                                                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>
                                                    {resp.obtainedMarks} / {qMarks} PTS
                                                </span>
                                            </div>
                                        </div>

                                        {/* Answers Selection Indicator */}
                                        {resp.yesNo ? (
                                            <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                                                {(['yes', 'no'] as const).map((val) => {
                                                    const isSelected = resp.yesNo === val;
                                                    const isYes = val === 'yes';
                                                    return (
                                                        <div
                                                            key={val}
                                                            style={{
                                                                flex: 1,
                                                                padding: '0.65rem',
                                                                borderRadius: '10px',
                                                                border: `2px solid ${isSelected ? (isYes ? 'var(--swachh-green)' : '#ef4444') : 'var(--border-light)'}`,
                                                                backgroundColor: isSelected ? (isYes ? 'var(--swachh-green)' : '#ef4444') : 'white',
                                                                color: isSelected ? 'white' : 'var(--text-muted)',
                                                                fontWeight: 800,
                                                                fontSize: '0.9rem',
                                                                textAlign: 'center',
                                                                opacity: isSelected ? 1 : 0.45,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '0.4rem'
                                                            }}
                                                        >
                                                            {isYes ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                            {isYes ? 'Yes Selected' : 'No Selected'}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : null}

                                        {/* Assessor Remarks */}
                                        {resp.remarks ? (
                                            <div style={{
                                                padding: '1.25rem',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-light)',
                                                marginBottom: '1rem'
                                            }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                                                    Assessor Remarks
                                                </div>
                                                <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                                                    {resp.remarks}
                                                </p>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                                No observations or remarks noted.
                                            </div>
                                        )}

                                        {/* Uploaded Evidence Gallery */}
                                        {Array.isArray(resp.images) && resp.images.length > 0 ? (
                                            <div style={{ marginTop: '1.25rem' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Camera size={12} /> Photo Evidence ({resp.images.length})
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                                                    gap: '0.75rem',
                                                    marginTop: '0.5rem'
                                                }}>
                                                    {resp.images.map((img: string, i: number) => {
                                                        const resolved = resolveImageUrl(img);
                                                        if (!resolved) return null;
                                                        return (
                                                            <div
                                                                key={i}
                                                                onClick={() => {
                                                                    setLightboxImage(resolved);
                                                                    setZoomLevel(1);
                                                                    setPanOffset({ x: 0, y: 0 });
                                                                }}
                                                                style={{
                                                                    position: 'relative',
                                                                    aspectRatio: '1',
                                                                    borderRadius: '12px',
                                                                    overflow: 'hidden',
                                                                    border: '1px solid var(--border-light)',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease-in-out'
                                                                }}
                                                                className="hover-scale"
                                                            >
                                                                <img
                                                                    src={resolved}
                                                                    alt={`evidence-${i}`}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                />
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    inset: 0,
                                                                    background: 'rgba(0,0,0,0.25)',
                                                                    opacity: 0,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'white',
                                                                    transition: 'opacity 0.2s'
                                                                }}
                                                                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                                                                >
                                                                    <Maximize2 size={18} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Right Column: Profile details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '24px' }}>
                        <div className="card shadow-premium" style={{ border: 'none', padding: '2rem', borderRadius: '24px' }}>
                            <h3 style={{ fontWeight: 900, marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                                Audit Target Profile
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '42px', height: '42px', backgroundColor: 'var(--swachh-green-light)', color: 'var(--swachh-green)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <User size={20} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Auditor</div>
                                        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {assessment.assessor?.name || 'Assigned Assessor'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {assessment.assessor?.email}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '42px', height: '42px', backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <MapPin size={20} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Zone / Ward</div>
                                        <div style={{ fontWeight: 700 }}>
                                            {[assessment.assessor?.zone, assessment.assessor?.ward].filter(Boolean).join(' / ') || '—'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '42px', height: '42px', backgroundColor: '#faf5ff', color: '#a855f7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Star size={20} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classification</div>
                                        <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                            {assessment.participant?.category || '—'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '42px', height: '42px', backgroundColor: '#fffbeb', color: '#d97706', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Calendar size={20} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Sync Time</div>
                                        <div style={{ fontWeight: 700 }}>
                                            {new Date(assessment.updatedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-premium" style={{ border: 'none', padding: '2rem', borderRadius: '24px', backgroundColor: 'var(--primary-dark)', color: 'white' }}>
                            <h3 style={{ fontWeight: 800, marginBottom: '1rem', margin: 0, fontSize: '1rem', opacity: 0.9 }}>
                                Current Draft Score
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 950 }}>{assessment.totalScore}</div>
                                <div style={{ fontSize: '1.25rem', opacity: 0.6, fontWeight: 700 }}>/ {maxScore} PTS</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>
                                Score updates automatically as progress is saved by the field team.
                            </div>
                        </div>

                        <div className="card shadow-premium" style={{ border: 'none', padding: '1.5rem', borderRadius: '20px' }}>
                            <h4 style={{ fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>Read-Only Mode</h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                You are viewing an in-progress draft assessment. No modifications can be made until the assessor submits the final report.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox / Zoom Dialog Modal */}
            {lightboxImage && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 99999,
                    userSelect: 'none'
                }}>
                    {/* Lightbox Header Controls */}
                    <div style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        display: 'flex',
                        gap: '1rem',
                        zIndex: 10
                    }}>
                        <button
                            onClick={handleZoomIn}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', width: '44px', height: '44px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Zoom In"
                        >
                            <ZoomIn size={22} />
                        </button>
                        <button
                            onClick={handleZoomOut}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', width: '44px', height: '44px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Zoom Out"
                        >
                            <ZoomOut size={22} />
                        </button>
                        <button
                            onClick={handleResetZoom}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '0 0.75rem', height: '44px', cursor: 'pointer', color: 'white', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            100%
                        </button>
                        <button
                            onClick={() => setLightboxImage(null)}
                            style={{ background: '#ef4444', border: 'none', borderRadius: '12px', width: '44px', height: '44px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Close"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    {/* Draggable/Zoomable Image Content */}
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img
                            src={lightboxImage}
                            alt="Lightbox Preview"
                            style={{
                                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                                maxWidth: '90%',
                                maxHeight: '80%',
                                objectFit: 'contain',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentReview;
