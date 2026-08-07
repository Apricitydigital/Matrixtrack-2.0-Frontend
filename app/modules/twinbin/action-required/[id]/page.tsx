'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";
import { SurveyAnswersView } from "../../../common/SurveyAnswers";

export default function TwinbinActionRequiredDetailPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [visit, setVisit] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState("");
  const [photo, setPhoto] = useState<string>("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!visitId) return;
      setLoading(true);
      setError("");
      try {
        const res = await TwinbinApi.listActionRequired();
        const found = (res.visits || []).find((v: any) => v.id === visitId);
        if (!found) setError("Visit not found or already handled.");
        else setVisit(found);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load visit");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [visitId]);

  const submit = async () => {
    if (!visit) return;
    if (!remark.trim() || !photo) {
      setActionError("Remark and photo are required.");
      return;
    }
    setSubmitting(true);
    setActionError("");
    try {
      await TwinbinApi.submitActionTaken(visit.id, { actionRemark: remark, actionPhotoUrl: photo });
      router.push("/modules/twinbin/action-required");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to submit action");
    } finally {
      setSubmitting(false);
    }
  };

  const onFileChange = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["ACTION_OFFICER"]}>
        <div className="page">
          <h1>Action Required - Twinbin</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : !visit ? (
            <div className="muted">No visit found.</div>
          ) : (
            <div className="card">
              <p className="muted">
                Bin: {visit.bin?.areaName} / {visit.bin?.locationName}
              </p>
              <p className="muted">QC Remark: {visit.qcRemark || "-"}</p>
              <div style={{ marginTop: 12 }}>
                <SurveyAnswersView answers={visit.inspectionAnswers} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label>Action Remark</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  placeholder="Describe the action taken"
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="btn btn-secondary btn-sm" style={{ display: "inline-block" }}>
                  Upload Action Photo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onFileChange(e.target.files?.[0])} />
                </label>
                {photo ? <img src={photo} alt="action" style={{ maxHeight: 160, marginTop: 8, borderRadius: 8 }} /> : <p className="muted">Photo required</p>}
              </div>
              {actionError && <div className="alert error" style={{ marginTop: 8 }}>{actionError}</div>}
              <div className="flex gap-2" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => router.push("/modules/twinbin/action-required")}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Action"}
                </button>
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}
