<template>
  <div class="pilot-modal">
    <div class="pilot-header-container">
      <div class="section-header clipped-medium-backward-bio">
        <img src="/icons/pilot.svg" />
        <h1>DOSSIER</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="pilot-content">
      <div class="pilot-main-info">
        <div class="pilot-image">
          <img :src="pilotPortrait" class="portrait" />
        </div>

        <div class="pilot-details">
          <h2>{{ pilot.callsign || pilot.name }}</h2>
          <p><strong>Name:</strong> {{ pilot.name }}</p>
          <p><strong>Rank:</strong> {{ pilot.rank || 'N/A' }}</p>
          <p><strong>Member ID:</strong> {{ pilot.id }}</p>
          <p><strong>Status:</strong> {{ pilot.status || 'Unknown' }}</p>
          <p><strong>Join Date:</strong> {{ pilot.joinDate || 'Unknown' }}</p>
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

      <div v-if="pilot.notes" class="pilot-notes">
        <h3>Notes / Bio</h3>
        <div v-html="pilot.notes"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    pilot: { type: Object, required: true },
  },
  computed: {
    pilotPortrait() {
      // Fallback to name if no callsign
      const identifier = this.pilot.callsign || this.pilot.name;
      return `/pilots/${identifier.toUpperCase()}.webp`;
    },
  },
};
</script>

<style scoped>
.pilot-modal {
  padding: 1rem;
  background-color: #111;
  color: white;
}

.pilot-header-container {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.pilot-header-container img {
  width: 48px;
  margin-right: 0.5rem;
}

.pilot-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pilot-main-info {
  display: flex;
  gap: 1rem;
}

.pilot-image img.portrait {
  width: 180px;
  border-radius: 6px;
}

.pilot-details h2 {
  margin: 0;
  font-size: 1.4rem;
}

.pilot-details p {
  margin: 0.2rem 0;
}

.pilot-notes {
  margin-top: 1rem;
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>
