<!-- src/components/AdminLoginModal.vue -->
<template>
  <div class="admin-modal-backdrop" @click.self="$emit('close')">
    <div class="admin-modal">
      <h2>Admin Login</h2>
      <p class="hint">Enter the admin password.</p>

      <form @submit.prevent="onSubmit">
        <div class="row">
          <input
            v-model="password"
            :type="show ? 'text' : 'password'"
            placeholder="Password"
            autocomplete="current-password"
            class="input"
            @keydown.enter.prevent="onSubmit"
          />
          <label class="checkbox">
            <input type="checkbox" v-model="show" />
            Show
          </label>
        </div>

        <div class="buttons">
          <button type="button" class="btn ghost" @click="$emit('close')">Cancel</button>
          <button class="btn" :disabled="loading">{{ loading ? "Checking..." : "Login" }}</button>
        </div>

        <p v-if="error" class="error">Incorrect password.</p>
      </form>
    </div>
  </div>
</template>

<script>
import { verifyPassword, setAdminSession } from "@/utils/adminAuth";

export default {
  name: "AdminLoginModal",
  data() {
    return { password: "", show: false, loading: false, error: false };
  },
  methods: {
    async onSubmit() {
      this.error = false;
      this.loading = true;
      try {
        const ok = await verifyPassword(this.password);
        if (!ok) { this.error = true; return; }
        setAdminSession();
        this.$emit("success");
      } finally {
        this.loading = false;
        this.password = "";
      }
    },
  },
};
</script>

<style scoped>
.admin-modal-backdrop {
  position: fixed; inset: 0; z-index: 100000;
  background: rgba(0,0,0,.66);
  display: grid; place-items: center;
}
.admin-modal {
  width: min(420px, 92vw);
  background: rgba(0,10,30,.95);
  border: 2px solid rgba(30,144,255,.8);
  border-radius: .8rem;
  padding: 1rem 1rem .9rem;
  color: #dce6f1;
  box-shadow: 0 10px 40px rgba(0,0,0,.7);
}
h2 { margin: 0 0 .25rem; letter-spacing: .06em; }
.hint { margin: 0 0 .8rem; opacity: .85; font-size: .9rem; }
.row { display: flex; align-items: center; gap: .5rem; }
.input {
  flex: 1;
  background: rgba(0,0,0,.35);
  color: #dce6f1;
  border: 1px solid rgba(122,167,199,.55);
  border-radius: .4rem; padding: .55rem .65rem;
}
.checkbox { display: inline-flex; align-items: center; gap: .35rem; color: #9ec5e6; font-size: .9rem; }
.buttons { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .7rem; }
.btn {
  background: transparent; border: 1px solid rgba(30,144,255,.85); color: #e0f0ff;
  border-radius: .5rem; padding: .4rem .75rem; cursor: pointer;
}
.btn.ghost { border-color: rgba(122,167,199,.5); color: #9ec5e6; }
.btn[disabled] { opacity: .6; cursor: not-allowed; }
.error { color: rgba(255,160,160,.95); margin:.6rem 0 0; }
</style>
