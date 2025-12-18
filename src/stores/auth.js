// src/stores/auth.js
// Minimal auth utility; persists token; avoids CORS preflight by sending token in body.
const ENDPOINT = "https://script.google.com/macros/s/AKfycbx8UIMsF5BdhiSSyHjc2sn6jHe8yWZ7S996_ILEIXhNLrCm1QWgLjNOl6q_Jp_acPOJ/exec";
const SECRET = "PLEX";

const state = {
  token: null,
  user: null, // { username, displayName }
  role: null, // 'staff'
};

(function restore() {
  try {
    const raw = localStorage.getItem("staff-auth");
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.token = saved.token || null;
    state.user = saved.user || null;
    state.role = saved.role || null;
  } catch {}
})();

function save() {
  try {
    localStorage.setItem("staff-auth", JSON.stringify({
      token: state.token, user: state.user, role: state.role
    }));
  } catch {}
}

export async function loginStaff(username, password) {
  const payload = { secret: SECRET, action: "login", username, password };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // simple request
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error || "Login failed");
  state.token = data.token;
  state.user = { username: data.username, displayName: data.displayName };
  state.role = "staff";
  save();
  return true;
}

export function logout() {
  state.token = null; state.user = null; state.role = null;
  try { localStorage.removeItem("staff-auth"); } catch {}
}

export function isStaff() { return !!(state.token && state.role === "staff"); }
export function getToken() { return state.token || ""; }
export function getUser() { return state.user; }
