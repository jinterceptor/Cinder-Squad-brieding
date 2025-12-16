<!-- src/views/StatusView.vue -->
<template>
  <section id="status" class="section-container">
    <!-- Header (unchanged visuals) -->
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward-status">
        <img src="/icons/orbital.svg" alt="Status Icon" />
        <h1>Mission Status</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <!-- Current Assignment -->
      <div>
        <h2>Current Assignment</h2>
        <template v-if="currentAssignment">
          <p><strong>Name:</strong> {{ currentAssignment.name }}</p>
          <p><strong>Status:</strong> {{ (currentAssignment.status || 'N/A').toUpperCase() }}</p>
          <pre style="white-space: pre-wrap; margin: .5rem 0 0">{{ missionExcerpt(currentAssignment.content) }}</pre>
        </template>
        <p v-else>No mission data.</p>
      </div>

      <hr />

      <!-- Upcoming Operation -->
      <div>
        <h2>Upcoming Operation</h2>
        <template v-if="upcomingOp">
          <p class="meta"><strong>Title:</strong> {{ upcomingOp.title }}</p>
          <p class="meta"><strong>Location:</strong> {{ upcomingOp.location || 'TBD' }}</p>
          <p class="meta"><strong>Time:</strong> {{ upcomingOp.time || 'TBD' }}</p>
          <pre style="white-space: pre-wrap; margin: .5rem 0 0">{{ eventExcerpt(upcomingOp.content) }}</pre>
        </template>
        <p v-else>No scheduled operations.</p>
      </div>

      <hr />

      <!-- Unit Strength -->
      <div>
        <h2>Unit Strength</h2>
        <p><strong>Personnel:</strong> {{ totalMembers }}</p>
        <p><strong>Elements:</strong> {{ totalSquads }}</p>
        <p><strong>Vacant Slots:</strong> {{ totalVacant }}</p>

        <div v-if="squadSummaries.length" style="margin-top:.6rem">
          <p><strong>By Element:</strong></p>
          <ul style="margin: .3rem 0 0">
            <li v-for="s in squadSummaries" :key="s.name">
              {{ s.name }} — {{ s.count }}
            </li>
          </ul>
        </div>
      </div>

      <hr />

      <!-- Open Vacancies -->
      <div>
        <h2>Open Vacancies</h2>
        <template v-if="vacancyList.length">
          <ul style="margin: .3rem 0 0">
            <li v-for="(v, i) in vacancyList" :key="i">
              <strong>{{ v.squad }}</strong> · {{ v.fireteam }} — {{ v.role }}
            </li>
          </ul>
        </template>
        <p v-else>No vacancies detected.</p>
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
    // still accepted from App.vue, but intentionally unused in the UI now
    reserves: { type: Array, default: () => [] },
  },
  computed: {
    // Prefer ACTIVE mission; otherwise last mission entry
    currentAssignment() {
      const ms = (this.missions || []).slice();
      const active = ms.find(m => String(m.status || "").toUpperCase().includes("ACTIVE"));
      return active || (ms.length ? ms[ms.length - 1] : null);
    },
    // First events entry
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
      return out.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), undefined, { numeric: true })
      );
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
      return rows.slice(0, 24);
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
  },
};
</script>

<style scoped>
/* No new visual styles introduced on purpose — your existing global styles apply. */
</style>
