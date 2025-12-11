<template>
  <div class="members-view">
    <h1>Unit Members</h1>

    <table v-if="members.length">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th>Join Date</th>
          <th>Member ID</th>
          <th>Certifications</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="member in members" :key="member.id">
          <td>{{ member.rank }}</td>
          <td>{{ member.name }}</td>
          <td>{{ member.joinDate }}</td>
          <td>{{ member.id }}</td>
          <td>
            <span v-for="(cert, index) in member.certifications" :key="index">
              {{ cert }}<span v-if="index < member.certifications.length - 1">, </span>
            </span>
          </td>
        </tr>
      </tbody>
    </table>

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
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid #ccc;
}

th {
  background-color: #f4f4f4;
}

td span {
  white-space: nowrap;
}
</style>
