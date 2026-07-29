import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { fireAchievement } from '../components/AchievementEffect';
import {
    ClipboardCheck,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Save,
    Camera,
    Star,
    Navigation,
    User,
    MapPin,
    ArrowRight,
    PlusCircle,
    Search,
    ClipboardList,
    X
} from 'lucide-react';

const BATCH_SIZE = 10;

interface Question {
    id: string;
    text: string;
    marks: number;
    imageCount: number;
}

interface Participant {
    id: string;
    category: string;
    mobileNumber: string;
    locationLat: number | null;
    locationLng: number | null;
    isCompleted?: boolean;
    details: any;
    status: string;
    assessments?: any[];
}

const Verification = () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const [assignments, setAssignments] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [questionnaire, setQuestionnaire] = useState<{ questions: Question[], id: string } | null>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dynamicCategories, setDynamicCategories] = useState<{ id: string, label: string }[]>([]);
    const [allQuestionnaires, setAllQuestionnaires] = useState<any[]>([]);
    const [viewingAssessment, setViewingAssessment] = useState<any | null>(null);
    const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
    const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const [currentPage, setCurrentPage] = useState(0);
    const [assessmentId, setAssessmentId] = useState<string | null>(null);
    const [savedBatchCount, setSavedBatchCount] = useState(0);
    const [batchSaving, setBatchSaving] = useState(false);
    const canViewContactNumber = user?.role !== 'accessor';

    useEffect(() => {
        if (user) {
            fetchPendingAssignments();
            fetchDeployedQuestionnaires();
        }
    }, []);

    const viewAudit = async (participant: Participant) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.get(`/assessments/participant/${participant.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data) {
                setViewingAssessment(response.data);
                setSelectedParticipant(participant);
            }
        } catch (err) {
            console.error('Failed to fetch assessment');
            alert('Failed to load assessment report.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDeployedQuestionnaires = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await api.get('/questionnaire', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllQuestionnaires(response.data || []);
            const qCategories = response.data.map((q: any) => ({
                id: q.category,
                label: q.category.replace(/_/g, ' ').toUpperCase()
            }));
            setDynamicCategories([{ id: 'all', label: 'All Segments' }, ...qCategories]);
        } catch (err) {
            console.error('Failed to fetch questionnaires');
            setDynamicCategories([{ id: 'all', label: 'All Segments' }]);
        }
    };

    const fetchPendingAssignments = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.get(`/assessments/pending/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignments(response.data);
        } catch (err) {
            console.error('Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    };

    const startVerification = async (participant: Participant) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.get(`/questionnaire/${participant.category}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data) {
                setQuestionnaire(response.data);
                setSelectedParticipant(participant);

                // Check for in-progress draft
                const draft = (participant.assessments || []).find(
                    (a: any) => ['in_progress', 'pending'].includes(a.status)
                );
                const draftMap = new Map<string, any>(
                    (draft?.responses || []).map((r: any) => [r.questionId, r])
                );

                const initialResponses = response.data.questions.map((q: Question) => {
                    const saved = draftMap.get(q.id);
                    return {
                        questionId: q.id,
                        text: q.text,
                        obtainedMarks: saved?.obtainedMarks ?? 0,
                        remarks: saved?.remarks ?? '',
                        images: saved?.images ?? [],
                        yesNo: saved?.yesNo ?? (null as null | 'yes' | 'no')
                    };
                });

                const savedCount = draft?.responses?.length ?? 0;
                const startPage = Math.min(
                    Math.floor(savedCount / BATCH_SIZE),
                    Math.ceil(response.data.questions.length / BATCH_SIZE) - 1
                );

                setResponses(initialResponses);
                setAssessmentId(draft?.id ?? null);
                setSavedBatchCount(Math.ceil(savedCount / BATCH_SIZE));
                setCurrentPage(Math.max(0, startPage));
            } else {
                alert('No questionnaire found for this category. Please contact admin.');
            }
        } catch (err) {
            console.error('Failed to fetch questionnaire');
            alert('Questionnaire deployment required before verification.');
        } finally {
            setLoading(false);
        }
    };

    const handleResponseChange = (index: number, field: string, value: any, maxMarks?: number) => {
        const updated = [...responses];
        let finalValue = value;
        if (field === 'obtainedMarks' && maxMarks !== undefined) {
            const numValue = Number(value);
            if (numValue > maxMarks) finalValue = maxMarks;
            else if (numValue < 0) finalValue = 0;
            else finalValue = numValue;
        }
        updated[index] = { ...updated[index], [field]: finalValue };
        setResponses(updated);
    };

    const handleImageUpload = async (idx: number, questionId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const key = `${idx}-${questionId}`;
        setUploadingImages(prev => ({ ...prev, [key]: true }));
        const token = localStorage.getItem('token');
        try {
            const formData = new FormData();
            formData.append('images', files[0]);
            const res = await api.post('/assessments/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            const urls: string[] = (res.data.files as any[]).map((f: any) => f.url);
            const updated = [...responses];
            updated[idx] = { ...updated[idx], images: [...(updated[idx].images || []), ...urls] };
            setResponses(updated);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Image upload failed. Please try again.');
        } finally {
            setUploadingImages(prev => ({ ...prev, [key]: false }));
            if (imageInputRefs.current[key]) imageInputRefs.current[key]!.value = '';
        }
    };

    const handleRemoveImage = (idx: number, url: string) => {
        const updated = [...responses];
        updated[idx] = { ...updated[idx], images: (updated[idx].images || []).filter((u: string) => u !== url) };
        setResponses(updated);
    };

    const saveBatch = async (pageIndex: number): Promise<string | null> => {
        const token = localStorage.getItem('token');
        const start = pageIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, responses.length);
        const pageResponses = responses.slice(start, end);
        const res = await api.post('/assessments/sections/save', {
            assessmentId,
            participantId: selectedParticipant?.id,
            accessorId: user.id,
            questionnaireId: questionnaire?.id,
            responses: pageResponses
        }, { headers: { Authorization: `Bearer ${token}` } });
        return res.data.assessmentId || assessmentId;
    };

    const handleSaveAndNext = async () => {
        setBatchSaving(true);
        try {
            const id = await saveBatch(currentPage);
            if (id && !assessmentId) setAssessmentId(id);
            setSavedBatchCount(prev => Math.max(prev, currentPage + 1));
            setCurrentPage(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save. Please try again.');
        } finally {
            setBatchSaving(false);
        }
    };

    const submitFinalAssessment = async () => {
        setSubmitting(true);
        const token = localStorage.getItem('token');
        try {
            const id = await saveBatch(currentPage);
            const finalId = id || assessmentId;
            if (!finalId) throw new Error('Assessment ID missing');

            await api.post('/assessments/finalize', {
                assessmentId: finalId,
                participantId: selectedParticipant?.id,
                accessorId: user.id,
                questionnaireId: questionnaire?.id
            }, { headers: { Authorization: `Bearer ${token}` } });

            setSuccess(true);
            fireAchievement({ type: 'completed', message: 'Assessment Completed!' });
            setTimeout(() => {
                setSuccess(false);
                setSelectedParticipant(null);
                setQuestionnaire(null);
                setCurrentPage(0);
                setAssessmentId(null);
                setSavedBatchCount(0);
                fetchPendingAssignments();
            }, 3000);
        } catch (err) {
            console.error('Submission failed');
            alert('Failed to submit assessment.');
        } finally {
            setSubmitting(false);
        }
    };

    const getQuestionnaireStats = (category: string) => {
        const q = allQuestionnaires.find(item => item.category === category);
        if (!q) return { count: 0, marks: 0 };
        return {
            count: q.questions.length,
            marks: q.questions.reduce((acc: number, cur: any) => acc + (cur.marks || 0), 0)
        };
    };

    const filteredAssignments = assignments.filter(a => {
        const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
        const matchesSearch =
            a.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (canViewContactNumber && a.mobileNumber.includes(searchTerm));
        return matchesCategory && matchesSearch;
    });

    if (viewingAssessment && selectedParticipant) {
        return (
            <div className="dashboard-content">
                <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button
                        onClick={() => { setViewingAssessment(null); setSelectedParticipant(null); }}
                        style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
                            Assessment Report
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Final Score: <span style={{ color: 'var(--swachh-green)' }}>{viewingAssessment.finalScore ?? viewingAssessment.totalScore} PTS</span></p>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {viewingAssessment.responses.map((res: any, idx: number) => (
                            <div key={idx} className="card shadow-premium" style={{ border: 'none', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ width: '32px', height: '32px', backgroundColor: '#e2e8f0', color: 'var(--text-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>
                                            {idx + 1}
                                        </div>
                                        <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{res.text}</h4>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--success-soft)', padding: '0.4rem 0.8rem', borderRadius: '8px', height: 'fit-content' }}>
                                        <CheckCircle2 size={16} color="var(--success)" />
                                        <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.9rem' }}>{res.obtainedMarks} PTS</span>
                                    </div>
                                </div>

                                {res.remarks && (
                                    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Assessor Remarks</div>
                                        <p style={{ color: 'var(--text-primary)', fontWeight: 500, margin: 0 }}>{res.remarks}</p>
                                    </div>
                                    
                                )}
                                {res.images && res.images.length > 0 && (
  <div style={{
    marginTop: '1.5rem',
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  }}>
    {res.images.map((img: string, i: number) => (
      <img
        key={i}
        src={img}
        alt="evidence"
        style={{
          width: '120px',
          height: '120px',
          objectFit: 'cover',
          borderRadius: '12px',
          border: '1px solid var(--border-light)'
        }}
      />
    ))}
  </div>
)}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="card shadow-premium" style={{ border: 'none', padding: '2rem' }}>
                            <h4 style={{ fontWeight: 900, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Audit Profile</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '42px', height: '42px', backgroundColor: 'var(--swachh-green-light)', color: 'var(--swachh-green)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Auditor</div>
                                        <div style={{ fontWeight: 700 }}>{viewingAssessment.assessor?.name || 'Assigned Assessor'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '42px', height: '42px', backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject</div>
                                        <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{selectedParticipant.category}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="card shadow-premium" style={{ textAlign: 'center', padding: '4rem', maxWidth: '500px' }}>
                    <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--success-soft)', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--text-primary)' }}>Verification Complete</h2>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.6 }}>The assessment data has been successfully synchronized with the central server.</p>
                </div>
            </div>
        );
    }

    if (selectedParticipant && questionnaire) {
        const totalPages = Math.ceil(questionnaire.questions.length / BATCH_SIZE);
        const isLastPage = currentPage === totalPages - 1;
        const pageStart = currentPage * BATCH_SIZE;
        const pageEnd = Math.min(pageStart + BATCH_SIZE, questionnaire.questions.length);
        const pageQuestions = questionnaire.questions.slice(pageStart, pageEnd);
        const savedQCount = Math.min(savedBatchCount * BATCH_SIZE, questionnaire.questions.length);
        const progressPct = questionnaire.questions.length > 0
            ? Math.round((savedQCount / questionnaire.questions.length) * 100) : 0;

        return (
            <div className="dashboard-content">
                {/* Sticky progress header */}
                <div style={{ backgroundColor: 'var(--swachh-green)', color: 'white', borderRadius: '16px', padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <button
                            onClick={() => setSelectedParticipant(null)}
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', color: 'white', display: 'flex' }}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>Field Verification</div>
                            <div style={{ opacity: 0.8, fontSize: '0.8rem', textTransform: 'capitalize' }}>
                                {selectedParticipant.category} — Batch {currentPage + 1} of {totalPages}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.9 }}>
                            Q{pageStart + 1}–Q{pageEnd} / {questionnaire.questions.length}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.8, marginBottom: '0.3rem', fontWeight: 600 }}>
                        <span>{savedQCount}/{questionnaire.questions.length} saved</span>
                        <span>{progressPct}%</span>
                    </div>
                    <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '3px' }}>
                        <div style={{ height: '100%', backgroundColor: 'white', borderRadius: '3px', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {pageQuestions.map((q, localIdx) => {
                            const idx = pageStart + localIdx;
                            const yesNo = responses[idx]?.yesNo;
                            return (
                            <div key={q.id} className="card shadow-premium" style={{ border: 'none', padding: '2rem' }}>
                                {/* Question header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--swachh-green)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>
                                            {idx + 1}
                                        </div>
                                        <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{q.text}</h4>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary-soft)', padding: '0.4rem 0.8rem', borderRadius: '8px', height: 'fit-content' }}>
                                        <Star size={16} color="var(--primary)" />
                                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>{q.marks} PTS</span>
                                    </div>
                                </div>

                                {/* Yes / No toggle */}
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    {(['yes', 'no'] as const).map((val) => {
                                        const isSelected = yesNo === val;
                                        const isYes = val === 'yes';
                                        return (
                                            <button
                                                key={val}
                                                onClick={() => {
                                                    const updated = [...responses];
                                                    updated[idx] = {
                                                        ...updated[idx],
                                                        yesNo: val,
                                                    };
                                                    setResponses(updated);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    borderRadius: '10px',
                                                    border: `2px solid ${isSelected ? (isYes ? 'var(--swachh-green)' : '#ef4444') : 'var(--border-light)'}`,
                                                    backgroundColor: isSelected ? (isYes ? 'var(--swachh-green)' : '#ef4444') : 'white',
                                                    color: isSelected ? 'white' : 'var(--text-secondary)',
                                                    fontWeight: 800,
                                                    fontSize: '1rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                {isYes ? 'Yes' : 'No'}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Marks, remarks and images — visible when Yes or No */}
                                {yesNo !== null && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '1.5rem' }}>
                                            <div className="form-group">
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Field Remarks</label>
                                                <textarea
                                                    placeholder="Enter your observations..."
                                                    value={responses[idx]?.remarks || ''}
                                                    onChange={(e) => handleResponseChange(idx, 'remarks', e.target.value)}
                                                    style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)', minHeight: '100px', resize: 'none' }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Obtained</label>
                                                <input
                                                    type="number"
                                                    max={q.marks}
                                                    min={0}
                                                    value={responses[idx]?.obtainedMarks || 0}
                                                    onChange={(e) => handleResponseChange(idx, 'obtainedMarks', e.target.value, q.marks)}
                                                    style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)', fontWeight: 900, textAlign: 'center', fontSize: '1.25rem' }}
                                                />
                                            </div>
                                        </div>

                                        {q.imageCount > 0 && (() => {
                                            const key = `${idx}-${q.id}`;
                                            const isUploading = !!uploadingImages[key];
                                            const uploaded: string[] = responses[idx]?.images || [];
                                            const canAdd = uploaded.length < q.imageCount;
                                            return (
                                                <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed var(--border-light)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            <Camera size={20} />
                                                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Photos: {uploaded.length} / {q.imageCount}</span>
                                                        </div>
                                                    </div>

                                                    {/* Uploaded image thumbnails */}
                                                    {uploaded.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                                            {uploaded.map((url, i) => (
                                                                <div key={i} style={{ position: 'relative' }}>
                                                                    <img
                                                                        src={url}
                                                                        alt={`evidence-${i}`}
                                                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-light)' }}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleRemoveImage(idx, url)}
                                                                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                                    >
                                                                        <X size={11} strokeWidth={3} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Upload button */}
                                                    {canAdd && (
                                                        <>
                                                            <input
                                                                ref={el => { imageInputRefs.current[key] = el; }}
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/webp"
                                                                capture="environment"
                                                                style={{ display: 'none' }}
                                                                onChange={e => handleImageUpload(idx, q.id, e.target.files)}
                                                            />
                                                            <button
                                                                onClick={() => imageInputRefs.current[key]?.click()}
                                                                disabled={isUploading}
                                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px dashed', borderColor: isUploading ? '#a5c9af' : 'var(--swachh-green)', backgroundColor: 'white', color: isUploading ? '#a5c9af' : 'var(--swachh-green)', fontWeight: 700, fontSize: '0.875rem', cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                                            >
                                                                {isUploading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Uploading…</> : <><Camera size={16} /> Take / Upload Photo</>}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                            );
                        })}

                        {/* Batch navigation buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            {currentPage > 0 && (
                                <button
                                    onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    disabled={batchSaving || submitting}
                                    className="btn btn-outline"
                                    style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <ArrowLeft size={18} /> Previous
                                </button>
                            )}
                            {!isLastPage ? (
                                <button
                                    onClick={handleSaveAndNext}
                                    disabled={batchSaving || submitting}
                                    className="btn btn-primary"
                                    style={{ flex: currentPage > 0 ? 2 : 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: batchSaving ? '#7aab8a' : 'var(--swachh-green)', border: 'none', fontSize: '1rem', fontWeight: 900 }}
                                >
                                    {batchSaving ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Saving…</> : <><Save size={18} /> Save & Continue <ArrowRight size={18} /></>}
                                </button>
                            ) : (
                                <button
                                    onClick={submitFinalAssessment}
                                    disabled={submitting || batchSaving}
                                    className="btn btn-primary"
                                    style={{ flex: currentPage > 0 ? 2 : 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: submitting ? '#7aab8a' : 'var(--swachh-green)', border: 'none', fontSize: '1rem', fontWeight: 900, boxShadow: '0 8px 20px rgba(26,77,46,0.25)' }}
                                >
                                    {submitting ? 'Submitting…' : <><CheckCircle2 size={20} /> Final Submit</>}
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="card shadow-premium" style={{ border: 'none', padding: '2rem' }}>
                            <h4 style={{ fontWeight: 900, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Entity Profile</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '42px', height: '42px', backgroundColor: 'var(--swachh-green-light)', color: 'var(--swachh-green)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Person</div>
                                        <div style={{ fontWeight: 700 }}>
                                            {canViewContactNumber ? selectedParticipant.mobileNumber : 'Hidden for privacy'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '42px', height: '42px', backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classification</div>
                                        <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{selectedParticipant.category}</div>
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-outline" style={{ marginTop: '2rem', width: '100%', padding: '0.875rem' }}>
                                <Navigation size={18} style={{ marginRight: '0.5rem' }} /> Navigate
                            </button>
                        </div>

                        <div className="card shadow-premium" style={{ border: 'none', padding: '2rem' }}>
                            <h4 style={{ fontWeight: 900, marginBottom: '1rem', color: 'var(--text-primary)' }}>Audit Integrity</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
                                Ensure all markings are backed by physical evidence or photographs as specified in the evaluation matrix. Use remarks for exceptions.
                            </p>
                        </div>

                        <div className="card shadow-premium" style={{ border: 'none', padding: '2rem', backgroundColor: 'var(--primary-dark)', color: 'white' }}>
                            <h4 style={{ fontWeight: 800, marginBottom: '1rem' }}>Score Summary</h4>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                                {responses.reduce((acc, r) => acc + (Number(r.obtainedMarks) || 0), 0)}
                            </div>
                            <div style={{ fontSize: '0.875rem', opacity: 0.8, fontWeight: 600 }}>Total Collected Points</div>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-content">
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
                    Quality Assurance
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 500 }}>
                    Select an assigned segment to begin the technical verification process.
                </p>
            </header>

            <div className="card shadow-premium" style={{ border: 'none', padding: '2rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem' }}>
                    <div className="search-bar" style={{ flex: 1, position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Find segment by ID or details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '1.125rem 1.125rem 1.125rem 3.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', fontSize: '1rem', fontWeight: 600 }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                    {dynamicCategories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: categoryFilter === cat.id ? 'var(--swachh-green)' : 'white',
                                color: categoryFilter === cat.id ? 'white' : 'var(--text-secondary)',
                                fontWeight: 800,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: categoryFilter === cat.id ? '0 8px 16px rgba(26, 77, 46, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Loading assigned segments...</p>
                </div>
            ) : (
                <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1.25rem 2rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subject Category</th>
                                <th style={{ textAlign: 'left', padding: '1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entity Identity</th>
                                <th style={{ textAlign: 'center', padding: '1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Criteria</th>
                                <th style={{ textAlign: 'center', padding: '1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Marks</th>
                                <th style={{ textAlign: 'right', padding: '1.25rem 2rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssignments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '6rem 3rem', textAlign: 'center' }}>
                                        <div style={{ opacity: 0.5, marginBottom: '1.5rem' }}>
                                            <ClipboardList size={48} style={{ margin: '0 auto' }} />
                                        </div>
                                        <h3 style={{ fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No Matches Found</h3>
                                        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Try adjusting your filters or search keywords.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredAssignments.map(a => {
                                    const stats = getQuestionnaireStats(a.category);
                                    return (
                                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s', opacity: a.isCompleted ? 0.7 : 1 }} className="table-row-hover">
                                            <td style={{ padding: '1.5rem 2rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: a.isCompleted ? 'var(--text-muted)' : 'var(--swachh-green)' }}></div>
                                                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                                                        {a.category.replace(/_/g, ' ')}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.5rem' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                    {canViewContactNumber ? a.mobileNumber : 'Hidden for privacy'}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID: {a.id.slice(0, 8).toUpperCase()}</div>
                                            </td>
                                            <td style={{ padding: '1.5rem', textAlign: 'center' }}>
                                                <span style={{ backgroundColor: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                                    {stats.count} Questions
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.5rem', textAlign: 'center' }}>
                                                <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1rem' }}>
                                                    {stats.marks} PTS
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>
                                                {a.isCompleted ? (
                                                    <button
                                                        onClick={() => viewAudit(a)}
                                                        className="btn btn-outline"
                                                        style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--swachh-green)', borderColor: 'var(--swachh-green)' }}
                                                    >
                                                        <ClipboardCheck size={16} /> View Report
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => startVerification(a)}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--swachh-green)', border: 'none' }}
                                                    >
                                                        Start Audit <ArrowRight size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Verification;
