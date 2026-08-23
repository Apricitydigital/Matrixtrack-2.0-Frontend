


'use client';

import React, { useState, useEffect } from "react";
import CommonRegistrationModal from "@components/CommonRegistrationModal";
import { RoleGuard } from "@components/Guards";
import { UserPlus, Shield } from "lucide-react";
import { useAuth } from "@hooks/useAuth";
import { useToast } from "@components/ui/ToastProvider";
import { Modal } from "@components/ui/Modal";
import { CityApi } from "@lib/apiClient";

export default function UserRegistrationManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [showRegisterCommissionerModal, setShowRegisterCommissionerModal] = useState(false);
  const [commissionerCityId, setCommissionerCityId] = useState("");
  const [commissionerName, setCommissionerName] = useState("");
  const [commissionerEmail, setCommissionerEmail] = useState("");
  const [commissionerPassword, setCommissionerPassword] = useState("");
  const [commissionerCreating, setCommissionerCreating] = useState(false);
  const [commissionerStatus, setCommissionerStatus] = useState<string | null>(null);
  const [citiesList, setCitiesList] = useState<any[]>([]);

  const isCityAdmin = user?.role === "CITY_ADMIN" || user?.roles?.includes("CITY_ADMIN" as any);
  const isSuperAdmin = user?.role === "HMS_SUPER_ADMIN" || user?.role === "SUPER_ADMIN" || user?.roles?.includes("HMS_SUPER_ADMIN" as any) || user?.roles?.includes("SUPER_ADMIN" as any);
  const canRegisterCommissioner = isCityAdmin || isSuperAdmin || Boolean(user);

  useEffect(() => {
    if (showRegisterCommissionerModal && citiesList.length === 0) {
      CityApi.list()
        .then((res) => {
          setCitiesList(res.cities || []);
        })
        .catch((err) => {
          console.error("Failed to fetch cities", err);
        });
    }
  }, [showRegisterCommissionerModal, citiesList.length]);

  const handleCreateCommissionerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommissionerCreating(true);
    setCommissionerStatus(null);

    try {
      const defaultCity = user?.cityId || citiesList[0]?.id || "";
      const targetCityId = commissionerCityId || defaultCity;

      if (!targetCityId) {
        setCommissionerStatus("Please select a city.");
        setCommissionerCreating(false);
        return;
      }

      await CityApi.createCommissioner(targetCityId, {
        name: commissionerName.trim(),
        email: commissionerEmail.trim().toLowerCase(),
        password: commissionerPassword.trim()
      });

      showToast({
        title: "Commissioner Created",
        description: `Successfully registered Commissioner "${commissionerName}".`,
        tone: "success"
      });

      setShowRegisterCommissionerModal(false);
      setCommissionerName("");
      setCommissionerEmail("");
      setCommissionerPassword("");
    } catch (err: any) {
      console.error("Failed to create commissioner", err);
      const msg = err?.message || "Failed to create commissioner.";
      setCommissionerStatus(msg);
      showToast({
        title: "Registration Failed",
        description: msg,
        tone: "error"
      });
    } finally {
      setCommissionerCreating(false);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-5 lg:px-6 mt-4 mb-4">
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

          {canRegisterCommissioner && (
            <button
              type="button"
              onClick={() => setShowRegisterCommissionerModal(true)}
              className="
                inline-flex h-11 shrink-0 items-center justify-center gap-2
                rounded-xl bg-blue-600 px-5
                text-xs font-black text-white shadow-md shadow-blue-500/20
                hover:bg-blue-500 transition cursor-pointer self-start sm:self-auto
              "
            >
              <Shield size={16} className="text-white" />
              Register Commissioner
            </button>
          )}
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

        {/* ── REGISTER COMMISSIONER MODAL ── */}
        {showRegisterCommissionerModal && (
          <Modal
            open={showRegisterCommissionerModal}
            onClose={() => setShowRegisterCommissionerModal(false)}
            title="Register Commissioner"
            subtitle="CREATE A CITY-LEVEL READ-ONLY COMMISSIONER ACCOUNT"
            size="sm"
          >
            <form onSubmit={handleCreateCommissionerSubmit} className="flex flex-col gap-4 py-1">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">
                  City <span className="text-red-500">*</span>
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  value={commissionerCityId || user?.cityId || citiesList[0]?.id || ""}
                  onChange={(e) => setCommissionerCityId(e.target.value)}
                  disabled={isCityAdmin && Boolean(user?.cityId)}
                  required
                >
                  {citiesList.length === 0 ? (
                    <option value={user?.cityId || ""}>{user?.cityName || "Indore"} (indore)</option>
                  ) : (
                    citiesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code || c.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  value={commissionerName}
                  onChange={(e) => setCommissionerName(e.target.value)}
                  placeholder="Commissioner Name"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">
                  Email Id <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  value={commissionerEmail}
                  onChange={(e) => setCommissionerEmail(e.target.value)}
                  placeholder="commissioner@city.local"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">
                  Enter Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  value={commissionerPassword}
                  onChange={(e) => setCommissionerPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {commissionerStatus && (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700">
                  {commissionerStatus}
                </div>
              )}

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterCommissionerModal(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={commissionerCreating}
                  className="flex-1 h-10 rounded-xl bg-blue-900 text-xs font-extrabold text-white shadow-md hover:bg-blue-800 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {commissionerCreating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Shield size={15} />
                      <span>Create</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}

      </div>
    </RoleGuard>
  );
}