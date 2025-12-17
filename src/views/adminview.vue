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
          <!-- Promotions Overview -->
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
              </div>
            </div>

            <div class="promo-grid">
              <div class="promo-card eligible">
                <h3>Eligible Now</h3>
                <div v-if="eligibleNow.length" class="list">
                  <div v-for="m in filtered(eligibleNow)" :key="m.id || m.name" class="row">
                    <span class="name">{{ m.name }}</span>
                    <span class="rank">{{ m.rank }} → {{ m.nextRank || '—' }}</span>
                    <span class="ops">Ops: {{ m.ops }}</span>
                    <button class="btn-sm" @click="markPromoted(m)">Mark Promoted</button>
                  </div>
                </div>
                <div v-else class="muted">No one eligible at this time.</div>
              </div>

              <div class="promo-card soon">
                <h3>Imminent (≤ 3 ops)</h3>
                <div v-if="imminent.length" class="list">
                  <div v-for="m in filtered(imminent)" :key="m.id || m.name" class="row">
                    <span class="name">{{ m.name }}</span>
                    <span class="rank">{{ m.rank }} → {{ m.nextRank || '—' }}</span>
                    <span class="ops">In {{ m.opsToNext }} ops ({{ m.ops }} so far)</span>
                    <button class="btn-sm ghost" @click="openMember(m)">Open</button>
                  </div>
                </div>
                <div v-else class="muted">Nobody within 3 ops.</div>
              </div>

              <div class="promo-card pipeline">
                <h3>Pipeline</h3>
                <div v-if="pipeline.length" class="list">
                  <div v-for="m in filtered(pipeline)" :key="m.id || m.name" class="row">
                    <span class="name">{{ m.name }}</span>
                    <span class="rank">{{ m.rank }} → {{ m.nextRank || '—' }}</span>
                    <span class="ops">{{ m.opsToNext }} ops</span>
                    <button class="btn-sm ghost" @click="openMember(m)">Open</button>
                  </div>
                </div>
                <div v-else class="muted">No one in the current pipeline window.</div>
              </div>
            </div>
          </div>

          <!-- Mission Content (placeholder for future) -->
          <div v-else-if="activeKey === 'missioncms'" class="panel">
            <div class="panel-header">
              <h2>Mission Content</h2>
            </div>
            <p class="muted">Coming soon: edit Current Assignment & Mission Log entries.</p>
          </div>

          <!-- Roster Tools (placeholder for future) -->
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
  },
  data() {
    return {
      isAuthed: false,
      activeKey: "promotions",
      search: "",
      // easily add more admin panels here
      menuItems: [
        {
          key: "promotions",
          title: "Promotions Overview",
          desc: "Upcoming, imminent, and eligible promotions",
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
    attendanceMap() {
      // name+id based map; mirrors PilotsView normalization
      const map = Object.create(null);

      // from members prop (opsAttended inline)
      (this.members || []).forEach((m) => {
        const ops = Number(m.opsAttended);
        if (Number.isFinite(ops)) {
          if (m.id) map[`ID:${m.id}`] = ops;
          if (m.name) map[`NM:${this.nameKey(m.name)}`] = ops;
        }
      });

      // from attendance sheet prop
      (this.attendance || []).forEach((row) => {
        const ops = Number(row?.ops ?? row?.attended ?? row?.value);
        if (!Number.isFinite(ops)) return;
        if (row?.id) map[`ID:${row.id}`] = ops;
        if (row?.name) map[`NM:${this.nameKey(row.name)}`] = ops;
      });

      return map;
    },

    // Flattened list for promotions with derived fields
    promotionsList() {
      const out = [];
      (this.members || []).forEach((m) => {
        const ops = this.getOps(m);
        const ladder = this.promotionLadderFor(m?.rank);
        if (!ladder) return;

        const nextRank = ladder?.nextRank ?? null;
        const nextAt = Number.isFinite(ladder?.nextAt) ? ladder.nextAt : null;

        if (nextRank === null || nextAt === null) return;
        if (!Number.isFinite(ops)) return;

        const opsToNext = Math.max(0, nextAt - ops);
        out.push({
          id: m.id,
          name: m.name || "Unknown",
          rank: m.rank || "N/A",
          nextRank,
          ops,
          opsToNext,
        });
      });

      // sort by opsToNext, then highest ops, then name
      out.sort((a, b) => {
        if (a.opsToNext !== b.opsToNext) return a.opsToNext - b.opsToNext;
        if (Number.isFinite(b.ops) && Number.isFinite(a.ops) && a.ops !== b.ops)
          return b.ops - a.ops;
        return String(a.name).localeCompare(String(b.name));
      });

      return out;
    },

    eligibleNow() {
      return this.promotionsList.filter((x) => x.opsToNext === 0);
    },
    imminent() {
      return this.promotionsList.filter((x) => x.opsToNext > 0 && x.opsToNext <= 3);
    },
    pipeline() {
      return this.promotionsList.filter((x) => x.opsToNext >= 4 && x.opsToNext <= 10);
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

    /* helpers */
    nameKey(name) {
      return String(name || "")
        .replace(/["'.]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    },
    getOps(member) {
      // by ID first
      if (member?.id && this.attendanceMap[`ID:${member.id}`] !== undefined) {
        return this.attendanceMap[`ID:${member.id}`];
      }
      // by normalized name
      if (member?.name) {
        const nk = this.nameKey(member.name);
        if (this.attendanceMap[`NM:${nk}`] !== undefined) {
          return this.attendanceMap[`NM:${nk}`];
        }
      }
      // fallback to inline
      const direct = Number(member?.opsAttended);
      return Number.isFinite(direct) ? direct : NaN;
    },
    rankKey(rank) {
      return String(rank || "").trim().toUpperCase().replace(/[.\s]/g, "");
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
        WARRANTOFFICER: "WO", WO: "WO",
        CHIEFWARRANTOFFICER2: "CWO2", CWO2: "CWO2",
        CHIEFWARRANTOFFICER3: "CWO3", CWO3: "CWO3",
        CHIEFWARRANTOFFICER4: "CWO4", CWO4: "CWO4",
      };
      const key = alias[r] || r;

      const ladders = {
        PVT:  { nextAt: 2,  nextRank: "PFC" },
        PFC:  { nextAt: 10, nextRank: "SPC" },
        SPC:  { nextAt: 20, nextRank: "SPC2" },
        SPC2: { nextAt: 30, nextRank: "SPC3" },
        SPC3: { nextAt: 40, nextRank: "SPC4" },
        SPC4: { nextAt: null, nextRank: null },

        HA:   { nextAt: 2,  nextRank: "HN" },
        HN:   { nextAt: 10, nextRank: "HM3" },
        HM3:  { nextAt: 20, nextRank: "HM2" },
        HM2:  { nextAt: 30, nextRank: null },

        WO:   { nextAt: null, nextRank: null },
        CWO2: { nextAt: 10, nextRank: "CWO3" },
        CWO3: { nextAt: 20, nextRank: "CWO4" },
        CWO4: { nextAt: 30, nextRank: null },
      };

      return ladders[key] || null;
    },

    /* UI actions (stubbed) */
    markPromoted(m) {
      // Why: placeholder action so you can wire real updates later
      alert(`${m.name} marked as promoted to ${m.nextRank}. (Stub)`);
    },
    openMember(m) {
      // Why: deep-link to roster in future (e.g., /pilots?open=<squad>#member-<id>)
      console.log("Open member (stub):", m);
    },

    /* search helper */
    filtered(list) {
      const q = this.search.trim().toLowerCase();
      if (!q) return list;
      return list.filter((m) => {
        return (
          String(m.name).toLowerCase().includes(q) ||
          String(m.rank).toLowerCase().includes(q) ||
          String(m.nextRank || "").toLowerCase().includes(q)
        );
      });
    },
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
.admin-menu {
  display: grid;
  gap: .55rem;
}
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
.admin-menu-item:hover {
  border-color: rgba(126,201,255,0.85);
  transform: translateY(-1px);
}
.admin-menu-item.active {
  border-color: rgba(126,201,255,0.95);
  box-shadow: 0 0 8px rgba(126,201,255,0.15) inset;
}
.menu-icon { width: 36px; height: 36px; opacity: .9; }
.menu-meta { display: grid; gap: .15rem; }
.menu-title { color: #e0f0ff; font-weight: 700; letter-spacing: .04em; }
.menu-desc { color: #9ec5e6; font-size: .9rem; }

/* Right panel */
.admin-main {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,0,0,0.12);
  border-radius: .4rem;
  padding: .8rem .9rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: .6rem;
}
.panel-header h2 {
  margin: 0;
  color: #e0f0ff;
  letter-spacing: .04em;
}
.search-input {
  background: #040a14;
  border: 1px solid rgba(30,144,255,.45);
  color: #dce6f1;
  border-radius: .3rem;
  padding: .35rem .45rem;
  min-width: 220px;
}

/* Promotions Overview */
.promo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: .8rem;
}
.promo-card {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,0,0,0.15);
  border-radius: .35rem;
  padding: .6rem .7rem;
}
.promo-card h3 {
  margin: 0 0 .45rem;
  color: #e0f0ff;
  letter-spacing: .04em;
}
.promo-card.eligible { border-color: rgba(120,255,170,0.7); }
.promo-card.soon { border-color: rgba(255,190,80,0.7); }
.promo-card.pipeline { border-color: rgba(126,201,255,0.7); }

.list { display: grid; gap: .35rem; }
.row {
  display: grid;
  grid-template-columns: 1.3fr 1fr auto auto;
  gap: .5rem;
  align-items: center;
  padding: .35rem .45rem;
  border-radius: .3rem;
  background: rgba(0,10,30,0.25);
}
.name { color: #e0f0ff; }
.rank { color: #9ec5e6; }
.ops { color: #a3e7ff; }

.btn-sm {
  background: rgba(126,201,255,0.2);
  border: 1px solid rgba(126,201,255,0.6);
  color: #dce6f1;
  border-radius: .3rem;
  padding: .2rem .45rem;
  cursor: pointer;
}
.btn-sm.ghost {
  background: transparent;
  border-color: rgba(30,144,255,0.45);
}

/* Misc */
.muted { color: #9ec5e6; }
</style>
