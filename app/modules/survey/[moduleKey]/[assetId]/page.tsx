'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Camera, CheckCircle2, Loader2, MapPin, RotateCcw, Send, X } from 'lucide-react';
import { Protected } from '@components/Guards';
import { ApiError, apiFetch } from '@lib/apiClient';

type Question = {
  code: string;
  sNo: number;
  section: string;
  question: string;
  type: 'choice' | 'text' | 'photo';
  options?: string[];
  required: boolean;
};

type SurveyConfig = {
  moduleKey: 'TOILET' | 'LITTERBINS' | 'SWEEPING';
  title: string;
  checklistTitle: string;
  maxDistanceMeters: number;
  questions: Question[];
};

type AnswerState = Record<string, { answer: string; photos: string[] }>;

const moduleFallback: Record<string, { key: string; back: string }> = {
  TOILET: { key: 'TOILET', back: '/modules/toilet/employee/assigned' },
  LITTERBINS: { key: 'LITTERBINS', back: '/modules/twinbin/assigned' },
  TWINBIN: { key: 'LITTERBINS', back: '/modules/twinbin/assigned' },
  SWEEPING: { key: 'SWEEPING', back: '/modules/sweeping/employee' },
};

function normalizeModule(value: string) {
  return moduleFallback[value.toUpperCase()] || null;
}

async function imageToDataUrl(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  if (!file.type.startsWith('image/')) return source;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      if (scale === 1) return resolve(source);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(source);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => resolve(source);
    img.src = source;
  });
}

function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not supported by this browser.'));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(error.message || 'Unable to get current location.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export default function CommonSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawModule = Array.isArray(params?.moduleKey) ? params.moduleKey[0] : String(params?.moduleKey || '');
  const assetId = Array.isArray(params?.assetId) ? params.assetId[0] : String(params?.assetId || '');
  const moduleInfo = normalizeModule(rawModule);
  const returnTo = searchParams.get('returnTo') || moduleInfo?.back || '/modules';
  const assetName = searchParams.get('name') || '';

  const [config, setConfig] = useState<SurveyConfig | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!moduleInfo || !assetId) {
      setError('Invalid survey link.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiFetch<SurveyConfig>(`/modules/${moduleInfo.key}/survey/questions`);
        setConfig(data);
        setAnswers(Object.fromEntries(data.questions.map((q) => [q.code, { answer: '', photos: [] }])));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load survey questions.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [assetId, moduleInfo?.key]);

  const totalPhotos = useMemo(() => Object.values(answers).reduce((sum, item) => sum + item.photos.length, 0), [answers]);
  const requiredCount = config?.questions.filter((q) => q.required).length || 0;
  const answeredRequired = config?.questions.filter((q) => !q.required || String(answers[q.code]?.answer || '').trim()).length || 0;
  const completedRequired = Math.max(0, answeredRequired - ((config?.questions.length || 0) - requiredCount));

  const setAnswer = (code: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [code]: { ...(prev[code] || { photos: [] }), answer } }));
  };

  const addPhoto = async (code: string, file?: File) => {
    if (!file) return;
    try {
      setPhotoBusy(code);
      const dataUrl = await imageToDataUrl(file);
      setAnswers((prev) => ({
        ...prev,
        [code]: { ...(prev[code] || { answer: '' }), photos: [...(prev[code]?.photos || []), dataUrl] },
      }));
      setError('');
    } catch {
      setError('Unable to process this photo. Please try again.');
    } finally {
      setPhotoBusy(null);
    }
  };

  const removePhoto = (code: string, index: number) => {
    setAnswers((prev) => ({
      ...prev,
      [code]: { ...prev[code], photos: (prev[code]?.photos || []).filter((_, i) => i !== index) },
    }));
  };

  const submit = async () => {
    if (!config || !moduleInfo) return;

    const missing = config.questions.find((q) => q.required && !String(answers[q.code]?.answer || '').trim());
    if (missing) {
      setError(`Please answer: ${missing.question}`);
      document.getElementById(`survey-${missing.code}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (totalPhotos < 1) {
      setError('At least one inspection photo is required before submission.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const location = await getCurrentLocation();
      await apiFetch(`/modules/${moduleInfo.key}/survey/submit`, {
        method: 'POST',
        body: JSON.stringify({
          assetId,
          latitude: location.latitude,
          longitude: location.longitude,
          answers: config.questions.map((q) => ({
            code: q.code,
            answer: answers[q.code]?.answer || null,
            photos: answers[q.code]?.photos || [],
          })),
        }),
      });
      router.replace(returnTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to submit survey.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Protected>
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '28px 20px 56px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <button onClick={() => router.push(returnTo)} className="btn btn-sm btn-ghost" style={{ marginBottom: 10 }}>← Back</button>
              <div className="eyebrow">Unified Inspection Survey</div>
              <h1 style={{ margin: '4px 0', color: '#0f172a' }}>{config?.title || 'Inspection Survey'}</h1>
              <p className="muted" style={{ margin: 0 }}>{assetName || config?.checklistTitle || 'Compliance checklist'}</p>
            </div>
            {config && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
                <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                Geofence checked on submit
              </div>
            )}
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {loading ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
              <div className="muted">Loading checklist...</div>
            </div>
          ) : !config ? (
            <div className="card" style={{ padding: 36, textAlign: 'center' }}>Survey configuration not available.</div>
          ) : (
            <>
              <div className="card" style={{ padding: 18, marginBottom: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <Summary label="Questions" value={String(config.questions.length)} />
                <Summary label="Required answered" value={`${completedRequired}/${requiredCount}`} />
                <Summary label="Photos" value={String(totalPhotos)} />
                <Summary label="Allowed range" value={`${config.maxDistanceMeters}m`} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {config.questions.map((q) => {
                  const value = answers[q.code] || { answer: '', photos: [] };
                  return (
                    <section id={`survey-${q.code}`} key={q.code} className="card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>
                            {q.section} · {q.sNo}{q.required ? ' · Required' : ''}
                          </div>
                          <div style={{ color: '#0f172a', fontWeight: 750, lineHeight: 1.45 }}>{q.question}</div>
                        </div>
                        {!!value.answer && <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />}
                      </div>

                      {q.type === 'choice' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 15 }}>
                          {(q.options || []).map((option) => {
                            const active = value.answer === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setAnswer(q.code, option)}
                                style={{
                                  border: active ? '1px solid #2563eb' : '1px solid #dbe3ee',
                                  background: active ? '#eff6ff' : '#fff',
                                  color: active ? '#1d4ed8' : '#334155',
                                  borderRadius: 12,
                                  padding: '9px 13px',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'text' && (
                        <textarea
                          value={value.answer}
                          onChange={(e) => setAnswer(q.code, e.target.value)}
                          rows={3}
                          placeholder="Enter remarks"
                          style={{ width: '100%', border: '1px solid #dbe3ee', borderRadius: 12, padding: 12, resize: 'vertical', marginBottom: 15 }}
                        />
                      )}

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <label className="btn btn-sm btn-secondary" style={{ cursor: photoBusy === q.code ? 'wait' : 'pointer' }}>
                            <Camera size={15} /> {photoBusy === q.code ? 'Processing...' : 'Click Photo'}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              disabled={photoBusy === q.code}
                              onChange={(e) => {
                                addPhoto(q.code, e.target.files?.[0]);
                                e.currentTarget.value = '';
                              }}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <span className="muted text-xs">Photo is optional per question; minimum 1 photo is required for the survey.</span>
                        </div>

                        {value.photos.length > 0 && (
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                            {value.photos.map((photo, index) => (
                              <div key={index} style={{ position: 'relative', width: 86, height: 86 }}>
                                <img src={photo} alt={`Question ${q.sNo} evidence`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, border: '1px solid #e2e8f0' }} />
                                <button
                                  type="button"
                                  onClick={() => removePhoto(q.code, index)}
                                  aria-label="Remove photo"
                                  style={{ position: 'absolute', top: -7, right: -7, width: 24, height: 24, borderRadius: 12, border: 'none', background: '#ef4444', color: 'white', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="card" style={{ position: 'sticky', bottom: 14, marginTop: 18, padding: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', boxShadow: '0 14px 35px rgba(15,23,42,.12)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => router.push(returnTo)} disabled={submitting}>
                  <RotateCcw size={16} /> Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Checking location & submitting...</> : <><Send size={16} /> Submit Inspection</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Protected>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '11px 13px', border: '1px solid #eef2f7' }}>
      <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#0f172a', fontSize: 17, fontWeight: 850, marginTop: 2 }}>{value}</div>
    </div>
  );
}
