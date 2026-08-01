"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@hooks/useAuth";
import { canonicalizeModules, moduleEntryPath } from "@utils/modules";
import { moduleLabel } from "@lib/labels";
import type { Role } from "../../types/auth";
import {
  Home,
  Users,
  ChevronDown,
  ChevronUp,
  Shield,
  Sparkles,
  Wind,
  RefreshCw,
  Trash2,
  LayoutDashboard,
  FileText,
  Layout,
  Map,
  MapPin,
  Target,
  Database,
  Bell,
} from "lucide-react";

function titleCase(text: string) {
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

const getModuleIcon = (key: string) => {
  const k = key.toUpperCase();
  if (k.includes("TOILET")) return <Sparkles size={16} />;
  if (k.includes("SWEEPING")) return <Wind size={16} />;
  if (k.includes("CTU") || k.includes("GVP")) return <RefreshCw size={16} />;
  if (k.includes("LITTER")) return <Trash2 size={16} />;
  return <FileText size={16} />;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [modulesOpen, setModulesOpen] = useState(true);
  const [masterOpen, setMasterOpen] = useState(false);

  const moduleLinks = useMemo(() => {
    const canonical = canonicalizeModules(user?.modules || []);
    if (!canonical.length) return [];
    const mLinks = canonical.map((m) => ({
      label: moduleLabel(m.key, m.name || m.key),
      href: moduleEntryPath(user || null, m.key),
      key: m.key,
    }));
    // Sort: TOILET first
    return mLinks.sort((a, b) => {
      if (a.key === "TOILET") return -1;
      if (b.key === "TOILET") return 1;
      return 0;
    });
  }, [user?.modules, user?.roles]);

  let links: { label: string; href: string; icon?: React.ReactNode }[] = [];
  if (!user) {
    links = [
      { label: "Home", href: "/", icon: <Home size={18} /> },
      { label: "Login", href: "/login", icon: <Shield size={18} /> },
    ];
  } else {
    // Strictly render modules from auth token; no role-based injection
    links = [
      { label: "Portal Home", href: "/portal-home", icon: <Layout size={18} /> }
    ];
    if (!user.roles.includes("COMMISSIONER" as Role) && !user.roles.includes("CITY_ADMIN" as Role)) {
      links.push({ label: "Home", href: "/", icon: <Home size={18} /> });
    }

    if (user.roles.includes("HMS_SUPER_ADMIN" as Role)) {
      links.push({
        label: "HMS Super Admin",
        href: "/hms",
        icon: <Shield size={18} />,
      });
    }
    if (
      user.roles.includes("CITY_ADMIN" as Role) ||
      user.roles.includes("COMMISSIONER" as Role)
    ) {
      links.push({
        label: "City Dashboard",
        href: "/city",
        icon: <LayoutDashboard size={18} />,
      });
    }
    if (!user.roles.includes("HMS_SUPER_ADMIN" as Role)) {
      links.push({
        label: "Employees",
        href: "/employees",
        icon: <Users size={18} />,
      });
    }
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="sidebar">
      <div
        className="logo"
        style={{ padding: "8px 16px", borderBottom: "1px solid #f1f5f9", marginBottom: "0px" }}
      >
        <div
          className="logo-mark"
          style={{
            backgroundColor: "#2563eb",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            flexShrink: 0,
          }}
        >
          <Shield size={22} color="white" />
        </div>
        <div>
          <div
            className="logo-title"
            style={{
              fontSize: "1.05rem",
              fontWeight: 800,
              color: "#1e293b",
              letterSpacing: "-0.5px",
            }}
          >
            Taskforce 20
          </div>
          <div
            className="logo-sub"
            style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}
          >
            Admin Portal
          </div>
        </div>
      </div>

      <div className="nav-section" style={{ padding: "4px 12px" }}>
        <div
          className="nav-label"
          style={{
            padding: "4px 12px",
            marginBottom: "6px",
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Navigation
        </div>

        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              className={`nav-link ${active ? "active" : ""}`}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 12px",
                borderRadius: "8px",
                marginBottom: "4px",
                color: active ? "#2563eb" : "#475569",
                backgroundColor: active ? "#eff6ff" : "transparent",
                fontWeight: active ? 600 : 500,
                transition: "all 0.2s",
              }}
            >
              {link.icon && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    color: active ? "#2563eb" : "#64748b",
                  }}
                >
                  {link.icon}
                </span>
              )}
              <span>{link.label}</span>
            </Link>
          );
        })}

        {user &&
          (user.roles.includes("CITY_ADMIN" as Role) ||
            user.roles.includes("COMMISSIONER" as Role)) && (
            <div style={{ marginTop: "4px" }}>
              <button
                onClick={() => setMasterOpen(!masterOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  transition: "all 0.2s",
                  marginBottom: masterOpen ? "4px" : "0",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span
                    style={{
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Database size={18} />
                  </span>
                  <span>Master</span>
                </div>
                <span
                  style={{
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {masterOpen ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </span>
              </button>

              {masterOpen && (
                <div
                  style={{
                    paddingLeft: "32px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    marginBottom: "8px",
                  }}
                >
                  {[
                    {
                      label: "Zones",
                      href: "/city/zones",
                      icon: <Map size={16} />,
                    },
                    {
                      label: "Wards",
                      href: "/city/wards",
                      icon: <MapPin size={16} />,
                    },
                    {
                      label: "Areas & Beats",
                      href: "/city/areas",
                      icon: <Target size={16} />,
                    },
                    {
                      label: "Municipal Users",
                      href: "/city/users",
                      icon: <Users size={16} />,
                    },
                    {
                      label: "Registration Requests",
                      href: "/registration-requests",
                      icon: <Bell size={16} />,
                    },
                  ].map((link) => {
                    const active =
                      pathname === link.href ||
                      pathname.startsWith(`${link.href}/`);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          color: active ? "#2563eb" : "#64748b",
                          backgroundColor: active ? "#eff6ff" : "transparent",
                          fontWeight: active ? 600 : 500,
                          fontSize: "0.85rem",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!active)
                            e.currentTarget.style.backgroundColor = "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          if (!active)
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                        }}
                      >
                        <span
                          style={{
                            color: active ? "#2563eb" : "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            opacity: active ? 1 : 0.7,
                          }}
                        >
                          {link.icon}
                        </span>
                        <span
                          style={{
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            lineHeight: "1.2",
                          }}
                        >
                          {link.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        {user && moduleLinks.length > 0 && (
          <div style={{ marginTop: "4px" }}>
            <button
              onClick={() => setModulesOpen(!modulesOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#475569",
                fontWeight: 600,
                fontSize: "0.95rem",
                transition: "all 0.2s",
                marginBottom: modulesOpen ? "4px" : "0",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f8fafc")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span
                  style={{
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Layout size={18} />
                </span>
                <span>Modules</span>
              </div>
              <span
                style={{
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {modulesOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </span>
            </button>

            {modulesOpen && (
              <div
                style={{
                  paddingLeft: "32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {moduleLinks.map((link) => {
                  const active =
                    pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        color: active ? "#2563eb" : "#64748b",
                        backgroundColor: active ? "#eff6ff" : "transparent",
                        fontWeight: active ? 600 : 500,
                        fontSize: "0.85rem",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!active)
                          e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (!active)
                          e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <span
                        style={{
                          color: active ? "#2563eb" : "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          opacity: active ? 1 : 0.7,
                        }}
                      >
                        {getModuleIcon(link.key)}
                      </span>
                      <span
                        style={{
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          lineHeight: "1.2",
                        }}
                      >
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="nav-section"
        style={{ marginTop: "auto", padding: "16px" }}
      >
        {!loading && user && (
          <button
            className="btn btn-secondary btn-sm w-full"
            onClick={handleLogout}
            style={{
              border: "1px solid #e2e8f0",
              backgroundColor: "#fff",
              color: "#475569",
              fontWeight: 700,
              padding: "10px",
              borderRadius: "10px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            Logout
          </button>
        )}
        {!loading && !user && (
          <Link className="btn btn-secondary btn-sm w-full" href="/unified-login">
            Login
          </Link>
        )}
      </div>
    </aside>
  );
}
