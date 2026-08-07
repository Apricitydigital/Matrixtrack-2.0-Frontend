'use client';

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AssignedBinDetailPage() {
  const params = useParams();
  const router = useRouter();
  const binId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (!binId) return;
    router.replace(`/modules/survey/LITTERBINS/${binId}?returnTo=${encodeURIComponent('/modules/twinbin/assigned')}`);
  }, [binId, router]);

  return <div className="p-8 text-center muted">Opening survey...</div>;
}
