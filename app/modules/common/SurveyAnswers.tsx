'use client';

import React from 'react';

export type SurveyAnswerItem = {
  code?: string;
  sNo?: number;
  section?: string;
  question?: string;
  answer?: any;
  photos?: string[];
  photo?: string;
  photoUrl?: string;
};

const isMeaningful = (value: any) => value !== undefined && value !== null && String(value).trim() !== '';

export function normalizeSurveyAnswers(raw: any): SurveyAnswerItem[] {
  if (!raw) return [];

  if (typeof raw === 'string') {
    try {
      return normalizeSurveyAnswers(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw
      .map((item: any, index) => {
        if (!item || typeof item !== 'object') return null;
        const photos = Array.from(new Set([
          ...(Array.isArray(item.photos) ? item.photos : []),
          item.photo,
          item.photoUrl,
        ].filter(Boolean)));
        return {
          code: item.code,
          sNo: item.sNo ?? index + 1,
          section: item.section || 'General',
          question: item.question || item.label || `Question ${index + 1}`,
          answer: item.answer ?? item.value ?? (photos.length ? 'Photo evidence captured' : null),
          photos,
        } as SurveyAnswerItem;
      })
      .filter(Boolean) as SurveyAnswerItem[];
  }

  if (typeof raw === 'object') {
    return Object.entries(raw).map(([key, value]: [string, any], index) => {
      const data = value && typeof value === 'object' && !Array.isArray(value) ? value : { answer: value };
      const photos = Array.from(new Set([
        ...(Array.isArray(data.photos) ? data.photos : []),
        data.photo,
        data.photoUrl,
        data.image,
        data.url,
      ].filter(Boolean)));
      return {
        code: data.code || key,
        sNo: data.sNo ?? index + 1,
        section: data.section || 'General',
        question: data.question || data.label || key,
        answer: data.answer ?? data.value ?? value,
        photos,
      };
    }).filter((item) => isMeaningful(item.answer) || (item.photos?.length || 0) > 0);
  }

  return [];
}

export function extractSurveyPhotos(raw: any): string[] {
  return Array.from(new Set(normalizeSurveyAnswers(raw).flatMap((item) => item.photos || []).filter(Boolean)));
}

export function SurveyAnswersView({ answers, compact = false }: { answers: any; compact?: boolean }) {
  const items = normalizeSurveyAnswers(answers);

  if (items.length === 0) {
    return <div className="muted text-sm">No questionnaire answers.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 16 }}>
      {items.map((item, index) => {
        const answer = item.answer;
        const yes = answer === true || String(answer).toUpperCase() === 'YES';
        const no = answer === false || String(answer).toUpperCase() === 'NO';
        return (
          <div
            key={`${item.code || item.sNo || index}-${index}`}
            style={{
              padding: compact ? '10px 0' : '14px',
              borderBottom: compact ? '1px solid #f1f5f9' : undefined,
              border: compact ? undefined : '1px solid #e2e8f0',
              borderRadius: compact ? undefined : 14,
              background: compact ? 'transparent' : '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                  {item.section || 'General'}{item.sNo ? ` · ${item.sNo}` : ''}
                </div>
                <div style={{ fontSize: compact ? 13 : 14, color: '#1e293b', fontWeight: 650, lineHeight: 1.45 }}>
                  {item.question || 'Question'}
                </div>
              </div>
              <div style={{
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 800,
                padding: '5px 9px',
                borderRadius: 9,
                background: yes ? '#dcfce7' : no ? '#fee2e2' : '#dbeafe',
                color: yes ? '#15803d' : no ? '#b91c1c' : '#1d4ed8',
                maxWidth: '42%',
                textAlign: 'right',
                wordBreak: 'break-word',
              }}>
                {typeof answer === 'boolean' ? (answer ? 'YES' : 'NO') : (isMeaningful(answer) ? String(answer) : 'N/A')}
              </div>
            </div>

            {(item.photos || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {(item.photos || []).map((photo, photoIndex) => (
                  <a key={photoIndex} href={photo} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                    <img
                      src={photo}
                      alt={`Evidence ${photoIndex + 1}`}
                      style={{ width: compact ? 64 : 92, height: compact ? 64 : 92, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0' }}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
