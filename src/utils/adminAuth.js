// src/utils/adminAuth.js
// Direct-to-Apps Script (no Netlify proxy). Ensures login body includes the shared secret.
//
// Apps Script must CORS-allow your site and handle:
//  - POST { action:"admin.staff:login", username, password, secret } -> { ok, displayName, role, token, ttlSec }
//  - GET   (discipline list) -> array
//  - POST  (discipline save) { secret, name, nameKey, notes, warnings } -> { ok:true }

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP   = "admin:exp"; // epoch ms

// Your direct /exec URL (from your env)
const GAS_URL = "https://script.google.com/macros/s/AKfycbyT8iabGBhx5H5LoKbNzZ55OIxsUv_Zw6BjtGWdu2SMg-sMOiJL5QDjXHwBweSvjh3S/exec";

// Label only; real validation happens in Apps Script
export function adminSecret() { return "PLEX"; }

// Use same endpoint for all admin ops
export function adminEndpoint() { return GAS_URL; }

/* ---------------- Session ---------------- */
export function setAdminSession({ username, displayName, role, token, ttlSec = 3600 }) {
  const exp = Date.now() + Math.max(60, Number(ttlSec)) * 1000;
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
  try { const raw = sessionStorage.getItem(LS_USER); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
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
function notExpired() { const exp = getExp(); return Number.isFinite(exp) && Date.now() < exp; }

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
export function isOfficer() { return (adminRole() || "").toLowerCase() === "officer"; }
export function isStaff()   { return (adminRole() || "").toLowerCase() === "staff"; }
export function isOfficerOrStaff() { return isAdmin() && (isOfficer() || isStaff()); }

/* ---------------- Pub/Sub ---------------- */
const listeners = new Set();
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
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("storage", (e) => {
    if ([LS_USER, LS_ROLE, LS_TOKEN, LS_EXP].includes(e.key)) notify();
  });
}
function sessionSnapshot() {
  return { user: adminUser(), role: adminRole(), token: adminToken(), exp: getExp(), isAdmin: isAdmin() };
}

/* ---------------- Login (direct to GAS + secret) ---------------- */
export async function adminLogin(username, password) {
  const body = {
    action: "admin.staff:login",
    username,
    password,
    secret: adminSecret(), // <-- include shared secret to satisfy Apps Script auth
  };

  const res = await fetch(GAS_URL, {
    method: "POST",
    // text/plain avoids preflight; Apps Script reads raw body via e.postData.contents
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });

  // Apps Script may respond 401/403 with text "Unauthorized"
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Login failed (${res.status})`);
  }

  const data = await res.json().catch(() => ({}));
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
