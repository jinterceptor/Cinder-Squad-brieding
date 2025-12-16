<template>
  <!-- FAKE LOGIN OVERLAY (CLICK ANYWHERE) -->
  <div
    v-if="showLogin"
    class="login-overlay"
    :class="{ fading: isFading }"
    @click="authorize"
  >
    <div class="login-bg">
      <img
        class="login-logo"
        src="/faction-logos/FUD_UNSC_Logo.png"
        alt="UNSC Logo"
      />
    </div>

    <div class="login-text">
      <div class="login-lore">
        UNITED NATIONS SPACE COMMAND<br />
        SECURE MILITARY NETWORK
      </div>

      <div class="login-warning">
        UNAUTHORIZED ACCESS IS PUNISHABLE UNDER THE<br />
        UNIFIED MILITARY CODE
      </div>

      <div class="login-prompt">CLICK TO LOGIN</div>
    </div>
  </div>

  <!-- NORMAL APP UI (DELAY MOUNT UNTIL AFTER LOGIN) -->
  <template v-if="!showLogin">
    <div class="page-wrapper">
      <Header :planet-path="planetPath" :class="{ animate: animate }" :header="header" />
      <Sidebar :animate="animate" :class="{ animate: animate }" />
    </div>

    <div id="router-view-container">
      <!-- HUD transition on ALL route changes -->
      <transition name="hud" mode="out-in">
        <router-view
          :key="$route.fullPath"
          :animate="animate"
          :initial-slug="initialSlug"
          :missions="missions"
          :events="events"
          :members="members"
          :orbat="orbat"
          :reserves="reserves"
        />
      </transition>
    </div>
  </template>

  <!-- Startup tone: must be triggered by user interaction -->
  <audio ref="startupAudio" preload="auto">
    <source src="/startup.ogg" type="audio/ogg" />
  </audio>
</template>

<script>
import Header from "./components/layout/Header.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import Config from "@/assets/info/general-config.json";
import Papa from "papaparse";

export default {
  name: "App",
  components: { Header, Sidebar },

  data() {
    return {
      showLogin: true,
      isFading: false,

      animate: Config.animate,
      initialSlug: Config.initialSlug,
      planetPath: Config.planetPath,
      header: Config.header,

      missions: [],
      events: [],

      members: [],   // Personnel roster (MembersMaster)
      orbat: [],     // ORBAT generated from RefData membership + slotting
      reserves: [],  // Optional later (kept for compatibility)
    };
  },

  created() {
    // Theme: make the browser title read more UNSC-friendly
    this.setTitleFavicon(Config.defaultTitle + " UNSC BRIEFING", Config.icon);

    // Preload content bundles
    this.importMissions(
      import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" })
    );
    this.importEvents(
      import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" })
    );

    // CSV sources
    const membersUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=1185035639&single=true&output=csv";

    const refDataUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=107253735&single=true&output=csv";

    const opsUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=1115158828&single=true&output=csv";

    // Load members → build ORBAT → then attempt ops (non-blocking)
    this.loadMembersCSV(membersUrl)
      .then(() => this.loadRefDataCSV(refDataUrl))
      .then(() => {
        // Fire-and-forget ops loading (never blocks UI)
        this.loadOpsCSV(opsUrl).catch((err) => {
          console.warn("Ops CSV failed to load, continuing without ops data.", err);
        });
      });
  },

  mounted() {
    // Don't push routes here — wait until user interaction (Authorize).
  },

  methods: {
    /* ===============================================================
     *  LOGIN / STARTUP
     * =============================================================== */
    authorize() {
      if (this.isFading) return;
      this.isFading = true;

      const a = this.$refs.startupAudio;
      if (a && typeof a.play === "function") {
        a.currentTime = 0;
        a.play().catch(() => {});
      }

      setTimeout(() => {
        this.showLogin = false;
        this.isFading = false;

        if (this.$router?.currentRoute?.value?.path !== "/status") {
          this.$router.push("/status");
        }
      }, 800);
    },

    /* ===============================================================
     *  STRING NORMALIZATION (shared)
     * =============================================================== */
    normalize(str) {
      return String(str || "")
        .replace(/"/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    },

    /* ===============================================================
     *  TITLE / FAVICON
     * =============================================================== */
    setTitleFavicon(title, favicon) {
      document.title = title;
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = favicon;
      document.head.appendChild(link);
    },

    /* ===============================================================
     *  OPS / ATTENDANCE CSV
     *  - SAFE: never blocks rendering
     *  - Matches your Ops sheet: Col A = name label, Col C = ops
     * =============================================================== */
    loadOpsCSV(opsUrl) {
      return new Promise((resolve) => {
        Papa.parse(opsUrl, {
          download: true,
          skipEmptyLines: true,
          header: false,
          complete: (results) => {
            const rows = (results.data || []).slice(1); // skip header row
            const opsMap = {};

            rows.forEach((row) => {
              const rawName = String(row[0] || "").trim(); // col A
              const rawOps = String(row[2] || "").trim();  // col C
              if (!rawName) return;

              const ops = Number(rawOps);
              if (Number.isNaN(ops)) return;

              // Extract quoted callsign if present:  PFC "M. Jinter"  ->  M. Jinter
              const quoted = rawName.match(/"([^"]+)"/);
              const nameCore = quoted ? quoted[1] : rawName;

              const key = String(nameCore)
                .replace(/"/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

              opsMap[key] = ops;
            });

            // Merge onto members by normalized name (member.name like: M. Jinter)
            (this.members || []).forEach((m) => {
              const key = String(m.name || "")
                .replace(/"/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

              m.opsAttended = opsMap[key] ?? null;
            });

            console.log("Ops attendance merged onto members.");
            resolve();
          },
          error: (err) => {
            console.warn("Ops CSV failed to load (non-fatal)", err);
            resolve(); // never block app
          },
        });
      });
    },

    /* ===============================================================
     *  OPS / PROMOTION SYSTEM
     * =============================================================== */
    rankKey(rank) {
      return String(rank || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
    },

    promotionLadderFor(rank) {
      const r = this.rankKey(rank);

      // thresholds represent the *next* milestone for the current rank
      const ladders = {
        // Enlisted / Infantry
        PVT:  { nextAt: 2,  nextRank: "PFC" },
        PFC:  { nextAt: 10, nextRank: "SPC" },
        SPC:  { nextAt: 20, nextRank: "SPC2" },
        SPC2: { nextAt: 30, nextRank: "SPC3" },
        SPC3: { nextAt: 40, nextRank: "SPC4" },
        SPC4: { nextAt: 50, nextRank: null },

        // Corpsman ladder
        HA:   { nextAt: 2,  nextRank: "HN" },
        HN:   { nextAt: 10, nextRank: "HM3" },
        HM3:  { nextAt: 20, nextRank: "HM2" },
        HM2:  { nextAt: 30, nextRank: null },

        // Warrant ladder
        CWO2: { nextAt: 10, nextRank: "CWO3" },
        CWO3: { nextAt: 20, nextRank: "CWO4" },
        CWO4: { nextAt: 30, nextRank: null },
      };

      return ladders[r] || null;
    },

    opsToNextPromotion(member) {
      const ops = Number(member?.opsAttended);
      if (!Number.isFinite(ops)) return null;

      const ladder = this.promotionLadderFor(member?.rank);
      if (!ladder || !ladder.nextAt) return null;

      return Math.max(0, ladder.nextAt - ops);
    },

    nextPromotionRank(member) {
      const ladder = this.promotionLadderFor(member?.rank);
      return ladder?.nextRank || null;
    },

    /* ===============================================================
     *  UNSC ID SCRAMBLER (#####-#####-XX)
     * =============================================================== */
    makeInitials(name) {
      const parts = String(name || "").trim().toUpperCase().split(/\s+/).filter(Boolean);
      if (!parts.length) return "XX";
      const first = parts[0]?.[0] || "X";
      const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || "X") : "X";
      return `${first}${last}`;
    },

    hash32(str) {
      let h = 2166136261;
      const s = String(str || "");
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },

    pad5(n) {
      return String(n).padStart(5, "0");
    },

    makeUNSCId(oldId, name, used) {
      const initials = this.makeInitials(name);
      let seed = this.hash32(`${oldId}::${name}`);

      let a = seed % 100000;
      let b = ((seed / 100000) >>> 0) % 100000;

      let candidate = `${this.pad5(a)}-${this.pad5(b)}-${initials}`;

      while (used.has(candidate)) {
        seed = (seed + 1) >>> 0;
        a = seed % 100000;
        b = ((seed / 100000) >>> 0) % 100000;
        candidate = `${this.pad5(a)}-${this.pad5(b)}-${initials}`;
      }

      used.add(candidate);
      return candidate;
    },

    /* ===============================================================
     *  PERSONNEL ROSTER (MembersMaster)
     * =============================================================== */
    loadMembersCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: true,
          header: false,
          complete: (results) => {
            const rows = (results.data || []).slice(2); // skip title + headers
            const CERT_COLUMNS = 13;

            const usedUNSCIds = new Set();

            this.members = rows
              .map((row) => {
                const name = String(row[1] || "").trim();
                if (!name) return null;

                const oldId = String(row[4] || "").trim();

                return {
                  rank: String(row[0] || "").trim(),
                  name,
                  joinDate: String(row[3] || "").trim(),
                  id: this.makeUNSCId(oldId, name, usedUNSCIds),

                  certifications: row
                    .slice(5, 5 + CERT_COLUMNS)
                    .map((c) => (String(c || "").trim().toUpperCase() === "Y" ? "Y" : "N")),

                  // Filled from RefData:
                  squad: "",
                  fireteam: "",
                  slot: "",

                  // Filled later from Ops sheet:
                  opsAttended: 0,
                };
              })
              .filter(Boolean);

            console.log("Members loaded:", this.members.length);
            resolve(this.members);
          },
          error: reject,
        });
      });
    },

    /* ===============================================================
     *  REFDATA — membership (N/O) + slotting (P/Q)
     * =============================================================== */
    loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: false,
          header: false,
          complete: (results) => {
            const rows = results.data || [];

            const findCol = (row, names) => {
              const wanted = names.map((n) => this.normalize(n));
              return row.findIndex((c) => wanted.includes(this.normalize(c)));
            };

            let membershipHeaderRowIndex = -1;
            let memberCol = -1;
            let squadCol = -1;

            for (let i = 0; i < 2; i++) {
              const r = rows[i] || [];
              const m = findCol(r, ["Squad Member"]);
              const s = findCol(r, ["Squads"]);
              if (m !== -1 && s !== -1) {
                membershipHeaderRowIndex = i;
                memberCol = m;
                squadCol = s;
                break;
              }
            }

            if (membershipHeaderRowIndex === -1) {
              console.error("RefData: could not find membership headers (Squad Member / Squads).");
              resolve([]);
              return;
            }

            const KNOWN_ROLE_HEADER_HINTS = [
              "squad roles",
              "role",
              "chalk 1 fireteam 1",
              "chalk 2 fireteam 1",
              "chalk 3 fireteam 1",
              "chalk 4 fireteam 1",
              "broadsword",
              "wyvern",
              "caladrius",
              "ifrit",
              "chalk actual",
            ];

            let slotHeaderRowIndex = -1;
            let slotCol = -1;
            let roleCol = -1;

            for (let i = 0; i < 4; i++) {
              const r = rows[i] || [];
              const sl = findCol(r, ["Squad Slots", "Slot"]);
              if (sl === -1) continue;

              let rc = findCol(r, ["Squad Roles", "Role"]);

              if (rc === -1) {
                rc = r.findIndex((c) => {
                  const n = this.normalize(c);
                  if (!n) return false;
                  if (n.includes("fireteam")) return true;
                  return KNOWN_ROLE_HEADER_HINTS.includes(n);
                });
              }

              if (sl !== -1 && rc !== -1) {
                slotHeaderRowIndex = i;
                slotCol = sl;
                roleCol = rc;
                break;
              }
            }

            const slottingAvailable = slotHeaderRowIndex !== -1 && slotCol !== -1 && roleCol !== -1;

            const findMemberByLabel = (label) => {
              const labelNorm = this.normalize(label);
              if (!labelNorm) return null;

              let m = this.members.find((mem) => labelNorm.includes(this.normalize(mem.name)));
              if (m) return m;

              const parts = labelNorm.split(" ");
              const surname = parts[parts.length - 1] || "";
              const initialMatch = labelNorm.match(/\b([a-z])\./i);
              const initial = initialMatch ? initialMatch[1].toLowerCase() : "";

              m =
                this.members.find((mem) => {
                  const n = this.normalize(mem.name);
                  const np = n.split(" ");
                  const memSurname = np[np.length - 1] || "";
                  const memInitial = (np[0] || "").charAt(0);
                  if (!surname || memSurname !== surname) return false;
                  if (initial && memInitial !== initial) return false;
                  return true;
                }) || null;

              return m;
            };

            const membershipRows = rows
              .slice(membershipHeaderRowIndex + 1)
              .map((r) => {
                const label = String(r[memberCol] || "").trim();
                const squad = String(r[squadCol] || "").trim();
                if (!label || !squad) return null;
                return { label, squad };
              })
              .filter(Boolean);

            membershipRows.forEach(({ label, squad }) => {
              const mem = findMemberByLabel(label);
              if (!mem) return;
              if (!mem.squad) mem.squad = squad;
            });

            const slotEntries = [];

            const parseHeading = (txt) => {
              const raw = String(txt || "").trim();
              if (!raw) return null;

              const ft = raw.match(/^(.*?)(?:\s+)?fireteam\s*(\d+)\s*$/i);
              if (ft) return { squad: ft[1].trim(), fireteam: `Fireteam ${ft[2].trim()}` };

              const n = this.normalize(raw);
              const singles = [
                "broadsword",
                "broadsword command",
                "ifrit",
                "wyvern",
                "wyvern air wing",
                "caladrius",
                "chalk actual",
              ];
              if (singles.includes(n)) return { squad: raw.trim(), fireteam: "Element" };

              return null;
            };

            if (slottingAvailable) {
              let currentSquad = "";
              let currentFireteam = "Element";

              for (let i = slotHeaderRowIndex + 1; i < rows.length; i++) {
                const r = rows[i] || [];
                const slotTxt = String(r[slotCol] || "").trim();
                const roleTxt = String(r[roleCol] || "").trim();

                const heading = parseHeading(roleTxt);
                if (heading) {
                  currentSquad = heading.squad;
                  currentFireteam = heading.fireteam || "Element";
                  continue;
                }

                if (!currentSquad || !roleTxt) continue;

                const slotNorm = this.normalize(slotTxt);

                if (slotNorm === "vacant" || slotNorm === "closed") {
                  slotEntries.push({
                    squad: currentSquad,
                    fireteam: currentFireteam,
                    role: roleTxt,
                    status: slotNorm.toUpperCase(),
                    member: null,
                  });
                  continue;
                }

                const mem = slotTxt ? findMemberByLabel(slotTxt) : null;
                if (!mem) continue;

                mem.squad = currentSquad;
                mem.fireteam = currentFireteam;
                mem.slot = roleTxt;

                slotEntries.push({
                  squad: currentSquad,
                  fireteam: currentFireteam,
                  role: roleTxt,
                  status: "FILLED",
                  member: mem,
                });
              }
            }

            const ALWAYS_SQUADS = [
              "Chalk Actual",
              "Chalk 1",
              "Chalk 2",
              "Chalk 3",
              "Chalk 4",
              "Broadsword Command",
              "Wyvern",
              "Caladrius",
              "Fillers",
              "Recruit",
              "Reserves",
            ];

            const orbatMap = {};
            ALWAYS_SQUADS.forEach((s) => {
              orbatMap[s] = { squad: s, members: [], fireteams: {} };
            });

            this.members.forEach((m) => {
              if (!m.squad) return;

              if (!orbatMap[m.squad]) {
                orbatMap[m.squad] = { squad: m.squad, members: [], fireteams: {} };
              }

              orbatMap[m.squad].members.push(m);

              const ft = (m.fireteam || "").trim();
              const role = (m.slot || "").trim();
              if (ft && role) {
                orbatMap[m.squad].fireteams[ft] ??= { name: ft, slots: [] };
                const exists = orbatMap[m.squad].fireteams[ft].slots.some(
                  (s) => s.status === "FILLED" && s.member?.id && s.member.id === m.id && s.role === role
                );
                if (!exists) {
                  orbatMap[m.squad].fireteams[ft].slots.push({ role, status: "FILLED", member: m });
                }
              }
            });

            slotEntries.forEach((e) => {
              if (!orbatMap[e.squad]) {
                orbatMap[e.squad] = { squad: e.squad, members: [], fireteams: {} };
              }
              const ftName = e.fireteam || "Element";
              orbatMap[e.squad].fireteams[ftName] ??= { name: ftName, slots: [] };

              if (e.status === "FILLED" && e.member?.id) {
                const exists = orbatMap[e.squad].fireteams[ftName].slots.some(
                  (s) => s.status === "FILLED" && s.member?.id === e.member.id && s.role === e.role
                );
                if (exists) return;
              }

              orbatMap[e.squad].fireteams[ftName].slots.push({
                role: e.role,
                status: e.status,
                member: e.member,
              });
            });

            this.orbat = Object.values(orbatMap).map((s) => ({
              squad: s.squad,
              members: (s.members || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")),
              fireteams: Object.values(s.fireteams || {}).map((ft) => ({
                name: ft.name,
                slots: (ft.slots || []).slice(),
              })),
            }));

            resolve(this.orbat);
          },
          error: reject,
        });
      });
    },

    /* ===============================================================
     *  MISSIONS / EVENTS
     * =============================================================== */
    async importMissions(files) {
      const contents = await Promise.all(Object.values(files).map((f) => f()));
      contents.forEach((c) => {
        const l = c.split("\n");
        this.missions.push({
          slug: l[0],
          name: l[1],
          status: l[2],
          content: l.slice(3).join("\n"),
        });
      });
    },

    async importEvents(files) {
      const contents = await Promise.all(Object.values(files).map((f) => f()));
      contents.forEach((c) => {
        const l = c.split("\n");
        this.events.push({
          title: l[0],
          location: l[1],
          time: l[2],
          thumbnail: l[3],
          content: l.slice(4).join("\n"),
        });
      });
    },
  },
};
</script>

<style>
#app {
  min-height: 100vh;
  overflow: hidden !important;
}

/* Fake login overlay (click anywhere) */
.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  cursor: pointer;
  opacity: 1;
  transition: opacity 0.8s ease;
}

.login-overlay.fading {
  opacity: 0;
  pointer-events: none;
}

/* background layer with logo */
.login-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.login-logo {
  width: min(520px, 70vw);
  height: auto;
  opacity: 0.18;
  filter: drop-shadow(0 0 24px rgba(0, 0, 0, 0.9));
}

/* centered lore text */
.login-text {
  position: relative;
  z-index: 1;
  text-align: center;
  color: rgba(170, 255, 210, 0.92);
  font-family: "Titillium Web", sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.login-lore {
  font-size: 14px;
  margin-bottom: 2.2em;
  opacity: 0.9;
}

.login-warning {
  font-size: 11px;
  line-height: 1.8em;
  opacity: 0.75;
  margin-bottom: 3em;
}

.login-prompt {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.22em;
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* ROUTE TRANSITIONS: UNSC HUD SHUDDER / FADE (ALL PAGES) */
.hud-enter-active {
  animation: hud-in 420ms ease-out both;
}

.hud-leave-active {
  animation: hud-out 220ms ease-in both;
}

@keyframes hud-in {
  0%   { opacity: 0; transform: translate3d(0,0,0); filter: blur(2px); }
  35%  { opacity: 0.75; transform: translate3d(1px,-1px,0); filter: blur(1px); }
  55%  { transform: translate3d(-1px,1px,0); }
  70%  { transform: translate3d(1px,0px,0); }
  100% { opacity: 1; transform: translate3d(0,0,0); filter: blur(0); }
}

@keyframes hud-out {
  0%   { opacity: 1; transform: translate3d(0,0,0); filter: blur(0); }
  100% { opacity: 0; transform: translate3d(0,2px,0); filter: blur(2px); }
}
</style>
a. Want me to add unit tests for the CSV parsing/promotion logic (Vitest) and edge cases?
b. Prefer script setup + Composition API? I can convert this SFC.





You said:
pasted.txt
Document
Excellent! Now for PilotsView.vue, I want to keep the overall structure the same, but have a section showing the total ops attended by each soldier as well as the number of ops left until their next promotion, I'm using Column A and C on the Attendance sheet for this. Column A has all the names of the soldiers, and Column C shows the ops attended thus far.


Code Copilot said:

Thought for 9s
TL;DR: Kept layout. In each filled member tile I added an “Ops & Promotion” mini-block showing ops attended (from Column C) and ops left until the next rank (derived from current rank + ladder). Implemented tiny helpers locally so it works without extra props.

Plan (pseudocode)
Preserve existing template/behavior.

In each FILLED member tile:

Show: Ops Attended, Next Rank, Ops To Next.

Methods:

rankKey, promotionLadderFor(rank), opsToNextPromotion(member), nextPromotionRank(member).

Use member.opsAttended merged earlier from Attendance (A=name, C=ops).

vue
Copy code
<!-- src/views/PilotsView.vue -->
<template>
  <section id="members" class="section-container">
    <!-- Header -->
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward-pilot">
        <img src="/icons/license.svg" alt="Members Icon" />
        <h1>Unit ORBAT</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <div class="orbat-wrapper">
        <div v-if="!orbat || !orbat.length">Loading squads and members...</div>

        <div v-else class="hierarchy-container">
          <!-- TOP: BROADSWORD COMMAND -->
          <div v-if="hierarchy.broadswordCommand" class="orbat-row center-row actual-row">
            <div class="squad-row single">
              <div class="squad-card" @click="openSquad(hierarchy.broadswordCommand)">
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(hierarchy.broadswordCommand.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ hierarchy.broadswordCommand.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(hierarchy.broadswordCommand.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(hierarchy.broadswordCommand) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TOP: CHALK ACTUAL -->
          <div v-if="hierarchy.chalkActual" class="orbat-row center-row actual-row">
            <div class="squad-row single">
              <div class="squad-card" @click="openSquad(hierarchy.chalkActual)">
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(hierarchy.chalkActual.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ hierarchy.chalkActual.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(hierarchy.chalkActual.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(hierarchy.chalkActual) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CHALKS 1–4 -->
          <div v-if="hierarchy.chalks.length" class="orbat-row chalk-row">
            <div class="squad-row three">
              <div
                v-for="sq in hierarchy.chalks"
                :key="sq.squad"
                class="squad-card"
                @click="openSquad(sq)"
              >
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(sq.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SUPPORT -->
          <div v-if="hierarchy.support.length" class="orbat-row">
            <div class="squad-row three">
              <div
                v-for="sq in hierarchy.support"
                :key="sq.squad"
                class="squad-card"
                @click="openSquad(sq)"
              >
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(sq.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- OTHER -->
          <div v-if="hierarchy.other.length" class="orbat-row">
            <div class="squad-row three">
              <div
                v-for="sq in hierarchy.other"
                :key="sq.squad"
                class="squad-card"
                @click="openSquad(sq)"
              >
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(sq.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- FULLSCREEN OVERLAY -->
    <div v-if="activeSquad" class="squad-overlay" @click.self="closeSquad">
      <div class="squad-modal">
        <div class="squad-modal-header">
          <div class="squad-header-left">
            <div class="section-header clipped-medium-backward-bio">
              <img src="/icons/license.svg" />
              <h1>SQUAD ROSTER</h1>
            </div>
            <div class="rhombus-back">&nbsp;</div>
          </div>

          <button class="squad-close" @click="closeSquad">✕</button>
        </div>

        <div class="squad-modal-meta" :class="{ invalid: !squadLoadoutStatus.valid }">
          <div class="squad-title">
            <h2>{{ activeSquad.squad }}</h2>
            <p class="subtitle">
              {{ squadDescriptor(activeSquad.squad) }} ·
              {{ personnelCount(activeSquad) }} PERSONNEL
            </p>

            <div class="loadout-status">
              <span class="points">
                LOADOUT: {{ squadLoadoutStatus.points }}/10 PTS
              </span>
              <span
                v-if="!squadLoadoutStatus.valid"
                class="warn"
                :title="squadLoadoutStatus.errors.join(' • ')"
              >
                ⚠ LOADOUT INVALID
              </span>
              <span v-else class="ok">✓ VALID</span>
            </div>
          </div>

          <div class="squad-tag">
            <span>{{ squadInitials(activeSquad.squad) }}</span>
          </div>
        </div>

        <div class="squad-modal-scroll">
          <div v-for="ft in activeFireteams" :key="ft.name" class="fireteam-block">
            <div class="fireteam-header">
              <span class="fireteam-title">{{ ft.name.toUpperCase() }}</span>
              <span class="fireteam-count">{{ ft.slots.length }} SLOTS</span>
            </div>

            <div class="squad-members-grid">
              <div
                v-for="(slot, idx) in ft.slots"
                :key="slotKey(slot, idx)"
                class="member-card"
                :class="{ vacant: slot.status === 'VACANT', closed: slot.status === 'CLOSED' }"
              >
                <!-- VACANT/CLOSED tile -->
                <template v-if="slot.status === 'VACANT' || slot.status === 'CLOSED'">
                  <div class="member-header">
                    <div class="member-header-text">
                      <h3>{{ slot.status }}</h3>
                      <p class="rank-line">
                        <span class="rank">{{ slot.role }}</span>
                        <span class="id">UNFILLED SLOT</span>
                      </p>
                    </div>
                  </div>

                  <div class="member-body">
                    <div class="member-column left">
                      <p><strong>Squad:</strong> {{ activeSquad.squad }}</p>
                      <p><strong>Fireteam:</strong> {{ ft.name }}</p>
                      <p><strong>Role:</strong> {{ slot.role }}</p>
                    </div>
                    <div class="member-column right">
                      <p><strong>Certifications:</strong></p>
                      <span class="cert-none">N/A</span>
                    </div>
                  </div>

                  <div class="member-footer">
                    <span>SLOT STATUS: {{ slot.status }}</span>
                    <span>UNSC ORBAT</span>
                  </div>
                </template>

                <!-- FILLED tile -->
                <template v-else>
                  <div class="member-header">
                    <div class="member-rank-insignia-wrapper" v-if="rankInsignia(slot.member?.rank)">
                      <img
                        :src="rankInsignia(slot.member.rank)"
                        :alt="slot.member.rank + ' insignia'"
                        class="member-rank-insignia"
                      />
                    </div>

                    <div class="member-header-text">
                      <h3>{{ (slot.member?.name || '').toUpperCase() }}</h3>
                      <p class="rank-line">
                        <span class="rank">{{ slot.member?.rank || 'N/A' }}</span>
                        <span class="id">ID: {{ slot.member?.id || 'N/A' }}</span>
                      </p>
                    </div>
                  </div>

                  <div class="member-body">
                    <div class="member-column left">
                      <p><strong>Squad:</strong> {{ slot.member?.squad || activeSquad.squad }}</p>
                      <p><strong>Fireteam:</strong> {{ slot.member?.fireteam || ft.name }}</p>
                      <p><strong>Role:</strong> {{ slot.role || slot.member?.slot || 'Unassigned' }}</p>
                      <p><strong>Join Date:</strong> {{ slot.member?.joinDate || 'Unknown' }}</p>

                      <!-- NEW: Ops & Promotion mini-section -->
                      <div class="ops-promo">
                        <p><strong>Ops Attended:</strong> {{ formatOps(slot.member?.opsAttended) }}</p>
                        <p>
                          <strong>Next Rank:</strong>
                          {{ nextPromotionRank(slot.member) || '—' }}
                          <span v-if="opsToNextPromotion(slot.member) !== null">
                            ({{ opsToNextPromotion(slot.member) }} ops)
                          </span>
                        </p>
                      </div>

                      <!-- DISPOSABLE CHECKBOX -->
                      <div class="loadout-row">
                        <label class="disposable">
                          <input
                            type="checkbox"
                            :checked="getLoadout(slot.member).disposable"
                            @change="toggleDisposable(slot.member)"
                          />
                          Disposable Rocket (1pt)
                        </label>
                      </div>

                      <!-- PRIMARY LOADOUT SELECT -->
                      <div class="loadout-row">
                        <label class="primary-label">Assigned Loadout</label>
                        <select
                          class="loadout-select"
                          :value="getLoadout(slot.member).primary"
                          @change="setPrimary(slot.member, $event.target.value)"
                        >
                          <option value="">None / Standard</option>
                          <option
                            v-for="opt in availableLoadouts(slot.member)"
                            :key="opt"
                            :value="opt"
                          >
                            {{ loadoutLabel(opt) }}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div class="member-column right">
                      <p><strong>Certifications:</strong></p>
                      <div class="cert-list">
                        <div v-for="(label, cidx) in certLabels" :key="label" class="cert-row">
                          <span class="cert-checkbox" :class="{ checked: hasCert(slot.member, cidx) }">
                            <span v-if="hasCert(slot.member, cidx)" class="checkbox-dot"></span>
                          </span>
                          <span class="cert-label">{{ label }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="member-footer">
                    <span>BIOMETRIC RECORD VALID</span>
                    <span>UNSC SYSTEMS DATABASE</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- UI SFX -->
    <audio ref="orbatClickAudio" preload="auto">
      <source src="/Orbat Main Menu Click.ogg" type="audio/ogg" />
    </audio>
  </section>
</template>

<script>
export default {
  name: "PilotsView",
  props: {
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
  },
  data() {
    return {
      activeSquad: null,

      certLabels: [
        "Rifleman","Machine Gunner","Anti Tank","Corpsmen","Combat Engineer",
        "Marksman","Breacher","Grenadier","Pilot","RTO","PJ","NCO","Officer",
      ],

      loadouts: {},

      loadoutOptions: {
        grenadier: { label: "Grenadier", points: 2, explosive: true },
        antitank: { label: "Anti-Tank", points: 3, explosive: true },
        m247: { label: "M247 SAW", points: 3 },
        m247_50: { label: "M247 .50", points: 5 },
        engineer: { label: "Combat Engineer", points: 2 },
        marksman: { label: "Marksman", points: 2 },
      },
    };
  },
  computed: {
    hierarchy() {
      const groups = { broadswordCommand: null, chalkActual: null, chalks: [], support: [], other: [] };

      (this.orbat || []).forEach((sq) => {
        const n = String(sq.squad || "").trim().toLowerCase();

        if (n === "broadsword command") groups.broadswordCommand = sq;
        else if (n === "chalk actual") groups.chalkActual = sq;
        else if (["chalk 1","chalk 2","chalk 3","chalk 4"].includes(n)) groups.chalks.push(sq);
        else if (["broadsword","wyvern","wyvern air wing","caladrius","ifrit"].includes(n))
          groups.support.push(sq);
        else groups.other.push(sq);
      });

      groups.chalks.sort((a,b)=>a.squad.localeCompare(b.squad, undefined, {numeric:true}));
      groups.support.sort((a,b)=>a.squad.localeCompare(b.squad));
      groups.other.sort((a,b)=>a.squad.localeCompare(b.squad));
      return groups;
    },

    activeFireteams() {
      if (!this.activeSquad) return [];

      if (this.activeSquad.fireteams && this.activeSquad.fireteams.length) {
        const sorted = this.activeSquad.fireteams.slice().map((ft) => ({
          name: ft.name || "Element",
          slots: (ft.slots || []).slice(),
        }));

        const orderKey = (n) => {
          const t = String(n || "").toLowerCase();
          if (t === "fireteam 1") return 0;
          if (t === "fireteam 2") return 1;
          if (t === "fireteam 3") return 2;
          if (t === "fireteam 4") return 3;
          if (t === "element") return 90;
          return 50;
        };

        sorted.sort((a,b)=>{
          const ka = orderKey(a.name), kb = orderKey(b.name);
          if (ka !== kb) return ka - kb;
          return String(a.name).localeCompare(String(b.name), undefined, {numeric:true});
        });

        const rankOrder = [
          "MAJ","CAPT","1STLT","2NDLT",
          "CWO5","CWO4","CWO3","CWO2","WO",
          "GYSGT","SSGT","SGT","CPL","LCPL",
          "SPC4","SPC3","SPC2","SPC","PFC","PVT","RCT",
          "HMC","HM1","HM2","HM3","HN","HA","HR",
        ];

        const normalizeRank = (r) => String(r || "").trim().toUpperCase().replace(/\s+/g, "");
        const rankScore = (r) => {
          const rr = normalizeRank(r);
          const idx = rankOrder.indexOf(rr);
          return idx === -1 ? 999 : idx;
        };

        const statusScore = (s) => {
          const st = String(s || "").toUpperCase();
          if (st === "FILLED") return 0;
          if (st === "VACANT") return 1;
          if (st === "CLOSED") return 2;
          return 3;
        };

        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

        sorted.forEach((ft) => {
          ft.slots = (ft.slots || []).slice().sort((a, b) => {
            const as = statusScore(a.status);
            const bs = statusScore(b.status);
            if (as !== bs) return as - bs;

            if (a.status !== "FILLED" || b.status !== "FILLED") {
              return collator.compare(String(a.role || ""), String(b.role || ""));
            }

            const ar = rankScore(a.member?.rank);
            const br = rankScore(b.member?.rank);
            if (ar !== br) return ar - br;

            return collator.compare(String(a.member?.name || ""), String(b.member?.name || ""));
          });
        });

        return sorted.filter((ft) => ft.slots && ft.slots.length);
      }

      const map = {};
      (this.activeSquad.members || []).forEach((m) => {
        const ft = (m.fireteam || "Element").trim() || "Element";
        map[ft] ??= [];
        map[ft].push({ status: "FILLED", role: m.slot || "Unassigned", member: m });
      });

      return Object.entries(map).map(([name, slots]) => ({ name, slots }));
    },

    squadLoadoutStatus() {
      if (!this.activeSquad) return { valid: true, points: 0, errors: [] };

      let points = 0;
      const errors = [];
      const explosiveTaken = new Set();

      const slots = [];
      this.activeFireteams.forEach((ft) => (ft.slots || []).forEach((s) => slots.push(s)));

      slots.forEach((slot) => {
        const member = slot.member;
        if (!member) return;

        const l = this.getLoadout(member);

        if (l.disposable) {
          points += 1;
          if (explosiveTaken.has("disposable")) errors.push("Duplicate explosive weapon: Disposable");
          explosiveTaken.add("disposable");
        }

        if (l.primary) {
          const def = this.loadoutOptions[l.primary];
          if (def) {
            points += def.points;

            if (def.explosive) {
              if (explosiveTaken.has(l.primary)) errors.push(`Duplicate explosive weapon: ${def.label}`);
              explosiveTaken.add(l.primary);
            }
          }
        }
      });

      if (points > 10) errors.push("Exceeds 10 point maximum");

      return { valid: errors.length === 0, points, errors };
    },
  },
  methods: {
    /* UX */
    playOrbatClick() {
      const a = this.$refs.orbatClickAudio;
      if (!a || typeof a.play !== "function") return;
      try { a.currentTime = 0; a.play().catch(() => {}); } catch { /* ignore */ }
    },
    openSquad(sq) { this.playOrbatClick(); this.activeSquad = sq; },
    closeSquad() { this.activeSquad = null; },

    /* ORBAT helpers */
    personnelCount(sq) {
      if (sq.fireteams && sq.fireteams.length) {
        let count = 0;
        sq.fireteams.forEach((ft) => (ft.slots || []).forEach((s) => { if (s.status === "FILLED" && s.member) count++; }));
        return count;
      }
      return (sq.members || []).length;
    },
    slotKey(slot, idx) { return slot.member?.id || `${slot.status}-${slot.role}-${idx}`; },
    squadInitials(name) {
      if (!name) return "UNSC";
      const parts = String(name).trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
      return parts.map((p, i) => (i === parts.length - 1 && /\d+/.test(p) ? p : p[0])).join("").toUpperCase();
    },
    squadDescriptor(name) {
      const n = String(name || "").toLowerCase();
      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("air") || n.includes("wing") || n.includes("wyvern")) return "AVIATION SUPPORT";
      if (n.includes("command") || n.includes("actual")) return "COMMAND ELEMENT";
      return "UNSC ELEMENT";
    },

    /* Certs / Loadouts */
    hasCert(member, idx) {
      const certs = member?.certifications || [];
      return certs[idx] === "Y" || certs[idx] === true || certs[idx] === "1";
    },
    getLoadout(member) {
      const id = member?.id;
      if (!id) return { primary: "", disposable: false };
      if (!this.loadouts[id]) this.loadouts[id] = { primary: "", disposable: false };
      return this.loadouts[id];
    },
    toggleDisposable(member) {
      const id = member?.id; if (!id) return;
      const curr = this.getLoadout(member);
      this.loadouts[id] = { ...curr, disposable: !curr.disposable };
    },
    setPrimary(member, value) {
      const id = member?.id; if (!id) return;
      const curr = this.getLoadout(member);
      this.loadouts[id] = { ...curr, primary: value || "" };
    },
    loadoutLabel(key) { const def = this.loadoutOptions[key]; return def ? `${def.label} (${def.points}pt)` : key; },
    availableLoadouts(member) {
      const has = (label) => this.hasCert(member, this.certLabels.indexOf(label));
      const opts = [];
      if (has("Grenadier")) opts.push("grenadier");
      if (has("Anti Tank")) opts.push("antitank");
      if (has("Machine Gunner")) { opts.push("m247", "m247_50"); }
      if (has("Combat Engineer")) opts.push("engineer");
      if (has("Marksman")) opts.push("marksman");
      return opts;
    },

    /* Ranks / Insignia */
    rankCode(rank) {
      if (!rank) return null;
      const key = rank.trim().toUpperCase();
      const rankMap = {
        RCT: "Rct", PVT: "Pvt", PFC: "PFC", SPC: "Spc", SPC2: "Spc2", SPC3: "Spc3", SPC4: "Spc4",
        LCPL: "LCpl", CPL: "Cpl", SGT: "Sgt", SSGT: "SSgt", GYSGT: "GySgt",
        WO: "WO", CWO2: "CWO2", CWO3: "CWO3", CWO4: "CWO4", CWO5: "CWO5",
        "2NDLT": "2ndLt", "1STLT": "1stLt", CAPT: "Capt", MAJ: "Maj",
        HR: "HR", HA: "HA", HN: "HN", HM3: "HM3", HM2: "HM2", HM1: "HM1", HMC: "HMC",
      };
      return rankMap[key] || null;
    },
    rankInsignia(rank) { const fileBase = this.rankCode(rank); return fileBase ? `/ranks/${fileBase}.png` : null; },

    /* NEW: Ops & promotion helpers */
    formatOps(v) {
      const n = Number(v);
      return Number.isFinite(n) ? n : "—";
    },
    rankKey(rank) {
      return String(rank || "").trim().toUpperCase().replace(/\s+/g, "");
    },
    promotionLadderFor(rank) {
      const r = this.rankKey(rank);
      const ladders = {
        PVT:  { nextAt: 2,  nextRank: "PFC" },
        PFC:  { nextAt: 10, nextRank: "SPC" },
        SPC:  { nextAt: 20, nextRank: "SPC2" },
        SPC2: { nextAt: 30, nextRank: "SPC3" },
        SPC3: { nextAt: 40, nextRank: "SPC4" },
        SPC4: { nextAt: 50, nextRank: null },
        HA:   { nextAt: 2,  nextRank: "HN" },
        HN:   { nextAt: 10, nextRank: "HM3" },
        HM3:  { nextAt: 20, nextRank: "HM2" },
        HM2:  { nextAt: 30, nextRank: null },
        CWO2: { nextAt: 10, nextRank: "CWO3" },
        CWO3: { nextAt: 20, nextRank: "CWO4" },
        CWO4: { nextAt: 30, nextRank: null },
      };
      return ladders[r] || null;
    },
    opsToNextPromotion(member) {
      const ops = Number(member?.opsAttended);
      if (!Number.isFinite(ops)) return null;
      const ladder = this.promotionLadderFor(member?.rank);
      if (!ladder || !ladder.nextAt) return null;
      return Math.max(0, ladder.nextAt - ops);
    },
    nextPromotionRank(member) {
      const ladder = this.promotionLadderFor(member?.rank);
      return ladder?.nextRank || null;
    },
  },
};
</script>

<style scoped>
/* keep your existing styles exactly as-is */
.section-container {
  height: 100vh;
  overflow-y: auto;
  padding: 2.5rem 3rem;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
  width: 100% !important;
  max-width: 2200px;
  margin: 0 auto;
  box-sizing: border-box;
}
.section-content-container { width: 100% !important; }
.orbat-wrapper { width: 100%; margin-top: 0.75rem; padding-bottom: 4rem; }
.hierarchy-container { width: 100%; margin-top: 2rem; }
.orbat-row { margin-bottom: 3rem; }
.center-row { display: flex; justify-content: center; }
.squad-row.single { display: flex; justify-content: center; }
.squad-row.three {
  display: grid;
  grid-template-columns: repeat(3, minmax(280px, 1fr));
  gap: 2.5rem;
}
@media (max-width: 1400px) { .squad-row.three { grid-template-columns: repeat(2, minmax(260px, 1fr)); } }
@media (max-width: 900px) { .squad-row.three { grid-template-columns: 1fr; } }
@media (min-width: 900px) {
  .actual-row { position: relative; }
  .actual-row::after {
    content: "";
    position: absolute;
    bottom: -24px;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 24px;
    background: rgba(30, 144, 255, 0.6);
    border-radius: 2px;
    pointer-events: none;
  }
  .chalk-row { position: relative; margin-top: 2.5rem; padding-top: 1.5rem; }
  .chalk-row::before {
    content: "";
    position: absolute;
    top: 0; left: 8%; right: 8%;
    height: 3px; background: rgba(30, 144, 255, 0.6);
    border-radius: 2px; pointer-events: none;
  }
}
.squad-card {
  background: radial-gradient(circle at top left, rgba(30, 144, 255, 0.25), transparent 65%),
    rgba(0, 10, 30, 0.9);
  border: 2px solid rgba(30, 144, 255, 0.85);
  border-radius: 0.8rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  cursor: pointer;
  min-height: 210px;
  padding-right: 1.5rem;
  transition: 0.15s ease-in-out;
}
.squad-card:hover { transform: translateY(-2px); border-color: #5ab3ff; }
.squad-header {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  padding: 1.4rem 2rem;
}
.squad-insignia {
  width: 95px; height: 95px; border-radius: 0.6rem; border: 4px solid #1e90ff;
  display: flex; align-items: center; justify-content: center; margin-right: 1.6rem;
  font-size: 2rem; font-weight: bold; color: #1e90ff; background: rgba(0, 0, 0, 0.7); text-align: center;
}
.squad-meta h2 { margin: 0; font-size: 2.3rem; color: #e0f0ff; letter-spacing: 0.05em; }
.squad-subtitle { margin: 0.2rem 0 0; font-size: 1.1rem; color: #9ec5e6; text-transform: uppercase; }
.squad-count { margin: 0.4rem 0 0; font-size: 1rem; color: #7aa7c7; }

.squad-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); z-index: 9999;
  display: flex; align-items: center; justify-content: center; }
.squad-modal {
  background-color: #050811; color: #dce6f1; width: 92vw; max-width: 1700px; max-height: 90vh;
  border-radius: 0.8rem; box-shadow: 0 0 24px rgba(0, 0, 0, 0.9); padding: 1.5rem 2rem 2rem 2rem;
  display: flex; flex-direction: column;
}
.squad-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
.squad-header-left { display: flex; align-items: center; }
.squad-header-left img { width: 48px; margin-right: 0.5rem; }
.squad-close {
  background: transparent; border: 1px solid rgba(220, 230, 241, 0.4); color: #dce6f1;
  border-radius: 999px; padding: 0.2rem 0.75rem; font-size: 1rem; cursor: pointer;
}
.squad-modal-meta {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;
  border-bottom: 1px solid rgba(30, 144, 255, 0.6); padding-bottom: 0.5rem;
}
.squad-modal-meta.invalid { border-bottom-color: rgba(255, 190, 80, 0.9); }
.loadout-status { margin-top: 0.35rem; display: flex; gap: 0.75rem; align-items: center;
  font-size: 0.85rem; text-transform: uppercase; }
.loadout-status .points { color: #9ec5e6; }
.loadout-status .warn { color: rgba(255, 190, 80, 0.95); }
.loadout-status .ok { color: rgba(120, 255, 170, 0.9); }

.squad-title h2 { margin: 0; font-size: 1.8rem; letter-spacing: 0.08em; }
.squad-title .subtitle { margin: 0.25rem 0 0; font-size: 0.95rem; color: #9ec5e6; text-transform: uppercase; }
.squad-tag { border: 2px solid #1e90ff; border-radius: 0.4rem; padding: 0.35rem 0.8rem; font-size: 0.95rem; color: #1e90ff; }

.squad-modal-scroll { margin-top: 0.5rem; flex: 1; overflow-y: auto; padding-right: 0.5rem; }

.fireteam-block { margin-bottom: 1.25rem; }
.fireteam-header { display: flex; justify-content: space-between; align-items: baseline;
  border-left: 4px solid rgba(30, 144, 255, 0.9); background: rgba(0, 10, 30, 0.65);
  padding: 0.55rem 0.8rem; border-radius: 0.35rem; margin-bottom: 0.75rem; }
.fireteam-title { letter-spacing: 0.12em; color: #e0f0ff; font-size: 0.95rem; }
.fireteam-count { font-size: 0.8rem; color: #7aa7c7; }

.squad-members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1rem; }
.member-card { background: rgba(0, 10, 30, 0.95); border-radius: 0.4rem; border-left: 4px solid #1e90ff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.6); padding: 0.9rem 1.1rem; display: flex; flex-direction: column; }
.member-card.vacant, .member-card.closed { border-left-color: rgba(180, 180, 180, 0.8); opacity: 0.85; }
.member-card.closed { opacity: 0.6; filter: grayscale(0.2); }

.member-header { display: flex; align-items: center; gap: 0.75rem; }
.member-rank-insignia { width: 40px; height: 40px; object-fit: contain; }
.member-header-text h3 { margin: 0; font-size: 1.2rem; color: #1e90ff; }
.member-card.vacant .member-header-text h3, .member-card.closed .member-header-text h3 { color: #c7c7c7; }
.rank-line { margin: 0.2rem 0 0; font-size: 0.9rem; color: #9ec5e6; }
.rank { margin-right: 0.6rem; }
.id { opacity: 0.8; }

.member-body { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.6rem; font-size: 0.9rem; }
.member-column.left p, .member-column.right p { margin: 0.18rem 0; }

.ops-promo { margin-top: 0.45rem; padding: 0.45rem 0.55rem; border: 1px dashed rgba(30,144,255,0.45);
  border-radius: 0.35rem; background: rgba(0,10,30,0.35); }

.loadout-row { margin-top: 0.55rem; display: flex; flex-direction: column; gap: 0.25rem; }
.primary-label { font-size: 0.75rem; opacity: 0.85; text-transform: uppercase; }
.loadout-select {
  background: rgba(0, 0, 0, 0.35); color: #dce6f1; border: 1px solid rgba(122, 167, 199, 0.55);
  border-radius: 0.3rem; padding: 0.35rem 0.45rem; outline: none;
}
.disposable { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #9ec5e6; }
.disposable input { transform: translateY(1px); }

.cert-list { display: flex; flex-direction: column; gap: 0.15rem; margin-top: 0.2rem; }
.cert-row { display: flex; align-items: center; font-size: 0.8rem; }
.cert-checkbox {
  width: 14px; height: 14px; border-radius: 3px; border: 1px solid #7aa7c7;
  display: inline-flex; align-items: center; justify-content: center; margin-right: 0.3rem; box-sizing: border-box;
}
.cert-checkbox.checked { border-color: #1e90ff; background: rgba(30, 144, 255, 0.15); }
.checkbox-dot { width: 8px; height: 8px; border-radius: 2px; background: #1e90ff; }
.cert-label { white-space: nowrap; }
.cert-none { font-size: 0.8rem; opacity: 0.75; }

.member-footer { margin-top: 0.6rem; font-size: 0.75rem; color: #7aa7c7; display: flex; justify-content: space-between; }
</style>
