import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "../AuthContext";
import CreateCity from "../components/CreateCity";
import CreateZone from "../components/CreateZone";
import CreateWard from "../components/CreateWard";
import CreateDepartment from "../components/CreateDepartment";
import CreateDesignation from "../components/CreateDesignation";
import CreateSubWard from "../components/CreateSubWard";
import EmployeeMigrationManager from "../components/EmployeeMigrationManager";

function Master() {
  const { user, logPageView } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const isSupervisor = role === "supervisor";
  const isAdmin = role === "admin";
  const [activeTab, setActiveTab] = useState(isSupervisor ? 2 : 1);

  useEffect(() => {
    if (logPageView) logPageView("Master Setup", "/master");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allTabs = [
    { id: 1, label: "Cities", component: <CreateCity />, adminOnly: true },
    { id: 2, label: "Zones", component: <CreateZone /> },
    { id: 3, label: "Wards", component: <CreateSubWard /> },
    { id: 4, label: "Kothi", component: <CreateWard /> },
    { id: 5, label: "Departments", component: <CreateDepartment /> },
    { id: 6, label: "Designations", component: <CreateDesignation /> },
    { id: 7, label: "Migration", component: <EmployeeMigrationManager />, adminOnly: true },
  ];

  const tabs = allTabs.filter((tab) => !tab.adminOnly || isAdmin);

  useEffect(() => {
    if (!tabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id || 1);
    }
  }, [tabs, activeTab]);

  return (
<div className="p-5 text-slate-800 dark:text-slate-100">      <div className="
flex
flex-col
md:flex-row
md:items-center
justify-between
gap-4

bg-white
dark:bg-slate-900

p-4

rounded-xl

shadow-sm
dark:shadow-slate-950/30

border
border-slate-200
dark:border-slate-700

mb-6
">
        <div className="flex items-center gap-3">
          <div className="
bg-blue-600

p-2
rounded-lg

text-white

shadow-blue-100
dark:shadow-none

shadow-md
">
            <Building2 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="
text-xl
font-black

text-slate-800
dark:text-white

tracking-tight
">Master Management</h1>
            <p className="
text-slate-400
dark:text-slate-500

font-medium

text-[10px]

uppercase
tracking-widest

mt-0.5
">Foundational Data & Infrastructure Configuration</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="
flex
flex-wrap
gap-2

mb-5

border-b
border-slate-200
dark:border-slate-700

pb-2
">
        {tabs.map((tab) => (
          <button
            key={tab.id}
           className={`
px-4
py-2

rounded-t-lg

font-semibold

transition-all

${
  activeTab === tab.id
    ? `
      bg-blue-600
      text-white

      shadow-md
      dark:shadow-none

      -translate-y-1
    `
    : `
      bg-gray-100
      dark:bg-slate-800

      text-gray-600
      dark:text-slate-300

      hover:bg-gray-200
      dark:hover:bg-slate-700
    `
}
`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render Selected Tab Component */}
      <div className="
p-4

bg-white
dark:bg-slate-900

border
border-gray-100
dark:border-slate-700

rounded-xl

shadow-sm
dark:shadow-slate-950/30

min-h-[500px]
">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}

export default Master;
