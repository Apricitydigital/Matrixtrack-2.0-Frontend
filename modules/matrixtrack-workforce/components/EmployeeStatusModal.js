import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
const STATUS_LABELS = {
  marked: "Punched",
  inProgress: "In Progress",
  notMarked: "Not Punched",
  onLeave: "On Leave",
  present: "Present",
  supervisors: "Supervisors",
};

const STATUS_STYLES = {
  marked: "bg-green-100 text-green-700 ring-green-200",
  inProgress: "bg-amber-100 text-amber-700 ring-amber-200",
  notMarked: "bg-red-100 text-red-700 ring-red-200",
  onLeave: "bg-amber-100 text-amber-700 ring-amber-200",
  present: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

const PAGE_SIZE = 50;

function EmployeeStatusModal({ statusKey, employees = [], onClose }) {
  const [page, setPage] = useState(0);
  const title = STATUS_LABELS[statusKey] || "Employees";
  const badgeStyle = STATUS_STYLES[statusKey] || "bg-slate-100 text-slate-700";

  useEffect(() => {
    setPage(0);
  }, [statusKey, employees]);
const handleDownloadExcel = () => {
  const excelData = employees.map((item, index) => ({
    "Sr No": index + 1,
    Name: item.displayName,
    "Employee Code": item.empCode,
    Ward: item.ward,
    City: item.city,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Supervisors"
  );

  XLSX.writeFile(workbook, "Supervisors.xlsx");
};
  const totalPages = Math.max(
    1,
    Math.ceil((Array.isArray(employees) ? employees.length : 0) / PAGE_SIZE)
  );

  const pageEmployees = useMemo(() => {
    if (!Array.isArray(employees) || employees.length === 0) {
      return [];
    }
    const start = page * PAGE_SIZE;
    return employees.slice(start, start + PAGE_SIZE);
  }, [employees, page]);

  if (!statusKey) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Employee status
    </p>

    <div className="mt-1 flex items-center gap-2">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>

      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badgeStyle}`}
      >
        {employees.length.toLocaleString()} total
      </span>
    </div>

    <p className="mt-1 text-sm text-slate-500">
      Sorted A-Z - {PAGE_SIZE} per page
    </p>
  </div>

  <div className="flex items-center gap-2">

    {statusKey === "supervisors" && (
      <button
        onClick={handleDownloadExcel}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        <Download size={16} />
        Download Excel
      </button>
    )}

    <button
      onClick={onClose}
      aria-label="Close"
      className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
    >
      <X size={20} />
    </button>

  </div>
</div>

        <div className="max-h-[70vh] overflow-y-auto">
          {pageEmployees.length === 0 ? (
            <div className="flex items-center justify-center px-6 py-12 text-slate-500">
              No employees found for this status.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {pageEmployees.map((employee) => (
                <li
                  key={employee.id}
                  className="flex items-center justify-between gap-4 px-6 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                      {(employee.displayName || "E").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {employee.displayName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {employee.empCode ? `Code: ${employee.empCode}` : "Code unavailable"}
                        {employee.ward ? ` - Ward: ${employee.ward}` : ""}
                      </p>
                    </div>
                  </div>
                  {employee.city && (
                    <span className="text-xs font-medium text-slate-500">
                      {employee.city}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((value) => Math.max(value - 1, 0))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <button
              onClick={() => setPage((value) => Math.min(value + 1, totalPages - 1))}
              disabled={page + 1 >= totalPages}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeStatusModal;
