<!-- src/views/TrainingView.vue -->
<template>
  <div
    id="trainingView"
    class="content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- TRAINING & CONTACTS -->
    <section id="training" class="section-container">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>TRAINING & CONTACTS</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container">
        <div class="panel panel-wide">
          <div v-if="loading" class="muted">Loading RefData…</div>
          <div v-else-if="error" class="error">{{ error }}</div>

          <div v-else class="cards-grid trainers-grid">
            <div v-for="role in trainers" :key="role.key" class="card">
              <div class="card-head">
                <h3 class="title">{{ role.title }}</h3>
                <span v-if="role.lead" class="badge-lead" title="Lead trainer">LEAD</span>
              </div>

              <div class="body">
                <div v-if="role.lead" class="lead">
                  <span class="label">Contact:</span>
                  <span class="highlight">{{ role.lead }}</span>
                </div>

                <div class="divider" />

                <div class="label">Trainers</div>
                <div v-if="role.others.length" class="chips">
                  <span v-for="n in role.others" :key="n" class="chip">{{ n }}</span>
                </div>
                <div v-else class="muted">None listed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- S-SHOP PERSONNEL -->
    <section id="sshops" class="section-container">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>S-SHOP PERSONNEL</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container">
        <div class="panel panel-wide">
          <div v-if="loading" class="muted">Loading RefData…</div>
          <div v-else-if="error" class="error">{{ error }}</div>

          <div v-else class="cards-grid shops-grid">
            <div v-for="s in shops" :key="s.key" class="card">
              <div class="card-head">
                <h3 class="title">{{ s.title }}</h3>
              </div>

              <div class="body list-body">
                <div v-if="s.people.length" class="list">
                  <div v-for="n in s.people" :key="n" class="row">{{ n }}</div>
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

      // RefData (gid=107253735)
      refDataCsvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=107253735&single=true&output=csv",

      trainers: [], // [{key,title,lead,others:[]}]
      shops: [],    // [{key,title,people:[]}]
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
        const res = await fetch(this.refDataCsvUrl, { method: "GET" });
        if (!res.ok) throw new Error(`Failed to fetch RefData (HTTP ${res.status}).`);
        const csv = await res.text();
        const table = this.parseCsv(csv);

        const headerRow = table[1] || [];

        // Trainers: V..AE (22..31) -> 0-based 21..30
        const TRAINER_COLS = this.range(21, 30);
        // S-Shops: AF..AI (32..35) -> 0-based 31..34
        const SSHOP_COLS   = this.range(31, 34);

        const trainers = [];
        for (const c of TRAINER_COLS) {
          const title = this.cleanHeader(headerRow[c] || "");
          if (!title) continue;
          const names = this.readDown(table, 2, c);
          const lead = names[0] || "";
          const others = names.slice(1);
          trainers.push({ key: `role-${c}`, title, lead, others });
        }

        const shops = [];
        for (const c of SSHOP_COLS) {
          const title = this.cleanHeader(headerRow[c] || "");
          if (!title) continue;
          const people = this.readDown(table, 2, c);
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
/* Force one wide column and center each window */
#trainingView {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.2rem;
}
.section-container {
  width: min(95vw, 1600px);
  margin: 0 auto;
}
.section-content-container { max-width: none; }

/* Keep headers consistent */
.header-shell { height: 52px; overflow: hidden; }
.muted { color: #9ec5e6; }
.error { color: #ff9f9f; }

/* Inner window panel */
.panel {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.18);
  border-radius: .6rem;
  padding: .9rem 1rem;
}
.panel-wide { width: 100%; }

/* Responsive grids that actually use the width */
.cards-grid { display: grid; gap: .9rem; }
.trainers-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.shops-grid    { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }

/* Cards */
.card {
  border: 1px solid rgba(30,144,255,0.28);
  background: rgba(0,10,30,0.28);
  border-radius: .6rem;
  padding: .8rem .9rem;
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 148px;
}
.card-head {
  display: flex;
  align-items: center;
  gap: .6rem;
  margin-bottom: .4rem;
}
.title {
  margin: 0;
  color: #d9ebff;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 1.02rem;
  line-height: 1.2;
}
.badge-lead {
  margin-left: auto;
  font-size: .72rem;
  letter-spacing: .12em;
  border: 1px solid rgba(120,255,170,0.7);
  color: #79ffba;
  padding: .08rem .45rem;
  border-radius: 999px;
  background: rgba(10,50,20,0.35);
}

.body { display: grid; gap: .4rem; }
.list-body { align-content: start; }

.lead { color: #9ec5e6; }
.label { color: #9ec5e6; font-size: .9rem; }
.highlight { color: #79ffba; }

.divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(30,144,255,0.35), rgba(30,144,255,0.15) 60%, transparent);
  border-radius: 1px;
}

.chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.chip {
  padding: .18rem .55rem;
  border-radius: 999px;
  border: 1px solid rgba(30,144,255,0.45);
  background: rgba(0,10,30,0.35);
  color: #e6f3ff;
  font-size: .88rem;
}

.list .row { padding: .18rem 0; color: #e6f3ff; border-bottom: 1px dashed rgba(30,144,255,0.18); }
.list .row:last-child { border-bottom: 0; }

@media (max-width: 1280px) {
  .section-container { width: min(96vw, 1300px); }
}
@media (max-width: 900px) {
  .section-container { width: 96vw; }
}
</style>
