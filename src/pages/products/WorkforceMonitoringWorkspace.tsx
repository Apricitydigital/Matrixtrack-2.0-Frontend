import React, { useState } from 'react';
import { City, User, AttendanceRecord } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/Badge';
import {
  Briefcase,
  MapPin,
  Users,
  Clock,
  CalendarCheck,
  ShieldCheck,
  AlertCircle,
  SlidersHorizontal,
  Smartphone
} from 'lucide-react';

interface WorkforceMonitoringWorkspaceProps {
  city: City;
  users: User[];
  attendance: AttendanceRecord[];
  currentUser: User;
}

export const WorkforceMonitoringWorkspace: React.FC<WorkforceMonitoringWorkspaceProps> = ({
  city,
  users,
  attendance,
  currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    | 'dashboard'
    | 'daroga_mgmt'
    | 'kothi_assignment'
    | 'geofencing'
    | 'short_attendance'
    | 'leave'
  >('dashboard');

  const cityUsers = users.filter(u => u.cityId === city.id);
  const darogas = cityUsers.filter(u => u.role === 'SUPERVISOR');
  const employees = cityUsers.filter(u => u.role === 'EMPLOYEE');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Workforce Intelligence & Field Attendance Suite
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              Geofence & Biometric Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time field monitoring, Daroga/Kothi rosters, geofenced perimeter verification, and leave sanctioning.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Field Sanitation Workforce"
          value={employees.length}
          denominator={`${darogas.length} Darogas`}
          subtitle="Enrolled in geofenced beat tracking"
          icon={<Users className="w-4 h-4 text-indigo-600" />}
        />
        <StatCard
          label="Geofence Check-in Accuracy"
          value="98.2%"
          denominator="15m Radius"
          subtitle="GPS coordinates inside active beat polygon"
          icon={<MapPin className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          label="Short Attendance Alerts"
          value="1"
          denominator="Grace: 15m"
          subtitle="Departure prior to 8-hour shift completion"
          icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
        />
        <StatCard
          label="Kothi Depots Active"
          value="12"
          denominator="Rollcall Points"
          subtitle="Equipment dispatch and morning biometric muster"
          icon={<Briefcase className="w-4 h-4 text-blue-600" />}
        />
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500 overflow-x-auto">
        {[
          { id: 'dashboard', label: '1. Live Workforce Dashboard' },
          { id: 'daroga_mgmt', label: `2. Daroga Roster (${darogas.length})` },
          { id: 'kothi_assignment', label: '3. Kothi & Depot Assignments' },
          { id: 'geofencing', label: '4. Geofencing Coordinates' },
          { id: 'short_attendance', label: '5. Short Attendance & Audit' },
          { id: 'leave', label: '6. Professional Leave Management' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`py-2.5 border-b-2 whitespace-nowrap transition-colors ${
              activeSubTab === tab.id
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub Tab: Dashboard */}
      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
              Morning Shift Rollcall & Muster Verification
            </h3>
            <p className="text-slate-600">
              Shift muster starts promptly at 06:00 AM across all designated Kothi ward depots. Field staff verify attendance through handheld GPS biometric scanners.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-slate-600">Muster Complete Rate:</span>
                <span className="font-bold text-emerald-700">96.4% on-schedule</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-600">Daroga Supervision Sign-off:</span>
                <span className="font-bold text-indigo-700">100% Certified</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
              Geofence Violation & Tamper Detection
            </h3>
            <p className="text-slate-600">
              The MatrixTrack field agent app flags simulated location mockers, VPNs, or clock tampering to ensure biometric authenticity.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 font-mono">
              Status: 0 Mock Locations Detected Today. All coordinate samples authenticated with cell tower triangulation.
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Daroga Management */}
      {activeSubTab === 'daroga_mgmt' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Daroga Name</th>
                  <th className="px-5 py-3">Phone & ID</th>
                  <th className="px-5 py-3">Assigned Wards</th>
                  <th className="px-5 py-3">Shift Status</th>
                  <th className="px-5 py-3 text-right">Account State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {darogas.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{d.name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{d.phone}</td>
                    <td className="px-5 py-3.5 text-slate-700">{d.assignedWardIds?.join(', ') || 'Zone 1'}</td>
                    <td className="px-5 py-3.5 font-mono text-emerald-700 font-semibold">Checked In (05:45 AM)</td>
                    <td className="px-5 py-3.5 text-right"><StatusBadge status={d.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other Sub Tabs fallback */}
      {['kothi_assignment', 'geofencing', 'short_attendance', 'leave'].includes(activeSubTab) && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
          <p className="font-semibold text-slate-800 capitalize">
            {activeSubTab.replace(/_/g, ' ')} Module Parameters
          </p>
          <p className="text-slate-400 font-mono max-w-md mx-auto">
            Operational municipal parameters active in local demo store for {city.name}. All geofence boundaries and Kothi depot points configured.
          </p>
        </div>
      )}
    </div>
  );
};
