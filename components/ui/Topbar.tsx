"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState
} from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  User as UserIcon
} from "lucide-react";
import { useAuth } from "@hooks/useAuth";
import { roleLabel } from "@lib/labels";
import { RefreshButton } from "./RefreshButton";
import { UserProfileModal } from "./UserProfileModal";

export function Topbar() {
  const { user, logout, loading } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      onClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onClick
      );
    };
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const displayRole = user?.roles?.length ? roleLabel(user.roles[0]) : "";
  const initial = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-md">
      {/* Search */}
      <div className="flex max-w-md flex-1 items-center">
        <div className="group relative w-full">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
          />
          <input
            type="text"
            placeholder="Search cities, admins, requests..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="text-sm font-medium text-slate-400">Loading...</div>
        ) : user ? (
          <>
            {/* Reusable Refresh Button */}
            <RefreshButton label="Sync" />

            {/* Notifications */}
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-700">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
            </button>

            {/* User Profile Pill Button */}
            <Link
              href="/portal-home/profile"
              className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1.5 pr-3 text-left transition-all hover:border-primary/40 hover:bg-slate-100 no-underline"
              title="Click to view user profile"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
                {initial}
              </div>
              <div className="hidden md:block text-xs">
                <div className="font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user.name || "User Profile"}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight uppercase font-medium">
                  {displayRole || user.role || "User"}
                </div>
              </div>
            </Link>
          </>
        ) : (
          <Link
            href="/unified-login"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
