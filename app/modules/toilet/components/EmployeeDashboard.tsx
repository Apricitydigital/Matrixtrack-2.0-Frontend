'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, ToiletApi } from "@lib/apiClient";

export default function ToiletEmployeeDashboard() {
    const [summary, setSummary] = useState<Summary>({ assigned: 0, pending: 0, inspections: 0 });
    const [assigned, setAssigned] = useState<AssignedToilet[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [assignedRes, pendingRes] = await Promise.all([
                    ToiletApi.listToilets(),
                    ToiletApi.listPendingToilets()
                ]);

                const assignedList = (assignedRes.toilets || []).map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    locationName: t.ward?.name || 'Unknown Ward',
                    status: t.status,
                    type: t.type
                }));

                setAssigned(assignedList);
                setSummary({
                    assigned: assignedRes.toilets?.length || 0,
                    pending: pendingRes.toilets?.length || 0,
                    inspections: 0
                });
            } catch (err) {
                setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="content">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <p className="eyebrow">Module - Cleanliness of Toilets</p>
                    <h1>Employee Workspace</h1>
                    <p className="muted">Monitor and inspect toilets assigned to you.</p>
                </div>
                <div className="badge badge-info">Employee</div>
            </header>

            {error && <div className="alert alert-error mb-4">{error}</div>}

            <div className="grid grid-3 mb-6">
                <KpiCard label="Assigned Assets" value={summary.assigned.toString()} highlight />
                <KpiCard label="Pending Approval" value={summary.pending.toString()} />
                <KpiCard label="Inspections Today" value="-" />
            </div>

            <div className="grid gap-6">
                <section className="card">
                    <div className="card-header">
                        <div>
                            <h2>Quick Actions</h2>
                            <p className="muted text-sm">Review assets and submit inspections.</p>
                        </div>
                        {/* Registration disabled until form is available */}
                    </div>

                    <div className="grid grid-2">
                        <ActionCard
                            title="Assigned Toilets"
                            desc="View details and report inspections."
                            href="/modules/toilet/supervisor/assigned"
                            primary
                        />
                        <ActionCard
                            title="Validation Queue"
                            desc="Track status of pending assets."
                            href="/modules/toilet/supervisor/pending"
                        />
                    </div>
                </section>

                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2>Assigned Work</h2>
                        <Link className="btn btn-sm btn-ghost" href="/modules/toilet/supervisor/assigned">
                            View All {" >"}
                        </Link>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center muted">Loading...</div>
                    ) : assigned.length === 0 ? (
                        <div className="card muted p-6 text-center">No assigned assets pending inspection.</div>
                    ) : (
                        <div className="grid grid-2">
                            {assigned.slice(0, 6).map((t) => (
                                <div key={t.id} className="card card-hover flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-lg font-bold">{t.name}</div>
                                            <div className="muted text-sm">{t.locationName || "-"}</div>
                                        </div>
                                        <Badge status={t.status} />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="badge badge-sm badge-ghost">{t.type}</span>
                                    </div>

                                    <div className="flex justify-end mt-2">
                                        <button className="btn btn-sm btn-primary" disabled>
                                            Inspect
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

type Summary = {
    assigned: number;
    pending: number;
    inspections: number;
};

type AssignedToilet = {
    id: string;
    name: string;
    locationName: string;
    status: string;
    type: string;
};

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`card ${highlight ? 'border-primary' : ''}`}>
            <div className="muted text-sm uppercase tracking-wider">{label}</div>
            <div className={`text-3xl font-bold mt-1 ${highlight ? 'text-primary' : ''}`}>{value}</div>
        </div>
    );
}

function ActionCard({ title, desc, href, primary }: any) {
    return (
        <Link href={href} className={`card card-hover flex justify-between items-center p-4 ${primary ? 'bg-primary-soft border-primary-soft' : ''}`}>
            <div>
                <h3 className={primary ? 'text-primary-strong' : ''}>{title}</h3>
                <p className="muted text-sm mb-0">{desc}</p>
            </div>
            <div className={`btn btn-sm ${primary ? 'btn-primary' : 'btn-secondary'}`}>Open</div>
        </Link>
    );
}

function Badge({ status }: { status: string }) {
    let style = "badge-info";
    if (status === "APPROVED") style = "badge-success";
    if (status === "PENDING") style = "badge-warn";
    if (status === "REJECTED") style = "badge-error";

    return <span className={`badge ${style}`}>{status.replace(/_/g, " ")}</span>;
}

