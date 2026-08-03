import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import axios from "axios";
import API_BASE_URL from "./config";

const SearchContext = createContext(null);

const buildRequestConfig = () => {
  const token = window.localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return { withCredentials: true, headers };
};

// Every searchable "screen" and what fields to look for
const SCREEN_REGISTRY = [
  {
    key: "employees",
    label: "Employees",
    route: "/employees",
    icon: "employee",
    fields: ["name", "emp_code", "phone", "city", "zone", "ward", "department", "designation"],
  },
  {
    key: "supervisors",
    label: "Supervisors",
    route: "/supervisors",
    icon: "supervisor",
    fields: ["name", "emp_code", "email", "phone", "role"],
  },
];

const STATIC_PAGES = [
  { label: "Dashboard",               route: "/dashboard",           description: "Overview and stats" },
  { label: "Employees",               route: "/employees",           description: "Manage all employees" },
  { label: "Supervisors",             route: "/supervisors",         description: "Manage supervisors" },
  { label: "Attendance Reports",      route: "/attendance",          description: "View attendance records" },
  { label: "Short Attendance Report", route: "/short-attendance",    description: "Short attendance summary" },
  { label: "Geo Fencing",             route: "/geofencing",          description: "Manage geo fencing zones" },
  { label: "Settings",                route: "/settings",            description: "Application settings" },
  { label: "Master",                  route: "/master",              description: "Master data management" },
  { label: "Announcements",           route: "/announcements",       description: "View announcements" },
  { label: "Assign Supervisor Ward",  route: "/assignSupervisorWard",description: "Assign supervisors to wards" },
  { label: "Supervisor Audit",        route: "/supervisor-audit",    description: "Audit supervisor attendance" },
];

export function SearchProvider({ children }) {
  const [query, setQueryState] = useState("");
  const [isOpen, setIsOpen]     = useState(false);
  const [results, setResults]   = useState([]);
  const [dataReady, setDataReady] = useState(false);

  // Central data store — fetched once here, available to ALL searches
  const dataStore = useRef({ employees: [], supervisors: [] });

  // ── Fetch all searchable data once (when user is logged in) ──────────────
  const fetchAllSearchData = useCallback(async () => {
    const token = window.localStorage.getItem("token");
    if (!token) return; // not logged in yet

    try {
      const [empRes, supRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/employees`,  buildRequestConfig()),
        axios.get(`${API_BASE_URL}/api/supervisor`, { ...buildRequestConfig(), params: { cityId: "all" } }),
      ]);

      if (empRes.status === "fulfilled") {
        dataStore.current.employees = Array.isArray(empRes.value.data)
          ? empRes.value.data
          : [];
      }
      if (supRes.status === "fulfilled") {
        dataStore.current.supervisors = Array.isArray(supRes.value.data)
          ? supRes.value.data
          : [];
      }
      setDataReady(true);
    } catch (err) {
      console.error("Search data prefetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchAllSearchData();
  }, [fetchAllSearchData]);

  // Pages can still call registerData to keep search fresh after CRUD ops
  const registerData = useCallback((key, records) => {
    if (Array.isArray(records)) {
      dataStore.current[key] = records;
    }
  }, []);

  // ── Core search logic ────────────────────────────────────────────────────
  const runSearch = useCallback((q) => {
    const lower = q.trim().toLowerCase();
    const grouped = [];

    // 1. Static page name matches
    const pageHits = STATIC_PAGES.filter(
      (p) =>
        p.label.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower)
    );
    if (pageHits.length) {
      grouped.push({
        section: "Pages",
        items: pageHits.map((p) => ({
          label:    p.label,
          subLabel: p.description,
          route:    p.route,
          id:       p.route,
          icon:     "page",
          matchedOn: null,
        })),
      });
    }

    // 2. Data records — search each registered screen
    for (const screen of SCREEN_REGISTRY) {
      const records = dataStore.current[screen.key] || [];
      if (!records.length) continue;

      const hits = records.filter((record) =>
        screen.fields.some((field) =>
          String(record[field] ?? "").toLowerCase().includes(lower)
        )
      );

      if (!hits.length) continue;

      grouped.push({
        section: screen.label,   // e.g. "Employees" or "Supervisors"
        route:   screen.route,
        items: hits.slice(0, 8).map((record) => {
          // Figure out which field matched so we can show context
          const matchedField = screen.fields.find((f) =>
            String(record[f] ?? "").toLowerCase().includes(lower)
          );
          const matchedValue = record[matchedField] ?? "";

          // Build a readable sub-label showing what matched
          const subParts = [];
          if (record.emp_code)    subParts.push(record.emp_code);
          if (record.designation) subParts.push(record.designation);
          if (record.department)  subParts.push(record.department);
          if (record.email)       subParts.push(record.email);
          if (record.zone)        subParts.push(record.zone);
          if (record.city)        subParts.push(record.city);

          return {
            label:      record.name || record.label || "—",
            subLabel:   subParts.filter(Boolean).join(" · "),
            matchedOn:  matchedField !== "name" ? `Matched: ${matchedValue}` : null,
            route:      screen.route,
            id:         record.emp_id || record.user_id || record.emp_code || Math.random(),
            icon:       screen.icon,
          };
        }),
      });
    }

    return grouped;
  }, []);

  // ── Debounced query handler ───────────────────────────────────────────────
  const debounceTimer = useRef(null);

  const handleSetQuery = useCallback(
    (q) => {
      setQueryState(q);

      if (!q || q.trim().length < 1) {
        setResults([]);
        setIsOpen(false);
        clearTimeout(debounceTimer.current);
        return;
      }

      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const grouped = runSearch(q);
        setResults(grouped);
        setIsOpen(true);
      }, 150); // 150ms debounce — feels instant, won't lag
    },
    [runSearch]
  );

  const clearQuery = useCallback(() => {
    setQueryState("");
    setResults([]);
    setIsOpen(false);
    clearTimeout(debounceTimer.current);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const value = useMemo(
    () => ({
      query,
      normalizedQuery,
      setQuery: handleSetQuery,
      clearQuery,
      isOpen,
      setIsOpen,
      results,
      registerData,
      dataReady,
      refetchSearchData: fetchAllSearchData,
    }),
    [query, normalizedQuery, handleSetQuery, clearQuery, isOpen, results, registerData, dataReady, fetchAllSearchData]
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be inside SearchProvider");
  return ctx;
}