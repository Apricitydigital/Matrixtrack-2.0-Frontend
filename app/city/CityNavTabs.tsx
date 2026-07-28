'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Map, MapPin, Target, Users, Package } from "lucide-react";
import { getTokenFromCookies, decodeToken } from "@lib/auth";

export default function CityNavTabs() {
    const pathname = usePathname();


    const [isAdmin, setIsAdmin] = useState(true);

    useEffect(() => {
        const token = getTokenFromCookies();
        const user = decodeToken(token);
        // COMMISSIONER and ULB_OFFICER should see all tabs (read-only)
        // HMS_SUPER_ADMIN also sees all
        const isReadOnlyRole = user?.roles.some((r: string) => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
        if (isReadOnlyRole) {
            setIsAdmin(true); // Treat as admin for "Master" visibility
        }
    }, []);

    const tabs = [
        { name: "Dashboard", href: "/city", icon: <LayoutDashboard size={16} /> },
        { name: "Modules", href: "/city/modules", icon: <Package size={16} /> },
        ...(isAdmin ? [
            { name: "Zones", href: "/city/zones", icon: <Map size={16} /> },
            { name: "Wards", href: "/city/wards", icon: <MapPin size={16} /> },
            { name: "Areas & Beats", href: "/city/areas", icon: <Target size={16} /> },
            { name: "Municipal Users", href: "/city/users", icon: <Users size={16} /> },
        ] : []),
    ];

    return (
        <div style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e2e8f0",
            padding: "0 32px",
            display: "flex",
            gap: "32px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            position: "sticky",
            top: 0,
            zIndex: 10,
            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
        }}>
            {tabs.map((tab) => {
                const isActive = tab.href === "/city" ? pathname === "/city" : pathname?.startsWith(tab.href);

                return (
                    <Link
                        key={tab.name}
                        href={tab.href}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "16px 0",
                            fontSize: "14px",
                            fontWeight: 600,
                            textDecoration: "none",
                            color: isActive ? "#2563eb" : "#64748b",
                            borderBottom: isActive ? "2px solid #2563eb" : "2px solid transparent",
                            transition: "all 0.2s ease",
                            opacity: isActive ? 1 : 0.8
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.color = "#0f172a";
                                e.currentTarget.style.borderBottom = "2px solid #cbd5e1";
                                e.currentTarget.style.opacity = "1";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive) {
                                e.currentTarget.style.color = "#64748b";
                                e.currentTarget.style.borderBottom = "2px solid transparent";
                                e.currentTarget.style.opacity = "0.8";
                            }
                        }}
                    >
                        {tab.icon}
                        {tab.name}
                    </Link>
                );
            })}
        </div>
    );
}
