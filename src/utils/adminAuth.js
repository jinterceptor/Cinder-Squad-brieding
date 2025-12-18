// /src/utils/adminAuth.js
// Centralized admin auth with tiny pub/sub and session storage.

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP  = "admin:exp";

// --- pub/sub for auth state ---
const _subscribers = new Set();
function _notify() { for (const cb of Array.from(_subscribers)) { try { cb(); } catch {} } }
export function subscribe(cb) { if (typeof cb === "function") _subscribers.add(cb); return () => _subscribers.delete(cb); }

// --- endpoints (adjust if you have a backend) ---
export function adminEndpoint() { return "/api/warnings"; }
export function adminSecret() { return ""; }

// --- session utils ---
function _set(k, v){ sessionStorage.setItem(k, String(v)); }
function _get(k){ return sessionStorage.getItem(k); }
function _del(k){ sessionStorage.removeItem(k); }

export function setAdminSession({ username, displayName, role, token, ttlSec = 3600 }) {
  const exp = Date.now() + Math.max(1, Number(ttlSec)) * 1000;
  _set(LS_USER, JSON.stringify({ username, displayName: displayName || username }));
  _set(LS_ROLE, role || "staff");
  _set(LS_TOKEN, token || "");
  _set(LS_EXP, String(exp));
  _notify();
}
export function clearAdminSession() { [_del(LS_USER), _del(LS_ROLE), _del(LS_TOKEN), _del(LS_EXP)]; _notify(); }

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
  if (typeof arg1 === "string") {
    username = arg1; password = arg2;
  } else if (arg1 && typeof arg1 === "object") {
    username = arg1.username; password = arg1.password;
  }
  if (!username || !password) throw new Error("Missing credentials");

  // TODO: replace with real API if you have one:
  // const res = await fetch(adminEndpoint(), {...});
  // const data = await res.json(); validate and then:
  // setAdminSession({ username, displayName: data.displayName, role: data.role, token: data.token, ttlSec: data.ttlSec });

  // Local/dev fallback session:
  setAdminSession({ username, displayName: username, role: "staff", token: "ok", ttlSec: 3600 });
  return true;
}

export function adminLogout(){ clearAdminSession(); return true; }
