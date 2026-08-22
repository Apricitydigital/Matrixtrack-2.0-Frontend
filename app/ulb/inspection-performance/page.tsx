import { Protected, RoleGuard } from '@components/Guards';
import PortalHomeLayout from '@components/PortalHomeLayout';
import InspectionPerformanceWorkspace from './InspectionPerformanceWorkspace';

export default function Page() {
  return (
    <Protected>
      <RoleGuard roles={['ULB_OFFICER']}>
        <PortalHomeLayout>
          <InspectionPerformanceWorkspace />
        </PortalHomeLayout>
      </RoleGuard>
    </Protected>
  );
}
