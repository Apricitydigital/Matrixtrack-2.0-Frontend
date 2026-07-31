import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { apiBaseUrl } from '../api/axios';
import { CheckCircle, ArrowLeft, Camera, X, ChevronLeft, ChevronRight, Save } from 'lucide-react';

const BATCH_SIZE = 10;
const UPLOAD_TIMEOUT_MS = 45_000;
const SAVE_TIMEOUT_MS   = 20_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
    if (file.size < 300 * 1024) return file; // skip if already small
    const MAX = 1280;
    const QUALITY = 0.78;
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            const w = Math.round(img.width * ratio);
            const h = Math.round(img.height * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(file); return; }
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                (blob) => {
                    if (!blob) { resolve(file); return; }
                    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
                    resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
                },
                'image/jpeg',
                QUALITY
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 1500): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < maxAttempts; i++) {
        try { return await fn(); } catch (err) {
            lastErr = err;
            if (i < maxAttempts - 1) await new Promise<void>(r => setTimeout(r, baseDelayMs * (i + 1)));
        }
    }
    throw lastErr;
}

function friendlyUploadError(err: any): string {
    if (err?.response?.status === 413) return 'Photo is too large. Please use a lower-resolution photo.';
    if (err?.code === 'ECONNABORTED') return 'Upload timed out. Check your internet connection and try again.';
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'No internet connection. Please reconnect and try again.';
    return err?.response?.data?.message || 'Photo upload failed. Please try again.';
}

function friendlySaveError(err: any): string {
    if (err?.code === 'ECONNABORTED') return 'Save timed out after 3 attempts. Check your connection and try again.';
    if (err?.response?.status === 409) return 'Save conflict — please wait a moment and try again.';
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'No internet connection. Please reconnect and try again.';
    return 'Failed to save after 3 attempts. Please try again.';
}

// ── Constants & types ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
    schools: 'School', hospitals: 'Hospital', offices: 'Office',
    hotels: 'Hotel', markets: 'Market', 'societies-bwg': 'Society',
    wards: 'Ward', citizen_puraskar: 'Citizen Puraskar',
};

const FIELD_LABELS: Record<string, string> = {
    name: 'Name', address: 'Address',
    wardName: 'Ward Name', wardNumber: 'Ward Number', wardNo: 'Ward No.', ward: 'Ward',
    zoneNumber: 'Zone Number', zoneNo: 'Zone No.', zone: 'Zone',
    schoolType: 'School Type', medium: 'Medium',
    totalStudents: 'Total Students', totalStaff: 'Total Staff',
    principalName: 'Principal Name', principalContact: 'Principal Contact',
    hospitalType: 'Hospital Type', numberOfBeds: 'Number of Beds',
    adminName: 'Admin Name', adminContact: 'Admin Contact',
    officeType: 'Office Type', inchargeName: 'Incharge Name', inchargeContact: 'Incharge Contact',
    chairmanName: 'Chairman Name', chairmanContact: 'Chairman Contact',
    type: 'Type', noOfShops: 'No. of Shops', noOfHawkers: 'No. of Hawkers',
    associationHeadName: 'Association Head', associationHeadContact: 'Association Contact',
    inchargeSIName: 'Incharge SI', inchargeSIContact: 'Incharge SI Contact',
    officerName: 'Officer Name', officerContact: 'Officer Contact',
    phoneNumber: 'Phone Number', detailsOfWork: 'Details of Work',
    officeAddress: 'Office Address', directorName: 'Director Name',
    yearOfEstablishment: 'Year of Establishment',
};

function resolveImageUrl(src?: string): string {
    if (!src) return '';
    const t = src.trim();
    if (/^(https?:|data:|blob:)/i.test(t)) return t;
    const mediaBase = (import.meta.env.VITE_MEDIA_BASE_URL || '').replace(/\/+$/, '');
    const base = mediaBase || apiBaseUrl;
    return `${base}${t.startsWith('/') ? '' : '/'}${t}`;
}

interface Question { id: string; text: string; marks: number; imageCount: number; }
interface Participant {
    id: string; name: string; mobile: string;
    stakeholderType: string; location: string;
    details: Record<string, string>; alreadySubmitted: boolean;
}
interface DraftData { exists: boolean; answers: Record<string, AnswerValue>; currentBatch: number; }
type AnswerValue = { score: number; imageUrls: string[] };

const G = 'var(--swachh-green)';

// ── Component ─────────────────────────────────────────────────────────────────

const SelfAssessmentForm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as {
        participant: Participant; questions: Question[]; draft?: DraftData | null;
    } | null;

    const [phase, setPhase] = useState<'profile' | 'form'>('profile');
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>(
        () => (state?.draft?.exists ? state.draft.answers as Record<string, AnswerValue> : {})
    );
    const [currentPage, setCurrentPage] = useState(() => state?.draft?.currentBatch ?? 0);
    const [savedBatchCount, setSavedBatchCount] = useState(() => state?.draft?.currentBatch ?? 0);
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [saveMsg, setSaveMsg] = useState('');
    const [answered, setAnswered] = useState<Set<string>>(
        () => new Set(Object.keys(state?.draft?.exists ? (state.draft.answers ?? {}) : {}))
    );
    const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
    const [yesNo, setYesNo] = useState<Record<string, 'yes' | 'no'>>({});
    const saveLockRef = useRef(false);

    if (!state?.participant) {
        navigate('/self-assessment');
        return null;
    }

    const { participant, questions } = state;
    const totalPages    = Math.ceil(questions.length / BATCH_SIZE);
    const isLastPage    = currentPage === totalPages - 1;
    const pageStart     = currentPage * BATCH_SIZE;
    const pageEnd       = Math.min(pageStart + BATCH_SIZE, questions.length);
    const pageQuestions = questions.slice(pageStart, pageEnd);
    const savedQCount   = Math.min(savedBatchCount * BATCH_SIZE, questions.length);
    const progressPct   = questions.length > 0 ? Math.round((savedQCount / questions.length) * 100) : 0;
    const anyUploading  = Object.values(uploading).some(Boolean);

    const detailEntries = Object.entries(participant.details || {}).filter(
        ([, v]) => v !== null && v !== undefined && String(v).trim() !== ''
    );

    const getAnswer = (id: string): AnswerValue => answers[id] ?? { score: 0, imageUrls: [] };

    const setScore = (id: string, delta: number, max: number) => {
        setAnswered(prev => { const s = new Set(prev); s.add(id); return s; });
        setValidationErrors(prev => { const s = new Set(prev); s.delete(id); return s; });
        setAnswers(prev => {
            const cur = prev[id]?.score ?? 0;
            const next = Math.max(0, Math.min(max, cur + delta));
            return { ...prev, [id]: { ...(prev[id] ?? { score: 0, imageUrls: [] }), score: next } };
        });
    };

    const addImageUrl = (id: string, url: string) => {
        setAnswers(prev => ({
            ...prev,
            [id]: { ...(prev[id] ?? { score: 0, imageUrls: [] }), imageUrls: [...(prev[id]?.imageUrls ?? []), url] },
        }));
    };

    const removeImageUrl = (id: string, url: string) => {
        setAnswers(prev => ({
            ...prev,
            [id]: { ...prev[id], imageUrls: prev[id].imageUrls.filter(u => u !== url) },
        }));
    };

    const handleYesNo = (id: string, value: 'yes' | 'no') => {
        setYesNo(prev => ({ ...prev, [id]: value }));
        setAnswered(prev => { const s = new Set(prev); s.add(id); return s; });
        setValidationErrors(prev => { const s = new Set(prev); s.delete(id); return s; });
        if (value === 'no') {
            setAnswers(prev => ({ ...prev, [id]: { score: 0, imageUrls: [] } }));
        }
    };

    // ── Upload handler: compress → retry upload ────────────────────────────────
    const handleFileChange = async (questionId: string, maxCount: number, files: FileList | null) => {
        if (!files || files.length === 0) return;
        if ((answers[questionId]?.imageUrls?.length ?? 0) >= maxCount) return;

        setUploading(prev => ({ ...prev, [questionId]: true }));
        setError('');

        try {
            const compressed = await compressImage(files[0]);
            await withRetry(async () => {
                const formData = new FormData();
                formData.append('images', compressed);
                const res = await api.post('/self-assessment/upload-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: UPLOAD_TIMEOUT_MS,
                });
                (res.data.urls as string[]).forEach(url => addImageUrl(questionId, url));
            });
        } catch (err: any) {
            setError(friendlyUploadError(err));
        } finally {
            setUploading(prev => ({ ...prev, [questionId]: false }));
        }
    };

    // ── Save batch handler: guard → retry save ─────────────────────────────────
    const handleSaveAndNext = async () => {
        if (saveLockRef.current) return;
        if (anyUploading) { setError('Please wait for photo uploads to finish before saving.'); return; }
        if (!validatePage()) return;
        saveLockRef.current = true;
        setSaving(true);
        setError('');
        setValidationErrors(new Set());

        try {
            const nextBatch = currentPage + 1;
            await withRetry(async () => {
                await api.post('/self-assessment/save-batch', {
                    participantId: participant.id,
                    answers,
                    currentBatch: nextBatch,
                }, { timeout: SAVE_TIMEOUT_MS });
            });
            setSavedBatchCount(nextBatch);
            setCurrentPage(nextBatch);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setSaveMsg('Progress saved!');
            setTimeout(() => setSaveMsg(''), 2500);
        } catch (err: any) {
            setError(friendlySaveError(err));
        } finally {
            setSaving(false);
            saveLockRef.current = false;
        }
    };

    // ── Final submit: retry submit ─────────────────────────────────────────────
    const handleFinalSubmit = async () => {
        if (anyUploading) {
            setError('Please wait for photo uploads to finish before submitting.');
            setShowConfirm(false);
            return;
        }
        setSubmitting(true);
        setError('');
        setShowConfirm(false);

        try {
            await withRetry(async () => {
                await api.post('/self-assessment/submit', {
                    participantId: participant.id,
                    answers,
                }, { timeout: SAVE_TIMEOUT_MS });
            });
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setError(friendlySaveError(err));
        } finally {
            setSubmitting(false);
        }
    };

    const validatePage = (): boolean => {
        const unanswered = pageQuestions.filter(q => !yesNo[q.id]);
        if (unanswered.length > 0) {
            const ids = new Set(unanswered.map(q => q.id));
            setValidationErrors(ids);
            setError(`Please select Yes or No for all ${unanswered.length} unanswered question(s) before continuing.`);
            window.scrollTo({ top: 200, behavior: 'smooth' });
            return false;
        }
        setValidationErrors(new Set());
        return true;
    };

    const handleSubmitClick = () => {
        if (anyUploading) { setError('Please wait for photo uploads to finish before submitting.'); return; }
        if (!validatePage()) return;
        setShowConfirm(true);
    };

    const handlePrevious = () => {
        setValidationErrors(new Set());
        setError('');
        setCurrentPage(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Success ───────────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh',
                background: `linear-gradient(135deg, ${G} 0%, var(--swachh-green-light) 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
            }}>
                <div style={{
                    background: 'white', borderRadius: '20px', padding: '3rem 2rem',
                    textAlign: 'center', maxWidth: '400px', width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}>
                    <div style={{
                        width: '80px', height: '80px', backgroundColor: 'rgba(16,185,129,0.1)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 1.5rem',
                    }}>
                        <CheckCircle size={48} color="var(--success-dark)" />
                    </div>
                    <h2 style={{ color: G, fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.75rem' }}>
                        Submitted Successfully!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        Thank you, <strong>{participant.name}</strong>.<br />Your self-assessment has been recorded.
                    </p>
                    <div style={{
                        padding: '0.875rem 1.25rem', backgroundColor: 'rgba(16,185,129,0.08)',
                        borderRadius: '10px', fontSize: '0.8125rem', color: 'var(--success-dark)',
                        fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                        Status: Submitted
                    </div>
                </div>
            </div>
        );
    }

    // ── Profile phase ─────────────────────────────────────────────────────────
    if (phase === 'profile') {
        return (
            <div style={{ minHeight: '100vh', background: '#f0f4f0' }}>
                <div style={{
                    background: G, padding: '1rem 1.25rem', color: 'white',
                    position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button type="button" onClick={() => navigate('/self-assessment')}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Participant Profile</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.75, fontWeight: 500 }}>Verify your details before assessment</div>
                        </div>
                    </div>
                </div>

                <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.25rem 1rem' }}>
                    <div style={{
                        background: G, borderRadius: '18px', padding: '1.75rem 1.5rem',
                        textAlign: 'center', marginBottom: '1.125rem', boxShadow: '0 6px 24px rgba(26,77,46,0.25)',
                    }}>
                        <div style={{
                            width: '68px', height: '68px', borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 0.875rem', border: '2px solid rgba(255,255,255,0.3)',
                            fontSize: '1.75rem', fontWeight: 900, color: 'white',
                        }}>
                            {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>
                            {participant.name}
                        </div>
                        <span style={{
                            backgroundColor: 'rgba(255,255,255,0.2)', color: 'white',
                            padding: '0.2rem 0.875rem', borderRadius: '20px',
                            fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)',
                            display: 'inline-block', marginBottom: '0.5rem',
                        }}>
                            {CATEGORY_LABELS[participant.stakeholderType] || participant.stakeholderType}
                        </span>
                        {participant.mobile && (
                            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.375rem' }}>
                                📱 {participant.mobile}
                            </div>
                        )}
                    </div>

                    <div style={{
                        background: 'white', borderRadius: '16px', padding: '1.25rem',
                        marginBottom: '1.125rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: G, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                            Registered Details
                        </div>
                        {detailEntries.map(([key, value], idx) => (
                            <div key={key} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                paddingTop: '0.625rem', paddingBottom: '0.625rem',
                                borderBottom: idx < detailEntries.length - 1 ? '1px solid #f0f0f0' : 'none',
                                gap: '1rem',
                            }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, flex: 1 }}>
                                    {FIELD_LABELS[key] || key}
                                </span>
                                <span style={{ fontSize: '0.875rem', color: '#1a1a1a', fontWeight: 700, flex: 1.4, textAlign: 'right' }}>
                                    {String(value)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {state?.draft?.exists && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: '12px',
                            padding: '0.875rem 1rem', border: '1px solid rgba(245,158,11,0.25)',
                            marginBottom: '1rem',
                        }}>
                            <Save size={18} color="#d97706" />
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e' }}>
                                Draft saved — continuing from Batch {(state.draft.currentBatch) + 1} of {totalPages}
                            </span>
                        </div>
                    )}

                    <button
                        onClick={() => { setPhase('form'); window.scrollTo({ top: 0 }); }}
                        style={{
                            width: '100%', padding: '1.125rem',
                            backgroundColor: G, border: 'none',
                            fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '0.02em',
                            boxShadow: '0 8px 20px rgba(26,77,46,0.25)', borderRadius: '12px',
                            marginBottom: '2rem', cursor: 'pointer', color: 'white',
                        }}
                    >
                        {state?.draft?.exists ? 'Continue Assessment →' : 'Start Assessment →'}
                    </button>
                </div>
            </div>
        );
    }

    // ── Form phase ────────────────────────────────────────────────────────────
    const saveButtonDisabled = saving || anyUploading || submitting;
    const saveButtonLabel = saving
        ? 'Saving… (retrying if needed)'
        : anyUploading
        ? 'Waiting for uploads…'
        : <><Save size={16} /> Save & Continue <ChevronRight size={18} /></>;

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f0' }}>
            {/* Sticky header + progress */}
            <div style={{
                background: G, color: 'white', position: 'sticky', top: 0, zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
                <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <button type="button" onClick={() => setPhase('profile')}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Self Assessment</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                                {CATEGORY_LABELS[participant.stakeholderType] || participant.stakeholderType} — {participant.name}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9, textAlign: 'right' }}>
                            Batch {currentPage + 1}/{totalPages}
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', opacity: 0.8, marginBottom: '0.3rem', fontWeight: 600 }}>
                            <span>Q{pageStart + 1}–Q{pageEnd} of {questions.length}</span>
                            <span>{savedQCount}/{questions.length} saved ({progressPct}%)</span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '2px' }}>
                            <div style={{
                                height: '100%', backgroundColor: 'white', borderRadius: '2px',
                                width: `${progressPct}%`, transition: 'width 0.4s ease',
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.125rem 1rem 1.5rem' }}>
                {error && (
                    <div style={{
                        backgroundColor: 'var(--error-soft)', color: 'var(--error-dark)',
                        padding: '0.875rem 1rem', borderRadius: '10px', fontSize: '0.875rem',
                        fontWeight: 600, marginBottom: '1rem', textAlign: 'center',
                        border: '1px solid rgba(244,63,94,0.2)',
                    }}>
                        {error}
                    </div>
                )}

                {saveMsg && (
                    <div style={{
                        backgroundColor: 'rgba(16,185,129,0.08)', color: 'var(--success-dark)',
                        padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.875rem',
                        fontWeight: 700, marginBottom: '1rem', textAlign: 'center',
                        border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                        ✓ {saveMsg}
                    </div>
                )}

                {pageQuestions.map((q, idx) => (
                    <QuestionCard
                        key={q.id}
                        question={q}
                        index={pageStart + idx}
                        answer={getAnswer(q.id)}
                        uploading={!!uploading[q.id]}
                        hasError={validationErrors.has(q.id)}
                        yesNo={yesNo[q.id]}
                        onYesNo={(value) => handleYesNo(q.id, value)}
                        onIncrement={() => setScore(q.id, +1, q.marks)}
                        onDecrement={() => setScore(q.id, -1, q.marks)}
                        onFileChange={(files) => handleFileChange(q.id, q.imageCount, files)}
                        onRemoveImage={(url) => removeImageUrl(q.id, url)}
                    />
                ))}

                {/* Navigation buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '2rem' }}>
                    {currentPage > 0 && (
                        <button
                            type="button"
                            onClick={handlePrevious}
                            disabled={saving}
                            style={{
                                flex: 1, padding: '1rem',
                                backgroundColor: 'white', border: '2px solid var(--swachh-green)',
                                color: G, fontWeight: 800, fontSize: '0.9375rem',
                                borderRadius: '12px', cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.5 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            }}
                        >
                            <ChevronLeft size={18} /> Previous
                        </button>
                    )}

                    {!isLastPage ? (
                        <button
                            type="button"
                            onClick={handleSaveAndNext}
                            disabled={saveButtonDisabled}
                            style={{
                                flex: currentPage > 0 ? 2 : 1, padding: '1rem',
                                backgroundColor: saveButtonDisabled ? '#7aab8a' : G,
                                border: 'none', color: 'white',
                                fontWeight: 800, fontSize: '0.9375rem',
                                boxShadow: saveButtonDisabled ? 'none' : '0 6px 16px rgba(26,77,46,0.25)',
                                borderRadius: '12px', cursor: saveButtonDisabled ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            }}
                        >
                            {saveButtonLabel}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmitClick}
                            disabled={submitting || anyUploading}
                            style={{
                                flex: currentPage > 0 ? 2 : 1, padding: '1rem',
                                backgroundColor: (submitting || anyUploading) ? '#7aab8a' : G,
                                border: 'none', color: 'white',
                                fontWeight: 800, fontSize: '0.9375rem',
                                boxShadow: (submitting || anyUploading) ? 'none' : '0 8px 20px rgba(26,77,46,0.25)',
                                borderRadius: '12px', cursor: (submitting || anyUploading) ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {submitting ? 'Submitting…' : anyUploading ? 'Waiting for uploads…' : 'Submit Assessment ✓'}
                        </button>
                    )}
                </div>
            </div>

            {/* Confirmation modal */}
            {showConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 100, padding: '1.5rem',
                }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', padding: '2rem 1.75rem',
                        maxWidth: '380px', width: '100%', textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%',
                            backgroundColor: 'rgba(16,185,129,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.25rem',
                        }}>
                            <CheckCircle size={36} color="var(--success-dark)" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a1a', marginBottom: '0.625rem' }}>
                            Final Submit?
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                            Are you sure you want to submit your assessment?<br />
                            <strong>You cannot edit your answers after submission.</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    flex: 1, padding: '0.875rem',
                                    backgroundColor: 'white', border: '1.5px solid #e2e8f0',
                                    color: '#64748b', fontWeight: 700, fontSize: '0.9375rem',
                                    borderRadius: '10px', cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalSubmit}
                                disabled={submitting}
                                style={{
                                    flex: 1.5, padding: '0.875rem',
                                    backgroundColor: G, border: 'none',
                                    color: 'white', fontWeight: 800, fontSize: '0.9375rem',
                                    borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 12px rgba(26,77,46,0.3)',
                                }}
                            >
                                {submitting ? 'Submitting…' : 'Yes, Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Question card ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
    question: Question; index: number; answer: AnswerValue; uploading: boolean; hasError?: boolean;
    yesNo: 'yes' | 'no' | undefined;
    onYesNo: (value: 'yes' | 'no') => void;
    onIncrement: () => void; onDecrement: () => void;
    onFileChange: (files: FileList | null) => void;
    onRemoveImage: (url: string) => void;
}

const QuestionCard = ({ question, index, answer, uploading, hasError, yesNo, onYesNo, onIncrement, onDecrement, onFileChange, onRemoveImage }: QuestionCardProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const score     = answer.score;
    const imageUrls = answer.imageUrls;
    const canAdd    = question.imageCount > 0 && imageUrls.length < question.imageCount;

    return (
        <div style={{
            background: 'white', borderRadius: '14px', padding: '1.125rem',
            marginBottom: '0.875rem',
            boxShadow: hasError ? '0 0 0 2px #ef4444' : '0 1px 6px rgba(0,0,0,0.07)',
            border: hasError ? '1.5px solid #ef4444' : '1.5px solid transparent',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: G, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Question {index + 1}
                </div>
                {hasError && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        Required
                    </div>
                )}
            </div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '1rem', lineHeight: 1.55 }}>
                {question.text}
            </p>

            {/* Yes / No toggle */}
            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: yesNo === 'yes' ? '1rem' : 0 }}>
                {(['yes', 'no'] as const).map((val) => {
                    const isSelected = yesNo === val;
                    const isYes = val === 'yes';
                    return (
                        <button
                            key={val}
                            type="button"
                            onClick={() => onYesNo(val)}
                            style={{
                                flex: 1,
                                padding: '0.625rem',
                                borderRadius: '10px',
                                border: `2px solid ${isSelected ? (isYes ? G : '#ef4444') : '#e2e8f0'}`,
                                backgroundColor: isSelected ? (isYes ? G : '#ef4444') : 'white',
                                color: isSelected ? 'white' : '#64748b',
                                fontWeight: 800,
                                fontSize: '0.9375rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {isYes ? 'Yes' : 'No'}
                        </button>
                    );
                })}
            </div>

            {/* Score — only visible when Yes */}
            {yesNo === 'yes' && (
                <>
                    <div style={{ marginBottom: question.imageCount > 0 ? '1rem' : 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                            Score (max {question.marks} pts)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button type="button" onClick={onDecrement} disabled={score <= 0} style={{
                                width: '42px', height: '42px', borderRadius: '10px', border: 'none',
                                backgroundColor: score <= 0 ? '#e8f5e9' : G,
                                color: score <= 0 ? '#a5c9af' : 'white',
                                fontSize: '20px', fontWeight: 700, cursor: score <= 0 ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>−</button>
                            <div style={{
                                flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px',
                                backgroundColor: '#f0faf2', borderRadius: '10px', padding: '0.625rem',
                                border: '1.5px solid rgba(26,77,46,0.12)',
                            }}>
                                <span style={{ fontSize: '1.625rem', fontWeight: 900, color: G, lineHeight: 1 }}>{score}</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>/ {question.marks}</span>
                            </div>
                            <button type="button" onClick={onIncrement} disabled={score >= question.marks} style={{
                                width: '42px', height: '42px', borderRadius: '10px', border: 'none',
                                backgroundColor: score >= question.marks ? '#e8f5e9' : G,
                                color: score >= question.marks ? '#a5c9af' : 'white',
                                fontSize: '20px', fontWeight: 700, cursor: score >= question.marks ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>+</button>
                        </div>
                    </div>

                    {/* Photos — only visible when Yes */}
                    {question.imageCount > 0 && (
                        <div style={{ backgroundColor: '#f8fdf9', borderRadius: '10px', padding: '0.875rem', border: '1px solid #d1e8da' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Photos
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: G }}>
                                    {imageUrls.length}/{question.imageCount}
                                </span>
                            </div>

                            {imageUrls.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
                                    {imageUrls.map((url, i) => (
                                        <div key={i} style={{ position: 'relative' }}>
                                            <img
                                                src={resolveImageUrl(url)}
                                                alt={`upload-${i}`}
                                                style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover' }}
                                            />
                                            <button type="button" onClick={() => onRemoveImage(url)} style={{
                                                position: 'absolute', top: '-6px', right: '-6px',
                                                width: '20px', height: '20px', borderRadius: '50%',
                                                backgroundColor: '#ef4444', border: 'none',
                                                color: 'white', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                            }}>
                                                <X size={11} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {canAdd && (
                                <>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={e => {
                                            onFileChange(e.target.files);
                                            e.target.value = '';
                                        }}
                                    />
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        style={{
                                            width: '100%', padding: '0.625rem',
                                            borderRadius: '8px', border: '1.5px dashed',
                                            borderColor: uploading ? '#a5c9af' : G,
                                            backgroundColor: 'white',
                                            color: uploading ? '#a5c9af' : G,
                                            fontWeight: 700, fontSize: '0.875rem',
                                            cursor: uploading ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        }}>
                                        {uploading
                                            ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Uploading…</>
                                            : <><Camera size={16} /> Take Photo</>
                                        }
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SelfAssessmentForm;
