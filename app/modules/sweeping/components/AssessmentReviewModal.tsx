'use client';

import React, { useState } from "react";
import { ModuleRecordsApi, StorageApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

type Question = {
    code: string;
    label: string;
};

const SWEEPING_QUESTIONS: Question[] = [
    { code: "Q1", label: "Is sweeping done on this beat today?" },
    { code: "Q2", label: "How many times is sweeping done in a day?" },
    { code: "Q3", label: "Is sweeping done as per prescribed frequency?" },
    { code: "Q4", label: "Is the entire beat properly cleaned?" },
    { code: "Q5", label: "Is any litter visible after sweeping?" },
    { code: "Q6", label: "Is sanitation worker present?" },
    { code: "Q7", label: "Is sanitation worker wearing complete PPE?" },
    { code: "Q8", label: "Type of road" },
    { code: "Q9", label: "Is this a major / 4 lane road?" },
    { code: "Q10", label: "Is mechanized sweeping required?" },
    { code: "Q11", label: "Is mechanized sweeping happening?" },
    { code: "Q12", label: "Any Garbage Vulnerable Point observed?" },
    { code: "Q13", label: "If yes, is GVP cleaned regularly?" },
    { code: "Q14", label: "Any C&D waste found?" },
    { code: "Q15", label: "Resident Name / Mobile / Address" },
    { code: "Q16", label: "Resident says sweeping frequency" },
    { code: "Q17", label: "Is beat cleaned as per standards?" },
    { code: "Q18", label: "Overall cleanliness" },
    { code: "Q19", label: "Remarks" },
];

export default function AssessmentReviewModal({ record, onClose, onRefresh }: { record: any; onClose: () => void; onRefresh: () => void }) {
    const { user } = useAuth();
    const [remarks, setRemarks] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [actionTaken, setActionTaken] = useState("");
    const [aoPhoto, setAoPhoto] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const isAO = user?.roles?.includes("ACTION_OFFICER");
    const isActionRequiredFlow = record.status === 'ACTION_REQUIRED' && isAO;

    const handleUpdate = async (status: string) => {
        try {
            setSubmitting(true);
            await ModuleRecordsApi.updateRecordStatus("SWEEPING", record.id, status, remarks);
            onRefresh();
            onClose();
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update status");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAoSubmit = async () => {
        if (!actionTaken) return alert("Please describe the action taken");
        try {
            setSubmitting(true);
            await ModuleRecordsApi.updateRecordStatus("SWEEPING", record.id, "ACTION_TAKEN", remarks, {
                actionTaken,
                aoRemark: remarks,
                aoPhoto
            });
            onRefresh();
            onClose();
        } catch (err) {
            console.error("Failed to submit action", err);
            alert("Failed to submit action");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const { url } = await StorageApi.upload(file);
            // Construct full URL for display if it's relative
            const fullUrl = url.startsWith('/') ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') + url : url;
            setAoPhoto(fullUrl);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    const payload = record.payload || {};
    const photoUrl = payload.photo || payload.photoUrl;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '24px'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '900px',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                animation: 'modalIn 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #f8fafc, #ffffff)' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Review Assessment</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                            Submitted by <strong>{record.createdBy}</strong> on {new Date(record.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                        ✕
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', flex: 1 }}>
                    {/* Left Column: Details */}
                    <div style={{ padding: '32px', overflowY: 'auto', borderRight: '1px solid #f1f5f9' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Location Context</div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{record.beatName}</div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Segment: {record.segmentId}</div>
                            </div>
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>Assessment Answers</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {SWEEPING_QUESTIONS.map((q) => {
                                const answer = payload[q.code];
                                return (
                                    <div key={q.code} style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}>{q.label}</div>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: answer === "YES" || answer === true ? '#059669' : answer === "NO" || answer === false ? '#dc2626' : '#2563eb'
                                        }}>
                                            {typeof answer === 'boolean' ? (answer ? "YES" : "NO") : (answer || "N/A")}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column: Image & Actions */}
                    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', backgroundColor: '#f8fafc', overflowY: 'auto' }}>
                        {payload.actionTaken && (
                            <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '16px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>Action Officer Action</div>
                                <div style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: 600 }}>{payload.actionTaken}</div>
                                {payload.aoPhoto && (
                                    <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white' }}>
                                        <img src={payload.aoPhoto} alt="Action Evidence" style={{ width: '100%', height: 'auto' }} />
                                    </div>
                                )}
                            </div>
                        )}

                        {photoUrl && (
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Evidence Photo</div>
                                <div style={{ borderRadius: '20px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                    <img src={photoUrl} alt="Assessment Evidence" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                            </div>
                        )}

                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Review Decision</div>
                            <textarea
                                placeholder="Add remarks or feedback for the employee..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                style={{
                                    width: '100%', minHeight: '120px', padding: '16px', borderRadius: '16px',
                                    border: '1px solid #e2e8f0', fontSize: '14px', resize: 'none', outline: 'none',
                                    transition: 'border-color 0.2s', backgroundColor: 'white'
                                }}
                            />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                                {isActionRequiredFlow ? (
                                    <>
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Action Implementation</div>
                                        <textarea
                                            placeholder="Describe what action was taken..."
                                            value={actionTaken}
                                            onChange={(e) => setActionTaken(e.target.value)}
                                            style={{
                                                width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px',
                                                border: '1px solid #e2e8f0', fontSize: '14px', resize: 'none', outline: 'none',
                                                backgroundColor: 'white'
                                            }}
                                        />

                                        <div style={{ marginTop: '8px' }}>
                                            <label style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                backgroundColor: '#f1f5f9', padding: '10px 16px', borderRadius: '10px',
                                                cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569'
                                            }}>
                                                📷 {uploading ? "Uploading..." : (aoPhoto ? "Change Photo" : "Upload Action Photo")}
                                                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                                            </label>
                                            {aoPhoto && (
                                                <div style={{ marginTop: '8px', position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                                    <img src={aoPhoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleAoSubmit}
                                            disabled={submitting || uploading}
                                            style={{
                                                backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '14px',
                                                borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', marginTop: '12px'
                                            }}
                                        >
                                            {submitting ? "Submitting..." : "Submit to City Admin"}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleUpdate('APPROVED')}
                                            disabled={submitting}
                                            style={{
                                                backgroundColor: '#10b981', color: 'white', border: 'none', padding: '14px',
                                                borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                                            }}
                                        >
                                            Approve Report
                                        </button>
                                        <button
                                            onClick={() => handleUpdate('ACTION_REQUIRED')}
                                            disabled={submitting}
                                            style={{
                                                backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '14px',
                                                borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)'
                                            }}
                                        >
                                            Action Required
                                        </button>
                                        <button
                                            onClick={() => handleUpdate('REJECTED')}
                                            disabled={submitting}
                                            style={{
                                                backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '14px',
                                                borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                                            }}
                                        >
                                            Reject Report
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <style jsx>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          button:hover { filter: brightness(0.95); transform: translateY(-1px); }
          button:active { transform: translateY(0); }
        `}</style>
            </div>
        </div>
    );
}
