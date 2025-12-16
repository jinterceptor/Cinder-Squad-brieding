// src/utils/adminAuth.js
// Client-side admin gate with plain or hashed password options.
// Priority: VITE_ADMIN_PLAINPASS (plaintext) -> VITE_ADMIN_PASSHASH (sha256 hex) -> DEV_FALLBACK_PASSWORD (hardcoded).

const STORAGE_KEY = "admin:session:v1";

// OPTION 1: Plaintext (preferred for your simple case)
const ADMIN_PLAIN = import.meta.env.VITE_ADMIN_PLAINPASS || "";

// OPTION 2: Hashed (sha256 hex)
const ADMIN_HASH = import.meta.env.VITE_ADMIN_PASSHASH || "";

// OPTION 3: Dev fallback (change if you want a different hardcoded word)
const DEV_FALLBACK_PASSWORD = "150th"; // <- change this or use VITE_ADMIN_PLAINPASS

function getSessionMarker() {
  // Why: store a stable marker so changing the env variable invalidates old sessions
  if (ADMIN_HASH) return "hash:" + ADMIN_HASH;
  if (ADMIN_PLAIN) return "plain:" + ADMIN_PLAIN;
  return "dev:" + DEV_FALLBACK_PASSWORD;
}

export async function hashSHA256(text) {
  // Kept for compatibility if you switch to hashed mode later
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(plain) {
  const p = String(plain ?? "");
  if (ADMIN_PLAIN) return p === ADMIN_PLAIN;              // plaintext env
  if (ADMIN_HASH)  return (await hashSHA256(p)) === ADMIN_HASH; // sha256 env
  return p === DEV_FALLBACK_PASSWORD;                     // fallback hardcoded
}

export function setAdminSession() {
  if (typeof localStorage === "undefined") return false;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ k: getSessionMarker(), t: Date.now() })
  );
  return true;
}

export function isAdmin() {
  if (typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { k } = JSON.parse(raw);
    return k === getSessionMarker();
  } catch {
    return false;
  }
}

export function clearAdminSession() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
