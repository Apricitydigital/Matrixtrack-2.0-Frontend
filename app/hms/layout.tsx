"use client";

import { usePathname } from "next/navigation";
import { Protected, RoleGuard } from "@components/Guards";
import { Breadcrumb } from "@components/ui/Breadcrumb";
import { Shield, Sparkles } from "lucide-react";

const PAGE_META: Record<
  string,
  {
    title: string;
    subtitle: string;
    crumb: string;
  }
> = {
  "/hms": {
    title: "Infrastructure Control",
    subtitle:
      "Manage city clusters, admins, and platform-wide configuration.",
    crumb: "Dashboard",
  },

  "/hms/cities/new": {
    title: "Onboard New City",
    subtitle: "Deploy a new city cluster into the system.",
    crumb: "Create City",
  },

  "/hms/cities/modules": {
    title: "Module Configuration",
    subtitle: "Enable or disable modules per city.",
    crumb: "City Modules",
  },

  "/hms/city-admins": {
    title: "City Administrators",
    subtitle: "Manage credentials for city-level administrators.",
    crumb: "City Admins",
  },
};

export default function HmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const meta = PAGE_META[pathname] || {
    title: "HMS Super Admin",
    subtitle: "Platform administration workspace.",
    crumb: "HMS",
  };

  const isDashboard = pathname === "/hms";

  /*
   * These pages contain their own breadcrumb and hero/header.
   * Therefore, the layout should not render another header.
   */
  const hasOwnPageHeader = pathname === "/hms/cities/new";

  return (
    <Protected>
      <RoleGuard roles={["HMS_SUPER_ADMIN"]}>
        <div className="flex min-h-0 flex-col animate-fade-in">
          {/* Dashboard only needs the layout breadcrumb */}
          {isDashboard && (
            <div className="mb-6">
              <Breadcrumb
                items={[
                  {
                    label: "HMS",
                    href: "/hms",
                  },
                  {
                    label: meta.crumb,
                  },
                ]}
              />
            </div>
          )}

          {/* Default header for HMS pages without a custom page header */}
          {!isDashboard && !hasOwnPageHeader && (
            <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-strong to-slate-900 px-6 py-7 shadow-glow-primary sm:px-8 sm:py-8">
              {/* Decorative background */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

              <div className="pointer-events-none absolute right-24 top-8 h-2 w-2 animate-pulse rounded-full bg-white/40" />

              <div className="pointer-events-none absolute right-40 top-20 h-1.5 w-1.5 animate-pulse rounded-full bg-white/30 [animation-delay:0.5s]" />

              <div className="relative flex flex-col gap-3">
                <Breadcrumb
                  items={[
                    {
                      label: "HMS",
                      href: "/hms",
                    },
                    {
                      label: meta.crumb,
                    },
                  ]}
                  className="
                    [&_a]:text-white/60
                    [&_a:hover]:text-white
                    [&_span]:text-white
                    [&_svg]:text-white/40
                  "
                />

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                    <Shield size={22} className="text-white" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                        {meta.title}
                      </h1>

                      <Sparkles
                        size={16}
                        className="text-blue-200/70"
                      />
                    </div>

                    <p className="mt-1 text-sm text-blue-100/80">
                      {meta.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page content */}
          {children}
        </div>
      </RoleGuard>
    </Protected>
  );
}