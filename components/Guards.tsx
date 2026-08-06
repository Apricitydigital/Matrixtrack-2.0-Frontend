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
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 600 }}>
        Checking access...
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
      <div style={{ padding: 24 }}>
        <h3>Access denied</h3>
        <p>You do not have permission to view this area.</p>
        <Link href="/unified-login">
          Return to unified login
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

