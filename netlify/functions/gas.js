// File: netlify/functions/gas.js
// Proxy to Google Apps Script AND gate "save" by staff list published via GitHub Actions.
// Required env:
//   GAS_ENDPOINT     = https://script.google.com/.../exec
//   STAFF_JSON_URL   = https://<your-site>/staff.json (published by GitHub Actions)
//
// Optional: set "public" GET to always pass-through; POST "config:save" is staff-only.

const GAS_ENDPOINT = process.env.GAS_ENDPOINT;
const STAFF_JSON_URL = process.env.STAFF_JSON_URL;

const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    ...extra,
  };
}

// simple in-memory cache for staff list
let cachedStaff = null;
let cachedAt = 0;
const STAFF_TTL_MS = 60_000; // 1 min

async function fetchStaffList() {
  if (!STAFF_JSON_URL) return [];
  const now = Date.now();
  if (cachedStaff && now - cachedAt < STAFF_TTL_MS) return cachedStaff;
  const r = await fetch(STAFF_JSON_URL, { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) throw new Error(`Fetch staff.json HTTP ${r.status}`);
  const data = await r.json();
  // normalize to { login?, email? }[]
  const arr = Array.isArray(data) ? data : [];
  const norm = arr.map(it => {
    if (typeof it === "string") {
      if (it.includes("@")) return { email: it.toLowerCase().trim() };
      return { login: it.toLowerCase().trim() };
    }
    return {
      login: (it.login || it.github || it.user || "").toLowerCase().trim() || undefined,
      email: (it.email || it.mail || "").toLowerCase().trim() || undefined,
    };
  });
  cachedStaff = norm;
  cachedAt = now;
  return norm;
}

function isStaff(user, staffList) {
  if (!user) return false;
  const login = (user.user_metadata?.full_name || user.user_metadata?.github_username || user.app_metadata?.provider === "github" && user.user_metadata?.user_name || user?.user_metadata?.name || user?.username || user?.login || "").toLowerCase().trim();
  const email = (user.email || user?.user_metadata?.email || "").toLowerCase().trim();

  for (const s of staffList) {
    if (!s) continue;
    if (s.login && login && s.login === login) return true;
    if (s.email && email && s.email === email) return true;
  }
  return false;
}

function parseBody(event) {
  try {
    if (!event.body) return {};
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

exports.handler = async (event, context) => {
  if (!GAS_ENDPOINT) {
    return {
      statusCode: 500,
      headers: corsHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ok: false, error: "Missing env GAS_ENDPOINT" }),
    };
  }

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const method = event.httpMethod.toUpperCase();
    const isBodyMethod = method === "POST" || method === "PUT" || method === "PATCH";
    const url =
      GAS_ENDPOINT +
      (method === "GET" && event.rawQueryString ? `?${event.rawQueryString}` : "");

    // Identify user (Netlify Identity). If enabled on the site, you'll get a user.
    const idUser = context.clientContext?.user || null;

    // Determine action when POST-ing JSON
    let action = "";
    let originalBody = event.body;
    let parsed = {};
    if (method === "POST") {
      parsed = parseBody(event);
      action = String(parsed.action || "").toLowerCase();
    }

    // Enforce staff for "config:save" and allow "config:get" / exports for everyone
    if (method === "POST" && (action === "config:save" || action === "config:delete")) {
      // Require staff.json and logged-in user
      if (!idUser) {
        return {
          statusCode: 401,
          headers: corsHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ ok: false, error: "UNAUTHORIZED: login required" }),
        };
      }
      const staff = await fetchStaffList();
      if (!isStaff(idUser, staff)) {
        return {
          statusCode: 403,
          headers: corsHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ ok: false, error: "FORBIDDEN: not in staff" }),
        };
      }
      // mark request as staff for GAS if it wants to know
      parsed._staff = true;
      parsed._staffLogin = idUser?.user_metadata?.user_name || idUser?.user_metadata?.full_name || idUser?.email || "unknown";
      originalBody = JSON.stringify(parsed);
    }

    // Proxy downstream
    const resp = await fetch(url, {
      method,
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        // Optionally forward identity info (GAS can read this if desired)
        "X-Staff": parsed?._staff ? "1" : "0",
        "X-Staff-Login": parsed?._staffLogin || "",
      },
      body: isBodyMethod ? originalBody : undefined,
    });

    const text = await resp.text();
    const contentType = resp.headers.get("content-type") || "application/json";

    return {
      statusCode: resp.status,
      headers: corsHeaders({ "Content-Type": contentType }),
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ok: false, error: String(e?.message || e) }),
    };
  }
};
