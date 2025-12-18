// /src/utils/adminAuth.js
// Uses existing Netlify Function: /.netlify/functions/gas
// Stores staff session with real displayName for the Header.

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP  = "admin:exp";

const _subs = new Set();
function _notify(){ for (const cb of Array.from(_subs)) { try { cb(); } catch {} } }
export function subscribe(cb){ if (typeof cb === "function") _subs.add(cb); return () => _subs.delete(cb); }

// Point to your existing function (no /api needed)
export function adminEndpoint() { return "/.netlify/functions/gas"; }
// Legacy export kept for AdminHome.vue imports
export function adminSecret() { return ""; }

function _set(k,v){ sessionStorage.setItem(k, String(v)); }
function _get(k){ return sessionStorage.getItem(k); }
function _del(k){ sessionStorage.removeItem(k); }

export function setAdminSession({ username, displayName, role, token, ttlSec = 3600 }) {
  const exp = Date.now() + Math.max(1, Number(ttlSec)) * 1000;
  const user = { username: username || "", displayName: displayName || "" };
  _set(LS_USER, JSON.stringify(user));
  _set(LS_ROLE, role || "staff");
  _set(LS_TOKEN, token || "");
  _set(LS_EXP, String(exp));
  _notify();
}

export function clearAdminSession(){ _del(LS_USER); _del(LS_ROLE); _del(LS_TOKEN); _del(LS_EXP); _notify(); }

export function adminUser(){ try { const raw=_get(LS_USER); return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function adminRole(){ return _get(LS_ROLE); }
export function adminToken(){ return _get(LS_TOKEN); }
function _notExpired(){ const exp = Number(_get(LS_EXP) || 0); return Number.isFinite(exp) && Date.now() < exp; }
export function isOfficerOrStaff(){
  const role = adminRole(); if (!role || !_notExpired()) return false;
  const r = String(role).toLowerCase();
  return r === "staff" || r === "officer" || r === "admin";
}
export function isAdmin(){ return isOfficerOrStaff(); }

// Accepts adminLogin({ username, password }) or adminLogin(username, password)
export async function adminLogin(arg1, arg2) {
  let username, password;
  if (typeof arg1 === "string") { username = arg1; password = arg2; }
  else if (arg1 && typeof arg1 === "object") { username = arg1.username; password = arg1.password; }
  if (!username || !password) throw new Error("Missing credentials");

  // IMPORTANT: text/plain to match your gas.js proxy
  const res = await fetch(adminEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "admin.login", username, password }),
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Expect GAS to return either { ok:true, user:{...} } or a flat object
  const user = data?.user ?? data ?? {};
  // ONLY use displayName (no username fallback)
  const displayName =
    user.displayName ??
    user.DisplayName ??
    user.name ??
    user.fullName ??
    "";

  setAdminSession({
    username,
    displayName,
    role: user.role ?? "staff",
    token: user.token ?? "ok",
    ttlSec: user.ttlSec ?? 3600,
  });

  return true;
}

export function adminLogout(){ clearAdminSession(); return true; }
