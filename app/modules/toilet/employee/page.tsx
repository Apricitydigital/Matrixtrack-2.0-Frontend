'use client';

import { Protected, ModuleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import EmployeeDashboard from "../components/EmployeeDashboard";

export default function ToiletEmployeePage() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="p-6 muted">Checking access...</div>;
    }

    // Double check if user is action officer? 
    // Code interaction summary says "Action Officer access is not allowed on Employee workspaces" in litterbins.
    // We can replicate that check.
    if (user?.roles?.includes("ACTION_OFFICER")) {
        // Wait, Action Officers can also see Toilets. 
        // But typically they have their own dashboard.
        // If they land here, maybe redirect them? Or show unauthorized?
        // For now, let's keep it consistent with Litterbins.
    }

    return (
        <Protected>
            <ModuleGuard module="TOILET" roles={["SUPERVISOR", "CITY_ADMIN", "HMS_SUPER_ADMIN", "ULB_OFFICER"]}>
                <EmployeeDashboard />
            </ModuleGuard>
        </Protected>
    );
}

