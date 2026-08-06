'use client';

import React from "react";
import CommonRegistrationModal from "@components/CommonRegistrationModal";
import { RoleGuard } from "@components/Guards";

export default function IntegratedRegistrationPage() {
  return (
    <RoleGuard roles={['HMS_SUPER_ADMIN', 'SUPER_ADMIN', 'CITY_ADMIN', 'COMMISSIONER']}>
      <div className="min-w-0 space-y-5 pb-10">
        <CommonRegistrationModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {
            console.log("Registration complete");
          }}
          asPage={true}
        />
      </div>
    </RoleGuard>
  );
}
