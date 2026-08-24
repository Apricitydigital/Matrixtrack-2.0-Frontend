import {
  Protected,
  RoleGuard,
} from '@components/Guards';

import PortalHomeLayout
  from '@components/PortalHomeLayout';

import WardRankingWorkspace
  from './WardRankingWorkspace';

export default function Page() {
  return (
    <Protected>
      <RoleGuard
        roles={['ULB_OFFICER']}
      >
        <PortalHomeLayout>
          <WardRankingWorkspace />
        </PortalHomeLayout>
      </RoleGuard>
    </Protected>
  );
}