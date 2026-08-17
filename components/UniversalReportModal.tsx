'use client';

import React, { useState } from 'react';
import { normalizeInspectionAnswers, NormalizedAnswer } from '@lib/reportAnswers';

export type UniversalReportModalProps = {
    moduleTitle: string;
    moduleBadge?: string;
    record: any;
    onClose: () => void;
    onApprove?: (record: any, remarks?: string) => Promise<void>;
    onReject?: (record: any, remarks?: string) => Promise<void>;
    onActionRequired?: (record: any, remarks?: string) => Promise<void>;
    onActionTaken?: (record: any, actionDescription: string, remarks?: string, photoUrl?: string) => Promise<void>;
    isAO?: boolean;
    userRoles?: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

function resolveUrl(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string' || url.trim().length < 5 || url === 'null' || url === 'undefined') return null;
    const u = url.trim();
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return `${API_BASE}${u}`;
    return u;
}

function StatusBadgeInline({ status }: { status: string }) {
    const map: Record<string, { bg: string; text: string; label: string }> = {
        APPROVED: { bg: '#dcfce7', text: '#15803d', label: 'APPROVED' },
        ACTION_TAKEN: { bg: '#f0fdf4', text: '#15803d', label: 'RESOLVED' },
        REJECTED: { bg: '#fee2e2', text: '#b91c1c', label: 'REJECTED' },
        ACTION_REQUIRED: { bg: '#fff7ed', text: '#c2410c', label: 'ACTION REQUIRED' },
        SUBMITTED: { bg: '#eff6ff', text: '#2563eb', label: 'SUBMITTED' },
        PENDING_QC: { bg: '#eff6ff', text: '#2563eb', label: 'PENDING REVIEW' },
        PENDING: { bg: '#f1f5f9', text: '#475569', label: 'PENDING' },
    };
    const s = map[status] || { bg: '#f1f5f9', text: '#475569', label: status.replace(/_/g, ' ') };
    return (
        <span style={{
            padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
            background: s.bg, color: s.text, letterSpacing: '0.02em', whiteSpace: 'nowrap',
            border: `1px solid ${s.text}33`
        }}>
            {s.label}
        </span>
    );
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
        </div>
    );
}

export default function UniversalReportModal({
    moduleTitle,
    moduleBadge = 'AUDIT LOG',
    record,
    onClose,
    onApprove,
    onReject,
    onActionRequired,
    onActionTaken,
    isAO = false,
    userRoles = []
}: UniversalReportModalProps) {
    const [remarks, setRemarks] = useState('');
    const [actionTakenText, setActionTakenText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    if (!record) return null;

    // Asset name
    const assetName = record.toilet?.name || record.beatName || record.areaName
        || record.locationName || record.feederPointName || record.locationDescription
        || record.name || 'Inspection Report';

    const assetType = record.toilet?.type || record.type || record.category || record.areaType || null;

    // Zone / Ward
    const zoneName = record.toilet?.zoneName || record.zoneName || record.zone?.name
        || record.beat?.zoneName || record.beat?.zone?.name
        || record.segment?.zoneName || record.payload?.zoneName
        || (record.zoneId ? `Zone ${record.zoneId}` : null) || 'Zone 1';

    const wardName = record.toilet?.wardName || record.wardName || record.ward?.name
        || record.beat?.wardName || record.beat?.ward?.name
        || record.segment?.wardName || record.payload?.wardName
        || (record.wardId ? `Ward ${record.wardId}` : null) || 'Ward 1';

    const beatName = record.beatName || record.beat?.name || null;
    const areaDetail = (record.areaName !== beatName ? record.areaName : null) || record.locationDescription || null;
    const segmentId = record.segmentId ? String(record.segmentId).split('-')[0] : null;

    // Submitter & Reviewer Name Extractor
    const resolvePersonName = (item: any): string | null => {
        if (!item) return null;
        if (typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed && trimmed.length < 50 && !trimmed.startsWith('cl') && trimmed !== 'Field Supervisor') return trimmed;
        }
        if (typeof item === 'object') {
            return item.name || item.fullName || item.userName || item.email || null;
        }
        return null;
    };

    const submitterName = resolvePersonName(record.supervisor)
        || resolvePersonName(record.employee)
        || resolvePersonName(record.submittedBy)
        || resolvePersonName(record.user)
        || resolvePersonName(record.createdBy)
        || resolvePersonName(record.createdByName)
        || resolvePersonName(record.requestedBy)
        || resolvePersonName(record.assignedEmployee)
        || resolvePersonName(record.payload?.submittedBy)
        || resolvePersonName(record.payload?.supervisor)
        || 'Supervisor';

    const submitterPhone = record.phone || record.supervisor?.phone || record.employee?.phone || record.user?.phone || '';

    // Date/time
    const dateObj = new Date(record.createdAt || record.updatedAt || Date.now());
    const formattedDate = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Status
    const status = (record.status || 'SUBMITTED').toUpperCase();
    const isActionRequired = status === 'ACTION_REQUIRED';
    const isFinalized = status === 'APPROVED' || status === 'REJECTED' || status === 'ACTION_TAKEN';
    const isPending = !isActionRequired && !isFinalized;

    // Parse Q&A
    const parsedAnswers: NormalizedAnswer[] = normalizeInspectionAnswers(record);

    // Resolve answer photo URLs
    const resolvedAnswers = parsedAnswers.map(a => ({
        ...a,
        photos: a.photos.map(p => resolveUrl(p)).filter(Boolean) as string[]
    }));

    // Gather ALL evidence photos from record fields & Q&A responses
    const allEvidencePhotos: string[] = [];
    const addPhoto = (p: any) => {
        if (!p) return;
        if (Array.isArray(p)) {
            p.forEach(addPhoto);
            return;
        }
        const resolved = resolveUrl(p);
        if (resolved && !allEvidencePhotos.includes(resolved)) {
            allEvidencePhotos.push(resolved);
        }
    };

    // Direct record fields
    addPhoto(record.photo);
    addPhoto(record.photoUrl);
    addPhoto(record.photos);
    addPhoto(record.images);
    addPhoto(record.actionPhotoUrl);
    addPhoto(record.aoPhoto);

    // Visit / Bin / Payload nested objects
    addPhoto(record.visit?.photoUrl);
    addPhoto(record.visit?.photo);
    addPhoto(record.visit?.photos);
    addPhoto(record.visit?.images);

    addPhoto(record.binReport?.photoUrl);
    addPhoto(record.binReport?.photo);
    addPhoto(record.binReport?.photos);
    addPhoto(record.binReport?.images);

    addPhoto(record.payload?.photo);
    addPhoto(record.payload?.photoUrl);
    addPhoto(record.payload?.photos);
    addPhoto(record.payload?.images);

    addPhoto(record.questionnaire?.photo);
    addPhoto(record.questionnaire?.photoUrl);
    addPhoto(record.questionnaire?.photos);
    addPhoto(record.questionnaire?.images);

    addPhoto(record.inspectionAnswers?.photo);
    addPhoto(record.inspectionAnswers?.photoUrl);
    addPhoto(record.inspectionAnswers?.photos);
    addPhoto(record.inspectionAnswers?.images);

    addPhoto(record.answers?.photo);
    addPhoto(record.answers?.photoUrl);
    addPhoto(record.answers?.photos);
    addPhoto(record.answers?.images);

    // Deep scan questionnaire, inspectionAnswers & answers object values for image URLs
    const scanObjectPhotos = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        Object.values(obj).forEach(val => {
            if (!val) return;
            if (typeof val === 'string') addPhoto(val);
            else if (typeof val === 'object') {
                addPhoto((val as any).photoUrl || (val as any).photo_url || (val as any).photo || (val as any).image || (val as any).imageUrl || (val as any).image_url || (val as any).photos || (val as any).images || (val as any).url);
            }
        });
    };
    scanObjectPhotos(record.questionnaire);
    scanObjectPhotos(record.inspectionAnswers);
    scanObjectPhotos(record.answers);
    scanObjectPhotos(record.payload?.questionnaire);
    scanObjectPhotos(record.payload?.inspectionAnswers);
    scanObjectPhotos(record.payload?.answers);

    // Question answers photos
    resolvedAnswers.forEach(a => a.photos.forEach(addPhoto));

    // Action handlers
    const wrap = (fn: () => Promise<void>) => async () => {
        try { setSubmitting(true); await fn(); onClose(); }
        catch (err: any) { alert(err?.message || 'Action failed'); }
        finally { setSubmitting(false); }
    };
    const handleApprove = wrap(async () => { if (onApprove) await onApprove(record, remarks); });
    const handleReject = wrap(async () => { if (onReject) await onReject(record, remarks); });
    const handleActionReq = wrap(async () => { if (onActionRequired) await onActionRequired(record, remarks); });
    const handleActionTaken = wrap(async () => {
        if (!onActionTaken) return;
        if (!actionTakenText.trim()) throw new Error('Please describe the action taken.');
        await onActionTaken(record, actionTakenText, remarks);
    });

    const qcComment = record.qcComment || record.comment || record.reviewerNote || null;
    const actionNote = record.actionNote || record.aoNote || record.aoRemark || null;
    const reviewerRaw = record.reviewedByQc?.name || record.qcReviewer?.name || record.approvedBy?.name
        || (typeof record.reviewedBy === 'object' ? record.reviewedBy?.name : record.reviewedBy)
        || (typeof record.approvedBy === 'object' ? record.approvedBy?.name : record.approvedBy)
        || (typeof record.qcReviewer === 'object' ? record.qcReviewer?.name : record.qcReviewer)
        || record.actionTakenBy?.name || record.actionTakenBy
        || record.payload?.reviewedBy?.name || record.payload?.approvedBy?.name || null;

    let reviewerName = resolvePersonName(reviewerRaw);
    if (!reviewerName && typeof reviewerRaw === 'string' && !reviewerRaw.includes('-') && reviewerRaw.length < 40) {
        reviewerName = reviewerRaw;
    }
    if (!reviewerName && (status === 'APPROVED' || status === 'REJECTED' || status === 'ACTION_TAKEN')) {
        reviewerName = 'Indore QC Officer';
    }

    const reviewedAtRaw = record.reviewedAt || record.approvedAt || record.updatedAt || null;
    const formattedReviewedAt = reviewedAtRaw ? new Date(reviewedAtRaw).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }} />

            {/* Scroll Container */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto', pointerEvents: 'none' }}>
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        pointerEvents: 'all', background: '#ffffff', borderRadius: '20px',
                        width: '100%', maxWidth: '920px', maxHeight: '88vh',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                >
                    {/* MODAL HEADER */}
                    <div style={{
                        background: '#ffffff', borderBottom: '1px solid #f1f5f9',
                        padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 700 }}>{assetName}</h2>
                                <StatusBadgeInline status={status} />
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>
                                {moduleTitle} • Report ID: {record.id.slice(0, 12)}
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                        >
                            Close
                        </button>
                    </div>

                    {/* MODAL BODY */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                        {/* LEFT COLUMN: Metadata & Question Responses */}
                        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* Meta Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Location Context</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <MetaRow label="Zone" value={zoneName} />
                                        <MetaRow label="Ward" value={wardName} />
                                        {beatName && <MetaRow label="Beat" value={beatName} />}
                                        {areaDetail && <MetaRow label="Area" value={areaDetail} />}
                                        {segmentId && <MetaRow label="Segment" value={segmentId} />}
                                        {assetType && <MetaRow label="Asset Type" value={String(assetType)} />}
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>User & Submission</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <MetaRow label="Submitted By" value={submitterName} />
                                        {submitterPhone && <MetaRow label="Contact Phone" value={submitterPhone} />}
                                        <MetaRow label="Date" value={formattedDate} />
                                        <MetaRow label="Time" value={formattedTime} />
                                        {reviewerName && <MetaRow label="Reviewed By" value={reviewerName} />}
                                    </div>
                                </div>
                            </div>

                            {/* Evidence Photos (Small Thumbnails Box) */}
                            {allEvidencePhotos.length > 0 && (
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                        Evidence Photos ({allEvidencePhotos.length})
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {allEvidencePhotos.map((url, i) => (
                                            <div
                                                key={i}
                                                onClick={() => setPreviewPhoto(url)}
                                                style={{
                                                    width: 64, height: 64, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                                                    border: '1.5px solid #cbd5e1', position: 'relative', background: '#e2e8f0',
                                                    transition: 'transform 0.15s, border-color 0.15s'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                title="Click to view full image"
                                            >
                                                <img src={url} alt={`Evidence ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Review Notes & Audit Trail */}
                            {(qcComment || actionNote || reviewerName || formattedReviewedAt) && (
                                <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '12px 14px', border: '1px solid #bfdbfe' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: 6 }}>Audit Review Notes</div>
                                    {reviewerName && <div style={{ fontSize: '11px', color: '#475569', marginBottom: 2 }}>Reviewed By: <strong>{reviewerName}</strong></div>}
                                    {formattedReviewedAt && <div style={{ fontSize: '11px', color: '#475569', marginBottom: 4 }}>Reviewed Date: <strong>{formattedReviewedAt}</strong></div>}
                                    {qcComment && <div style={{ fontSize: '12px', color: '#1e293b', marginTop: 4 }}><strong>QC Remarks:</strong> {qcComment}</div>}
                                    {actionNote && <div style={{ fontSize: '12px', color: '#15803d', marginTop: 4 }}><strong>Action Description:</strong> {actionNote}</div>}
                                </div>
                            )}

                            {/* Inspection Responses or Registration Specs */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                        {resolvedAnswers.length > 0 ? 'Inspection Responses' : 'Asset Registration Specifications'}
                                    </h3>
                                    {resolvedAnswers.length > 0 && (
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>{resolvedAnswers.length} Questions Answered</span>
                                    )}
                                </div>

                                {resolvedAnswers.length === 0 ? (
                                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', marginBottom: 2 }}>
                                            📋 Registered Asset Information
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            <MetaRow label="Asset Name" value={assetName} />
                                            <MetaRow label="Asset ID" value={record.id || 'N/A'} />
                                            <MetaRow label="Category / Type" value={assetType || record.areaType || 'Twin Bin Asset'} />
                                            <MetaRow label="Capacity" value={record.capacity || record.holdingCapacity || '120L / 240L'} />
                                            <MetaRow label="Zone" value={zoneName} />
                                            <MetaRow label="Ward" value={wardName} />
                                            <MetaRow label="GPS Coordinates" value={`${record.latitude || record.lat || '22.7196'}°, ${record.longitude || record.lng || '75.8577'}°`} />
                                            <MetaRow label="Registration Status" value={status} />
                                        </div>
                                        {record.address && (
                                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                                                <MetaRow label="Address / Landmark" value={record.address || record.locationName || 'Main Hub'} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {resolvedAnswers.map((item, idx) => {
                                            const upper = item.answerText.toUpperCase();
                                            const isYes = upper === 'YES' || upper === 'TRUE';
                                            const isNo = upper === 'NO' || upper === 'FALSE';
                                            return (
                                                <div key={idx} style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                                                            {item.questionText}
                                                        </div>
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                                                            background: isYes ? '#dcfce7' : isNo ? '#fee2e2' : '#eff6ff',
                                                            color: isYes ? '#15803d' : isNo ? '#b91c1c' : '#2563eb'
                                                        }}>
                                                            {item.answerText}
                                                        </span>
                                                    </div>

                                                    {item.photos && item.photos.length > 0 && (
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                                                            {item.photos.map((photoUrl, pIdx) => (
                                                                <div
                                                                    key={pIdx}
                                                                    onClick={() => setPreviewPhoto(photoUrl)}
                                                                    style={{
                                                                        width: 50, height: 50, borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                                                                        border: '1px solid #cbd5e1', background: '#e2e8f0', transition: 'transform 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                                    title="Click to view full photo"
                                                                >
                                                                    <img src={photoUrl} alt={`Q Answer Photo ${pIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: QC Action Controls */}
                        <div style={{ background: '#f8fafc', padding: '20px 18px', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>QC Review & Actions</h3>

                            {isPending && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>QC Remarks / Reason</label>
                                        <textarea
                                            value={remarks}
                                            onChange={e => setRemarks(e.target.value)}
                                            placeholder="Enter inspection feedback..."
                                            rows={3}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#ffffff', resize: 'vertical' }}
                                        />
                                    </div>

                                    {onApprove && (
                                        <button
                                            onClick={handleApprove}
                                            disabled={submitting}
                                            style={{ padding: '10px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Approve Report
                                        </button>
                                    )}

                                    {onActionRequired && (
                                        <button
                                            onClick={handleActionReq}
                                            disabled={submitting}
                                            style={{ padding: '10px', borderRadius: '8px', border: 'none', background: '#ea580c', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Action Required
                                        </button>
                                    )}

                                    {onReject && (
                                        <button
                                            onClick={handleReject}
                                            disabled={submitting}
                                            style={{ padding: '10px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Reject Report
                                        </button>
                                    )}
                                </div>
                            )}

                            {isActionRequired && isAO && onActionTaken && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Action Taken Resolution Description</label>
                                        <textarea
                                            value={actionTakenText}
                                            onChange={e => setActionTakenText(e.target.value)}
                                            placeholder="Describe resolution action completed..."
                                            rows={3}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#ffffff' }}
                                        />
                                    </div>

                                    <button
                                        onClick={handleActionTaken}
                                        disabled={submitting}
                                        style={{ padding: '10px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Mark Action Taken
                                    </button>
                                </div>
                            )}

                            {isFinalized && (
                                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                                    Audit Record Finalized: <strong style={{ color: '#0f172a' }}>{status}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LIGHTBOX ENLARGED PHOTO PREVIEW OVERLAY */}
            {previewPhoto && (
                <div onClick={() => setPreviewPhoto(null)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '850px', maxHeight: '85vh', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}>
                            <button
                                onClick={() => setPreviewPhoto(null)}
                                style={{ background: 'rgba(15,23,42,0.8)', border: 'none', color: '#ffffff', width: 34, height: 34, borderRadius: '50%', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                ✕
                            </button>
                        </div>
                        <img src={previewPhoto} alt="Enlarged Evidence" style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', objectFit: 'contain' }} />
                    </div>
                </div>
            )}
        </>
    );
}
