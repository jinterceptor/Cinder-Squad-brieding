<!-- src/views/StatusView.vue -->
<template>
  <div
    id="status"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
    class="content-container"
  >
    <!-- Mission Log (unchanged) -->
    <section id="missions" class="section-container" :style="{ 'animation-delay': animationDelay }">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/campaign.svg" />
        <h1>Mission Log</h1>
      </div>
      <div class="section-content-container">
        <div class="mission-list-container">
          <Mission
            v-for="item in missions"
            :key="item.slug"
            :mission="item"
            :selected="missionSlug"
            @click="selectMission(item.slug)"
          />
        </div>
      </div>
    </section>

    <!-- Current Assignment (markdown renderer preserved + heading handling) -->
    <section id="assignment" class="section-container" :style="{ 'animation-delay': animationDelay }">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/deployable.svg" />
        <h1>Current Assignment</h1>
      </div>
      <div class="section-content-container">
        <vue-markdown-it :source="missionMarkdown" class="markdown" />
      </div>
    </section>

    <!-- Current Status (overview; no custom boxes, just your theme) -->
    <section id="overview" class="section-container" :style="{ 'animation-delay': animationDelay }">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/orbital.svg" />
        <h1>Current Status</h1>
      </div>
      <div class="section-content-container">
        <!-- Summary lines -->
        <p><strong>Personnel:</strong> {{ stats.totalMembers }} ·
           <strong>Active:</strong> {{ stats.activeMembers }} ·
           <strong>Reserves:</strong> {{ stats.reservesMembers }}</p>
        <p><strong>Elements:</strong> {{ stats.totalElements }} ·
           <strong>Fireteams:</strong> {{ stats.totalFireteams }} ·
           <strong>Filled:</strong> {{ stats.filledSlots }} ·
           <strong>Vacant:</strong> {{ stats.vacantSlots }} ·
           <strong>Fill Rate:</strong> {{ stats.fillRate }}%</p>

        <p><strong>Active Mission:</strong> {{ currentAssignment ? currentAssignment.name : 'None' }}</p>
        <p><strong>Upcoming Operation:</strong> {{ upcomingOpTitle }} — {{ upcomingOpTime }}</p>

        <hr />

        <!-- Per-element quick headcounts -->
        <div v-if="elementSummaries.length">
          <p><strong>Elements Overview:</strong></p>
          <ul>
            <li v-for="row in elementSummaries" :key="row.name">
              {{ row.name }} — {{ row.filled }} filled<span v-if="row.vacant > 0"> · {{ row.vacant }} vacant</span>
            </li>
          </ul>
        </div>

        <hr />

        <!-- Upcoming promotions -->
        <div>
          <h3>Upcoming Promotions</h3>
          <template v-if="upcomingPromotions.length">
            <ul>
              <li
                v-for="(p, i) in upcomingPromotions"
                :key="p.id || p.name + i"
              >
                <strong>{{ p.name }}</strong> — {{ p.rank }} → {{ p.nextRank || '—' }}
                <span v-if="p.opsToNext > 0"> ({{ p.opsToNext }} ops)</span>
                <span v-else> — ELIGIBLE</span>
              </li>
            </ul>
          </template>
          <p v-else>No upcoming promotions detected.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { VueMarkdownIt } from '@f3ve/vue-markdown-it';
import Mission from "@/components/Mission.vue";

export default {
  name: "StatusView",
  components: { VueMarkdownIt, Mission },
  props: {
    animate: { type: Boolean, required: true },
    initialSlug: { type: String, required: true },
    missions: { type: Array, required: true },
    events: { type: Array, required: true },
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
    reserves: { type: Array, default: () => [] }, // optional; used for count if provided
  },
  data() {
    return {
      missionSlug: this.initialSlug,
      animateView: this.animate,
      animationDelay: "1.75s",
      missionMarkdown: "",
    };
  },
  computed: {
    currentAssignment() {
      const ms = (this.missions || []).slice();
      const active = ms.find((m) => String(m.status || "").toUpperCase().includes("ACTIVE"));
      return active || (ms.length ? ms[ms.length - 1] : null);
    },
    upcomingOp() {
      const es = (this.events || []).slice();
      return es.length ? es[0] : null;
    },
    upcomingOpTitle() { return this.upcomingOp ? (this.upcomingOp.title || "TBD") : "None"; },
    upcomingOpTime() { return this.upcomingOp ? (this.upcomingOp.time || "TBD") : "—"; },

    // Overview stats (no styling assumptions)
    stats() {
      const members = this.members || [];
      const orbat = this.orbat || [];

      const reservesMembers = Array.isArray(this.reserves) && this.reserves.length
        ? this.reserves.length
        : members.filter((m) => String(m.squad || "").toLowerCase() === "reserves").length;

      const activeMembers = members.length - reservesMembers;

      let totalFireteams = 0, filledSlots = 0, vacantSlots = 0;
      orbat.forEach((sq) => {
        (sq.fireteams || []).forEach((ft) => {
          const slots = ft.slots || [];
          if (slots.length) totalFireteams += 1;
          slots.forEach((s) => {
            const st = String(s.status || "").toUpperCase();
            if (st === "FILLED" && s.member) filledSlots++;
            else if (st === "VACANT") vacantSlots++;
          });
        });
      });

      const totalSlots = filledSlots + vacantSlots;
      const fillRate = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 100;

      return {
        totalMembers: members.length,
        totalElements: orbat.length,
        totalFireteams,
        filledSlots,
        vacantSlots,
        fillRate,
        activeMembers,
        reservesMembers,
      };
    },

    elementSummaries() {
      const rows = [];
      (this.orbat || []).forEach((sq) => {
        let filled = 0, vacant = 0;
        if (sq.fireteams && sq.fireteams.length) {
          sq.fireteams.forEach((ft) => {
            (ft.slots || []).forEach((s) => {
              const st = String(s.status || "").toUpperCase();
              if (st === "FILLED" && s.member) filled++;
              else if (st === "VACANT") vacant++;
            });
          });
        } else {
          filled = (sq.members || []).length;
        }
        rows.push({ name: sq.squad, filled, vacant });
      });
      return rows.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
    },

    upcomingPromotions() {
      const list = [];
      (this.members || []).forEach((m) => {
        const opsToNext = this.opsToNextPromotion(m);
        const nextRank = this.nextPromotionRank(m);
        if (opsToNext === null || nextRank === null) return;
        list.push({
          id: m.id, name: m.name || "Unknown", rank: m.rank || "N/A",
          nextRank, opsToNext, opsAttended: Number(m.opsAttended ?? NaN),
        });
      });
      list.sort((a, b) => {
        if (a.opsToNext !== b.opsToNext) return a.opsToNext - b.opsToNext;
        if (Number.isFinite(b.opsAttended) && Number.isFinite(a.opsAttended)) {
          if (b.opsAttended !== a.opsAttended) return b.opsAttended - a.opsAttended;
        }
        return String(a.name).localeCompare(String(b.name));
      });
      return list.slice(0, 10);
    },
  },
  created() {
    this.setAnimate();
  },
  beforeUpdate() {
    this.selectMission(this.missionSlug);
  },
  mounted() {
    if (this.missions.length > 0) {
      this.selectMission(this.missions[0].slug);
    }
  },
  methods: {
    selectMission(slug) {
      this.missionSlug = slug;
      const m = this.missions.find((x) => x.slug === this.missionSlug);
      this.missionMarkdown = this.buildAssignmentMarkdown(m);
    },
    buildAssignmentMarkdown(mission) {
      if (!mission) return "";
      const body = String(mission.content || "").trim();
      const startsWithHeading = /^#{1,6}\s+/.test(body);
      if (startsWithHeading) return body;

      const name = (mission.name || "").trim();
      const status = (mission.status || "").trim();
      const titleLine = name ? `# ${name}\n\n` : "";
      const subtitleLine = status ? `## ${status}\n\n` : "";
      return `${titleLine}${subtitleLine}${body}`.trim();
    },
    setAnimate() {
      if (this.animate) this.animateView = true;
      const statusAnimated = window.sessionStorage.getItem("statusAnimated");
      if (statusAnimated) this.animationDelay = "0s";
      if (statusAnimated === null) window.sessionStorage.setItem("statusAnimated", true);
    },

    // Promotion helpers (same ladder you’ve standardized)
    rankKey(rank) { return String(rank || "").trim().toUpperCase().replace(/[.\s]/g, ""); },
    promotionLadderFor(rank) {
      const r = this.rankKey(rank);
      const alias = {
        PRIVATE: "PVT", PVT: "PVT", "PRIVATEFIRSTCLASS": "PFC", PFC: "PFC",
        SPECIALIST: "SPC", SPC: "SPC", "SPECIALIST2": "SPC2", SPC2: "SPC2",
        "SPECIALIST3": "SPC3", SPC3: "SPC3", "SPECIALIST4": "SPC4", SPC4: "SPC4",
        HOSPITALMANAPPRENTICE: "HA", HA: "HA", HOSPITALMAN: "HN", HN: "HN",
        "HOSPITALCORPSMANTHIRDCLASS": "HM3", HM3: "HM3",
        "HOSPITALCORPSMANSECONDCLASS": "HM2", HM2: "HM2",
        WARRANTOFFICER: "WO", WO: "WO",
        "CHIEFWARRANTOFFICER2": "CWO2", CWO2: "CWO2",
        "CHIEFWARRANTOFFICER3": "CWO3", CWO3: "CWO3",
        "CHIEFWARRANTOFFICER4": "CWO4", CWO4: "CWO4",
      };
      const key = alias[r] || r;
      const ladders = {
        PVT: { nextAt: 2, nextRank: "PFC" }, PFC: { nextAt: 10, nextRank: "SPC" },
        SPC: { nextAt: 20, nextRank: "SPC2" }, SPC2: { nextAt: 30, nextRank: "SPC3" },
        SPC3: { nextAt: 40, nextRank: "SPC4" }, SPC4: { nextAt: null, nextRank: null },
        HA: { nextAt: 2, nextRank: "HN" }, HN: { nextAt: 10, nextRank: "HM3" },
        HM3: { nextAt: 20, nextRank: "HM2" }, HM2: { nextAt: 30, nextRank: null },
        WO: { nextAt: null, nextRank: null }, CWO2: { nextAt: 10, nextRank: "CWO3" },
        CWO3: { nextAt: 20, nextRank: "CWO4" }, CWO4: { nextAt: 30, nextRank: null },
      };
      return ladders[key] || null;
    },
    opsToNextPromotion(member) {
      const ops = Number(member?.opsAttended);
      if (!Number.isFinite(ops)) return null;
      const ladder = this.promotionLadderFor(member?.rank);
      if (!ladder || !Number.isFinite(ladder.nextAt)) return null;
      return Math.max(0, ladder.nextAt - ops);
    },
    nextPromotionRank(member) {
      const ladder = this.promotionLadderFor(member?.rank);
      return ladder?.nextRank || null;
    },
  },
};
</script>

<style scoped>
/* Keep your global theme; only retain the markdown h3 override you wanted */
.markdown :deep(h3) { color: #9ec5e6; }
/* If legacy deep selector is needed:
::v-deep(.markdown h3) { color: #9ec5e6; }
*/
</style>
