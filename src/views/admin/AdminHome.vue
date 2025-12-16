<!-- src/views/admin/AdminHome.vue -->
<template>
  <section class="admin-home">
    <header class="bar">
      <h1>Admin</h1>
      <div class="spacer" />
      <button class="btn" @click="logout">Logout</button>
    </header>

    <div class="content">
      <div class="card">
        <h2>Promotions Overview</h2>
        <p class="muted">Hook your promotions dashboard here.</p>
        <router-link class="link" to="/status">Back to Status</router-link>
      </div>
    </div>
  </section>
</template>

<script>
import { clearAdminSession } from "@/utils/adminAuth";

export default {
  name: "AdminHome",
  methods: {
    logout() { clearAdminSession(); this.$router.replace({ path: "/admin/login" }); },
  },
};
</script>

<style scoped>
.admin-home{min-height:100vh;background:#050811;color:#dce6f1}
.bar{display:flex;align-items:center;gap:1rem;padding:.8rem 1.2rem;border-bottom:1px solid rgba(30,144,255,.5)}
.spacer{flex:1}
.btn{background:transparent;border:1px solid rgba(30,144,255,.75);color:#e0f0ff;border-radius:.5rem;padding:.35rem .7rem;cursor:pointer}
.content{padding:1rem}
.card{background:rgba(0,10,30,.9);border:2px solid rgba(30,144,255,.7);border-radius:.8rem;padding:1rem;max-width:900px}
.muted{opacity:.85;margin:.25rem 0 .75rem}
.link{color:#9ec5e6;text-decoration:underline}
</style>
