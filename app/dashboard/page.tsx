'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@hooks/useAuth";
import { RegistrationApi, CityApi, HmsApi } from "@lib/apiClient";
import {
  Shield, Building2, Users, ArrowRight, Settings,
  RefreshCw, Globe, Zap, Database, Server, LayoutGrid, Calendar
} from "lucide-react";

const moduleCards = [
  {
    title: "CTU/GVP Transformation",
    desc: "Manage field operations and team assignments.",
    icon: <Users size={20} />,
    href: "/taskforce",
    actions: [
      { label: "Zones", href: "/taskforce/zones" },
      { label: "Wards", href: "/taskforce/wards" },
      { label: "Areas", href: "/taskforce/areas" },
      { label: "Beats", href: "/taskforce/beats" },
    ],
  },
  {
    title: "HMS Super Admin",
    desc: "System-wide infrastructure and city management.",
    icon: <Shield size={20} />,
    href: "/hms",
  },
  {
    title: "User Management",
    desc: "Control access and permissions for all staff.",
    icon: <Users size={20} />,
    href: "/users",
  },
];

function CityAdminDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true);
        const res = await RegistrationApi.listRequests();
        setRequests((res as any).requests ?? []);
      } catch (err) {
        console.error("Failed to load registration requests", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.cityId) loadRequests();
  }, [user]);

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <div className="page" style={{ background: 'transparent' }}>
      <div className="fade-in">
        <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Building2 size={18} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>City Command Center</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Managing {(user as any)?.city?.name || 'Municipal'} Infrastructure</p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/city" style={{ textDecoration: 'none' }}>
              <button style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13 }}>
                <Settings size={16} /> Configuration
              </button>
            </Link>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#eff6ff', color: '#2563eb', padding: 8, borderRadius: 8 }}>
                  <Users size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Registrations</h3>
              </div>
              {pendingRequests.length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', padding: '1px 8px', borderRadius: 12, fontSize: 10, fontWeight: 900 }}>{pendingRequests.length} NEW</span>
              )}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
              Review {pendingRequests.length} pending requests from municipal staff.
            </div>
            <Link href="/registration-requests" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', background: '#1e3a8a', color: '#fff', padding: '10px', borderRadius: 10, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
                Review Requests <ArrowRight size={14} />
              </button>
            </Link>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: 8, borderRadius: 8 }}>
                <Shield size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Active Modules</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>8</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>Modules</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>124</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>Staff</div>
              </div>
            </div>
            <Link href="/city" style={{ textDecoration: 'none', display: 'block', marginTop: 16, textAlign: 'center', color: '#2563eb', fontWeight: 700, fontSize: 13 }}>
              Manage City Settings
            </Link>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Registration Pipeline</h3>
            <Link href="/registration-requests" style={{ color: '#2563eb', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>View All</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Module</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.slice(0, 5).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '12px 24px', fontSize: 12, color: '#475569', fontWeight: 600 }}>{r.moduleKey || 'N/A'}</td>
                  <td style={{ padding: '12px 24px' }}>
                    <span style={{ fontSize: 9, fontWeight: 900, background: '#fef3c7', color: '#d97706', padding: '3px 6px', borderRadius: 4 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                    <Link href={`/registration-requests/${r.id}`} style={{ color: '#2563eb', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RegularUserDashboard() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleCard = (title: string) => {
    setExpanded((prev) => (prev === title ? null : title));
  };

  const visibleCards = moduleCards.filter(card => {
    if (card.title === "HMS Super Admin") {
      return user?.roles.includes("HMS_SUPER_ADMIN");
    }
    return true;
  });

  return (
    <div className="page" style={{ background: 'transparent' }}>
      <div className="hero" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Taskforce 20 Workspace</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Select a workspace to manage city activities.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {visibleCards.map((card) => {
          const isOpen = expanded === card.title;
          return (
            <div key={card.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
              <div style={{ marginBottom: '16px', color: '#1e3a8a' }}>{card.icon}</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 900 }}>{card.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.4 }}>{card.desc}</p>
              {!card.actions ? (
                <Link href={card.href} style={{ display: 'inline-block', background: '#1e3a8a', color: '#fff', padding: '8px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>Open Console</Link>
              ) : (
                <>
                  <button onClick={() => toggleCard(card.title)} style={{ background: '#1e3a8a', color: '#fff', padding: '8px 20px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>{isOpen ? 'Close' : 'Open Transformation'}</button>
                  {isOpen && card.actions && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {card.actions.map(action => <Link key={action.label} href={action.href} style={{ color: '#1e3a8a', fontWeight: 600, textDecoration: 'none', fontSize: 13, background: '#eff6ff', padding: '6px 10px', borderRadius: '6px' }}>{action.label}</Link>)}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isCityAdminOrCommissioner = user?.roles.includes("CITY_ADMIN") || user?.roles.includes("COMMISSIONER");
  if (isCityAdminOrCommissioner) return <CityAdminDashboard />;
  return <RegularUserDashboard />;
}
