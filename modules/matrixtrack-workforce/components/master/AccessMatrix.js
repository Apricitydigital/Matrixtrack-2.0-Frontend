import React, { useMemo } from "react";
const groupByModule = (permissions) => {
  const map = new Map();
  permissions.forEach((permission) => {
    const module = permission.module || "general";
    if (!map.has(module)) {
      map.set(module, []);
    }
    map.get(module).push(permission);
  });
  return map;
};

// this is access matrix
const AccessMatrix = ({
  permissions = [],
  selected = [],
  onToggle,
  disabled = false,
  cities = [],
  selectedCityMap = {},
  onCityChange,
  shouldShowCityFilter,
}) => {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const grouped = useMemo(() => groupByModule(permissions), [permissions]);

  if (!permissions.length) {
    return (
      <div className="text-sm text-gray-500">
        No permissions defined yet. Create permissions first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([module, modulePermissions]) => (
        <div key={module}>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize">
            {module}
          </h4>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {modulePermissions.map((permission) => {
              const isChecked = selectedSet.has(permission.id);
              const canFilterByCity = shouldShowCityFilter
                ? shouldShowCityFilter(permission)
                : false;
              return (
                <div
                  key={permission.id}
                  className={`rounded border px-3 py-2 space-y-2 ${
                    isChecked ? "border-blue-400 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      checked={isChecked}
                      onChange={() => onToggle && onToggle(permission.id)}
                      disabled={disabled}
                    />
                    <span className="text-sm">
                      {permission.label ||
                        `${permission.module}:${permission.action}`}
                    </span>
                  </label>
                  {isChecked && canFilterByCity && (
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">
                        City Filter
                      </label>
                      <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={selectedCityMap?.[permission.id] ?? ""}
                        onChange={(event) =>
                          onCityChange &&
                          onCityChange(permission.id, event.target.value)
                        }
                        disabled={disabled}
                      >
                        <option value="">Select city</option>
                        <option value="*">All Cities</option>
                        {cities.map((city) => (
                          <option key={city.city_id} value={city.city_id}>
                            {city.city_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AccessMatrix;
