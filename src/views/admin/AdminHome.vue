<!-- src/views/admin/AdminHome.vue -->
<template>
  <div
    class="windows-grid content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- LEFT WINDOW: Admin nav -->
    <section class="section-container left-window">
      <div class="header-shell">
        <div class="section-header simple-admin-plate admin-plate--clipped">
          <img src="/icons/protocol.svg" alt="" />
          <h1>ADMIN</h1>
        </div>
        <div class="admin-plate-connector" aria-hidden="true"></div>
      </div>

      <div class="section-content-container">
        <div v-if="isAuthed" class="rail">
          <button
            class="rail-card"
            :class="{ active: activeKey === 'promotions' }"
            @click="activeKey = 'promotions'"
          >
            <div class="rail-card-head">
              <img src="/icons/protocol.svg" class="rail-icon" alt="" />
              <div class="rail-title">Promotions Overview</div>
            </div>
            <div class="rail-card-body">
              <div class="rail-line">
                <span class="label">Eligible now</span>
                <span class="pill ok">{{ eligibleNowCount }}</span>
              </div>
              <div class="rail-line">
                <span class="label">Imminent (≤3)</span>
                <span class="pill warn">{{ imminentCount }}</span>
              </div>
              <div class="rail-foot">Click to open</div>
            </div>
          </button>
        </div>
        <div v-else class="muted">Staff only.</div>
      </div>
    </section>

    <!-- RIGHT WINDOW -->
    <section class="section-container right-window">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot right-header">
          <img src="/icons/protocol.svg" alt="" />
          <h1>PROMOTIONS OVERVIEW</h1>
          <div class="right-actions"></div>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container right-content">
        <div v-if="!isAuthed" class="muted">Staff only.</div>

        <!-- Promotions -->
        <div v-else class="promotions-panel">
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
                <span>Promotable only</span>
              </label>
            </div>
          </div>

          <div class="chips">
            <span class="chip">Total: {{ promotionsTable.length }}</span>
            <span class="chip ok">Eligible now: {{ eligibleNowCount }}</span>
            <span class="chip warn">Imminent (≤3): {{ imminentCount }}</span>
          </div>

          <div class="table-scroll">
            <div class="table-shell">
              <div class="tr head grid6">
                <span class="th name">Name</span>
                <span class="th rank">Rank</span>
                <span class="th squad">Squad</span>
                <span class="th ops">Ops</span>
                <span class="th next">Next Rank</span>
                <span class="th prog">Progress</span>
              </div>
              <div class="rows-scroll">
                <div v-for="row in promotionsTable" :key="row.id || row.name" class="tr grid6">
                  <span class="td name">{{ row.name }}</span>
                  <span class="td rank">{{ row.rank }}</span>
                  <span class="td squad">{{ row.squad || '—' }}</span>
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
                </div>
              </div>
            </div>
          </div>
        </div> <!-- /promotions -->
      </div>
    </section>
  </div>
</template>

<script>
import { isAdmin } from "@/utils/adminAuth";

export default {
  name: "AdminHome",
  props: {
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
    attendance: { type: Array, default: () => [] },
  },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",
      activeKey: "promotions",

      // Promotions
      search: "",
      selectedSquad: "__ALL__",
      sortKey: "rank",
      onlyPromotable: false,
    };
  },
  created() {
    /* nothing extra needed now */
  },
  mounted() {
    this.triggerFlicker();
  },
  computed: {
    isAuthed() { return isAdmin(); },

    nameKey() {
      return (name) =>
        String(name || "")
          .replace(/["'.]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase();
    },
    cleanMemberName() { return (name) => String(name || "").replace(/\s*[\(\[].*?[\)\]]\s*$/g, "").trim(); },
    rankKey() { return (rank) => String(rank || "").trim().toUpperCase().replace(/[.\s]/g, ""); },

    nextPromotion() {
      const alias = { PRIVATE:"PVT", PRIVATEFIRSTCLASS:"PFC", SPECIALIST:"SPC", SPECIALIST2:"SPC2", SPECIALIST3:"SPC3", SPECIALIST4:"SPC4", LANCECORPORAL:"LCPL", CORPORAL:"CPL", SERGEANT:"SGT", STAFFSERGEANT:"SSGT", GUNNYSERGEANT:"GYSGT", SECONDLIEUTENANT:"2NDLT", FIRSTLIEUTENANT:"1STLT", CAPTAIN:"CAPT", HOSPITALMANAPPRENTICE:"HA", HOSPITALMAN:"HN", HOSPITALCORPSMANTHIRDCLASS:"HM3", HOSPITALCORPSMANSECONDCLASS:"HM2", HOSPITALCORPSMANFIRSTCLASS:"HM1", CHIEFHOSPITALCORPSMAN:"HMC", WARRANTOFFICER:"WO", CHIEFWARRANTOFFICER2:"CWO2", CHIEFWARRANTOFFICER3:"CWO3", CHIEFWARRANTOFFICER4:"CWO4", CHIEFWARRANTOFFICER5:"CWO5" };
      const rules = {
        PVT:{nextRank:"PFC",nextAt:10}, PFC:{nextRank:"SPC",nextAt:20}, SPC:{nextRank:"SPC2",nextAt:30},
        SPC2:{nextRank:"SPC3",nextAt:40}, SPC3:{nextRank:"SPC4",nextAt:50}, SPC4:{nextRank:"LCpl",nextAt:null},
        LCPL:{nextRank:"Cpl",nextAt:null}, CPL:{nextRank:"Sgt",nextAt:null}, SGT:{nextRank:"SSgt",nextAt:null},
        SSGT:{nextRank:"GySgt",nextAt:null}, GYSGT:{nextRank:"2ndLt",nextAt:null}, "2NDLT":{nextRank:"1stLt",nextAt:null},
        "1STLT":{nextRank:"Capt",nextAt:null}, CAPT:{nextRank:null,nextAt:null},
        HA:{nextRank:"HN",nextAt:10}, HN:{nextRank:"HM3",nextAt:20}, HM3:{nextRank:"HM2",nextAt:30},
        HM2:{nextRank:"HM1",nextAt:null}, HM1:{nextRank:"HMC",nextAt:null}, HMC:{nextRank:null,nextAt:null},
        WO:{nextRank:"CWO2",nextAt:10}, CWO2:{nextRank:"CWO3",nextAt:20}, CWO3:{nextRank:"CWO4",nextAt:30},
        CWO4:{nextRank:"CWO5",nextAt:null}, CWO5:{nextRank:null,nextAt:null},
      };
      return (member) => {
        const rk = alias[this.rankKey(member?.rank)] || this.rankKey(member?.rank);
        return rules[rk] || { nextRank: null, nextAt: null };
      };
    },

    squads() {
      const set = new Set();
      (this.orbat || []).forEach((sq) => { const s = String(sq?.squad || "").trim(); if (s) set.add(s); });
      (this.members || []).forEach((m) => { const s = String(m?.squad || "").trim(); if (s) set.add(s); });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },

    attendanceMap() {
      const map = Object.create(null);
      (this.members || []).forEach((m) => {
        const ops = Number(m.opsAttended);
        if (Number.isFinite(ops)) {
          if (m.id != null) map[`ID:${m.id}`] = ops;
          if (m.name) map[`NM:${this.nameKey(m.name)}`] = ops;
        }
      });
      (this.attendance || []).forEach((row) => {
        const ops = Number(row?.ops ?? row?.attended ?? row?.value);
        if (!Number.isFinite(ops)) return;
        if (row?.id != null) map[`ID:${row.id}`] = ops;
        if (row?.name) map[`NM:${this.nameKey(row.name)}`] = ops;
      });
      return map;
    },

    getOps() {
      return (member) => {
        if (member?.id != null && this.attendanceMap[`ID:${member.id}`] !== undefined) return this.attendanceMap[`ID:${member.id}`];
        if (member?.name) {
          const nk = this.nameKey(member.name);
          if (this.attendanceMap[`NM:${nk}`] !== undefined) return this.attendanceMap[`NM:${nk}`];
        }
        const direct = Number(member?.opsAttended);
        return Number.isFinite(direct) ? direct : null;
      };
    },

    rankScore() {
      const order = ["MAJ","CAPT","1STLT","2NDLT","CWO5","CWO4","CWO3","CWO2","WO","GYSGT","SSGT","SGT","CPL","LCPL","SPC4","SPC3","SPC2","SPC","PFC","PVT","RCT","HMC","HM1","HM2","HM3","HN","HA","HR"];
      return (r) => { const idx = order.indexOf(this.rankKey(r)); return idx === -1 ? 999 : idx; };
    },

    promotionsTable() {
      const term = (this.search || "").trim().toLowerCase();
      const squadFilter = this.selectedSquad;
      const onlyProm = !!this.onlyPromotable;
      const rows = [];
      for (const m of (this.members || [])) {
        const squad = String(
          m?.squad ||
          this.membershipIndex[`ID:${m?.id}`] ||
          this.membershipIndex[`NM:${this.nameKey(m?.name)}`] ||
          ""
        ).trim();

        if (term) {
          const hay = [m.name, m.rank, squad].map(x => String(x || "").toLowerCase()).join(" ");
          if (!hay.includes(term)) continue;
        }
        if (squadFilter && squadFilter !== "__ALL__" && squad !== squadFilter) continue;

        const rule = this.nextPromotion(m);
        const ops = this.getOps(m);
        const nextRank = rule?.nextRank ?? null;
        const nextAt = rule?.nextAt ?? null;

        let progress = 0;
        let opsToNext = null;
        if (Number.isFinite(nextAt) && Number.isFinite(ops)) {
          progress = Math.min(100, Math.max(0, Math.round((ops / nextAt) * 100)));
          opsToNext = Math.max(0, nextAt - ops);
        }

        rows.push({
          id: m.id,
          name: m.name || "Unknown",
          rank: m.rank || "N/A",
          squad,
          ops: Number.isFinite(ops) ? ops : null,
          nextRank,
          nextAt,
          progress,
          opsToNext,
          rankScore: this.rankScore(m?.rank),
        });
      }

      const filtered = onlyProm ? rows.filter((r) => r.opsToNext === 0 && !!r.nextRank) : rows;
      const sorter = {
        rank: (a, b) => a.rankScore - b.rankScore,
        ops: (a, b) => (b.ops ?? -Infinity) - (a.ops ?? -Infinity),
        progress: (a, b) => (b.progress ?? -Infinity) - (a.progress ?? -Infinity),
        name: (a, b) => a.name.localeCompare(b.name),
      }[this.sortKey] || ((a, b) => 0);

      return filtered.sort(sorter);
    },

    membershipIndex() {
      const idx = Object.create(null);
      const nk = this.nameKey;
      const add = (squadName, m) => {
        if (!m) return;
        if (m.id != null) idx[`ID:${m.id}`] = squadName;
        if (m.name) idx[`NM:${nk(m.name)}`] = squadName;
      };
      (this.orbat || []).forEach((sq) => {
        const s = String(sq?.squad || "").trim();
        if (!s) return;
        (sq?.fireteams || []).forEach((ft) => (ft?.slots || []).forEach((slot) => add(s, slot?.member)));
        (sq?.members || []).forEach((m) => add(s, m));
      });
      return idx;
    },

    eligibleNowCount() { return this.promotionsTable.filter((r) => r.opsToNext === 0 && !!r.nextRank).length; },
    imminentCount()     { return this.promotionsTable.filter((r) => Number.isFinite(r.opsToNext) && r.opsToNext > 0 && r.opsToNext <= 3).length; },
  },
  methods: {
    /* --- Flicker --- */
    triggerFlicker(delayMs = 0) {
      this.animateView = false;
      this.animationDelay = `${delayMs}ms`;
      this.$nextTick(() => {
        requestAnimationFrame(() => { this.animateView = true; });
      });
    },

    isFiniteNum(v) { return Number.isFinite(v); },
  },
};
</script>

<style scoped>
/* Prevent layout shift during fade */
.right-window .section-content-container.right-content { scrollbar-gutter: stable; }
.rows-scroll { scrollbar-gutter: stable; }

/* Header alignment shells */
.header-shell { height: 52px; overflow: hidden; }

/* SIMPLE ADMIN PLATE — fixed length, readable in narrow column */
.simple-admin-plate {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 14px;
  height: 52px;
  width: 315px;
  background: #214d45;
}
.simple-admin-plate img { width: 20px; height: 20px; }
.simple-admin-plate h1 {
  margin: 0;
  line-height: 52px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #0a0a0a;
  white-space: nowrap;
}

/* clipped right end */
.admin-plate--clipped {
  clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 26px, calc(100% - 22px) 52px, 0 52px);
}

/* notch */
.admin-plate-connector {
  display: inline-block;
  width: 14px;
  height: 14px;
  background: #214d45;
  transform: translateX(4px) translateY(19px) rotate(45deg);
}

/* Keep right header untouched */
.right-header h1 { white-space: nowrap; }

/* Help compositor */
.content-container { will-change: opacity, filter; contain: paint; }

/* Layout + visuals */
.windows-grid { display: grid; grid-template-columns: 380px minmax(1080px, 1fr); column-gap: 2.4rem; align-items: start; width: 100%; }
.windows-grid > .section-container { position: relative !important; width: 100%; max-width: none; align-self: start; }
.left-window { height: auto !important; max-height: none !important; }
.right-window { display: flex; flex-direction: column; max-height: 100vh; overflow: hidden; }
.right-window .section-content-container.right-content { flex: 1 1 auto; min-height: 0; overflow: hidden; padding: .6rem .6rem .2rem; }

.promotions-panel { display: flex; flex-direction: column; gap: .6rem; height: 72vh; max-height: 72vh; min-height: 50vh; overflow: hidden; }

.control { display: grid; gap: .2rem; }
.control span { font-size: .85rem; color: #9ec5e6; }
.control input, .control select, .control textarea { background: rgba(5,20,40,0.85); border: 1px solid rgba(30,144,255,0.35); border-radius: .35rem; padding: .35rem .45rem; color: #e6f3ff; }
.control textarea { resize: vertical; }
.control input::placeholder, .control textarea::placeholder { color: #aac7e6; }
.control input:focus, .control select:focus, .control textarea:focus { outline: none; border-color: rgba(30,144,255,0.6); }
.control select option { background: rgba(5,20,40,0.98); color: #e6f3ff; }
.control.chk { display: flex; align-items: center; gap: .45rem; padding-top: 1.25rem; }
.control.chk input[type="checkbox"] { width: 16px; height: 16px; accent-color: #78ffd0; }
.control.chk span { color: #e6f3ff; font-size: .9rem; }

.filters { border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; padding: .5rem; margin-bottom: .6rem; }
.filters .row { display: grid; grid-template-columns: 1.2fr auto auto auto; gap: .6rem; align-items: end; }
.chips { display: flex; gap: .45rem; margin-bottom: .55rem; flex-wrap: wrap; }
.chip { padding: .25rem .5rem; border-radius: 999px; background: rgba(0,10,30,0.25); border: 1px solid rgba(30,144,255,0.45); color: #e6f3ff; }
.chip.ok { border-color: rgba(120,255,170,0.7); }
.chip.warn { border-color: rgba(255,190,80,0.7); }

.muted { color: #9ec5e6; }
.ok-text { color: #79ffba; }
.empty { color: #9ec5e6; padding: .8rem; text-align: center; }

.rail { display: grid; gap: .6rem; align-content: start; }
.rail-card { text-align: left; border: 1px solid rgba(30,144,255,0.35); background: rgba(0,10,30,0.35); border-radius: .5rem; padding: .6rem; cursor: pointer; }
.rail-card.active { border-color: rgba(120,255,170,0.7); }
.rail-card-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .35rem; }
.rail-icon { width: 20px; height: 20px; }
.rail-title, .rail-line .label { color: #d9ebff; }
.pill { font-size: .85rem; border: 1px solid rgba(30,144,255,0.45); border-radius: 999px; padding: .05rem .5rem; color: #e6f3ff; }
.rail-foot { margin-top: .25rem; font-size: .8rem; color: #9ec5e6; }

.table-scroll { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden; }
.table-shell { flex: 1 1 auto; min-height: 0; border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; background: rgba(0,10,30,0.18); display: flex; flex-direction: column; overflow: hidden; }
.grid6 { display: grid; grid-template-columns: 1.6fr .8fr 1fr .6fr .9fr 1.2fr; align-items: center; }
.tr.head { font-weight: 600; background: rgba(0,10,30,0.35); border-bottom: 1px dashed rgba(30,144,255,0.25); flex: 0 0 auto; }
.rows-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; }
.tr .th, .tr .td { padding: .4rem .5rem; color: #e6f3ff; border-bottom: 1px dashed rgba(30,144,255,0.18); }
.rows-scroll .tr:last-child .td { border-bottom: 0; }

.bar { height: 8px; background: rgba(0,10,30,0.35); border: 1px solid rgba(30,144,255,0.35); border-radius: 999px; position: relative; overflow: hidden; }
.bar .fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0%; transition: width .25s ease; background: rgba(120,200,255,0.6); }
.bar.done .fill { background: rgba(120,255,170,0.7); }

</style>
