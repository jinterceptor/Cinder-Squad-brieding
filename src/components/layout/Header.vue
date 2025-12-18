<template>
  <header class="hdr-root">
    <!-- Auth status (LEFT side, styled to match header) -->
    <div class="auth-status">
      <div class="auth-top">
        <span class="auth-badge" :class="roleClass">
          <span v-if="authed">{{ roleLabel }}</span>
          <span v-else>Guest</span>
        </span>
        <span class="auth-name" v-if="authed">{{ displayName }}</span>
        <span class="auth-name muted" v-else>Not signed in</span>
      </div>

      <div class="auth-divider"></div>

      <div class="auth-actions">
        <router-link
          v-if="!authed"
          class="auth-btn"
          :to="{ path: '/admin/login', query: { redirect: '/admin' } }"
        >Sign in</router-link>
        <button v-else class="auth-btn danger" @click="doLogout">Logout</button>
      </div>
    </div>

    <div class="title clipped-x-large-forward">
      <img class="logo" src="/faction-logos/Broadsword111.png" />
      <div class="title-container">
        <div id="title-first-line" class="title-row">
          <span id="title-header">UNSC TACNET</span>
        </div>
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
import { subscribe, adminUser, adminRole, isAdmin, adminLogout } from "@/utils/adminAuth";

export default {
  name: "Header",
  props: {
    planetPath: { type: String, required: true },
    header: { type: Object, required: true },
  },
  data() {
    return { authed: false, displayName: "", role: "staff", unsub: null };
  },
  computed: {
    roleLabel() {
      const r = String(this.role || "").toLowerCase();
      return r === "officer" ? "OFFICER" : "STAFF";
    },
    roleClass() {
      const r = String(this.role || "").toLowerCase();
      if (!this.authed) return "badge-guest";
      return r === "officer" ? "badge-officer" : "badge-staff";
    },
  },
  mounted() {
    const push = () => {
      this.authed = !!isAdmin();
      const u = adminUser();
      this.displayName = u?.displayName || u?.username || "";
      this.role = adminRole() || "staff";
    };
    this.unsub = subscribe(push);
    push();
  },
  beforeUnmount() { if (typeof this.unsub === "function") this.unsub(); },
  methods: {
    doLogout() { adminLogout(); this.$router.replace("/status"); },
  },
};
</script>

<style scoped>
.hdr-root { position: relative; }

/* Grid tweaks kept from your original */
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

/* ---------- Auth status (LEFT), tuned to 750px ---------- */
.auth-status{
  --auth-left: 750px;  /* <- requested position */
  position: absolute;
  top: 8px;
  left: var(--auth-left);
  display: grid;
  gap: .45rem;
  min-width: 260px;

  /* match header styling */
  padding: .5rem .65rem;
  background:
    linear-gradient(180deg, rgba(6,20,36,.78), rgba(6,20,36,.55));
  border: 1px solid rgba(30,144,255,.45);
  border-radius: .5rem;
  box-shadow: 0 0 0 1px rgba(0,0,0,.35) inset;
  backdrop-filter: blur(2px);
}

.auth-top{
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .5rem;
  align-items: center;
}

.auth-badge{
  min-width: 92px;
  text-align: center;
  font-size: .78rem;
  padding: .14rem .55rem;
  border-radius: 999px;

  /* pill look consistent with header labels */
  border: 1px solid rgba(150,190,230,.45);
  background: rgba(0,18,36,.5);
  color: #e6f3ff;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.badge-officer{ border-color: rgba(120,255,170,.75); }
.badge-staff  { border-color: rgba(120,200,255,.75); }
.badge-guest  { border-color: rgba(150,190,230,.45); }

.auth-name{
  min-width: 0;
  color: #e6f3ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .92rem;
  letter-spacing: .04em;
}
.muted{ color:#9ec5e6; }

/* thin divider echoing header accents */
.auth-divider{
  height: 6px;
  background: repeating-linear-gradient(
    45deg,
    rgba(30,144,255,.22) 0px,
    rgba(30,144,255,.22) 10px,
    transparent 10px,
    transparent 20px
  );
  border-radius: 2px;
}

/* Buttons align with your UI tone */
.auth-actions{ display: flex; gap: .45rem; }
.auth-btn{
  flex: 1 1 auto;
  text-align: center;
  border: 1px solid rgba(120,255,170,.7);
  background: rgba(0,30,20,.35);
  color: #e6fff5;
  border-radius: .4rem;
  padding: .34rem .55rem;
  cursor: pointer;
  font-size: .88rem;
  letter-spacing: .04em;
}
.auth-btn:hover{ filter: brightness(1.05); }
.auth-btn.danger{
  border-color: rgba(255,130,120,.75);
  background: rgba(30,0,0,.35);
  color: #ffe9e6;
}

/* Mobile: dock below title */
@media (max-width: 1100px){
  .auth-status{ position: static; margin: .5rem 0 .25rem auto; }
}
</style>
