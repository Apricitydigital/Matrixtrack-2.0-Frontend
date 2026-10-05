'use client';

import { useEffect, useState } from "react";
import { ModuleGuard, Protected } from "@components/Guards";
import { ApiError, StorageApi, TaskforceApi } from "@lib/apiClient";
import ModalPortal from "@components/ui/ModalPortal";

type GvpAnswer = { code: string; question: string; answer: string; photos: string[] };

type ActionReport = {
  id: string;
  status: string;
  createdAt: string;
  feederPointName?: string;
  areaName?: string;
  locationDescription?: string;
  zoneName?: string;
  wardName?: string;
  qcDecision?: string | null;
  ulbRemark?: string | null;
  answers?: GvpAnswer[];
  submittedBy?: { name?: string | null } | null;
  actionOfficerRemark?: string | null;
  actionOfficerRespondedAt?: string | null;
  actionPhotoUrls?: string[];
};

const MAX_ACTION_PHOTOS = 5;

export default function TaskforceActionOfficerPage() {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [reports, setReports] = useState<ActionReport[]>([]);
  const [history, setHistory] = useState<ActionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<ActionReport | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pending, done] = await Promise.all([
        TaskforceApi.actionOfficerPending(),
        TaskforceApi.actionOfficerHistory()
      ]);
      setReports(pending.reports || []);
      setHistory(done.reports || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load GVP actions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const closeModal = () => {
    setActive(null);
    setActionNote("");
    setPhotoUrls([]);
  };

  const uploadPhotos = async (files: File[]) => {
    const room = MAX_ACTION_PHOTOS - photoUrls.length;
    if (!files.length || room <= 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, room)) {
        const res = await StorageApi.upload(file, "taskforce");
        if (res?.url) uploaded.push(res.url);
      }
      setPhotoUrls((prev) => [...prev, ...uploaded].slice(0, MAX_ACTION_PHOTOS));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!active || !photoUrls.length) return;
    setSubmitLoading(true);
    try {
      await TaskforceApi.actionOfficerSubmit(active.id, {
        actionNote: actionNote.trim() || undefined,
        actionPhotoUrls: photoUrls
      });
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit action");
    } finally {
      setSubmitLoading(false);
    }
  };

  const rows = tab === "pending" ? reports : history;

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["ACTION_OFFICER"]}>
        <div style={{ padding: '20px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', animation: 'fadeIn 0.5s ease-out' }}>
          <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .stats-compact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }
                .compact-card {
                    padding: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .card-header-flex {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: 800;
                    margin: 0;
                    color: #0f172a;
                }
                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .modern-table th {
                    text-align: left;
                    font-size: 12px;
                    color: #0f172a;
                    padding: 12px 8px;
                    border-bottom: 2px solid #f1f5f9;
                    font-weight: 700;
                }
                .modern-table td {
                    padding: 12px 8px;
                    font-size: 14px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                    vertical-align: top;
                }
                .btn {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .btn-primary {
                    background-color: #3b82f6;
                    color: white;
                }
                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .btn-ghost {
                    background: transparent;
                    color: #64748b;
                }
                .btn-ghost:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .tab {
                    padding: 6px 14px;
                    border-radius: 8px;
                    border: none;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    background: transparent;
                    color: #64748b;
                }
                .tab-active {
                    background: #ffffff;
                    color: #2563eb;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.08);
                }
            `}</style>

          <header style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', background: '#e2e8f0', padding: '4px 8px', borderRadius: 4, color: '#475569' }}>CTU / GVP</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Module</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>IEC Member Dashboard</h1>
            <p style={{ marginTop: 8, color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>
              Resolve GVP reports the ULB Officer marked Action Required. Upload proof photos; the ULB Officer then closes the case.
            </p>
          </header>

          {error && (
            <div style={{ padding: 16, borderRadius: 8, backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: 24, fontSize: 14, fontWeight: 600, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <div className="stats-compact-grid" style={{ marginBottom: 32 }}>
            <StatCard label="ACTION REQUIRED" value={reports.length} sub="Needs your action" color="#f59e0b" />
            <StatCard label="ACTION TAKEN" value={history.length} sub="Sent to ULB for closure" color="#10b981" />
            <StatCard label="TOTAL IN SCOPE" value={reports.length + history.length} sub="GVP action cases" color="#6366f1" />
          </div>

          <div className="compact-card">
            <div className="card-header-flex">
              <h3 className="section-title">{tab === "pending" ? "Action Required Queue" : "Action History"}</h3>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 10 }}>
                <button type="button" className={`tab ${tab === "pending" ? "tab-active" : ""}`} onClick={() => setTab("pending")}>
                  Pending ({reports.length})
                </button>
                <button type="button" className={`tab ${tab === "history" ? "tab-active" : ""}`} onClick={() => setTab("history")}>
                  History ({history.length})
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>GVP</th>
                    <th>Zone / Ward</th>
                    <th>ULB Instruction</th>
                    <th>{tab === "pending" ? "Reported" : "Action Taken"}</th>
                    <th style={{ textAlign: 'right' }}>{tab === "pending" ? "Actions" : "Proof"}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading queue...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      {tab === "pending" ? "No GVP reports need action." : "No actions submitted yet."}
                    </td></tr>
                  ) : (
                    rows.map((r) => {
                      const when = tab === "pending" ? r.createdAt : r.actionOfficerRespondedAt || r.createdAt;
                      return (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{r.feederPointName || r.areaName || "GVP"}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.areaName || r.locationDescription || "-"}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{r.zoneName || "-"}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{r.wardName || "-"}</div>
                          </td>
                          <td style={{ maxWidth: 280, fontSize: 13 }}>{r.ulbRemark || "-"}</td>
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(when).toLocaleDateString()}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(when).toLocaleTimeString()}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {tab === "pending" ? (
                              <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => setActive(r)}>
                                Take Action
                              </button>
                            ) : (
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                {(r.actionPhotoUrls || []).slice(0, 3).map((url) => (
                                  <a key={url} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt="Action proof" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {active && (
          <ModalPortal>
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white', borderRadius: 16,
                width: '90%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Take Action - {active.feederPointName || "GVP"}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>Reported {new Date(active.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>✕</button>
                </div>

                <div style={{ padding: 32 }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Field label="Area" value={active.areaName} />
                      <Field label="Location" value={active.locationDescription} />
                      <Field label="Zone" value={active.zoneName} />
                      <Field label="Ward" value={active.wardName} />
                      <Field label="SI Decision" value={active.qcDecision || undefined} />
                      <Field label="Reported By" value={active.submittedBy?.name || undefined} />
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <Field label="ULB Instruction" value={active.ulbRemark || undefined} />
                    </div>
                  </div>

                  {(active.answers || []).map((answer) => (
                    <div key={answer.code} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>{answer.question}</div>
                      {answer.photos.length ? (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {answer.photos.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={answer.question} style={{ width: 140, height: 105, borderRadius: 8, objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{answer.answer || "-"}</div>
                      )}
                    </div>
                  ))}

                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      Proof Photos <span style={{ color: '#dc2626' }}>*</span>{" "}
                      <span style={{ opacity: 0.5, fontWeight: 400 }}>(1-{MAX_ACTION_PHOTOS})</span>
                    </label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {photoUrls.map((url) => (
                        <div key={url} style={{ position: 'relative' }}>
                          <img src={url} alt="Proof" style={{ width: 90, height: 90, borderRadius: 8, objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setPhotoUrls((prev) => prev.filter((value) => value !== url))}
                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: 10, width: 20, height: 20, cursor: 'pointer', fontSize: 11 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {photoUrls.length < MAX_ACTION_PHOTOS && (
                        <label style={{
                          width: 90, height: 90, borderRadius: 8, border: '2px dashed #cbd5e1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: '#64748b', cursor: uploading ? 'wait' : 'pointer', textAlign: 'center'
                        }}>
                          {uploading ? "Uploading..." : "+ Add Photo"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            disabled={uploading}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              e.target.value = "";
                              uploadPhotos(files);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      Action Remarks <span style={{ opacity: 0.5, fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <textarea
                      style={{
                        width: '100%', height: 100, padding: 12, borderRadius: 8,
                        border: '1px solid #cbd5e1', fontSize: 14, outline: 'none'
                      }}
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Describe the action taken at this GVP..."
                    />
                  </div>

                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                    <button
                      className="btn btn-primary"
                      disabled={submitLoading || uploading || !photoUrls.length}
                      onClick={handleSubmit}
                      title={!photoUrls.length ? "Add at least one proof photo" : undefined}
                    >
                      {submitLoading ? "Submitting..." : "Submit Action Taken"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}
      </ModuleGuard>
    </Protected>
  );
}

function StatCard({ label, value, sub, color }: any) {
  return (
    <div style={{
      borderLeft: `6px solid ${color}`,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'white',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{sub}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{value || "-"}</div>
    </div>
  );
}
