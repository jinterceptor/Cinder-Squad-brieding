// src/utils/adminAuth.js
// Single place for admin session + endpoints.
// Session is intentionally *sessionStorage*-only (clears on browser close).

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP   = "admin:exp";   // epoch ms

// --- Endpoint/secret (Netlify proxy -> Apps Script) ---
export function adminEndpoint() {
  // Must match your Netlify _redirects or serverless function
  // Example: /.netlify/functions/staff-proxy  or  /api/warnings
  // Set to your working proxy path:
  return "/api/warnings";
}
export function adminSecret() {
  // Do NOT hardcode secrets in the client. This is only a label passed to proxy.
  // The proxy verifies real secrets server-side.
  return "PLEX";
}

// --- Session helpers ---
export function setAdminSession({ username, displayName, role, token, ttlSec = 3600 }) {
  const now = Date.now();
  const exp = now + Math.max(60, Number(ttlSec)) * 1000;

  const user = { username, displayName: displayName || username };
  try {
    sessionStorage.setItem(LS_USER, JSON.stringify(user));
    sessionStorage.setItem(LS_ROLE, String(role || "staff"));
    sessionStorage.setItem(LS_TOKEN, String(token || ""));
    sessionStorage.setItem(LS_EXP, String(exp));
  } catch { /* storage unavailable */ }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(LS_USER);
    sessionStorage.removeItem(LS_ROLE);
    sessionStorage.removeItem(LS_TOKEN);
    sessionStorage.removeItem(LS_EXP);
  } catch {}
}

export function adminUser() {
  try {
    const raw = sessionStorage.getItem(LS_USER);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function adminRole() {
  try { return sessionStorage.getItem(LS_ROLE) || null; } catch { return null; }
}
export function adminToken() {
  try { return sessionStorage.getItem(LS_TOKEN) || ""; } catch { return ""; }
}
function notExpired() {
  try {
    const exp = Number(sessionStorage.getItem(LS_EXP));
    if (!Number.isFinite(exp)) return false;
    return Date.now() < exp;
  } catch { return false; }
}

/**
 * Strict gate. Returns true only if:
 * - user exists
 * - token exists
 * - not expired
 */
export function isAdmin() {
  try {
    const u = adminUser();
    const token = adminToken();
    if (!u || !token) return false;
    if (!notExpired()) return false;
    return true;
  } catch {
    return false;
  }
}

// Optional: login via Apps Script (used by AdminGate.vue)
export async function adminLogin(username, password) {
  // Call your GitHub->Apps Script staff API through Netlify proxy
  const body = { action: "login", username, password };
  const res = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || "Login failed");

  // Expect token, role, displayName from API
  setAdminSession({
    username,
    displayName: data.displayName || username,
    role: data.role || "staff",
    token: data.token || "ok",
    ttlSec: data.ttlSec || 3600,
  });
  return true;
}
