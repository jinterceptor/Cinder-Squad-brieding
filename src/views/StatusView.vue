<!-- src/views/StatusView.vue -->
<template>
  <div
    id="statusView"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
    class="content-container"
  >
    <!-- MISSION LOG (keeps your visuals) -->
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

    <!-- CURRENT ASSIGNMENT (keeps your visuals) -->
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
        <div v-if="currentAssignment" class="assignment-container">
          <div class="assignment-meta">
            <p class="assignment-title">
              <strong>{{ currentAssignment.name }}</strong>
              <span class="assignment-status">
                {{ (currentAssignment.status || 'N/A').toUpperCase() }}
              </span>
            </p>
          </div>

          <!-- Keep content area simple so your global styles apply -->
          <div class="assignment-content">
            <pre style="white-space: pre-wrap; margin: .25rem 0 0">
{{ missionExcerpt(currentAssignment.content) }}
            </pre>
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
import { VueMarkdownIt } from "@f3ve/vue-markdown-it"; // kept if you render markdown elsewhere on this view
import Mission from "@/components/mission/Mission.vue";

export default {
  name: "StatusView",
  components: {
    VueMarkdownIt,
    Mission,
  },
  props: {
    animate: { type: Boolean, default: false },
    initialSlug: { type: String, default: "" },

    // data sources passed from App.vue
    missions: { type: Array, default: () => [] },
    events: { type: Array, default: () => [] },
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
    // still accepted, just unused now (safe to keep)
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
    currentAssignment() {
      // Prefer ACTIVE mission; else last in the list
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
    // preserve your existing “animate once” behavior
    if (this.animate) this.animateView = true;

    const statusAnimated = window.sessionStorage.getItem("statusAnimated");
    if (statusAnimated) {
      this.animationDelay = "0s";
    } else {
      window.sessionStorage.setItem("statusAnimated", "true");
    }
  },
  methods: {
    selectMission(slug) {
      this.missionSlug = slug;
    },
    missionExcerpt(txt) {
      const s = String(txt || "").trim();
      return s.length > 800 ? s.slice(0, 800) + "…" : s || "—";
    },
  },
};
</script>

<style scoped>
/* No new styles: rely on your existing global `.section-*`, `.clipped-medium-backward`, etc.  */
.assignment-title {
  margin: 0 0 .5rem;
  letter-spacing: .04em;
  color: #e0f0ff;
}
.assignment-status {
  margin-left: .5rem;
  font-size: .85rem;
  color: #9ec5e6;
  border: 1px solid rgba(122,167,199,.55);
  border-radius: .35rem;
  padding: .05rem .4rem;
  text-transform: uppercase;
}
.assignment-empty {
  color: #9ec5e6;
  opacity: .85;
}
</style>
