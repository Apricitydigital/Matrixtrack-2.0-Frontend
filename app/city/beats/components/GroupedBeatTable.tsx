"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Edit2, Eye, MapPinned, MapPin, Trash2, UserPlus, Users } from "lucide-react";
import { AreaBeatApi } from "@lib/apiClient";

export interface BeatGroup {
    key: string;
    title: string;
    subtitle: string;
    beats: any[];
}

interface Props {
    beats: any[];
    onRefresh: () => void;
    onView: (beat: any) => void;
    onEdit: (beat: any) => void;
    onAssign: (beat: any) => void;
    onAssignEmployees: (beat: any) => void;
    onEditPoints: (beat: any) => void;
    onAssignGroup: (group: BeatGroup, mode: "SUPERVISOR" | "EMPLOYEE") => void;
    isReadOnly?: boolean;
}

const getSupervisors = (beat: any) => beat.supervisorsSummary || (beat.assignedToName ? [{ id: beat.assignedToId, name: beat.assignedToName }] : []);
const getEmployees = (beat: any) => {
    const employees = new Map<string, string>();
    (beat.segments || []).forEach((segment: any) => {
        if (segment.employeeAssignedToId && segment.employeeAssignedToName) employees.set(segment.employeeAssignedToId, segment.employeeAssignedToName);
    });
    return Array.from(employees, ([id, name]) => ({ id, name }));
};

export default function GroupedBeatTable({ beats, onRefresh, onView, onEdit, onAssign, onAssignEmployees, onEditPoints, onAssignGroup, isReadOnly = false }: Props) {
    const [expanded, setExpanded] = useState<string[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        setPage(1);
    }, [beats]);

    const groups = useMemo<BeatGroup[]>(() => {
        const map = new Map<string, BeatGroup>();
        beats.forEach((beat) => {
            const key = `${beat.zoneId || beat.zoneName}|${beat.wardId || beat.wardName}|${beat.areaId || beat.areaName}`;
            if (!map.has(key)) map.set(key, {
                key,
                title: `${beat.zoneName || "Zone"} • ${beat.wardName || "Ward"}`,
                subtitle: beat.areaName || "Area",
                beats: [],
            });
            map.get(key)!.beats.push(beat);
        });
        return Array.from(map.values()).map((group) => ({
            ...group,
            beats: group.beats.sort((a, b) => String(a.beatName).localeCompare(String(b.beatName), undefined, { numeric: true })),
        }));
    }, [beats]);

    const remove = async (beat: any) => {
        if (!window.confirm(`Delete ${beat.beatName}?`)) return;
        try { setDeletingId(beat.id); await AreaBeatApi.remove(beat.id); onRefresh(); }
        finally { setDeletingId(null); }
    };

    const toggle = (key: string) => setExpanded((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

    const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
    const paginatedGroups = groups.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="grouped-beats">
            <div className="grouped-beats-header"><div><h3>Registered Beat Groups</h3><p>{groups.length} Zone/Ward groups • {beats.length} beats</p></div></div>
            {!groups.length ? <div className="grouped-empty">No registered beats found.</div> : paginatedGroups.map((group) => {
                const isOpen = expanded.includes(group.key);
                const configured = group.beats.filter((beat) => getSupervisors(beat).length && getEmployees(beat).length && beat.points?.length === 5).length;
                return <section key={group.key} className={isOpen ? "open" : ""}>
                    <div className="beat-group-row" onClick={() => toggle(group.key)}>
                        <button className="expand-button">{isOpen ? <ChevronDown size={19} /> : <ChevronRight size={19} />}</button>
                        <span className="group-icon"><MapPinned size={21} /></span>
                        <div className="group-name"><h4>{group.title}</h4><p>{group.subtitle} • {group.beats.length} beats</p></div>
                        <div className="group-progress"><strong>{configured}/{group.beats.length}</strong><span>Configured</span></div>
                        {!isReadOnly && <div className="group-actions" onClick={(event) => event.stopPropagation()}>
                            <button onClick={() => onAssignGroup(group, "SUPERVISOR")}><Users size={15} /> Assign Supervisor to all</button>
                            <button onClick={() => onAssignGroup(group, "EMPLOYEE")}><UserPlus size={15} /> Assign Employee to all</button>
                        </div>}
                    </div>

                    {isOpen && <div className="beat-group-children">
                        <div className="child-header"><span>Beat</span><span>Supervisor</span><span>Employee</span><span>Points</span><span>Status</span><span>Actions</span></div>
                        {group.beats.map((beat) => {
                            const supervisors = getSupervisors(beat);
                            const employees = getEmployees(beat);
                            const pointCount = Array.isArray(beat.points) ? beat.points.length : 0;
                            const ready = supervisors.length > 0 && employees.length > 0 && pointCount === 5;
                            return <div className="child-row" key={beat.id}>
                                <button className="beat-name" onClick={() => onView(beat)}><span>{beat.beatName}</span><small>{new Date(beat.createdAt).toLocaleDateString()}</small></button>
                                <button className="assignment-cell" disabled={isReadOnly} onClick={() => onAssign(beat)}>{supervisors[0]?.name || "+ Assign Supervisor"}</button>
                                <button className="assignment-cell employee" disabled={isReadOnly} onClick={() => onAssignEmployees(beat)}>{employees[0]?.name || "+ Assign Employee"}</button>
                                <button className="points-cell" onClick={() => onEditPoints(beat)}><MapPin size={14} /> {pointCount}/5 <em>Edit</em></button>
                                <span className={ready ? "status-ready" : "status-pending"}>{ready ? "Configured" : "Needs Setup"}</span>
                                <div className="child-actions">
                                    <button title="View map" onClick={() => onView(beat)}><Eye size={16} /></button>
                                    {!isReadOnly && <button title="Edit beat" onClick={() => onEdit(beat)}><Edit2 size={16} /></button>}
                                    {!isReadOnly && <button className="delete" title="Delete beat" disabled={deletingId === beat.id} onClick={() => remove(beat)}><Trash2 size={16} /></button>}
                                </div>
                            </div>;
                        })}
                    </div>}
                </section>;
            })}

            {groups.length > 0 && (
                <div className="pagination-controls" style={{ padding: '15px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', background: '#fcfdfe' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, groups.length)} of {groups.length} groups</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page <= 1 ? '#f1f5f9' : '#fff', color: page <= 1 ? '#94a3b8' : '#0f172a', fontSize: '12px', fontWeight: 600, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page >= totalPages ? '#f1f5f9' : '#fff', color: page >= totalPages ? '#94a3b8' : '#0f172a', fontSize: '12px', fontWeight: 600, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .grouped-beats{background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden}.grouped-beats-header{padding:19px 24px;border-bottom:1px solid #e2e8f0;background:#fcfdfe}.grouped-beats-header h3{margin:0;color:#0f172a;font-size:15px}.grouped-beats-header p{margin:3px 0 0;color:#64748b;font-size:11px}.grouped-empty{padding:50px;text-align:center;color:#64748b}.grouped-beats section{border-bottom:1px solid #e2e8f0}.grouped-beats section:last-child{border-bottom:0}.beat-group-row{min-height:82px;padding:13px 18px;display:grid;grid-template-columns:32px 44px minmax(210px,1fr) 90px auto;gap:12px;align-items:center;cursor:pointer;background:#fff}.beat-group-row:hover,.grouped-beats section.open>.beat-group-row{background:#f8fbff}.expand-button{border:0;background:transparent;color:#2563eb;display:grid;place-items:center;cursor:pointer}.group-icon{width:42px;height:42px;border-radius:12px;background:#dbeafe;color:#2563eb;display:grid;place-items:center}.group-name h4{margin:0;color:#0f172a;font-size:15px}.group-name p{margin:4px 0 0;color:#64748b;font-size:11px;font-weight:700}.group-progress{display:flex;flex-direction:column;text-align:center}.group-progress strong{color:#0f172a}.group-progress span{font-size:9px;color:#64748b;text-transform:uppercase;font-weight:800}.group-actions{display:flex;gap:8px}.group-actions button{height:36px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:800;display:flex;align-items:center;gap:6px;padding:0 11px;cursor:pointer}.group-actions button:last-child{border-color:#bbf7d0;background:#f0fdf4;color:#047857}.beat-group-children{border-top:1px solid #dbeafe;background:#fbfdff;padding:0 16px 14px 86px}.child-header,.child-row{display:grid;grid-template-columns:minmax(130px,1.2fr) minmax(145px,1fr) minmax(145px,1fr) 110px 110px 112px;gap:10px;align-items:center}.child-header{min-height:38px;color:#64748b;font-size:9px;font-weight:900;text-transform:uppercase}.child-row{min-height:58px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:7px 10px;margin-bottom:7px}.beat-name{border:0;background:transparent;text-align:left;display:flex;flex-direction:column;cursor:pointer}.beat-name span{font-size:12px;font-weight:900;color:#0f172a}.beat-name small{font-size:9px;color:#94a3b8}.assignment-cell{height:32px;border:1px dashed #cbd5e1;border-radius:8px;background:#fff;color:#4f46e5;font-size:10px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 8px;cursor:pointer}.assignment-cell.employee{color:#047857}.points-cell{height:32px;border:1px solid #bfdbfe;border-radius:8px;background:#eff6ff;color:#1d4ed8;display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;font-weight:800;cursor:pointer}.points-cell em{font-style:normal;text-decoration:underline}.status-ready,.status-pending{width:max-content;padding:5px 9px;border-radius:999px;font-size:9px;font-weight:900}.status-ready{background:#ecfdf5;color:#047857}.status-pending{background:#fff7ed;color:#c2410c}.child-actions{display:flex;justify-content:flex-end;gap:5px}.child-actions button{width:31px;height:31px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#475569;display:grid;place-items:center;cursor:pointer}.child-actions button.delete{color:#dc2626}@media(max-width:1050px){.beat-group-row{grid-template-columns:32px 44px 1fr 80px}.group-actions{grid-column:3/5}.beat-group-children{padding-left:16px;overflow-x:auto}.child-header,.child-row{min-width:850px}}
            `}</style>
        </div>
    );
}
