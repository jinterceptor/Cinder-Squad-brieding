// src/utils/adminAuth.js
// Centralized staff auth with session storage + tiny pub/sub.
// Auto-fallback: try /api/staff first; on 404, use /api/warnings.

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP   = "admin:exp"; // epoch ms

const isBrowser = typeof window !== "undefined";

/* ---------------- Endpoints ---------------- */
const WARNINGS_EP = "/api/warnings"; // already working in your deploy
const STAFF_EP_PRIMARY = "/api/staff"; // may be missing; we fall back
let chosenStaffEP = null; // memoized at runtime after first call

export function adminEndpoint() {
  // Used by discipline/notes read/write
  return WARNINGS_EP;
}

export function adminSecret() {
  // Client-visible label; real secret is verified by your proxy/Apps Script
  return "PLEX";
}

/**
 * Resolve staff endpoint once:
 * 1) POST a tiny probe to /api/staff
 * 2) If 404 (or network error), use /api/warnings instead
 */
async function resolveStaffEndpoint() {
  if (chosenStaffEP) return chosenStaffEP;

  // Minimal body to avoid preflight (text/plain) & keep Apps Script happy.
  const probeBody = JSON.stringify({ action: "admin.staff:ping" });

  try {
    const res = await fetch(STAFF_EP_PRIMARY, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: probeBody,
    });
    if (res.status === 404) throw new Error("staff 404");
    // If it responds (200/400/etc.) we assume the route exists.
    chosenStaffEP = STAFF_EP_PRIMARY;
  } catch {
    chosenStaffEP = WARNINGS_EP;
  }
  return chosenStaffEP;
}

/* Exposed for any callers that want to know where we’ll POST */
export async function staffEndpoint() {
  return resolveStaffEndpoint();
}

/* ---------------- Session storage ---------------- */
export function setAdminSession({ username, displayName, role, token, ttlSec = 3600 }) {
  const now = Date.now();
  const exp = now + Math.max(60, Number(ttlSec)) * 1000;
  const user = { username, displayName: displayName || username };

  try {
    sessionStorage.setItem(LS_USER, JSON.stringify(user));
    sessionStorage.setItem(LS_ROLE, String(role || "staff"));
    sessionStorage.setItem(LS_TOKEN, String(token || ""));
    sessionStorage.setItem(LS_EXP, String(exp));
  } catch {}
  notify();
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(LS_USER);
    sessionStorage.removeItem(LS_ROLE);
    sessionStorage.removeItem(LS_TOKEN);
    sessionStorage.removeItem(LS_EXP);
  } catch {}
  notify();
}

export function adminLogout() { clearAdminSession(); }

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
function getExp() {
  try { return Number(sessionStorage.getItem(LS_EXP)); } catch { return NaN; }
}
function notExpired() {
  const exp = getExp();
  return Number.isFinite(exp) && Date.now() < exp;
}

/** Strict check: must have user + token + not expired. */
export function isAdmin() {
  try {
    const u = adminUser();
    const t = adminToken();
    if (!u || !t) return false;
    if (!notExpired()) return false;
    return true;
  } catch { return false; }
}

/* ---------------- Roles ---------------- */
export function isOfficer() {
  const r = (adminRole() || "").toLowerCase();
  return r === "officer";
}
export function isStaff() {
  const r = (adminRole() || "").toLowerCase();
  return r === "staff";
}
export function isOfficerOrStaff() {
  return isAdmin() && (isOfficer() || isStaff());
}

/* ---------------- Pub/Sub (reactivity) ---------------- */
const listeners = new Set();
/** subscribe(fn) -> unsubscribe() */
export function subscribe(fn) {
  if (typeof fn === "function") {
    listeners.add(fn);
    try { fn(sessionSnapshot()); } catch {}
  }
  return () => listeners.delete(fn);
}
export const onChange = subscribe;

function notify() {
  const snap = sessionSnapshot();
  listeners.forEach((fn) => { try { fn(snap); } catch {} });
}
if (isBrowser && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (e) => {
    if ([LS_USER, LS_ROLE, LS_TOKEN, LS_EXP].includes(e.key)) notify();
  });
}
function sessionSnapshot() {
  return {
    user: adminUser(),
    role: adminRole(),
    token: adminToken(),
    exp: getExp(),
    isAdmin: isAdmin(),
  };
}

/* ---------------- Login (auto-fallback endpoint) ---------------- */
export async function adminLogin(username, password) {
  const ep = await resolveStaffEndpoint();

  // Use text/plain to avoid CORS preflight; Apps Script reads raw body.
  const res = await fetch(ep, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "admin.staff:login", username, password }),
  });

  if (!res.ok) throw new Error(`Login failed (${res.status})`);

  // Response is JSON from Apps Script proxy
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || "Login failed");

  setAdminSession({
    username,
    displayName: data.displayName || username,
    role: data.role || "staff",
    token: data.token || "ok",
    ttlSec: data.ttlSec || 3600,
  });

  return true;
}
