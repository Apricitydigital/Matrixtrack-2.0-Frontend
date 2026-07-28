'use client';

import { useState } from "react";
import { ApiError, apiFetch } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { RoleGuard } from "@components/Guards";

type Level = "KOTHI" | "SUB_KOTHI" | "GALI";

export default function ExtendedHierarchyPage() {
  const { user } = useAuth();
  const isReadOnly = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
  const [level, setLevel] = useState<Level>("KOTHI");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [status, setStatus] = useState("");

  const createNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    try {
      await apiFetch("/city/geo", { method: "POST", body: JSON.stringify({ level, name, parentId }) });
      setStatus(`Created ${level}`);
      setName("");
      setParentId("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setStatus(msg);
    }
  };

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="card">
        <h2>Optional Hierarchy (Kothi / Sub-Kothi / Gali)</h2>
        <form onSubmit={createNode} className="form">
          <label>Level</label>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value as Level)} disabled={isReadOnly}>
            <option value="KOTHI">Kothi</option>
            <option value="SUB_KOTHI">Sub-Kothi</option>
            <option value="GALI">Gali</option>
          </select>
          <div className="form-grid">
            <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={isReadOnly} />
            <input className="input" placeholder="Parent ID" value={parentId} onChange={(e) => setParentId(e.target.value)} disabled={isReadOnly} />
          </div>
          {!isReadOnly && (
            <button className="btn btn-primary" type="submit">
              Create
            </button>
          )}
          {isReadOnly && (
            <div style={{ padding: "10px", background: "#f1f5f9", borderRadius: "8px", textAlign: "center", color: "#64748b", fontWeight: 700, fontSize: "0.875rem" }}>
              READ ONLY MODE
            </div>
          )}
        </form>
        {status && <p>{status}</p>}
      </div>
    </RoleGuard>
  );
}
