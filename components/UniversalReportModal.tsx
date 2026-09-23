'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeInspectionAnswers, NormalizedAnswer } from '@lib/reportAnswers';
import { resolveMediaUrl } from '@lib/mediaUrl';
import { useAuth } from '@hooks/useAuth';

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

function resolveUrl(url: string | null | undefined): string | null {
    return resolveMediaUrl(url);
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
    const { user } = useAuth();
    const [remarks, setRemarks] = useState('');
    const [actionTakenText, setActionTakenText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    // Determine role permissions accurately
    const userRolesFromAuth = user?.roles || (user?.role ? [user.role] : []);
    let userRolesFromStorage: string[] = [];
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('user') || localStorage.getItem('swachh_user');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed?.roles)) userRolesFromStorage = parsed.roles;
                else if (parsed?.role) userRolesFromStorage = [parsed.role];
            }
        } catch (_) { }
    }

    const allRoles = Array.from(new Set([
        ...userRoles,
        ...userRolesFromAuth,
        ...userRolesFromStorage
    ].map(r => String(r).toUpperCase())));

    const isAdminOrQC = allRoles.includes('CITY_ADMIN') || allRoles.includes('QC') || allRoles.includes('HMS_SUPER_ADMIN') || allRoles.includes('COMMISSIONER');
    const isUserAO = !isAdminOrQC && (isAO || allRoles.includes('ACTION_OFFICER') || allRoles.includes('AO'));

    if (!record) return null;

    // Asset name
    const assetName = record.toilet?.name || record.beatName || record.areaName
        || record.locationName || record.feederPointName || record.locationDescription
        || record.name || 'Inspection Report';

    // Parse Q&A
    const parsedAnswers: NormalizedAnswer[] = normalizeInspectionAnswers(record);

    // Resolve answer photo URLs
    const resolvedAnswers = parsedAnswers.map(a => ({
        ...a,
        photos: a.photos.map(p => resolveUrl(p)).filter(Boolean) as string[]
    }));

    const isRegistrationRequest = record._type === 'REGISTRATION' || record.isRegistration || (resolvedAnswers.length === 0 && !record.answers && !record.questionnaire);

    const assetType = record.toilet?.type || record.type || record.category || record.areaType || null;

    const cleanGeoName = (val: any) => {
        if (!val || typeof val !== 'string') return null;
        const str = val.trim();
        if (str.includes('-') && str.length > 20) return null;
        return str;
    };

    // Zone / Ward
    const rawZone = record.toilet?.ward?.parent?.name || record.toilet?.zoneName || record.zoneName || record.zone?.name
        || record.ward?.parent?.name || record.beat?.zoneName || record.beat?.zone?.name
        || record.segment?.zoneName || record.payload?.zoneName;

    const zoneName = cleanGeoName(rawZone)
        || (record.zoneId && !String(record.zoneId).includes('-') ? `Zone ${record.zoneId}` : null)
        || 'Zone 1';

    const rawWard = record.toilet?.ward?.name || record.toilet?.wardName || record.wardName || record.ward?.name
        || record.beat?.wardName || record.beat?.ward?.name
        || record.segment?.wardName || record.payload?.wardName;

    const wardName = cleanGeoName(rawWard)
        || (record.wardId && !String(record.wardId).includes('-') ? `Ward ${record.wardId}` : null)
        || 'Ward 1';

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
        || 'Daroga';

    const submitterPhone = record.phone || record.supervisor?.phone || record.employee?.phone || record.user?.phone || '';

    const titleLower = (moduleTitle || '').toLowerCase();
    const isSweepingModule = titleLower.includes('sweeping') || titleLower.includes('beat');



    const isLitterbinModule = titleLower.includes('litter') || titleLower.includes('twinbin') || titleLower.includes('bin');
    const isToiletModule = titleLower.includes('toilet');

    const assetLabel = isSweepingModule
        ? 'Beat Name'
        : isLitterbinModule
            ? 'Litter Bin Name'
            : isToiletModule
                ? 'Toilet Name'
                : 'Asset Name';

    // Date/time
    const dateObj = new Date(record.createdAt || record.updatedAt || Date.now());
    const formattedDate = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Status
    const status = (record.status || 'SUBMITTED').toUpperCase();
    const isActionRequired = status === 'ACTION_REQUIRED';
    const isFinalized = status === 'APPROVED' || status === 'REJECTED' || status === 'ACTION_TAKEN';
    const isPending = !isActionRequired && !isFinalized;

    /*
     * AI VISUAL REVIEW
     *
     * IMPORTANT:
     * This data is READ ONLY.
     * It must never change QC / ULB / AO status automatically.
     */
    const aiResult =
        record.autoQcResult ||
        record.payload?.autoQcResult ||
        record.qcAiResult ||
        record.payload?.qcAiResult ||
        null;

    const rawAiChecks = Array.isArray(aiResult?.checks)
        ? aiResult.checks
        : Array.isArray(aiResult?.pointFindings)
            ? aiResult.pointFindings
            : [];

    const getAiQuestionLabel = (check: any, index: number) => {
        const rawCode = String(
            check?.questionCode ||
            check?.code ||
            check?.pointCode ||
            check?.question ||
            ""
        ).trim();

        /*
         * Display-only simplification:
         * PT01 / CT01 / U01 / L1 / S1 -> Q1
         *
         * Original backend code remains unchanged.
         */
        const numberMatch = rawCode.match(/(\d+)$/);

        if (numberMatch) {
            const questionNumber = Number(numberMatch[1]);

            if (Number.isFinite(questionNumber) && questionNumber > 0) {
                return `Q${questionNumber}`;
            }
        }

        return `Q${index + 1}`;
    };

    const aiChecks = rawAiChecks.map((check: any, index: number) => ({
        ...check,
        displayQuestion: getAiQuestionLabel(check, index),
        displayResult: String(
            check?.result ||
            check?.status ||
            check?.decision ||
            "NOT_VERIFIABLE"
        ).toUpperCase(),
        displayReason:
            check?.reason ||
            check?.visualFinding ||
            check?.finding ||
            check?.summary ||
            ""
    }));

    const aiInsights = Array.isArray(aiResult?.additionalInsights)
        ? aiResult.additionalInsights
        : [];

    const aiDecision = String(
        aiResult?.decision ||
        aiResult?.result ||
        ""
    ).toUpperCase();

    const rawAiConfidence = Number(aiResult?.confidence);

    const aiConfidence = Number.isFinite(rawAiConfidence)
        ? (
            rawAiConfidence <= 1
                ? Math.round(rawAiConfidence * 100)
                : Math.round(rawAiConfidence)
        )
        : null;

    const hasAiReview =
        Boolean(aiResult) &&
        (
            Boolean(aiDecision) ||
            aiChecks.length > 0 ||
            aiInsights.length > 0
        );




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
        if (!actionTakenText.trim()) throw new Error('Please describe the action taken.');
        if (onActionTaken) {
            await onActionTaken(record, actionTakenText, remarks);
        } else if (onApprove) {
            await onApprove(record, actionTakenText || remarks);
        } else if (onReject) {
            await onReject(record, actionTakenText || remarks);
        }
    });

    const isCityAdminUser = allRoles.includes('CITY_ADMIN') || allRoles.includes('CITYADMIN');
    const isQcUser = !isCityAdminUser && (allRoles.includes('QC') || allRoles.includes('QC_OFFICER'));

    const actionPanelTitle = isUserAO
        ? 'IEC Action Panel'
        : isCityAdminUser
            ? 'City Admin Review & Actions'
            : isQcUser
                ? 'SI Review & Actions'
                : 'Review & Actions';

    const remarksLabel = isCityAdminUser
        ? 'City Admin Remarks / Reason'
        : isQcUser
            ? 'SI Remarks / Reason'
            : 'Review Remarks / Reason';

    const remarksPlaceholder = isCityAdminUser
        ? 'Enter City Admin remarks...'
        : isQcUser
            ? 'Enter SI inspection feedback...'
            : 'Enter review feedback...';

    const qcComment = record.qcComment || record.comment || record.reviewerNote || null;
    const actionNote = record.actionNote || record.aoNote || record.aoRemark || null;
    const reviewerRaw = record.reviewedByQc?.name || record.qcReviewer?.name || record.approvedBy?.name
        || (typeof record.reviewedBy === 'object' ? (record.reviewedBy?.name || record.reviewedBy?.fullName || record.reviewedBy?.userName) : record.reviewedBy)
        || (typeof record.approvedBy === 'object' ? (record.approvedBy?.name || record.approvedBy?.fullName || record.approvedBy?.userName) : record.approvedBy)
        || (typeof record.qcReviewer === 'object' ? (record.qcReviewer?.name || record.qcReviewer?.fullName || record.qcReviewer?.userName) : record.qcReviewer)
        || record.actionTakenBy?.name || record.actionTakenBy
        || record.payload?.reviewedBy?.name || record.payload?.approvedBy?.name || null;

    let reviewerName = resolvePersonName(reviewerRaw);
    if (!reviewerName && typeof reviewerRaw === 'string' && !reviewerRaw.includes('-') && reviewerRaw.length < 40) {
        reviewerName = reviewerRaw;
    }

    let reviewerRoleText = '';
    const rawRole = record.reviewedByRole || record.approvedByRole || record.reviewedBy?.role || record.approvedBy?.role || null;
    if (rawRole) {
        reviewerRoleText = String(rawRole).toUpperCase() === 'CITY_ADMIN' ? 'City Admin' : String(rawRole).toUpperCase() === 'QC' ? 'Sanitary Inspector' : String(rawRole);
    } else if (record.reviewedByQc || record.qcReviewer) {
        reviewerRoleText = 'Sanitary Inspector';
    }

    if (
        !reviewerName &&
        (
            status === 'APPROVED' ||
            status === 'REJECTED' ||
            status === 'ACTION_TAKEN'
        )
    ) {
        /*
         * Reviewer identity must come only from the
         * inspection workflow data.
         *
         * Never use the currently logged-in viewer.
         */
        reviewerName = null;
        reviewerRoleText = '';
    }

    const reviewedAtRaw = record.reviewedAt || record.approvedAt || record.updatedAt || null;
    const formattedReviewedAt = reviewedAtRaw ? new Date(reviewedAtRaw).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;


    /* =========================================================
       COMMISSIONER AUDIT VIEW
       Read-only executive inspection lifecycle.
       Existing QC / Admin / AO action logic below is untouched.
    ========================================================= */

    const isCommissionerUser =
        allRoles.includes('COMMISSIONER');

    const safeText = (
        ...values: any[]
    ): string | null => {
        for (const value of values) {
            if (
                value === null ||
                value === undefined
            ) {
                continue;
            }

            if (typeof value === 'string') {
                const cleaned =
                    value.trim();

                if (
                    cleaned &&
                    cleaned !== '-' &&
                    cleaned.toLowerCase() !== 'null' &&
                    cleaned.toLowerCase() !== 'undefined'
                ) {
                    return cleaned;
                }
            }

            if (
                typeof value === 'number' &&
                Number.isFinite(value)
            ) {
                return String(value);
            }
        }

        return null;
    };

    const looksLikeUuid = (
        value: any
    ) =>
        typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value.trim()
        );

    const formatAuditDateTime = (
        value: any
    ) => {
        if (!value) {
            return null;
        }

        const parsed =
            new Date(value);

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {
            return null;
        }

        return parsed.toLocaleString(
            'en-IN',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    };

    const sweepingEvidencePoints = (() => {
        if (!isSweepingModule) {
            return [];
        }

        const payloadPoints =
            Array.isArray(
                record.payload?.points
            )
                ? record.payload.points
                : [];

        const directPoints =
            Array.isArray(
                record.beatPoints
            )
                ? record.beatPoints
                : [];

        const configuredPoints =
            Array.isArray(
                record.beat?.points
            )
                ? record.beat.points
                : Array.isArray(
                    record.segment?.beat?.points
                )
                    ? record.segment.beat.points
                    : [];

        const maxLength =
            Math.max(
                payloadPoints.length,
                directPoints.length,
                configuredPoints.length
            );

        const points: any[] = [];

        for (
            let index = 0;
            index < maxLength;
            index += 1
        ) {
            const submitted =
                payloadPoints[index] || {};

            const direct =
                directPoints[index] || {};

            const configured =
                configuredPoints[index] || {};

            const pointName =
                safeText(
                    submitted.pointName,
                    direct.pointName,
                    configured.pointName,
                    configured.name,
                    configured.label
                ) ||
                `Point ${index + 1}`;

            const pointCode =
                safeText(
                    submitted.pointCode,
                    direct.pointCode,
                    configured.pointCode,
                    configured.code
                ) ||
                `P${index + 1}`;

            const pointType =
                safeText(
                    submitted.pointType,
                    direct.pointType,
                    configured.pointType,
                    configured.type
                );

            const submittedTime =
                formatAuditDateTime(
                    submitted.submittedAt ||
                    direct.submittedAt
                );

            const distance =
                submitted.distanceMeters ??
                direct.distanceMeters ??
                null;

            const photos: string[] = [];

            const addPointPhoto = (
                value: any
            ) => {
                if (!value) {
                    return;
                }

                if (Array.isArray(value)) {
                    value.forEach(
                        addPointPhoto
                    );
                    return;
                }

                if (
                    typeof value === 'object'
                ) {
                    addPointPhoto(
                        value.photo ||
                        value.photoUrl ||
                        value.image ||
                        value.imageUrl ||
                        value.url
                    );
                    return;
                }

                const resolved =
                    resolveUrl(
                        String(value)
                    );

                if (
                    resolved &&
                    !photos.includes(
                        resolved
                    )
                ) {
                    photos.push(
                        resolved
                    );
                }
            };

            addPointPhoto(
                submitted.photo
            );
            addPointPhoto(
                submitted.photoUrl
            );
            addPointPhoto(
                submitted.photos
            );
            addPointPhoto(
                submitted.image
            );
            addPointPhoto(
                submitted.imageUrl
            );
            addPointPhoto(
                direct.photo
            );
            addPointPhoto(
                direct.photoUrl
            );
            addPointPhoto(
                direct.photos
            );
            addPointPhoto(
                direct.image
            );
            addPointPhoto(
                direct.imageUrl
            );

            points.push({
                index,
                pointName,
                pointCode,
                pointType,
                submittedTime,
                distance,
                photos
            });
        }

        return points;
    })();

    const normalizeAuditStatus = (
        value: any
    ) =>
        String(
            value || ''
        )
            .trim()
            .toUpperCase();

    /*
     * Current operational status.
     *
     * Litter Bin may retain the QC status in record.status
     * while corrective-action state advances separately in
     * actionStatus. ACTION_REQUIRED / ACTION_TAKEN therefore
     * take precedence when explicitly present.
     */
    const recordStatus =
        normalizeAuditStatus(
            record.status
        );

    const workspaceStatus =
        normalizeAuditStatus(
            record.workspaceStatus
        );

    const actionStatus =
        normalizeAuditStatus(
            record.actionStatus
        );

    const currentAuditStatus =
        actionStatus === 'ACTION_TAKEN'
            ? 'ACTION_TAKEN'
            : actionStatus === 'ACTION_REQUIRED'
                ? 'ACTION_REQUIRED'
                : workspaceStatus ||
                  recordStatus ||
                  'SUBMITTED';

    /*
     * SI decision is intentionally separate from the current
     * workflow state so an escalated/resolved report still shows
     * its original SI verdict.
     */
    const siDecision =
        normalizeAuditStatus(
            record.qcDecision ||
            record.siDecision ||
            record.reviewDecision
        ) ||
        (
            currentAuditStatus === 'APPROVED' ||
            currentAuditStatus === 'REJECTED'
                ? currentAuditStatus
                : ''
        );

    const siName =
        resolvePersonName(
            record.reviewedByQc
        ) ||
        resolvePersonName(
            record.reviewedBy
        ) ||
        resolvePersonName(
            record.qcReviewer
        ) ||
        resolvePersonName(
            record.sanitaryInspector
        ) ||
        reviewerName ||
        null;

    const ulbName =
        resolvePersonName(
            record.ulbReviewer
        ) ||
        resolvePersonName(
            record.ulbReviewedByName
        ) ||
        resolvePersonName(
            record.ulbOfficerName
        ) ||
        resolvePersonName(
            record.ulbReviewerName
        ) ||
        resolvePersonName(
            record.ulbOfficer
        ) ||
        resolvePersonName(
            record.payload?.ulbReviewedByName
        ) ||
        resolvePersonName(
            record.payload?.ulbOfficerName
        ) ||
        null;

    const aoName =
        resolvePersonName(
            record.actionOfficer
        ) ||
        resolvePersonName(
            record.assignedActionOfficer
        ) ||
        resolvePersonName(
            record.actionTakenByName
        ) ||
        resolvePersonName(
            record.actionOfficerName
        ) ||
        resolvePersonName(
            record.payload?.actionTakenByName
        ) ||
        resolvePersonName(
            record.payload?.actionOfficerName
        ) ||
        null;

    const submittedAt =
        formatAuditDateTime(
            record.createdAt
        );

    const siReviewedAt =
        formatAuditDateTime(
            record.qcReviewedAt ||
            record.reviewedAt
        );

    const ulbReviewedAt =
        formatAuditDateTime(
            record.ulbReviewedAt ||
            record.payload?.ulbReviewedAt ||
            record.actionRequiredAt
        );

    const aoActionAt =
        formatAuditDateTime(
            record.actionTakenAt ||
            record.actionOfficerRespondedAt ||
            record.payload?.actionTakenAt
        );

    const siRemarks =
        safeText(
            record.qcComment,
            record.qcRemark,
            record.reviewerNote,
            record.reviewRemarks,
            record.payload?.qcComment,
            record.payload?.qcRemark
        );

    const ulbRemarks =
        isSweepingModule
            ? safeText(
                record.payload?.ulbRemark,
                record.ulbRemark,
                record.ulbRemarks
            )
            : (
                isLitterbinModule &&
                String(
                    record.type || ''
                ).toUpperCase() ===
                    'VISIT_REPORT'
            )
                ? safeText(
                    record.qcRemark,
                    record.ulbRemark,
                    record.ulbRemarks,
                    record.payload?.ulbRemark
                )
                : safeText(
                    record.ulbRemark,
                    record.ulbRemarks,
                    record.payload?.ulbRemark,
                    record.payload?.ulbRemarks
                );

    const aoRemarks =
        safeText(
            record.actionNote,
            record.aoNote,
            record.aoRemark,
            record.actionDescription,
            record.actionTakenDescription,
            record.payload?.aoRemark,
            record.payload?.actionTakenBy,
            record.payload?.actionDescription
        );

    const siAiResult =
        record.autoQcResult ||
        record.qcAiResult ||
        record.payload?.autoQcResult ||
        record.payload?.qcAiResult ||
        null;

    const ulbAiResult =
        record.actionAiResult ||
        record.ulbAiResult ||
        record.payload?.actionAiResult ||
        record.payload?.ulbAiResult ||
        null;

    const aiSummaryText = (
        result: any
    ): string | null => {
        if (!result) {
            return null;
        }

        if (typeof result === 'string') {
            return safeText(result);
        }

        return safeText(
            result.recommendation,
            result.recommendedAction,
            result.actionSuggestion,
            result.suggestion,
            result.summary,
            result.reason,
            result.decision,
            result.result
        );
    };

    const siAiSuggestion =
        aiSummaryText(
            siAiResult
        );

    const ulbAiSuggestion = (() => {
        if (!ulbAiResult) {
            return null;
        }

        if (
            typeof ulbAiResult ===
            'string'
        ) {
            return safeText(
                ulbAiResult
            );
        }

        const recommendation =
            safeText(
                ulbAiResult.recommendation
            );

        const recommendedAction =
            safeText(
                ulbAiResult.recommendedAction
            );

        const summary =
            safeText(
                ulbAiResult.summary
            );

        const reasons =
            Array.isArray(
                ulbAiResult.reasons
            )
                ? ulbAiResult.reasons
                    .map(
                        (reason: any) =>
                            safeText(
                                reason
                            )
                    )
                    .filter(Boolean)
                    .slice(0, 5)
                : [];

        const confidenceValue =
            Number(
                ulbAiResult.confidence
            );

        const confidence =
            Number.isFinite(
                confidenceValue
            )
                ? (
                    confidenceValue <= 1
                        ? Math.round(
                            confidenceValue *
                            100
                        )
                        : Math.round(
                            confidenceValue
                        )
                )
                : null;

        const lines: string[] = [];

        if (recommendation) {
            lines.push(
                'Recommendation: ' +
                recommendation.replace(
                    /_/g,
                    ' '
                )
            );
        }

        if (recommendedAction) {
            lines.push(
                'Recommended Action: ' +
                recommendedAction
            );
        }

        if (summary) {
            lines.push(
                'Summary: ' +
                summary
            );
        }

        if (reasons.length > 0) {
            lines.push(
                'Reasons: ' +
                reasons.join('; ')
            );
        }

        if (confidence !== null) {
            lines.push(
                'Confidence: ' +
                Math.max(
                    0,
                    Math.min(
                        100,
                        confidence
                    )
                ) +
                '%'
            );
        }

        return (
            lines.length > 0
                ? lines.join('\n')
                : aiSummaryText(
                    ulbAiResult
                )
        );
    })();

    const commissionerZoneName =
        cleanGeoName(rawZone) ||
        (
            record.zoneId &&
            !String(
                record.zoneId
            ).includes('-')
                ? `Zone ${record.zoneId}`
                : null
        ) ||
        'Not available';

    const commissionerWardName =
        cleanGeoName(rawWard) ||
        (
            record.wardId &&
            !String(
                record.wardId
            ).includes('-')
                ? `Ward ${record.wardId}`
                : null
        ) ||
        'Not available';

    const commissionerLocationName =
        safeText(
            record.locationName,
            record.locationDescription,
            record.address,
            record.bin?.locationName,
            record.toilet?.locationName,
            record.toilet?.address,
            record.payload?.locationName,
            record.payload?.locationDescription,
            beatName
        ) ||
        'Not available';

    const commissionerAreaName =
        safeText(
            record.areaName,
            record.area?.name,
            record.bin?.areaName,
            record.toilet?.areaName,
            record.payload?.areaName,
            areaDetail
        ) ||
        'Not available';

    const aoEvidencePhotos:
        string[] = [];

    const addAoPhoto = (
        value: any
    ) => {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(
                addAoPhoto
            );
            return;
        }

        if (typeof value === 'object') {
            addAoPhoto(
                value.url ||
                value.photoUrl ||
                value.imageUrl ||
                value.photo
            );
            return;
        }

        const resolved =
            resolveUrl(
                String(value)
            );

        if (
            resolved &&
            !aoEvidencePhotos.includes(
                resolved
            )
        ) {
            aoEvidencePhotos.push(
                resolved
            );
        }
    };

    addAoPhoto(
        record.actionPhotoUrl
    );
    addAoPhoto(
        record.aoPhoto
    );
    addAoPhoto(
        record.actionPhotos
    );
    addAoPhoto(
        record.aoPhotos
    );
    addAoPhoto(
        record.payload?.actionPhotoUrl
    );
    addAoPhoto(
        record.payload?.aoPhoto
    );
    addAoPhoto(
        record.payload?.actionPhotos
    );
    addAoPhoto(
        record.payload?.aoPhotos
    );

    const auditStatusTone = (
        auditStatus: string
    ) => {
        switch (
            normalizeAuditStatus(
                auditStatus
            )
        ) {
            case 'APPROVED':
                return {
                    bg: '#ecfdf5',
                    border: '#a7f3d0',
                    text: '#047857',
                    dot: '#10b981'
                };

            case 'REJECTED':
                return {
                    bg: '#fef2f2',
                    border: '#fecaca',
                    text: '#b91c1c',
                    dot: '#ef4444'
                };

            case 'ACTION_REQUIRED':
                return {
                    bg: '#fff7ed',
                    border: '#fed7aa',
                    text: '#c2410c',
                    dot: '#f97316'
                };

            case 'ACTION_TAKEN':
                return {
                    bg: '#ecfdf5',
                    border: '#86efac',
                    text: '#166534',
                    dot: '#16a34a'
                };

            case 'PENDING_QC':
            case 'SUBMITTED':
            case 'PENDING':
                return {
                    bg: '#eff6ff',
                    border: '#bfdbfe',
                    text: '#1d4ed8',
                    dot: '#3b82f6'
                };

            default:
                return {
                    bg: '#f8fafc',
                    border: '#e2e8f0',
                    text: '#475569',
                    dot: '#94a3b8'
                };
        }
    };

    const statusLabel = (
        auditStatus: string
    ) => {
        const normalized =
            normalizeAuditStatus(
                auditStatus
            );

        if (
            normalized ===
            'ACTION_TAKEN'
        ) {
            return 'RESOLVED';
        }

        if (
            normalized ===
            'PENDING_QC'
        ) {
            return 'PENDING SI REVIEW';
        }

        return (
            normalized.replace(
                /_/g,
                ' '
            ) ||
            'UNKNOWN'
        );
    };

    const AuditBadge = ({
        value
    }: {
        value: string;
    }) => {
        const tone =
            auditStatusTone(
                value
            );

        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: tone.bg,
                    border:
                        `1px solid ${tone.border}`,
                    color: tone.text,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap'
                }}
            >
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background:
                            tone.dot
                    }}
                />
                {statusLabel(
                    value
                )}
            </span>
        );
    };

    const TimelineStage = ({
        title,
        person,
        time,
        statusValue,
        remarks: stageRemarks,
        aiSuggestion: stageAiSuggestion,
        showAiSection = false,
        photos,
        pending = false
    }: {
        title: string;
        person?: string | null;
        time?: string | null;
        statusValue?: string | null;
        remarks?: string | null;
        aiSuggestion?: string | null;
        showAiSection?: boolean;
        photos?: string[];
        pending?: boolean;
    }) => {
        const tone =
            auditStatusTone(
                statusValue ||
                (
                    pending
                        ? 'PENDING'
                        : 'APPROVED'
                )
            );

        return (
            <div
                style={{
                    position: 'relative',
                    paddingLeft: 30,
                    paddingBottom: 22
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 7,
                        top: 14,
                        bottom: -8,
                        width: 2,
                        background:
                            '#e2e8f0'
                    }}
                />

                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 4,
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        background:
                            pending
                                ? '#ffffff'
                                : tone.dot,
                        border:
                            `3px solid ${
                                pending
                                    ? '#cbd5e1'
                                    : tone.bg
                            }`,
                        boxShadow:
                            '0 0 0 2px #ffffff'
                    }}
                />

                <div
                    style={{
                        background:
                            '#ffffff',
                        border:
                            '1px solid #e2e8f0',
                        borderRadius: 14,
                        padding:
                            '12px 13px',
                        boxShadow:
                            '0 2px 8px rgba(15,23,42,0.04)'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems:
                                'flex-start',
                            justifyContent:
                                'space-between',
                            gap: 8
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: '#0f172a'
                                }}
                            >
                                {title}
                            </div>

                            {person &&
                                !looksLikeUuid(
                                    person
                                ) && (
                                <div
                                    style={{
                                        marginTop: 3,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#334155'
                                    }}
                                >
                                    {person}
                                </div>
                            )}

                            <div
                                style={{
                                    marginTop: 2,
                                    fontSize: 10,
                                    color: '#64748b'
                                }}
                            >
                                {time ||
                                    (
                                        pending
                                            ? 'Awaiting workflow action'
                                            : 'Time not recorded'
                                    )}
                            </div>
                        </div>

                        {statusValue && (
                            <AuditBadge
                                value={
                                    statusValue
                                }
                            />
                        )}
                    </div>

                    {(showAiSection || stageAiSuggestion) && (
                        <div
                            style={{
                                marginTop: 10,
                                padding:
                                    '9px 10px',
                                borderRadius: 9,
                                background:
                                    '#f5f3ff',
                                border:
                                    '1px solid #ddd6fe'
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 9,
                                    fontWeight: 800,
                                    color: '#6d28d9',
                                    textTransform:
                                        'uppercase',
                                    letterSpacing:
                                        '0.05em'
                                }}
                            >
                                AI Suggestion
                            </div>

                            <div
                                style={{
                                    marginTop: 4,
                                    fontSize: 10.5,
                                    whiteSpace: 'pre-line',
                                    lineHeight: 1.5,
                                    color: '#4c1d95'
                                }}
                            >
                                {stageAiSuggestion ||
                                    'No AI suggestion recorded for this stage.'}
                            </div>
                        </div>
                    )}

                    {stageRemarks && (
                        <div
                            style={{
                                marginTop: 9,
                                paddingTop: 8,
                                borderTop:
                                    '1px dashed #e2e8f0'
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 9,
                                    fontWeight: 800,
                                    color: '#64748b',
                                    textTransform:
                                        'uppercase',
                                    letterSpacing:
                                        '0.05em'
                                }}
                            >
                                Remarks
                            </div>

                            <div
                                style={{
                                    marginTop: 3,
                                    fontSize: 10.5,
                                    lineHeight: 1.5,
                                    color: '#334155'
                                }}
                            >
                                {stageRemarks}
                            </div>
                        </div>
                    )}

                    {photos &&
                        photos.length >
                            0 && (
                            <div
                                style={{
                                    marginTop: 10,
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 7
                                }}
                            >
                                {photos.map(
                                    (
                                        photo,
                                        index
                                    ) => (
                                        <button
                                            key={
                                                index
                                            }
                                            type="button"
                                            onClick={() =>
                                                setPreviewPhoto(
                                                    photo
                                                )
                                            }
                                            style={{
                                                width: 58,
                                                height: 58,
                                                padding: 0,
                                                overflow:
                                                    'hidden',
                                                borderRadius: 9,
                                                border:
                                                    '1px solid #cbd5e1',
                                                background:
                                                    '#f1f5f9',
                                                cursor:
                                                    'pointer'
                                            }}
                                            title="Open action evidence"
                                        >
                                            <img
                                                src={
                                                    photo
                                                }
                                                alt={
                                                    `Action evidence ${index + 1}`
                                                }
                                                style={{
                                                    width:
                                                        '100%',
                                                    height:
                                                        '100%',
                                                    objectFit:
                                                        'cover'
                                                }}
                                            />
                                        </button>
                                    )
                                )}
                            </div>
                        )}
                </div>
            </div>
        );
    };


    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || typeof document === 'undefined') return null;


    if (isCommissionerUser) {
        const hasSiStage =
            Boolean(
                siName ||
                siReviewedAt ||
                siDecision ||
                siRemarks
            );

        const hasUlbStage =
            Boolean(
                ulbName ||
                ulbReviewedAt ||
                ulbRemarks ||
                ulbAiSuggestion ||
                currentAuditStatus ===
                    'ACTION_REQUIRED' ||
                currentAuditStatus ===
                    'ACTION_TAKEN'
            );

        const hasAoStage =
            Boolean(
                aoName ||
                aoActionAt ||
                aoRemarks ||
                aoEvidencePhotos.length >
                    0 ||
                currentAuditStatus ===
                    'ACTION_TAKEN'
            );

    return createPortal(
            <>
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99998,
                        background:
                            'rgba(15,23,42,0.72)',
                        backdropFilter:
                            'blur(5px)'
                    }}
                />

                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 18,
                        pointerEvents: 'none'
                    }}
                >
                    <div
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        style={{
                            pointerEvents: 'all',
                            width: '1180px',
                            maxWidth: '96vw',
                            height: '88vh',
                            maxHeight: '920px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            background: '#ffffff',
                            borderRadius: 22,
                            border:
                                '1px solid rgba(255,255,255,0.4)',
                            boxShadow:
                                '0 30px 90px rgba(15,23,42,0.35)'
                        }}
                    >
                        {/* HEADER */}
                        <div
                            style={{
                                padding:
                                    '18px 22px',
                                display: 'flex',
                                alignItems:
                                    'center',
                                justifyContent:
                                    'space-between',
                                gap: 18,
                                borderBottom:
                                    '1px solid #e2e8f0',
                                background:
                                    'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                            }}
                        >
                            <div
                                style={{
                                    minWidth: 0
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems:
                                            'center',
                                        gap: 9,
                                        flexWrap:
                                            'wrap'
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 900,
                                            letterSpacing:
                                                '0.08em',
                                            textTransform:
                                                'uppercase',
                                            color: '#4f46e5'
                                        }}
                                    >
                                        Inspection Audit
                                    </div>

                                    <AuditBadge
                                        value={
                                            currentAuditStatus
                                        }
                                    />
                                </div>

                                <div
                                    style={{
                                        marginTop: 5,
                                        fontSize: 19,
                                        fontWeight: 900,
                                        color: '#0f172a',
                                        lineHeight: 1.2
                                    }}
                                >
                                    {assetName}
                                </div>

                                <div
                                    style={{
                                        marginTop: 4,
                                        display: 'flex',
                                        alignItems:
                                            'center',
                                        gap: 8,
                                        flexWrap:
                                            'wrap',
                                        fontSize: 11,
                                        color: '#64748b'
                                    }}
                                >
                                    <strong
                                        style={{
                                            color: '#334155'
                                        }}
                                    >
                                        {moduleTitle}
                                    </strong>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    onClose
                                }
                                style={{
                                    flexShrink: 0,
                                    border: 0,
                                    borderRadius: 10,
                                    padding:
                                        '8px 13px',
                                    background:
                                        '#f1f5f9',
                                    color: '#475569',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>

                        {/* QUICK CONTEXT */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(3, minmax(0, 1fr))',
                                gap: 1,
                                background:
                                    '#e2e8f0',
                                borderBottom:
                                    '1px solid #e2e8f0'
                            }}
                        >
                            {[
                                [
                                    'Zone',
                                    commissionerZoneName
                                ],
                                [
                                    'Ward',
                                    commissionerWardName
                                ],
                                [
                                    'Location',
                                    commissionerLocationName
                                ]
                            ].map(
                                (
                                    item,
                                    index
                                ) => (
                                    <div
                                        key={
                                            index
                                        }
                                        style={{
                                            minWidth: 0,
                                            padding:
                                                '11px 14px',
                                            background:
                                                '#ffffff'
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 8.5,
                                                fontWeight: 900,
                                                color: '#94a3b8',
                                                textTransform:
                                                    'uppercase',
                                                letterSpacing:
                                                    '0.07em'
                                            }}
                                        >
                                            {item[0]}
                                        </div>

                                        <div
                                            style={{
                                                marginTop: 4,
                                                fontSize: 11,
                                                fontWeight: 800,
                                                color: '#1e293b',
                                                lineHeight: 1.45
                                            }}
                                            title={
                                                String(
                                                    item[1]
                                                )
                                            }
                                        >
                                            {item[1]}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>

                        {/* BODY */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'minmax(0, 1fr) 390px',
                                flex: 1,
                                minHeight: 0
                            }}
                        >
                            {/* LEFT */}
                            <div
                                style={{
                                    minWidth: 0,
                                    overflowY:
                                        'auto',
                                    padding:
                                        '18px 20px',
                                    background:
                                        '#ffffff'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems:
                                            'center',
                                        justifyContent:
                                            'space-between',
                                        gap: 12,
                                        marginBottom: 13
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 14,
                                                fontWeight: 900,
                                                color: '#0f172a'
                                            }}
                                        >
                                            Inspection Questions & Evidence
                                        </div>

                                        <div
                                            style={{
                                                marginTop: 3,
                                                fontSize: 10.5,
                                                color: '#64748b'
                                            }}
                                        >
                                            Submitted answers and question-linked photographic evidence
                                        </div>
                                    </div>

                                    {resolvedAnswers.length >
                                        0 && (
                                        <div
                                            style={{
                                                padding:
                                                    '5px 9px',
                                                borderRadius: 999,
                                                background:
                                                    '#eef2ff',
                                                color: '#4338ca',
                                                fontSize: 9.5,
                                                fontWeight: 900
                                            }}
                                        >
                                            {
                                                resolvedAnswers.length
                                            }{' '}
                                            QUESTIONS
                                        </div>
                                    )}
                                </div>

                                {resolvedAnswers.length ===
                                0 ? (
                                    isSweepingModule &&
                                    sweepingEvidencePoints.length > 0 ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection:
                                                    'column',
                                                gap: 10
                                            }}
                                        >
                                            {sweepingEvidencePoints.map(
                                                (
                                                    point: any,
                                                    index: number
                                                ) => (
                                                    <div
                                                        key={
                                                            index
                                                        }
                                                        style={{
                                                            border:
                                                                '1px solid #e2e8f0',
                                                            borderRadius: 14,
                                                            background:
                                                                '#ffffff',
                                                            overflow:
                                                                'hidden',
                                                            boxShadow:
                                                                '0 2px 7px rgba(15,23,42,0.03)'
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display:
                                                                    'flex',
                                                                alignItems:
                                                                    'flex-start',
                                                                justifyContent:
                                                                    'space-between',
                                                                gap: 12,
                                                                padding:
                                                                    '12px 14px'
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display:
                                                                        'flex',
                                                                    gap: 10,
                                                                    minWidth: 0
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        width: 30,
                                                                        height: 30,
                                                                        flexShrink: 0,
                                                                        borderRadius: 8,
                                                                        background:
                                                                            '#eef2ff',
                                                                        color:
                                                                            '#4338ca',
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        justifyContent:
                                                                            'center',
                                                                        fontSize: 10,
                                                                        fontWeight: 900
                                                                    }}
                                                                >
                                                                    P
                                                                    {index +
                                                                        1}
                                                                </div>

                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 12,
                                                                            fontWeight: 800,
                                                                            color:
                                                                                '#1e293b'
                                                                        }}
                                                                    >
                                                                        {
                                                                            point.pointName
                                                                        }
                                                                    </div>

                                                                    <div
                                                                        style={{
                                                                            marginTop: 3,
                                                                            display:
                                                                                'flex',
                                                                            gap: 8,
                                                                            flexWrap:
                                                                                'wrap',
                                                                            fontSize: 9.5,
                                                                            color:
                                                                                '#64748b'
                                                                        }}
                                                                    >
                                                                        <span>
                                                                            {
                                                                                point.pointCode
                                                                            }
                                                                        </span>

                                                                        {point.pointType && (
                                                                            <span>
                                                                                {
                                                                                    point.pointType
                                                                                }
                                                                            </span>
                                                                        )}

                                                                        {point.submittedTime && (
                                                                            <span>
                                                                                {
                                                                                    point.submittedTime
                                                                                }
                                                                            </span>
                                                                        )}

                                                                        {point.distance !==
                                                                            null && (
                                                                            <span>
                                                                                {
                                                                                    Math.round(
                                                                                        Number(
                                                                                            point.distance
                                                                                        )
                                                                                    )
                                                                                }{' '}
                                                                                m from point
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <span
                                                                style={{
                                                                    padding:
                                                                        '4px 9px',
                                                                    borderRadius:
                                                                        999,
                                                                    background:
                                                                        point.photos.length >
                                                                        0
                                                                            ? '#ecfdf5'
                                                                            : '#f8fafc',
                                                                    color:
                                                                        point.photos.length >
                                                                        0
                                                                            ? '#047857'
                                                                            : '#64748b',
                                                                    fontSize: 9,
                                                                    fontWeight: 900
                                                                }}
                                                            >
                                                                {point.photos.length >
                                                                0
                                                                    ? 'EVIDENCE CAPTURED'
                                                                    : 'NO IMAGE'}
                                                            </span>
                                                        </div>

                                                        {point.photos.length >
                                                            0 && (
                                                            <div
                                                                style={{
                                                                    display:
                                                                        'flex',
                                                                    flexWrap:
                                                                        'wrap',
                                                                    gap: 8,
                                                                    padding:
                                                                        '10px 14px 13px',
                                                                    borderTop:
                                                                        '1px solid #f1f5f9',
                                                                    background:
                                                                        '#fafafa'
                                                                }}
                                                            >
                                                                {point.photos.map(
                                                                    (
                                                                        photo: string,
                                                                        photoIndex: number
                                                                    ) => (
                                                                        <button
                                                                            key={
                                                                                photoIndex
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setPreviewPhoto(
                                                                                    photo
                                                                                )
                                                                            }
                                                                            style={{
                                                                                width: 94,
                                                                                height: 72,
                                                                                padding: 0,
                                                                                border:
                                                                                    '1px solid #cbd5e1',
                                                                                borderRadius: 10,
                                                                                overflow:
                                                                                    'hidden',
                                                                                background:
                                                                                    '#f1f5f9',
                                                                                cursor:
                                                                                    'zoom-in'
                                                                            }}
                                                                            title="Click to enlarge sweeping evidence"
                                                                        >
                                                                            <img
                                                                                src={
                                                                                    photo
                                                                                }
                                                                                alt={
                                                                                    `Sweeping point ${index + 1} evidence`
                                                                                }
                                                                                style={{
                                                                                    width:
                                                                                        '100%',
                                                                                    height:
                                                                                        '100%',
                                                                                    objectFit:
                                                                                        'cover'
                                                                                }}
                                                                            />
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                padding: 20,
                                                border:
                                                    '1px dashed #cbd5e1',
                                                borderRadius: 14,
                                                background:
                                                    '#f8fafc',
                                                color:
                                                    '#64748b',
                                                fontSize: 11,
                                                textAlign:
                                                    'center'
                                            }}
                                        >
                                            No inspection evidence is available for this record.
                                        </div>
                                    )
                                ) : (
                                    <div
                                        style={{
                                            display:
                                                'flex',
                                            flexDirection:
                                                'column',
                                            gap: 10
                                        }}
                                    >
                                        {resolvedAnswers.map(
                                            (
                                                item,
                                                index
                                            ) => {
                                                const answer =
                                                    String(
                                                        item.answerText ||
                                                            ''
                                                    ).trim();

                                                const upper =
                                                    answer.toUpperCase();

                                                const answerBg =
                                                    upper ===
                                                        'YES' ||
                                                    upper ===
                                                        'TRUE'
                                                        ? '#ecfdf5'
                                                        : upper ===
                                                              'NO' ||
                                                          upper ===
                                                              'FALSE'
                                                            ? '#fef2f2'
                                                            : '#eff6ff';

                                                const answerText =
                                                    upper ===
                                                        'YES' ||
                                                    upper ===
                                                        'TRUE'
                                                        ? '#047857'
                                                        : upper ===
                                                              'NO' ||
                                                          upper ===
                                                              'FALSE'
                                                            ? '#b91c1c'
                                                            : '#1d4ed8';

                                                return (
                                                    <div
                                                        key={
                                                            index
                                                        }
                                                        style={{
                                                            border:
                                                                '1px solid #e2e8f0',
                                                            borderRadius: 14,
                                                            overflow:
                                                                'hidden',
                                                            background:
                                                                '#ffffff',
                                                            boxShadow:
                                                                '0 2px 7px rgba(15,23,42,0.03)'
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display:
                                                                    'flex',
                                                                alignItems:
                                                                    'flex-start',
                                                                gap: 10,
                                                                padding:
                                                                    '12px 13px'
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    flexShrink: 0,
                                                                    width: 28,
                                                                    height: 28,
                                                                    display:
                                                                        'flex',
                                                                    alignItems:
                                                                        'center',
                                                                    justifyContent:
                                                                        'center',
                                                                    borderRadius: 8,
                                                                    background:
                                                                        '#eef2ff',
                                                                    color: '#4338ca',
                                                                    fontSize: 10,
                                                                    fontWeight: 900
                                                                }}
                                                            >
                                                                Q
                                                                {index +
                                                                    1}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    flex: 1,
                                                                    minWidth: 0
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        fontSize: 11.5,
                                                                        fontWeight: 750,
                                                                        lineHeight: 1.45,
                                                                        color: '#1e293b'
                                                                    }}
                                                                >
                                                                    {
                                                                        item.questionText
                                                                    }
                                                                </div>

                                                                <div
                                                                    style={{
                                                                        marginTop: 8,
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        gap: 6
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            fontSize: 9,
                                                                            color: '#94a3b8',
                                                                            textTransform:
                                                                                'uppercase',
                                                                            fontWeight: 800
                                                                        }}
                                                                    >
                                                                        Answer
                                                                    </span>

                                                                    <span
                                                                        style={{
                                                                            padding:
                                                                                '4px 9px',
                                                                            borderRadius: 999,
                                                                            background:
                                                                                answerBg,
                                                                            color: answerText,
                                                                            fontSize: 10,
                                                                            fontWeight: 900
                                                                        }}
                                                                    >
                                                                        {answer ||
                                                                            'Not answered'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {item.photos &&
                                                            item
                                                                .photos
                                                                .length >
                                                                0 && (
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        gap: 8,
                                                                        flexWrap:
                                                                            'wrap',
                                                                        padding:
                                                                            '9px 13px 12px',
                                                                        borderTop:
                                                                            '1px solid #f1f5f9',
                                                                        background:
                                                                            '#fafafa'
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            fontSize: 9,
                                                                            fontWeight: 800,
                                                                            color: '#64748b',
                                                                            marginRight: 2
                                                                        }}
                                                                    >
                                                                        Evidence
                                                                    </span>

                                                                    {item.photos.map(
                                                                        (
                                                                            photo,
                                                                            photoIndex
                                                                        ) => (
                                                                            <button
                                                                                key={
                                                                                    photoIndex
                                                                                }
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setPreviewPhoto(
                                                                                        photo
                                                                                    )
                                                                                }
                                                                                style={{
                                                                                    width: 64,
                                                                                    height: 54,
                                                                                    padding: 0,
                                                                                    borderRadius: 9,
                                                                                    overflow:
                                                                                        'hidden',
                                                                                    border:
                                                                                        '1px solid #cbd5e1',
                                                                                    background:
                                                                                        '#f1f5f9',
                                                                                    cursor:
                                                                                        'zoom-in'
                                                                                }}
                                                                                title="Click to enlarge evidence"
                                                                            >
                                                                                <img
                                                                                    src={
                                                                                        photo
                                                                                    }
                                                                                    alt={
                                                                                        `Question ${index + 1} evidence ${photoIndex + 1}`
                                                                                    }
                                                                                    style={{
                                                                                        width:
                                                                                            '100%',
                                                                                        height:
                                                                                            '100%',
                                                                                        objectFit:
                                                                                            'cover'
                                                                                    }}
                                                                                />
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                )}

                                {allEvidencePhotos.length >
                                    0 && (
                                    <div
                                        style={{
                                            marginTop: 18,
                                            paddingTop: 15,
                                            borderTop:
                                                '1px solid #e2e8f0'
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 900,
                                                color: '#334155',
                                                marginBottom: 9
                                            }}
                                        >
                                            All Inspection Evidence
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                flexWrap:
                                                    'wrap',
                                                gap: 8
                                            }}
                                        >
                                            {allEvidencePhotos.map(
                                                (
                                                    photo,
                                                    index
                                                ) => (
                                                    <button
                                                        key={
                                                            index
                                                        }
                                                        type="button"
                                                        onClick={() =>
                                                            setPreviewPhoto(
                                                                photo
                                                            )
                                                        }
                                                        style={{
                                                            width: 76,
                                                            height: 66,
                                                            padding: 0,
                                                            overflow:
                                                                'hidden',
                                                            borderRadius: 10,
                                                            border:
                                                                '1px solid #cbd5e1',
                                                            background:
                                                                '#f1f5f9',
                                                            cursor:
                                                                'zoom-in'
                                                        }}
                                                        title="Click to enlarge evidence"
                                                    >
                                                        <img
                                                            src={
                                                                photo
                                                            }
                                                            alt={
                                                                `Inspection evidence ${index + 1}`
                                                            }
                                                            style={{
                                                                width:
                                                                    '100%',
                                                                height:
                                                                    '100%',
                                                                objectFit:
                                                                    'cover'
                                                            }}
                                                        />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT */}
                            <div
                                style={{
                                    minWidth: 0,
                                    overflowY:
                                        'auto',
                                    borderLeft:
                                        '1px solid #e2e8f0',
                                    padding:
                                        '18px 17px',
                                    background:
                                        '#f8fafc'
                                }}
                            >
                                <div
                                    style={{
                                        marginBottom: 13
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 900,
                                            color: '#0f172a'
                                        }}
                                    >
                                        Workflow Timeline
                                    </div>

                                    <div
                                        style={{
                                            marginTop: 3,
                                            fontSize: 10.5,
                                            lineHeight: 1.4,
                                            color: '#64748b'
                                        }}
                                    >
                                        Role-wise audit history with recorded timestamps, remarks and evidence.
                                    </div>
                                </div>

                                <TimelineStage
                                    title="Inspection Submitted"
                                    person={
                                        submitterName
                                    }
                                    time={
                                        submittedAt
                                    }
                                    statusValue="SUBMITTED"
                                />

                                <TimelineStage
                                    title="SI Review"
                                    person={
                                        siName
                                    }
                                    time={
                                        siReviewedAt
                                    }
                                    statusValue={
                                        siDecision ||
                                        (
                                            hasSiStage
                                                ? 'REVIEWED'
                                                : null
                                        )
                                    }
                                    remarks={
                                        siRemarks
                                    }
                                    aiSuggestion={
                                        siAiSuggestion
                                    }
                                    showAiSection={true}
                                    pending={
                                        !hasSiStage
                                    }
                                />

                                {(hasUlbStage ||
                                    currentAuditStatus ===
                                        'ACTION_REQUIRED' ||
                                    currentAuditStatus ===
                                        'ACTION_TAKEN') && (
                                    <TimelineStage
                                        title="ULB Review"
                                        person={
                                            ulbName
                                        }
                                        time={
                                            ulbReviewedAt
                                        }
                                        statusValue={
                                            currentAuditStatus ===
                                                'ACTION_REQUIRED' ||
                                            currentAuditStatus ===
                                                'ACTION_TAKEN'
                                                ? 'ACTION_REQUIRED'
                                                : null
                                        }
                                        remarks={
                                            ulbRemarks
                                        }
                                        aiSuggestion={
                                            ulbAiSuggestion
                                        }
                                        showAiSection={true}
                                        pending={
                                            !hasUlbStage
                                        }
                                    />
                                )}

                                {(hasAoStage ||
                                    currentAuditStatus ===
                                        'ACTION_REQUIRED') && (
                                    <TimelineStage
                                        title="IEC Action"
                                        person={
                                            aoName
                                        }
                                        time={
                                            aoActionAt
                                        }
                                        statusValue={
                                            currentAuditStatus ===
                                            'ACTION_TAKEN'
                                                ? 'ACTION_TAKEN'
                                                : currentAuditStatus ===
                                                    'ACTION_REQUIRED'
                                                  ? 'ACTION_REQUIRED'
                                                  : null
                                        }
                                        remarks={
                                            aoRemarks
                                        }
                                        photos={
                                            aoEvidencePhotos
                                        }
                                        pending={
                                            currentAuditStatus ===
                                            'ACTION_REQUIRED' &&
                                            !aoActionAt
                                        }
                                    />
                                )}

                                <div
                                    style={{
                                        marginTop: 2,
                                        padding:
                                            '13px 14px',
                                        borderRadius: 14,
                                        background:
                                            auditStatusTone(
                                                currentAuditStatus
                                            ).bg,
                                        border:
                                            `1px solid ${
                                                auditStatusTone(
                                                    currentAuditStatus
                                                ).border
                                            }`
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 8.5,
                                            fontWeight: 900,
                                            color: '#64748b',
                                            textTransform:
                                                'uppercase',
                                            letterSpacing:
                                                '0.07em'
                                        }}
                                    >
                                        Current Workflow Status
                                    </div>

                                    <div
                                        style={{
                                            marginTop: 7
                                        }}
                                    >
                                        <AuditBadge
                                            value={
                                                currentAuditStatus
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {previewPhoto && (
                    <div
                        onClick={() =>
                            setPreviewPhoto(
                                null
                            )
                        }
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 100000,
                            display: 'flex',
                            alignItems:
                                'center',
                            justifyContent:
                                'center',
                            padding: 22,
                            background:
                                'rgba(2,6,23,0.92)',
                            backdropFilter:
                                'blur(8px)'
                        }}
                    >
                        <div
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                            style={{
                                position:
                                    'relative',
                                maxWidth:
                                    '92vw',
                                maxHeight:
                                    '88vh',
                                padding: 8,
                                borderRadius: 16,
                                background:
                                    '#ffffff',
                                boxShadow:
                                    '0 30px 90px rgba(0,0,0,0.55)'
                            }}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setPreviewPhoto(
                                        null
                                    )
                                }
                                style={{
                                    position:
                                        'absolute',
                                    top: 12,
                                    right: 12,
                                    zIndex: 2,
                                    width: 34,
                                    height: 34,
                                    border: 0,
                                    borderRadius:
                                        999,
                                    background:
                                        'rgba(15,23,42,0.85)',
                                    color: '#ffffff',
                                    fontSize: 18,
                                    cursor:
                                        'pointer'
                                }}
                            >
                                ×
                            </button>

                            <img
                                src={
                                    previewPhoto
                                }
                                alt="Inspection evidence"
                                style={{
                                    display: 'block',
                                    maxWidth:
                                        '88vw',
                                    maxHeight:
                                        '82vh',
                                    objectFit:
                                        'contain',
                                    borderRadius: 10
                                }}
                            />
                        </div>
                    </div>
                )}
            </>,
            document.body
        );
    }


return createPortal(
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }} />

            {/* Scroll Container */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto', pointerEvents: 'none' }}>
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        pointerEvents: 'all', background: '#ffffff', borderRadius: '20px',
                        width: '900px', maxWidth: '94vw', maxHeight: '88vh',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        boxSizing: 'border-box', overflow: 'hidden'
                    }}
                >
                    {/* HEADER */}
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', flexShrink: 0 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{assetName}</h2>
                                <StatusBadgeInline status={status} />
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginTop: 4 }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', width: '100%', flex: 1, overflow: 'hidden', minHeight: 0 }}>

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


                            {/* AI VISUAL REVIEW - READ ONLY */}
                            {hasAiReview && (
                                <div
                                    style={{
                                        borderRadius: '14px',
                                        border: '1px solid #c7d2fe',
                                        background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 14px rgba(79,70,229,0.06)'
                                    }}
                                >
                                    {/* AI Header */}
                                    <div
                                        style={{
                                            padding: '13px 14px',
                                            borderBottom: '1px solid #dbeafe',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            gap: 12
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    color: '#4338ca',
                                                    letterSpacing: '0.08em',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                AI Visual Review
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 3,
                                                    fontSize: '11px',
                                                    color: '#64748b',
                                                    lineHeight: 1.45
                                                }}
                                            >
                                                AI-generated assistance only. Final review and status remain controlled by the authorized officer.
                                            </div>
                                        </div>

                                        {aiDecision && (
                                            <div
                                                style={{
                                                    flexShrink: 0,
                                                    padding: '5px 9px',
                                                    borderRadius: '999px',
                                                    fontSize: '10px',
                                                    fontWeight: 800,
                                                    background:
                                                        aiDecision === 'APPROVED'
                                                            ? '#dcfce7'
                                                            : aiDecision === 'REJECTED'
                                                                ? '#fee2e2'
                                                                : '#e0e7ff',
                                                    color:
                                                        aiDecision === 'APPROVED'
                                                            ? '#166534'
                                                            : aiDecision === 'REJECTED'
                                                                ? '#991b1b'
                                                                : '#4338ca'
                                                }}
                                            >
                                                AI: {aiDecision.replace(/_/g, ' ')}
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        style={{
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 12
                                        }}
                                    >
                                        {/* Confidence */}
                                        {aiConfidence !== null && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '8px 10px',
                                                    borderRadius: '9px',
                                                    background: 'rgba(255,255,255,0.72)',
                                                    border: '1px solid #e2e8f0'
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '11px',
                                                        fontWeight: 650,
                                                        color: '#475569'
                                                    }}
                                                >
                                                    AI Confidence
                                                </span>

                                                <span
                                                    style={{
                                                        fontSize: '12px',
                                                        fontWeight: 800,
                                                        color: '#312e81'
                                                    }}
                                                >
                                                    {Math.max(0, Math.min(100, aiConfidence))}%
                                                </span>
                                            </div>
                                        )}

                                        {/* Question Verification */}
                                        {aiChecks.length > 0 && (
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: '10px',
                                                        fontWeight: 800,
                                                        color: '#64748b',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.06em',
                                                        marginBottom: 7
                                                    }}
                                                >
                                                    Question Verification
                                                </div>

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6
                                                    }}
                                                >
                                                    {aiChecks.map((check: any, index: number) => {
                                                        const result = check.displayResult;

                                                        const resultBackground =
                                                            result === 'MATCH' || result === 'ACCEPTABLE'
                                                                ? '#dcfce7'
                                                                : result === 'MISMATCH' || result === 'ISSUE'
                                                                    ? '#fee2e2'
                                                                    : '#fef3c7';

                                                        const resultColor =
                                                            result === 'MATCH' || result === 'ACCEPTABLE'
                                                                ? '#166534'
                                                                : result === 'MISMATCH' || result === 'ISSUE'
                                                                    ? '#991b1b'
                                                                    : '#92400e';

                                                        return (
                                                            <div
                                                                key={index}
                                                                style={{
                                                                    background: '#ffffff',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '10px',
                                                                    padding: '9px 10px'
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        gap: 10
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            minWidth: 30,
                                                                            fontSize: '11px',
                                                                            fontWeight: 800,
                                                                            color: '#1e293b'
                                                                        }}
                                                                    >
                                                                        {check.displayQuestion}
                                                                    </span>

                                                                    <span
                                                                        style={{
                                                                            padding: '3px 7px',
                                                                            borderRadius: '999px',
                                                                            fontSize: '9px',
                                                                            fontWeight: 800,
                                                                            background: resultBackground,
                                                                            color: resultColor
                                                                        }}
                                                                    >
                                                                        {result.replace(/_/g, ' ')}
                                                                    </span>
                                                                </div>

                                                                {check.displayReason && (
                                                                    <div
                                                                        style={{
                                                                            marginTop: 5,
                                                                            fontSize: '10.5px',
                                                                            lineHeight: 1.45,
                                                                            color: '#64748b'
                                                                        }}
                                                                    >
                                                                        {check.displayReason}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Additional Visual Insights */}
                                        {aiInsights.length > 0 && (
                                            <div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 10,
                                                        marginBottom: 7
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: '10px',
                                                            fontWeight: 800,
                                                            color: '#64748b',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.06em'
                                                        }}
                                                    >
                                                        Additional Visual Observations
                                                    </div>

                                                    <span
                                                        style={{
                                                            fontSize: '9px',
                                                            fontWeight: 750,
                                                            color: '#6366f1'
                                                        }}
                                                    >
                                                        Advisory only
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 7
                                                    }}
                                                >
                                                    {aiInsights.map((insight: any, index: number) => {
                                                        const severity = String(
                                                            insight?.severity || 'INFO'
                                                        ).toUpperCase();

                                                        const severityBackground =
                                                            severity === 'HIGH'
                                                                ? '#fee2e2'
                                                                : severity === 'MEDIUM'
                                                                    ? '#ffedd5'
                                                                    : severity === 'LOW'
                                                                        ? '#fef3c7'
                                                                        : '#e0f2fe';

                                                        const severityColor =
                                                            severity === 'HIGH'
                                                                ? '#991b1b'
                                                                : severity === 'MEDIUM'
                                                                    ? '#9a3412'
                                                                    : severity === 'LOW'
                                                                        ? '#92400e'
                                                                        : '#075985';

                                                        return (
                                                            <div
                                                                key={index}
                                                                style={{
                                                                    background: '#ffffff',
                                                                    border: insight?.actionRelevant
                                                                        ? '1px solid #fdba74'
                                                                        : '1px solid #e2e8f0',
                                                                    borderRadius: '10px',
                                                                    padding: '10px'
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 6,
                                                                        flexWrap: 'wrap',
                                                                        marginBottom: 5
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            fontSize: '10px',
                                                                            fontWeight: 800,
                                                                            color: '#334155',
                                                                            textTransform: 'capitalize'
                                                                        }}
                                                                    >
                                                                        {String(
                                                                            insight?.category ||
                                                                            'Visual Observation'
                                                                        )
                                                                            .replace(/_/g, ' ')
                                                                            .toLowerCase()
                                                                            .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                                                    </span>

                                                                    <span
                                                                        style={{
                                                                            padding: '2px 6px',
                                                                            borderRadius: '999px',
                                                                            fontSize: '8px',
                                                                            fontWeight: 800,
                                                                            background: severityBackground,
                                                                            color: severityColor
                                                                        }}
                                                                    >
                                                                        {severity}
                                                                    </span>

                                                                    {insight?.actionRelevant && (
                                                                        <span
                                                                            style={{
                                                                                padding: '2px 6px',
                                                                                borderRadius: '999px',
                                                                                fontSize: '8px',
                                                                                fontWeight: 800,
                                                                                background: '#fff7ed',
                                                                                color: '#c2410c',
                                                                                border: '1px solid #fed7aa'
                                                                            }}
                                                                        >
                                                                            ACTION RELEVANT
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {insight?.finding && (
                                                                    <div
                                                                        style={{
                                                                            fontSize: '11px',
                                                                            color: '#334155',
                                                                            lineHeight: 1.45
                                                                        }}
                                                                    >
                                                                        {insight.finding}
                                                                    </div>
                                                                )}

                                                                {insight?.findingHi &&
                                                                    insight.findingHi !== insight.finding && (
                                                                        <div
                                                                            style={{
                                                                                marginTop: 4,
                                                                                paddingTop: 4,
                                                                                borderTop: '1px dashed #e2e8f0',
                                                                                fontSize: '10.5px',
                                                                                color: '#64748b',
                                                                                lineHeight: 1.5
                                                                            }}
                                                                        >
                                                                            {insight.findingHi}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Review Notes & Audit Trail */}
                            {(qcComment || actionNote || reviewerName || formattedReviewedAt) && (
                                <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '12px 14px', border: '1px solid #bfdbfe' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: 6 }}>Audit Review Notes</div>
                                    {reviewerName && (
                                        <div style={{ fontSize: '11px', color: '#475569', marginBottom: 2 }}>
                                            Reviewed By: <strong>{reviewerName}{reviewerRoleText ? ` (${reviewerRoleText})` : ''}</strong>
                                        </div>
                                    )}
                                    {formattedReviewedAt && <div style={{ fontSize: '11px', color: '#475569', marginBottom: 4 }}>Reviewed Date: <strong>{formattedReviewedAt}</strong></div>}
                                    {qcComment && <div style={{ fontSize: '12px', color: '#1e293b', marginTop: 4 }}><strong>Review Remarks:</strong> {qcComment}</div>}
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
                                            <MetaRow label={assetLabel} value={assetName} />
                                            <MetaRow label="Asset ID" value={record.id || record.code || 'N/A'} />
                                            <MetaRow label="Area Name" value={record.areaName || record.area || record.toilet?.areaName || record.payload?.areaName || 'N/A'} />
                                            <MetaRow label="Address / Location" value={record.address || record.locationName || record.toilet?.address || record.payload?.address || 'N/A'} />
                                            <MetaRow label="Zone" value={zoneName} />
                                            <MetaRow label="Ward" value={wardName} />
                                            <MetaRow label="Area Type" value={record.areaType || record.toilet?.areaType || record.payload?.areaType || 'N/A'} />
                                            {(record.latitude || record.lat) && (record.longitude || record.lng) ? (
                                                <MetaRow label="GPS Coordinates" value={`${record.latitude || record.lat}°, ${record.longitude || record.lng}°`} />
                                            ) : null}
                                            <MetaRow label="Registration Status" value={status} />
                                        </div>
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

                        {/* RIGHT COLUMN: QC Action Controls / AO Action Panel */}
                        <div style={{ background: '#f8fafc', padding: '20px 18px', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                {actionPanelTitle}
                            </h3>

                            {/* QC / Admin Action Form (Approve / Action Required / Reject) - strictly hidden for AO */}
                            {!isUserAO && (isPending || isActionRequired || !isFinalized) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{remarksLabel}</label>
                                        <textarea
                                            value={remarks}
                                            onChange={e => setRemarks(e.target.value)}
                                            placeholder={remarksPlaceholder}
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

                            {/* AO Action Form - strictly allowed ONLY when status is ACTION_REQUIRED */}
                            {isUserAO && isActionRequired && (
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
                                        {submitting ? 'Submitting...' : 'Mark Action Taken'}
                                    </button>
                                </div>
                            )}

                            {/* Read-only status info for AO viewing non-ACTION_REQUIRED reports */}
                            {isUserAO && !isActionRequired && (
                                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                                    Report Status: <strong style={{ color: '#0f172a' }}>{status}</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                                        {isPending ? 'Pending review by SI / City Admin.' : 'Audit report finalized.'}
                                    </p>
                                </div>
                            )}

                            {!isUserAO && isFinalized && (
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
        </>,
        document.body
    );
}
