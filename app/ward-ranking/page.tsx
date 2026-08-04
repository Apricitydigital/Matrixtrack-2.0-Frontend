'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Protected } from '@components/Guards';
import { WorkspaceLoading } from '@components/ui/WorkspaceLoading';

const SwachhPortalContainer = dynamic(
  () => import('@modules/swachh-ranking/SwachhPortalContainer'),
  {
    ssr: false,
    loading: () => (
      <WorkspaceLoading
        title="Swachh Ward Ranking Workspace"
        subtitle="Loading city ranking parameters, assessment details & leaderboard..."
      />
    )
  }
);

export default function SwachhWardRankingPage() {
  return (
    <Protected>
      <SwachhPortalContainer />
    </Protected>
  );
}
