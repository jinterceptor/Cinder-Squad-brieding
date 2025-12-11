<template>
  <div class="members-view">
    <h1>Unit Members</h1>

    <div v-if="members.length" class="members-grid">
      <div v-for="member in members" :key="member.id" class="member-card">
        <!-- Header -->
        <div class="member-header">
          <h2>{{ member.name.toUpperCase() }}</h2>
          <span class="subtitle">({{ member.rank }})</span>
        </div>

        <!-- Info blocks -->
        <div class="member-info">
          <div class="info-left">
            <p><strong>Join Date:</strong> {{ member.joinDate }}</p>
            <p><strong>Member ID:</strong> {{ member.id }}</p>
            <p><strong>Squad:</strong> {{ member.squad || 'Unassigned' }}</p>
          </div>
          <div class="info-right">
            <p>CALLSIGN AVAILABLE</p>
            <p>IDENTITY VERIFIED</p>
            <p>DATA REGISTERED</p>
          </div>
        </div>

        <!-- Skills / Certifications -->
        <div class="member-skills">
          <p><strong>Certifications:</strong></p>
          <div class="skills-tags">
            <span v-for="(cert, index) in member.certifications" :key="index" class="skill-tag">
              {{ cert }}
            </span>
          </div>
        </div>

        <!-- Footer / Biometric -->
        <div class="member-footer">
          <p>BIOMETRIC RECORD VALID</p>
          <p>UNSC SYSTEMS DATABASE</p>
        </div>
      </div>
    </div>

    <p v-else>Loading members...</p>
  </div>
</template>

<script>
export default {
  props: {
    members: {
      type: Array,
      default: () => [],
    },
  },
};
</script>

<style scoped>
.members-view {
  padding: 1rem;
  color: #dce6f1;
  font-family: 'Consolas', 'Courier New', monospace;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.member-card {
  background: rgba(0, 10, 30, 0.7);
  padding: 1rem;
  border-left: 4px solid #1e90ff;
  border-radius: 0.3rem;
  box-shadow: 0 0 8px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
}

.member-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #1e90ff;
}

.subtitle {
  font-size: 0.85rem;
  color: #9ec5e6;
}

.member-info {
  display: flex;
  justify-content: space-between;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.member-skills {
  margin: 0.5rem 0;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.2rem;
}

.skill-tag {
  background: #1e90ff;
  color: #fff;
  padding: 0.2rem 0.4rem;
  border-radius: 0.2rem;
  font-size: 0.75rem;
}

.member-footer {
  font-size: 0.7rem;
  margin-top: 0.5rem;
  color: #7aa7c7;
}
</style>
