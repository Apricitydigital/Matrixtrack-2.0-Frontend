import { CheckCircle2, XCircle } from "lucide-react";

export default function ToastMessage({ toast, onClose }) {
  if (!toast) {
    return null;
  }

  const isError = toast.type === "error";

  return (
    <div className="fixed right-4 top-4 z-[70] max-w-xs">
      <div
        className={`rounded-xl border px-4 py-3 shadow-lg ${
          isError
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        <div className="flex items-start gap-2">
          {isError ? <XCircle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
          <div className="flex-1">
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}