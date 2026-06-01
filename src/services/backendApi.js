import { buildApiUrl } from "./apiBase.js";

const API_PREFIX = "/api";
const SESSION_KEY = "control-depositos-auth-session";

function getStoredAccessToken() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

function prepareRequestOptions(options = {}) {
  const accessToken = getStoredAccessToken();
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers || {}),
  };

  const preparedOptions = {
    cache: "no-store",
    ...options,
    headers,
  };

  if (preparedOptions.body && typeof preparedOptions.body !== "string") {
    preparedOptions.body =
      preparedOptions.body instanceof FormData ? preparedOptions.body : JSON.stringify(preparedOptions.body);
  }

  return preparedOptions;
}

async function parseResponse(response) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      response.statusText ||
      "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(buildApiUrl(`${API_PREFIX}${path}`), prepareRequestOptions(options));

  return parseResponse(response);
}

export async function apiBlob(path, options = {}) {
  const response = await fetch(buildApiUrl(`${API_PREFIX}${path}`), prepareRequestOptions(options));

  if (!response.ok) {
    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      response.statusText ||
      "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return response.blob();
}

export async function apiGet(path) {
  return apiRequest(path, { method: "GET" });
}

export async function apiPost(path, body) {
  return apiRequest(path, { method: "POST", body });
}

export async function apiPut(path, body) {
  return apiRequest(path, { method: "PUT", body });
}

export async function apiDelete(path) {
  return apiRequest(path, { method: "DELETE" });
}
