'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ToiletApi } from '@lib/apiClient';
import { ModuleGuard } from '@components/Guards';
import { useAuth } from '@hooks/useAuth';
import { SurveyAnswersView } from '../../../common/SurveyAnswers';

export default function InspectionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [inspection, setInspection] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        loadDetails();
    }, [id]);

    const loadDetails = async () => {
        try {
            setLoading(true);
            setError('');

            const res = await ToiletApi.getInspectionDetails(
                id as string
            );

            setInspection(res.inspection);
        } catch (err: any) {
            setError(
                err?.message ||
                    'Failed to load inspection details'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (
            typeof window !== 'undefined' &&
            window.history.length > 1
        ) {
            router.back();
            return;
        }

        router.push('/modules/toilet');
    };

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const handleAction = async (status: string) => {
        let comment = '';

        if (
            status === 'ACTION_REQUIRED' ||
            status === 'REJECTED'
        ) {
            const promptMessage =
                status === 'ACTION_REQUIRED'
                    ? 'Enter instructions for Action Officer:'
                    : 'Enter reason for rejection:';

            const value = window.prompt(promptMessage);

            if (value === null) return;

            comment =
                value ||
                (status === 'REJECTED'
                    ? 'Rejected by QC'
                    : '');
        }

        try {
            setSubmitting(true);

            await ToiletApi.reviewInspection(
                id as string,
                {
                    status,
                    comment,
                }
            );

            window.alert(
                `Inspection ${status.replace(
                    '_',
                    ' '
                )} successfully`
            );

            await loadDetails();
        } catch (err: any) {
            window.alert(
                err?.message ||
                    'Failed to update status'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-12 text-center">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />

                <p className="text-slate-600 font-bold">
                    Loading Report...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-12 text-center max-w-md mx-auto my-12 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 font-bold">
                ⚠️ {error}
            </div>
        );
    }

    if (!inspection) {
        return (
            <div className="p-10 text-center text-slate-500 font-bold">
                Report not found
            </div>
        );
    }

    const answers = inspection.answers || {};
    const roles = user?.roles || [];

    const canReview =
        roles.includes('QC') ||
        roles.includes('CITY_ADMIN') ||
        roles.includes('HMS_SUPER_ADMIN') ||
        roles.includes('ACTION_OFFICER');

    const isQC = roles.includes('QC');

    const isActionOfficer =
        roles.includes('ACTION_OFFICER');

    return (
        <ModuleGuard
            module="TOILET"
            roles={[
                'QC',
                'ACTION_OFFICER',
                'CITY_ADMIN',
                'HMS_SUPER_ADMIN',
                'SUPERVISOR',
                'EMPLOYEE',
            ]}
        >
            <div className="report-container max-w-5xl mx-auto p-4 md:p-8 min-h-screen">
                {/* Back */}
                <div className="mb-4 print:hidden">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-bold text-xs transition-all shadow-md shadow-slate-200/50 border border-slate-200 group cursor-pointer"
                    >
                        <span className="transition-transform group-hover:-translate-x-1 font-black text-sm">
                            ←
                        </span>

                        <span>Back</span>
                    </button>
                </div>

                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-slate-100">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 border-b-2 border-slate-100 pb-8 mb-8">
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-black tracking-wider">
                                    HMS INSPECTION
                                </span>

                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                                    Digital Audit Log
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                                Toilet Inspection Report
                            </h1>

                            <p className="text-slate-400 font-bold text-xs mt-2 break-all">
                                UUID: {inspection.id}
                            </p>
                        </div>

                        <button
                            onClick={handlePrint}
                            className="print:hidden shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-lg shadow-indigo-200 cursor-pointer"
                        >
                            <span>🖨️</span>
                            Print / Save PDF
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <InfoCard
                            title="Asset Details"
                            items={[
                                {
                                    label: 'Asset Name',
                                    value:
                                        inspection.toilet
                                            ?.name,
                                },
                                {
                                    label: 'Asset Type',
                                    value:
                                        inspection.toilet
                                            ?.type,
                                    badge: true,
                                },
                                {
                                    label: 'Zone / Ward',
                                    value: `${
                                        inspection.toilet
                                            ?.zoneName ||
                                        '---'
                                    } / ${
                                        inspection.toilet
                                            ?.wardName ||
                                        '---'
                                    }`,
                                },
                            ]}
                        />

                        <InfoCard
                            title="Employee Profile"
                            items={[
                                {
                                    label: 'Inspected By',
                                    value:
                                        inspection.employee
                                            ?.name ||
                                        inspection.supervisor
                                            ?.name ||
                                        inspection.user
                                            ?.name,
                                },
                                {
                                    label: 'Email',
                                    value:
                                        inspection.employee
                                            ?.email ||
                                        inspection.supervisor
                                            ?.email ||
                                        inspection.user
                                            ?.email,
                                },
                                {
                                    label: 'Status',
                                    value: inspection.status,
                                    badge: true,
                                },
                            ]}
                        />

                        <InfoCard
                            title="Audit Metadata"
                            items={[
                                {
                                    label: 'Date',
                                    value: inspection.createdAt
                                        ? new Date(
                                              inspection.createdAt
                                          ).toLocaleDateString(
                                              'en-IN',
                                              {
                                                  dateStyle:
                                                      'long',
                                              }
                                          )
                                        : '---',
                                },
                                {
                                    label: 'Time',
                                    value: inspection.createdAt
                                        ? new Date(
                                              inspection.createdAt
                                          ).toLocaleTimeString(
                                              'en-IN',
                                              {
                                                  timeStyle:
                                                      'short',
                                              }
                                          )
                                        : '---',
                                },
                                {
                                    label: 'Accuracy',
                                    value: `${Math.round(
                                        Number(
                                            inspection.distanceMeters ||
                                                0
                                        )
                                    )}m from target`,
                                },
                            ]}
                        />
                    </div>

                    {/* Review Actions */}
                    {canReview && (
                        <div className="print:hidden mb-10 p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] text-white shadow-2xl shadow-indigo-900/20 border border-slate-700/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                                        <span>✨</span>
                                        Audit Decision
                                    </h3>

                                    <p className="text-slate-400 text-sm font-bold">
                                        Current Status:{' '}
                                        <span className="text-indigo-400 uppercase tracking-wider">
                                            {inspection.status
                                                ?.replaceAll(
                                                    '_',
                                                    ' '
                                                )}
                                        </span>
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {inspection.status ===
                                        'SUBMITTED' &&
                                        isQC && (
                                            <>
                                                <button
                                                    disabled={
                                                        submitting
                                                    }
                                                    onClick={() =>
                                                        handleAction(
                                                            'APPROVED'
                                                        )
                                                    }
                                                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-950 px-6 py-3.5 rounded-2xl font-black text-xs transition-all shadow-lg shadow-emerald-900/40 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <span>
                                                        ✅
                                                    </span>
                                                    APPROVE
                                                </button>

                                                <button
                                                    disabled={
                                                        submitting
                                                    }
                                                    onClick={() =>
                                                        handleAction(
                                                            'REJECTED'
                                                        )
                                                    }
                                                    className="bg-rose-500 hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed text-rose-950 px-6 py-3.5 rounded-2xl font-black text-xs transition-all shadow-lg shadow-rose-900/40 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <span>
                                                        🛑
                                                    </span>
                                                    REJECT
                                                </button>

                                                <button
                                                    disabled={
                                                        submitting
                                                    }
                                                    onClick={() =>
                                                        handleAction(
                                                            'ACTION_REQUIRED'
                                                        )
                                                    }
                                                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-amber-950 px-6 py-3.5 rounded-2xl font-black text-xs transition-all shadow-lg shadow-amber-900/40 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <span>
                                                        ⚠️
                                                    </span>
                                                    ACTION REQUIRED
                                                </button>
                                            </>
                                        )}

                                    {inspection.status ===
                                        'SUBMITTED' &&
                                        !isQC && (
                                            <div className="bg-white/10 px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2">
                                                <span className="text-amber-400">
                                                    ℹ️
                                                </span>

                                                <p className="text-slate-300 font-bold text-xs">
                                                    Read-Only View
                                                    • Audit
                                                    decisions
                                                    reserved for
                                                    Quality Control
                                                    (QC)
                                                </p>
                                            </div>
                                        )}

                                    {inspection.status ===
                                        'ACTION_REQUIRED' &&
                                        isActionOfficer && (
                                            <>
                                                <button
                                                    disabled={
                                                        submitting
                                                    }
                                                    onClick={() =>
                                                        handleAction(
                                                            'APPROVED'
                                                        )
                                                    }
                                                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3.5 rounded-2xl font-black text-xs transition-all cursor-pointer"
                                                >
                                                    RESOLVE &
                                                    APPROVE
                                                </button>

                                                <button
                                                    disabled={
                                                        submitting
                                                    }
                                                    onClick={() =>
                                                        handleAction(
                                                            'REJECTED'
                                                        )
                                                    }
                                                    className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3.5 rounded-2xl font-black text-xs transition-all cursor-pointer"
                                                >
                                                    REJECT
                                                    PERMANENTLY
                                                </button>
                                            </>
                                        )}

                                    {inspection.status ===
                                        'ACTION_REQUIRED' &&
                                        !isActionOfficer &&
                                        !isQC && (
                                            <div className="bg-white/10 px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2">
                                                <span className="text-amber-400">
                                                    ℹ️
                                                </span>

                                                <p className="text-slate-300 font-bold text-xs">
                                                    Action Required
                                                    • Under
                                                    resolution by
                                                    Action Officer
                                                </p>
                                            </div>
                                        )}

                                    {(inspection.status ===
                                        'APPROVED' ||
                                        inspection.status ===
                                            'REJECTED') && (
                                        <div className="bg-white/10 px-5 py-2.5 rounded-2xl border border-white/10">
                                            <p className="text-slate-300 font-bold italic text-xs">
                                                🔒 Report
                                                finalized ·
                                                Cannot modify
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submitted Survey */}
                    <div className="mb-10">
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-6 border-l-8 border-indigo-600 pl-4">
                            Audit Trail & Inspection Questions
                        </h2>

                        <SurveyAnswersView
                            answers={answers}
                        />
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center text-slate-400 gap-2">
                        <div className="text-xs font-bold uppercase tracking-widest">
                            System Generated Audit •{' '}
                            {new Date().toLocaleString()}
                        </div>

                        <div className="text-xs font-bold">
                            HMS | Multicity Urban
                            Management Platform
                        </div>
                    </div>
                </div>

                <style jsx>{`
                    @media print {
                        .report-container {
                            padding: 0 !important;
                            margin: 0 !important;
                            max-width: 100% !important;
                        }
                    }
                `}</style>
            </div>
        </ModuleGuard>
    );
}

function InfoCard({
    title,
    items,
}: {
    title: string;
    items: {
        label: string;
        value?: any;
        badge?: boolean;
    }[];
}) {
    return (
        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                {title}
            </h3>

            <div className="space-y-2.5">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="flex justify-between items-baseline gap-4 border-b border-slate-200/40 pb-2 last:border-0"
                    >
                        <span className="text-xs font-bold text-slate-500 shrink-0">
                            {item.label}
                        </span>

                        <span
                            className={`text-xs font-black text-right break-words ${
                                item.badge
                                    ? 'bg-white px-2 py-0.5 rounded-md shadow-sm text-indigo-600 border border-slate-100'
                                    : 'text-slate-800'
                            }`}
                        >
                            {item.value ?? '---'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}