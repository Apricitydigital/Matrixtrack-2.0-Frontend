const isBrowser = typeof window !== "undefined";

// Server-first defaults. Set REACT_APP_LOCAL_API_ORIGIN to force local, or
// REACT_APP_API_BASE_URL to a fully-qualified base if you want something custom.
const REMOTE_API_ORIGIN =
  (process.env.NEXT_PUBLIC_WORKFORCE_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_ORIGIN || "").replace(/\/+$/, "") ||
  "http://localhost:4000";
const LOCAL_API_ORIGIN =
  (process.env.NEXT_PUBLIC_WORKFORCE_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_LOCAL_API_ORIGIN || "").replace(/\/+$/, "") ||
  "http://localhost:4000";

const envBase = process.env.NEXT_PUBLIC_WORKFORCE_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const envTrimmed = envBase.trim().replace(/\/+$/, "");
const normalizedEnvBase = envTrimmed.replace(/\/api$/, "");

const chosenOrigin = normalizedEnvBase || REMOTE_API_ORIGIN;
const rawBaseUrl = `${chosenOrigin.replace(/\/api$/, "")}/api`;
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");
const apiOrigin = normalizedBaseUrl.replace(/\/api$/, "");

// Default export remains the API origin (without the /api suffix) so existing imports stay valid.
const API_ORIGIN = apiOrigin;

// Helpers exposed for components that prefer not to reimplement URL joining logic.
export const API_BASE_URL = `${apiOrigin}/api`;
export const buildApiUrl = (path = "") => {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}/api${suffix}`;
};
export const ALLOWED_CITIES_ENDPOINT = buildApiUrl("/user/allowed-cities");

// Debug helper for quick inspection
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.info("[API] origin:", API_ORIGIN, "| base:", API_BASE_URL);
}

export { API_ORIGIN };

export default API_ORIGIN;
