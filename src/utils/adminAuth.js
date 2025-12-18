// src/utils/adminAuth.js
// Centralized staff auth (proxied via Netlify function) + change events

const ENDPOINT = "/.netlify/functions/gas"; // same-origin → no CORS
const SECRET = "PLEX";
const STORAGE_KEY = "staff-auth";

let auth = { token: null, user: null, role: null };

// --- tiny event bus so Vue can react without importing Vue here ---
const listeners = new Set();
function notify() {
  for (const cb of listeners) {
    try { cb(getSnapshot()); } catch {}
  }
}
export function subscribe(cb) {
  listeners.add(cb);
  // immediate fire with current state
  try { cb(getSnapshot()); } catch {}
  return () => listeners.delete(cb);
}
// ------------------------------------------------------------------

function getSnapshot() {
  // why: return a safe, readonly-ish snapshot for subscribers
  return {
    token: auth.token || null,
    user: auth.user ? { ...auth.user } : null,
    role: auth.role || null,
  };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (isValidAuth(parsed)) auth = parsed;
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}
function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(auth)); } catch {}
}

function isValidAuth(a) {
  // why: harden against bogus state making the UI think we're logged in
  if (!a || typeof a !== "object") return false;
  const t = a.token;
  const r = (a.role || "").toLowerCase();
  // our token is HMAC "<data>.<sig>" (has a dot)
  const tokenLooksRight = typeof t === "string" && t.includes(".");
  const roleOk = r === "officer" || r === "staff";
  return tokenLooksRight && roleOk && a.user && typeof a.user.username === "string";
}

loadFromStorage();

// keep tabs in sync
try {
  window.addEventListener("storage", (ev) => {
    if (ev.key !== STORAGE_KEY) return;
    loadFromStorage();
    notify();
  });
} catch {}

export async function adminLogin(username, password) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // simple request
    body: JSON.stringify({ secret: SECRET, action: "login", username, password }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || "Login failed");

  const next = {
    token: data.token,
    user: { username: data.username, displayName: data.displayName },
    role: (data.role || "staff").toLowerCase(),
  };
  auth = next;
  saveToStorage();
  notify(); // why: wake up any listeners (sidebar, headers)
  return true;
}

export function adminLogout() {
  auth = { token: null, user: null, role: null };
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  notify();
}

// Officer/Staff only (strict)
export function isOfficerOrStaff() {
  const r = (auth.role || "").toLowerCase();
  return !!auth.token && (r === "officer" || r === "staff");
}

// Router guard uses the same
export function isAdmin() {
  return isOfficerOrStaff();
}

export function adminToken()     { return auth.token || ""; }
export function adminUser()      { return auth.user; }
export function adminRole()      { return auth.role || "staff"; }
export function adminEndpoint()  { return ENDPOINT; }
export function adminSecret()    { return SECRET; }
