<template>
  <section id="pilots">
    <h1>Pilot Roster (Test)</h1>
    <ul>
      <li v-for="name in pilots" :key="name">{{ name }}</li>
    </ul>
  </section>
</template>

<script>
export default {
  props: {
    pilots: {
      type: Array,
      required: true,
    },
  },
};
</script>
