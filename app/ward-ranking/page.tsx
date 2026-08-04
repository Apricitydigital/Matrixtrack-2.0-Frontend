'use client';

import React from 'react';
import { Protected } from '@components/Guards';
import SwachhPortalContainer from '@modules/swachh-ranking/SwachhPortalContainer';

export default function SwachhWardRankingPage() {
  return (
    <Protected>
      <SwachhPortalContainer />
    </Protected>
  );
}
