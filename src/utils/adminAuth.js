// src/utils/adminAuth.js
// Staff auth via Netlify Function → GAS; session-based (clears on full browser restart)

const ENDPOINT = "/.netlify/functions/gas"; // same-origin (no CORS)
const SECRET = "PLEX";

const STORAGE_KEY = "staff-auth";         // legacy (purged)
const SESSION_KEY = "staff-auth-session"; // session-only

// ---- in-memory auth snapshot
let auth = { token: null, user: null, role: null, exp: 0 };

// ---- tiny event bus (reactivity)
const listeners = new Set();
function notify() {
  for (const cb of listeners) {
    try { cb(getSnapshot()); } catch {}
  }
}
export function subscribe(cb) {
  listeners.add(cb);
  try { cb(getSnapshot()); } catch {}
  return () => listeners.delete(cb);
}
export const onChange = subscribe; // alias some code expects

function getSnapshot() {
  return {
    token: auth.token || null,
    user: auth.user ? { ...auth.user } : null,
    role: auth.role || null,
    exp: auth.exp || 0,
  };
}

// purge any old localStorage token
try { localStorage.removeItem(STORAGE_KEY); } catch {}

function isValidAuth(a) {
  if (!a || typeof a !== "object") return false;
  const r = String(a.role || "").toLowerCase();
  if (!(r === "officer" || r === "staff")) return false;
  if (!a.user || typeof a.user.username !== "string") return false;
  const t = a.token;
  if (typeof t !== "string" || !t.includes(".")) return false; // signed "<data>.<sig>"
  const now = Date.now();
  return Number.isFinite(a.exp) && a.exp > now;
}

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (isValidAuth(parsed)) auth = parsed;
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { try { sessionStorage.removeItem(SESSION_KEY); } catch {} }
}
function saveToSession() {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(auth)); } catch {}
}

// sync across tabs
try {
  window.addEventListener("storage", (ev) => {
    if (ev.key !== SESSION_KEY) return;
    loadFromSession();
    notify();
  });
} catch {}

// initial load
loadFromSession();

// ----- helpers
function isFresh() {
  return Number.isFinite(auth.exp) && auth.exp > Date.now() && !!(auth.token && auth.token.includes("."));
}

// ----- public API
export async function adminLogin(username, password) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret: SECRET, action: "login", username, password }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, error: text || `HTTP ${res.status}` }; }
  if (!data?.ok) throw new Error(data?.error || "Login failed");

  // session-only + TTL (8h)
  const now = Date.now();
  const ttlMs = 8 * 60 * 60 * 1000;

  auth = {
    token: data.token,
    user: { username: data.username, displayName: data.displayName },
    role: String(data.role || "staff").toLowerCase(),
    exp: now + ttlMs,
  };
  saveToSession();
  notify();
  return true;
}

export function adminLogout() {
  auth = { token: null, user: null, role: null, exp: 0 };
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  notify();
}

export function isOfficerOrStaff() {
  if (!isFresh()) { adminLogout(); return false; }
  const r = (auth.role || "").toLowerCase();
  return !!auth.token && (r === "officer" || r === "staff");
}
export function isAdmin() { return isOfficerOrStaff(); }

export function adminToken()    { return isFresh() ? (auth.token || "") : ""; }
export function adminUser()     { return isFresh() ? auth.user : null; }
export function adminRole()     { return isFresh() ? (auth.role || "staff") : "staff"; }
export function adminEndpoint() { return ENDPOINT; }
export function adminSecret()   { return SECRET; }

// utility: hard reset (for console debugging)
export function __purgeAuth__() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  adminLogout();
}

// debug ping
export async function adminPing() {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret: SECRET, action: "ping" }),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: text || `HTTP ${res.status}` }; }
}
