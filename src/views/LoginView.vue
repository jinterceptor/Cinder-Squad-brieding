<!-- src/views/LoginView.vue -->
<template>
  <div class="content-container">
    <section class="section-container" style="max-width:780px;margin:auto">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/orbital.svg" alt="">
        <h1>UNSC Access Portal</h1>
      </div>
      <div class="section-content-container login-grid">
        <!-- Member lane -->
        <div class="card">
          <h2 class="title">Member Access</h2>
          <p class="muted">View rosters, missions, and status without editing privileges.</p>
          <button class="btn" @click="$router.push({ name: 'status' })">Enter as Member</button>
        </div>

        <!-- Staff lane -->
        <div class="card">
          <h2 class="title">Staff Sign-in</h2>
          <label class="control">
            <span>Username</span>
            <input v-model="username" type="text" autocomplete="username" />
          </label>
          <label class="control">
            <span>Password</span>
            <input v-model="password" type="password" autocomplete="current-password" @keyup.enter="doLogin" />
          </label>
          <button class="btn" :disabled="loading" @click="doLogin">{{ loading ? 'Authorizing…' : 'Sign in' }}</button>
          <p v-if="error" class="err">{{ error }}</p>
          <p v-if="ok" class="ok">Authorized. Redirecting…</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { loginStaff } from "@/stores/auth";

export default {
  name: "LoginView",
  data() {
    return { username: "", password: "", loading: false, error: "", ok: false };
  },
  methods: {
    async doLogin() {
      this.error = ""; this.ok = false;
      const u = this.username.trim(), p = this.password;
      if (!u || !p) { this.error = "Enter username and password."; return; }
      this.loading = true;
      try {
        await loginStaff(u, p);
        this.ok = true;
        const to = this.$route.query.to || { name: "admin" };
        setTimeout(() => this.$router.replace(to), 300);
      } catch (e) {
        this.error = String(e?.message || e);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-grid { display:grid; grid-template-columns: 1fr 1fr; gap:1rem; }
.card { border:1px dashed rgba(30,144,255,.35); background:rgba(0,10,30,.25); border-radius:.5rem; padding:.75rem; display:grid; gap:.6rem; }
.title { margin:0; color:#e6f3ff; }
.control { display:grid; gap:.25rem; }
.control span { color:#9ec5e6; font-size:.9rem; }
.control input { background:rgba(5,20,40,.85); border:1px solid rgba(30,144,255,.35); border-radius:.35rem; padding:.45rem .55rem; color:#e6f3ff; }
.btn { border:1px solid rgba(120,255,170,.7); background:rgba(0,30,20,.35); color:#e6fff5; border-radius:.4rem; padding:.45rem .75rem; cursor:pointer; }
.muted { color:#9ec5e6; }
.err { color:#ffb080; }
.ok { color:#79ffba; }
@media (max-width:860px){ .login-grid{ grid-template-columns:1fr; } }
</style>
