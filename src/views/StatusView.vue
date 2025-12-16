<!-- src/views/StatusView.vue -->
<template>
  <section id="status" class="section-container">
    <!-- Header -->
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward-status">
        <img src="/icons/orbital.svg" alt="Status Icon" />
        <h1>Mission Status</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <div class="status-grid">
        <!-- Current Assignment -->
        <div class="card">
          <div class="card-title">
            <h2>Current Assignment</h2>
            <span class="badge" :class="statusBadge(currentAssignment?.status)">
              {{ (currentAssignment?.status || 'N/A').toUpperCase() }}
            </span>
          </div>
          <div v-if="currentAssignment" class="card-body">
            <h3 class="entry-title">{{ currentAssignment.name }}</h3>
            <pre class="entry-content">{{ missionExcerpt(currentAssignment.content) }}</pre>
          </div>
          <div v-else class="card-empty">No mission data.</div>
        </div>

        <!-- Upcoming Operation -->
        <div class="card">
          <div class="card-title">
            <h2>Upcoming Operation</h2>
          </div>
          <div v-if="upcomingOp" class="card-body">
            <h3 class="entry-title">{{ upcomingOp.title }}</h3>
            <p class="meta"><strong>Location:</strong> {{ upcomingOp.location || 'TBD' }}</p>
            <p class="meta"><strong>Time:</strong> {{ upcomingOp.time || 'TBD' }}</p>
            <pre class="entry-content">{{ eventExcerpt(upcomingOp.content) }}</pre>
          </div>
          <div v-else class="card-empty">No scheduled operations.</div>
        </div>

        <!-- Unit Strength -->
        <div class="card">
          <div class="card-title"><h2>Unit Strength</h2></div>
          <div class="card-body">
            <div class="stats">
              <div class="stat">
                <div class="stat-label">Personnel</div>
                <div class="stat-value">{{ totalMembers }}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Elements</div>
                <div class="stat-value">{{ totalSquads }}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Vacant Slots</div>
                <div class="stat-value">{{ totalVacant }}</div>
              </div>
            </div>

            <div class="squad-list" v-if="squadSummaries.length">
              <div class="squad-pill" v-for="s in squadSummaries" :key="s.name">
                <span class="pill-name">{{ s.name }}</span>
                <span class="pill-count">{{ s.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Open Vacancies -->
        <div class="card">
          <div class="card-title"><h2>Open Vacancies</h2></div>
          <div v-if="vacancyList.length" class="card-body vacancies">
            <div class="vacancy-row" v-for="(v, i) in vacancyList" :key="i">
              <span class="vacancy-squad">{{ v.squad }}</span>
              <span class="vacancy-ft">{{ v.fireteam }}</span>
              <span class="vacancy-role">{{ v.role }}</span>
            </div>
          </div>
          <div v-else class="card-empty">No vacancies detected.</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: "StatusView",
  props: {
    animate: { type: Boolean, default: false },
    initialSlug: { type: String, default: "" },
    missions: { type: Array, default: () => [] },
    events: { type: Array, default: () => [] },
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
    // reserves prop still passed from App.vue; intentionally unused
    reserves: { type: Array, default: () => [] },
  },
  computed: {
    /* Current Assignment: prefer ACTIVE, else last mission */
    currentAssignment() {
      const ms = (this.missions || []).slice();
      const active = ms.find((m) => String(m.status || "").toUpperCase().includes("ACTIVE"));
      if (active) return active;
      return ms.length ? ms[ms.length - 1] : null;
    },

    /* Upcoming Operation: first event entry */
    upcomingOp() {
      const es = (this.events || []).slice();
      return es.length ? es[0] : null;
    },

    totalMembers() {
      return (this.members || []).length;
    },
    totalSquads() {
      return (this.orbat || []).length;
    },
    totalVacant() {
      let n = 0;
      (this.orbat || []).forEach((sq) => {
        (sq.fireteams || []).forEach((ft) => {
          (ft.slots || []).forEach((s) => {
            if (String(s.status || "").toUpperCase() === "VACANT") n++;
          });
        });
      });
      return n;
    },
    squadSummaries() {
      const out = [];
      (this.orbat || []).forEach((sq) => {
        let count = 0;
        if (sq.fireteams && sq.fireteams.length) {
          sq.fireteams.forEach((ft) =>
            (ft.slots || []).forEach((s) => {
              if (s.status === "FILLED" && s.member) count++;
            })
          );
        } else {
          count = (sq.members || []).length;
        }
        out.push({ name: sq.squad, count });
      });
      // sort by name
      return out.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
    },
    vacancyList() {
      const rows = [];
      (this.orbat || []).forEach((sq) => {
        (sq.fireteams || []).forEach((ft) => {
          (ft.slots || []).forEach((s) => {
            if (String(s.status || "").toUpperCase() === "VACANT") {
              rows.push({
                squad: sq.squad,
                fireteam: ft.name || "Element",
                role: s.role || "Unassigned",
              });
            }
          });
        });
      });
      return rows.slice(0, 24); // keep it compact
    },
  },
  methods: {
    missionExcerpt(txt) {
      const s = String(txt || "").trim();
      return s.length > 420 ? s.slice(0, 420) + "…" : s || "—";
    },
    eventExcerpt(txt) {
      const s = String(txt || "").trim();
      return s.length > 280 ? s.slice(0, 280) + "…" : s || "—";
    },
    statusBadge(status) {
      const s = String(status || "").toUpperCase();
      if (s.includes("ACTIVE")) return "active";
      if (s.includes("COMPLETE")) return "complete";
      if (s.includes("PLANNED")) return "planned";
      return "unknown";
    },
  },
};
</script>

<style scoped>
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

.status-grid {
  display: grid;
  gap: 1.4rem;
  grid-template-columns: repeat(12, 1fr);
}

/* layout: 2x2 cards responsive */
.card:nth-child(1) { grid-column: span 6; }
.card:nth-child(2) { grid-column: span 6; }
.card:nth-child(3) { grid-column: span 6; }
.card:nth-child(4) { grid-column: span 6; }

@media (max-width: 1200px) {
  .card { grid-column: span 12 !important; }
}

.card {
  background: rgba(0, 10, 30, 0.9);
  border: 2px solid rgba(30, 144, 255, 0.85);
  border-radius: 0.8rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  padding: 1rem 1.25rem;
}

.card-title {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.6rem;
}
.card-title h2 { margin: 0; letter-spacing: 0.06em; }

.badge {
  border: 1px solid rgba(122, 167, 199, 0.55);
  border-radius: 0.35rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ec5e6;
}
.badge.active { border-color: rgba(120, 255, 170, 0.85); color: rgba(120, 255, 170, 0.95); }
.badge.complete { border-color: rgba(170, 170, 170, 0.85); color: rgba(220, 220, 220, 0.95); }
.badge.planned { border-color: rgba(255, 190, 80, 0.85); color: rgba(255, 220, 140, 0.95); }

.card-body { white-space: pre-wrap; }
.entry-title { margin: 0.1rem 0 0.35rem; color: #e0f0ff; }
.entry-content {
  margin: 0;
  font-size: 0.92rem;
  color: #9ec5e6;
  background: rgba(0, 0, 0, 0.25);
  border: 1px dashed rgba(30,144,255,0.35);
  border-radius: 0.35rem;
  padding: 0.5rem 0.6rem;
}

.card-empty {
  color: #9ec5e6;
  opacity: 0.8;
  font-size: 0.92rem;
  border: 1px dashed rgba(30,144,255,0.35);
  border-radius: 0.35rem;
  padding: 0.7rem 0.8rem;
  background: rgba(0, 0, 0, 0.15);
}

/* Unit Strength */
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .6rem;
  margin: .4rem 0 .8rem;
}
.stat {
  background: rgba(0, 0, 0, 0.25);
  border: 1px dashed rgba(30,144,255,0.35);
  border-radius: 0.35rem;
  padding: 0.5rem 0.6rem;
  display: flex; flex-direction: column; gap: 0.15rem;
}
.stat-label { font-size: 0.8rem; color: #9ec5e6; text-transform: uppercase; }
.stat-value { font-size: 1.3rem; color: #e0f0ff; font-weight: 700; }

.squad-list { display: flex; flex-wrap: wrap; gap: .4rem; }
.squad-pill {
  display: inline-flex; align-items: center; gap: .4rem;
  border: 1px solid rgba(30,144,255,0.65);
  color: #9ec5e6; border-radius: 999px; padding: .2rem .5rem;
}
.pill-name { font-size: .85rem; }
.pill-count { font-size: .85rem; color: #e0f0ff; }

.vacancies { display: grid; gap: .35rem; }
.vacancy-row {
  display: grid; grid-template-columns: 1.5fr 1fr 1.5fr; gap: .5rem;
  border: 1px dashed rgba(30,144,255,0.35);
  border-radius: .35rem; padding: .35rem .5rem; background: rgba(0,0,0,0.25);
}
.vacancy-squad { color: #e0f0ff; }
.vacancy-ft { color: #c7ddf2; }
.vacancy-role { color: #9ec5e6; }
</style>
