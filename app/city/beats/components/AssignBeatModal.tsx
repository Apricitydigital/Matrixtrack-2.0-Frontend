"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Check, Loader2, Search, AlertCircle, Layers, UserX, ShieldCheck, Users, Route, MapPin } from "lucide-react";
import { AreaBeatApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import ModalPortal from "@components/ui/ModalPortal";

interface AssignBeatModalProps {
    beat: any;
    initialSelectedSegmentIds?: string[];
    onClose: () => void;
    onSuccess: () => void;
    mode?: "SUPERVISOR" | "EMPLOYEE";
}

function findClosestPointIndex(coord: [number, number], points: any[]): number {
    if (!Array.isArray(points) || points.length === 0 || !coord) return 0;
    let bestIdx = 0;
    let minDistance = Infinity;
    points.forEach((p: any, idx: number) => {
        const pLon = p.longitude ?? p.lng ?? p.lon;
        const pLat = p.latitude ?? p.lat;
        if (typeof pLon === "number" && typeof pLat === "number") {
            const dist = Math.hypot(pLon - coord[0], pLat - coord[1]);
            if (dist < minDistance) {
                minDistance = dist;
                bestIdx = idx;
            }
        }
    });
    return bestIdx;
}

function getInitials(name: string = ""): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function RadioDot({ checked }: { checked: boolean }) {
    return (
        <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${checked ? "border-blue-600" : "border-slate-300"}`}
        >
            {checked && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
        </span>
    );
}

export default function AssignBeatModal({ beat, initialSelectedSegmentIds = [], onClose, onSuccess, mode }: AssignBeatModalProps) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(initialSelectedSegmentIds);
    const [isWholeBeat, setIsWholeBeat] = useState(initialSelectedSegmentIds.length === 0);

    const isCityAdmin = currentUser?.roles?.includes("CITY_ADMIN") || currentUser?.roles?.includes("HMS_SUPER_ADMIN");
    const targetRole: "SUPERVISOR" | "EMPLOYEE" = mode || (isCityAdmin ? "SUPERVISOR" : "EMPLOYEE");
    const segments = useMemo(() => {
        const points = Array.isArray(beat.points) ? beat.points : [];
        const list = [...(beat.segments || [])];
        if (points.length > 0) {
            list.sort((a: any, b: any) => {
                const startA = a.geometry?.coordinates?.[0] || [0, 0];
                const startB = b.geometry?.coordinates?.[0] || [0, 0];
                return findClosestPointIndex(startA, points) - findClosestPointIndex(startB, points);
            });
        }
        return list;
    }, [beat.segments, beat.points]);
    const allowSegmentSelection = segments.length > 0;

    useEffect(() => {
        fetchUsers();
    }, [beat.id, targetRole]);

    // Close on Escape and lock background scroll while open
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !loading) onClose();
        };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose, loading]);

    const fetchUsers = async () => {
        setFetching(true);
        setError(null);
        try {
            const data = await AreaBeatApi.listPotentialAssignees(beat.id, targetRole);
            setUsers(data);
        } catch (err: any) {
            console.error("Failed to fetch users", err);
            setError(err.message || "Failed to fetch potential assignees");
        } finally {
            setFetching(false);
        }
    };

    const handleAssign = async (userId: string | null) => {
        setLoading(true);
        setAssigningUserId(userId);
        setError(null);
        try {
            if (isWholeBeat) {
                await AreaBeatApi.assign(beat.id, userId as any, null, undefined, targetRole);
            } else {
                await AreaBeatApi.assign(beat.id, userId as any, null, selectedSegmentIds, targetRole);
            }
            onSuccess();
            setTimeout(() => {
                setAssigningUserId(null);
                if (userId !== null) onClose();
            }, 500);
        } catch (err: any) {
            setError(err.message || "Assignment failed");
            setAssigningUserId(null);
        } finally {
            setLoading(false);
        }
    };

    const toggleSegment = (id: string) => {
        setIsWholeBeat(false);
        setSelectedSegmentIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const selectSpecificSegments = () => {
        setIsWholeBeat(false);
        if (selectedSegmentIds.length === 0 && segments.length > 0) setSelectedSegmentIds([segments[0].id]);
    };

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase();
        return users
            .filter((u) =>
                (u.name || "").toLowerCase().includes(q) ||
                (u.email || "").toLowerCase().includes(q) ||
                (u.phone || "").toLowerCase().includes(q)
            )
            // In-scope people first
            .sort((a, b) => Number(!!b.matchesContext) - Number(!!a.matchesContext));
    }, [search, users]);

    const isDaroga = targetRole === "SUPERVISOR";
    const roleLabel = isDaroga ? "Daroga" : "Employee";
    const modalTitle = isDaroga ? "Assign Daroga" : "Deploy Employees";
    const wholeBeatLabel = isDaroga ? "Assign Entire Beat" : "Deploy Full Beat";
    const wholeBeatHelp = isDaroga
        ? "Assign the complete beat to one daroga, or switch below to split sub-beats across multiple darogas."
        : "Assign all visible sub-beats to one employee in one shot.";
    const noSegmentsSelected = !isWholeBeat && selectedSegmentIds.length === 0;
    const actionsDisabled = loading || noSegmentsSelected;
    const HeaderIcon = isDaroga ? ShieldCheck : Users;

    return (
        <ModalPortal>
            <div
                className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                onMouseDown={() => { if (!loading) onClose(); }}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="assign-beat-modal-title"
                    className="flex max-h-[90vh] w-full max-w-[580px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isDaroga ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}>
                                <HeaderIcon size={22} />
                            </div>
                            <div className="min-w-0">
                                <h3 id="assign-beat-modal-title" className="m-0 text-lg font-extrabold text-slate-900">{modalTitle}</h3>
                                <div className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-500">
                                    <Layers size={14} className="shrink-0" />
                                    <span className="truncate font-medium">{beat.beatName}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        {error && (
                            <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-600">
                                <AlertCircle size={18} className="shrink-0" /> {error}
                            </div>
                        )}

                        {/* Step 1 */}
                        <section className="mt-5">
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">1</span>
                                Select scope
                            </div>

                            <div className="grid gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setIsWholeBeat(true); setSelectedSegmentIds([]); }}
                                    className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${isWholeBeat ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                                >
                                    <RadioDot checked={isWholeBeat} />
                                    <div>
                                        <div className={`font-bold ${isWholeBeat ? "text-blue-900" : "text-slate-700"}`}>{wholeBeatLabel}</div>
                                        <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{wholeBeatHelp}</div>
                                    </div>
                                </button>

                                {allowSegmentSelection && (
                                    <div className={`rounded-xl border transition-all ${!isWholeBeat ? "border-blue-600 bg-slate-50/70 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                        <button
                                            type="button"
                                            onClick={selectSpecificSegments}
                                            className="flex w-full items-start gap-3.5 p-4 text-left"
                                        >
                                            <RadioDot checked={!isWholeBeat} />
                                            <div className="flex-1">
                                                <div className={`flex items-center gap-2 font-bold ${!isWholeBeat ? "text-blue-900" : "text-slate-700"}`}>
                                                    Select Specific Sub-Beats
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${!isWholeBeat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                                                        {selectedSegmentIds.length}/{segments.length}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                                    {isDaroga ? "Split one large beat across multiple darogas." : "Deploy one or many selected paths to employees."}
                                                </div>
                                            </div>
                                        </button>

                                        {!isWholeBeat && (
                                            <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                                                <div className="mb-2.5 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-500">Available Sub-Beats</span>
                                                    <div className="flex gap-3 text-xs font-semibold">
                                                        <button type="button" onClick={() => setSelectedSegmentIds(segments.map((s: any) => s.id))} className="text-blue-600 hover:underline">
                                                            Select all
                                                        </button>
                                                        <button type="button" onClick={() => setSelectedSegmentIds([])} className="text-slate-500 hover:underline">
                                                            Clear
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
                                                    {segments.map((seg: any, i: number) => {
                                                        const isSelected = selectedSegmentIds.includes(seg.id);
                                                        const alreadyAssigned = isDaroga ? !!(seg.supervisorAssignedToId || beat.assignedToId) : !!seg.employeeAssignedToId;

                                                        const points = Array.isArray(beat.points) ? beat.points : [];
                                                        const p1 = points[i];
                                                        const p2 = points[i + 1];

                                                        let displayName = seg.name;
                                                        if (!displayName || displayName === `Beat ${i + 1}`) {
                                                            if (p1?.name && p2?.name) {
                                                                displayName = `${p1.name} → ${p2.name}`;
                                                            } else if (p1?.name) {
                                                                displayName = p1.name;
                                                            } else if (p2?.name) {
                                                                displayName = p2.name;
                                                            } else {
                                                                displayName = `Sub-Beat ${i + 1}`;
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                type="button"
                                                                key={seg.id}
                                                                onClick={() => toggleSegment(seg.id)}
                                                                title={alreadyAssigned ? "Already assigned" : undefined}
                                                                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${isSelected
                                                                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                                                                    : alreadyAssigned
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                                                                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                                                                    }`}
                                                            >
                                                                <span className={`rounded px-1.5 py-px text-[10px] ${isSelected ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>
                                                                    #{i + 1}
                                                                </span>
                                                                <span className="max-w-[220px] truncate">{displayName}</span>
                                                                {alreadyAssigned && !isSelected && <Check size={12} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {noSegmentsSelected && (
                                                    <p className="mb-0 mt-2.5 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                                        <AlertCircle size={13} /> Select at least one sub-beat to continue.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Step 2 */}
                        <section className="mt-7">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">2</span>
                                    Assign to {roleLabel}
                                </div>
                                {!fetching && (
                                    <span className="text-xs font-medium text-slate-400">
                                        {filteredUsers.length} {filteredUsers.length === 1 ? "result" : "results"}
                                    </span>
                                )}
                            </div>

                            <div className="relative mb-3">
                                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={isDaroga ? "Search daroga by name, email or phone..." : "Search employee by name, email or phone..."}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="grid gap-2">
                                {fetching ? (
                                    <div className="flex flex-col items-center gap-2 py-10 text-sm text-slate-400">
                                        <Loader2 className="animate-spin text-blue-600" />
                                        Loading {isDaroga ? "darogas" : "employees"}...
                                    </div>
                                ) : filteredUsers.map((user: any) => (
                                    <div
                                        key={user.id}
                                        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${user.matchesContext ? "border-slate-200 bg-slate-50/60 hover:bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${user.matchesContext ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                                                {getInitials(user.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate font-bold text-slate-900">{user.name}</div>
                                                {(user.email || user.phone) && (
                                                    <div className="truncate text-xs text-slate-500">
                                                        {[user.email, user.phone].filter(Boolean).join(" · ")}
                                                    </div>
                                                )}
                                                <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${user.matchesContext ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                    <MapPin size={10} />
                                                    {user.matchesContext ? "Matches this zone/ward" : "Outside current zone/ward"}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleAssign(user.id)}
                                            disabled={actionsDisabled}
                                            className={`flex min-w-[88px] shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed ${actionsDisabled && assigningUserId !== user.id ? "opacity-50" : ""}`}
                                        >
                                            {loading && assigningUserId === user.id ? <Loader2 size={16} className="animate-spin" /> : "Assign"}
                                        </button>
                                    </div>
                                ))}

                                {!fetching && filteredUsers.length === 0 && (
                                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                                        <Route size={22} className="text-slate-300" />
                                        {search
                                            ? `No ${roleLabel.toLowerCase()} matches "${search}".`
                                            : `No ${roleLabel.toLowerCase()} found for this scope.`}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-3.5">
                        <button
                            type="button"
                            onClick={() => handleAssign(null)}
                            disabled={actionsDisabled}
                            className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading && assigningUserId === null ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                            Unassign {roleLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
