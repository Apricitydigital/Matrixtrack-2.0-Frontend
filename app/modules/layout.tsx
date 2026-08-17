'use client';

import { Protected } from "@components/Guards";
import PortalHomeLayout from "@components/PortalHomeLayout";

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <PortalHomeLayout>
        {children}
      </PortalHomeLayout>
    </Protected>
  );
}
