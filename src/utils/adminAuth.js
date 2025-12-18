// src/utils/adminAuth.js
// Centralized staff auth: session storage + tiny pub/sub for reactive updates.

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP   = "admin:exp"; // epoch ms

const isBrowser = typeof window !== "undefined";

/* ---------- Endpoint + label (client-safe) ---------- */
// Used by Discipline/Warnings API (Apps Script via Netlify proxy)
export function adminEndpoint() {
  return "/api/warnings"; // existing, already working
}
// Use the *same* proxy for staff login to avoid adding a new redirect
export function staffEndpoint() {
  return "/api/warnings";
}
// Client-visible label; real secret is enforced server-side in the proxy
export function adminSecret() {
  return "PLEX";
}

/* ---------- Session storage ---------- */
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

// Alias some code expects
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

/* ---------- Roles ---------- */
export function isOfficer() {
  const r = (adminRole() || "").toLowerCase();
  return r === "officer";
}
export function isStaff() {
  const r = (adminRole() || "").toLowerCase();
  return r === "staff";
}
/** Matches legacy imports: officers OR staff are allowed. */
export function isOfficerOrStaff() {
  return isAdmin() && (isOfficer() || isStaff());
}

/* ---------- Pub/Sub so composables can react ---------- */
const listeners = new Set();
/**
 * subscribe(fn) -> unsubscribe()
 * fn receives a snapshot: { user, role, token, exp, isAdmin }
 */
export function subscribe(fn) {
  if (typeof fn === "function") {
    listeners.add(fn);
    try { fn(sessionSnapshot()); } catch {}
  }
  return () => listeners.delete(fn);
}
// some code may import onChange
export const onChange = subscribe;

function notify() {
  const snap = sessionSnapshot();
  listeners.forEach((fn) => {
    try { fn(snap); } catch {}
  });
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

/* ---------- Login via staff API proxy (reuses /api/warnings) ---------- */
export async function adminLogin(username, password) {
  const res = await fetch(staffEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The Apps Script should route by "action"
    body: JSON.stringify({ action: "admin.staff:login", username, password }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
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
