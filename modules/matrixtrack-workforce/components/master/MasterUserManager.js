import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ALLOWED_CITIES_ENDPOINT, buildApiUrl } from "../../config";
import AccessMatrix from "./AccessMatrix";

const USERS_ENDPOINT = buildApiUrl("/rbac/users");
const ROLES_ENDPOINT = buildApiUrl("/rbac/roles");
const PERMISSIONS_ENDPOINT = buildApiUrl("/rbac/permissions");
const DEPARTMENTS_ENDPOINT = buildApiUrl("/departments");
const CITIES_ENDPOINT = ALLOWED_CITIES_ENDPOINT;

const createBlankUser = () => ({
  id: null,
  name: "",
  emp_code: "",
  email: "",
  phone: "",
  department: "",
  password: "",
  roles: [],
  permissions: {},
});

function MasterUserManager() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState(createBlankUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isEditing = useMemo(() => form.id !== null, [form.id]);
  const CITY_FILTER_MODULES = useMemo(() => new Set(["city"]), []);

  const permissionLookup = useMemo(() => {
    const map = new Map();
    permissions.forEach((permission) => {
      if (permission?.id) {
        map.set(Number(permission.id), permission);
      }
    });
    return map;
  }, [permissions]);

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const requestConfig = buildRequestConfig();
      const [usersRes, rolesRes, permRes, deptRes, citiesRes] = await Promise.all([
        axios.get(USERS_ENDPOINT, requestConfig),
        axios.get(ROLES_ENDPOINT, requestConfig),
        axios.get(PERMISSIONS_ENDPOINT, requestConfig),
        axios.get(DEPARTMENTS_ENDPOINT, requestConfig),
        axios.get(CITIES_ENDPOINT, requestConfig),
      ]);

      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setPermissions(permRes.data);
      setDepartments(deptRes.data);
      const cityPayload = citiesRes.data || {};
      const cityList = Array.isArray(cityPayload.cities)
        ? cityPayload.cities
        : Array.isArray(cityPayload)
          ? cityPayload
          : [];
      setCities(cityList);
    } catch (err) {
      console.error("Failed to load user management data", err);
      if (err?.response?.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError(err?.response?.data?.error || "Failed to load user data");
      }
    } finally {
      setLoading(false);
    }
  }, [buildRequestConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shouldAllowCityFilter = (permission) => {
    if (!permission) {
      return false;
    }

    if (
      permission.allow_city_filter === true ||
      permission.supports_city_filter === true ||
      (permission.scope && permission.scope.toLowerCase() === "city")
    ) {
      return true;
    }

    if (permission.module) {
      return CITY_FILTER_MODULES.has(permission.module.toLowerCase());
    }

    return false;
  };

  const handleSelectUser = (user) => {
    const permissionMap = {};
    (user.access?.permissions || []).forEach((permission) => {
      if (!permission?.id) {
        return;
      }
      permissionMap[permission.id] =
        permission.city_id === null || permission.city_id === undefined
          ? "*"
          : String(permission.city_id);
    });

    setForm({
      id: user.user_id,
      name: user.name || "",
      emp_code: user.emp_code || "",
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      password: "",
      roles: (user.access?.roles || []).map((role) => role.id),
      permissions: permissionMap,
    });
    setSuccess(null);
    setError(null);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (roleId) => {
    setForm((prev) => {
      const exists = prev.roles.includes(roleId);
      return {
        ...prev,
        roles: exists
          ? prev.roles.filter((id) => id !== roleId)
          : [...prev.roles, roleId],
      };
    });
  };

  const handlePermissionToggle = (permissionId) => {
    setForm((prev) => {
      const key = String(permissionId);
      const nextPermissions = { ...prev.permissions };
      if (nextPermissions[key]) {
        delete nextPermissions[key];
      } else {
        const meta = permissionLookup.get(Number(permissionId));
        const needsCity = shouldAllowCityFilter(meta);
        nextPermissions[key] = needsCity ? "" : "*";
      }
      return { ...prev, permissions: nextPermissions };
    });
  };

  const handlePermissionCityChange = (permissionId, cityValue) => {
    const meta = permissionLookup.get(Number(permissionId));
    if (!shouldAllowCityFilter(meta)) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionId]: cityValue,
      },
    }));
  };

  const handleReset = () => {
    setForm(createBlankUser());
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name || !form.email || (!isEditing && !form.password)) {
      setError("Name, email and password (for new users) are required");
      return;
    }

    const permissionEntries = Object.entries(form.permissions || {});
    const invalidCity = permissionEntries.some(([permissionId, cityValue]) => {
      const meta = permissionLookup.get(Number(permissionId));
      if (!shouldAllowCityFilter(meta)) {
        return false;
      }
      return cityValue === undefined || cityValue === "";
    });

    if (permissionEntries.length > 0 && invalidCity) {
      setError("Please select a city (or All Cities) for every permission that requires it.");
      return;
    }

    const permissionPayload = [];
    for (const [permissionId, cityValue] of permissionEntries) {
      const numericPermissionId = Number(permissionId);
      if (!Number.isFinite(numericPermissionId)) {
        continue;
      }

      const meta = permissionLookup.get(numericPermissionId);
      const requiresCity = shouldAllowCityFilter(meta);

      let cityId = null;
      if (
        requiresCity &&
        cityValue !== "*" &&
        cityValue !== undefined &&
        cityValue !== ""
      ) {
        const numericCity = Number(cityValue);
        if (!Number.isFinite(numericCity)) {
          setError("One of the selected city filters is invalid.");
          return;
        }
        cityId = numericCity;
      }

      permissionPayload.push({
        id: numericPermissionId,
        city_id: cityId,
      });
    }

    const payload = {
      name: form.name,
      emp_code: form.emp_code,
      email: form.email,
      phone: form.phone,
      department: form.department,
      password: form.password || undefined,
      roles: form.roles,
      permissions: permissionPayload,
    };

    try {
      if (isEditing) {
        await axios.put(`${USERS_ENDPOINT}/${form.id}`, payload, buildRequestConfig());
        setSuccess("User updated successfully");
      } else {
        await axios.post(USERS_ENDPOINT, payload, buildRequestConfig());
        setSuccess("User created successfully");
      }
      handleReset();
      loadData();
    } catch (err) {
      console.error("Failed to save user", err);
      if (err?.response?.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError(err?.response?.data?.error || "Failed to save user");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Users</h2>
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:underline"
            >
              + New User
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 mt-2">Loading users...</p>
          ) : (
            <ul className="mt-3 space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {users.map((user) => (
                <li
                  key={user.user_id}
                  className={`border rounded px-3 py-2 cursor-pointer transition-colors ${
                    form.id === user.user_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => handleSelectUser(user)}
                >
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400">
                    Roles: {(user.access?.roles || []).map((r) => r.name).join(", ") || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-3">
            {isEditing ? "Edit User" : "Create User"}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  className="border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">
                  Employee Code
                </label>
                <input
                  name="emp_code"
                  value={form.emp_code}
                  onChange={handleInputChange}
                  className="border rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleInputChange}
                  className="border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  className="border rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleInputChange}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_name}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>
              {!isEditing && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleInputChange}
                    className="border rounded px-3 py-2"
                    required
                  />
                </div>
              )}
              {isEditing && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">
                    Reset Password (optional)
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleInputChange}
                    className="border rounded px-3 py-2"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Assign Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={`flex items-center space-x-2 border rounded px-3 py-2 cursor-pointer ${
                      form.roles.includes(role.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.roles.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                    />
                    <span className="text-sm capitalize">{role.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Custom Permissions (optional overrides)
              </label>
              <AccessMatrix
                permissions={permissions}
                selected={Object.keys(form.permissions || {}).map((id) => Number(id))}
                selectedCityMap={form.permissions}
                onToggle={handlePermissionToggle}
                onCityChange={handlePermissionCityChange}
                disabled={loading}
                cities={cities}
                shouldShowCityFilter={shouldAllowCityFilter}
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
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
              >
                {isEditing ? "Update User" : "Create User"}
              </button>
            </div>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          {success && <p className="text-sm text-green-600 mt-2">{success}</p>}
        </div>
      </div>
    </div>
  );
}

export default MasterUserManager;
