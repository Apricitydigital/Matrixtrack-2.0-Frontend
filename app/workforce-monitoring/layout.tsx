'use client';

import React from 'react';
import PortalHomeLayout from '@components/PortalHomeLayout';

export default function WorkforceMonitoringLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalHomeLayout>
      {children}
    </PortalHomeLayout>
  );
}
