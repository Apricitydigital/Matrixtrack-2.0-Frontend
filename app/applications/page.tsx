"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthCookie } from "@lib/auth";
import {
    ArrowRight,
    Building2,
    LogOut,
    Map as MapIcon,
    ShieldCheck,
} from "lucide-react";
import {
    decodeToken,
} from "@lib/auth";

import { useAuth } from "@hooks/useAuth";

import { getPostLoginRedirect } from "@utils/modules";

type UnifiedApplication = {
    key: string;
    name?: string;
    label?: string;
    role?: string;
    isActive?: boolean;
    [key: string]: unknown;
};

type UnifiedSession = {
    user?: {
        id?: string;
        name?: string;
        email?: string;
        role?: string;
        [key: string]: unknown;
    };
    applications?: UnifiedApplication[];
    tokens?: {
        taskforce?: string | null;
        matrixTrack?: string | null;
        wardRanking?: string | null;
    };
};

const APPLICATION_CONFIG: Record<
    string,
    {
        title: string;
        description: string;
        route: string | null;
        icon: typeof ShieldCheck;
    }
> = {
    TASKFORCE_20: {
        title: "Taskforce 20",
        description:
            "Manage attendance, sanitation operations, workforce and city performance.",
        route: "/portal-home",
        icon: ShieldCheck,
    },

    MATRIX_TRACK: {
        title: "MatrixTrack",
        description:
            "Access geo-tagged monitoring, field tracking and operational dashboards.",
        route: null,
        icon: MapIcon,
    },

    WARD_RANKING: {
        title: "Ward Ranking",
        description:
            "Review ward performance, cleanliness rankings and comparative reports.",
        route: "/ward-ranking",
        icon: Building2,
    },
};

export default function ApplicationsPage() {
    const router = useRouter();
    const { setUser } = useAuth();

    const [session, setSession] =
        useState<UnifiedSession | null>(null);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const { logout } = useAuth();

    useEffect(() => {
        try {
            const storedSession =
                localStorage.getItem("unified_auth_session");

            if (!storedSession) {
                router.replace("/unified-login");
                return;
            }

            const parsedSession =
                JSON.parse(storedSession) as UnifiedSession;

            setSession(parsedSession);
        } catch {
            localStorage.removeItem("unified_auth_session");
            router.replace("/unified-login");
        } finally {
            setLoading(false);
        }
    }, [router]);

    const applications = useMemo(() => {
        const applicationMap =
            new Map<string, UnifiedApplication>();

        (session?.applications || []).forEach(
            (application) => {
                const applicationKey = String(
                    application?.key ||
                    application?.portalKey ||
                    application?.applicationKey ||
                    "",
                );

                if (
                    !applicationKey ||
                    application.isActive === false
                ) {
                    return;
                }

                applicationMap.set(applicationKey, {
                    ...application,
                    key: applicationKey,
                });
            },
        );

        const canUseLocalStorage =
            typeof window !== "undefined";

        const taskforceToken =
            session?.tokens?.taskforce ||
            (canUseLocalStorage
                ? localStorage.getItem(
                    "taskforce_access_token",
                )
                : null);

        const matrixTrackToken =
            session?.tokens?.matrixTrack ||
            (canUseLocalStorage
                ? localStorage.getItem(
                    "matrixtrack_access_token",
                )
                : null);

        const wardRankingToken =
            session?.tokens?.wardRanking ||
            (canUseLocalStorage
                ? localStorage.getItem(
                    "ward_ranking_access_token",
                )
                : null);

        if (taskforceToken) {
            applicationMap.set("TASKFORCE_20", {
                ...(applicationMap.get("TASKFORCE_20") ||
                    {}),
                key: "TASKFORCE_20",
            });
        }

        if (matrixTrackToken) {
            applicationMap.set("MATRIX_TRACK", {
                ...(applicationMap.get("MATRIX_TRACK") ||
                    {}),
                key: "MATRIX_TRACK",
                role:
                    applicationMap.get("MATRIX_TRACK")
                        ?.role || "ADMIN",
            });
        }

        if (wardRankingToken) {
            applicationMap.set("WARD_RANKING", {
                ...(applicationMap.get("WARD_RANKING") ||
                    {}),
                key: "WARD_RANKING",
            });
        }

        return Array.from(applicationMap.values());
    }, [session]);

    const handleOpenApplication = (
        applicationKey: string,
    ) => {
        const config = APPLICATION_CONFIG[applicationKey];

        if (!config) {
            setMessage(
                "Application configuration is not available.",
            );
            return;
        }

        localStorage.setItem(
            "active_unified_application",
            applicationKey,
        );

        if (applicationKey === "WARD_RANKING") {
            const wardRankingToken =
                session?.tokens?.wardRanking ||
                localStorage.getItem(
                    "ward_ranking_access_token",
                );

            if (!wardRankingToken) {
                setMessage(
                    "Ward Ranking session is missing. Please logout and login again.",
                );
                return;
            }

            // Required by common frontend middleware
            setAuthCookie(wardRankingToken);

            // Compatibility with existing Ward Ranking authentication
            localStorage.setItem(
                "ward_ranking_access_token",
                wardRankingToken,
            );

            localStorage.setItem(
                "swachh_token",
                wardRankingToken,
            );

            localStorage.setItem(
                "token",
                wardRankingToken,
            );

            router.push("/ward-ranking");
            return;
        }

        if (applicationKey === "TASKFORCE_20") {
            const taskforceToken =
                session?.tokens?.taskforce ||
                localStorage.getItem(
                    "taskforce_access_token",
                );

            if (!taskforceToken) {
                setMessage(
                    "Taskforce session is missing. Please logout and login again.",
                );
                return;
            }

            // Preserve the portal-specific token
            localStorage.setItem(
                "taskforce_access_token",
                taskforceToken,
            );

            // Compatibility with the existing Taskforce auth flow
            localStorage.setItem("token", taskforceToken);

            // Required by middleware
            setAuthCookie(taskforceToken);

            // Same behavior as the original Taskforce login page
            const decodedUser = decodeToken(
                taskforceToken,
                session?.user,
            );

            setUser(decodedUser);

            localStorage.setItem(
                "active_unified_application",
                "TASKFORCE_20",
            );

            // CITY_ADMIN should go to /city, other roles to their
            // existing role-based route
            router.replace(
                getPostLoginRedirect(decodedUser),
            );

            return;
        }

        if (applicationKey === "MATRIX_TRACK") {
            const matrixTrackToken =
                session?.tokens?.matrixTrack ||
                localStorage.getItem(
                    "matrixtrack_access_token",
                );

            if (!matrixTrackToken) {
                setMessage(
                    "MatrixTrack session is missing. Please complete OTP verification.",
                );
                return;
            }

            localStorage.setItem(
                "matrixtrack_access_token",
                matrixTrackToken,
            );

            // Workforce pages still read the generic token key.
            localStorage.setItem("token", matrixTrackToken);

            // Keep middleware/cookie-based auth flows aligned with the active app.
            setAuthCookie(matrixTrackToken);

            localStorage.setItem(
                "active_unified_application",
                "MATRIX_TRACK",
            );

            router.push("/workforce-monitoring?view=dashboard");
            return;
        }

        if (config.route) {
            router.push(config.route);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("unified_auth_session");
        localStorage.removeItem("active_unified_application");
        localStorage.removeItem("taskforce_access_token");
        localStorage.removeItem("matrixtrack_access_token");
        localStorage.removeItem("ward_ranking_access_token");

        localStorage.removeItem("swachh_token");
        localStorage.removeItem("token");

        document.cookie =
            "hms_access_token=; Path=/; Max-Age=0; SameSite=Lax";

        router.replace("/unified-login");
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="text-sm font-semibold text-slate-300">
                    Loading your applications...
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <header className="border-b border-white/10 bg-slate-950/95">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
                            <ShieldCheck size={23} />
                        </div>

                        <div>
                            <h1 className="text-lg font-black tracking-tight">
                                MatrixTrack 2.0
                            </h1>

                            <p className="text-xs font-medium text-slate-400">
                                Unified Application Portal
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
                <div className="max-w-3xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                        <ShieldCheck size={14} />
                        Secure unified access
                    </div>

                    <h2 className="text-3xl font-black tracking-tight md:text-5xl">
                        Welcome
                        {session?.user?.name
                            ? `, ${session.user.name}`
                            : ""}
                    </h2>

                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
                        Select an application assigned to your account.
                        Only authorized applications are shown here.
                    </p>

                    {session?.user?.email && (
                        <p className="mt-2 text-sm font-semibold text-blue-300">
                            {session.user.email}
                        </p>
                    )}
                </div>

                {message && (
                    <div className="mt-8 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200">
                        {message}
                    </div>
                )}

                {applications.length > 0 ? (
                    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {applications.map((application) => {
                            const config =
                                APPLICATION_CONFIG[application.key];

                            if (!config) return null;

                            const Icon = config.icon;

                            return (
                                <article
                                    key={application.key}
                                    className="group flex min-h-64 flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-white/[0.07]"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-300 ring-1 ring-blue-400/20">
                                        <Icon size={24} />
                                    </div>

                                    <h3 className="mt-6 text-xl font-black">
                                        {config.title}
                                    </h3>

                                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">
                                        {config.description}
                                    </p>

                                    {application.role && (
                                        <div className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Role: {application.role}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleOpenApplication(application.key)
                                        }
                                        className="mt-6 flex w-full items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500"
                                    >
                                        Open application
                                        <ArrowRight
                                            size={17}
                                            className="transition group-hover:translate-x-1"
                                        />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
                        <h3 className="text-lg font-black">
                            No applications assigned
                        </h3>

                        <p className="mt-2 text-sm text-slate-400">
                            Your account is authenticated, but no active
                            application access was found.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}
