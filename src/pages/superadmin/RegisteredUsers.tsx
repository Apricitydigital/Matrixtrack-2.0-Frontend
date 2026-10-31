import React, { useEffect,useState } from 'react';
import { User, City, RoleType, StaffRole, STAFF_ROLE_LABELS } from '../../types';
import { StatusBadge } from '../../components/common/Badge';
import {Pagination,usePagination} from '../../components/common/Pagination';
import {api} from '../../services/api';
import {mapUser} from '../../services/adapters';
import {matrixStore} from '../../services/store';
import { generateCsv, downloadCsv } from '../../services/csv';
import { Users, Search, Filter, Download, UserPlus, Phone, Mail, MapPin } from 'lucide-react';

interface RegisteredUsersProps {
  users: User[];
  cities: City[];
}

export const RegisteredUsers: React.FC<RegisteredUsersProps> = ({
  cities
}) => {
  const [users,setUsers]=useState<User[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{const c=new AbortController();api('/city/super-admin-overview',{signal:c.signal}).then(d=>{if(!Array.isArray(d.users))throw Error('User directory unavailable.');if(!c.signal.aborted)setUsers(d.users.map((u:any)=>mapUser(u,u.cityId)));}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[matrixStore.loadRevision]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState(matrixStore.selectedCityId||'all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = users.filter(u => {
    if (cityFilter !== 'all' && u.cityId !== cityFilter) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) ||
             u.email.toLowerCase().includes(q) ||
             u.phone.includes(q);
    }
    return true;
  });

  const paging=usePagination(filteredUsers,search+cityFilter+roleFilter+statusFilter);
  const handleExportCsv = () => {
    const headers = ['User_ID', 'Name', 'Email', 'Phone', 'Role', 'City', 'Status', 'Created_At'];
    const rows = filteredUsers.map(u => {
      const city = cities.find(c => c.id === u.cityId);
      return [
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        city ? city.name : 'State HQ',
        u.status,
        u.createdAt
      ];
    });
    downloadCsv(`registered_users_${Date.now()}.csv`, generateCsv(headers, rows));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Registered Municipal Personnel & Access Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive roster of Administrators, Sanitary Inspectors, Darogas, IEC Members, and Field Staff.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Personnel (CSV)</span>
        </button>
      </div>

      {loading&&<p role="status">Loading registered users...</p>}{error&&<p role="alert">{error}</p>}
      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">All Cities ({cities.length})</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium capitalize"
          >
            <option value="all">All Roles</option>
            <option value="SUPERVISOR">Daroga (Supervisor)</option>
            <option value="QC">Sanitary Inspector</option>
            <option value="ACTION_OFFICER">IEC Member</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="CITY_ADMIN">City Admin</option>
            <option value="ULB_OFFICER">ULB Officer</option>
            <option value="COMMISSIONER">Commissioner</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium capitalize"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="needs_correction">Needs Correction</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Personnel Name</th>
                <th className="px-5 py-3">Role / Designation</th>
                <th className="px-5 py-3">City / Corporation</th>
                <th className="px-5 py-3">Assigned Jurisdiction</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3 text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paging.rows.map(user => {
                const cityName = cities.find(c => c.id === user.cityId)?.name || 'State HQ (Global)';
                const businessRole = (STAFF_ROLE_LABELS as any)[user.role] || user.role;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{user.name}</div>
                      <div className="text-[15px] text-slate-400 font-mono">{user.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{businessRole}</div>
                      <div className="text-[15px] text-slate-400 font-mono uppercase">{user.role}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {cityName}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[15px] text-slate-500">
                      {user.assignedWardIds?.length ? `${user.assignedWardIds.length} Ward assignments` : 'Open city for assignment details'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">
                      {user.phone}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge status={user.status} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination {...paging} noun="users"/>
      </div>
    </div>
  );
};
