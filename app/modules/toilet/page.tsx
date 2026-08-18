'use client';

import { useAuth } from "@hooks/useAuth";
import { ModuleGuard } from "@components/Guards";
import { useState, useEffect } from "react";
import { CityApi, ToiletApi } from "@lib/apiClient";
import ReportsTab from "./ReportsTab";
import AllToiletsTab from "./AllToiletsTab";
import ApprovalsTab from "./ApprovalsTab";
import AssignmentsTab from "./AssignmentsTab";
import SubmittedReportsTab from "../qc-shared/SubmittedReportsTab";
import UniversalReportModal from "@components/UniversalReportModal";

import type { Role } from "../../../types/auth";

export default function ToiletModulePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("reports");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("ALL");

  const isSuperAdmin =
    user?.role === 'super_admin' ||
    user?.role === 'hms_super_admin' ||
    user?.role === 'SUPER_ADMIN' ||
    (user?.roles || []).includes('hms_super_admin') ||
    (user?.roles || []).includes('HMS_SUPER_ADMIN') ||
    (user?.roles || []).includes('SUPER_ADMIN') ||
    (user?.roles || []).includes('super_admin');

  useEffect(() => {
    if (isSuperAdmin) {
      CityApi.list().then(res => {
        setCities(res.cities || []);
      }).catch(console.error);
    }
  }, [isSuperAdmin]);

  const tabs: { id: string; label: string; roles: Role[] }[] = [
    { id: "reports", label: "Dashboard", roles: ["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"] },
    { id: "submitted_reports", label: "Inspection Reports", roles: ["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"] },
    { id: "all", label: "All Registered Toilets", roles: ["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"] },
    { id: "approvals", label: "Verification & Approvals", roles: ["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"] },
    { id: "assignments", label: "Supervisor Assignments", roles: ["QC", "CITY_ADMIN", "HMS_SUPER_ADMIN"] },
  ];

  const visibleTabs = tabs.filter(tab =>
    isSuperAdmin || tab.roles.some(role => user?.roles?.includes(role))
  );

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [user, visibleTabs, activeTab]);

  return (
    <ModuleGuard module="TOILET" roles={["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div style={{ padding: '0 0 24px 0' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -5px rgba(15,23,42,0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Cleanliness of Toilets
              </h1>
              {isSuperAdmin ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>City:</span>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 10,
                      border: '1px solid #93c5fd',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="ALL">All Cities</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                user?.cityName && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 20 }}>
                    {user.cityName.split('(')[0].trim()}
                  </span>
                )
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
              Manage toilet assets, cleanliness inspections, and staff assignments.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {visibleTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '9px 18px',
                    fontSize: 13,
                    fontWeight: isActive ? 800 : 600,
                    borderRadius: 12,
                    border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isActive ? '#2563eb' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease-in-out'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tab-container">
          {activeTab === "reports" && <ReportsTab cityId={selectedCity} />}
          {activeTab === "submitted_reports" && (
            <SubmittedReportsTab
              moduleKey="TOILET"
              assetLabel="Toilet"
              cityId={selectedCity}
              onViewReport={(rec) => setSelectedReport(rec)}
            />
          )}
          {activeTab === "all" && <AllToiletsTab cityId={selectedCity} />}
          {activeTab === "approvals" && <ApprovalsTab cityId={selectedCity} />}
          {activeTab === "assignments" && <AssignmentsTab cityId={selectedCity} />}
        </div>

        {selectedReport && (
          <UniversalReportModal
            moduleTitle="Toilet Cleanliness Inspection"
            record={selectedReport}
            onClose={() => setSelectedReport(null)}
            onApprove={async (rec, comment) => {
              if (rec.type === 'TOILET_REGISTRATION' || rec.type === 'TOILET_REQUEST' || rec.isRegistration) {
                await ToiletApi.approveToilet(rec.id, { comment });
              } else {
                await ToiletApi.reviewInspection(rec.id, { status: 'APPROVED', comment });
              }
              setSelectedReport(null);
            }}
            onReject={async (rec, comment) => {
              if (rec.type === 'TOILET_REGISTRATION' || rec.type === 'TOILET_REQUEST' || rec.isRegistration) {
                await ToiletApi.rejectToilet(rec.id, comment || '');
              } else {
                await ToiletApi.reviewInspection(rec.id, { status: 'REJECTED', comment });
              }
              setSelectedReport(null);
            }}
            onActionRequired={async (rec, comment) => {
              await ToiletApi.reviewInspection(rec.id, { status: 'ACTION_REQUIRED', comment });
              setSelectedReport(null);
            }}
          />
        )}
      </div>
    </ModuleGuard>
  );
}
