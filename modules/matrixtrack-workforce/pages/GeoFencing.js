import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import GeoFencingManager from "../components/master/GeoFencingManager";
import GeofenceRequestsPanel from "../components/master/GeofenceRequestsPanel";
import { useAuth } from "../AuthContext";

function GeoFencing() {
  const { logPageView } = useAuth();
  const [activeTab, setActiveTab] = useState(1);
  const [selectedGeoConfig, setSelectedGeoConfig] = useState(null);

  useEffect(() => {
    if (logPageView) logPageView("GeoFencing Settings", "/geofencing");
  }, [logPageView]);

  const tabs = [
    {
      id: 1,
      label: "Geofence Requests",
      component: <GeofenceRequestsPanel onApproved={(config) => {
        setSelectedGeoConfig(config);
        setActiveTab(2);
      }} />
    },
    {
      id: 2,
      label: "GeoFencing Approved",
      component: <GeoFencingManager initialConfig={selectedGeoConfig} />
    },
  ];

  return (
    <div className="p-5 text-slate-800 dark:text-slate-100">
      <div className="
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
">        <div className="flex items-center gap-3">
          <div className="
bg-indigo-600

p-2
rounded-lg

text-white

shadow-indigo-100
dark:shadow-none

shadow-md
">
            <MapPin size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="
text-xl
font-black

text-slate-800
dark:text-white

tracking-tight
">GeoFencing Management</h1>
            <p className="
text-slate-400
dark:text-slate-500

font-medium

text-[10px]

uppercase
tracking-widest

mt-0.5
">Location Compliance & Perimeter Configuration</p>
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

${activeTab === tab.id
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
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== 2) setSelectedGeoConfig(null);
            }}
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

export default GeoFencing;
