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

export function Topbar() {
  const { user, logout, loading } = useAuth();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

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
  const initial = user?.name?.[0]?.toUpperCase() || "H";

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
      <div className="flex items-center gap-2">
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
