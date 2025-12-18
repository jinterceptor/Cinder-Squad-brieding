// src/utils/adminAuth.js
const ENDPOINT = "https://script.google.com/macros/s/AKfycbx8UIMsF5BdhiSSyHjc2sn6jHe8yWZ7S996_ILEIXhNLrCm1QWgLjNOl6q_Jp_acPOJ/exec";
const SECRET = "PLEX";

const STORAGE_KEY = "staff-auth";

let auth = { token: null, user: null, role: null };
try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) auth = JSON.parse(raw); } catch {}

function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(auth)); } catch {} }

export async function adminLogin(username, password) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret: SECRET, action: "login", username, password }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || "Login failed");
  auth = {
    token: data.token,
    user: { username: data.username, displayName: data.displayName },
    role: data.role || "staff",
  };
  save();
  return true;
}

export function adminLogout() {
  auth = { token: null, user: null, role: null };
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function isAdmin() {
  return !!(auth.token && (auth.role === "staff" || auth.role === "admin" || auth.role === "officer"));
}
export function adminToken() { return auth.token || ""; }
export function adminUser() { return auth.user; }
export function adminRole() { return auth.role || "staff"; }
