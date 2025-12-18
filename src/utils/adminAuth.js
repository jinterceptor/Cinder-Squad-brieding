// src/utils/adminAuth.js
// Centralized staff auth for Admin pages (proxied via Netlify function)

const ENDPOINT = "/.netlify/functions/gas"; // why: same-origin, no CORS
const SECRET = "PLEX";

const STORAGE_KEY = "staff-auth";

let auth = { token: null, user: null, role: null };
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) auth = JSON.parse(raw);
} catch {
  // why: guard against corrupted storage in old browsers
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // why: avoid hard failure if storage unavailable
  }
}

export async function adminLogin(username, password) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // simple request
    body: JSON.stringify({ secret: SECRET, action: "login", username, password }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || "Login failed");

  auth = {
    token: data.token,
    user: { username: data.username, displayName: data.displayName },
    role: data.role || "staff",
  };
  persist();
  return true;
}

export function adminLogout() {
  auth = { token: null, user: null, role: null };
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function isAdmin() {
  const r = auth.role || "";
  return !!auth.token && (r === "staff" || r === "admin" || r === "officer");
}

export function adminToken() { return auth.token || ""; }
export function adminUser() { return auth.user; }
export function adminRole() { return auth.role || "staff"; }
export function adminEndpoint() { return ENDPOINT; }
export function adminSecret() { return SECRET; }
