import { Protected, RoleGuard } from '@components/Guards';
import PortalHomeLayout from '@components/PortalHomeLayout';
import OperationsMapDashboard from '../../municipal/commissioner/home-2/page';

export default function Page() {
  return (
    <Protected>
      <RoleGuard roles={['ULB_OFFICER']}>
        <PortalHomeLayout>
          <OperationsMapDashboard />
        </PortalHomeLayout>
      </RoleGuard>
    </Protected>
  );
}
