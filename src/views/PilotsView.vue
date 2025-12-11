<template>
  <section class="section-container">
    <h1>Unit Members</h1>
    <ul v-if="members.length">
      <li v-for="name in members" :key="name">{{ name }}</li>
    </ul>
    <p v-else>Loading members...</p>
  </section>
</template>

<script>
export default {
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
</style>
