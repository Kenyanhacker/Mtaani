const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const runtimeApiBaseUrl = window.KEJA_CONFIG && typeof window.KEJA_CONFIG.API_BASE_URL === "string"
  ? window.KEJA_CONFIG.API_BASE_URL.trim()
  : "";
const API_BASE_URL = runtimeApiBaseUrl || (isLocalhost
  ? "http://localhost:4000/api"
  : `${window.location.origin}/api`);
const AUTH_STORAGE_KEY = "keja.auth";

function saveSession(payload) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  localStorage.setItem("keja.token", payload.token);
}

function getSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem("keja.token");
}

async function login(email, password) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  } catch (_err) {
    throw new Error("Could not reach server. Start backend and check CORS/API URL.");
  }
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : null;
  if (!response.ok) {
    if (data && data.error) throw new Error(data.error);
    if (!isJson) {
      throw new Error(`Login API returned non-JSON response (${response.status}). Check backend deployment.`);
    }
    throw new Error("Login failed");
  }
  if (!isJson) {
    throw new Error("Login API returned non-JSON response. Check backend deployment.");
  }
  saveSession(data);
  return data;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : null;
  if (!response.ok) {
    if (data && data.error) throw new Error(data.error);
    if (!isJson) {
      throw new Error(`API returned non-JSON response (${response.status}). Check backend deployment.`);
    }
    throw new Error("Request failed");
  }
  if (!isJson) {
    throw new Error("API returned non-JSON response. Check backend deployment.");
  }
  return data;
}

async function restoreSession() {
  const session = getSession();
  if (!session || !session.token) return null;
  try {
    const data = await fetchJson(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    const nextSession = { token: session.token, user: data.user };
    saveSession(nextSession);
    return nextSession;
  } catch (_err) {
    clearSession();
    return null;
  }
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

function requireRole(roles) {
  const session = getSession();
  if (!session || !session.user || !roles.includes(session.user.role)) {
    window.location.href = "./login.html";
    return null;
  }
  return session;
}
