// /src/utils/adminAuth.js
// Centralized admin auth with tiny pub/sub and session storage.
// Adds displayName hydration from a server endpoint.

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP  = "admin:exp";

const _subscribers = new Set();
function _notify(){ for (const cb of Array.from(_subscribers)) { try { cb(); } catch {} } }
export function subscribe(cb){ if (typeof cb === "function") _subscribers.add(cb); return () => _subscribers.delete(cb); }

// ---- Endpoints (adjust if your Netlify Function uses another path) ----
export function adminEndpoint(){ return "/api/warnings"; }
// Directory endpoint: a Netlify Function proxy that calls GAS with secrets server-side
export function adminDirectoryEndpoint(){ return "/api/admin"; }

// ---- Session helpers ----
function _set(k,v){ sessionStorage.setItem(k, String(v)); }
function _get(k){ return sessionStorage.getItem(k); }
function _del(k){ sessionStorage.removeItem(k); }

export function setAdminSession({ username, displayName, name, role, token, ttlSec = 3600 }) {
  const exp = Date.now() + Math.max(1, Number(ttlSec)) * 1000;
  const user = { username, displayName: displayName || name || username, name: name || displayName || "" };
  _set(LS_USER, JSON.stringify(user));
  _set(LS_ROLE, role || "staff");
  _set(LS_TOKEN, token || "");
  _set(LS_EXP, String(exp));
  _notify();
}

export function clearAdminSession(){ _del(LS_USER); _del(LS_ROLE); _del(LS_TOKEN); _del(LS_EXP); _notify(); }

// ---- Getters ----
export function adminUser(){ try { const raw=_get(LS_USER); return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function adminRole(){ return _get(LS_ROLE); }
export function adminToken(){ return _get(LS_TOKEN); }
function _notExpired(){ const exp = Number(_get(LS_EXP) || 0); return Number.isFinite(exp) && Date.now() < exp; }

export function isOfficerOrStaff(){
  const role = adminRole();
  if (!role || !_notExpired()) return false;
  const r = String(role).toLowerCase();
  return r === "staff" || r === "officer" || r === "admin";
}
export function isAdmin(){ return isOfficerOrStaff(); }

// ---- Display name hydration (maps username -> displayName via server) ----
export async function hydrateDisplayName(username) {
  if (!username) return;
  try {
    const res = await fetch(adminDirectoryEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Server function should translate action to GAS "admin.staff:list" using secrets.
      body: JSON.stringify({ action: "admin.staff:list" }),
    });
    if (!res.ok) return;
    const data = await res.json();
    // Expect: { ok: true, staff: [{username, displayName, role, ...}, ...] }
    const list = data?.staff || data?.result || [];
    const found = Array.isArray(list) ? list.find(s => String(s.username).toLowerCase() === String(username).toLowerCase()) : null;
    if (!found) return;

    const u = adminUser() || { username };
    const patched = {
      username,
      displayName: found.displayName || u.displayName || username,
      name: found.displayName || u.name || "",
    };
    _set(LS_USER, JSON.stringify(patched));
    _notify();
  } catch { /* non-fatal */ }
}

// ---- Actions ----
// Accept BOTH adminLogin({ username, password }) and adminLogin(username, password)
export async function adminLogin(arg1, arg2) {
  let username, password;
  if (typeof arg1 === "string") { username = arg1; password = arg2; }
  else if (arg1 && typeof arg1 === "object") { username = arg1.username; password = arg1.password; }
  if (!username || !password) throw new Error("Missing credentials");

  // TODO: Replace this with your real API auth (Netlify Function → GAS)
  // const res = await fetch(adminEndpoint(), {...})
  // const data = await res.json()
  // setAdminSession({ username, displayName: data.displayName, role: data.role, token: data.token, ttlSec: data.ttlSec })

  // Local fallback: temporary session; hydrate displayName from directory
  setAdminSession({ username, displayName: username, role: "staff", token: "ok", ttlSec: 3600 });
  // Try to fetch real displayName; ignore failures
  hydrateDisplayName(username);
  return true;
}

export function adminLogout(){ clearAdminSession(); return true; }
