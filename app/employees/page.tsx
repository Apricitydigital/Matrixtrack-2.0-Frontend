'use client';
import { useEffect, useMemo, useState } from "react";
import { EmployeesApi } from "@lib/apiClient";
import { FilterTabs, RecordsTable, TableColumn } from "../modules/qc-shared";
import { moduleLabel, roleLabel } from "@lib/labels";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  modules: { key: string; name: string }[];
  zones: string[];
  wards: string[];
  createdAt?: string;
};

import CommonRegistrationModal from "@components/CommonRegistrationModal";
import { UserPlus, Sparkles } from "lucide-react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string>('ALL');
  const [activeRole, setActiveRole] = useState<string>('ALL');
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await EmployeesApi.list();
      const mapped = (data.employees || []).map((e: any) => ({
        ...e,
        modules: (e.modules || []).map((m: any) => ({ key: m.key, name: m.name || m.key }))
      }));
      setEmployees(mapped);
    } catch (err) {
      console.error("Failed to load employees", err);
    } finally {
      setLoading(false);
    }
  };

  const moduleTabs = useMemo(() => {
    const all = new Set<string>();
    employees.forEach(e => e.modules.forEach(m => all.add(m.key)));
    const tabs = Array.from(all).map(key => ({
      id: key,
      label: moduleLabel(key)
    }));
    // Sort tabs alphabetically
    tabs.sort((a, b) => a.label.localeCompare(b.label));

    return [
      { id: 'ALL', label: 'All Modules' },
      ...tabs
    ];
  }, [employees]);

  const roleTabs = useMemo(() => {
    const all = new Set<string>();
    employees.forEach(e => all.add(e.role));
    const tabs = Array.from(all).map(role => ({
      id: role,
      label: roleLabel(role)
    }));
    // Sort tabs alphabetically
    tabs.sort((a, b) => a.label.localeCompare(b.label));

    return [
      { id: 'ALL', label: 'All Roles' },
      ...tabs
    ];
  }, [employees]);

  const filtered = useMemo(() => {
    let result = employees;
    if (activeModule !== 'ALL') {
      result = result.filter(e => e.modules.some(m => m.key === activeModule));
    }
    if (activeRole !== 'ALL') {
      result = result.filter(e => e.role === activeRole);
    }
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(lower) ||
        e.email.toLowerCase().includes(lower) ||
        (e.phone && e.phone.includes(lower))
      );
    }
    return result;
  }, [employees, activeModule, activeRole, search]);

  const columns: TableColumn<Employee>[] = [
    {
      key: 'sn',
      label: '#',
      render: (_, index) => (
        <div className="text-sm font-bold text-slate-400">{(index ?? 0) + 1}</div>
      )
    },
    {
      key: 'name',
      label: 'Employee',
      render: (e) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder" style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '16px'
          }}>
            <span>{e.name?.charAt(0).toUpperCase() || '?'}</span>
          </div>
          <div className="font-bold">{e.name}</div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (e) => (
        <div className="text-sm font-medium" style={{ color: '#475569' }}>
          {roleLabel(e.role)}
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (e) => (
        <div className="text-sm">{e.email}</div>
      )
    },
    {
      key: 'phone',
      label: 'Mobile No',
      render: (e) => (
        <div className="text-sm">{e.phone || <span className="muted">-</span>}</div>
      )
    },
    {
      key: 'modules',
      label: 'Modules',
      render: (e) => (
        <div className="flex flex-wrap gap-1">
          {e.modules.map(m => (
            <span key={m.key} className="badge badge-sm badge-ghost">{m.name || m.key}</span>
          ))}
        </div>
      )
    },
    {
      key: 'zones',
      label: 'Zone',
      render: (e) => (
        <div className="text-xs max-w-xs break-words font-medium">
          {(e.zones || []).length ? e.zones.join(", ") : <span className="muted">-</span>}
        </div>
      )
    },
    {
      key: 'wards',
      label: 'Ward',
      render: (e) => (
        <div className="text-xs max-w-xs break-words font-medium">
          {(e.wards || []).length ? e.wards.join(", ") : <span className="muted">-</span>}
        </div>
      )
    }
  ];

  return (
    <div className="content">
      <section className="card mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Employees</h1>
            <p className="muted text-sm">Manage access and assignments across modules.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                border: "none",
                borderRadius: "10px",
                padding: "10px 18px",
                color: "#fff",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
              }}
            >
              <UserPlus size={16} /> + Integrated Registration & Bulk Import
            </button>
            <div className="badge badge-neutral" style={{ padding: "12px 14px" }}>{employees.length} Total</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Controls Row */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                className="input input-bordered w-full md:w-80"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FilterTabs
                tabs={roleTabs}
                activeTab={activeRole}
                onChange={(id) => setActiveRole(id)}
              />
            </div>
            <FilterTabs
              tabs={moduleTabs}
              activeTab={activeModule}
              onChange={(id) => setActiveModule(id)}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <RecordsTable<Employee>
          rows={filtered}
          columns={columns}
          loading={loading}
          emptyMessage="No employees found matching criteria."
        />
      </section>

      <CommonRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          load();
        }}
      />
    </div>
  );
}
