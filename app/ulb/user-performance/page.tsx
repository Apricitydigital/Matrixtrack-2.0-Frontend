import { Suspense } from 'react';
import { Protected, RoleGuard } from '@components/Guards';
import PortalHomeLayout from '@components/PortalHomeLayout';
import UserPerformanceView from '../../municipal/commissioner/user-performance/UserPerformanceView';

export default function Page() {
  return (
    <Protected>
      <RoleGuard roles={['ULB_OFFICER']}>
        <PortalHomeLayout>
          <Suspense fallback={null}>
            <UserPerformanceView />
          </Suspense>
        </PortalHomeLayout>
      </RoleGuard>
    </Protected>
  );
}
