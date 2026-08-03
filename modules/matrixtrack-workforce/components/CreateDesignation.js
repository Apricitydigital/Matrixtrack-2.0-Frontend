import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { AlertCircle, BadgeCheck, Pencil, Trash2 } from "lucide-react";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/designations`;
const departmentUrl = `${API_BASE_URL}/api/departments`;

function CreateDesignation() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designationName, setDesignationName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Resizable columns state
  const [columnWidths, setColumnWidths] = useState({
    sno: 60,
    dept: 250,
    designation: 250,
    actions: 150,
  });

  const [activeResizer, setActiveResizer] = useState(null);

  const handleMouseDown = (e, col) => {
    e.preventDefault();
    setActiveResizer({
      col,
      startX: e.clientX,
      startWidth: columnWidths[col],
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!activeResizer) return;
      const deltaX = e.clientX - activeResizer.startX;
      const newWidth = Math.max(50, activeResizer.startWidth + deltaX);
      setColumnWidths((prev) => ({
        ...prev,
        [activeResizer.col]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setActiveResizer(null);
    };

    if (activeResizer) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeResizer]);

  const buildRequestConfig = useCallback(() => {
    const token = localStorage.getItem("token");
    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};

    return {
      withCredentials: true,
      headers,
    };
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await axios.get(departmentUrl, buildRequestConfig());
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      setErrorMessage(
        error?.response?.status === 401
          ? "Session expired. Please log in again."
          : "Failed to load departments."
      );
    }
  }, [buildRequestConfig]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const fetchDesignations = useCallback(async () => {
    try {
      const response = await axios.get(apiUrl, buildRequestConfig());
      setDesignations(response.data);
    } catch (error) {
      console.error("Error fetching designations:", error);
      setErrorMessage(
        error?.response?.status === 401
          ? "Session expired. Please log in again."
          : "Failed to load designations."
      );
    }
  }, [buildRequestConfig]);

  useEffect(() => {
    fetchDesignations();
  }, [fetchDesignations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!designationName.trim() || !selectedDepartment) {
      setErrorMessage("Please enter a designation name and select a department.");
      return;
    }

    try {
      if (editingDesignation) {
        await axios.put(
          `${apiUrl}/${editingDesignation.designation_id}`,
          {
            designation_name: designationName,
            department_id: selectedDepartment,
          },
          buildRequestConfig()
        );

        setDesignations((prev) =>
          prev.map((des) =>
            des.designation_id === editingDesignation.designation_id
              ? {
                  ...des,
                  designation_name: designationName,
                  department_id: selectedDepartment,
                }
              : des
          )
        );
      } else {
        const response = await axios.post(
          apiUrl,
          {
            designation_name: designationName,
            department_id: selectedDepartment,
          },
          buildRequestConfig()
        );
        setDesignations([...designations, response.data]);
      }

      resetForm();
      fetchDesignations();
    } catch (error) {
      if (error.response) {
        const errCode = error.response.data.code;
        setErrorMessage(
          errCode === "23505"
            ? "Designation already exists."
            : "Error saving designation. Please try again."
        );
      } else {
        setErrorMessage("Network error. Please check your connection.");
      }
      console.error("Error saving designation:", error);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to undo this action!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${apiUrl}/${id}`, buildRequestConfig());
      setDesignations(
        designations.filter((designation) => designation.designation_id !== id)
      );
      Swal.fire("Deleted!", "The Designation has been removed.", "success");
    } catch (error) {
      console.error("Error deleting designation:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const handleEdit = (designation) => {
    setEditingDesignation(designation);
    setDesignationName(designation.designation_name);
    setSelectedDepartment(designation.department_id);
  };

  const resetForm = () => {
    setDesignationName("");
    setSelectedDepartment("");
    setEditingDesignation(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-xl font-bold mb-4 text-slate-800 dark:text-white">
        <BadgeCheck size={20} /> Manage Designations
      </div>

      {errorMessage && (
        <div className="
text-red-600
dark:text-red-400

mb-3

bg-red-50
dark:bg-red-950/20

border
border-red-100
dark:border-red-900

p-3
rounded-lg

flex
items-center
gap-2
">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="
mb-4

flex
flex-col
gap-3

bg-slate-50
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

p-5

rounded-xl

shadow-sm
dark:shadow-slate-950/30
">
        {/* Department Selection */}
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded
w-full

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

focus:outline-none
focus:ring-2
focus:ring-blue-500/20
"
          required
        >
          <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="">Select Department</option>
          {[...departments].sort((a,b) => (a.department_name||"").localeCompare(b.department_name||"", undefined, {numeric: true, sensitivity: 'base'})).map((dept) => (
            <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" key={dept.department_id} value={dept.department_id}>
              {dept.department_name}
            </option>
          ))}
        </select>

        {/* Designation Name Input */}
        <input
          type="text"
          value={designationName}
          onChange={(e) => setDesignationName(e.target.value)}
          placeholder="Enter Designation Name"
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded
w-full

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

focus:outline-none
focus:ring-2
focus:ring-blue-500/20
"
          required
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className={`px-4 py-2 rounded ${
              designationName && selectedDepartment
                ? "bg-blue-500 text-white"
                : ":bg-gray-400 dark:bg-slate-700 text-gray-700 dark:text-slate-400 cursor-not-allowed"
            }`}
            disabled={!designationName || !selectedDepartment}
          >
            {editingDesignation ? "Update Designation" : "Add Designation"}
          </button>
          {editingDesignation && (
            <button
              type="button"
              onClick={resetForm}
              className="
bg-gray-500
dark:bg-slate-700

hover:bg-gray-600
dark:hover:bg-slate-600

text-white

px-4
py-2

rounded

transition-colors
"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      <table
  className="
w-full

bg-white
dark:bg-slate-900

shadow-md
dark:shadow-slate-950/30

rounded-lg

border
border-slate-200
dark:border-slate-700
" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-gray-200 dark:bg-slate-800">
            <th className="
p-3
text-center

border-r
border-gray-300
dark:border-slate-700

relative
select-none

text-slate-800
dark:text-slate-100
" style={{ width: columnWidths.sno }}>
              S.No
              <div
                onMouseDown={(e) => handleMouseDown(e, "sno")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 dark:bg-slate-700 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="
p-3
text-center

border-r
border-gray-300
dark:border-slate-700

relative
select-none

text-slate-800
dark:text-slate-100
" style={{ width: columnWidths.dept }}>
              Department
              <div
                onMouseDown={(e) => handleMouseDown(e, "dept")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 dark:bg-slate-700 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="
p-3
text-center

border-r
border-gray-300
dark:border-slate-700

relative
select-none

text-slate-800
dark:text-slate-100
" style={{ width: columnWidths.designation }}>
              Designation Name
              <div
                onMouseDown={(e) => handleMouseDown(e, "designation")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 dark:bg-slate-700 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="p-3 text-center relative select-none" style={{ width: columnWidths.actions }}>
              Actions
              <div
                onMouseDown={(e) => handleMouseDown(e, "actions")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 dark:bg-slate-700 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {[...designations].sort((a,b) => (a.designation_name||"").localeCompare(b.designation_name||"", undefined, {numeric: true, sensitivity: 'base'})).map((designation, index) => (
            <tr
              key={designation.designation_id}
              className="
border-b
border-gray-200
dark:border-slate-700

text-center

hover:bg-gray-50
dark:hover:bg-slate-800

transition-colors

text-slate-800
dark:text-slate-100
"
            >
              <td className="
p-3

border-r
border-gray-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap
" title={index + 1}>{index + 1}</td>
              <td className="
p-3

border-r
border-gray-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap
" title={designation.department_name || "Unknown Dept"}>
                {designation.department_name || "Unknown Dept"}
              </td>
              <td className="p-3 border-r border-gray-200 truncate overflow-hidden whitespace-nowrap font-semibold" title={designation.designation_name}>{designation.designation_name}</td>
              <td className="p-3">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleEdit(designation)}
                    className="
bg-yellow-500
dark:bg-yellow-600

hover:bg-yellow-600
dark:hover:bg-yellow-700

text-white

px-2
py-1

rounded

transition-colors

text-[10px]

flex
items-center
gap-1
"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(designation.designation_id)}
                    className="
bg-red-500
dark:bg-red-600

hover:bg-red-600
dark:hover:bg-red-700

text-white

px-2
py-1

rounded

transition-colors

text-[10px]

flex
items-center
gap-1
"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CreateDesignation;
