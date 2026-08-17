'use client';

import React from "react";
import UniversalReportModal from "@components/UniversalReportModal";

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
    if (!record) return null;

    const handleApprove = async (rec: any, remarks?: string) => {
        await onApprove(rec, remarks);
    };

    const handleReject = async (rec: any, remarks?: string) => {
        await onReject(rec, remarks);
    };

    return (
        <UniversalReportModal
            moduleTitle="Litter Bins & Twinbin"
            moduleBadge="TWINBIN AUDIT LOG"
            record={record}
            onClose={onClose}
            onApprove={handleApprove}
            onReject={handleReject}
        />
    );
}
