import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import API_BASE_URL from "../config";

const buildRequestConfig = () => {
  if (typeof window === "undefined") {
    return { withCredentials: true };
  }
  const token = window.localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return { withCredentials: true, headers };
};

const normalizeId = (value) => (value === null || value === undefined ? "" : String(value));
const MAX_VISIBLE_EMPLOYEES = 200;

function EmployeeMigrationManager() {
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState({
    cities: [],
    zones: [],
    sectors: [],
    kothis: [],
    supervisors: [],
  });
  const [employees, setEmployees] = useState([]);
  const [keys, setKeys] = useState([]);
  const [history, setHistory] = useState([]);

  const [transferMode, setTransferMode] = useState("employee_selection");
  const [supervisorTransferMode, setSupervisorTransferMode] = useState("employees_only");
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");

  const [destinationCityId, setDestinationCityId] = useState("");
  const [destinationZoneId, setDestinationZoneId] = useState("");
  const [destinationSectorId, setDestinationSectorId] = useState("");
  const [destinationWardId, setDestinationWardId] = useState("");

  const [selectedKeyName, setSelectedKeyName] = useState("");
  const [transferKeyValue, setTransferKeyValue] = useState("");
  const [creatingKey, setCreatingKey] = useState({ keyName: "", keyValue: "" });

  const resetTransferForm = () => {
    setTransferMode("employee_selection");
    setSupervisorTransferMode("employees_only");
    setSupervisorSearch("");
    setEmployeeSearch("");
    setSelectedEmployeeIds([]);
    setSelectedSupervisorId("");
    setDestinationCityId("");
    setDestinationZoneId("");
    setDestinationSectorId("");
    setDestinationWardId("");
    setSelectedKeyName("");
    setTransferKeyValue("");
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [contextRes, employeesRes, keysRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/migration/context`, buildRequestConfig()),
        axios.get(`${API_BASE_URL}/api/employees`, buildRequestConfig()),
        axios.get(`${API_BASE_URL}/api/admin/migration/keys`, buildRequestConfig()),
        axios.get(`${API_BASE_URL}/api/admin/migration/history?limit=200`, buildRequestConfig()),
      ]);

      setContext(contextRes.data || { cities: [], zones: [], sectors: [], kothis: [], supervisors: [] });
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
      setKeys(Array.isArray(keysRes.data) ? keysRes.data : []);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (error) {
      console.error("Migration load error:", error);
      Swal.fire("Error", "Unable to load migration data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) =>
      [emp.name, emp.emp_code, emp.phone, emp.city, emp.zone, emp.ward]
        .some((value) => String(value || "").toLowerCase().includes(q))
    );
  }, [employees, employeeSearch]);

  const visibleEmployees = useMemo(
    () => filteredEmployees.slice(0, MAX_VISIBLE_EMPLOYEES),
    [filteredEmployees]
  );

  const destinationZones = useMemo(
    () => context.zones.filter((zone) => normalizeId(zone.city_id) === normalizeId(destinationCityId)),
    [context.zones, destinationCityId]
  );

  const destinationSectors = useMemo(
    () => context.sectors.filter((sector) => normalizeId(sector.zone_id) === normalizeId(destinationZoneId)),
    [context.sectors, destinationZoneId]
  );

  const destinationKothis = useMemo(() => {
    return context.kothis.filter((kothi) => {
      if (destinationSectorId) {
        return normalizeId(kothi.sector_id) === normalizeId(destinationSectorId);
      }
      if (destinationZoneId) {
        return normalizeId(kothi.zone_id) === normalizeId(destinationZoneId);
      }
      return false;
    });
  }, [context.kothis, destinationSectorId, destinationZoneId]);

  const filteredSupervisors = useMemo(() => {
    const q = supervisorSearch.trim().toLowerCase();
    if (!q) return context.supervisors;
    return context.supervisors.filter((sup) =>
      [sup.name, sup.emp_code].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [context.supervisors, supervisorSearch]);

  const selectedSupervisor = useMemo(
    () =>
      context.supervisors.find(
        (sup) => normalizeId(sup.user_id) === normalizeId(selectedSupervisorId)
      ) || null,
    [context.supervisors, selectedSupervisorId]
  );

  const toggleEmployeeSelection = (empId) => {
    const id = normalizeId(empId);
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const selectVisibleEmployees = () => {
    setSelectedEmployeeIds(visibleEmployees.map((emp) => normalizeId(emp.emp_id)));
  };

  const clearSelection = () => {
    setSelectedEmployeeIds([]);
  };

  const createTransferKey = async () => {
    const keyName = creatingKey.keyName.trim();
    const keyValue = creatingKey.keyValue;
    if (!keyName || !keyValue) {
      Swal.fire("Required", "Key name and key value are required.", "warning");
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/migration/keys`,
        { keyName, keyValue, isActive: true },
        buildRequestConfig()
      );
      setCreatingKey({ keyName: "", keyValue: "" });
      Swal.fire("Created", "Transfer key created successfully.", "success");
      const keysRes = await axios.get(`${API_BASE_URL}/api/admin/migration/keys`, buildRequestConfig());
      setKeys(Array.isArray(keysRes.data) ? keysRes.data : []);
    } catch (error) {
      const message = error?.response?.data?.error || "Unable to create key.";
      Swal.fire("Error", message, "error");
    }
  };

  const executeTransfer = async () => {
    if (!destinationWardId) {
      Swal.fire("Required", "Please select destination kothi.", "warning");
      return;
    }

    if (!transferKeyValue.trim()) {
      Swal.fire("Required", "Please enter transfer key.", "warning");
      return;
    }

    if (transferMode === "employee_selection" && selectedEmployeeIds.length === 0) {
      Swal.fire("Required", "Select at least one employee.", "warning");
      return;
    }

    if (transferMode === "supervisor_selection" && !selectedSupervisorId) {
      Swal.fire("Required", "Select supervisor.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Confirm Transfer",
      text: "This will move selected employees to the selected destination.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Transfer Now",
    });

    if (!result.isConfirmed) return;

    try {
      const payload = {
        destinationWardId: Number(destinationWardId),
        transferKey: transferKeyValue,
        keyName: selectedKeyName || null,
      };

      if (transferMode === "employee_selection") {
        payload.employeeIds = selectedEmployeeIds.map((id) => Number(id));
      } else {
        payload.supervisorId = Number(selectedSupervisorId);
        payload.supervisorTransferMode = supervisorTransferMode;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/admin/migration/transfer`,
        payload,
        buildRequestConfig()
      );

      resetTransferForm();
      Swal.fire("Success", response?.data?.message || "Transfer completed.", "success");
      await loadAll();
    } catch (error) {
      const message = error?.response?.data?.error || "Unable to transfer employees.";
      resetTransferForm();
      await loadAll();
      Swal.fire("Error", message, "error");
    }
  };

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      <div className="
bg-slate-50
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

rounded-xl

p-4
">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Employee Migration Console</h2>
          <button
            type="button"
            onClick={loadAll}
            className="
bg-white
dark:bg-slate-800

border
border-slate-300
dark:border-slate-700

px-3
py-2

rounded-lg

text-sm
font-semibold

text-slate-700
dark:text-slate-200

hover:border-indigo-400
dark:hover:border-indigo-500

hover:text-indigo-600
dark:hover:text-indigo-400

transition-all
"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="
bg-white
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

rounded-xl

p-4

space-y-3
">
            <h3 className="font-bold text-slate-700 dark:text-slate-200">1) Select Source</h3>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="transferMode"
                  checked={transferMode === "employee_selection"}
                  onChange={() => setTransferMode("employee_selection")}
                />
                Selected Employees
              </label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="transferMode"
                  checked={transferMode === "supervisor_selection"}
                  onChange={() => {
                    setTransferMode("supervisor_selection");
                    setSupervisorTransferMode("employees_only");
                    setSupervisorSearch("");
                  }}
                />
                By Supervisor
              </label>
            </div>

            {transferMode === "employee_selection" ? (
              <>
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search employee by name / code / city..."
             className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-4
py-3

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-white

placeholder:text-slate-400
dark:placeholder:text-slate-500

shadow-sm
dark:shadow-none

focus:outline-none
focus:ring-2
focus:ring-indigo-500/40

focus:border-indigo-500

transition-all
"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={selectVisibleEmployees} className="
text-xs

px-2
py-1

border
border-slate-300
dark:border-slate-700

rounded-lg

bg-white
dark:bg-slate-800

text-slate-700
dark:text-slate-300

hover:bg-slate-50
dark:hover:bg-slate-700

transition-all
">
                    Select Visible
                  </button>
                  <button type="button" onClick={clearSelection} className="
text-xs

px-2
py-1

border
border-slate-300
dark:border-slate-700

rounded-lg

bg-white
dark:bg-slate-800

text-slate-700
dark:text-slate-300

hover:bg-slate-50
dark:hover:bg-slate-700

transition-all
">
                    Clear
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 self-center">
                    Selected: {selectedEmployeeIds.length}
                  </span>
                  <span className="text-xs text-slate-500 self-center">
                    Showing: {visibleEmployees.length}/{filteredEmployees.length}
                  </span>
                </div>
                <div className="max-h-52 overflow-auto border border-slate-200 rounded-md">
                  {visibleEmployees.map((emp) => {
                    const id = normalizeId(emp.emp_id);
                    return (
                      <label key={id} className="
flex
items-center
gap-2

px-3
py-2

border-b
border-slate-200
dark:border-slate-700

last:border-b-0

text-sm

text-slate-700
dark:text-slate-300

hover:bg-slate-50
dark:hover:bg-slate-800/60

transition-colors
">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(id)}
                          onChange={() => toggleEmployeeSelection(id)}
                        />
                        <span className="font-semibold">{emp.emp_code || "-"}</span>
                        <span>{emp.name || "Employee"}</span>
                        <span className="text-slate-400 dark:text-slate-500">({emp.city || "-"} / {emp.zone || "-"} / {emp.ward || "-"})</span>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="supervisorTransferMode"
                      checked={supervisorTransferMode === "employees_only"}
                      onChange={() => setSupervisorTransferMode("employees_only")}
                    />
                    Transfer without supervisor (employees only)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="supervisorTransferMode"
                      checked={supervisorTransferMode === "with_supervisor"}
                      onChange={() => setSupervisorTransferMode("with_supervisor")}
                    />
                    Transfer with supervisor (employees + supervisor)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="supervisorTransferMode"
                      checked={supervisorTransferMode === "supervisor_only"}
                      onChange={() => setSupervisorTransferMode("supervisor_only")}
                    />
                    Supervisor only transfer
                  </label>
                </div>
                <input
                  type="text"
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  placeholder="Search supervisor by name / code..."
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <div className="max-h-44 overflow-auto border border-slate-200 rounded-md">
                  {filteredSupervisors.map((sup) => {
                    const supId = normalizeId(sup.user_id);
                    const isSelected = normalizeId(selectedSupervisorId) === supId;
                    return (
                      <button
                        key={supId}
                        type="button"
                        onClick={() => setSelectedSupervisorId(supId)}
                        className={`w-full text-left px-3 py-2 border-b last:border-b-0 text-sm ${
                          isSelected ? "bg-indigo-50 text-indigo-700 font-semibold" : "hover:bg-slate-50"
                        }`}
                      >
                        {sup.name} ({sup.emp_code || "No Code"})
                      </button>
                    );
                  })}
                  {filteredSupervisors.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-500">No supervisor found.</div>
                  )}
                </div>

                {selectedSupervisor && (
                  <div className="border border-indigo-200 bg-indigo-50 rounded-md p-3 text-xs space-y-1">
                    <div className="font-semibold text-indigo-700">
                      Current Location: {selectedSupervisor.name}
                    </div>
                    {(selectedSupervisor.assignments || []).length > 0 ? (
                      (selectedSupervisor.assignments || []).map((row, idx) => (
                        <div key={`${row.ward_id || "na"}-${idx}`} className="text-slate-700">
                          {(idx + 1)}. {[row.city_name, row.zone_name, row.sector_name, row.ward_name].filter(Boolean).join(" / ")}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600">No current ward assignment.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="
bg-white
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

rounded-xl

p-4

space-y-3
">
            <h3 className="font-bold text-slate-700 dark:text-slate-200">2) Select Destination</h3>
            <select
              value={destinationCityId}
              onChange={(e) => {
                setDestinationCityId(e.target.value);
                setDestinationZoneId("");
                setDestinationSectorId("");
                setDestinationWardId("");
              }}
              className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-md

px-3
py-2

text-sm

bg-white
dark:bg-slate-800

text-slate-700
dark:text-slate-200

placeholder:text-slate-400
dark:placeholder:text-slate-500
"
            >
              <option value="">Destination City</option>
              {context.cities.map((city) => (
                <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
              ))}
            </select>
            <select
              value={destinationZoneId}
              onChange={(e) => {
                setDestinationZoneId(e.target.value);
                setDestinationSectorId("");
                setDestinationWardId("");
              }}
              className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-md

px-3
py-2

text-sm

bg-white
dark:bg-slate-800

text-slate-700
dark:text-slate-200

placeholder:text-slate-400
dark:placeholder:text-slate-500
"
              disabled={!destinationCityId}
            >
              <option value="">Destination Zone</option>
              {destinationZones.map((zone) => (
                <option key={zone.zone_id} value={zone.zone_id}>{zone.zone_name}</option>
              ))}
            </select>
            <select
              value={destinationSectorId}
              onChange={(e) => {
                setDestinationSectorId(e.target.value);
                setDestinationWardId("");
              }}
              className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-md

px-3
py-2

text-sm

bg-white
dark:bg-slate-800

text-slate-700
dark:text-slate-200

placeholder:text-slate-400
dark:placeholder:text-slate-500
"
              disabled={!destinationZoneId}
            >
              <option value="">Destination Ward (Sector)</option>
              {destinationSectors.map((sector) => (
                <option key={sector.sector_id} value={sector.sector_id}>{sector.sector_name}</option>
              ))}
            </select>
            <select
              value={destinationWardId}
              onChange={(e) => setDestinationWardId(e.target.value)}
              className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-md

px-3
py-2

text-sm

bg-white
dark:bg-slate-800

text-slate-700
dark:text-slate-200

placeholder:text-slate-400
dark:placeholder:text-slate-500
"
              disabled={!destinationZoneId}
            >
              <option value="">Destination Kothi</option>
              {destinationKothis.map((kothi) => (
                <option key={kothi.ward_id} value={kothi.ward_id}>
                  {kothi.ward_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="
mt-4

bg-white
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

rounded-xl

p-4

space-y-3
">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">3) Transfer Key Verification</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedKeyName}
              onChange={(e) => setSelectedKeyName(e.target.value)}
              className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-4
py-3

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-white

placeholder:text-slate-400
dark:placeholder:text-slate-500

focus:outline-none
focus:ring-2
focus:ring-indigo-500/40

focus:border-indigo-500

transition-all
"
            >
              <option value="">Any active key name</option>
              {keys.filter((row) => row.is_active).map((row) => (
                <option key={row.key_id} value={row.key_name}>
                  {row.key_name}
                </option>
              ))}
            </select>
            <input
  type="password"
  value={transferKeyValue}
  onChange={(e) => setTransferKeyValue(e.target.value)}
  placeholder="Enter transfer key (example: jasikey)"
  className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-4
py-3

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-white

placeholder:text-slate-400
dark:placeholder:text-slate-500

shadow-sm
dark:shadow-none

caret-indigo-500

focus:outline-none
focus:ring-2
focus:ring-indigo-500/40

focus:border-indigo-500

transition-all

autofill:shadow-[inset_0_0_0px_1000px_#020817]
autofill:text-white
"
 />
            <button
              type="button"
              onClick={executeTransfer}
              className="
bg-indigo-600
hover:bg-indigo-700

dark:bg-indigo-500
dark:hover:bg-indigo-600

text-white

px-4
py-2

rounded-md

font-semibold

transition-all

disabled:opacity-60
"
              disabled={loading}
            >
              Execute Transfer
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="
bg-white
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

rounded-xl

p-4

space-y-3
">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">Transfer Keys</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              value={creatingKey.keyName}
              onChange={(e) => setCreatingKey((prev) => ({ ...prev, keyName: e.target.value }))}
              placeholder="Key name"
              className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-4
py-3

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-white

placeholder:text-slate-400
dark:placeholder:text-slate-500

focus:outline-none
focus:ring-2
focus:ring-indigo-500/40

focus:border-indigo-500

transition-all
"
            />
            <input
              type="text"
              value={creatingKey.keyValue}
              onChange={(e) => setCreatingKey((prev) => ({ ...prev, keyValue: e.target.value }))}
              placeholder="Key value"
              className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-4
py-3

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-white

placeholder:text-slate-400
dark:placeholder:text-slate-500

focus:outline-none
focus:ring-2
focus:ring-indigo-500/40

focus:border-indigo-500

transition-all
"
            />
            <button
              type="button"
              onClick={createTransferKey}
              className="
border
border-indigo-600
dark:border-indigo-500/30

text-indigo-600
dark:text-indigo-400

rounded-md

px-3
py-2

text-sm
font-semibold

hover:bg-indigo-50
dark:hover:bg-indigo-500/10

transition-all
"
            >
              Create Key
            </button>
          </div>
          <div className="
max-h-48
overflow-auto

border
border-slate-200
dark:border-slate-700

rounded-xl

bg-white
dark:bg-slate-900
">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="
text-left

px-3
py-2

text-slate-700
dark:text-slate-300

font-semibold
">Name</th>
                  <th className="
text-left

px-3
py-2

text-slate-700
dark:text-slate-300

font-semibold
">Status</th>
                  <th className="
text-left

px-3
py-2

text-slate-700
dark:text-slate-300

font-semibold
">Created By</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((row) => (
                  <tr key={row.key_id} className="
border-t
border-slate-200
dark:border-slate-700

hover:bg-slate-50
dark:hover:bg-slate-800/60

transition-colors
">
                    <td className="px-3 py-2">{row.key_name}</td>
                    <td className="px-3 py-2">{row.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-3 py-2">{row.created_by_name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="
bg-white
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

rounded-xl

p-4

space-y-3
">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">Transfer History</h3>
          <div className="
max-h-72
overflow-auto

border
border-slate-200
dark:border-slate-700

rounded-xl

bg-white
dark:bg-slate-900
">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="text-left px-2 py-2">Employee</th>
                  <th className="text-left px-2 py-2">From</th>
                  <th className="text-left px-2 py-2">To</th>
                  <th className="text-left px-2 py-2">By</th>
                  <th className="text-left px-2 py-2">Key</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.transfer_id} className="
border-t
border-slate-200
dark:border-slate-700

align-top

hover:bg-slate-50
dark:hover:bg-slate-800/60

transition-colors
">
                    <td className="px-2 py-2">
                      <div className="font-semibold">{row.employee_name || "-"}</div>
                      <div className="text-slate-500 dark:text-slate-400">{row.emp_code || "-"}</div>
                    </td>
                    <td className="px-2 py-2">{[row.from_city_name, row.from_zone_name, row.from_sector_name, row.from_kothi_name].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="px-2 py-2">{[row.to_city_name, row.to_zone_name, row.to_sector_name, row.to_kothi_name].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="px-2 py-2">{row.transferred_by_name || "-"}</td>
                    <td className="px-2 py-2">{row.transfer_key_name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeMigrationManager;
