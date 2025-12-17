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

    <!-- Current Assignment (markdown preserved + heading-level handling) -->
    <section id="assignment" class="section-container" :style="{ 'animation-delay': animationDelay }">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/deployable.svg" />
        <h1>Current Assignment</h1>
      </div>
      <div class="section-content-container">
        <vue-markdown-it :source="missionMarkdown" class="markdown" />
      </div>
    </section>

    <!-- Status Overview -->
    <section id="overview" class="section-container" :style="{ 'animation-delay': animationDelay }">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/orbital.svg" />
        <h1>Current Status</h1>
      </div>
      <div class="section-content-container">
        <div class="status-grid">
          <!-- Block 1 -->
          <div class="status-block">
            <p><strong>Active Members:</strong> <span class="stat-num">{{ stats.activeMembers }}</span></p>
            <p><strong>Reserves:</strong> <span class="stat-num">{{ stats.reservesMembers }}</span></p>
            <p><strong>Elements:</strong> <span class="stat-num">{{ stats.totalElements }}</span></p>
          </div>

          <!-- Block 2: REPLACED with Fill % by Element -->
          <div class="status-block">
            <p class="block-title"><strong>Fill % by Element</strong></p>
            <div v-if="elementFillStats.length" class="element-fill-list">
              <div
                v-for="row in elementFillStats.slice(0, 8)"
                :key="row.name"
                class="element-row"
                :title="`${row.filled}/${row.total} filled`"
              >
                <span class="el-name">{{ row.name }}</span>
                <div class="el-bar">
                  <div class="el-bar-fill" :style="{ width: row.percent + '%' }"></div>
                </div>
                <span class="el-percent">{{ row.percent }}%</span>
              </div>
              <p v-if="elementFillStats.length > 8" class="muted">(+{{ elementFillStats.length - 8 }} more)</p>
            </div>
            <div v-else class="muted">No elements with slots detected.</div>
          </div>

          <!-- Block 3 -->
          <div class="status-block">
            <p><strong>Total Personnel:</strong> <span class="stat-num">{{ stats.totalMembers }}</span></p>
            <p><strong>Filled Slots:</strong> <span class="stat-num">{{ stats.filledSlots }}</span></p>
            <p><strong>Free Slots:</strong> <span class="stat-num">{{ stats.vacantSlots }}</span></p>
            <p><strong>Fill Rate:</strong> <span class="stat-num">{{ stats.fillRate }}%</span></p>
            <p><strong>Active Mission:</strong> <span class="stat-num">{{ currentAssignment ? currentAssignment.name : 'None' }}</span></p>
          </div>
        </div>

        <div class="promotions">
          <h3 class="promotions-title">Upcoming Promotions</h3>
          <div v-if="upcomingPromotions.length" class="promotions-list">
            <div
              v-for="(p, i) in upcomingPromotions"
              :key="p.id || p.name + i"
              class="promotion-row"
              :class="{ eligible: p.opsToNext === 0, imminent: p.opsToNext === 1 }"
              title="Ops attended pulled from Attendance sheet"
            >
              <span class="p-name">{{ p.name }}</span>
              <span class="p-ranks">{{ p.rank }} → {{ p.nextRank || '—' }}</span>
              <span class="p-ops" v-if="p.opsToNext > 0">{{ p.opsToNext }} ops</span>
              <span class="p-ops" v-else>ELIGIBLE</span>
            </div>
          </div>
          <div v-else class="promotions-empty">No upcoming promotions detected.</div>
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
    reserves: { type: Array, default: () => [] },
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
    stats() {
      const members = this.members || [];
      const orbat = this.orbat || [];

      const reservesMembers = Array.isArray(this.reserves) && this.reserves.length
        ? this.reserves.length
        : members.filter((m) => String(m.squad || "").toLowerCase() === "reserves").length;

      const activeMembers = members.filter((m) => String(m.squad || "").toLowerCase() !== "reserves").length;

      let totalFireteams = 0, filledSlots = 0, vacantSlots = 0;
      orbat.forEach((sq) => {
        (sq.fireteams || []).forEach((ft) => {
          const slots = ft.slots || [];
          if (slots.length) totalFireteams += 1;
          slots.forEach((s) => {
            const st = String(s.status || "").toUpperCase();
            if (st === "FILLED" && s.member) filledSlots += 1;
            else if (st === "VACANT") vacantSlots += 1;
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

    /* NEW: per-element fill stats */
    elementFillStats() {
      const out = [];
      (this.orbat || []).forEach((sq) => {
        let filled = 0, vacant = 0, hasSlots = false;
        (sq.fireteams || []).forEach((ft) => {
          const slots = ft.slots || [];
          if (slots.length) hasSlots = true;
          slots.forEach((s) => {
            const st = String(s.status || "").toUpperCase();
            if (st === "FILLED" && s.member) filled += 1;
            else if (st === "VACANT") vacant += 1;
          });
        });
        if (!hasSlots) return;
        const total = filled + vacant;
        const percent = total > 0 ? Math.round((filled / total) * 100) : 100;
        out.push({ name: sq.squad || "Element", filled, total, percent });
      });
      // sort: lowest fill first (to highlight issues)
      out.sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name));
      return out;
    },

    upcomingPromotions() {
      const list = [];
      (this.members || []).forEach((m) => {
        const opsToNext = this.opsToNextPromotion(m);
        const nextRank = this.nextPromotionRank(m);
        if (opsToNext === null || nextRank === null) return;
        list.push({
          id: m.id,
          name: m.name || "Unknown",
          rank: m.rank || "N/A",
          nextRank,
          opsToNext,
          opsAttended: Number(m.opsAttended ?? NaN),
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

    /* Promotion helpers */
    rankKey(rank) { return String(rank || "").trim().toUpperCase().replace(/[.\s]/g, ""); },
    promotionLadderFor(rank) {
      const r = this.rankKey(rank);
      const alias = {
        PRIVATE: "PVT", PVT: "PVT",
        "PRIVATEFIRSTCLASS": "PFC", PFC: "PFC",
        SPECIALIST: "SPC", SPC: "SPC",
        "SPECIALIST2": "SPC2", SPC2: "SPC2",
        "SPECIALIST3": "SPC3", SPC3: "SPC3",
        "SPECIALIST4": "SPC4", SPC4: "SPC4",
        HOSPITALMANAPPRENTICE: "HA", HA: "HA",
        HOSPITALMAN: "HN", HN: "HN",
        "HOSPITALCORPSMANTHIRDCLASS": "HM3", HM3: "HM3",
        "HOSPITALCORPSMANSECONDCLASS": "HM2", HM2: "HM2",
        WARRANTOFFICER: "WO", WO: "WO",
        "CHIEFWARRANTOFFICER2": "CWO2", CWO2: "CWO2",
        "CHIEFWARRANTOFFICER3": "CWO3", CWO3: "CWO3",
        "CHIEFWARRANTOFFICER4": "CWO4", CWO4: "CWO4",
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
/* Overview layout */
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: .8rem;
  margin-top: .2rem;
}
.status-block {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,0,0,0.15);
  border-radius: .35rem;
  padding: .5rem .6rem;
  color: #dce6f1;
}
.status-block p { margin: .25rem 0; color: #dce6f1; }
.status-block strong { color: #e0f0ff; }
.block-title { margin-bottom: .35rem; }

/* Pop the numbers with a themed accent */
.stat-num {
  color: #7ec9ff;
  font-weight: 700;
}

/* Fill % by Element list */
.element-fill-list { display: grid; gap: .38rem; }
.element-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr auto;
  gap: .5rem;
  align-items: center;
  font-size: .95rem;
}
.el-name { color: #cfe6ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-bar {
  height: 8px;
  background: rgba(30,144,255,0.18);
  border: 1px solid rgba(30,144,255,0.35);
  border-radius: 999px;
  overflow: hidden;
}
.el-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(126,201,255,0.95), rgba(126,201,255,0.65));
}
.el-percent { color: #a9d3ff; font-weight: 700; min-width: 3ch; text-align: right; }
.muted { color: #9ec5e6; opacity: .8; font-size: .9rem; }

/* Promotions list */
.promotions { margin-top: 1rem; }
.promotions-title { margin: 0 0 .4rem; letter-spacing: .06em; color: #dce6f1; }
.promotions-list { display: grid; gap: .35rem; }
.promotion-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr auto;
  gap: .6rem;
  align-items: center;
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,0,0,0.15);
  border-radius: .35rem;
  padding: .35rem .5rem;
  color: #dce6f1;
}
.promotion-row.eligible {
  border-color: rgba(120,255,170,0.85);
  box-shadow: 0 0 8px rgba(120,255,170,0.15) inset;
}
.promotion-row.imminent {
  border-color: rgba(255,190,80,0.85);
  box-shadow: 0 0 8px rgba(255,190,80,0.12) inset;
}
.p-name { color: #e0f0ff; }
.p-ranks { color: #9ec5e6; }
.p-ops { color: #cfdcea; }

/* Markdown h3 override (leave h1/h2 as-is) */
.markdown :deep(h3) { color: #9ec5e6; }
</style>
