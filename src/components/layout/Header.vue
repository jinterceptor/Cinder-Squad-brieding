<!-- /src/components/layout/Header.vue -->
<template>
  <header :style="{'--auth-x': authOffsetX + 'px', '--auth-y': authOffsetY + 'px'}">
    <!-- Auth Indicator -->
    <div class="auth-indicator" v-if="isLoggedIn">
      <div class="auth-line">
        <span class="auth-role" :data-variant="authVariant">{{ authLabel }}</span>
        <span v-if="displayName" class="auth-name">· {{ displayName }}</span>
      </div>
      <button class="auth-logout" @click="onLogout">Logout</button>
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
      <video autoplay muted loop width="90px" height="90px">
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
  adminUser,
  isAdmin,
  adminLogout,
  subscribe as authSubscribe,
} from "@/utils/adminAuth";

export default {
  props: {
    planetPath: { type: String, required: true },
    header: { type: Object, required: true },
    authOffsetX: { type: Number, default: 12 }, // shift right (e.g., 315)
    authOffsetY: { type: Number, default: 10 }, // shift down
  },
  data() {
    return {
      role: null,          // 'member' | 'staff' | null (overlay)
      staffUser: null,     // { username, displayName } from admin session
      unsub: null,
    };
  },
  computed: {
    isLoggedIn() {
      return this.role === "member" || this.isStaff;
    },
    isStaff() {
      return isAdmin();
    },
    authVariant() {
      return this.isStaff ? "staff" : "member";
    },
    authLabel() {
      return this.isStaff ? "Staff" : "Member";
    },
    displayName() {
      if (!this.isStaff) return "";
      // ONLY displayName — no username fallback by request
      return (this.staffUser && this.staffUser.displayName) || "";
    },
  },
  created() {
    this.readAuth();
    this.unsub = authSubscribe(() => this.readAuth());
    window.addEventListener("storage", this.onStorage);
  },
  beforeUnmount() {
    if (this.unsub) this.unsub();
    window.removeEventListener("storage", this.onStorage);
  },
  methods: {
    readAuth() {
      this.role = sessionStorage.getItem("authRole") || null;
      this.staffUser = adminUser();
    },
    onStorage(e) {
      if (!e) return;
      if (["admin:user", "admin:role", "admin:token", "admin:exp", "authRole"].includes(e.key)) {
        this.readAuth();
      }
    },
    async onLogout() {
      try { adminLogout(); } catch {}
      try { sessionStorage.removeItem("authRole"); } catch {}
      this.readAuth();
      if (this.$router?.currentRoute?.value?.path !== "/status") {
        this.$router.push("/status");
      }
    },
  },
};
</script>

<style scoped>
header { position: relative; }

/* Auth indicator pill (position via CSS variables) */
.auth-indicator {
  position: absolute;
  left: var(--auth-x, 12px);
  top: var(--auth-y, 10px);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(170,255,210,.35);
  border-radius: 999px;
  background: rgba(0,0,0,.35);
  color: rgba(170,255,210,.92);
  font-family: "Titillium Web", sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
  z-index: 2;
}

.auth-line { display: inline-flex; align-items: center; gap: 6px; }
.auth-role {
  font-weight: 800;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(170,255,210,.35);
}
.auth-role[data-variant="member"] { opacity: .9; }
.auth-role[data-variant="staff"]  { border-color: rgba(30,144,255,.75); }

.auth-name { font-size: 12px; opacity: .9; }

.auth-logout {
  background: transparent;
  border: 1px solid rgba(170,255,210,.35);
  border-radius: 999px;
  padding: 2px 10px;
  color: rgba(170,255,210,.92);
  cursor: pointer;
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.auth-logout:hover { border-color: rgba(170,255,210,.9); }

/* Existing layout styles */
.location-row.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 1.2rem;
  align-items: end;
}
.span-2 { grid-column: span 2; }
.location-row h4 {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
}
.subtitle { font-size: 0.85rem; letter-spacing: 0.08em; }
</style>
