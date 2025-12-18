// /src/utils/adminAuth.js
// Uses your existing Netlify Function: /.netlify/functions/gas
// Robustly extracts displayName; preserves it if backend doesn't send one.

const LS_USER = "admin:user";
const LS_ROLE = "admin:role";
const LS_TOKEN = "admin:token";
const LS_EXP  = "admin:exp";

const _subs = new Set();
function _notify(){ for (const cb of Array.from(_subs)) { try { cb(); } catch {} } }
export function subscribe(cb){ if (typeof cb === "function") _subs.add(cb); return () => _subs.delete(cb); }

// Point to your existing function proxy to GAS
export function adminEndpoint() { return "/.netlify/functions/gas"; }
export function adminSecret() { return ""; } // legacy import compatibility

function _set(k,v){ sessionStorage.setItem(k, String(v)); }
function _get(k){ return sessionStorage.getItem(k); }
function _del(k){ sessionStorage.removeItem(k); }

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

function _writeSession({ username, displayName, role, token, ttlSec = 3600 }) {
  const prev = adminUser() || {};
  // preserve previous displayName if new one is empty
  const finalDisplay = displayName || prev.displayName || "";
  const exp = Date.now() + Math.max(1, Number(ttlSec)) * 1000;

  const user = {
    username: username || prev.username || "",
    displayName: finalDisplay,  // Header shows ONLY this
  };
  _set(LS_USER, JSON.stringify(user));
  _set(LS_ROLE, role || adminRole() || "staff");
  _set(LS_TOKEN, token || adminToken() || "");
  _set(LS_EXP, String(exp));
  _notify();
}

export function clearAdminSession(){ _del(LS_USER); _del(LS_ROLE); _del(LS_TOKEN); _del(LS_EXP); _notify(); }

/** Find a display name in many possible server response shapes (case-insensitive). */
function pickDisplayName(obj) {
  if (!obj || typeof obj !== "object") return "";
  // direct fields (various casings)
  for (const k of ["displayName","DisplayName","name","fullName","display","RealName"]) {
    const v = obj[k]; if (v && typeof v === "string" && v.trim()) return v.trim();
  }
  // common nests
  const nests = [obj.user, obj.result, obj.account, obj.profile, obj.data];
  for (const n of nests) {
    const v = pickDisplayName(n); if (v) return v;
  }
  // staff list shape: { staff:[{username, displayName,...}] }
  if (Array.isArray(obj.staff) && obj.staff.length) {
    // cannot know which is current user here—handled in server for login normally
    const hit = obj.staff.find(s => pickDisplayName(s));
    if (hit) return pickDisplayName(hit);
  }
  return "";
}

// Accepts adminLogin({ username, password }) or adminLogin(username, password)
export async function adminLogin(arg1, arg2) {
  let username, password;
  if (typeof arg1 === "string") { username = arg1; password = arg2; }
  else if (arg1 && typeof arg1 === "object") { username = arg1.username; password = arg1.password; }
  if (!username || !password) throw new Error("Missing credentials");

  const res = await fetch(adminEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // matches your gas.js proxy
    body: JSON.stringify({ action: "admin.login", username, password }),
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // GAS often returns text/plain JSON
  const data = await res.json();

  const displayName =
    pickDisplayName(data) ||
    pickDisplayName(data?.user) ||
    pickDisplayName(data?.result) ||
    ""; // no username fallback (per your request)

  const role  = (data?.user?.role || data?.role || "staff");
  const token = (data?.user?.token || data?.token || "ok");
  const ttl   = (data?.user?.ttlSec || data?.ttlSec || 3600);

  _writeSession({ username, displayName, role, token, ttlSec: ttl });
  return true;
}

export function adminLogout(){ clearAdminSession(); return true; }
