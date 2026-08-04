const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusLabels = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function StatusBadge({ status }) {
  const key = (status || "").toLowerCase();
  const style = statusStyles[key] || "bg-slate-50 text-slate-700 border-slate-200";
  const label = statusLabels[key] || status || "Unknown";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}