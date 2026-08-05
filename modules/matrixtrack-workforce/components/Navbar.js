import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBars, FaBell, FaExpand, FaCompress, FaSearch, FaTimes } from "react-icons/fa";
import { useAuth } from "../AuthContext";
import { useSearch } from "../SearchContext";

/* ── Icon map for result types ─────────────────────────────────── */
const ResultIcon = ({ type }) => {
  if (type === "employee")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    );
  if (type === "supervisor")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  // page
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
  );
};

/* ── Dropdown ───────────────────────────────────────────────────── */
function SearchDropdown({ results, query, onSelect }) {
  if (!results.length) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-4 px-4">
        <p className="text-sm text-slate-400 text-center">
          No results for{" "}
          <span className="font-semibold text-slate-600">"{query}"</span>
        </p>
        <p className="text-xs text-slate-300 text-center mt-1">
          Try searching a name, emp code, department, or page name
        </p>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto">
      {results.map((group) => (
        <div key={group.section}>
          {/* Section header — shows which SCREEN these results are from */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-between sticky top-0 bg-white border-b border-slate-50">
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
              {group.section}
            </span>
            {group.route && (
              <span className="text-[10px] text-indigo-400 font-medium">
                → {group.route}
              </span>
            )}
          </div>

          {group.items.map((item) => (
            <button
              key={item.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left group"
            >
              {/* Icon */}
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center transition-colors mt-0.5">
                <ResultIcon type={item.icon} />
              </span>

              {/* Text content */}
              <span className="flex-1 min-w-0">
                {/* Highlighted name */}
                <span className="block text-sm font-semibold text-slate-800 truncate">
                  <HighlightMatch text={item.label} query={query} />
                </span>
                {/* Sub info */}
                {item.subLabel && (
                  <span className="block text-xs text-slate-400 truncate mt-0.5">
                    {item.subLabel}
                  </span>
                )}
                {/* What actually matched (e.g. "Matched: Zone 3") */}
                {item.matchedOn && (
                  <span className="block text-[11px] text-indigo-500 font-medium mt-0.5">
                    {item.matchedOn}
                  </span>
                )}
              </span>

              {/* Go arrow */}
              <span className="flex-shrink-0 text-[10px] text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity self-center">
                Open →
              </span>
            </button>
          ))}
        </div>
      ))}

      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 sticky bottom-0">
        <p className="text-[10px] text-slate-400 text-center">
          <kbd className="bg-white border border-slate-200 rounded px-1 font-mono">Esc</kbd>{" "}
          to close · Click any result to navigate
        </p>
      </div>
    </div>
  );
}

// Highlights the matched portion of text in yellow
function HighlightMatch({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const lower = text.toLowerCase();
  const qLower = query.trim().toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic">
        {text.slice(idx, idx + qLower.length)}
      </mark>
      {text.slice(idx + qLower.length)}
    </>
  );
}

/* ── Navbar ─────────────────────────────────────────────────────── */
function Navbar({ toggleSidebar }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { query, setQuery, clearQuery, isOpen, setIsOpen, results } = useSearch();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Attendance synced", message: "Daily attendance data was synced successfully.", time: "Just now", type: "success", read: false, path: "/attendance" },
    { id: 2, title: "Pending confirmations", message: "3 supervisors still need to confirm today's attendance.", time: "15m ago", type: "warning", read: false, path: "/supervisors" },
    { id: 3, title: "New report available", message: "Short attendance report for this range is ready.", time: "1h ago", type: "info", read: false, path: "/short-attendance" },
    { id: 4, title: "New supervisor added", message: "Supervisor Priya has been assigned to Ward 12.", time: "2h ago", type: "info", read: false, path: "/assignSupervisorWard" },
  ]);

  const inputRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const notificationRef = useRef(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  /* fullscreen sync */
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  /* close notifications on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target))
        setIsNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* close search dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setIsOpen]);

  /* Ctrl+K / Cmd+K to focus search, Escape to close */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") {
        clearQuery();
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [clearQuery]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const markAsRead = (id) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    setIsNotificationsOpen(false);
    if (n.path) navigate(n.path);
  };

  const getBadgeStyles = (type) => {
    if (type === "success") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    if (type === "warning") return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
  };

  /* Navigate to a search result */
  const handleSelect = (item) => {
    clearQuery();
    navigate(item.route);
  };

  return (
    <nav className="
sticky
top-0
z-30

backdrop-blur

bg-white/70
dark:bg-slate-900/80

border-b
border-slate-200
dark:border-slate-700
">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">

        {/* ── Left: sidebar toggle + search ── */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={toggleSidebar}
            className="
p-2

rounded-xl

border
border-slate-200
dark:border-slate-700

text-slate-700
dark:text-slate-200

bg-white
dark:bg-slate-800

hover:bg-slate-100
dark:hover:bg-slate-700

transition
flex-shrink-0
"            aria-label="Toggle sidebar"
          >
            <FaBars />
          </button>

          {/* Search box — full width up to 420px */}
          <div ref={searchWrapperRef} className="relative w-full max-w-sm sm:max-w-md">
            <div
              className={`
flex
items-center
gap-2

px-3
py-2

rounded-xl

bg-slate-100
dark:bg-slate-800

border

transition-all

${
  isOpen
    ? `
      border-indigo-400
      ring-2
      ring-indigo-100
      dark:ring-indigo-500/20

      bg-white
      dark:bg-slate-900
    `
    : `
      border-slate-200
      dark:border-slate-700

      hover:border-slate-300
      dark:hover:border-slate-600
    `
}
`}
            >
              <FaSearch className="text-slate-400 dark:text-slate-500 flex-shrink-0 text-sm" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search employees, pages… (Ctrl+K)"
className="
bg-transparent

text-slate-700
dark:text-white

placeholder:text-slate-400
dark:placeholder:text-slate-500

outline-none

text-sm
flex-1
min-w-0
"                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query && setIsOpen(true)}
                autoComplete="off"
                aria-label="Global search"
              />
              {query ? (
                <button
                  onClick={clearQuery}
                  className="text-slate-400 hover:text-slate-600 flex-shrink-0 transition-colors"
                  aria-label="Clear search"
                >
                  <FaTimes className="text-xs" />
                </button>
              ) : (
                <kbd className="
hidden
sm:inline

text-[10px]

bg-white
dark:bg-slate-700

border
border-slate-200
dark:border-slate-600

rounded

px-1.5
py-0.5

text-slate-400
dark:text-slate-300

font-mono
flex-shrink-0
">
                  Ctrl K
                </kbd>
              )}
            </div>

            {/* Dropdown */}
            {isOpen && (
              <SearchDropdown
                results={results}
                query={query}
                onSelect={handleSelect}
              />
            )}
          </div>
        </div>

        {/* ── Right: user info + actions ── */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Welcome back</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-white">{user?.name || user?.email || "User"}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Role: {user?.roleLabels?.[0] || (user?.roles?.[0] ? user.roles[0].replace('_', ' ') : null) || user?.role || "Admin"}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="
p-2

rounded-xl

border
border-slate-200
dark:border-slate-700

text-slate-600
dark:text-slate-300

bg-white
dark:bg-slate-800

hover:bg-slate-100
dark:hover:bg-slate-700

transition
"
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>

          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => setIsNotificationsOpen((p) => !p)}
              className="
relative
p-2

rounded-xl

border
border-slate-200
dark:border-slate-700

text-slate-600
dark:text-slate-300

bg-white
dark:bg-slate-800

hover:bg-slate-100
dark:hover:bg-slate-700

transition
"
              aria-label="Toggle notifications"
            >
              <FaBell className="text-lg" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="
absolute
right-0
mt-3
w-80

bg-white
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

rounded-2xl

shadow-xl
z-40
overflow-hidden
">
                <div className="
flex
items-center
justify-between

px-4
py-3

border-b
border-slate-200
dark:border-slate-700
">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Notifications</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Stay on top of attendance updates</p>
                  </div>
                  <button
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="
max-h-80
overflow-y-auto

divide-y
divide-slate-100
dark:divide-slate-700
">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition ${n.read ? "bg-white hover:bg-slate-50" : "bg-slate-50 hover:bg-slate-100"
                        }`}
                    >
                      <div className="pt-1">
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${getBadgeStyles(n.type)}`}>
                          {n.type === "warning" ? "Alert" : "Update"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{n.title}</p>
                          {!n.read && <span className="text-[10px] font-semibold text-blue-600">New</span>}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-5">{n.message}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{n.time}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="
px-4
py-2

rounded-xl

bg-slate-900
dark:bg-slate-800

text-white

text-sm
font-semibold

hover:bg-slate-800
dark:hover:bg-slate-700

transition
shadow-sm
"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;