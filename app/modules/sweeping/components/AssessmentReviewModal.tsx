'use client';

import React from "react";
import { ModuleRecordsApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import UniversalReportModal from "@components/UniversalReportModal";

export default function AssessmentReviewModal({ record, onClose, onRefresh }: { record: any; onClose: () => void; onRefresh: () => void }) {
    const { user } = useAuth();
    const isAO = user?.roles?.includes("ACTION_OFFICER");

    const handleApprove = async (rec: any, remarks?: string) => {
        await ModuleRecordsApi.updateRecordStatus("SWEEPING", rec.id, "APPROVED", remarks);
        onRefresh();
    };

    const handleReject = async (rec: any, remarks?: string) => {
        await ModuleRecordsApi.updateRecordStatus("SWEEPING", rec.id, "REJECTED", remarks);
        onRefresh();
    };

    const handleActionRequired = async (rec: any, remarks?: string) => {
        await ModuleRecordsApi.updateRecordStatus("SWEEPING", rec.id, "ACTION_REQUIRED", remarks);
        onRefresh();
    };

    const handleActionTaken = async (rec: any, actionDescription: string, remarks?: string, photoUrl?: string) => {
        await ModuleRecordsApi.updateRecordStatus("SWEEPING", rec.id, "ACTION_TAKEN", remarks, {
            actionTaken: actionDescription,
            aoRemark: remarks,
            aoPhoto: photoUrl
        });
        onRefresh();
    };

    return (
        <UniversalReportModal
            moduleTitle="Sweeping & Sanitation"
            moduleBadge="SWEEPING AUDIT LOG"
            record={record}
            onClose={onClose}
            onApprove={handleApprove}
            onReject={handleReject}
            onActionRequired={handleActionRequired}
            onActionTaken={handleActionTaken}
            isAO={isAO}
            userRoles={user?.roles || []}
        />
    );
}
