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
  UserPlus,
  ChevronDown,
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
  LogOut,
  Building2,
  CheckCircle2,
  Globe,

} from "lucide-react";

const getModuleIcon = (key: string) => {
  const normalizedKey = key.toUpperCase();

  if (normalizedKey.includes("TOILET")) {
    return <Sparkles size={16} />;
  }

  if (normalizedKey.includes("SWEEPING")) {
    return <Wind size={16} />;
  }

  if (
    normalizedKey.includes("CTU") ||
    normalizedKey.includes("GVP")
  ) {
    return <RefreshCw size={16} />;
  }

  if (normalizedKey.includes("LITTER")) {
    return <Trash2 size={16} />;
  }

  return <FileText size={16} />;
};

type NavigationLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

function NavItem({
  href,
  icon,
  label,
  active,
  compact = false,
}: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        group relative flex items-center gap-3 rounded-lg
        font-medium transition-all duration-200
        ${compact
          ? "px-3 py-2 text-[13px]"
          : "px-3 py-2.5 text-sm"
        }
        ${active
          ? "bg-primary-soft text-primary-strong"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }
      `}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}

      {icon && (
        <span
          className={`
            flex items-center transition-colors
            ${active
              ? "text-primary"
              : "text-slate-400 group-hover:text-slate-600"
            }
            ${compact ? "opacity-80" : ""}
          `}
        >
          {icon}
        </span>
      )}

      <span className="truncate leading-tight">{label}</span>
    </Link>
  );
}

function CollapsibleGroup({
  label,
  icon,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center text-slate-400">
            {icon}
          </span>

          <span>{label}</span>
        </div>

        <ChevronDown
          size={15}
          className={`
            text-slate-400 transition-transform duration-200
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      <div
        className={`
          grid overflow-hidden transition-all duration-200
          ease-out-expo
          ${open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
          }
        `}
      >
        <div className="min-h-0">
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-slate-100 pl-3.5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { user, logout, loading } = useAuth();

  const [modulesOpen, setModulesOpen] = useState(true);
  const [masterOpen, setMasterOpen] = useState(false);

  const isHmsSuperAdmin =
    user?.roles.includes("HMS_SUPER_ADMIN" as Role) ?? false;

  const isCityAdmin =
    user?.roles.includes("CITY_ADMIN" as Role) ?? false;

  const isCommissioner =
    user?.roles.includes("COMMISSIONER" as Role) ?? false;

  const isQC =
    user?.roles.includes("QC" as Role) ?? false;

  const moduleLinks = useMemo(() => {
    const canonicalModules = canonicalizeModules(
      user?.modules || []
    );

    if (!canonicalModules.length) {
      return [];
    }

    const links = canonicalModules.map((module) => ({
      label: moduleLabel(
        module.key,
        module.name || module.key
      ),
      href: moduleEntryPath(user || null, module.key),
      key: module.key,
    }));

    return links.sort((first, second) => {
      if (first.key === "TOILET") {
        return -1;
      }

      if (second.key === "TOILET") {
        return 1;
      }

      return 0;
    });
  }, [user?.modules, user?.roles]);

  const links: NavigationLink[] = [];

  if (!user) {
    links.push(
      {
        label: "Home",
        href: "/",
        icon: <Home size={18} />,
      },
      {
        label: "Login",
        href: "/unified-login",
        icon: <Shield size={18} />,
      }
    );
  } else {
    if (
      !isCommissioner &&
      !isCityAdmin &&
      !isHmsSuperAdmin
    ) {
      links.push({
        label: "Home",
        href: "/",
        icon: <Home size={18} />,
      });
    }

    if (isHmsSuperAdmin) {
      links.push(
        {
          label: "HMS Super Admin",
          href: "/hms",
          icon: <Shield size={18} />,
        }
      );
    } else if (isCityAdmin || isCommissioner) {
      links.push({
        label: "City Dashboard",
        href: "/city",
        icon: <LayoutDashboard size={18} />,
      });
      links.push({
        label: "Employees",
        href: "/employees",
        icon: <Users size={18} />,
      });
      links.push({
        label: "User Registration Management",
        href: "/portal-home/common-registration",
        icon: <UserPlus size={18} />,
      });
    } else {
      links.push({
        label: "Home",
        href: "/",
        icon: <Home size={18} />,
      });
    }
  }

  const handleLogout = async () => {
    await logout();
  };

  /*
   * Exact match for /hms prevents both HMS Super Admin
   * and Onboard City from appearing active together.
   */
  const isActive = (href: string) => {
    if (href === "/hms") {
      return pathname === "/hms";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <aside className="flex h-screen w-[264px] flex-col border-r border-slate-100 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-strong shadow-glow-primary">
          <Shield size={20} className="text-white" />
        </div>

        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold tracking-tight text-slate-900">
            Taskforce 20
          </div>

          <div className="text-xs font-medium text-slate-400">
            Admin Portal
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        {/* Prominent Portal Home SSO Hub Badge */}
        {user && (
          <div className="mb-4 px-1">
            <Link
              href="/portal-home"
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 shadow-sm ${pathname === "/portal-home"
                ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-blue-500/25 shadow-md"
                : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
            >
              <Layout size={16} className="text-blue-300" />
              <span>Portal Home</span>
            </Link>
          </div>
        )}

        <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        <div className="flex flex-col gap-0.5">
          {links.map((link) => (
            <NavItem
              key={link.href}
              {...link}
              active={isActive(link.href)}
            />
          ))}
        </div>

        {/* City master links */}
        {user && (isCityAdmin || isCommissioner || isQC) && (
          <CollapsibleGroup
            label="Master"
            icon={<Database size={18} />}
            open={masterOpen}
            onToggle={() =>
              setMasterOpen((current) => !current)
            }
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
                label: "Beat Status",
                href: "/city/beat-status",
                icon: <CheckCircle2 size={16} />,
              },
              {
                label: "Beat Requests",
                href: "/city/beat-requests",
                icon: <FileText size={16} />,
              },
              {
                label: "Municipal Users",
                href: "/city/users",
                icon: <Users size={16} />,
              },
              // {
              //   label: "Registration Requests",
              //   href: "/registration-requests",
              //   icon: <Bell size={16} />,
              // },
            ].map((link) => (
              <NavItem
                key={link.href}
                {...link}
                active={isActive(link.href)}
                compact
              />
            ))}
          </CollapsibleGroup>
        )}

        {/* Module links */}
        {user && moduleLinks.length > 0 && (
          <CollapsibleGroup
            label="Active Operational System"



















            icon={<Layout size={18} />}
            open={modulesOpen}
            onToggle={() =>
              setModulesOpen((current) => !current)
            }
          >
            {moduleLinks.map((link) => (
              <NavItem
                key={link.href}
                href={link.href}
                label={link.label}
                icon={getModuleIcon(link.key)}
                active={isActive(link.href)}
                compact
              />
            ))}
          </CollapsibleGroup>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 p-4">
        {!loading && user && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-danger/30 hover:bg-danger-bg hover:text-danger"
          >
            <LogOut size={15} />
            Logout
          </button>
        )}

        {!loading && !user && (
          <Link
            href="/unified-login"
            className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 shadow-sm"
          >
            Login
          </Link>
        )}
      </div>
    </aside>
  );
}