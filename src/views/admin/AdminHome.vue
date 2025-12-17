<!-- src/views/AdminView.vue -->
<template>
  <section id="admin" class="section-container">
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/protocol.svg" alt="Admin Icon" />
        <h1>Admin</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <!-- Session login gate -->
      <AdminLoginModal
        v-if="!isAuthed"
        :show="true"
        @success="onLoginSuccess"
        @close="onLoginClose"
      />

      <!-- Admin workspace -->
      <div v-else class="admin-layout">
        <!-- LEFT: Admin menu -->
        <aside class="admin-menu">
          <div
            v-for="item in menuItems"
            :key="item.key"
            class="admin-menu-item"
            :class="{ active: activeKey === item.key }"
            @click="activeKey = item.key"
          >
            <img :src="item.icon" class="menu-icon" :alt="item.title + ' icon'" />
            <div class="menu-meta">
              <div class="menu-title">{{ item.title }}</div>
              <div class="menu-desc">{{ item.desc }}</div>
            </div>
          </div>
        </aside>

        <!-- RIGHT: Content pane -->
        <main class="admin-main">
          <!-- PROMOTIONS OVERVIEW -->
          <div v-if="activeKey === 'promotions'" class="panel">
            <div class="panel-header">
              <h2>Promotions Overview</h2>
              <div class="panel-actions">
                <input
                  v-model="search"
                  class="search-input"
                  type="text"
                  placeholder="Search member..."
                  aria-label="Search member"
                />
                <select v-model="selectedSquad" class="control">
                  <option value="__ALL__">All Squads</option>
                  <option v-for="s in squads" :key="s" :value="s">{{ s }}</option>
                </select>
                <select v-model="sortKey" class="control">
                  <option value="rank">Sort: Rank (high→low)</option>
                  <option value="closest">Sort: Closest to Promotion</option>
                  <option value="ops">Sort: Total Ops (high→low)</option>
                  <option value="name">Sort: Name (A→Z)</option>
                  <option value="squad">Sort: Squad (A→Z)</option>
                </select>
                <label class="chk">
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
              <div class="thead">
                <span class="th name">Member</span>
                <span class="th rank">Rank</span>
                <span class="th squad">Squad</span>
                <span class="th ops">Ops</span>
                <span class="th next">Next Rank</span>
                <span class="th to">To Next</span>
                <span class="th prog">Progress</span>
                <span class="th act">Actions</span>
              </div>

              <div v-if="!promotionsTable.length" class="empty">
                No members match your filters.
              </div>

              <div
                v-for="row in promotionsTable"
                :key="row.id || row.name"
                class="tr"
                :class="{
                  eligible: row.opsToNext === 0 && row.nextRank,
                  imminent: row.opsToNext > 0 && row.opsToNext <= 3
                }"
              >
                <span class="td name" :title="row.name">{{ row.name }}</span>
                <span class="td rank">{{ row.rank || 'N/A' }}</span>
                <span class="td squad">{{ row.squad || '—' }}</span>
                <span class="td ops">{{ isFiniteNum(row.ops) ? row.ops : '—' }}</span>
                <span class="td next">{{ row.nextRank || '—' }}</span>
                <span class="td to">
                  <template v-if="row.nextAt !== null">
                    <span v-if="isFiniteNum(row.opsToNext)">{{ row.opsToNext }}</span>
                    <span v-else>—</span>
                  </template>
                  <template v-else>—</template>
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
                  <button class="btn-sm ghost" @click="openMember(row)">Open</button>
                </span>
              </div>
            </div>
          </div>

          <!-- Mission Content (placeholder) -->
          <div v-else-if="activeKey === 'missioncms'" class="panel">
            <div class="panel-header">
              <h2>Mission Content</h2>
            </div>
            <p class="muted">Coming soon: edit Current Assignment & Mission Log entries.</p>
          </div>

          <!-- Roster Tools (placeholder) -->
          <div v-else-if="activeKey === 'roster'" class="panel">
            <div class="panel-header">
              <h2>Roster Tools</h2>
            </div>
            <p class="muted">Coming soon: import/export roster, attendance checks.</p>
          </div>
        </main>
      </div>
    </div>
  </section>
</template>

<script>
import AdminLoginModal from "@/components/modals/AdminLoginModal.vue";

const SESSION_KEY = "adminAuthed";

export default {
  name: "AdminView",
  components: { AdminLoginModal },
  props: {
    members: { type: Array, default: () => [] },
    attendance: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
  },
  data() {
    return {
      isAuthed: false,
      activeKey: "promotions",
      search: "",
      selectedSquad: "__ALL__",
      sortKey: "rank",
      onlyPromotable: false,
      menuItems: [
        {
          key: "promotions",
          title: "Promotions Overview",
          desc: "Full unit list, progress to next rank",
          icon: "/icons/protocol.svg",
        },
        {
          key: "missioncms",
          title: "Mission Content",
          desc: "Edit Current Assignment & Mission Log",
          icon: "/icons/campaign.svg",
        },
        {
          key: "roster",
          title: "Roster Tools",
          desc: "Import/Export roster and attendance",
          icon: "/icons/license.svg",
        },
      ],
      rankOrderHighToLow: [
        "MAJ","CAPT","1STLT","2NDLT",
        "CWO5","CWO4","CWO3","CWO2","WO",
        "GYSGT","SSGT","SGT","CPL","LCPL",
        "SPC4","SPC3","SPC2","SPC","PFC","PVT","RCT",
        "HMC","HM1","HM2","HM3","HN","HA","HR",
      ],
    };
  },
  created() {
    try {
      this.isAuthed = window.sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      this.isAuthed = false;
    }
  },
  computed: {
    squads() {
      const set = new Set();
      (this.members || []).forEach(m => {
        const s = (m.squad || "").trim();
        if (s) set.add(s);
      });
      // also pick up from orbat
      (this.orbat || []).forEach(sq => {
        const s = (sq.squad || "").trim();
        if (s) set.add(s);
      });
      return Array.from(set).sort((a,b)=>a.localeCompare(b));
    },
    attendanceMap() {
      const map = Object.create(null);
      (this.members || []).forEach(m => {
        const ops = Number(m.opsAttended);
        if (Number.isFinite(ops)) {
          if (m.id) map[`ID:${m.id}`] = ops;
          if (m.name) map[`NM:${this.nameKey(m.name)}`] = ops;
        }
      });
      (this.attendance || []).forEach(row => {
        const ops = Number(row?.ops ?? row?.attended ?? row?.value);
        if (!Number.isFinite(ops)) return;
        if (row?.id) map[`ID:${row.id}`] = ops;
        if (row?.name) map[`NM:${this.nameKey(row.name)}`] = ops;
      });
      return map;
    },
    promotionsRows() {
      const rows = [];
      (this.members || []).forEach((m) => {
        const ops = this.getOps(m);
        const ladder = this.promotionLadderFor(m?.rank);
        const nextRank = ladder?.nextRank ?? null;
        const nextAt = Number.isFinite(ladder?.nextAt) ? ladder.nextAt : null;
        const opsToNext = (nextAt !== null && Number.isFinite(ops)) ? Math.max(0, nextAt - ops) : null;
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
          opsToNext,
          progress: Number.isFinite(progress) ? progress : 0,
        });
      });
      return rows;
    },
    promotionsTable() {
      // filter
      const q = this.search.trim().toLowerCase();
      const rows = this.promotionsRows.filter(r => {
        if (this.onlyPromotable && (r.nextAt === null)) return false;
        if (this.selectedSquad !== "__ALL__" && String(r.squad || "") !== this.selectedSquad) return false;
        if (!q) return true;
        return (
          String(r.name).toLowerCase().includes(q) ||
          String(r.rank).toLowerCase().includes(q) ||
          String(r.squad).toLowerCase().includes(q) ||
          String(r.nextRank || "").toLowerCase().includes(q)
        );
      });

      // sort
      const byRank = (a, b) => a.rankScore - b.rankScore || a.name.localeCompare(b.name);
      const byClosest = (a, b) => {
        const ax = (a.opsToNext === null ? 1e9 : a.opsToNext);
        const bx = (b.opsToNext === null ? 1e9 : b.opsToNext);
        if (ax !== bx) return ax - bx;
        // tie-break: higher rank first
        if (a.rankScore !== b.rankScore) return a.rankScore - b.rankScore;
        // then higher ops
        if ((b.ops ?? -1) !== (a.ops ?? -1)) return (b.ops ?? -1) - (a.ops ?? -1);
        return a.name.localeCompare(b.name);
      };
      const byOps = (a, b) => (b.ops ?? -1) - (a.ops ?? -1) || byRank(a, b);
      const byName = (a, b) => a.name.localeCompare(b.name);
      const bySquad = (a, b) => String(a.squad).localeCompare(String(b.squad)) || byRank(a, b);

      const sorter = {
        rank: byRank,
        closest: byClosest,
        ops: byOps,
        name: byName,
        squad: bySquad,
      }[this.sortKey] || byRank;

      return rows.slice().sort(sorter);
    },
    eligibleNowCount() {
      return this.promotionsTable.filter(r => r.opsToNext === 0 && r.nextRank).length;
    },
    imminentCount() {
      return this.promotionsTable.filter(r => r.opsToNext > 0 && r.opsToNext <= 3).length;
    },
  },
  methods: {
    onLoginSuccess() {
      try { window.sessionStorage.setItem(SESSION_KEY, "true"); } catch {}
      this.isAuthed = true;
    },
    onLoginClose() {
      if (!this.isAuthed) this.$router.replace("/status");
    },

    /* normalize + lookups */
    nameKey(name) {
      return String(name || "")
        .replace(/["'.]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    },
    getOps(member) {
      if (member?.id && this.attendanceMap[`ID:${member.id}`] !== undefined) {
        return this.attendanceMap[`ID:${member.id}`];
      }
      if (member?.name) {
        const nk = this.nameKey(member.name);
        if (this.attendanceMap[`NM:${nk}`] !== undefined) {
          return this.attendanceMap[`NM:${nk}`];
        }
      }
      const direct = Number(member?.opsAttended);
      return Number.isFinite(direct) ? direct : NaN;
    },
    rankKey(rank) { return String(rank || "").trim().toUpperCase().replace(/[.\s]/g, ""); },
    rankScore(rank) {
      const k = this.rankKey(rank);
      const alias = {
        PRIVATE: "PVT", PRIVATEFIRSTCLASS: "PFC", SPECIALIST: "SPC",
        SPECIALIST2: "SPC2", SPECIALIST3: "SPC3", SPECIALIST4: "SPC4",
        LANCECORPORAL: "LCPL", CORPORAL: "CPL", SERGEANT: "SGT",
        STAFFSERGEANT: "SSGT", GUNNYSERGEANT: "GYSGT",
        SECONDLIEUTENANT: "2NDLT", FIRSTLIEUTENANT: "1STLT", CAPTAIN: "CAPT", MAJOR: "MAJ",
        HOSPITALMANAPPRENTICE: "HA", HOSPITALMAN: "HN",
        HOSPITALCORPSMANTHIRDCLASS: "HM3",
        HOSPITALCORPSMANSECONDCLASS: "HM2",
        HOSPITALCORPSMANFIRSTCLASS: "HM1",
        CHIEFHOSPITALCORPSMAN: "HMC",
        WARRANTOFFICER: "WO",
        CHIEFWARRANTOFFICER2: "CWO2", CHIEFWARRANTOFFICER3: "CWO3",
        CHIEFWARRANTOFFICER4: "CWO4", CHIEFWARRANTOFFICER5: "CWO5",
      };
      const rk = alias[k] || k;
      const idx = this.rankOrderHighToLow.indexOf(rk);
      return idx === -1 ? 999 : idx; // lower is higher rank
    },
    promotionLadderFor(rank) {
      const r = this.rankKey(rank);
      const alias = {
        PRIVATE: "PVT", PVT: "PVT",
        PRIVATEFIRSTCLASS: "PFC", PFC: "PFC",
        SPECIALIST: "SPC", SPC: "SPC",
        SPECIALIST2: "SPC2", SPC2: "SPC2",
        SPECIALIST3: "SPC3", SPC3: "SPC3",
        SPECIALIST4: "SPC4", SPC4: "SPC4",
        HOSPITALMANAPPRENTICE: "HA", HA: "HA",
        HOSPITALMAN: "HN", HN: "HN",
        HOSPITALCORPSMANTHIRDCLASS: "HM3", HM3: "HM3",
        HOSPITALCORPSMANSECONDCLASS: "HM2", HM2: "HM2",
        HOSPITALCORPSMANFIRSTCLASS: "HM1", HM1: "HM1",
        CHIEFHOSPITALCORPSMAN: "HMC", HMC: "HMC",
        WARRANTOFFICER: "WO", WO: "WO",
        CHIEFWARRANTOFFICER2: "CWO2", CWO2: "CWO2",
        CHIEFWARRANTOFFICER3: "CWO3", CWO3: "CWO3",
        CHIEFWARRANTOFFICER4: "CWO4", CWO4: "CWO4",
        CHIEFWARRANTOFFICER5: "CWO5", CWO5: "CWO5",
        CAPTAIN: "CAPT", MAJOR: "MAJ"
      };
      const key = alias[r] || r;
      const ladders = {
        // Enlisted
        PVT:  { nextAt: 2,  nextRank: "PFC" },
        PFC:  { nextAt: 10, nextRank: "SPC" },
        SPC:  { nextAt: 20, nextRank: "SPC2" },
        SPC2: { nextAt: 30, nextRank: "SPC3" },
        SPC3: { nextAt: 40, nextRank: "SPC4" },
        SPC4: { nextAt: null, nextRank: null },

        // Medical
        HA:  { nextAt: 2,  nextRank: "HN" },
        HN:  { nextAt: 10, nextRank: "HM3" },
        HM3: { nextAt: 20, nextRank: "HM2" },
        HM2: { nextAt: 30, nextRank: "HM1" },
        HM1: { nextAt: null, nextRank: "HMC" }, // misc/role-based
        HMC: { nextAt: null, nextRank: null },

        // Warrant
        WO:   { nextAt: null, nextRank: "CWO2" }, // typically role/flight-time based
        CWO2: { nextAt: 10,  nextRank: "CWO3" },
        CWO3: { nextAt: 20,  nextRank: "CWO4" },
        CWO4: { nextAt: 30,  nextRank: "CWO5" },
        CWO5: { nextAt: null, nextRank: null },

        // Commissioned (static here; usually role-based)
        "2NDLT": { nextAt: null, nextRank: "1STLT" },
        "1STLT": { nextAt: null, nextRank: "CAPT" },
        CAPT:    { nextAt: null, nextRank: "MAJ" },
        MAJ:     { nextAt: null, nextRank: null },
      };
      return ladders[key] || null;
    },

    /* actions */
    markPromoted(row) {
      alert(`${row.name} marked as promoted to ${row.nextRank}. (Stub — wire to your data store)`);
    },
    openMember(row) {
      // Deep-link idea (optional): /pilots?squad=<squad>#member-<id>
      console.log("Open member (stub):", row);
    },

    /* utils */
    isFiniteNum(v) { return Number.isFinite(v); },
  },
};
</script>

<style scoped>
.section-container {
  padding: 2.5rem 3rem;
  color: #dce6f1;
  font-family: "Consolas","Courier New",monospace;
}

/* Layout */
.admin-layout {
  display: grid;
  grid-template-columns: 290px 1fr;
  gap: 1rem;
  margin-top: .75rem;
}

/* Left menu */
.admin-menu { display: grid; gap: .55rem; }
.admin-menu-item {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: .6rem;
  align-items: center;
  padding: .6rem .7rem;
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,0,0,0.15);
  border-radius: .35rem;
  cursor: pointer;
  transition: border-color .15s ease, transform .15s ease;
}
.admin-menu-item:hover { border-color: rgba(126,201,255,0.85); transform: translateY(-1px); }
.admin-menu-item.active { border-color: rgba(126,201,255,0.95); box-shadow: 0 0 8px rgba(126,201,255,0.15) inset; }
.menu-icon { width: 36px; height: 36px; opacity: .9; }
.menu-meta { display: grid; gap: .15rem; }
.menu-title { color: #e0f0ff; font-weight: 700; letter-spacing: .04em; }
.menu-desc { color: #9ec5e6; font-size: .9rem; }

/* Right panel shell */
.admin-main {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,0,0,0.12);
  border-radius: .4rem;
  padding: .8rem .9rem;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: .6rem;
  justify-content: space-between;
  margin-bottom: .6rem;
}
.panel-header h2 { margin: 0; color: #e0f0ff; letter-spacing: .04em; }
.panel-actions { display: flex; gap: .45rem; align-items: center; flex-wrap: wrap; }
.search-input,
.control {
  background: #040a14;
  border: 1px solid rgba(30,144,255,.45);
  color: #dce6f1;
  border-radius: .3rem;
  padding: .35rem .45rem;
  min-width: 180px;
}
.chk { display: inline-flex; align-items: center; gap: .35rem; color: #cfe6ff; }

/* Summary chips */
.chips { display: flex; gap: .45rem; margin-bottom: .5rem; flex-wrap: wrap; }
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
.thead, .tr {
  display: grid;
  grid-template-columns: 1.6fr .8fr 1fr .6fr .9fr .6fr 1.4fr .9fr;
  gap: .35rem;
  align-items: center;
}
.thead { background: rgba(0,10,30,0.45); padding: .5rem .6rem; border-bottom: 1px dashed rgba(30,144,255,0.25); }
.th { font-weight: 700; color: #e0f0ff; letter-spacing: .03em; }
.tr { padding: .45rem .6rem; background: rgba(0,10,30,0.25); border-bottom: 1px dashed rgba(30,144,255,0.15); }
.tr:last-child { border-bottom: none; }

.tr.eligible { box-shadow: inset 0 0 0 1px rgba(120,255,170,0.25); }
.tr.imminent { box-shadow: inset 0 0 0 1px rgba(255,190,80,0.2); }

.td { color: #dce6f1; }
.td.name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td.rank, .td.squad { color: #9ec5e6; }
.td.ops { color: #a3e7ff; }
.td.next { color: #7fffd4; font-weight: 700; }
.td.to { color: #cfdcea; }

/* progress bar */
.bar { height: 10px; background: rgba(30,144,255,0.18); border: 1px solid rgba(30,144,255,0.35); border-radius: 999px; overflow: hidden; }
.bar .fill { height: 100%; background: linear-gradient(90deg, rgba(126,201,255,0.95), rgba(126,201,255,0.55)); }
.bar.done .fill { background: linear-gradient(90deg, rgba(120,255,170,0.95), rgba(120,255,170,0.65)); }

.btn-sm {
  background: rgba(126,201,255,0.2);
  border: 1px solid rgba(126,201,255,0.6);
  color: #dce6f1;
  border-radius: .3rem;
  padding: .2rem .45rem;
  cursor: pointer;
}
.btn-sm.ghost { background: transparent; border-color: rgba(30,144,255,0.45); }

.empty { padding: .7rem .8rem; color: #9ec5e6; }

/* Misc */
.muted { color: #9ec5e6; }
</style>
