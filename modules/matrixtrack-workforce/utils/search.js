// Keep your existing matchesSearchTerm (used by Supervisors.js)
const isPrimitive = (value) =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const collectMatches = (value, normalizedQuery) => {
  if (value === null || value === undefined) return false;
  if (isPrimitive(value))
    return String(value).toLowerCase().includes(normalizedQuery);
  if (Array.isArray(value))
    return value.some((item) => collectMatches(item, normalizedQuery));
  if (typeof value === "object")
    return Object.values(value).some((item) =>
      collectMatches(item, normalizedQuery)
    );
  return false;
};

export const matchesSearchTerm = (value, normalizedQuery) => {
  if (!normalizedQuery) return true;
  return collectMatches(value, normalizedQuery);
};