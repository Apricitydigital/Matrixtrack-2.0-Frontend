import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { buildApiUrl } from "../../config";
import AccessMatrix from "./AccessMatrix";
import { useAuth } from "../../AuthContext";

const PERMISSIONS_ENDPOINT = buildApiUrl("/rbac/permissions");
const USERS_ENDPOINT = buildApiUrl("/rbac/users");

const blankForm = {
  module: "",
  action: "",
  label: "",
  description: "",
};

function MasterPermissionManager() {
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserPermissions, setSelectedUserPermissions] = useState(new Set());
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedPermissionId, setSelectedPermissionId] = useState("");
  const { refreshUser, user: currentUser } = useAuth();

  const buildRequestConfig = useMemo(() => {
    return {
      withCredentials: true,
      headers: (() => {
        const token = localStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      })(),
    };
  }, []);

  

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(PERMISSIONS_ENDPOINT, buildRequestConfig);
      setPermissions(data);
    } catch (err) {
      console.error("Failed to fetch permissions", err);
      setError(
        err?.response?.data?.error || "Unable to load permissions right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(USERS_ENDPOINT, buildRequestConfig);
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError(err?.response?.data?.error || "Unable to load users.");
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchUsers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectExisting = (event) => {
    const value = event.target.value;
    setSelectedPermissionId(value);

    if (!value) {
      setForm(blankForm);
      return;
    }

    const permission = permissions.find(
      (entry) => String(entry.id) === String(value)
    );

    if (permission) {
      setForm({
        module: permission.module || "",
        action: permission.action || "",
        label: permission.label || "",
        description: permission.description || "",
      });
    }
  };

  const clearSelection = () => {
    setSelectedPermissionId("");
    setForm(blankForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.module || !form.action) {
      setError("Module and action are required.");
      return;
    }

    try {
      await axios.post(PERMISSIONS_ENDPOINT, form, {
        withCredentials: true,
      });
      setSuccess(
        selectedPermissionId
          ? "Permission updated successfully."
          : "Permission created successfully."
      );
      setForm(blankForm);
      setSelectedPermissionId("");
      fetchPermissions();
    } catch (err) {
      console.error("Failed to create permission", err);
      setError(
        err?.response?.data?.error || "Failed to create/update permission."
      );
    }
  };

  const handleSelectUserForAssignment = (event) => {
    const value = event.target.value;
    setSelectedUserId(value);
    setSuccess(null);
    setError(null);

    if (!value) {
      setSelectedUserPermissions(new Set());
      return;
    }

    const user = users.find((entry) => String(entry.user_id) === String(value));
    if (!user) {
      setSelectedUserPermissions(new Set());
      return;
    }

    const userPerms = new Set(
      (user.access?.permissions || [])
        .map((perm) => perm.id)
        .filter((id) => Number.isFinite(id))
    );
    setSelectedUserPermissions(userPerms);
  };

  const toggleUserPermission = (permissionId) => {
    setSelectedUserPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const saveUserPermissions = async () => {
    if (!selectedUserId) {
      setError("Select a user to assign permissions.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        permissions: Array.from(selectedUserPermissions).map((id) => ({
          id,
        })),
      };
      await axios.put(`${USERS_ENDPOINT}/${selectedUserId}`, payload, buildRequestConfig);
      setSuccess("Permissions updated for user.");
      await fetchUsers();
      if (currentUser?.user_id && String(currentUser.user_id) === String(selectedUserId)) {
        refreshUser?.();
      }
    } catch (err) {
      console.error("Failed to assign permissions to user", err);
      setError(err?.response?.data?.error || "Failed to assign permissions.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-3">Create Permission</h2>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2 flex flex-col">
            <label className="text-sm font-medium text-gray-700">
              Existing Permission
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded px-3 py-2"
                value={selectedPermissionId}
                onChange={handleSelectExisting}
              >
                <option value="">Create new permission…</option>
                {permissions.map((permission) => (
                  <option key={permission.id} value={permission.id}>
                    {permission.module} · {permission.action}
                  </option>
                ))}
              </select>
              {selectedPermissionId && (
                <button
                  type="button"
                  className="px-3 py-2 border rounded text-sm"
                  onClick={clearSelection}
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select an existing permission to edit its label or description.
            </p>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Module</label>
            <input
              name="module"
              value={form.module}
              onChange={handleChange}
              placeholder="e.g. users"
              className="border rounded px-3 py-2"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Action</label>
            <input
              name="action"
              value={form.action}
              onChange={handleChange}
              placeholder="e.g. create"
              className="border rounded px-3 py-2"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Label</label>
            <input
              name="label"
              value={form.label}
              onChange={handleChange}
              placeholder="Visible label"
              className="border rounded px-3 py-2"
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
              placeholder="Short description"
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            >
              Save Permission
            </button>
          </div>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {success && <p className="text-sm text-green-600 mt-2">{success}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Existing Permissions</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading permissions...</p>
        ) : (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((permission) => (
                  <tr key={permission.id}>
                    <td className="px-4 py-2 text-sm capitalize">
                      {permission.module}
                    </td>
                    <td className="px-4 py-2 text-sm capitalize">
                      {permission.action}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {permission.label || "—"}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {permission.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Assign Permissions to User</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col md:col-span-1">
            <label className="text-sm font-medium text-gray-700 mb-1">Select User</label>
            <select
              className="border rounded px-3 py-2"
              value={selectedUserId}
              onChange={handleSelectUserForAssignment}
            >
              <option value="">Choose a user…</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 border rounded p-3">
            <AccessMatrix
              permissions={permissions}
              selected={Array.from(selectedUserPermissions)}
              onToggle={toggleUserPermission}
              disabled={!selectedUserId}
              cities={[]}
              selectedCityMap={{}}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={saveUserPermissions}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
                disabled={!selectedUserId}
              >
                Save User Permissions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MasterPermissionManager;
