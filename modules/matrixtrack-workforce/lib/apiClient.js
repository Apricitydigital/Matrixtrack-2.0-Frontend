import axios from "axios";
import { API_BASE_URL } from "../config";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const getUnifiedMatrixTrackToken = () => {
  try {
    const rawSession = localStorage.getItem("unified_auth_session");
    if (!rawSession) return null;
    const parsed = JSON.parse(rawSession);
    return parsed?.tokens?.matrixTrack || null;
  } catch {
    return null;
  }
};

apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("matrixtrack_access_token") ||
    getUnifiedMatrixTrackToken();
  if (token) {
    localStorage.setItem("matrixtrack_access_token", token);
    localStorage.setItem("token", token);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const parseApiError = (error, fallback = "Something went wrong.") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};
