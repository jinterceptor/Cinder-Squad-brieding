<template>
  <section id="members" class="section-container">
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/license.svg" alt="Members Icon" />
        <h1>Unit Members</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <div v-if="members.length === 0">
        Loading members...
      </div>
      <ul v-else class="member-list">
        <li v-for="(member, index) in members" :key="index">
          {{ member }}
        </li>
      </ul>
    </div>
  </section>
</template>

<script>
export default {
  name: "PilotsView",
  props: {
    members: {
      type: Array,
      required: true,
    },
  },
};
</script>

<style scoped>
.section-container {
  padding: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
}

.section-header img {
  width: 32px;
  margin-right: 1rem;
}

.member-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.member-list li {
  padding: 0.25rem 0;
  border-bottom: 1px solid #ccc;
}
</style>
