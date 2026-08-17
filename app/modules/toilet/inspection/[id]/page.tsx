'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ToiletApi } from '@lib/apiClient';
import { ModuleGuard } from '@components/Guards';
import { useAuth } from '@hooks/useAuth';
import { normalizeInspectionAnswers } from '@lib/reportAnswers';
import UniversalReportModal from '@components/UniversalReportModal';

export default function InspectionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [inspection, setInspection] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        loadDetails();
    }, [id]);

    const loadDetails = async () => {
        try {
            setLoading(true);
            const res = await ToiletApi.getInspectionDetails(id as string);
            setInspection(res.inspection);
        } catch (err: any) {
            setError(err.message || 'Failed to load inspection details');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/modules/toilet');
        }
    };

    const handleAction = async (status: string) => {
        let comment = '';
        if (status === 'ACTION_REQUIRED' || status === 'REJECTED') {
            const promptMsg = status === 'ACTION_REQUIRED'
                ? "Enter instructions for Action Officer:"
                : "Enter reason for rejection:";
            const val = prompt(promptMsg);
            if (val === null) return;
            comment = val || (status === 'REJECTED' ? 'Rejected by QC' : '');
        }

        try {
            setSubmitting(true);
            await ToiletApi.reviewInspection(id as string, { status, comment });
            alert(`Inspection ${status.replace('_', ' ')} successfully`);
            loadDetails();
        } catch (err: any) {
            alert(err.message || "Failed to update status");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="p-12 text-center flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 font-bold">Loading Report...</p>
        </div>
    );
    if (error) return (
        <div className="p-12 text-center max-w-md mx-auto my-12 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 font-bold">
            ⚠️ {error}
        </div>
    );
    if (!inspection) return <div className="p-10 text-center text-slate-500 font-bold">Report not found</div>;

    const answers = inspection.answers || {};

    return (
        <ModuleGuard module="TOILET" roles={["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN", "EMPLOYEE"]}>
            <div className="report-container max-w-5xl mx-auto px-4 py-4 md:px-8 md:py-6 min-h-screen">
                <UniversalReportModal
                    moduleTitle="Cleanliness of Toilet"
                    moduleBadge="HMS TOILET AUDIT"
                    record={inspection}
                    onClose={handleBack}
                    onApprove={async (rec: any, comment: any) => {
                        await ToiletApi.reviewInspection(rec.id, { status: 'APPROVED', comment });
                        loadDetails();
                    }}
                    onReject={async (rec: any, comment: any) => {
                        await ToiletApi.reviewInspection(rec.id, { status: 'REJECTED', comment });
                        loadDetails();
                    }}
                    onActionRequired={async (rec: any, comment: any) => {
                        await ToiletApi.reviewInspection(rec.id, { status: 'ACTION_REQUIRED', comment });
                        loadDetails();
                    }}
                    userRoles={user?.roles || []}
                    isAO={user?.roles?.includes('ACTION_OFFICER')}
                />
            </div>
        </ModuleGuard>
    );
}

function InfoCard({ title, items }: any) {
    return (
        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{title}</h3>
            <div className="space-y-2.5">
                {items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-baseline border-b border-slate-200/40 pb-2 last:border-0">
                        <span className="text-xs font-bold text-slate-500">{it.label}</span>
                        <span className={`text-xs font-black ${it.badge ? 'bg-white px-2 py-0.5 rounded-md shadow-sm text-indigo-600 border border-slate-100' : 'text-slate-800'}`}>
                            {it.value || '---'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
