import React, { useState } from "react";

const reportConfig = {
  vehicle_movement: {
    title: "Vehicle Movement Report",
    fields: {
      date: { type: "date", label: "Select Date" },
      city: {
        type: "select",
        label: "Select City",
        options: ["New York", "Los Angeles", "Chicago"],
      },
      zone: {
        type: "select",
        label: "Select Zone",
        options: ["Zone A", "Zone B", "Zone C"],
      },
      ward: {
        type: "select",
        label: "Select Ward",
        options: ["Ward 1", "Ward 2", "Ward 3"],
      },
      vehicle: { type: "text", label: "Vehicle ID" },
    },
  },
  fuel_consumption: {
    title: "Fuel Consumption Report",
    fields: {
      date: { type: "date", label: "Select Date" },
      vehicle: { type: "text", label: "Vehicle ID" },
      fuel_type: {
        type: "select",
        label: "Fuel Type",
        options: ["Petrol", "Diesel", "Electric"],
      },
    },
  },
  gps_log: {
    title: "GPS Log Report",
    fields: {
      date: { type: "date", label: "Select Date" },
      vehicle: { type: "text", label: "Vehicle ID" },
      driver: { type: "text", label: "Driver Name" },
    },
  },
};

const DynamicReportForm = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [formData, setFormData] = useState({});

  const handleReportChange = (event) => {
    setSelectedReport(event.target.value);
    setFormData({});
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    console.log("Generating report for:", selectedReport, formData);
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow-lg rounded-xl">
      <h2 className="text-xl font-bold mb-4">Select a Report</h2>
      <select
        className="w-full p-2 border rounded-lg mb-4"
        onChange={handleReportChange}
      >
        <option value="">--Select Report--</option>
        {Object.keys(reportConfig).map((key) => (
          <option key={key} value={key}>
            {reportConfig[key].title}
          </option>
        ))}
      </select>

      {selectedReport && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            {reportConfig[selectedReport].title}
          </h3>
          {Object.entries(reportConfig[selectedReport].fields).map(
            ([field, config]) => (
              <div key={field} className="mb-3">
                <label className="block mb-1 font-medium">
                  {config.label}:
                </label>
                {config.type === "text" && (
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    onChange={(e) => handleInputChange(field, e.target.value)}
                  />
                )}
                {config.type === "date" && (
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    onChange={(e) => handleInputChange(field, e.target.value)}
                  />
                )}
                {config.type === "select" && (
                  <select
                    className="w-full p-2 border rounded-lg"
                    onChange={(e) => handleInputChange(field, e.target.value)}
                  >
                    <option value="">--Select--</option>
                    {config.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )
          )}
          <button
            className="w-full bg-blue-600 text-white p-2 rounded-lg mt-4 hover:bg-blue-700"
            onClick={handleSubmit}
          >
            Generate Report
          </button>
        </div>
      )}
    </div>
  );
};

export default DynamicReportForm;
