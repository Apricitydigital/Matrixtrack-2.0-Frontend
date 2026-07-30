"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Search, Settings, User as UserIcon } from "lucide-react";
import { useAuth } from "@hooks/useAuth";
import { roleLabel } from "@lib/labels";

export function Topbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
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
            {/* Notifications */}
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-700">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
            </button>

            <div className="mx-1 h-6 w-px bg-slate-100" />

            {/* Profile menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors duration-200 hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-soft to-primary/20 text-sm font-bold text-primary-strong">
                  {initial}
                </div>
                <div className="hidden text-left leading-tight sm:block">
                  <div className="text-sm font-semibold text-slate-800">{user?.name || "Signed in"}</div>
                  <div className="text-xs text-slate-400">{displayRole || "User"}</div>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <div className="animate-scale-in absolute right-0 top-[calc(100%+8px)] w-56 origin-top-right rounded-xl border border-slate-100 bg-white p-1.5 shadow-card-hover">
                  <div className="px-3 py-2">
                    <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
                    <div className="truncate text-xs text-slate-400">{user?.email}</div>
                  </div>
                  <div className="my-1 h-px bg-slate-100" />
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                    <UserIcon size={15} /> Profile
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                    <Settings size={15} /> Settings
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-bg"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}