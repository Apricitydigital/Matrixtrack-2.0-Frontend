import React, { useEffect, useState, useRef, useCallback } from 'react';

/* ────────────────────────────────────────
   TYPES
──────────────────────────────────────── */
export type AchievementType = 'completed' | 'approved' | 'perfect';

export interface AchievementPayload {
    type?: AchievementType;
    message?: string;
}

/* ────────────────────────────────────────
   HELPERS
──────────────────────────────────────── */
const CONFETTI_COLORS = [
    '#22c55e', '#4ade80', '#86efac', '#bbf7d0',
    '#f59e0b', '#fbbf24', '#34d399', '#6ee7b7',
    '#a7f3d0', '#d1fae5',
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/* ────────────────────────────────────────
   CONFETTI PARTICLE TYPES
──────────────────────────────────────── */
interface Particle {
    id: number;
    color: string;
    left: number;
    top: number;
    size: number;
    shape: 'circle' | 'rect' | 'leaf';
    dur: number;
    delay: number;
    spin: number;
}

/* ────────────────────────────────────────
   BADGE CONFIG
──────────────────────────────────────── */
const BADGE_CONFIG: Record<AchievementType, {
    emoji: string; bg: string; border: string; color: string; defaultMsg: string;
}> = {
    completed: {
        emoji: '🎉',
        bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        border: '#22c55e',
        color: '#15803d',
        defaultMsg: 'Assessment Completed!',
    },
    approved: {
        emoji: '✅',
        bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '#3b82f6',
        color: '#1d4ed8',
        defaultMsg: 'QC Approved!',
    },
    perfect: {
        emoji: '🏆',
        bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '#f59e0b',
        color: '#92400e',
        defaultMsg: '100% Perfect Score!',
    },
};

/* ────────────────────────────────────────
   CONFETTI BURST COMPONENT
──────────────────────────────────────── */
const ConfettiBurst: React.FC<{ particles: Particle[]; onDone: () => void }> = ({
    particles, onDone
}) => {
    useEffect(() => {
        const t = setTimeout(onDone, 3200);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <div style={{
            position: 'fixed', inset: 0,
            pointerEvents: 'none', zIndex: 9999,
            overflow: 'hidden',
        }}>
            {particles.map(p => {
                const isLeaf = p.shape === 'leaf';
                return (
                    <div key={p.id} style={{
                        position: 'absolute',
                        top:  `${p.top}%`,
                        left: `${p.left}%`,
                        width:  p.size,
                        height: p.shape === 'rect' ? p.size * 0.45 : p.size,
                        backgroundColor: isLeaf ? undefined : p.color,
                        borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'leaf' ? '50% 0' : '3px',
                        background: isLeaf
                            ? `radial-gradient(ellipse, ${p.color} 0%, ${p.color}aa 100%)`
                            : undefined,
                        animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
                        '--spin': `${p.spin}deg`,
                    } as React.CSSProperties} />
                );
            })}
        </div>
    );
};

/* ────────────────────────────────────────
   ACHIEVEMENT BADGE
──────────────────────────────────────── */
interface AchievementBadge {
    id: number;
    type: AchievementType;
    message: string;
    exiting: boolean;
}

/* ────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────── */
const AchievementEffect: React.FC = () => {
    const [badges,   setBadges]   = useState<AchievementBadge[]>([]);
    const [confetti, setConfetti] = useState<Particle[] | null>(null);
    const idRef = useRef(0);

    const generateParticles = useCallback((): Particle[] =>
        Array.from({ length: 65 }).map((_, i) => ({
            id:    i,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            left:  rnd(20, 80),
            top:   rnd(20, 50),
            size:  rnd(6, 14),
            shape: (['circle', 'rect', 'leaf'] as const)[i % 3],
            dur:   rnd(1.8, 3.2),
            delay: rnd(0, 0.6),
            spin:  rnd(240, 720) * (Math.random() > 0.5 ? 1 : -1),
        })),
    []);

    const dismiss = useCallback((id: number) => {
        setBadges(prev => prev.map(b => b.id === id ? { ...b, exiting: true } : b));
        setTimeout(() => setBadges(prev => prev.filter(b => b.id !== id)), 380);
    }, []);

    useEffect(() => {
        const handle = (e: CustomEvent<AchievementPayload>) => {
            const type    = e.detail?.type ?? 'completed';
            const message = e.detail?.message ?? BADGE_CONFIG[type].defaultMsg;
            const id      = ++idRef.current;

            setBadges(prev => [...prev.slice(-4), { id, type, message, exiting: false }]);
            setConfetti(generateParticles());

            setTimeout(() => dismiss(id), 4000);
        };

        window.addEventListener('achievement', handle as EventListener);
        return () => window.removeEventListener('achievement', handle as EventListener);
    }, [dismiss, generateParticles]);

    return (
        <>
            {confetti && (
                <ConfettiBurst
                    particles={confetti}
                    onDone={() => setConfetti(null)}
                />
            )}

            {badges.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 120,
                    right: 24,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    gap: '0.625rem',
                    zIndex: 9000,
                    pointerEvents: 'none',
                    maxWidth: 300,
                }}>
                    {badges.map(b => {
                        const cfg = BADGE_CONFIG[b.type];
                        return (
                            <div key={b.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: cfg.bg,
                                border: `1.5px solid ${cfg.border}`,
                                borderRadius: '16px',
                                padding: '0.875rem 1.125rem',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                animation: b.exiting
                                    ? 'achieveExit 0.35s ease forwards'
                                    : 'achievePop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                                backdropFilter: 'blur(8px)',
                            }}>
                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{cfg.emoji}</span>
                                <div>
                                    <div style={{
                                        fontWeight: 800,
                                        fontSize: '0.9375rem',
                                        color: cfg.color,
                                        letterSpacing: '-0.01em',
                                    }}>
                                        {b.message}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: cfg.color,
                                        opacity: 0.65,
                                        fontWeight: 600,
                                        marginTop: '1px',
                                    }}>
                                        PMC Swachh Ranking
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default AchievementEffect;

/* ────────────────────────────────────────
   PUBLIC API — fire from anywhere
──────────────────────────────────────── */
export const fireAchievement = (payload: AchievementPayload = {}) => {
    window.dispatchEvent(
        new CustomEvent<AchievementPayload>('achievement', { detail: payload })
    );
};
