import axios from "axios";
import { getTokenFromCookies } from "./auth";

const getBaseUrl = () => {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SWACHH_API_URL) {
    return process.env.NEXT_PUBLIC_SWACHH_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    // Check if running on localhost vs production
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return isLocal ? "http://localhost:5000" : "https://swachh-ranking.onrender.com";
  }
  return "http://localhost:5000";
};

export const swachhApiBaseUrl = getBaseUrl();

const swachhApi = axios.create({
  baseURL: swachhApiBaseUrl,
});

swachhApi.interceptors.request.use((config) => {
  // Ensure route prefix formatting (/api/...)
  if (config.url && !config.url.startsWith("/api") && !config.url.startsWith("http")) {
    const separator = config.url.startsWith("/") ? "" : "/";
    config.url = `/api${separator}${config.url}`;
  }

  // Ward Ranking token must be selected before Taskforce fallbacks.
  let token: string | undefined;

  if (typeof window !== "undefined") {
    // 1. Unified Ward Ranking token
    token =
      localStorage.getItem(
        "ward_ranking_access_token"
      ) || undefined;

    // 2. Preserve existing standalone/legacy cookie flow
    if (!token) {
      token = getTokenFromCookies();
    }

    // 3. Preserve existing user snapshot fallback
    if (!token) {
      const userJson =
        localStorage.getItem("user");

      if (userJson) {
        try {
          const parsed = JSON.parse(userJson);

          if (
            parsed &&
            typeof parsed.token === "string"
          ) {
            token = parsed.token;
          }
        } catch {
          // Ignore malformed legacy user data.
        }
      }
    }

    // 4. Preserve existing legacy token keys
    if (!token) {
      token =
        localStorage.getItem("swachh_token") ||
        localStorage.getItem("token") ||
        undefined;
    }

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }
  }

  return config;
});

export default swachhApi;
