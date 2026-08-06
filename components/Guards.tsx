'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@hooks/useAuth";
import { canWriteModule, getModuleAssignment, hasRole, isHmsSuperAdmin } from "@utils/rbac";
import type { ModuleName, Role } from "../types/auth";

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasLocalUser = typeof window !== 'undefined' && (
    !!localStorage.getItem('user') ||
    !!localStorage.getItem('swachh_user') ||
    !!localStorage.getItem('token')
  );

  useEffect(() => {
    if (mounted && !loading && !user && !hasLocalUser) {
      router.replace("/unified-login");
    }
  }, [mounted, loading, user, hasLocalUser, router]);

  if (!mounted) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 600 }}>
        Checking access...
      </div>
    );
  }

  if (!user && !hasLocalUser) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[350px] bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-base font-extrabold text-slate-800">Verifying Workspace Credentials</h3>
        <p className="text-xs text-slate-500 font-medium mt-1">Checking active session and security permissions...</p>
      </div>
    );
  }
  return <>{children}</>;
}


export function RoleGuard({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 600 }}>
        Checking authorization...
      </div>
    );
  }

  const hasLocalUser = typeof window !== 'undefined' && (
    !!localStorage.getItem('user') ||
    !!localStorage.getItem('swachh_user') ||
    !!localStorage.getItem('token')
  );

  if (!user && hasLocalUser) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 600 }}>
        Checking authorization...
      </div>
    );
  }

  if (!hasRole(user, roles)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[350px] bg-rose-50/50 rounded-3xl border border-rose-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xl mb-3">!</div>
        <h3 className="text-lg font-black text-rose-900">Access Restricted</h3>
        <p className="text-xs font-semibold text-rose-600 max-w-md mt-1 mb-4">You do not have the required role assignment to access this workspace module.</p>
        <Link href="/portal-home" className="px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition-colors">
          Return to Enterprise Portal
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

export function ModuleGuard({
  module,
  roles,
  children,
  requireWrite = false
}: {
  module: ModuleName;
  roles: Role[];
  children: React.ReactNode;
  requireWrite?: boolean;
}) {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 600 }}>
        Checking module permissions...
      </div>
    );
  }

  const hasLocalUser = typeof window !== 'undefined' && (
    !!localStorage.getItem('user') ||
    !!localStorage.getItem('swachh_user') ||
    !!localStorage.getItem('token')
  );

  if (!user && hasLocalUser) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 600 }}>
        Checking module permissions...
      </div>
    );
  }

  const assigned = getModuleAssignment(user, module);
  const allowedByRole = hasRole(user, roles) || isHmsSuperAdmin(user);

  if (!assigned && !allowedByRole) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Module access denied</h3>
        <p>You are not assigned to this module.</p>
      </div>
    );
  }
  if (!allowedByRole) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Access denied</h3>
        <p>You do not have permission to view this area.</p>
        <Link href="/unified-login">
          Return to unified login
        </Link>
      </div>
    );
  }
  if (requireWrite && !canWriteModule(user, module)) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Write access denied</h3>
        <p>Your role does not allow modifying this module.</p>
      </div>
    );
  }
  return <>{children}</>;
}

