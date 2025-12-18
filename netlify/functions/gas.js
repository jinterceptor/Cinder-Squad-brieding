// netlify/functions/gas.js
// Proxy to Google Apps Script to avoid browser CORS
// Requires Netlify env var: GAS_ENDPOINT = https://script.google.com/.../exec

const GAS_ENDPOINT = process.env.GAS_ENDPOINT;

const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*", // why: allow your site in browser
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    ...extra,
  };
}

exports.handler = async (event) => {
  if (!GAS_ENDPOINT) {
    return {
      statusCode: 500,
      headers: corsHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ok: false, error: "Missing env GAS_ENDPOINT" }),
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const method = event.httpMethod.toUpperCase();
    const isBodyMethod = method === "POST" || method === "PUT" || method === "PATCH";

    const url =
      GAS_ENDPOINT +
      (method === "GET" && event.rawQueryString ? `?${event.rawQueryString}` : "");

    const resp = await fetch(url, {
      method,
      redirect: "follow", // why: handle /exec -> googleusercontent redirect
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // why: simple request
      },
      body: isBodyMethod ? event.body : undefined,
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
