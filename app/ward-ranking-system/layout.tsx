'use client';

import { Protected, RoleGuard } from "@components/Guards";
import PortalHomeLayout from "@components/PortalHomeLayout";

const ALLOWED_ROLES = ["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"] as const;

export default function WardRankingSystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <RoleGuard roles={[...ALLOWED_ROLES]}>
        <PortalHomeLayout>
          {children}
        </PortalHomeLayout>
      </RoleGuard>
    </Protected>
  );
}
