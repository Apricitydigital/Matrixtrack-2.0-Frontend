'use client';

import React from 'react';

/*
 * Consolidated 2x2 collage of the four component photos (seat, basin, door,
 * tap) taken by the Daroga, plus the AI condition read-out. Shown to QC,
 * ULB Officer and Commissioner. Renders nothing for older inspections that
 * have no component photos.
 */

const ORDER = ['seat', 'basin', 'door', 'tap'] as const;
const LABELS: Record<string, string> = {
    seat: 'Toilet Seat',
    basin: 'Wash Basin',
    door: 'Toilet Door',
    tap: 'Water Tap',
};
const CONDITION_COLORS: Record<string, { bg: string; fg: string }> = {
    CLEAN: { bg: '#dcfce7', fg: '#166534' },
    ACCEPTABLE: { bg: '#ecfccb', fg: '#3f6212' },
    DIRTY: { bg: '#fef3c7', fg: '#92400e' },
    DAMAGED: { bg: '#fee2e2', fg: '#991b1b' },
    MISSING: { bg: '#fee2e2', fg: '#991b1b' },
};
const SUGGESTION_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
    APPROVE: { bg: '#dcfce7', fg: '#166534', label: 'AI suggests: Approve' },
    REVIEW: { bg: '#fef3c7', fg: '#92400e', label: 'AI suggests: Needs review' },
    REJECT: { bg: '#fee2e2', fg: '#991b1b', label: 'AI suggests: Reject' },
};

export default function ToiletComponentCollage({
    record,
    onPreview,
}: {
    record: any;
    onPreview: (url: string) => void;
}) {
    const photos = record?.componentPhotos;
    const collageUrl: string | undefined = record?.collageUrl;
    const ai = record?.componentAiResult;
    const hasPhotos = photos && ORDER.some((k) => photos[k]?.url);
    if (!collageUrl && !hasPhotos) return null;

    const suggestion = ai?.suggestion ? SUGGESTION_COLORS[ai.suggestion] : null;

    return (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Toilet Component Collage
                </div>
                {suggestion && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: suggestion.bg, color: suggestion.fg }}>
                        {suggestion.label}
                    </span>
                )}
            </div>

            {collageUrl ? (
                <img
                    src={collageUrl}
                    alt="Seat, basin, door and tap collage"
                    onClick={() => onPreview(collageUrl)}
                    style={{ width: '100%', maxWidth: 520, borderRadius: 10, cursor: 'zoom-in', border: '1px solid #cbd5e1', display: 'block' }}
                />
            ) : (
                <div style={{ fontSize: 11, color: '#64748b' }}>Collage is being prepared...</div>
            )}

            {ai?.summary && (
                <div style={{ fontSize: 12, color: '#334155', marginTop: 8, lineHeight: 1.5 }}>{ai.summary}</div>
            )}

            {hasPhotos && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {ORDER.map((k) => {
                        const p = photos[k];
                        if (!p?.url) return null;
                        const cond = ai?.components?.[k]?.condition as string | undefined;
                        const color = cond ? CONDITION_COLORS[cond] : null;
                        const issues: string[] = ai?.components?.[k]?.issues || [];
                        return (
                            <div key={k} style={{ width: 96 }}>
                                <img
                                    src={p.url}
                                    alt={LABELS[k]}
                                    onClick={() => onPreview(p.url)}
                                    title={issues.join(', ') || LABELS[k]}
                                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1.5px solid #cbd5e1' }}
                                />
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', marginTop: 3 }}>{LABELS[k]}</div>
                                {color && (
                                    <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 999, background: color.bg, color: color.fg }}>
                                        {cond}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
