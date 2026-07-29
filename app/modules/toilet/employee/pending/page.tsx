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
};

const statusClass: Record<string, string> = {
    PENDING: "badge badge-warn",
    APPROVED: "badge badge-success",
    REJECTED: "badge badge-error"
};

export default function ToiletPendingPage() {
    const [toilets, setToilets] = useState<Toilet[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await ToiletApi.listPendingToilets();
            setToilets(data.toilets || []);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load validation queue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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
                        <h1>Validation Queue</h1>
                        <p className="muted">Track the status of toilet assets you have registered.</p>
                    </header>

                    {error && <div className="alert alert-error mb-4">{error}</div>}

                    {loading ? (
                        <div className="card p-8 text-center muted">Loading queue...</div>
                    ) : toilets.length === 0 ? (
                        <div className="card p-8 text-center muted">No pending assets in queue.</div>
                    ) : (
                        <div className="grid grid-2">
                            {toilets.map((t) => (
                                <div key={t.id} className="card flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-lg font-bold">{t.name}</div>
                                            <div className="muted text-sm">{t.ward?.name || "Unknown Location"}</div>
                                        </div>
                                        <span className={statusClass[t.status] || "badge"}>{t.status.replace(/_/g, " ")}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm muted mt-2">
                                        <span className="badge badge-sm badge-ghost">{t.type}</span>
                                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ModuleGuard>
        </Protected>
    );
}

