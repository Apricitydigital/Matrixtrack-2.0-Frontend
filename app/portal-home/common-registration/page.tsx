


'use client';

import React from "react";
import CommonRegistrationModal from "@components/CommonRegistrationModal";
import { RoleGuard } from "@components/Guards";
import { UserPlus } from "lucide-react";

export default function UserRegistrationManagementPage() {
  return (
    <RoleGuard
      roles={[
        'HMS_SUPER_ADMIN',
        'SUPER_ADMIN',
        'CITY_ADMIN',
        'COMMISSIONER',
      ]}
    >
      <div className="w-full">

        {/* PAGE HEADER */}
        <div className="flex flex-col gap-4 px-4 sm:px-5 lg:px-6 mt-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-500/20">
                <UserPlus size={22} />
              </span>

              User Registration & Management
            </h1>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Register users simultaneously for Inspection and performance
              system and ward ranking system
            </p>
          </div>
        </div>

        {/* CREATE USER CONTENT */}
        <div className="px-4 sm:px-5 lg:px-6 transition-all duration-200">
          <CommonRegistrationModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {
              console.log("Registration complete");
            }}
            asPage={true}
          />
        </div>

      </div>
    </RoleGuard>
  );
}