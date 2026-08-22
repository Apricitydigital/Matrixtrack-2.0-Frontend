"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@components/ui/Sidebar";
import { Topbar } from "@components/ui/Topbar";

const STANDALONE_PATHS = [
  "/",
  "/unified-login",
  "/register",
  "/create-account",
  "/applications",
  "/portal-home",
  "/city",
  "/ward-ranking",
  "/workforce-monitoring",
  "/admin-management",
  "/employees",
  "/modules",
  "/ulb/inspection-performance",
];

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const isStandalonePage =
    STANDALONE_PATHS.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`),
    );

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </div>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${drawerOpen
            ? "pointer-events-auto"
            : "pointer-events-none"
          }`}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen
              ? "opacity-100"
              : "opacity-0"
            }`}
        />

        <div
          className={`absolute left-0 top-0 h-full shadow-2xl transition-transform duration-300 ease-out ${drawerOpen
              ? "translate-x-0"
              : "-translate-x-full"
            }`}
        >
          <div className="relative h-full">
            <button
              type="button"
              onClick={() =>
                setDrawerOpen(false)
              }
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-500 shadow-sm"
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>

            <Sidebar />
          </div>
        </div>
      </div>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() =>
              setDrawerOpen(true)
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <span className="text-sm font-bold text-slate-800">
            MatrixTrack 2.0
          </span>
        </div>

        <div className="shrink-0">
          <Topbar />
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}