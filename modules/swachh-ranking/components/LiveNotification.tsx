import React, { useEffect, useState, useRef, useCallback } from 'react';

/* ────────────────────────────────────────
   TYPES
──────────────────────────────────────── */
export type NotifType = 'submission' | 'success' | 'info' | 'warning';

export interface NotifPayload {
    message?: string;
    category?: string;
    type?: NotifType;
    icon?: string;
}

interface Notification {
    id: number;
    message: string;
    category?: string;
    type: NotifType;
    icon: string;
    exiting: boolean;
}

/* ────────────────────────────────────────
   CONFIG
──────────────────────────────────────── */
const TYPE_CONFIG: Record<NotifType, {
    border: string; iconBg: string; iconColor: string; defaultIcon: string;
}> = {
    submission: {
        border: 'var(--primary)',
        iconBg: 'var(--primary-soft)',
        iconColor: 'var(--primary)',
        defaultIcon: '📝',
    },
    success: {
        border: '#22c55e',
        iconBg: 'rgba(34,197,94,0.1)',
        iconColor: '#15803d',
        defaultIcon: '✅',
    },
    info: {
        border: 'var(--border)',
        iconBg: 'var(--bg-main)',
        iconColor: 'var(--text-secondary)',
        defaultIcon: 'ℹ️',
    },
    warning: {
        border: '#f59e0b',
        iconBg: 'rgba(245,158,11,0.1)',
        iconColor: '#92400e',
        defaultIcon: '⚠️',
    },
};

/* ────────────────────────────────────────
   COMPONENT
──────────────────────────────────────── */
const LiveNotification: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const idRef   = useRef(0);
    const timers  = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 380);
    }, []);

    useEffect(() => {
        const handle = (e: CustomEvent<NotifPayload>) => {
            const type    = e.detail?.type ?? 'submission';
            const cfg     = TYPE_CONFIG[type];
            const id      = ++idRef.current;

            const notif: Notification = {
                id,
                message:  e.detail?.message ?? 'New Assessment Submitted',
                category: e.detail?.category,
                type,
                icon:     e.detail?.icon ?? cfg.defaultIcon,
                exiting:  false,
            };

            setNotifications(prev => [...prev.slice(-4), notif]);

            const t = setTimeout(() => dismiss(id), 5000);
            timers.current.set(id, t);
        };

        window.addEventListener('live:submission',   handle as EventListener);
        window.addEventListener('live:notification', handle as EventListener);

        return () => {
            window.removeEventListener('live:submission',   handle as EventListener);
            window.removeEventListener('live:notification', handle as EventListener);
            timers.current.forEach(clearTimeout);
        };
    }, [dismiss]);

    if (notifications.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top:   '80px',
            right: '20px',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxWidth: '340px',
            width: '100%',
        }}>
            {notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type];
                return (
                    <div key={n.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        background: 'rgba(255,255,255,0.97)',
                        border: `1.5px solid ${cfg.border}`,
                        borderLeft: `4px solid ${cfg.border}`,
                        borderRadius: '14px',
                        padding: '0.875rem 0.875rem 0.875rem 0.75rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
                        animation: n.exiting
                            ? 'notifOut 0.35s ease forwards'
                            : 'notifIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                        backdropFilter: 'blur(10px)',
                    }}>
                        {/* Icon */}
                        <div style={{
                            width: 36, height: 36,
                            borderRadius: '10px',
                            backgroundColor: cfg.iconBg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem',
                            flexShrink: 0,
                        }}>
                            {n.icon}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: 'var(--text-primary)',
                                marginBottom: '2px',
                                lineHeight: 1.3,
                            }}>
                                {n.message}
                            </div>
                            {n.category && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                }}>
                                    Category: {n.category}
                                </div>
                            )}
                            <div style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                                marginTop: '3px',
                            }}>
                                just now
                            </div>
                        </div>

                        {/* Dismiss */}
                        <button
                            onClick={() => {
                                const t = timers.current.get(n.id);
                                if (t) { clearTimeout(t); timers.current.delete(n.id); }
                                dismiss(n.id);
                            }}
                            style={{
                                background: 'none', border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                padding: '3px',
                                borderRadius: '6px',
                                lineHeight: 1,
                                fontSize: '0.875rem',
                                flexShrink: 0,
                                pointerEvents: 'all',
                            }}
                        >
                            ✕
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default LiveNotification;

/* ────────────────────────────────────────
   PUBLIC API
──────────────────────────────────────── */
export const fireNotification = (payload: NotifPayload = {}) => {
    window.dispatchEvent(
        new CustomEvent<NotifPayload>('live:notification', { detail: payload })
    );
};

export const fireSubmissionAlert = (category?: string, message?: string) => {
    window.dispatchEvent(
        new CustomEvent<NotifPayload>('live:submission', {
            detail: {
                type:     'submission',
                message:  message ?? 'New Assessment Submitted',
                category,
                icon:     '📋',
            },
        })
    );
};
