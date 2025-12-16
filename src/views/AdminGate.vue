<!-- src/views/admin/AdminGate.vue -->
<template>
  <section class="admin-gate">
    <div class="card">
      <h1>Admin Login</h1>
      <p class="hint">Enter the admin password to continue.</p>
      <form @submit.prevent="onSubmit">
        <input
          v-model="password"
          :type="show ? 'text' : 'password'"
          placeholder="Password"
          autocomplete="current-password"
          class="input"
          @keydown.enter.prevent="onSubmit"
        />
        <div class="row">
          <label class="checkbox">
            <input type="checkbox" v-model="show" />
            Show
          </label>
          <button class="btn" :disabled="loading">{{ loading ? "Checking..." : "Login" }}</button>
        </div>
        <p v-if="error" class="error">Incorrect password.</p>
      </form>
    </div>
  </section>
</template>

<script>
import { verifyPassword, setAdminSession, isAdmin } from "@/utils/adminAuth";

export default {
  name: "AdminGate",
  data() {
    return { password: "", loading: false, error: false, show: false };
  },
  created() {
    if (isAdmin()) this.$router.replace({ path: "/admin" });
  },
  methods: {
    async onSubmit() {
      this.error = false;
      this.loading = true;
      try {
        const ok = await verifyPassword(this.password);
        if (!ok) { this.error = true; return; }
        setAdminSession();
        this.$router.replace({ path: "/admin" });
      } finally {
        this.loading = false;
        this.password = "";
      }
    },
  },
};
</script>

<style scoped>
.admin-gate{min-height:100vh;display:grid;place-items:center;background:#050811;color:#dce6f1;padding:2rem}
.card{width:min(420px,92vw);background:rgba(0,10,30,.9);border:2px solid rgba(30,144,255,.7);border-radius:.8rem;box-shadow:0 10px 40px rgba(0,0,0,.5);padding:1.25rem}
.hint{opacity:.85;margin:.25rem 0 1rem}
.input{width:100%;background:rgba(0,0,0,.35);color:#dce6f1;border:1px solid rgba(122,167,199,.55);border-radius:.4rem;padding:.6rem .7rem}
.row{margin-top:.5rem;display:flex;justify-content:space-between;align-items:center}
.checkbox{display:inline-flex;gap:.4rem;align-items:center;color:#9ec5e6}
.btn{background:transparent;border:1px solid rgba(30,144,255,.75);color:#e0f0ff;border-radius:.5rem;padding:.45rem .8rem;cursor:pointer}
.btn[disabled]{opacity:.6;cursor:not-allowed}
.error{color:rgba(255,160,160,.95);margin:.6rem 0 0}
</style>
