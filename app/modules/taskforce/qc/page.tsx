'use client';

import { useAuth } from "@hooks/useAuth";
import GvpModulePage from "../components/GvpModulePage";

export default function TaskforceQcHomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 muted">Checking access...</div>;
  }

  if (user?.roles?.includes("ACTION_OFFICER")) {
    return (
      <div className="card">
        <h3>Unauthorized for this module</h3>
        <p className="muted">IEC Member access is not allowed on SI workspaces.</p>
      </div>
    );
  }

  return <GvpModulePage />;
}
