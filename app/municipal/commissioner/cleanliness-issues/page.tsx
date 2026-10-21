'use client';

import dynamic from 'next/dynamic';
import { RoleGuard } from '@components/Guards';

const CleanlinessIssuesCommissionerDashboard = dynamic(() => import('@components/cleanliness-issues/CleanlinessIssuesCommissionerDashboard'), { ssr: false });

/** Commissioner (read-only). The backend re-checks the role in the database on every request. */
export default function CommissionerCleanlinessIssuesPage() {
  return (
    <RoleGuard roles={['COMMISSIONER', 'CITY_ADMIN']}>
      <CleanlinessIssuesCommissionerDashboard />
    </RoleGuard>
  );
}
