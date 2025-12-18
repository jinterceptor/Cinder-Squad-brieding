<!-- /src/App.vue -->
<template>
  <div
    v-if="showLogin"
    class="login-overlay"
    :class="{ fading: isFading }"
    @click="authorize"
  >
    <button class="admin-login-btn" @click.stop="openAdminLogin">Admin Login</button>

    <div class="login-bg">
      <img class="login-logo" src="/faction-logos/FUD_UNSC_Logo.png" alt="UNSC Logo" />
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

    <AdminLoginModal
      v-if="showAdminModal"
      @close="closeAdminLogin"
      @success="onAdminLoginSuccess"
    />
  </div>

  <template v-if="!showLogin">
    <div class="page-wrapper">
      <Header :planet-path="planetPath" :class="{ animate: animate }" :header="header" />
      <Sidebar :animate="animate" :class="{ animate: animate }" />
    </div>

    <div id="router-view-container">
      <!-- transition removed to avoid route/animation race -->
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
    </div>
  </template>

  <audio ref="startupAudio" preload="auto">
    <source src="/sound/startup.ogg" type="audio/ogg" />
  </audio>
</template>

<script>
import Header from "./components/layout/Header.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import AdminLoginModal from "@/components/modals/AdminLoginModal.vue";
import Config from "@/assets/info/general-config.json";
import Papa from "papaparse";

export default {
  name: "App",
  components: { Header, Sidebar, AdminLoginModal },
  data() {
    return {
      showLogin: true,
      isFading: false,
      showAdminModal: false,

      animate: Config.animate,
      initialSlug: Config.initialSlug,
      planetPath: Config.planetPath,
      header: Config.header,

      missions: [],
      events: [],
      members: [],
      orbat: [],
      reserves: [],
    };
  },
  created() {
    this.setTitleFavicon(Config.defaultTitle + " UNSC BRIEFING", Config.icon);
    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

    const membersUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=1185035639&single=true&output=csv";
    const refDataUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=107253735&single=true&output=csv";
    const opsUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=1115158828&single=true&output=csv";

    this.loadMembersCSV(membersUrl)
      .then(() => this.loadRefDataCSV(refDataUrl))
      .then(() => this.loadOpsCSV(opsUrl).catch((err) => console.warn("Ops CSV failed; continuing.", err)));
  },
  methods: {
    authorize() {
      if (this.showAdminModal) return; // keep overlay until modal is closed
      if (this.isFading) return;
      this.isFading = true;

      const a = this.$refs.startupAudio;
      if (a && typeof a.play === "function") { a.currentTime = 0; a.play().catch(() => {}); }

      setTimeout(() => {
        this.showLogin = false;
        this.isFading = false;
        if (this.$router?.currentRoute?.value?.path !== "/status") this.$router.push("/status");
      }, 800);
    },

    openAdminLogin() { this.showAdminModal = true; },
    closeAdminLogin() { this.showAdminModal = false; },
    onAdminLoginSuccess() {
      this.showAdminModal = false;
      this.showLogin = false;
      this.isFading = false;
      if (this.$router?.currentRoute?.value?.path !== "/admin") this.$router.push("/admin");
    },

    normalize(str) {
      return String(str || "").replace(/"/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    },
    setTitleFavicon(title, favicon) {
      document.title = title;
      // ensure single favicon; avoid duplicate <link rel="icon">
      let link = document.querySelector('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = favicon;
    },

    loadOpsCSV(opsUrl) {
      return new Promise((resolve) => {
        Papa.parse(opsUrl, {
          download: true, skipEmptyLines: true, header: false,
          complete: (results) => {
            const rows = (results.data || []).slice(1);
            const opsMap = {};
            rows.forEach((row) => {
              const rawName = String(row[0] || "").trim();
              const rawOps = String(row[2] || "").trim();
              if (!rawName) return;
              const ops = Number(rawOps); if (Number.isNaN(ops)) return;
              const quoted = rawName.match(/"([^"]+)"/);
              const nameCore = quoted ? quoted[1] : rawName;
              const key = String(nameCore).replace(/"/g, "").replace(/\s+/g, " ").trim().toLowerCase();
              opsMap[key] = ops;
            });
            (this.members || []).forEach((m) => {
              const key = String(m.name || "").replace(/"/g, "").replace(/\s+/g, " ").trim().toLowerCase();
              m.opsAttended = opsMap[key] ?? null;
            });
            resolve();
          },
          error: () => resolve(),
        });
      });
    },

    rankKey(rank) { return String(rank || "").trim().toUpperCase().replace(/\s+/g, ""); },
    promotionLadderFor(rank) {
      const r = this.rankKey(rank);
      return ({
        PVT: { nextAt: 2, nextRank: "PFC" }, PFC: { nextAt: 10, nextRank: "SPC" },
        SPC: { nextAt: 20, nextRank: "SPC2" }, SPC2: { nextAt: 30, nextRank: "SPC3" },
        SPC3: { nextAt: 40, nextRank: "SPC4" }, SPC4: { nextAt: 50, nextRank: null },
        HA: { nextAt: 2, nextRank: "HN" }, HN: { nextAt: 10, nextRank: "HM3" },
        HM3: { nextAt: 20, nextRank: "HM2" }, HM2: { nextAt: 30, nextRank: null },
        CWO2: { nextAt: 10, nextRank: "CWO3" }, CWO3: { nextAt: 20, nextRank: "CWO4" },
        CWO4: { nextAt: 30, nextRank: null },
      })[r] || null;
    },
    opsToNextPromotion(member) {
      const ops = Number(member?.opsAttended);
      if (!Number.isFinite(ops)) return null;
      const ladder = this.promotionLadderFor(member?.rank);
      if (!ladder || !ladder.nextAt) return null;
      return Math.max(0, ladder.nextAt - ops);
    },
    nextPromotionRank(member) { const ladder = this.promotionLadderFor(member?.rank); return ladder?.nextRank || null; },

    loadMembersCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true, skipEmptyLines: true, header: false,
          complete: (results) => {
            const rows = (results.data || []).slice(2);
            const CERT_COLUMNS = 13;
            const usedUNSCIds = new Set();
            this.members = rows.map((row) => {
              const name = String(row[1] || "").trim(); if (!name) return null;
              const oldId = String(row[4] || "").trim();
              return {
                rank: String(row[0] || "").trim(),
                name,
                joinDate: String(row[3] || "").trim(),
                id: this.makeUNSCId(oldId, name, usedUNSCIds),
                certifications: row.slice(5, 5 + CERT_COLUMNS).map((c) => (String(c || "").trim().toUpperCase() === "Y" ? "Y" : "N")),
                squad: "", fireteam: "", slot: "", opsAttended: 0,
              };
            }).filter(Boolean);
            resolve(this.members);
          },
          error: reject,
        });
      });
    },

    loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true, skipEmptyLines: false, header: false,
          complete: (results) => {
            const rows = results.data || [];
            const findCol = (row, names) => {
              const wanted = names.map((n) => this.normalize(n));
              return row.findIndex((c) => wanted.includes(this.normalize(c)));
            };
            let membershipHeaderRowIndex = -1, memberCol = -1, squadCol = -1;
            for (let i = 0; i < 2; i++) {
              const r = rows[i] || [];
              const m = findCol(r, ["Squad Member"]);
              const s = findCol(r, ["Squads"]);
              if (m !== -1 && s !== -1) { membershipHeaderRowIndex = i; memberCol = m; squadCol = s; break; }
            }
            if (membershipHeaderRowIndex === -1) { resolve([]); return; }

            const KNOWN_ROLE_HEADER_HINTS = [
              "squad roles","role","chalk 1 fireteam 1","chalk 2 fireteam 1","chalk 3 fireteam 1","chalk 4 fireteam 1",
              "broadsword","wyvern","caladrius","ifrit","chalk actual",
            ];

            let slotHeaderRowIndex = -1, slotCol = -1, roleCol = -1;
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
              if (sl !== -1 && rc !== -1) { slotHeaderRowIndex = i; slotCol = sl; roleCol = rc; break; }
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

              m = this.members.find((mem) => {
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
              const singles = ["broadsword","broadsword command","ifrit","wyvern","wyvern air wing","caladrius","chalk actual"];
              if (singles.includes(n)) return { squad: raw.trim(), fireteam: "Element" };
              return null;
            };

            if (slottingAvailable) {
              let currentSquad = "", currentFireteam = "Element";
              for (let i = slotHeaderRowIndex + 1; i < rows.length; i++) {
                const r = rows[i] || [];
                const slotTxt = String(r[slotCol] || "").trim();
                const roleTxt = String(r[roleCol] || "").trim();
                const heading = parseHeading(roleTxt);
                if (heading) { currentSquad = heading.squad; currentFireteam = heading.fireteam || "Element"; continue; }
                if (!currentSquad || !roleTxt) continue;

                const slotNorm = this.normalize(slotTxt);
                if (slotNorm === "vacant" || "closed" === slotNorm) {
                  slotEntries.push({ squad: currentSquad, fireteam: currentFireteam, role: roleTxt, status: slotNorm.toUpperCase(), member: null });
                  continue;
                }

                const mem = slotTxt ? findMemberByLabel(slotTxt) : null;
                if (!mem) continue;
                mem.squad = currentSquad; mem.fireteam = currentFireteam; mem.slot = roleTxt;
                slotEntries.push({ squad: currentSquad, fireteam: currentFireteam, role: roleTxt, status: "FILLED", member: mem });
              }
            }

            const ALWAYS_SQUADS = ["Chalk Actual","Chalk 1","Chalk 2","Chalk 3","Chalk 4","Broadsword Command","Wyvern","Caladrius","Fillers","Recruit","Reserves"];
            const orbatMap = {};
            ALWAYS_SQUADS.forEach((s) => { orbatMap[s] = { squad: s, members: [], fireteams: {} }; });

            this.members.forEach((m) => {
              if (!m.squad) return;
              if (!orbatMap[m.squad]) { orbatMap[m.squad] = { squad: m.squad, members: [], fireteams: {} }; }
              orbatMap[m.squad].members.push(m);
              const ft = (m.fireteam || "").trim();
              const role = (m.slot || "").trim();
              if (ft && role) {
                if (!orbatMap[m.squad].fireteams[ft]) {
                  orbatMap[m.squad].fireteams[ft] = { name: ft, slots: [] };
                }
                const exists = orbatMap[m.squad].fireteams[ft].slots.some(
                  (s) => s.status === "FILLED" && s.member?.id && s.member.id === m.id && s.role === role
                );
                if (!exists) {
                  orbatMap[m.squad].fireteams[ft].slots.push({ role, status: "FILLED", member: m });
                }
              }
            });

            slotEntries.forEach((e) => {
              if (!orbatMap[e.squad]) { orbatMap[e.squad] = { squad: e.squad, members: [], fireteams: {} }; }
              const ftName = e.fireteam || "Element";
              if (!orbatMap[e.squad].fireteams[ftName]) {
                orbatMap[e.squad].fireteams[ftName] = { name: ftName, slots: [] };
              }
              if (e.status === "FILLED" && e.member?.id) {
                const exists = orbatMap[e.squad].fireteams[ftName].slots.some(
                  (s) => s.status === "FILLED" && s.member?.id === e.member.id && s.role === e.role
                );
                if (exists) return;
              }
              orbatMap[e.squad].fireteams[ftName].slots.push({ role: e.role, status: e.status, member: e.member });
            });

            this.orbat = Object.values(orbatMap).map((s) => ({
              squad: s.squad,
              members: (s.members || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")),
              fireteams: Object.values(s.fireteams || {}).map((ft) => ({ name: ft.name, slots: (ft.slots || []).slice() })),
            }));

            resolve(this.orbat);
          },
          error: reject,
        });
      });
    },

    async importMissions(files) {
      const contents = await Promise.all(Object.values(files).map((f) => f()));
      contents.forEach((c) => {
        const l = c.split("\n");
        this.missions.push({ slug: l[0], name: l[1], status: l[2], content: l.slice(3).join("\n") });
      });
    },
    async importEvents(files) {
      const contents = await Promise.all(Object.values(files).map((f) => f()));
      contents.forEach((c) => {
        const l = c.split("\n");
        this.events.push({ title: l[0], location: l[1], time: l[2], thumbnail: l[3], content: l.slice(4).join("\n") });
      });
    },

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
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    },
    pad5(n) { return String(n).padStart(5, "0"); },
    makeUNSCId(oldId, name, used) {
      const initials = this.makeInitials(name);
      let seed = this.hash32(`${oldId}::${name}`);
      let a = seed % 100000;
      let b = ((seed / 100000) >>> 0) % 100000;
      let candidate = `${this.pad5(a)}-${this.pad5(b)}-${initials}`;
      while (used.has(candidate)) {
        seed = (seed + 1) >>> 0; a = seed % 100000; b = ((seed / 100000) >>> 0) % 100000;
        candidate = `${this.pad5(a)}-${this.pad5(b)}-${initials}`;
      }
      used.add(candidate);
      return candidate;
    },
  },
};
</script>

<style>
#app { min-height: 100vh; overflow: hidden !important; }
.login-overlay { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; background: #000; cursor: pointer; opacity: 1; transition: opacity 0.8s ease; }
.login-overlay.fading { opacity: 0; pointer-events: none; }
.admin-login-btn { position: absolute; right: 16px; bottom: 16px; z-index: 1; background: rgba(0, 0, 0, 0.35); color: #e0f0ff; border: 1px solid rgba(30, 144, 255, 0.85); border-radius: 999px; padding: 0.4rem 0.8rem; cursor: pointer; font-family: "Titillium Web", sans-serif; letter-spacing: 0.1em; text-transform: uppercase; }
.admin-login-btn:hover { border-color: #5ab3ff; }
.login-bg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.login-logo { width: min(520px, 70vw); height: auto; opacity: 0.18; filter: drop-shadow(0 0 24px rgba(0, 0, 0, 0.9)); }
.login-text { position: relative; z-index: 1; text-align: center; color: rgba(170, 255, 210, 0.92); font-family: "Titillium Web", sans-serif; letter-spacing: 0.18em; text-transform: uppercase; }
.login-lore { font-size: 14px; margin-bottom: 2.2em; opacity: 0.9; }
.login-warning { font-size: 11px; line-height: 1.8em; opacity: 0.75; margin-bottom: 3em; }
.login-prompt { font-size: 18px; font-weight: 800; letter-spacing: 0.22em; animation: pulse 1.8s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.hud-enter-active { animation: hud-in 420ms ease-out both; }
.hud-leave-active { animation: hud-out 220ms ease-in both; }
@keyframes hud-in { 0%{opacity:0;transform:translate3d(0,0,0);filter:blur(2px);} 35%{opacity:.75;transform:translate3d(1px,-1px,0);filter:blur(1px);} 55%{transform:translate3d(-1px,1px,0);} 70%{transform:translate3d(1px,0,0);} 100%{opacity:1;transform:translate3d(0,0,0);filter:blur(0);} }
@keyframes hud-out { 0%{opacity:1;transform:translate3d(0,0,0);filter:blur(0);} 100%{opacity:0;transform:translate3d(0,2px,0);filter:blur(2px);} }
</style>
