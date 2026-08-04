import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { AlertCircle, Building2, Pencil, Trash2 } from "lucide-react";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/departments`;

function CreateDepartment() {
  const [departments, setDepartments] = useState([]);
  const [departmentName, setDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Resizable columns state
  const [columnWidths, setColumnWidths] = useState({
    sno: 60,
    name: 500,
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
      const response = await axios.get(apiUrl, buildRequestConfig());
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      if (error?.response?.status === 401) {
        setErrorMessage("Session expired. Please log in again.");
      } else {
        setErrorMessage("Failed to load departments.");
      }
    }
  }, [buildRequestConfig]);


  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      if (editingDepartment) {
        await axios.put(
          `${apiUrl}/${editingDepartment.department_id}`,
          {
            department_name: departmentName,
          },
          buildRequestConfig()
        );

        setDepartments((prev) =>
          prev.map((dept) =>
            dept.department_id === editingDepartment.department_id
              ? { ...dept, department_name: departmentName }
              : dept
          )
        );
      } else {
        const response = await axios.post(
          apiUrl,
          {
            department_name: departmentName,
          },
          buildRequestConfig()
        );
        setDepartments([...departments, response.data]);
      }

      resetForm();
      fetchDepartments();
    } catch (error) {
      if (error.response) {
        const errCode = error.response.data.code;
        setErrorMessage(
          errCode === "23505"
            ? "Department already exists."
            : "Error saving department. Please try again."
        );
      } else {
        setErrorMessage("Network error. Please check your connection.");
      }
      console.error("Error saving department:", error);
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
      setDepartments(departments.filter((dept) => dept.department_id !== id));
      Swal.fire("Deleted!", "The Department has been removed.", "success");
    } catch (error) {
      console.error("Error deleting department:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const handleEdit = (dept) => {
    setEditingDepartment(dept);
    setDepartmentName(dept.department_name);
  };

  const resetForm = () => {
    setDepartmentName("");
    setEditingDepartment(null);
  };

  return (
<div>      <div className="flex items-center gap-2 text-xl font-bold mb-4 text-slate-800 dark:text-white">
        <Building2 size={20} /> Manage Departments
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
        <input
          type="text"
          value={departmentName}
          onChange={(e) => setDepartmentName(e.target.value)}
          placeholder="Enter Department Name"
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

placeholder:text-slate-400
dark:placeholder:text-slate-500

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
              departmentName
                ? "bg-blue-500 text-white"
                : ":bg-gray-400 dark:bg-slate-700 text-gray-700 dark:text-slate-400 cursor-not-allowed"
            }`}
            disabled={!departmentName}
          >
            {editingDepartment ? "Update Department" : "Add Department"}
          </button>
          {editingDepartment && (
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
" style={{ width: columnWidths.name }}>
              Department Name
              <div
                onMouseDown={(e) => handleMouseDown(e, "name")}
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
          {[...departments].sort((a,b) => (a.department_name||"").localeCompare(b.department_name||"", undefined, {numeric: true, sensitivity: 'base'})).map((dept, index) => (
            <tr key={dept.department_id} className="
border-b
border-gray-200
dark:border-slate-700

text-center

hover:bg-gray-50
dark:hover:bg-slate-800

transition-colors

text-slate-800
dark:text-slate-100
">
              <td className="
p-3

border-r
border-gray-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap
" title={index + 1}>{index + 1}</td>
              <td className="p-3 border-r border-gray-200 truncate overflow-hidden whitespace-nowrap font-semibold" title={dept.department_name}>{dept.department_name}</td>
              <td className="p-3">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleEdit(dept)}
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
                    onClick={() => handleDelete(dept.department_id)}
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

export default CreateDepartment;
