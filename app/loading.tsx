'use client';

import React from 'react';
import { WorkspaceLoading } from '@components/ui/WorkspaceLoading';

export default function Loading() {
  return (
    <WorkspaceLoading
      title="MatrixTrack 2.0 Enterprise Portal"
      subtitle="Loading workspace environment and synchronization..."
    />
  );
}
