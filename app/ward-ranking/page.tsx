'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Protected } from '@components/Guards';
import { WorkspaceLoading } from '@components/ui/WorkspaceLoading';
import { useAuth } from '@hooks/useAuth';

const SwachhPortalContainer = dynamic(
  () => import('@modules/swachh-ranking/SwachhPortalContainer'),
  {
    ssr: false,
    loading: () => (
      <WorkspaceLoading
        title="Ward Ranking system"
        subtitle="Loading city ranking parameters, assessment details & leaderboard..."
      />
    )
  }
);

export default function SwachhWardRankingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const normalizedRoles = [
    user?.role,
    ...(user?.roles || []),
  ]
    .filter(Boolean)
    .map((role) => String(role).trim().toUpperCase());

  const assignedCities = (user as any)?.customPermissions?.assigned_cities;
  const isCityAdminContext =
    Array.isArray(assignedCities) && assignedCities.length > 0 ||
    normalizedRoles.some((role) =>
      [
        'CITY_ADMIN',
        'COMMISSIONER',
        'HMS_SUPER_ADMIN',
        'HMS_ADMIN',
        'SUPER_ADMIN',
      ].includes(role)
    );

  useEffect(() => {
    if (!loading && isCityAdminContext) {
      router.replace('/ulb/ward-ranking');
    }
  }, [isCityAdminContext, loading, router]);

  if (loading || isCityAdminContext) {
    return (
      <WorkspaceLoading
        title="Ward Ranking"
        subtitle="Opening the Ward Ranking dashboard..."
      />
    );
  }

  return (
    <Protected>
      <SwachhPortalContainer />
    </Protected>
  );
}
