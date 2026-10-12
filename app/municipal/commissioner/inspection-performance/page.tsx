'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import CommissionerInspectionWorkspace from './CommissionerInspectionWorkspace';

function CommissionerInspectionPerformance() {
  const zone = useSearchParams().get('zone');

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/municipal/commissioner"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <h1 className="text-base font-black text-slate-800">
          Inspection &amp; Performance{zone ? ` - ${zone}` : ''}
        </h1>
      </div>

      <CommissionerInspectionWorkspace />
    </div>
  );
}

export default function CommissionerInspectionPerformancePage() {
  return (
    <Suspense fallback={null}>
      <CommissionerInspectionPerformance />
    </Suspense>
  );
}
