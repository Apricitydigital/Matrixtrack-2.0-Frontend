'use client';

import React from 'react';
import PortalHomeLayout from '@components/PortalHomeLayout';
import { Protected } from '@components/Guards';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <PortalHomeLayout>{children}</PortalHomeLayout>
    </Protected>
  );
}
