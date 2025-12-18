<!-- src/components/layout/Header.vue -->
<template>
  <header class="hdr-root">
    <!-- Auth status (left of planet block, matching header style) -->
    <div class="auth-status">
      <div class="auth-top">
        <span class="auth-badge" :class="roleClass">
          <span v-if="authed">{{ roleLabel }}</span>
          <span v-else>Guest</span>
        </span>
        <span class="auth-name" v-if="authed">{{ displayName }}</span>
        <span class="auth-name muted" v-else>Not signed in</span>
      </div>
      <div class="auth-actions">
        <router-link
          v-if="!authed"
          class="auth-btn"
          :to="{ path: '/admin/login', query: { redirect: '/admin' } }"
        >
          Sign in
        </router-link>
        <button v-else class="auth-btn danger" @click="doLogout">Logout</button>
      </div>
    </div>

    <div class="title clipped-x-large-forward">
      <img class="logo" src="/faction-logos/Broadsword111.png" />

      <div class="title-container">
        <!-- PRIMARY TITLE (FIXED) -->
        <div id="title-first-line" class="title-row">
          <span id="title-header">UNSC TACNET</span>
        </div>

        <!-- SECONDARY LINE (CONFIG-DRIVEN) -->
        <div class="title-row">
          <span id="subtitle-header">{{ header.subheaderTitle }}</span>
          <span id="subtitle-subheader">// {{ header.subheaderSubtitle }}</span>
        </div>
      </div>
    </div>

    <div class="rhombus"></div>

    <div class="planet-location-container">
      <video autoplay muted loop width="90" height="90">
        <source :src="`${planetPath}`" type="video/webm" />
      </video>

      <div class="location-info">
        <!-- ROW 1 -->
        <div class="location-row grid">
          <div id="year">
            <h4>Year</h4>
            <span class="subtitle">{{ header.year }}</span>
          </div>

          <div id="status" class="span-2">
            <h4>Status</h4>
            <span class="subtitle">{{ header.status }}</span>
          </div>
        </div>

        <!-- ROW 2 -->
        <div class="location-row grid">
          <div id="AO">
            <h4>AO</h4>
            <span class="subtitle">{{ header.AO }}</span>
          </div>

          <div id="planet">
            <h4>Planet</h4>
            <span class="subtitle">{{ header.planet }}</span>
          </div>

          <div id="system">
            <h4>System</h4>
            <span class="subtitle">{{ header.system }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import {
  subscribe,
  adminUser,
  adminRole,
  isAdmin,
  adminLogout,
} from "@/utils/adminAuth";

export default {
  name: "Header",
  props: {
    planetPath: { type: String, required: true },
    header: { type: Object, required: true },
  },
  data() {
    return {
      authed: false,
      displayName: "",
      role: "staff",
      unsub: null,
    };
  },
  computed: {
    roleLabel() {
      const r = String(this.role || "").toLowerCase();
      return r === "officer" ? "Officer" : "Staff";
    },
    roleClass() {
      const r = String(this.role || "").toLowerCase();
      if (!this.authed) return "badge-guest";
      return r === "officer" ? "badge-officer" : "badge-staff";
    },
  },
  mounted() {
    // Keep UI in sync with auth changes.
    const push = () => {
      this.authed = !!isAdmin();
      const u = adminUser();
      this.displayName = u?.displayName || u?.username || "";
      this.role = adminRole() || "staff";
    };
    this.unsub = subscribe(push);
    push();
  },
  beforeUnmount() {
    if (typeof this.unsub === "function") this.unsub();
  },
  methods: {
    doLogout() {
      // Critical: immediately hide admin via guards after logout.
      adminLogout();
      this.$router.replace("/status");
    },
  },
};
</script>

<style scoped>
.hdr-root {
  position: relative; /* anchor for auth panel */
}

/* Align both rows to the same 3-column grid */
.location-row.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 1.2rem;
  align-items: end;
}

/* Status spans Planet + System columns */
.span-2 { grid-column: span 2; }

/* Typography consistency */
.location-row h4 {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
}
.subtitle {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
}

/* ---------- Auth status block ---------- */
/* Positioned into the empty space to the left of planet block.
   Adjust --auth-right to fine-tune horizontal position if needed. */
.auth-status {
  --auth-right: 300px; /* move further left by increasing this; ~planet block width */
  position: absolute;
  top: 8px;
  right: var(--auth-right);
  display: grid;
  gap: 0.35rem;
  padding: 0.45rem 0.55rem;
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.22);
  border-radius: 0.5rem;
  z-index: 2;
  backdrop-filter: blur(2px);
}

.auth-top {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.45rem;
  align-items: center;
  min-width: 240px; /* tidy text wrapping */
}

.auth-badge {
  min-width: 86px;
  text-align: center;
  font-size: 0.78rem;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(150,190,230,0.35);
  background: rgba(0,10,30,0.25);
  color: #e6f3ff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.badge-officer { border-color: rgba(120,255,170,0.7); }
.badge-staff   { border-color: rgba(120,200,255,0.7); }
.badge-guest   { border-color: rgba(150,190,230,0.35); }

.auth-name {
  min-width: 0;
  color: #e6f3ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
}
.muted { color: #9ec5e6; }

.auth-actions {
  display: flex;
  gap: 0.4rem;
}
.auth-btn {
  flex: 1 1 auto;
  text-align: center;
  border: 1px solid rgba(120,255,170,0.7);
  background: rgba(0,30,20,0.35);
  color: #e6fff5;
  border-radius: 0.4rem;
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  font-size: 0.88rem;
}
.auth-btn.danger {
  border-color: rgba(255,130,120,0.75);
  background: rgba(30,0,0,0.35);
  color: #ffe9e6;
}

/* Mobile: dock under title to avoid overlap */
@media (max-width: 1100px) {
  .auth-status {
    position: static;
    margin: 0.5rem 0 0.25rem auto;
  }
}
</style>
