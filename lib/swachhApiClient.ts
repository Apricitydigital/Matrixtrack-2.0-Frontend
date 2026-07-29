import axios from "axios";
import { getTokenFromCookies } from "./auth";

const getBaseUrl = () => {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SWACHH_API_URL) {
    return process.env.NEXT_PUBLIC_SWACHH_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    // Check if running on localhost vs production
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return isLocal ? "http://localhost:4000" : "https://swachh-ranking.onrender.com";
  }
  return "http://localhost:4000";
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

  // Multi-source Auth Token extraction (Cookies -> localStorage user -> localStorage token)
  let token: string | undefined = undefined;

  if (typeof window !== "undefined") {
    // 1. Try MatrixTrack 2.0 SSO Cookie Token
    token = getTokenFromCookies();

    // 2. Fallback to localStorage user JSON
    if (!token) {
      const userJson = localStorage.getItem("user");
      if (userJson) {
        try {
          const parsed = JSON.parse(userJson);
          if (parsed.token) {
            token = parsed.token;
          }
        } catch (e) {
          // Ignore JSON parse error
        }
      }
    }

    // 3. Fallback to direct localStorage token string
    if (!token) {
      const rawToken = localStorage.getItem("token") || localStorage.getItem("swachh_token");
      if (rawToken) {
        token = rawToken;
      }
    }

    // Attach Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

export default swachhApi;
