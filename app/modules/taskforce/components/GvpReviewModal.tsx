'use client';

import React from "react";
import { ModuleRecordsApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import UniversalReportModal from "@components/UniversalReportModal";

/*
 * GVP inspection review (two photos + remark), same workflow as Nala:
 * SI approves / rejects, ULB marks Action Required, IEC submits proof.
 * The "GVP" title makes the modal render the photos as P1 / P2 slots.
 */
export default function GvpReviewModal({
  record,
  onClose,
  onRefresh
}: {
  record: any;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();

  const isAO = user?.roles?.includes("ACTION_OFFICER");

  const update = async (rec: any, status: string, remarks?: string, extraData?: any) => {
    await ModuleRecordsApi.updateRecordStatus("TASKFORCE", rec.id, status, remarks, extraData);
    onRefresh();
  };

  return (
    <UniversalReportModal
      moduleTitle="GVP Inspection"
      moduleBadge="GVP AUDIT LOG"
      record={record}
      onClose={onClose}
      onApprove={(rec, remarks) => update(rec, "APPROVED", remarks)}
      onReject={(rec, remarks) => update(rec, "REJECTED", remarks)}
      onActionRequired={(rec, remarks) => update(rec, "ACTION_REQUIRED", remarks)}
      onActionTaken={(rec, actionDescription, remarks, photoUrl, photoUrls) =>
        update(rec, "ACTION_TAKEN", remarks, {
          aoRemark: remarks || actionDescription,
          aoPhotos: photoUrls?.length ? photoUrls : photoUrl ? [photoUrl] : []
        })
      }
      isAO={isAO}
      userRoles={user?.roles || []}
    />
  );
}
