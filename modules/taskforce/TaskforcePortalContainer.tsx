'use client';

import React from 'react';
import UnifiedExecutiveDashboard from './components/dashboard/UnifiedExecutiveDashboard';

interface TaskforcePortalContainerProps {
  isSuperAdmin?: boolean;
  userRoles?: string[];
  userCityName?: string;
}

export default function TaskforcePortalContainer({
  isSuperAdmin = true,
  userRoles = ['admin'],
  userCityName = 'Indore'
}: TaskforcePortalContainerProps) {
  return (
    <UnifiedExecutiveDashboard
      isSuperAdmin={isSuperAdmin}
      userRoles={userRoles}
      userCityName={userCityName}
      workspaceUrl="/portal-home"
    />
  );
}
