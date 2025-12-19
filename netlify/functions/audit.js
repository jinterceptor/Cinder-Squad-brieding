// src/utils/audit.js
// Small helper; never throws (so it never blocks UI flow)
export async function auditLog(entry) {
  try {
    // pull identity from sessionStorage (set during staff/officer login)
    let who = "unknown";
    let role = "member";
    try {
      const raw = sessionStorage.getItem("admin");
      if (raw) {
        const a = JSON.parse(raw);
        who = a?.displayName || a?.username || "unknown";
        role = a?.role || "officer"; // staff/officer in your system
      }
    } catch {}

    const payload = { who, role, ...entry };
    await fetch("/.netlify/functions/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // swallow errors on purpose
  }
}
