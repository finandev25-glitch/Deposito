const API_BASE_STORAGE_KEY = "control-depositos-api-base-url";

function normalizeBaseUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.endsWith("/") ? text.slice(0, -1) : text;
}

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const runtimeBase = normalizeBaseUrl(window.__API_BASE_URL__);
    if (runtimeBase) return runtimeBase;

    try {
      const storedBase = normalizeBaseUrl(localStorage.getItem(API_BASE_STORAGE_KEY));
      if (storedBase) return storedBase;
    } catch {
      // Ignore storage access failures and fall back to build/runtime defaults.
    }
  }

  const buildBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (buildBase) return buildBase;

  return "";
}

export function buildApiUrl(path) {
  const normalizedPath = String(path || "");
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    return normalizedPath;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath.startsWith("/") ? "" : "/"}${normalizedPath}`;
}
