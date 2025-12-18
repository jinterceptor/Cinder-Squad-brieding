<!-- src/views/admin/AdminGate.vue -->
<template>
  <div class="content-container">
    <section class="section-container" style="max-width:720px;margin:auto">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/orbital.svg" alt="">
        <h1>UNSC Staff Access</h1>
      </div>

      <div class="section-content-container">
        <div class="grid">
          <div class="card">
            <h2>Member Access</h2>
            <p class="muted">View-only access to rosters and ops.</p>
            <router-link class="btn" :to="{ path: '/status' }">Enter as Member</router-link>
          </div>

          <div class="card">
            <h2>Staff Sign-in</h2>
            <label class="control"><span>Username</span><input v-model="u" type="text" autocomplete="username" /></label>
            <label class="control"><span>Password</span><input v-model="p" type="password" autocomplete="current-password" @keyup.enter="go" /></label>
            <button class="btn" :disabled="loading" @click="go">{{ loading ? 'Authorizing…' : 'Sign in' }}</button>
            <p v-if="err" class="err">{{ err }}</p>
            <p v-if="ok" class="ok">Authorized.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { adminLogin } from "@/utils/adminAuth";

export default {
  name: "AdminGate",
  data: () => ({ u: "", p: "", loading: false, err: "", ok: false }),
  methods: {
    async go() {
      this.err = ""; this.ok = false;
      if (!this.u || !this.p) { this.err = "Enter username and password."; return; }
      this.loading = true;
      try {
        await adminLogin(this.u.trim(), this.p);
        this.ok = true;
        const target =
          typeof this.$route.query.redirect === "string" && this.$route.query.redirect.startsWith("/")
            ? this.$route.query.redirect
            : "/admin";
        this.$router.replace(target);
      } catch (e) {
        this.err = String(e?.message || e);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.grid { display:grid; grid-template-columns: 1fr 1fr; gap:1rem; }
.card { border:1px dashed rgba(30,144,255,.35); background:rgba(0,10,30,.25); border-radius:.5rem; padding:.75rem; display:grid; gap:.6rem; }
.control { display:grid; gap:.25rem; }
.control span { color:#9ec5e6; font-size:.9rem; }
.control input { background:rgba(5,20,40,.85); border:1px solid rgba(30,144,255,.35); border-radius:.35rem; padding:.45rem .55rem; color:#e6f3ff; }
.btn { border:1px solid rgba(120,255,170,.7); background:rgba(0,30,20,.35); color:#e6fff5; border-radius:.4rem; padding:.45rem .75rem; cursor:pointer; text-align:center; }
.muted { color:#9ec5e6; }
.err { color:#ffb080; }
.ok { color:#79ffba; }
@media (max-width:860px){ .grid{ grid-template-columns:1fr; } }
</style>
