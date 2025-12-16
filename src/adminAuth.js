// src/utils/adminAuth.js
const STORAGE_KEY = "admin:session:v1";
const ADMIN_HASH = import.meta.env.VITE_ADMIN_PASSHASH || "";

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashSHA256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return hex(buf);
}

export function setAdminSession() {
  if (!ADMIN_HASH) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ h: ADMIN_HASH, t: Date.now() }));
  return true;
}

export function clearAdminSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAdmin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || !ADMIN_HASH) return false;
    return JSON.parse(raw).h === ADMIN_HASH;
  } catch {
    return false;
  }
}

export async function verifyPassword(plain) {
  if (!ADMIN_HASH) return false;
  return (await hashSHA256(String(plain || ""))) === ADMIN_HASH;
}
