import { useEffect, useMemo, useState } from "react";
import { BellRing, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supervisorSelfPunchApi } from "../../services/supervisorSelfPunchApi";
import { useSelfPunchRealtime } from "../../hooks/useSelfPunchRealtime";

const pendingCountQuery = async () => {
  const response = await supervisorSelfPunchApi.getRequests({ status: "pending", page: 1, limit: 1 });
  return Number(response?.pagination?.total || 0);
};

export default function FieldAccessRequestsCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [optimisticIncrement, setOptimisticIncrement] = useState(0);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["self-punch-pending-count"],
    queryFn: pendingCountQuery,
    refetchInterval: 60 * 1000,
  });

  useSelfPunchRealtime(() => {
    setOptimisticIncrement((count) => count + 1);
    queryClient.invalidateQueries({ queryKey: ["self-punch-requests"] });
    queryClient.invalidateQueries({ queryKey: ["self-punch-pending-count"] });
  });

  useEffect(() => {
    setOptimisticIncrement(0);
  }, [pendingCount]);

  const displayCount = useMemo(() => pendingCount + optimisticIncrement, [pendingCount, optimisticIncrement]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Supervisor Queue</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Professional Access Requests</h3>
          <p className="mt-1 text-sm text-slate-600">Pending registration approvals from field workers.</p>
        </div>

        <div className="relative rounded-xl bg-slate-100 p-2 text-slate-700">
          <BellRing className="h-5 w-5" />
          {displayCount > 0 && (
            <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-[1.5rem] animate-pulse items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
              {displayCount}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
        <span className="text-sm font-medium text-slate-700">Pending</span>
        <span className="text-lg font-bold text-slate-900">{displayCount}</span>
      </div>

      <button
        type="button"
        onClick={() => navigate("/supervisor/self-punch/requests")}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Eye className="h-4 w-4" />
        View All
      </button>
    </div>
  );
}