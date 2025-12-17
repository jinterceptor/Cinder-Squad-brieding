<!-- src/views/admin/AdminHome.vue -->
<template>
  <section id="admin" class="section-container">
    <!-- Header -->
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/protocol.svg" alt="Admin Icon" />
        <h1>Admin</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <!-- Session gate -->
      <AdminLoginModal
        v-if="!isAuthed"
        :show="true"
        @success="onLoginSuccess"
        @close="onLoginClose"
      />

      <!-- Workspace -->
      <div v-else class="admin-frame">
        <!-- LEFT: Menu rail with preview cards -->
        <aside class="rail">
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
        </aside>

        <!-- RIGHT: Panels -->
        <main class="panels">
          <!-- Promotions Panel -->
          <div v-if="activeKey === 'promotions'" class="panel">
            <div class="panel-header">
              <h2>Promotions Overview</h2>
              <div class="panel-actions">
                <button class="btn-sm" @click="refreshData">Refresh</button>
              </div>
            </div>

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

              <div
                v-for="row in promotionsTable"
                :key="row.id"
                class="tr"
              >
                <span class="td name">{{ row.name }}</span>
                <span class="td rank">{{ row.rank }}</span>
                <span class="td squad">{{ row.squad }}</span>
                <span class="td ops">
                  <span v-if="isFiniteNum(row.ops)">{{ row.ops }}</span>
                  <span v-else class="muted">N/A</span>
                </span>
                <span class="td next">
                  <span v-if="row.nextRank">{{ row.nextRank }} <small v-if="row.nextAt">({{ row.nextAt }})</small></span>
                  <span v-else class="muted">—</span>
                </span>
                <span class="td prog">
                  <div class="bar" :class="{ done: row.opsToNext === 0 && row.nextRank }">
                    <div class="fill" :style="{ width: (row.progress ?? 0) + '%' }"></div>
                  </div>
                </span>
                <span class="td act">
                  <button class="btn-sm" v-if="row.opsToNext === 0 && row.nextRank" @click="markPromoted(row)">
                    Mark Promoted
                  </button>
                  <button class="btn-sm. ghost" @click="openMember(row)">Open</button>
                </span>
              </div>
            </div>
          </div>

          <!-- Roster Audits (stub) -->
          <div v-else-if="activeKey === 'audits'" class="panel">
            <div class="panel-header"><h2>Roster Audits</h2></div>
            <div class="empty">Coming soon. This is a stub to demonstrate future admin pages.</div>
          </div>

          <!-- Placeholder for future panels -->
          <div v-else class="panel">
            <div class="panel-header"><h2>Coming soon</h2></div>
            <p class="muted">Select a tool from the left.</p>
          </div>
        </main>
      </div>
    </div>
  </section>
</template>

<script>
import AdminLoginModal from "@/components/modals/AdminLoginModal.vue";

const SESSION_KEY = "admin-authed";

export default {
  name: "AdminHome",
  components: { AdminLoginModal },
  data() {
    return {
      isAuthed: false,
      activeKey: "promotions",

      // filters
      search: "",
      selectedSquad: "__ALL__",
      sortKey: "rank",
      onlyPromotable: false,

      // rank sort order
      rankOrderHighToLow: [
        "MAJ","CAPT","1STLT","2NDLT",
        "CWO5","CWO4","CWO3","CWO2","WO",
        "GYSGT","SSGT","SGT","CPL","LCPL",
        "SPC4","SPC3","SPC2","SPC","PFC","PVT",
        "HA"
      ],

      // demo data (replace with API wiring)
      members: [
        { id: 1, name: "J. Frost", rank: "CPL", squad: "Alpha", opsAttended: 8 },
        { id: 2, name: "R. Hart", rank: "LCPL", squad: "Alpha", opsAttended: 3 },
        { id: 3, name: "M. Ruiz", rank: "SPC3", squad: "Bravo", opsAttended: 5 },
        { id: 4, name: "T. Wells", rank: "PFC", squad: "Bravo", opsAttended: 2 },
        { id: 5, name: "S. King", rank: "SGT", squad: "HQ", opsAttended: 12 },
      ],
      orbat: [
        { squad: "HQ" },
        { squad: "Alpha" },
        { squad: "Bravo" },
      ],
    };
  },
  created() {
    try { this.isAuthed = window.sessionStorage.getItem(SESSION_KEY) === "true"; }
    catch { this.isAuthed = false; }
  },
  computed: {
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
        {
          key: "audits",
          title: "Roster Audits",
          icon: "/icons/list.svg",
          preview: [],
        },
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

    rankKey() {
      // returns a function for template/calc usage
      const alias = {
        PRIVATE: "PVT", PVT: "PVT",
        PRIVATEFIRSTCLASS: "PFC", PFC: "PFC",
        SPECIALIST: "SPC", SPC: "SPC",
        SPECIALIST2: "SPC2", SPC2: "SPC2",
        SPECIALIST3: "SPC3", SPC3: "SPC3",
        SPECIALIST4: "SPC4", SPC4: "SPC4",
        HOSPITALMANAPPRENTICE: "HA", HA: "HA",
        LANCECORPORAL: "LCPL", LCPL: "LCPL",
        CORPORAL: "CPL", CPL: "CPL",
        SERGEANT: "SGT", SGT: "SGT",
        STAFFSERGEANT: "SSGT", SSGT: "SSGT",
        GUNNYSERGEANT: "GYSGT", GYSGT: "GYSGT",
        WARRANTOFFICER: "WO", WO: "WO",
        CHIEFWARRANTOFFICER2: "CWO2", CWO2: "CWO2",
        CHIEFWARRANTOFFICER3: "CWO3", CWO3: "CWO3",
        CHIEFWARRANTOFFICER4: "CWO4", CWO4: "CWO4",
        CHIEFWARRANTOFFICER5: "CWO5", CWO5: "CWO5",
        SECONDLIEUTENANT: "2NDLT", "2NDLT": "2NDLT",
        FIRSTLIEUTENANT: "1STLT", "1STLT": "1STLT",
        CAPTAIN: "CAPT", CAPT: "CAPT",
        MAJOR: "MAJ", MAJ: "MAJ",
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
        GYSGT:{ nextAt: null, nextRank: null },

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
    // Auth wiring
    setAuthed(v) {
      this.isAuthed = !!v;
      try { window.sessionStorage.setItem(SESSION_KEY, this.isAuthed ? "true" : "false"); } catch {}
    },
    onLoginSuccess(code) {
      // Accept "150th" (case-insensitive, trimmed)
      const ok = String(code || "").trim().toLowerCase() === "150th";
      if (ok) this.setAuthed(true);
      else alert("Invalid unit code."); // keep modal open
    },
    onLoginClose() {
      // Keep modal if not authed; do nothing here.
    },

    // Actions
    refreshData() {
      // Stub: replace with real fetch
      console.log("Refresh requested");
    },
    markPromoted(row) {
      // Why: feedback until wired to backend
      alert(`${row.name} marked as promoted to ${row.nextRank}. (Stub)`);
    },
    openMember(row) {
      console.log("Open member (stub):", row);
    },

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

/* Frame */
.admin-frame {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: .8rem;
}

/* Rail */
.rail { display: grid; gap: .6rem; align-content: start; }
.rail-card {
  text-align: left;
  border: 1px solid rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.35);
  border-radius: .5rem;
  padding: .6rem;
  cursor: pointer;
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

/* Panels */
.panels { display: grid; gap: .8rem; }
.panel {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.25);
  border-radius: .5rem;
  padding: .6rem;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: .6rem;
}
.panel-actions { display: flex; gap: .4rem; }
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

/* Filters */
.filters { border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; padding: .5rem; margin-bottom: .6rem; }
.filters .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: .6rem; align-items: end; }
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

/* Summary chips */
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

/* table columns */
.td.name, .th.name { text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
.td.rank, .th.rank { text-align: left; }
.td.squad, .th.squad { text-align: left; }
.td.ops, .th.ops { text-align: right; }
.td.next, .th.next { text-align: left; }
.td.prog, .th.prog { }
.td.act, .th.act { text-align: right; }

/* progress bar */
.bar {
  height: 8px;
  background: rgba(0,10,30,0.35);
  border: 1px solid rgba(30,144,255,0.35);
  border-radius: 999px;
  position: relative;
  overflow: hidden;
}
.bar .fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 0%; transition: width .25s ease;
  background: rgba(120,200,255,0.6);
}
.bar.done .fill { background: rgba(120,255,170,0.7); }

/* Misc */
.empty { padding: .7rem .8rem; color: #9ec5e6; }
.muted { color: #9ec5e6; }

/* Responsive */
@media (max-width: 980px) {
  .admin-frame { grid-template-columns: 1fr; }
  .rail { grid-auto-flow: column; grid-auto-columns: minmax(260px, 1fr); overflow-x: auto; }
}
</style>
