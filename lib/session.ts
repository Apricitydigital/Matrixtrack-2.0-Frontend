const TOKEN_STORAGE_KEY = "hms_access_token";
const USER_STORAGE_KEY = "hms_auth_user";

function persistBrowserCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_STORAGE_KEY}=${token}; path=/; samesite=lax; ${
    process.env.NODE_ENV === "production" ? "secure;" : ""
  }`;
}

function clearBrowserCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_STORAGE_KEY}=; Max-Age=0; path=/; samesite=lax`;
}

function readBrowserCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TOKEN_STORAGE_KEY}=`));
  return match ? match.slice(TOKEN_STORAGE_KEY.length + 1) : null;
}

export function persistAccessToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
  persistBrowserCookie(token);
}

export function clearPersistedAccessToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  clearBrowserCookie();
}

export function getPersistedAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) || readBrowserCookie();
}

export function persistUserSnapshot<T>(user: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function getPersistedUserSnapshot<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function clearPersistedUserSnapshot() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_STORAGE_KEY);
}
