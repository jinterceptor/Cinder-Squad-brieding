// netlify/functions/gas.js
// Proxy to Google Apps Script AND enforce staff-only saves using staff.json.
// Env vars required in Netlify:
//   GAS_ENDPOINT    = https://script.google.com/.../exec
//   STAFF_JSON_URL  = https://150th-orbat.netlify.app/staff.json

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

let cachedStaff = null;
let cachedAt = 0;
const STAFF_TTL_MS = 60_000;

async function fetchStaffList() {
  if (!STAFF_JSON_URL) return [];
  const now = Date.now();
  if (cachedStaff && now - cachedAt < STAFF_TTL_MS) return cachedStaff;
  const r = await fetch(STAFF_JSON_URL, { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) throw new Error(`Fetch staff.json HTTP ${r.status}`);
  const data = await r.json();
  const arr = Array.isArray(data) ? data : [];
  const norm = arr.map((it) => {
    if (typeof it === "string") {
      if (it.includes("@")) return { email: it.toLowerCase().trim() };
      return { login: it.toLowerCase().trim() };
    }
    return {
      login: (it.login || it.github || it.user || it.username || it.name || "")
        .toLowerCase()
        .trim() || undefined,
      email: (it.email || it.mail || "").toLowerCase().trim() || undefined,
    };
  });
  cachedStaff = norm;
  cachedAt = now;
  return norm;
}

function looksLikeStaff(user, staffList) {
  if (!user) return false;
  const email =
    (user.email ||
      user?.user_metadata?.email ||
      user?.email_verified && user?.user_metadata?.full_name?.includes("@") && user?.user_metadata?.full_name ||
      "") // tolerate weird identity payloads
      .toLowerCase()
      .trim();

  // Try to derive a login-style handle if available
  const login =
    (
      user?.user_metadata?.user_name || // GitHub provider
      user?.user_metadata?.full_name || // sometimes provider puts username here
      user?.username ||
      user?.login ||
      ""
    )
      .toLowerCase()
      .trim();

  for (const s of staffList) {
    if (!s) continue;
    if (s.login && login && s.login === login) return true;
    if (s.email && email && s.email === email) return true;
  }
  return false;
}

function parseJsonBody(event) {
  try {
    if (!event.body) return {};
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

exports.handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (!GAS_ENDPOINT) {
    return {
      statusCode: 500,
      headers: corsHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ok: false, error: "Missing env GAS_ENDPOINT" }),
    };
  }

  try {
    const method = event.httpMethod.toUpperCase();
    const isBodyMethod = method === "POST" || method === "PUT" || method === "PATCH";
    const user = context.clientContext?.user || null;

    // Lightweight GET utilities for debugging
    // e.g. /.netlify/functions/gas?action=whoami
    const urlParams = new URLSearchParams(event.rawQueryString || "");
    const qAction = (urlParams.get("action") || "").toLowerCase();
    if (method === "GET" && qAction === "whoami") {
      let isStaff = false;
      try {
        const staff = await fetchStaffList();
        isStaff = looksLikeStaff(user, staff);
      } catch {
        // swallow: if staff.json missing, we still show user payload
      }
      return {
        statusCode: 200,
        headers: corsHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          ok: true,
          user: user || null,
          isStaff,
          staffJson: STAFF_JSON_URL || null,
        }),
      };
    }

    // Build proxied request
    const upstreamUrl =
      GAS_ENDPOINT +
      (method === "GET" && event.rawQueryString ? `?${event.rawQueryString}` : "");

    let bodyJson = parseJsonBody(event);
    const action = String(bodyJson.action || "").toLowerCase();

    // Gate staff-only actions
    if (method === "POST" && (action === "config:save" || action === "config:delete")) {
      if (!user) {
        return {
          statusCode: 401,
          headers: corsHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ ok: false, error: "UNAUTHORIZED: login required" }),
        };
      }
      const staff = await fetchStaffList();
      if (!looksLikeStaff(user, staff)) {
        return {
          statusCode: 403,
          headers: corsHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ ok: false, error: "FORBIDDEN: not in staff" }),
        };
      }
      // Optional: let GAS know who's saving
      bodyJson._staff = true;
      bodyJson._staffLogin =
        user?.user_metadata?.user_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "unknown";
    }

    const upstream = await fetch(upstreamUrl, {
      method,
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: isBodyMethod ? JSON.stringify(bodyJson) : undefined,
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";
    return {
      statusCode: upstream.status,
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
