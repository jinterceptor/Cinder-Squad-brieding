<!-- src/views/admin/AdminHome.vue -->
<template>
  <section id="admin" class="section-container">
    <!-- Top banner -->
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/protocol.svg" alt="Admin Icon" />
        <h1>Admin</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <!-- Two-window desktop: left (list/login), right (main content) -->
      <div class="admin-desktop">
        <!-- LEFT WINDOW -->
        <div class="window window--nav">
          <div class="window-titlebar">
            <div class="window-title">
              <span class="dot"></span> Admin
            </div>
          </div>

          <div class="window-content">
            <!-- Login card (top-left) -->
            <div v-if="!isAuthed" class="login-card">
              <div class="login-head">
                <img src="/icons/protocol.svg" alt="" class="rail-icon" />
                <div class="rail-title">Admin Access</div>
              </div>
              <label class="control">
                <span>Password</span>
                <input
                  type="password"
                  v-model="passwordInput"
                  placeholder="Enter unit password"
                  @keyup.enter="tryLogin"
                />
              </label>
              <button class="btn-sm" @click="tryLogin">Log in</button>
              <p v-if="loginError" class="login-error">{{ loginError }}</p>
            </div>

            <!-- Tiles (only when authed) -->
            <template v-else>
              <button
                v-for="s in sections"
                :key="s.key"
                class="rail-card"
                :class="{ active: activeKey === s.key }"
                @click="activeKey = s.key"
              >
                <div class="rail-card-head">
                  <img :src="s.icon" class="rail-icon" alt="" />
                  <div class="rail-title">{{ s.title }}</div>
                </div>

                <div v-if="s.preview && s.preview.length" class="rail-card-body">
                  <div v-for="line in s.preview" :key="line.label" class="rail-line">
                    <span class="label">{{ line.label }}</span>
                    <span class="pill" :class="line.kind">{{ line.value }}</span>
                  </div>
                  <div class="rail-foot">Click to open</div>
                </div>
              </button>
            </template>
          </div>
        </div>

        <!-- RIGHT WINDOW (MAIN) -->
        <div class="window window--main">
          <div class="window-titlebar">
            <div class="window-title">
              <span class="dot"></span>
              {{ windowTitle }}
            </div>
            <div class="window-actions">
              <button
                v-if="isAuthed && activeKey === 'promotions'"
                class="btn-sm"
                @click="refreshData"
              >
                Refresh
              </button>
              <button
                v-if="isAuthed"
                class="btn-sm ghost"
                @click="logout"
              >
                Logout
              </button>
            </div>
          </div>

          <div class="window-content">
            <!-- Locked -->
            <div v-if="!isAuthed">
              <p class="muted">Enter the admin password in the left window to continue.</p>
            </div>

            <!-- Promotions -->
            <div v-else-if="activeKey === 'promotions'">
              <!-- Filters -->
              <div class="filters">
                <div class="row">
                  <label class="control">
                    <span>Search</span>
                    <input type="text" v-model="search" placeholder="Name, rank, squad" />
                  </label>

                  <label class="control">
                    <span>Squad</span>
                    <select v-model="selectedSquad">
                      <option value="__ALL__">All squads</option>
                      <option v-for="s in squads" :key="s" :value="s">{{ s }}</option>
                    </select>
                  </label>

                  <label class="control">
                    <span>Sort by</span>
                    <select v-model="sortKey">
                      <option value="rank">Rank (high→low)</option>
                      <option value="ops">Ops attended</option>
                      <option value="progress">Progress to next rank</option>
                      <option value="name">Name (A→Z)</option>
                    </select>
                  </label>

                  <label class="control chk">
                    <input type="checkbox" v-model="onlyPromotable" />
                    Promotable only
                  </label>
                </div>
              </div>

              <!-- Summary chips -->
              <div class="chips">
                <span class="chip">Total: {{ promotionsTable.length }}</span>
                <span class="chip ok">Eligible now: {{ eligibleNowCount }}</span>
                <span class="chip warn">Imminent (≤3): {{ imminentCount }}</span>
              </div>

              <!-- Table -->
              <div class="table">
                <div class="tr head">
                  <span class="th name">Name</span>
                  <span class="th rank">Rank</span>
                  <span class="th squad">Squad</span>
                  <span class="th ops">Ops</span>
                  <span class="th next">Next Rank</span>
                  <span class="th prog">Progress</span>
                  <span class="th act">Actions</span>
                </div>

                <div v-for="row in promotionsTable" :key="row.id" class="tr">
                  <span class="td name">{{ row.name }}</span>
                  <span class="td rank">{{ row.rank }}</span>
                  <span class="td squad">{{ row.squad }}</span>
                  <span class="td ops">
                    <span v-if="isFiniteNum(row.ops)">{{ row.ops }}</span>
                    <span v-else class="muted">N/A</span>
                  </span>
                  <span class="td next">
                    <span v-if="row.nextRank">
                      {{ row.nextRank }} <small v-if="row.nextAt">({{ row.nextAt }})</small>
                    </span>
                    <span v-else class="muted">—</span>
                  </span>
                  <span class="td prog">
                    <div class="bar" :class="{ done: row.opsToNext === 0 && row.nextRank }">
                      <div class="fill" :style="{ width: (row.progress ?? 0) + '%' }"></div>
                    </div>
                  </span>
                  <span class="td act">
                    <button
                      class="btn-sm"
                      v-if="row.opsToNext === 0 && row.nextRank"
                      @click="markPromoted(row)"
                    >
                      Mark Promoted
                    </button>
                    <button class="btn-sm ghost" @click="openMember(row)">Open</button>
                  </span>
                </div>
              </div>
            </div>

            <!-- Audits (stub) -->
            <div v-else-if="activeKey === 'audits'">
              <div class="empty">Coming soon. This is a stub to demonstrate future admin pages.</div>
            </div>

            <!-- Future -->
            <div v-else>
              <p class="muted">Select a tool from the left.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: "AdminHome",
  data() {
    return {
      // auth
      isAuthed: false,
      passwordInput: "",
      loginError: "",
      activeKey: "promotions",

      // filters
      search: "",
      selectedSquad: "__ALL__",
      sortKey: "rank",
      onlyPromotable: false,

      // rank order
      rankOrderHighToLow: [
        "MAJ","CAPT","1STLT","2NDLT",
        "CWO5","CWO4","CWO3","CWO2","WO",
        "GYSGT","SSGT","SGT","CPL","LCPL",
        "SPC4","SPC3","SPC2","SPC","PFC","PVT",
        "HA"
      ],

      // demo data
      members: [
        { id: 1, name: "J. Frost", rank: "CPL", squad: "Alpha", opsAttended: 8 },
        { id: 2, name: "R. Hart", rank: "LCPL", squad: "Alpha", opsAttended: 3 },
        { id: 3, name: "M. Ruiz", rank: "SPC3", squad: "Bravo", opsAttended: 5 },
        { id: 4, name: "T. Wells", rank: "PFC", squad: "Bravo", opsAttended: 2 },
        { id: 5, name: "S. King", rank: "SGT", squad: "HQ", opsAttended: 12 },
      ],
      orbat: [{ squad: "HQ" }, { squad: "Alpha" }, { squad: "Bravo" }],
    };
  },
  created() {
    // Always require fresh login on reload; clear any previous flags.
    try {
      localStorage.removeItem("admin-auth");
      sessionStorage.removeItem("admin-authed");
    } catch {}
  },
  computed: {
    windowTitle() {
      if (!this.isAuthed) return "Locked";
      return { promotions: "Promotions Overview", audits: "Roster Audits" }[this.activeKey] || "Admin Tools";
    },
    sections() {
      return [
        {
          key: "promotions",
          title: "Promotions Overview",
          icon: "/icons/protocol.svg",
          preview: [
            { label: "Eligible now", value: this.eligibleNowCount, kind: "ok" },
            { label: "Imminent (≤3)", value: this.imminentCount, kind: "warn" },
          ],
        },
        // Reuse existing icon to avoid missing assets
        { key: "audits", title: "Roster Audits", icon: "/icons/protocol.svg", preview: [] },
      ];
    },
    squads() {
      const set = new Set();
      (this.members || []).forEach(m => { const s = (m.squad || "").trim(); if (s) set.add(s); });
      (this.orbat || []).forEach(sq => { const s = (sq.squad || "").trim(); if (s) set.add(s); });
      return Array.from(set).sort((a,b)=>a.localeCompare(b));
    },
    attendanceMap() {
      const map = Object.create(null);
      (this.members || []).forEach(m => {
        const ops = Number(m.opsAttended);
        if (Number.isFinite(ops)) {
          map[m.id] = ops;
          const key = (m.name || "").trim().toLowerCase();
          if (key) map[key] = ops;
        }
      });
      return map;
    },
    promotionsTable() {
      const term = (this.search || "").trim().toLowerCase();
      const squad = this.selectedSquad;
      const onlyProm = !!this.onlyPromotable;

      const rows = [];
      for (const m of (this.members || [])) {
        if (term) {
          const hit =
            (m.name || "").toLowerCase().includes(term) ||
            (m.rank || "").toLowerCase().includes(term) ||
            (m.squad || "").toLowerCase().includes(term);
          if (!hit) continue;
        }
        if (squad && squad !== "__ALL__" && (m.squad || "") !== squad) continue;

        const ladder = this.promotionLadderFor(m.rank);
        const nextRank = ladder?.nextRank ?? null;
        const nextAt = ladder?.nextAt ?? null;

        const ops = this.attendanceMap[m.id];
        const opsToNext = Number.isFinite(ops) && Number.isFinite(nextAt) ? Math.max(0, nextAt - ops) : null;

        let progress = 0;
        if (nextAt !== null && Number.isFinite(ops)) {
          progress = Math.min(100, Math.max(0, Math.round((ops / nextAt) * 100)));
        }

        rows.push({
          id: m.id,
          name: m.name || "Unknown",
          rank: m.rank || "N/A",
          rankScore: this.rankScore(m?.rank),
          squad: m.squad || "",
          ops: Number.isFinite(ops) ? ops : null,
          nextRank,
          nextAt,
          progress,
          opsToNext,
        });
      }

      const filtered = onlyProm ? rows.filter(r => r.opsToNext === 0 && !!r.nextRank) : rows;

      const sorter = {
        rank: (a,b) => a.rankScore - b.rankScore,
        ops: (a,b) => (b.ops ?? -Infinity) - (a.ops ?? -Infinity),
        progress: (a,b) => (b.progress ?? -Infinity) - (a.progress ?? -Infinity),
        name: (a,b) => a.name.localeCompare(b.name),
      }[this.sortKey] || ((a,b)=>0);

      return filtered.sort(sorter);
    },
    eligibleNowCount() {
      return this.promotionsTable.filter(r => r.opsToNext === 0 && !!r.nextRank).length;
    },
    imminentCount() {
      return this.promotionsTable.filter(r => Number.isFinite(r.opsToNext) && r.opsToNext > 0 && r.opsToNext <= 3).length;
    },

    // rank helpers
    rankKey() {
      const alias = {
        PRIVATE: "PVT", PFC: "PFC", SPC: "SPC", SPC2: "SPC2", SPC3: "SPC3", SPC4: "SPC4",
        LCPL: "LCPL", CPL: "CPL", SGT: "SGT", SSGT: "SSGT", GYSGT: "GYSGT",
        WO: "WO", CWO2: "CWO2", CWO3: "CWO3", CWO4: "CWO4", CWO5: "CWO5",
        "2NDLT": "2NDLT", "1STLT": "1STLT", CAPT: "CAPT", MAJ: "MAJ", HA: "HA",
      };
      return (rank) => {
        if (!rank) return "";
        const k = (rank || "").toUpperCase().replace(/\s+/g, "");
        return alias[k] || k;
      };
    },
    rankScore() {
      return (rank) => {
        const k = this.rankKey(rank);
        const aliasWO = { WO: "WO", CWO2: "CWO2", CWO3: "CWO3", CWO4: "CWO4", CWO5: "CWO5" };
        const rk = aliasWO[k] || k;
        const idx = this.rankOrderHighToLow.indexOf(rk);
        return idx === -1 ? 999 : idx;
      };
    },
    promotionLadderFor() {
      const ladders = {
        PVT:  { nextAt: 2, nextRank: "PFC" },
        PFC:  { nextAt: 4, nextRank: "SPC" },
        SPC:  { nextAt: 6, nextRank: "LCPL" },
        LCPL: { nextAt: 8, nextRank: "CPL" },
        CPL:  { nextAt: 10, nextRank: "SGT" },
        SGT:  { nextAt: 12, nextRank: "SSGT" },
        SSGT: { nextAt: 14, nextRank: "GYSGT" },
        GYSGT: { nextAt: null, nextRank: null },

        WO:   { nextAt: 8, nextRank: "CWO2" },
        CWO2: { nextAt: 12, nextRank: "CWO3" },
        CWO3: { nextAt: 16, nextRank: "CWO4" },
        CWO4: { nextAt: 20, nextRank: "CWO5" },
        CWO5: { nextAt: null, nextRank: null },

        "2NDLT": { nextAt: null, nextRank: "1STLT" },
        "1STLT": { nextAt: null, nextRank: "CAPT" },
        CAPT:    { nextAt: null, nextRank: "MAJ" },
        MAJ:     { nextAt: null, nextRank: null },
      };
      return (rank) => ladders[this.rankKey(rank)] || null;
    },
  },
  methods: {
    // Auth (runtime only)
    tryLogin() {
      const code = String(this.passwordInput || "").trim().toLowerCase();
      if (!code) { this.loginError = "Please enter the password."; return; }
      if (code === "150th") {
        this.isAuthed = true;
        this.passwordInput = "";
        this.loginError = "";
      } else {
        this.loginError = "Invalid password.";
      }
    },
    logout() {
      this.isAuthed = false;
      this.activeKey = "promotions";
      this.passwordInput = "";
      this.loginError = "";
    },

    // Actions
    refreshData() { console.log("Refresh requested"); },
    markPromoted(row) { alert(`${row.name} marked as promoted to ${row.nextRank}. (Stub)`); },
    openMember(row) { console.log("Open member (stub):", row); },

    // Utils
    isFiniteNum(v) { return Number.isFinite(v); },
  },
};
</script>

<style scoped>
/* Shell */
.section-container { display: grid; gap: .75rem; }
.section-header { display: flex; align-items: center; gap: .6rem; }
.section-header img { width: 28px; height: 28px; }
.section-content-container { padding: .8rem; }

.rhombus-back {
  height: 6px;
  background: repeating-linear-gradient(
    45deg,
    rgba(30,144,255,.2) 0px,
    rgba(30,144,255,.2) 10px,
    transparent 10px,
    transparent 20px
  );
}
.clipped-medium-backward {
  clip-path: polygon(0 0, 100% 0, 92% 100%, 0% 100%);
  background: linear-gradient(90deg, rgba(5,20,40,.85), rgba(5,20,40,.5));
  padding: .4rem .75rem;
  border: 1px solid rgba(30,144,255,.35);
  border-left-width: 0;
  border-radius: 0 .35rem .35rem 0;
}

/* Desktop layout: two windows */
.admin-desktop {
  display: grid;
  grid-template-columns: 340px 1fr; /* left narrow, right majority */
  gap: .9rem;
  min-height: calc(100vh - 52px - 24px);
}

/* Window shell */
.window {
  border: 1px solid rgba(30,144,255,0.45);
  background: rgba(0,10,30,0.25);
  border-radius: .6rem;
  box-shadow: 0 6px 28px rgba(0,0,0,.35);
  display: flex;
  flex-direction: column;
  min-height: 0; /* flex overflow fix */
}
.window--nav { max-height: 100%; }
.window--main { max-height: 100%; }

.window-titlebar {
  display: flex; align-items: center; justify-content: space-between;
  padding: .5rem .65rem;
  background: linear-gradient(180deg, rgba(5,20,40,.75), rgba(5,20,40,.6));
  border-bottom: 1px solid rgba(30,144,255,0.35);
  border-radius: .6rem .6rem 0 0;
}
.window-title { display: flex; align-items: center; gap: .45rem; font-weight: 600; }
.window-title .dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(120,200,255,.9);
  box-shadow: 0 0 8px rgba(120,200,255,.9);
}
.window-actions { display: flex; gap: .4rem; }

.window-content {
  padding: .6rem;
  overflow: auto;           /* each window scrolls independently */
  flex: 1 1 auto;
}

/* Rail / tiles */
.rail-card {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.35);
  border-radius: .5rem;
  padding: .6rem;
  cursor: pointer;
  margin-bottom: .55rem;
}
.rail-card.active { border-color: rgba(120,255,170,0.7); }
.rail-card-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .35rem; }
.rail-icon { width: 20px; height: 20px; }
.rail-title { font-weight: 600; }
.rail-card-body { display: grid; gap: .25rem; }
.rail-line { display: flex; align-items: center; justify-content: space-between; }
.pill {
  font-size: .85rem;
  border: 1px solid rgba(30,144,255,.45);
  border-radius: 999px;
  padding: .05rem .5rem;
}
.pill.ok { border-color: rgba(120,255,170,0.7); }
.pill.warn { border-color: rgba(255,190,80,0.7); }
.rail-foot { margin-top: .25rem; font-size: .8rem; color: #9ec5e6; }

/* Login card */
.login-card {
  border: 1px solid rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.35);
  border-radius: .5rem;
  padding: .6rem;
  display: grid;
  gap: .5rem;
  margin-bottom: .6rem;
}
.login-head { display: flex; align-items: center; gap: .5rem; }
.login-error { color: #ffb080; margin: .2rem 0 0; }

/* Controls */
.btn-sm {
  font-size: .85rem;
  padding: .25rem .5rem;
  border-radius: .35rem;
  border: 1px solid rgba(30,144,255,0.45);
  background: rgba(0,10,30,0.25);
  color: #cfe6ff;
  cursor: pointer;
}
.btn-sm.ghost { background: transparent; border-color: rgba(30,144,255,0.45); }

.control { display: grid; gap: .2rem; }
.control span { font-size: .85rem; color: #9ec5e6; }
.control input, .control select {
  background: rgba(0,10,30,0.3);
  border: 1px solid rgba(30,144,255,0.35);
  border-radius: .35rem;
  padding: .35rem .45rem;
  color: #cfe6ff;
}
.control.chk { align-items: center; grid-auto-flow: column; gap: .35rem; }

/* Filters */
.filters { border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; padding: .5rem; margin-bottom: .6rem; }
.filters .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: .6rem; align-items: end; }

/* Chips */
.chips { display: flex; gap: .45rem; margin-bottom: .55rem; flex-wrap: wrap; }
.chip {
  padding: .25rem .5rem;
  border-radius: 999px;
  background: rgba(0,10,30,0.25);
  border: 1px solid rgba(30,144,255,.45);
  color: #cfe6ff;
  font-size: .85rem;
}
.chip.ok { border-color: rgba(120,255,170,0.7); }
.chip.warn { border-color: rgba(255,190,80,0.7); }

/* Table */
.table { border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; overflow: hidden; }
.tr { display: grid; grid-template-columns: 1.6fr .8fr 1fr .6fr .9fr 1.2fr .9fr; align-items: center; }
.tr.head { background: rgba(0,10,30,0.35); font-weight: 600; }
.th, .td { padding: .4rem .5rem; border-bottom: 1px dashed rgba(30,144,255,0.25); }
.tr:last-child .td { border-bottom: 0; }
.td .muted { color: #9ec5e6; }

/* Progress */
.bar { height: 8px; background: rgba(0,10,30,0.35); border: 1px solid rgba(30,144,255,0.35); border-radius: 999px; position: relative; overflow: hidden; }
.bar .fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0%; transition: width .25s ease; background: rgba(120,200,255,0.6); }
.bar.done .fill { background: rgba(120,255,170,0.7); }

/* Misc */
.empty { padding: .7rem .8rem; color: #9ec5e6; }
.muted { color: #9ec5e6; }

/* Responsive */
@media (max-width: 980px) {
  .admin-desktop { grid-template-columns: 1fr; }
  .window--nav { order: 2; }
  .window--main { order: 1; }
}
</style>
