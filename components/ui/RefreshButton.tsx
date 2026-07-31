'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@hooks/useAuth';

export function RefreshButton({
  label = "Refresh",
  compact = false,
  className = ""
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { hydrateUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await hydrateUser();
      router.refresh();
    } catch {
      // ignore
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-60 ${
        compact ? 'p-2 text-xs' : 'px-3 py-1.5 text-xs'
      } ${className}`}
      title="Re-sync data and authentication status"
    >
      <RefreshCw
        size={14}
        className={`transition-transform ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
      />
      {!compact && label && <span>{refreshing ? 'Syncing...' : label}</span>}
    </button>
  );
}
