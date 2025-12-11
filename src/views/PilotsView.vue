<template>
  <div class="members-view">
    <h1>Unit Members</h1>

    <div v-if="members.length" class="members-grid">
      <div v-for="member in members" :key="member.id" class="member-card">
        <h2>{{ member.rank }} {{ member.name }}</h2>
        <p><strong>Join Date:</strong> {{ member.joinDate }}</p>
        <p><strong>Member ID:</strong> {{ member.id }}</p>
        <p><strong>Certifications:</strong>
          <span v-for="(cert, index) in member.certifications" :key="index">
            {{ cert }}<span v-if="index < member.certifications.length - 1">, </span>
          </span>
        </p>
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
  color: #fff; /* white text for visibility on dark background */
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.member-card {
  background: rgba(0, 0, 0, 0.5); /* semi-transparent dark card */
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0,0,0,0.3);
  transition: transform 0.2s;
}

.member-card:hover {
  transform: scale(1.03);
}

.member-card h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.member-card p {
  margin: 0.2rem 0;
  font-size: 0.9rem;
}
</style>
