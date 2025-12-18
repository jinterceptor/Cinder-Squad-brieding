<template>
  <header class="hdr-root">
    <!-- Auth status (LEFT, no tile bg) -->
    <div class="auth-status">
      <div class="auth-top">
        <span class="auth-badge" :class="roleClass">
          <span class="auth-icon" aria-hidden="true"></span>
          <span v-if="authed">{{ roleLabel }}</span>
          <span v-else>GUEST</span>
        </span>

        <div class="auth-ident">
          <!-- rank insignia + rank text BEFORE the name -->
          <img
            v-if="rankIcon"
            :src="rankIcon"
            alt=""
            class="rank-insignia"
            :title="rankShort"
          />
          <span v-if="authed && rankShort" class="rank-pill">{{ rankShort }}</span>

          <span class="auth-name" v-if="authed">{{ displayName }}</span>
          <span class="auth-name muted" v-else>NOT SIGNED IN</span>
        </div>
      </div>

      <div class="auth-actions">
        <router-link
          v-if="!authed"
          class="auth-btn"
          :to="{ path: '/admin/login', query: { redirect: '/admin' } }"
        >Sign in</router-link>
        <button v-else class="auth-btn danger" @click="doLogout">Logout</button>
      </div>
    </div>

    <div class="title clipped-x-large-forward">
      <img class="logo" src="/faction-logos/Broadsword111.png" />

      <div class="title-container">
        <!-- PRIMARY TITLE (FIXED) -->
        <div id="title-first-line" class="title-row">
          <span id="title-header">UNSC TACNET</span>
        </div>

        <!-- SECONDARY LINE (CONFIG-DRIVEN) -->
        <div class="title-row">
          <span id="subtitle-header">{{ header.subheaderTitle }}</span>
          <span id="subtitle-subheader">// {{ header.subheaderSubtitle }}</span>
        </div>
      </div>
    </div>

    <div class="rhombus"></div>

    <div class="planet-location-container">
      <video autoplay muted loop width="90" height="90">
        <source :src="`${planetPath}`" type="video/webm" />
      </video>

      <div class="location-info">
        <!-- ROW 1 -->
        <div class="location-row grid">
          <div id="year">
            <h4>Year</h4>
            <span class="subtitle">{{ header.year }}</span>
          </div>

          <div id="status" class="span-2">
            <h4>Status</h4>
            <span class="subtitle">{{ header.status }}</span>
          </div>
        </div>

        <!-- ROW 2 -->
        <div class="location-row grid">
          <div id="AO">
            <h4>AO</h4>
            <span class="subtitle">{{ header.AO }}</span>
          </div>

          <div id="planet">
            <h4>Planet</h4>
            <span class="subtitle">{{ header.planet }}</span>
          </div>

          <div id="system">
            <h4>System</h4>
            <span class="subtitle">{{ header.system }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import { subscribe, adminUser, adminRole, isAdmin, adminLogout } from "@/utils/adminAuth";

/**
 * RefData CSV (published). Make sure the gid points to RefData.
 * Uses CSV so no OAuth is needed.
 */
const REF_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=107253735&single=true&output=csv";

let _refCache = null;
async function fetchRefDataOnce() {
  if (_refCache) return _refCache;
  const res = await fetch(REF_CSV, { mode: "cors" });
  const text = await res.text();
  _refCache = parseCsv(text);
  return _refCache;
}

/* Minimal CSV parser (quotes, commas, CRLF) */
function parseCsv(text) {
  const rows = [];
  let cur = [], val = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { val += '"'; i++; }
      else if (c === '"') inQ = false;
      else { val += c; }
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(val); val = ""; }
      else if (c === '\n' || c === '\r') {
        if (val !== "" || cur.length) { cur.push(val); rows.push(cur); cur = []; val = ""; }
        if (c === '\r' && n === '\n') i++;
      } else { val += c; }
    }
  }
  if (val !== "" || cur.length) { cur.push(val); rows.push(cur); }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map(h => (h || "").trim());
  const dataRows = rows.slice(1).filter(r => r.some(x => (x || "").trim().length));
  return { headers, rows: dataRows };
}

/* Roster-style normalization: strip punctuation, collapse spaces, UPPERCASE */
function nameKey(name) {
  return String(name || "")
    .replace(/["'.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function findCol(headers, names) {
  const ix = headers.findIndex(h => names.some(n => h.toLowerCase() === n.toLowerCase()));
  return ix >= 0 ? ix : -1;
}

/* Insignia mapper. Update paths to match your assets folder. */
function rankIconFor(rank) {
  if (!rank) return "";
  const key = String(rank).replace(/\s+/g, "").toUpperCase();

  // Common abbreviations seen in your sheets (extend as needed)
  const MAP = {
    PVT: "/insignia/ranks/pvt.png",
    PFC: "/insignia/ranks/pfc.png",
    SPC: "/insignia/ranks/spc.png",
    SPC2: "/insignia/ranks/spc2.png",
    SPC3: "/insignia/ranks/spc3.png",
    SPC4: "/insignia/ranks/spc4.png",
    LCPL: "/insignia/ranks/lcpl.png",
    CPL: "/insignia/ranks/cpl.png",
    SGT: "/insignia/ranks/sgt.png",
    GYSGT: "/insignia/ranks/gysgt.png",
    WO: "/insignia/ranks/wo.png",
    CWO2: "/insignia/ranks/cwo2.png",
    CWO3: "/insignia/ranks/cwo3.png",
    CWO4: "/insignia/ranks/cwo4.png",
    "2NDLT": "/insignia/ranks/2ndlt.png",
    "1STLT": "/insignia/ranks/1stlt.png",
    CAPT: "/insignia/ranks/capt.png",
    MAJ: "/insignia/ranks/maj.png",
    HM3: "/insignia/ranks/hm3.png",
    HM2: "/insignia/ranks/hm2.png",
    HN: "/insignia/ranks/hn.png",
  };

  // Try direct, then strip non-letters/numbers (handles "CWO3 (30)" etc.)
  return MAP[key] || MAP[key.replace(/[^A-Z0-9]/g, "")] || "";
}

export default {
  name: "Header",
  props: {
    planetPath: { type: String, required: true },
    header: { type: Object, required: true },
  },
  data() {
    return {
      authed: false,
      displayName: "",
      role: "staff",
      rankShort: "",
      rankIcon: "",
      unsub: null,
    };
  },
  computed: {
    roleLabel() {
      const r = String(this.role || "").toLowerCase();
      return r === "officer" ? "OFFICER" : "STAFF";
    },
    roleClass() {
      const r = String(this.role || "").toLowerCase();
      if (!this.authed) return "badge-guest";
      return r === "officer" ? "badge-officer" : "badge-staff";
    },
  },
  mounted() {
    const push = async () => {
      this.authed = !!isAdmin();
      const u = adminUser();
      this.displayName = u?.displayName || u?.username || "";
      this.role = adminRole() || "staff";
      this.rankShort = "";
      this.rankIcon = "";
      if (this.authed && this.displayName) {
        try {
          await this.resolveRank(this.displayName);
        } catch {}
      }
    };
    this.unsub = subscribe(push);
    push();
  },
  beforeUnmount() {
    if (typeof this.unsub === "function") this.unsub();
  },
  methods: {
    async resolveRank(displayName) {
      const { headers, rows } = await fetchRefDataOnce();

      const colTroop = findCol(headers, ["Troop List","Troop","Name","TroopList"]);
      const colRank  = findCol(headers, ["Rank","Current Rank","Rank (abbr)","Rank Abbr"]);
      if (colTroop === -1 || colRank === -1) return;

      const target = nameKey(displayName);
      const hit = rows.find(r => nameKey(r[colTroop] || "") === target);
      if (!hit) return;

      const rk = String(hit[colRank] || "").trim();
      if (rk) {
        this.rankShort = rk;
        this.rankIcon = rankIconFor(rk);
      }
    },
    doLogout() {
      adminLogout();
      this.$router.replace("/status");
    },
  },
};
</script>

<style scoped>
.hdr-root { position: relative; }

/* existing header layout */
.location-row.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 1.2rem;
  align-items: end;
}
.span-2 { grid-column: span 2; }
.location-row h4 { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.7rem; }
.subtitle { font-size: 0.85rem; letter-spacing: 0.08em; }

/* --------- Auth status (LEFT, no background tile) --------- */
.auth-status{
  --auth-left: 750px; /* your chosen spot */
  position: absolute;
  top: 4px;          /* slightly higher */
  left: var(--auth-left);
  display: grid;
  gap: .4rem;
  min-width: 260px;
  padding: 0;
}

.auth-top{
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .5rem;
  align-items: center;
}

.auth-ident{
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  min-width: 0;
}

/* insignia image next to rank */
.rank-insignia{
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: drop-shadow(0 0 1px rgba(0,0,0,.4));
}

/* small rank pill before name */
.rank-pill{
  border: 1px solid rgba(120,200,255,.7);
  color: #e6f3ff;
  background: rgba(6,24,40,.55);
  border-radius: 999px;
  padding: .08rem .45rem;
  font-size: .74rem;
  letter-spacing: .08em;
  white-space: nowrap;
}

.auth-name{
  min-width: 0;
  color: #E6F3FF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .92rem;
  letter-spacing: .04em;
}
.muted{ color:#9ec5e6; }

/* Badge: Officer = cool cyan; Staff = darker olive */
.auth-badge{
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  min-width: 110px;
  justify-content: center;
  text-align: center;
  font-size: .78rem;
  padding: .16rem .65rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: #E6F3FF;
  border: 1px solid rgba(150,190,230,.5);
  background: rgba(0,18,36,.42);
}
.auth-icon{
  width: 12px; height: 12px; border-radius: 2px;
  background:
    linear-gradient(135deg, transparent 40%, rgba(255,255,255,.18) 40% 52%, transparent 52%),
    linear-gradient(315deg, transparent 40%, rgba(255,255,255,.18) 40% 52%, transparent 52%);
  opacity: .9;
}
.badge-officer{ border-color: rgba(120,200,255,.8); background: rgba(6,24,40,.55); }
.badge-staff  { border-color: rgba(88,128,88,.85);  background: linear-gradient(180deg, rgba(10,24,12,.72), rgba(10,24,12,.5)); }
.badge-guest  { border-color: rgba(150,190,230,.5); }

.auth-actions{ display: flex; gap: .45rem; }
.auth-btn{
  flex: 1 1 auto;
  text-align: center;
  border: 1px solid rgba(120,255,170,.7);
  background: rgba(0,30,20,.25);
  color: #e6fff5;
  border-radius: 6px;
  padding: .32rem .55rem;
  cursor: pointer;
  font-size: .88rem;
  letter-spacing: .04em;
}
.auth-btn:hover{ filter: brightness(1.06); }
.auth-btn.danger{
  border-color: rgba(255,130,120,.8);
  background: rgba(30,0,0,.28);
  color: #ffe9e6;
}

/* Mobile: stack under the title */
@media (max-width: 1100px){
  .auth-status{ position: static; margin: .5rem 0 .25rem auto; }
}
</style>
