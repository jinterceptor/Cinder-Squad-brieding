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
        <div class="panel">
          <div v-if="loading" class="muted">Loading RefData…</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else class="cards-grid">
            <div v-for="role in trainers" :key="role.key" class="card">
              <div class="card-head">
                <h3 class="title">{{ role.title }}</h3>
                <div v-if="role.lead" class="lead">
                  Lead: <span class="highlight">{{ role.lead }}</span>
                </div>
              </div>
              <div class="body">
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
        <div class="panel">
          <div v-if="loading" class="muted">Loading RefData…</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else class="cards-grid cols-2">
            <div v-for="s in shops" :key="s.key" class="card">
              <div class="card-head">
                <h3 class="title">{{ s.title }}</h3>
              </div>
              <div class="body">
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
  props: {
    animate: { type: Boolean, default: true },
  },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",
      loading: true,
      error: "",

      // Wired to your RefData (gid=107253735)
      refDataCsvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=107253735&single=true&output=csv",

      trainers: [], // [{key,title,lead,others:[]}]
      shops: [],    // [{key,title,people:[]}]
    };
  },
  created() {
    this.loadRefData();
  },
  mounted() {
    this.triggerFlicker();
  },
  methods: {
    // why: ensure consistent view fade-in like other pages
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

        // Headers are row 2 (index 1)
        const headerRow = table[1] || [];

        // Trainers: V..AE (1-based 22..31) -> 0-based 21..30
        const TRAINER_COLS = this.range(21, 30);
        // S-Shops: AF..AI (1-based 32..35) -> 0-based 31..34
        const SSHOP_COLS = this.range(31, 34);

        // Build Trainers
        const trainers = [];
        for (const c of TRAINER_COLS) {
          const title = this.cleanHeader(headerRow[c] || "");
          if (!title) continue;
          const names = this.readDown(table, 2, c);
          const lead = names[0] || "";
          const others = names.slice(1);
          trainers.push({ key: `role-${c}`, title, lead, others });
        }

        // Build S-Shops
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

    // helpers
    range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; },
    readDown(table, startRow, colIndex) {
      const out = [];
      for (let r = startRow; r < table.length; r++) {
        const v = this.cleanName(table[r]?.[colIndex] || "");
        if (!v) break; // stop at first empty
        out.push(v);
      }
      return out;
    },
    cleanHeader(s) { return String(s).replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim(); },
    cleanName(s) { return String(s).replace(/\s+/g, " ").trim(); },

    // minimal CSV parser (mirrors other views)
    parseCsv(text) {
      const rows = [];
      let cur = [], val = "", inQ = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
          if (ch === '"') {
            if (text[i + 1] === '"') { val += '"'; i++; }
            else { inQ = false; }
          } else { val += ch; }
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
.header-shell { height: 52px; overflow: hidden; }
.muted { color: #9ec5e6; }
.error { color: #ff9f9f; }

.panel {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.18);
  border-radius: .5rem;
  padding: .7rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .8rem;
}
.cards-grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.card {
  border: 1px solid rgba(30,144,255,0.28);
  background: rgba(0,10,30,0.28);
  border-radius: .5rem;
  padding: .6rem .7rem;
}
.card-head { margin-bottom: .4rem; }
.title {
  margin: 0;
  color: #d9ebff;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 1.05rem;
}
.lead { color: #9ec5e6; margin-top: .15rem; }
.highlight { color: #79ffba; }
.label { color: #9ec5e6; margin-bottom: .25rem; font-size: .9rem; }

.list .row { padding: .18rem 0; color: #e6f3ff; }

@media (max-width: 1200px) {
  .cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .cards-grid, .cards-grid.cols-2 { grid-template-columns: 1fr; }
}
</style>
