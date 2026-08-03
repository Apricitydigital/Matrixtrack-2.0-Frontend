import { ClipboardList, FileText, PlusCircle } from "lucide-react";

function QuickActions({
  onAddEmployee = () => {},
  onGenerateReport = () => {},
  onManageAttendance = () => {},
}) {
  return (
    <div className="mt-5 flex gap-4">
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded shadow-md"
        onClick={onAddEmployee}
      >
        <span className="inline-flex items-center gap-2">
          <PlusCircle size={18} /> Add Employee
        </span>
      </button>

      <button
        className="bg-yellow-500 text-white px-4 py-2 rounded shadow-md"
        onClick={onManageAttendance}
      >
        <span className="inline-flex items-center gap-2">
          <ClipboardList size={18} /> Manage Attendance
        </span>
      </button>
    </div>
  );
}

export default QuickActions;
