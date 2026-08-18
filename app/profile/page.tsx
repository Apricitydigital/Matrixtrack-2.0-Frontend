'use client';

import React from 'react';
import PortalHomeLayout from '@components/PortalHomeLayout';
import { UserProfileCard } from '@components/ui/UserProfileCard';

export default function StandaloneProfilePage() {
  return (
    <PortalHomeLayout>
      <div className="max-w-6xl mx-auto py-2">
        <UserProfileCard />
      </div>
    </PortalHomeLayout>
  );
}
