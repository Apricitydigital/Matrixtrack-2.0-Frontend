'use client';

import React, { useState } from "react";

type Question = {
    code: string;
    label: string;
};

const LITTERBIN_QUESTIONS: Question[] = [
    { code: "q1", label: "Is the litter bin clean and emptied?" },
    { code: "q2", label: "Is the litter bin fixed properly?" },
    { code: "q3", label: "Is the litter bin free of damage?" },
    { code: "q4", label: "Is the lid present and functional?" },
    { code: "q5", label: "Is the surrounding area clean?" },
    { code: "q6", label: "Are twin bins separated correctly?" },
    { code: "q7", label: "Is branding / labeling visible?" },
    { code: "q8", label: "Is there any foul odor?" },
    { code: "q9", label: "Is overflow prevented?" },
    { code: "q10", label: "Overall condition compliant?" },
];

function extractPhotos(record: any): string[] {
    if (!record) return [];
    const rawPhotos: string[] = [];

    const addIfValid = (val: any) => {
        if (typeof val === 'string' && val.trim().length > 5 && val !== 'null' && val !== 'undefined') {
            rawPhotos.push(val.trim());
        }
    };

    // Direct fields on record
    addIfValid(record.photo);
    addIfValid(record.photoUrl);
    addIfValid(record.actionPhotoUrl);
    addIfValid(record.visit?.photoUrl);
    addIfValid(record.visit?.photo);

    // Payload fields
    if (record.payload) {
        addIfValid(record.payload.photo);
        addIfValid(record.payload.photoUrl);
        if (Array.isArray(record.payload.photos)) {
            record.payload.photos.forEach(addIfValid);
        }
    }

    // Inspection answers / Questionnaire
    let answers = record.inspectionAnswers || record.payload?.inspectionAnswers || record.questionnaire;
    if (typeof answers === 'string') {
        try { answers = JSON.parse(answers); } catch (e) {}
    }

    if (answers && typeof answers === 'object') {
        Object.values(answers).forEach((val: any) => {
            if (!val) return;
            if (typeof val === 'string') {
                if (val.startsWith('http') || val.startsWith('/') || val.startsWith('data:')) {
                    addIfValid(val);
                }
            } else if (typeof val === 'object') {
                addIfValid(val.photoUrl);
                addIfValid(val.photo);
                addIfValid(val.image);
                addIfValid(val.url);
                if (Array.isArray(val.photos)) {
                    val.photos.forEach(addIfValid);
                }
            }
        });
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const formatted = rawPhotos.map(url => {
        if (url.startsWith('/')) {
            return `${apiBase}${url}`;
        }
        return url;
    });

    return Array.from(new Set(formatted));
}

export default function LitterBinReviewModal({
    record,
    onClose,
    onApprove,
    onReject,
    onAssign
}: {
    record: any;
    onClose: () => void;
    onApprove: (record: any, remarks?: string) => Promise<void>;
    onReject: (record: any, remarks?: string) => Promise<void>;
    onAssign: (record: any) => void;
}) {
    const [remarks, setRemarks] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    // Extract submitter name
    const submitterName = record.submittedBy?.name || record.createdBy || "Supervisor";

    // Extract all evidence photos
    const photos = extractPhotos(record);

    const handleApproveClick = async () => {
        try {
            setSubmitting(true);
            await onApprove(record, remarks);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectClick = async () => {
        try {
            setSubmitting(true);
            await onReject(record, remarks);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const isPending = record.status === 'PENDING_QC' || record.status === 'PENDING' || record.status === 'SUBMITTED';

    // Format assessment entries
    let inspectionAnswers = record.inspectionAnswers || record.payload?.inspectionAnswers || record.questionnaire;
    if (typeof inspectionAnswers === 'string') {
        try { inspectionAnswers = JSON.parse(inspectionAnswers); } catch (e) {}
    }

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '24px'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '920px',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                animation: 'modalIn 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #f8fafc, #ffffff)' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Review Assessment</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                            Submitted by <strong>{submitterName}</strong> on {new Date(record.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontWeight: 800 }}>
                        ✕
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flex: 1 }}>
                    {/* Left Column: Location & Assessment Answers */}
                    <div style={{ padding: '32px', overflowY: 'auto', borderRight: '1px solid #f1f5f9' }}>
                        {/* Location Context */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                Location Context
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                                    {record.areaName || record.locationName || 'Litter Bin Location'}
                                </div>
                                {record.locationName && record.areaName && (
                                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                                        {record.locationName}
                                    </div>
                                )}
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                                    Zone: <strong>{record.zoneName || '—'}</strong> · Ward: <strong>{record.wardName || '—'}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Assigned Personnel */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Assigned Personnel / Staff
                                </div>
                                {(record.type === 'BIN_REGISTRATION' || record.type === 'BIN_REQUEST') && (
                                    <button
                                        style={{ fontSize: '11px', padding: '4px 10px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                        onClick={() => onAssign(record)}
                                    >
                                        + Assign Staff
                                    </button>
                                )}
                            </div>
                            {record.assignedEmployees && record.assignedEmployees.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {record.assignedEmployees.map((emp: any) => (
                                        <span key={emp.id} style={{
                                            fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px',
                                            background: emp.role === 'SUPERVISOR' ? '#eff6ff' : '#f0fdf4',
                                            color: emp.role === 'SUPERVISOR' ? '#1d4ed8' : '#15803d',
                                            border: `1px solid ${emp.role === 'SUPERVISOR' ? '#bfdbfe' : '#bbf7d0'}`
                                        }}>
                                            👤 {emp.name} ({emp.role ? emp.role.replace('_', ' ') : 'Staff'})
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No staff assigned yet.</div>
                            )}
                        </div>

                        {/* Assessment Answers */}
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                            Assessment Answers
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {inspectionAnswers && typeof inspectionAnswers === 'object' ? (
                                LITTERBIN_QUESTIONS.map((q) => {
                                    const entry = inspectionAnswers[q.code];
                                    const answer = typeof entry === 'object' ? entry?.answer : entry;
                                    const qPhoto = typeof entry === 'object' ? (entry?.photoUrl || entry?.photo) : null;
                                    if (answer === undefined && !inspectionAnswers[q.code]) return null;

                                    return (
                                        <div key={q.code} style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}>
                                                {q.label}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{
                                                    fontSize: '14px',
                                                    fontWeight: 700,
                                                    color: answer === "YES" || answer === true ? '#059669' : answer === "NO" || answer === false ? '#dc2626' : '#2563eb'
                                                }}>
                                                    {typeof answer === 'boolean' ? (answer ? "YES" : "NO") : (answer || "N/A")}
                                                </div>
                                                {qPhoto && (
                                                    <button
                                                        onClick={() => setPreviewPhoto(qPhoto)}
                                                        style={{
                                                            fontSize: '11px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                                                            borderRadius: '6px', padding: '3px 8px', fontWeight: 700, cursor: 'pointer'
                                                        }}
                                                    >
                                                        📷 View Photo
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : null}

                            {/* Default Fallback for Bin Request or items without Q1-Q10 */}
                            {(!inspectionAnswers || Object.keys(inspectionAnswers).length === 0) && (
                                <>
                                    <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}>
                                            Record Category / Type
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>
                                            {record.type?.replace(/_/g, " ") || 'Bin Registration'}
                                        </div>
                                    </div>
                                    <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}>
                                            Current QC Status
                                        </div>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: record.status === 'APPROVED' ? '#059669' : record.status === 'REJECTED' ? '#dc2626' : '#d97706'
                                        }}>
                                            {record.status?.replace(/_/g, " ")}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Evidence Photo & Review Decision */}
                    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', backgroundColor: '#f8fafc', overflowY: 'auto' }}>
                        {photos.length > 0 ? (
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                                    Evidence Photo ({photos.length})
                                </div>
                                {photos.length === 1 ? (
                                    <div
                                        onClick={() => setPreviewPhoto(photos[0])}
                                        style={{ borderRadius: '20px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                                    >
                                        <img src={photos[0]} alt="Assessment Evidence" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '350px', objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                        {photos.map((pUrl, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setPreviewPhoto(pUrl)}
                                                style={{ borderRadius: '14px', overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer', height: '140px' }}
                                            >
                                                <img src={pUrl} alt={`Evidence ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px border-dashed #cbd5e1', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                📷 No evidence photo uploaded for this report.
                            </div>
                        )}

                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                                Review Decision
                            </div>
                            <textarea
                                placeholder="Add remarks or feedback for the supervisor..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                style={{
                                    width: '100%', minHeight: '120px', padding: '16px', borderRadius: '16px',
                                    border: '1px solid #e2e8f0', fontSize: '14px', resize: 'none', outline: 'none',
                                    transition: 'border-color 0.2s', backgroundColor: 'white'
                                }}
                            />

                            {isPending && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                                    <button
                                        onClick={handleApproveClick}
                                        disabled={submitting}
                                        style={{
                                            backgroundColor: '#10b981', color: 'white', border: 'none', padding: '14px',
                                            borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                                        }}
                                    >
                                        {submitting ? "Processing..." : "Approve Report"}
                                    </button>
                                    <button
                                        onClick={handleRejectClick}
                                        disabled={submitting}
                                        style={{
                                            backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '14px',
                                            borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                                        }}
                                    >
                                        {submitting ? "Processing..." : "Reject Report"}
                                    </button>
                                </div>
                            )}

                            {!isPending && (
                                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                    <button
                                        onClick={onClose}
                                        style={{
                                            backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '12px 24px',
                                            borderRadius: '12px', fontWeight: 700, cursor: 'pointer'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo Lightbox Preview */}
            {previewPhoto && (
                <div
                    onClick={() => setPreviewPhoto(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 1100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
                    }}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img src={previewPhoto} alt="Full Preview" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
                        <button
                            onClick={() => setPreviewPhoto(null)}
                            style={{
                                position: 'absolute', top: '-16px', right: '-16px', background: 'white', color: '#0f172a',
                                border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontWeight: 800, cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
