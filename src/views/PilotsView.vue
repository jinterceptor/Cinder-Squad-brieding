<template>
  <section id="pilots" :class="{ animate: animate }" class="section-container">
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward-pilot">
        <img src="/icons/license.svg" />
        <h1>Pilot Roster</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <div class="pilot-list-container">
        <div
          v-for="pilot in pilots"
          :key="pilot.id"
          class="pilot-card"
          @click="openPilotModal(pilot)"
        >
          <img :src="getPilotPortrait(pilot)" class="pilot-portrait" />
          <div class="pilot-details">
            <h2>{{ pilot.callsign || pilot.name }}</h2>
            <p><strong>Rank:</strong> {{ pilot.rank }}</p>
            <p><strong>Squad:</strong> {{ pilot.squad || 'Unassigned' }}</p>
            <p><strong>Slot:</strong> {{ pilot.squadAssignments || 'N/A' }}</p>
            <p>
              <strong>Certifications:</strong>
              <span v-if="pilot.certifications?.length">
                {{ pilot.certifications.join(", ") }}
              </span>
              <span v-else>None</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import PilotModal from "@/components/modals/PilotModal.vue";

export default {
  props: {
    animate: { type: Boolean, required: true },
    pilots: { type: Array, required: true },
    orbat: { type: Array, required: true },
  },
  methods: {
    getPilotPortrait(pilot) {
      // Default to member ID if callsign is missing
      const identifier = pilot.callsign || pilot.name;
      return `/pilots/${identifier.toUpperCase()}.webp`;
    },
    openPilotModal(pilot) {
      this.$oruga.modal.open({
        component: PilotModal,
        custom: true,
        trapFocus: true,
        props: {
          pilot: pilot,
          talents: pilot.talents || [], // fallback if using Lancer talents
          skills: pilot.skills || [],
          frames: pilot.frames || [],
          getTalent: (id) => (pilot.talents?.find((t) => t.id === id) || { name: "Unknown Talent" }),
        },
        class: "custom-modal",
        width: 1200,
      });
    },
  },
};
</script>

<style scoped>
.pilot-list-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.pilot-card {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 0.5rem;
  width: 220px;
  cursor: pointer;
  transition: transform 0.2s;
}

.pilot-card:hover {
  transform: scale(1.05);
}

.pilot-portrait {
  width: 100%;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.pilot-details h2 {
  margin: 0.2rem 0;
  font-size: 1.1rem;
}

.pilot-details p {
  margin: 0.1rem 0;
  font-size: 0.9rem;
}
</style>
