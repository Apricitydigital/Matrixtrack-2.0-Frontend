'use client';

import { usePathname } from "next/navigation";
import Sidebar from "@components/ui/Sidebar";
import { Topbar } from "@components/ui/Topbar";

const AUTH_PATHS = ["/", "/login", "/register", "/portal-home", "/ward-ranking", "/workforce-monitoring", "/admin-management"];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = AUTH_PATHS.includes(pathname);

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <div className="app-shell">
            <Sidebar />
            <div className="main-area">
                <Topbar />
                <main className="content">{children}</main>
            </div>
        </div>
    );
}
