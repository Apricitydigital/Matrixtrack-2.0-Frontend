'use client';

import dynamic from 'next/dynamic';
import { RoleGuard } from '@components/Guards';

const CleanlinessIssuesAdminDashboard = dynamic(() => import('@components/cleanliness-issues/CleanlinessIssuesAdminDashboard'), { ssr: false });

/** City Admin only. The backend re-checks the role in the database on every request. */
export default function CityCleanlinessIssuesPage() {
  return (
    <RoleGuard roles={['CITY_ADMIN']}>
      <CleanlinessIssuesAdminDashboard />
    </RoleGuard>
  );
}
