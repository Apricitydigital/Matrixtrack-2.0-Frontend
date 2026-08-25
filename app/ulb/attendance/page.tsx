import { Protected, RoleGuard } from '@components/Guards';
import PortalHomeLayout from '@components/PortalHomeLayout';
import AttendanceAnalyticsPage from '../../city/attendance/page';

export default function Page() {
  return (
    <Protected>
      <RoleGuard roles={['ULB_OFFICER']}>
        <PortalHomeLayout>
          <AttendanceAnalyticsPage />
        </PortalHomeLayout>
      </RoleGuard>
    </Protected>
  );
}
