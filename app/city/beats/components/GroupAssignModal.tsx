"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Search, Users, X } from "lucide-react";
import { AreaBeatApi } from "@lib/apiClient";

interface Props {
    beats: any[];
    title: string;
    mode: "SUPERVISOR" | "EMPLOYEE";
    onClose: () => void;
    onSuccess: () => void;
}

export default function GroupAssignModal({ beats, title, mode, onClose, onSuccess }: Props) {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [fetching, setFetching] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                setFetching(true);
                setUsers(await AreaBeatApi.listPotentialAssignees(beats[0].id, mode));
            } catch (err: any) {
                setError(err?.message || "Failed to load eligible users");
            } finally {
                setFetching(false);
            }
        };
        if (beats.length) load();
    }, [beats, mode]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return users.filter((user) => !query || [user.name, user.email, user.phone]
            .some((value) => String(value || "").toLowerCase().includes(query)));
    }, [users, search]);

    const assign = async (userId: string | null) => {
        try {
            setSavingId(userId || "CLEAR");
            setError("");
            await AreaBeatApi.bulkAssign(beats.map((beat) => beat.id), userId, mode);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.message || "Bulk assignment failed");
        } finally {
            setSavingId(null);
        }
    };

    const roleLabel = mode === "SUPERVISOR" ? "Supervisor" : "Employee";

    return (
        <div className="group-assign-overlay">
            <div className="group-assign-modal">
                <div className="group-assign-header">
                    <div>
                        <small>Assign entire Zone/Ward group</small>
                        <h3>{title}</h3>
                        <p>{beats.length} beats • one {roleLabel.toLowerCase()} will be applied to all</p>
                    </div>
                    <button onClick={onClose}><X size={19} /></button>
                </div>

                <div className="group-assign-body">
                    {error && <div className="group-assign-error"><AlertCircle size={16} />{error}</div>}
                    <div className="group-assign-search">
                        <Search size={16} />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${roleLabel.toLowerCase()}...`} />
                    </div>

                    <div className="group-assign-list">
                        {fetching ? (
                            <div className="group-assign-empty"><Loader2 className="animate-spin" /> Loading eligible users...</div>
                        ) : filtered.length ? filtered.map((user) => (
                            <button key={user.id} onClick={() => assign(user.id)} disabled={!!savingId}>
                                <span className="group-avatar"><Users size={16} /></span>
                                <span><strong>{user.name}</strong><small>{user.email || user.phone || roleLabel}</small></span>
                                <em>{savingId === user.id ? "Assigning..." : `Assign all ${beats.length}`}</em>
                            </button>
                        )) : <div className="group-assign-empty">No eligible {roleLabel.toLowerCase()} found.</div>}
                    </div>

                    <button className="group-clear" onClick={() => assign(null)} disabled={!!savingId}>
                        {savingId === "CLEAR" ? "Clearing..." : `Clear ${roleLabel} from all ${beats.length} beats`}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .group-assign-overlay{position:fixed;inset:0;z-index:6000;background:rgba(15,23,42,.58);backdrop-filter:blur(5px);display:grid;place-items:center;padding:20px}
                .group-assign-modal{width:min(560px,100%);max-height:88vh;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 28px 70px rgba(15,23,42,.3)}
                .group-assign-header{padding:22px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:20px}.group-assign-header small{color:#2563eb;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.group-assign-header h3{margin:5px 0 2px;color:#0f172a}.group-assign-header p{margin:0;color:#64748b;font-size:12px}.group-assign-header button{width:38px;height:38px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;display:grid;place-items:center;cursor:pointer}
                .group-assign-body{padding:20px}.group-assign-error{padding:10px 12px;border-radius:10px;background:#fef2f2;color:#dc2626;display:flex;gap:8px;margin-bottom:12px;font-size:12px;font-weight:700}.group-assign-search{height:42px;border:1px solid #cbd5e1;border-radius:11px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#94a3b8}.group-assign-search input{border:0;outline:0;width:100%;font-size:13px}.group-assign-list{display:grid;gap:8px;max-height:390px;overflow:auto;margin:14px 0}.group-assign-list button{border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:11px;display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:10px;text-align:left;cursor:pointer}.group-assign-list button:hover{border-color:#93c5fd;background:#eff6ff}.group-assign-list button span:nth-child(2){display:flex;flex-direction:column}.group-assign-list strong{font-size:13px;color:#0f172a}.group-assign-list small{font-size:11px;color:#64748b}.group-assign-list em{font-size:10px;color:#2563eb;font-style:normal;font-weight:900}.group-avatar{width:34px;height:34px;border-radius:10px;background:#e0e7ff;color:#4338ca;display:grid;place-items:center}.group-assign-empty{padding:34px;text-align:center;color:#64748b;display:flex;justify-content:center;gap:8px}.group-clear{width:100%;height:40px;border:1px solid #fecaca;border-radius:10px;background:#fff;color:#dc2626;font-weight:800;cursor:pointer}
            `}</style>
        </div>
    );
}
