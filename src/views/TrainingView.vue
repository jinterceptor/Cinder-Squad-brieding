<!-- src/views/TrainingView.vue -->
<template>
  <div
    id="trainingView"
    class="content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- LEFT: TRAINING & CONTACTS (shifted down/right) -->
    <section id="training" class="section-container">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>TRAINING & CONTACTS</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container">
        <div class="panel">
          <div v-if="loading" class="muted">Loading RefData…</div>
          <div v-else-if="error" class="error">{{ error }}</div>

          <div v-else class="cards-grid trainers-grid">
            <div v-for="role in trainers" :key="role.key" class="card">
              <div class="card-head">
                <h3 class="title plain-title" :title="role.title">{{ role.title }}</h3>
                <span v-if="role.lead" class="badge-lead" title="Lead trainer">LEAD</span>
              </div>

              <div class="body">
                <div v-if="role.lead" class="lead">
                  <span class="label">Contact:</span>
                  <span class="highlight">{{ role.lead }}</span>
                </div>

                <div v-if="role.trainers.length" class="divider" />

                <div v-if="role.trainers.length" class="trainers-block">
                  <div class="label">Trainers</div>
                  <ul class="vlist">
                    <li v-for="n in role.trainers" :key="n" :title="n">{{ n }}</li>
                  </ul>
                </div>
                <div v-else class="muted">No trainers listed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RIGHT: S-SHOP PERSONNEL -->
    <section id="sshops" class="section-container">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>S-SHOP PERSONNEL</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container">
        <div class="panel">
          <div v-if="loading" class="muted">Loading RefData…</div>
          <div v-else-if="error" class="error">{{ error }}</div>

          <div v-else class="cards-grid shops-grid">
            <div v-for="s in shops" :key="s.key" class="card slim">
              <div class="card-head">
                <h3 class="title plain-title" :title="s.title">{{ s.title }}</h3>
              </div>

              <div class="body list-body">
                <div v-if="s.people.length" class="list">
                  <div v-for="n in s.people" :key="n" class="row" :title="n">{{ n }}</div>
                </div>
                <div v-else class="muted">None listed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: "TrainingView",
  props: { animate: { type: Boolean, default: true } },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",
      loading: true,
      error: "",
      refDataCsvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=107253735&single=true&output=csv",
      trainers: [],
      shops: [],
    };
  },
  created() { this.loadRefData(); },
  mounted() { this.triggerFlicker(); },
  methods: {
    triggerFlicker(delayMs = 0) {
      this.animateView = false;
      this.animationDelay = `${delayMs}ms`;
      this.$nextTick(() => requestAnimationFrame(() => (this.animateView = true)));
    },

    async loadRefData() {
      try {
        const res = await fetch(this.refDataCsvUrl);
        if (!res.ok) throw new Error(`Failed to fetch RefData (HTTP ${res.status}).`);
        const csv = await res.text();
        const table = this.parseCsv(csv);

        const headerRow = table[1] || [];
        const TRAINER_COLS = this.range(21, 30); // V..AE
        const SSHOP_COLS   = this.range(31, 34); // AF..AI

        const trainers = [];
        for (const c of TRAINER_COLS) {
          const title = this.cleanHeader(headerRow[c] || "");
          if (!title) continue;

          const raw = this.readDown(table, 2, c).filter(this.isRealName);

          // Build a unique-preserving list
          const uniq = [];
          for (const n of raw) if (!uniq.includes(n)) uniq.push(n);

          const lead = uniq[0] || "";
          const trainersAll = uniq.slice(); // includes lead as well
          trainers.push({ key: `role-${c}`, title, lead, trainers: trainersAll });
        }

        const shops = [];
        for (const c of SSHOP_COLS) {
          const title = this.cleanHeader(headerRow[c] || "");
          if (!title) continue;
          const people = this.readDown(table, 2, c).filter(this.isRealName);
          shops.push({ key: `shop-${c}`, title, people });
        }

        this.trainers = trainers;
        this.shops = shops;
      } catch (e) {
        this.error = String(e?.message || e);
        console.error("RefData load failed:", e);
      } finally {
        this.loading = false;
      }
    },

    range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; },
    readDown(table, startRow, col) {
      const out = [];
      for (let r = startRow; r < table.length; r++) {
        const v = this.cleanName(table[r]?.[col] || "");
        if (!v) break;
        out.push(v);
      }
      return out;
    },
    cleanHeader(s) { return String(s).replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim(); },
    cleanName(s)   { return String(s).replace(/\s+/g, " ").trim(); },
    isRealName(s)  { const v = String(s || "").trim(); return v && v.toLowerCase() !== "vacant"; },

    parseCsv(text) {
      const rows = []; let cur = []; let val = ""; let inQ = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
          if (ch === '"') { if (text[i + 1] === '"') { val += '"'; i++; } else { inQ = false; } }
          else { val += ch; }
        } else {
          if (ch === '"') inQ = true;
          else if (ch === ",") { cur.push(val); val = ""; }
          else if (ch === "\n") { cur.push(val); rows.push(cur); cur = []; val = ""; }
          else if (ch !== "\r") { val += ch; }
        }
      }
      cur.push(val); rows.push(cur);
      if (rows.length && rows[rows.length - 1].every(x => String(x).length === 0)) rows.pop();
      return rows;
    },
  },
};
</script>

<style scoped>
/* === Layout: left wide, right narrow === */
#trainingView {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 1.2rem;
  align-items: start;
}
#trainingView > .section-container { width: 100%; margin: 0; }
#training { grid-column: 1; }
#sshops  { grid-column: 2; }

/* Shift the left window away from header + sidebar */
#training {
  padding-left: 18px;   /* move right */
  margin-top: 10px;     /* move down */
}

.header-shell { height: 52px; overflow: hidden; }
.muted { color: #9ec5e6; }
.error { color: #ff9f9f; }

/* Windows */
.panel {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.18);
  border-radius: .6rem;
  padding: .7rem .8rem;
}

/* Grids */
.cards-grid { display: grid; gap: .7rem; }
.trainers-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.shops-grid    { grid-template-columns: 1fr; }

/* Responsive fallbacks */
@media (max-width: 1700px) { .trainers-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 1400px) { .trainers-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1100px) {
  #trainingView { grid-template-columns: 1fr; }
  .shops-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 800px) {
  .trainers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .shops-grid    { grid-template-columns: 1fr; }
}

/* Cards */
.card {
  box-sizing: border-box;
  border: 1px solid rgba(30,144,255,0.28);
  background: rgba(0,10,30,0.28);
  border-radius: .6rem;
  padding: .6rem .7rem;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: .45rem;
}
.card.slim { padding: .55rem .65rem; }

.card-head {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin: 0;
}

.title {
  margin: 0;
  color: #d9ebff;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 1rem;
  line-height: 1.15;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plain-title { background: none !important; clip-path: none !important; padding: 0 !important; border: 0 !important; }

.badge-lead {
  flex: 0 0 auto;
  font-size: .68rem;
  letter-spacing: .12em;
  border: 1px solid rgba(120,255,170,0.7);
  color: #79ffba;
  padding: .06rem .38rem;
  border-radius: 999px;
  background: rgba(10,50,20,0.35);
  line-height: 1;
}

.body { display: grid; gap: .3rem; align-content: start; }

.lead { color: #9ec5e6; font-size: .9rem; }
.label { color: #9ec5e6; font-size: .85rem; }
.highlight { color: #79ffba; }

/* divider */
.divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(30,144,255,0.28), rgba(30,144,255,0.10) 60%, transparent);
  border-radius: 1px;
}

/* Constrain trainer list width + tidy rows */
.trainers-block { width: 100%; max-width: clamp(160px, 78%, 220px); }

.vlist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: .18rem;
}
.vlist li {
  color: #e6f3ff;
  background: rgba(0,10,30,0.16);
  border: 1px solid rgba(30,144,255,0.20);
  border-radius: .35rem;
  padding: .2rem .45rem;
  font-size: .9rem;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* S-Shop rows */
.list .row {
  padding: .16rem 0;
  color: #e6f3ff;
  border-bottom: 1px dashed rgba(30,144,255,0.18);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.list .row:last-child { border-bottom: 0; }
</style>
