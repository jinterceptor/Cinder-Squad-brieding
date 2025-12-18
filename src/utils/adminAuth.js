// /src/utils/adminAuth.js
// Centralized admin auth with pub/sub, session storage, real displayName, and legacy adminSecret().

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP  = "admin:exp";

// --- simple pub/sub ---
const _subs = new Set();
function _notify(){ for (const cb of Array.from(_subs)) { try { cb(); } catch {} } }
export function subscribe(cb){ if (typeof cb === "function") _subs.add(cb); return () => _subs.delete(cb); }

// --- API endpoints (adjust to your setup) ---
export function adminEndpoint() { return "/api/admin"; }
/** Legacy export used by AdminHome.vue; keep for compatibility. */
export function adminSecret() { return ""; }

// --- storage helpers ---
function _set(k,v){ sessionStorage.setItem(k, String(v)); }
function _get(k){ return sessionStorage.getItem(k); }
function _del(k){ sessionStorage.removeItem(k); }

export function setAdminSession({ username, displayName, name, role, token, ttlSec = 3600 }) {
  const exp = Date.now() + Math.max(1, Number(ttlSec)) * 1000;
  const user = {
    username: username || "",
    displayName: displayName || name || username || "",
    name: name || displayName || "",
  };
  _set(LS_USER, JSON.stringify(user));
  _set(LS_ROLE, role || "staff");
  _set(LS_TOKEN, token || "");
  _set(LS_EXP, String(exp));
  _notify();
}

export function clearAdminSession(){ _del(LS_USER); _del(LS_ROLE); _del(LS_TOKEN); _del(LS_EXP); _notify(); }

// --- getters ---
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

// --- actions ---
// Accept BOTH adminLogin({ username, password }) and adminLogin(username, password)
export async function adminLogin(arg1, arg2) {
  let username, password;
  if (typeof arg1 === "string") { username = arg1; password = arg2; }
  else if (arg1 && typeof arg1 === "object") { username = arg1.username; password = arg1.password; }

  if (!username || !password) throw new Error("Missing credentials");

  // Call your backend to verify and return the real displayName
  try {
    const res = await fetch(adminEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "admin.login", username, password }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.ok !== true || !data?.user) throw new Error(data?.error || "Login failed");

    const { displayName, role = "staff", token = "ok", ttlSec = 3600 } = data.user;
    setAdminSession({ username, displayName, name: displayName, role, token, ttlSec });
    return true;
  } catch {
    // Fallback keeps you logged in but shows username if server not wired
    setAdminSession({ username, displayName: username, name: "", role: "staff", token: "ok", ttlSec: 3600 });
    return true;
  }
}

export function adminLogout(){ clearAdminSession(); return true; }
