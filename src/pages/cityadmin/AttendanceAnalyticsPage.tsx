import React, { useState } from 'react';
import { AttendanceRecord, City, Zone, Ward, User, StaffRole, STAFF_ROLE_LABELS } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { OperationalFilters } from '../../components/common/OperationalFilters';
import { emptyFilters, matchesFilters } from '../../services/presentation';
import { StatusBadge } from '../../components/common/Badge';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { generateCsv, downloadCsv } from '../../services/csv';
import {
  CalendarCheck,
  Upload,
  Download,
  Search,
  Filter,
  UserCheck,
  Clock,
  AlertCircle,
  MapPin
} from 'lucide-react';

interface AttendanceAnalyticsPageProps {
  city: City;
  attendance: AttendanceRecord[];
  zones: Zone[];
  wards: Ward[];
  users: User[];
  currentUser: User;
  onOpenUploadModal: () => void;
  canUpload: boolean;
}

export const AttendanceAnalyticsPage: React.FC<AttendanceAnalyticsPageProps> = ({
  city,
  attendance,
  zones,
  wards,
  users,
  currentUser,
  onOpenUploadModal,
  canUpload
}) => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const cityAtt = attendance.filter(a => a.cityId === city.id);

  const filteredAtt = cityAtt.filter(a => {
    if (!matchesFilters({ ...a, submittedByUserId: a.userId }, filters, [a.userName,a.userId])) return false;
    if (zoneFilter !== 'all' && a.zoneId !== zoneFilter) return false;
    if (wardFilter !== 'all' && a.wardId !== wardFilter) return false;
    if (shiftFilter !== 'all' && a.shift !== shiftFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (roleFilter !== 'all' && a.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.userName.toLowerCase().includes(q) ||
             a.userId.toLowerCase().includes(q);
    }
    return true;
  });

  const paging = usePagination(filteredAtt, JSON.stringify(filters) + city.id);
  const presentCount = filteredAtt.filter(a => a.status === 'present').length;
  const lateCount = filteredAtt.filter(a => a.status === 'late').length;
  const absentCount = filteredAtt.filter(a => a.status === 'absent').length;
  const leaveCount = filteredAtt.filter(a => a.status === 'leave').length;
  const unmarkedCount = filteredAtt.filter(a => a.status === 'unmarked').length;
  const verifiedDenominator = filteredAtt.length;

  const coverageRate = verifiedDenominator > 0
    ? Math.round(((presentCount + lateCount) / verifiedDenominator) * 100)
    : 0;

  const handleExportCsv = () => {
    const headers = ['Date', 'Employee_Name', 'Role', 'Zone', 'Ward', 'Shift', 'Status', 'Check_In', 'Check_Out', 'Source'];
    const rows = filteredAtt.map(a => [
      a.date,
      a.userName,
      a.role,
      a.zoneId,
      a.wardId,
      a.shift,
      a.status,
      a.checkInTime || 'N/A',
      a.checkOutTime || 'N/A',
      a.source
    ]);
    downloadCsv(`attendance_roster_${city.cityCode}_${Date.now()}.csv`, generateCsv(headers, rows));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Backend attendance records for the selected dates, geography and staff.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Roster CSV</span>
          </button>

          {canUpload ? (
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Attendance CSV</span>
            </button>
          ) : (
            <div className="text-xs text-slate-400 font-mono italic px-2 py-1 bg-slate-100 rounded">
              Read-Only Attendance Mode
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Effective Attendance Rate"
          value={`${coverageRate}%`}
          denominator={`${verifiedDenominator} Loaded records`}
          subtitle="Present and late records in this selection"
          icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          label="Present"
          value={presentCount}
          denominator={`${verifiedDenominator} Total`}
          subtitle="Present in loaded attendance records"
          icon={<Clock className="w-4 h-4 text-blue-600" />}
        />
        <StatCard
          label="Late Arrival / Delays"
          value={lateCount}
          denominator={`${absentCount} Confirmed Absent`}
          subtitle="Late status as recorded by the attendance source"
          icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
        />
        <StatCard
          label="Authorized Leave / Unmarked"
          value={leaveCount}
          denominator={`${unmarkedCount} Unmarked`}
          subtitle="Leave status reported by the attendance source"
          icon={<CalendarCheck className="w-4 h-4 text-slate-600" />}
        />
      </div>

      <OperationalFilters value={filters} onChange={setFilters} zones={zones.filter(z => z.cityId === city.id)} wards={wards.filter(w => w.cityId === city.id)} users={users.filter(u => u.cityId === city.id)} modules={false} statuses={['present','absent','late','leave','unmarked']} resultCount={filteredAtt.length} />

      {/* Attendance Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Employee Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Assigned Ward</th>
                <th className="px-5 py-3">Shift</th>
                <th className="px-5 py-3">Check-In / Out</th>
                <th className="px-5 py-3">Source Channel</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paging.rows.map((rec) => {
                const roleLabel = STAFF_ROLE_LABELS[rec.role] || rec.role;
                const ward = wards.find(w => w.id === rec.wardId);

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{rec.userName}</div>
                      <div className="text-[15px] text-slate-400 font-mono">{rec.userId}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {roleLabel}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{ward ? `Ward ${ward.wardNumber}` : rec.wardId}</div>
                      <div className="text-[15px] text-slate-400">{ward?.name}</div>
                    </td>
                    <td className="px-5 py-3.5 capitalize text-slate-700 font-medium">
                      {rec.shift.replaceAll('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[15px] text-slate-600">
                      <div>In: {rec.checkInTime || '--:--'}</div>
                      <div className="text-slate-400">Out: {rec.checkOutTime || '--:--'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[15px] capitalize text-slate-500">
                      {rec.source.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge status={rec.status} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination {...paging} noun="attendance records" />
      </div>
    </div>
  );
};
