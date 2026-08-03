'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@hooks/useAuth";
import { getPostLoginRedirect } from "@utils/modules";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(getPostLoginRedirect(user));
  }, [loading, router, user]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>Routing to your workspace...</div>
    </div>
  );
}
