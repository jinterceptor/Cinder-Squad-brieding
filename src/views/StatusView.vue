<!-- src/views/StatusView.vue -->
<template>
  <div
    id="status"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
    class="content-container"
  >
    <!-- Mission Log (unchanged visuals) -->
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

    <!-- Current Assignment (markdown renderer preserved + heading-level handling) -->
    <section id="assignment" class="section-container" :style="{ 'animation-delay': animationDelay }">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/deployable.svg" />
        <h1>Current Assignment</h1>
      </div>
      <div class="section-content-container">
        <vue-markdown-it :source="missionMarkdown" class="markdown" />
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
    events: { type: Array, required: true }, // kept for parity
  },
  data() {
    return {
      missionSlug: this.initialSlug,
      animateView: this.animate,
      animationDelay: "1.75s",
      missionMarkdown: "",
    };
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
  },
};
</script>

<style scoped>
/* Only change ### headings inside the markdown block; leave # and ## as-is */
.markdown :deep(h3) { color: #9ec5e6; }

/* If your setup uses legacy deep selector, use this instead:
::v-deep(.markdown h3) { color: #9ec5e6; }
*/
</style>
