'use client';

import React, { useState } from "react";
import CommonRegistrationModal from "@components/CommonRegistrationModal";
import RegisteredUsersPage from "../registered-users/page";
import { RoleGuard } from "@components/Guards";
import { UserPlus, Users } from "lucide-react";

export default function UserRegistrationManagementPage() {
  const [activeTab, setActiveTab] = useState<"register" | "directory">("register");

  return (
    <RoleGuard roles={['HMS_SUPER_ADMIN', 'SUPER_ADMIN', 'CITY_ADMIN', 'COMMISSIONER']}>
      <div className="min-w-0 space-y-6 pb-10">
        
        {/* Navigation Tabs Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 lg:px-6 mt-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-500/20">
                {activeTab === "register" ? <UserPlus size={22} /> : <Users size={22} />}
              </span>
              User Registration & Management
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {activeTab === "register" 
                ? "Register users simultaneously for Inspection and performance system and ward ranking system"
                : "Manage registered users, update permissions and modules assignment"
              }
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setActiveTab("register")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus size={14} />
              Create User
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "directory"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={14} />
              Registered Users
            </button>
          </div>
        </div>

        {/* Tab Content Rendering */}
        <div className="transition-all duration-200">
          {activeTab === "register" ? (
            <div className="px-4 sm:px-5 lg:px-6">
              <CommonRegistrationModal
                isOpen={true}
                onClose={() => {}}
                onSuccess={() => {
                  console.log("Registration complete");
                }}
                asPage={true}
              />
            </div>
          ) : (
            <RegisteredUsersPage />
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
