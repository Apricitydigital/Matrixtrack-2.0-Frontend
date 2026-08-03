'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const WorkforcePortalContainer = dynamic(
  () => import('@modules/matrixtrack-workforce/WorkforcePortalContainer'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
        Loading Matrix Track Workforce Monitoring...
      </div>
    )
  }
);

export default function WorkforceMonitoringPage() {
  return <WorkforcePortalContainer />;
}
