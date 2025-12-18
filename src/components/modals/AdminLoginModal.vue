<!-- src/components/modals/AdminLoginModal.vue -->
<template>
  <div class="modal-backdrop" @click.self="emitClose">
    <div class="modal-card">
      <div class="modal-head">
        <h2>Staff Sign-in</h2>
      </div>

      <div class="modal-body">
        <label class="control">
          <span>Username</span>
          <input v-model="u" type="text" autocomplete="username" autofocus />
        </label>

        <label class="control">
          <span>Password</span>
          <input v-model="p" type="password" autocomplete="current-password" @keyup.enter="submit" />
        </label>

        <p v-if="err" class="err">{{ err }}</p>
      </div>

      <div class="modal-foot">
        <button class="btn cancel" @click="emitClose">Cancel</button>
        <button class="btn" :disabled="loading || !u || !p" @click="submit">
          {{ loading ? 'Authorizing…' : 'Sign in' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { adminLogin } from "@/utils/adminAuth"; // why: central backend auth

export default {
  name: "AdminLoginModal",
  emits: ["success", "close"],
  data: () => ({
    u: "",
    p: "",
    loading: false,
    err: "",
  }),
  methods: {
    async submit() {
      this.err = "";
      if (!this.u || !this.p) {
        this.err = "Enter username and password.";
        return;
      }
      this.loading = true;
      try {
        await adminLogin(this.u.trim(), this.p);
        this.$emit("success");
      } catch (e) {
        this.err = String(e?.message || "Login failed");
      } finally {
        this.loading = false;
      }
    },
    emitClose() {
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
/* minimal, matches your dark UI */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: grid; place-items: center;
  z-index: 1000;
}
.modal-card {
  width: min(92vw, 520px);
  border: 1px dashed rgba(30,144,255,.35);
  background: rgba(0,10,30,.9);
  border-radius: .6rem;
  box-shadow: 0 10px 24px rgba(0,0,0,.5);
  overflow: hidden;
}
.modal-head { padding: .9rem 1rem; border-bottom: 1px solid rgba(30,144,255,.25); }
.modal-head h2 { margin: 0; }
.modal-body { display: grid; gap: .6rem; padding: .9rem 1rem; }
.modal-foot { display: flex; justify-content: flex-end; gap: .5rem; padding: .8rem 1rem; border-top: 1px solid rgba(30,144,255,.25); }

.control { display: grid; gap: .25rem; }
.control span { color: #9ec5e6; font-size: .9rem; }
.control input {
  background: rgba(5,20,40,.85);
  border: 1px solid rgba(30,144,255,.35);
  border-radius: .35rem;
  padding: .45rem .55rem;
  color: #e6f3ff;
}

.btn {
  border: 1px solid rgba(120,255,170,.7);
  background: rgba(0,30,20,.35);
  color: #e6fff5;
  border-radius: .4rem;
  padding: .45rem .75rem;
  cursor: pointer;
}
.btn.cancel {
  border-color: rgba(30,144,255,.5);
  background: rgba(0,20,40,.35);
}
.err { color: #ffb080; margin: 0; }
</style>
