import { Suspense } from 'react';

import {
  Protected,
  RoleGuard,
} from '@components/Guards';

import PortalHomeLayout
  from '@components/PortalHomeLayout';

import RankingApiWorkspace
  from './RankingApiWorkspace';

export default function Page() {
  return (
    <Protected>
      <RoleGuard
        roles={[
          'ULB_OFFICER',
          'CITY_ADMIN',
          'COMMISSIONER',
          'HMS_SUPER_ADMIN',
        ]}
      >
        <PortalHomeLayout>
          <Suspense fallback={null}>
            <RankingApiWorkspace />
          </Suspense>
        </PortalHomeLayout>
      </RoleGuard>
    </Protected>
  );
}
