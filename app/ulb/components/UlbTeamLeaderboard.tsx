'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { UsersRound } from 'lucide-react';

import {
    CityUserApi,
    type DarogaPerformance,
    type IecPerformance,
    type SiPerformance,
} from '@lib/apiClient';
import {
    darogaScore,
    iecScore,
    performanceRangeParams,
    restrictDarogaModules,
    restrictIecModules,
    restrictSiModules,
    scoreModuleFilter,
    siScore,
} from '@lib/userPerformanceScores';
import type { EmbeddedUserDrawer } from '../../municipal/commissioner/user-performance/UserPerformanceView';

const UserPerformanceView = dynamic(
    () => import('../../municipal/commissioner/user-performance/UserPerformanceView'),
    { ssr: false }
);

type RoleKey = 'SUPERVISOR' | 'QC' | 'ACTION_OFFICER';

const ROLES: { key: RoleKey; label: string }[] = [
    { key: 'SUPERVISOR', label: 'Daroga' },
    { key: 'QC', label: 'Sanitary Inspector' },
    { key: 'ACTION_OFFICER', label: 'IEC Member' },
];

type RosterUser = { id: string; name: string; role: string };

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const barColor = (value: number) =>
    value >= 75 ? '#16a34a' : value >= 50 ? '#d97706' : '#dc2626';

/*
 * Same Team Leaderboard as the Commissioner dashboard: scores come from the
 * shared backend endpoints/formulas (lib/userPerformanceScores), so a person
 * shows the same % here and on the User Performance page.
 */
export default function UlbTeamLeaderboard({
    from,
    to,
    moduleFilter,
}: {
    from: string;
    to: string;
    moduleFilter: string;
}) {
    const [role, setRole] = useState<RoleKey>('SUPERVISOR');
    const [users, setUsers] = useState<RosterUser[]>([]);
    const [scores, setScores] = useState<{
        daroga: Record<string, DarogaPerformance> | null;
        si: Record<string, SiPerformance> | null;
        iec: Record<string, IecPerformance> | null;
    }>({ daroga: null, si: null, iec: null });
    const [loading, setLoading] = useState(true);
    const [openUser, setOpenUser] = useState<EmbeddedUserDrawer | null>(null);

    useEffect(() => {
        let cancelled = false;

        CityUserApi.list()
            .then((result) => {
                if (!cancelled) setUsers(result.users || []);
            })
            .catch((error) => console.error('Failed to load Team Leaderboard users', error));

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const range = performanceRangeParams(from || undefined, to || undefined);
        setLoading(true);

        Promise.allSettled([
            CityUserApi.darogaPerformance(range),
            CityUserApi.siPerformance(range),
            CityUserApi.iecPerformance(range),
        ]).then(([daroga, si, iec]) => {
            if (cancelled) return;
            [daroga, si, iec].forEach((result) => {
                if (result.status === 'rejected') {
                    console.error('Failed to load Team Leaderboard scores', result.reason);
                }
            });
            setScores({
                daroga: daroga.status === 'fulfilled' ? daroga.value.users || {} : null,
                si: si.status === 'fulfilled' ? si.value.users || {} : null,
                iec: iec.status === 'fulfilled' ? iec.value.users || {} : null,
            });
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [from, to]);

    // Warm the drawer's record downloads so a row click opens it right away.
    useEffect(() => {
        import('../../municipal/commissioner/user-performance/UserPerformanceView')
            .then((mod) => mod.prefetchUserPerformanceRecords(from, to))
            .catch(() => undefined);
    }, [from, to]);

    const rows = useMemo(() => {
        const module = scoreModuleFilter(moduleFilter);

        return users
            .filter((person) => person.role === role)
            .map((person) => {
                let performance: number | null;

                if (role === 'SUPERVISOR') {
                    const data = scores.daroga?.[person.id];
                    performance = darogaScore(data ? restrictDarogaModules(data, module) : null);
                } else if (role === 'QC') {
                    const data = scores.si?.[person.id];
                    performance = siScore(data ? restrictSiModules(data, module) : null);
                } else {
                    const data = scores.iec?.[person.id];
                    performance = iecScore(data ? restrictIecModules(data, module) : null);
                }

                return { id: person.id, label: person.name, performance };
            })
            // Not-applicable scores go last.
            .sort((a, b) => (b.performance ?? -1) - (a.performance ?? -1))
            .slice(0, 10);
    }, [users, scores, role, moduleFilter]);

    return (
        <section
            id="supervisor-performance"
            className="scroll-mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                    <UsersRound size={18} className="text-violet-600" />
                    Team Leaderboard
                </div>

                <div className="text-[10px] font-semibold text-slate-400">
                    Top 10 role-specific operational performers for the selected period
                </div>

                <div className="flex flex-wrap gap-2">
                    {ROLES.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setRole(item.key)}
                            className={`rounded-xl px-3 py-2 text-[10px] font-black transition ${role === item.key
                                ? 'border border-indigo-500 bg-indigo-600 text-white shadow-[0_6px_16px_rgba(79,70,229,0.18)]'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-5 space-y-2">
                {rows.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs font-bold text-slate-400">
                        {loading ? 'Loading team leaderboard...' : 'No team members found for this role.'}
                    </div>
                )}

                {rows.map((row, index) => (
                    <button
                        key={row.id}
                        type="button"
                        onClick={() => setOpenUser({ role, userId: row.id, from, to })}
                        className="group grid w-full grid-cols-[32px_minmax(140px,240px)_1fr_72px] items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-sm"
                    >
                        <div className="text-center text-[10px] font-black text-slate-400">
                            {index + 1}
                        </div>

                        <div className="truncate text-xs font-black text-slate-800">
                            {row.label}
                        </div>

                        <div className="relative h-2 rounded-full bg-slate-100">
                            <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                style={{
                                    width: `${clamp(row.performance ?? 0)}%`,
                                    background: `linear-gradient(90deg,#c7d2fe,${barColor(row.performance ?? 0)})`,
                                }}
                            />
                            <span
                                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-700 shadow-md transition-all duration-700"
                                style={{ left: `calc(${clamp(row.performance ?? 0)}% - 8px)` }}
                            />
                        </div>

                        <div className="text-right text-xs font-black text-slate-950">
                            {row.performance == null ? 'N/A' : `${Number(row.performance.toFixed(1))}%`}
                        </div>
                    </button>
                ))}
            </div>

            {openUser && (
                <UserPerformanceView
                    key={`${openUser.role}-${openUser.userId}`}
                    embedded={openUser}
                    onEmbeddedClose={() => setOpenUser(null)}
                />
            )}
        </section>
    );
}
