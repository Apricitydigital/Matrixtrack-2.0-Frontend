'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, ToiletApi } from "@lib/apiClient";

type Toilet = {
    id: string;
    name: string;
    code?: string;
    ward?: { name: string };
    type: string;
    status: string;
    createdAt: string;
    inspectionStatus?: string | null;
    lastInspectedAt?: string | null;
};

export default function ToiletAssignedPage() {
    const [toilets, setToilets] = useState<Toilet[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await ToiletApi.listToilets();
                setToilets(res.toilets || []);
            } catch (err) {
                setError(err instanceof ApiError ? err.message : "Failed to load assigned assets");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <Protected>
            <ModuleGuard module="TOILET" roles={["SUPERVISOR", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
                <div className="content">
                    <header className="mb-6">
                        <Link href="/modules/toilet/supervisor" className="text-sm font-bold text-gray-500 hover:text-gray-800 mb-2 block">
                            ← Back to Workspace
                        </Link>
                        <p className="eyebrow">Cleanliness of Toilets</p>
                        <h1>Assigned Toilets</h1>
                        <p className="muted">View and manage toilet assets assigned to you.</p>
                    </header>

                    {error && <div className="alert alert-error mb-4">{error}</div>}

                    {loading ? (
                        <div className="card p-8 text-center muted">Loading assigned assets...</div>
                    ) : toilets.length === 0 ? (
                        <div className="card p-8 text-center muted">No assets assigned to you at the moment.</div>
                    ) : (
                        <div className="grid grid-2">
                            {toilets.map((t) => {
                                const completedToday = !!t.inspectionStatus || (!!t.lastInspectedAt && new Date(t.lastInspectedAt).toDateString() === new Date().toDateString());
                                return (
                                <div key={t.id} className="card card-hover flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-lg font-bold">{t.name}</div>
                                            <div className="muted text-sm">{t.ward?.name || "Unknown Location"}</div>
                                        </div>
                                        <span className={`badge ${t.status === 'APPROVED' ? 'badge-success' : 'badge-warning'} text-xs`}>
                                            {t.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="badge badge-sm badge-ghost">{t.type}</span>
                                        {t.code && <span className="text-xs muted">ID: {t.code}</span>}
                                    </div>

                                    <div className="card-divider"></div>

                                    {completedToday ? (
                                        <button className="btn w-full" disabled>Completed Today</button>
                                    ) : (
                                        <Link
                                            className="btn btn-primary w-full"
                                            href={`/modules/survey/TOILET/${t.id}?name=${encodeURIComponent(t.name)}&returnTo=${encodeURIComponent('/modules/toilet/employee/assigned')}`}
                                        >
                                            Start Survey
                                        </Link>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </ModuleGuard>
        </Protected>
    );
}

