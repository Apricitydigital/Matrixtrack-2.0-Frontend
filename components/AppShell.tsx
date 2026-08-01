'use client';

import { usePathname } from "next/navigation";
import Sidebar from "@components/ui/Sidebar";
import { Topbar } from "@components/ui/Topbar";

const STANDALONE_PATHS = [
    "/",
    "/login",
    "/register",
    "/unified-login",
    "/create-account",
    "/applications",
    "/portal-home",
    "/ward-ranking",
    "/workforce-monitoring",
    "/admin-management",
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isStandalonePage = STANDALONE_PATHS.some(
        (path) =>
            pathname === path ||
            pathname.startsWith(`${path}/`),
    );

    if (isStandalonePage) {
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
