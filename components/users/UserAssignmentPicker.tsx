"use client";

import React, { useEffect, useRef, useState } from "react";
import { CityUserApi, type UserAssignmentType, type UserAssignmentOption } from "@lib/apiClient";

const titles: Record<UserAssignmentType, string> = { ZONE: "zone", WARD: "ward", BEAT: "beat", BIN: "litter bin", TOILET: "toilet" };

export function UserAssignmentPicker({ userId, userName, type, roles, initialRole, onCancel, onAssigned, onBusyChange }: {
  userId: string; userName: string; type: UserAssignmentType; roles: string[]; initialRole: string;
  onCancel: () => void; onAssigned: () => Promise<void>; onBusyChange: (busy: boolean) => void;
}) {
  const [role, setRole] = useState(initialRole);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<UserAssignmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [confirmation, setConfirmation] = useState<UserAssignmentOption | null>(null);
  const busy = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setItems([]); setConfirmation(null);
    CityUserApi.assignmentOptions(userId, type, role)
      .then(result => { if (!cancelled) setItems(result.items); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load assignments"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, type, role, reload]);
  const assign = async (item: UserAssignmentOption) => {
    if (busy.current) return;
    busy.current = true; setSaving(item.id); onBusyChange(true); setError(null);
    try {
      await CityUserApi.addAssignment(userId, { type, role, itemId: item.id,
        ...(item.requiresScopeExtension ? { extendScope: true } : {}),
        ...(item.requiresModuleAccess ? { enableModule: true } : {}),
        ...(item.requiresReassignment ? { reassign: true, expectedAssigneeIds: item.currentAssigneeIds || [] } : {})
      });
      await onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignment could not be saved");
    } finally {
      busy.current = false; setSaving(null); onBusyChange(false);
    }
  };
  const choose = (item: UserAssignmentOption) => {
    if (item.disabledReason || busy.current) return;
    if (item.requiresScopeExtension || item.requiresModuleAccess || item.requiresReassignment) setConfirmation(item);
    else void assign(item);
  };
  const query = search.trim().toLowerCase();
  const filtered = items.filter(item => `${item.label} ${item.sublabel || ""}`.toLowerCase().includes(query));
  return (
    <section className="mx-auto w-full max-w-3xl p-5 sm:p-7" aria-label={`Assign ${titles[type]}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-slate-900">Assign a {titles[type]} to {userName}</h3>
        <button type="button" disabled={!!saving} onClick={onCancel} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50">Back</button>
      </div>
      <p className="mb-4 text-sm text-slate-600">Choose an additional assignment for this user. Their name and existing role stay unchanged.</p>
      {roles.length > 1 ? <label className="mb-4 block text-sm font-bold text-slate-700">Use existing role
        <select value={role} disabled={!!saving || !!confirmation} onChange={event => setRole(event.target.value)} className="mt-1 block w-full rounded-lg border bg-white p-2">
          {roles.map(value => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
        </select>
      </label> : <p className="mb-4 text-sm font-bold text-slate-700">Role: {role.replace(/_/g, " ")}</p>}
      {confirmation && <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800">
        <h4 className="mb-2 font-bold">Confirm assignment: {confirmation.label}</h4>
        <ul className="list-disc space-y-1 pl-5">
          {confirmation.requiresReassignment && <li>Reassign this beat's {role.toLowerCase()} responsibility from {(confirmation.currentAssigneeNames || []).join(", ") || "the current assignee"} to {userName}. Other-role assignments are kept.</li>}
          {confirmation.requiresScopeExtension && <li>Add this asset's zone/ward to this user's selected role and module access.</li>}
          {confirmation.requiresModuleAccess && <li>Enable this module for the user's existing {role.toLowerCase()} role in this asset's zone/ward.</li>}
        </ul>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={!!saving} onClick={() => void assign(confirmation)} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? "Assigning..." : "Confirm assignment"}</button>
          <button type="button" disabled={!!saving} onClick={() => setConfirmation(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2">Cancel</button>
        </div>
      </div>}
      <label className="block text-sm font-bold text-slate-700">Search
        <input ref={searchRef} value={search} disabled={!!saving} onChange={event => setSearch(event.target.value)} placeholder={`Search ${titles[type]}`} className="my-2 block w-full rounded-lg border bg-white p-3" />
      </label>
      {error && <div role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}<button type="button" disabled={!!saving} onClick={() => setReload(value => value + 1)} className="ml-3 underline">Reload options</button></div>}
      {loading ? <p role="status" className="p-5 text-slate-500">Loading options...</p> : filtered.length === 0 ? !error && <p className="p-5 text-sm text-slate-500">{query ? "No items match your search. Try a zone, ward or asset name." : `No additional ${titles[type]} assignments found in this city.`}</p> : (
        <ul className="divide-y rounded-xl border bg-white">
          {filtered.map(item => <li key={item.id} className="flex items-center justify-between gap-3 p-3">
            <div><p className="text-sm font-bold text-slate-800">{item.label}</p>{item.sublabel && <p className="text-xs text-slate-500">{item.sublabel}</p>}
              {!!item.currentAssigneeNames?.length && <p className="text-xs text-slate-500">Currently assigned: {item.currentAssigneeNames.join(", ")}</p>}
              {item.requiresScopeExtension && <p className="text-xs text-amber-700">Additional zone/ward access needed</p>}
              {item.requiresModuleAccess && <p className="text-xs text-amber-700">Module access will need confirmation</p>}
              {item.disabledReason && <p className="text-xs text-rose-700">{item.disabledReason}</p>}
            </div>
            <button type="button" disabled={!!saving || !!confirmation || !!item.disabledReason} onClick={() => choose(item)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving === item.id ? "Assigning..." : "Assign"}</button>
          </li>)}
        </ul>
      )}
    </section>
  );
}
