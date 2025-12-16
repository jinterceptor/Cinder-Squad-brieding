<!-- src/views/StatusView.vue -->
<template>
  <div
    id="statusView"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
    class="content-container"
  >
    <!-- MISSION LOG (unchanged visuals) -->
    <section
      id="missions"
      class="section-container"
      :style="{ 'animation-delay': animationDelay }"
    >
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

    <!-- CURRENT ASSIGNMENT (uses Mission.vue for identical styling) -->
    <section
      id="assignment"
      class="section-container"
      :style="{ 'animation-delay': animationDelay }"
    >
      <div class="section-header clipped-medium-backward">
        <img src="/icons/orbital.svg" />
        <h1>Current Assignment</h1>
      </div>
      <div class="section-content-container">
        <div v-if="currentAssignment">
          <!-- Reuse Mission component so card/box styles match your log -->
          <div class="mission-list-container">
            <Mission
              :mission="currentAssignment"
              :selected="currentAssignment.slug"
              @click="noop"
            />
          </div>
        </div>
        <div v-else class="assignment-empty">
          No mission data available.
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import Mission from "@/components/Mission.vue";

export default {
  name: "StatusView",
  components: { Mission },
  props: {
    animate: { type: Boolean, default: false },
    initialSlug: { type: String, default: "" },
    missions: { type: Array, default: () => [] },
    events: { type: Array, default: () => [] },
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
    // still accepted; no UI for it now
    reserves: { type: Array, default: () => [] },
  },
  data() {
    return {
      missionSlug: this.initialSlug || "",
      animateView: false,
      animationDelay: "0.2s",
    };
  },
  computed: {
    // Prefer ACTIVE mission; else most recent entry
    currentAssignment() {
      const ms = (this.missions || []).slice();
      const active = ms.find((m) =>
        String(m.status || "").toUpperCase().includes("ACTIVE")
      );
      return active || (ms.length ? ms[ms.length - 1] : null);
    },
  },
  watch: {
    initialSlug(slug) {
      if (!slug) return;
      this.missionSlug = slug;
      const el = document.querySelector(`#m-${slug.replace(/[^\w-]/g, "")}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  },
  mounted() {
    if (this.animate) this.animateView = true;
    const statusAnimated = window.sessionStorage.getItem("statusAnimated");
    if (statusAnimated) this.animationDelay = "0s";
    else window.sessionStorage.setItem("statusAnimated", "true");
  },
  methods: {
    selectMission(slug) {
      this.missionSlug = slug;
    },
    noop() {
      /* keep click inert for the featured card */
    },
  },
};
</script>

<style scoped>
/* No new styles; rely on your existing global theme */
.assignment-empty { color: #9ec5e6; opacity: .85; }
</style>
