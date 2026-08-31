const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

export function resolveMediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || url === "null" || url === "undefined") return null;

  if (/^(https?:|data:image\/|blob:)/i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;

  if (/^(uploads|media)\//i.test(url)) return `${API_BASE_URL}/${url}`;
  if (/\.(jpe?g|png|gif|webp|heic|heif|avif|svg)(\?.*)?$/i.test(url)) {
    return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
  }
  return null;
}

export function resolveMediaUrls(values: unknown[]): string[] {
  return Array.from(new Set(values.flat(Infinity).map(resolveMediaUrl).filter((url): url is string => Boolean(url))));
}
