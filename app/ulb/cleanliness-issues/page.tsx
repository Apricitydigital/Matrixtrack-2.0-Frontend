import { Suspense } from 'react';

import { Protected, RoleGuard } from '@components/Guards';
import PortalHomeLayout from '@components/PortalHomeLayout';
import UlbCleanlinessWorkspace from '@components/cleanliness-issues/ulb/UlbCleanlinessWorkspace';

export default function Page() {
  return (
    <Protected>
      <RoleGuard roles={['ULB_OFFICER']}>
        <PortalHomeLayout>
          <Suspense fallback={null}>
            <UlbCleanlinessWorkspace />
          </Suspense>
        </PortalHomeLayout>
      </RoleGuard>
    </Protected>
  );
}
