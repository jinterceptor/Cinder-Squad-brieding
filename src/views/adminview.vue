<!-- src/views/AdminView.vue -->
<template>
  <section id="admin" class="section-container">
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/protocol.svg" alt="Admin Icon" />
        <h1>Admin</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <!-- Login gate -->
      <AdminLoginModal
        v-if="!isAuthed"
        :show="true"
        @success="onLoginSuccess"
        @close="onLoginClose"
      />

      <!-- Protected content -->
      <div v-else class="admin-grid">
        <div class="admin-card">
          <h2>Promotions Queue</h2>
          <p class="muted">Coming soon: view upcoming promotions, mark as processed.</p>
        </div>

        <div class="admin-card">
          <h2>Mission Content</h2>
          <p class="muted">Coming soon: edit Current Assignment & Mission Log entries.</p>
        </div>

        <div class="admin-card">
          <h2>Roster Tools</h2>
          <p class="muted">Coming soon: import/export roster, attendance checks.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import AdminLoginModal from "@/components/modals/AdminLoginModal.vue";

const SESSION_KEY = "adminAuthed";

export default {
  name: "AdminView",
  components: { AdminLoginModal },
  data() {
    return { isAuthed: false };
  },
  created() {
    // per-session gate
    try {
      this.isAuthed = window.sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      this.isAuthed = false;
    }
  },
  methods: {
    onLoginSuccess() {
      // why: per-session access only—clears on tab close
      try {
        window.sessionStorage.setItem(SESSION_KEY, "true");
      } catch {}
      this.isAuthed = true;
    },
    onLoginClose() {
      // Optional: navigate away if user closes without logging in
      if (!this.isAuthed) this.$router.replace("/status");
    },
  },
};
</script>

<style scoped>
.section-container {
  padding: 2.5rem 3rem;
  color: #dce6f1;
  font-family: "Consolas","Courier New",monospace;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: .9rem;
  margin-top: .75rem;
}

.admin-card {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,0,0,0.15);
  border-radius: .35rem;
  padding: .75rem .9rem;
}

.admin-card h2 {
  margin: 0 0 .35rem;
  color: #e0f0ff;
  letter-spacing: .04em;
}

.muted { color: #9ec5e6; }
</style>
