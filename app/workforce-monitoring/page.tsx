'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { WorkspaceLoading } from '@components/ui/WorkspaceLoading';

const WorkforcePortalContainer = dynamic(
  () => import('@modules/matrixtrack-workforce/WorkforcePortalContainer'),
  {
    ssr: false,
    loading: () => (
      <WorkspaceLoading
        title="Workforce Monitoring Workspace"
        subtitle="Loading field employee management, attendance & professional leave records..."
      />
    )
  }
);

export default function WorkforceMonitoringPage() {
  return <WorkforcePortalContainer />;
}
