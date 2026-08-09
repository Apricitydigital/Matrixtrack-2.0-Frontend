import axios from "axios";
import { getTokenFromCookies } from "@lib/auth";

const getBaseUrl = () => {
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SWACHH_API_URL) {
        return process.env.NEXT_PUBLIC_SWACHH_API_URL.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        return isLocal ? 'http://localhost:5000' : 'https://swachh-ranking.onrender.com';
    }
    return 'http://localhost:5000';
};

export const apiBaseUrl = getBaseUrl();

const api = axios.create({
    baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
    if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
        const separator = config.url.startsWith('/') ? '' : '/';
        config.url = `/api${separator}${config.url}`;
    }
    if (typeof window !== 'undefined') {
        // Multi-source Auth Token extraction (SSO Cookie -> localStorage user -> localStorage token)
        let token: string | undefined = getTokenFromCookies();

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

        if (!token) {
            token = localStorage.getItem("token") || localStorage.getItem("swachh_token") || undefined;
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default api;
