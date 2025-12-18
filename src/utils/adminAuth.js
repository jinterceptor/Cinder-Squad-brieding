// /src/utils/adminAuth.js
// Single place for admin session + endpoints.
// Session lives in sessionStorage (clears on browser close).

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP = "admin:exp"; // epoch ms

// --- Simple event hub for auth state (used by useAdminAuth.subscribe) ---
const _subscribers = new Set();
function _notify() {
  for (const cb of Array.from(_subscribers)) {
    try { cb(); } catch {}
  }
}
/** Subscribe to admin auth changes; returns an unsubscribe function. */
export function subscribe(cb) {
  if (typeof cb === "function") _subscribers.add(cb);
  return () => _subscribers.delete(cb);
}

// --- Endpoint/secret (adjust to your environment) ---
export function adminEndpoint() {
  // Must match your Netlify proxy or API path (adjust if needed)
  return "/api/warnings";
}
export function adminSecret() {
  // If you proxy a secret via Netlify function/env, read it there.
  // Here we just return a placeholder. Keep API compat with existing code.
  return "";
}

// --- Session helpers ---
function _setItem(k, v) { sessionStorage.setItem(k, String(v)); }
function _getItem(k) { return sessionStorage.getItem(k); }
function _delItem(k) { sessionStorage.removeItem(k); }

export function setAdminSession({ username, displayName, role, token, ttlSec = 3600 }) {
  const now = Date.now();
  const exp = now + Math.max(1, Number(ttlSec)) * 1000;

  _setItem(LS_USER, JSON.stringify({ username, displayName: displayName || username }));
  _setItem(LS_ROLE, role || "staff");
  _setItem(LS_TOKEN, token || "");
  _setItem(LS_EXP, String(exp));
  _notify();
}

export function clearAdminSession() {
  _delItem(LS_USER);
  _delItem(LS_ROLE);
  _delItem(LS_TOKEN);
  _delItem(LS_EXP);
  _notify();
}

// --- Read state ---
export function adminUser() {
  try {
    const raw = _getItem(LS_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function adminRole() {
  return _getItem(LS_ROLE);
}
export function adminToken() {
  return _getItem(LS_TOKEN);
}
function _notExpired() {
  const exp = Number(_getItem(LS_EXP) || 0);
  return Number.isFinite(exp) ? Date.now() < exp : false;
}

// Officer/Staff helper used by the app
export function isOfficerOrStaff() {
  const role = adminRole();
  if (!role || !_notExpired()) return false;
  const r = String(role).toLowerCase();
  return r === "staff" || r === "officer" || r === "admin";
}

// Historical alias some code may still call
export function isAdmin() {
  return isOfficerOrStaff();
}

// --- Actions ---
// Implement a simple login that sets a session; keep API compatible.
// If you have a backend, swap this for a real fetch() call.
export async function adminLogin({ username, password }) {
  // OPTIONAL: real API
  // const res = await fetch(adminEndpoint(), { method: "POST", headers: {...}, body: JSON.stringify({ username, password, secret: adminSecret() }) });
  // if (!res.ok) throw new Error(`Login failed (${res.status})`);
  // const data = await res.json();
  // if (!data?.ok) throw new Error(data?.error || "Login failed");
  // setAdminSession({ username, displayName: data.displayName || username, role: data.role || "staff", token: data.token || "ok", ttlSec: data.ttlSec || 3600 });

  if (!username || !password) throw new Error("Missing credentials");
  // Local-only fallback session:
  setAdminSession({
    username,
    displayName: username,
    role: "staff",
    token: "ok",
    ttlSec: 3600,
  });
  return true;
}

export function adminLogout() {
  clearAdminSession();
  return true;
}
