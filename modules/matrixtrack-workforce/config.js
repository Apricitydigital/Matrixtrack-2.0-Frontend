const isBrowser = typeof window !== "undefined";

// Server-first defaults. Set REACT_APP_LOCAL_API_ORIGIN to force local, or
// REACT_APP_API_BASE_URL to a fully-qualified base if you want something custom.
const REMOTE_API_ORIGIN =
  (process.env.NEXT_PUBLIC_API_ORIGIN || process.env.REACT_APP_API_ORIGIN || "").replace(/\/+$/, "") ||
  "http://localhost:5000";
const LOCAL_API_ORIGIN =
  (process.env.NEXT_PUBLIC_LOCAL_API_ORIGIN || process.env.REACT_APP_LOCAL_API_ORIGIN || "").replace(/\/+$/, "") ||
  "http://localhost:5000";

const envBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || "";
const envTrimmed = envBase.trim().replace(/\/+$/, "");
const normalizedEnvBase = envTrimmed.replace(/\/api$/, "");

// Choose origin:
// 1) Explicit REACT_APP_API_BASE_URL if provided.
// 2) Otherwise REMOTE_API_ORIGIN by default (server-first).
// 3) If you set REACT_APP_USE_LOCAL_BACKEND=true, we use LOCAL_API_ORIGIN instead.
const useLocalOverride = process.env.REACT_APP_USE_LOCAL_BACKEND === "true";

// Respect explicit env first. Local backend is only used when requested.
const chosenOrigin = normalizedEnvBase
  ? normalizedEnvBase
  : useLocalOverride
    ? LOCAL_API_ORIGIN
    : REMOTE_API_ORIGIN;

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
