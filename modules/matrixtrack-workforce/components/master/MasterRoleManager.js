import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../config";
import AccessMatrix from "./AccessMatrix";

const ROLES_ENDPOINT = buildApiUrl("/rbac/roles");
const PERMISSIONS_ENDPOINT = buildApiUrl("/rbac/permissions");

const emptyRole = {
  id: null,
  name: "",
  description: "",
  permissions: [],
};

function MasterRoleManager() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [form, setForm] = useState(emptyRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isEditing = useMemo(() => form.id !== null, [form.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes] = await Promise.all([
        axios.get(ROLES_ENDPOINT, { withCredentials: true }),
        axios.get(PERMISSIONS_ENDPOINT, { withCredentials: true }),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
    } catch (err) {
      console.error("Failed to load RBAC data", err);
      setError(err?.response?.data?.error || "Failed to load RBAC data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRole = (role) => {
    setForm({
      id: role.id,
      name: role.name,
      description: role.description || "",
      permissions: (role.permissions || []).map((perm) => perm.id),
      is_system: role.is_system,
    });
    setError(null);
    setSuccess(null);
  };

  const handlePermissionToggle = (permissionId) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(permissionId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((id) => id !== permissionId)
          : [...prev.permissions, permissionId],
      };
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setForm(emptyRole);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name) {
      setError("Role name is required");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      permissions: form.permissions,
    };

    try {
      if (isEditing) {
        await axios.put(`${ROLES_ENDPOINT}/${form.id}`, payload, {
          withCredentials: true,
        });
        setSuccess("Role updated successfully");
      } else {
        await axios.post(ROLES_ENDPOINT, payload, {
          withCredentials: true,
        });
        setSuccess("Role created successfully");
      }
      handleReset();
      loadData();
    } catch (err) {
      console.error("Failed to save role", err);
      setError(err?.response?.data?.error || "Failed to save role");
    }
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm("Delete this role?")) {
      return;
    }

    try {
      await axios.delete(`${ROLES_ENDPOINT}/${roleId}`, {
        withCredentials: true,
      });
      setSuccess("Role deleted");
      if (form.id === roleId) {
        handleReset();
      }
      loadData();
    } catch (err) {
      console.error("Failed to delete role", err);
      setError(err?.response?.data?.error || "Failed to delete role");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Roles</h2>
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:underline"
            >
              + New Role
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading roles...</p>
          ) : (
            <ul className="space-y-2">
              {roles.map((role) => (
                <li
                  key={role.id}
                  className={`border rounded px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                    form.id === role.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => handleSelectRole(role)}
                >
                  <div>
                    <p className="font-medium capitalize">{role.name}</p>
                    <p className="text-xs text-gray-500">
                      {role.description || "No description"}
                    </p>
                  </div>
                  {!role.is_system && (
                    <button
                      className="text-xs text-red-500"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(role.id);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-3">
            {isEditing ? "Edit Role" : "Create Role"}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">
                  Role Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="border rounded px-3 py-2"
                  placeholder="e.g. data-analyst"
                  required
                  disabled={form.is_system}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="border rounded px-3 py-2"
                  placeholder="Short summary"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Permissions
              </label>
              <AccessMatrix
                permissions={permissions}
                selected={form.permissions}
                onToggle={handlePermissionToggle}
                disabled={form.is_system}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 border rounded"
                onClick={handleReset}
              >
                Cancel
              </button>
              {!form.is_system && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
                >
                  {isEditing ? "Update Role" : "Create Role"}
                </button>
              )}
            </div>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          {success && <p className="text-sm text-green-600 mt-2">{success}</p>}
        </div>
      </div>
    </div>
  );
}

export default MasterRoleManager;

