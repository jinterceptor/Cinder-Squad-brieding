<template>
  <header class="hdr-root">
    <!-- Auth status (LEFT side, styled like header widgets) -->
    <div class="auth-status">
      <!-- clipped corner accent -->
      <span class="auth-corner" aria-hidden="true"></span>

      <div class="auth-top">
        <span class="auth-badge" :class="roleClass">
          <span v-if="authed">{{ roleLabel }}</span>
          <span v-else>GUEST</span>
        </span>

        <span class="auth-name" v-if="authed">{{ displayName }}</span>
        <span class="auth-name muted" v-else>NOT SIGNED IN</span>
      </div>

      <div class="auth-accent" aria-hidden="true"></div>

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
  beforeUnmount() {
    if (typeof this.unsub === "function") this.unsub();
  },
  methods: {
    doLogout() {
      // keep guards snappy
      adminLogout();
      this.$router.replace("/status");
    },
  },
};
</script>

<style scoped>
.hdr-root { position: relative; }

/* ==== existing header layout rules kept as-is ==== */
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

/* ==== AUTH TILE (LEFT) – styled to match header widgets ==== */
.auth-status{
  /* place in the gap to the right of the title cluster */
  --auth-left: 750px; /* you found this sweet spot */
  position: absolute;
  top: 8px;
  left: var(--auth-left);

  display: grid;
  gap: .5rem;
  min-width: 280px;

  /* glassy header panel look */
  padding: .55rem .7rem;
  background: linear-gradient(180deg, rgba(6,20,36,.86), rgba(6,20,36,.62));
  border: 1px solid rgba(23,118,178,.55);              /* cyan-ish like other header outlines */
  border-radius: 8px;
  box-shadow:
    0 0 0 1px rgba(0,0,0,.45) inset,
    0 1px 0 rgba(120,200,255,.10);
}

/* clipped corner marker (mirrors header's clipped styles) */
.auth-corner{
  position: absolute;
  top: -1px; left: -1px;
  width: 12px; height: 12px;
  background: linear-gradient(135deg, rgba(32,106,86,.9), rgba(32,106,86,.35));
  clip-path: polygon(0 0, 100% 0, 0 100%);
  border-right: 1px solid rgba(23,118,178,.55);
  border-bottom: 1px solid rgba(23,118,178,.55);
}

/* top row */
.auth-top{
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .55rem;
  align-items: center;
}

/* slim accent bar (echoes header separators) */
.auth-accent{
  height: 6px;
  border-radius: 3px;
  background:
    repeating-linear-gradient(
      45deg,
      rgba(30,144,255,.25) 0px,
      rgba(30,144,255,.25) 12px,
      transparent 12px,
      transparent 24px
    );
  box-shadow: 0 1px 0 rgba(0,0,0,.35) inset;
}

/* badge = small pill matching header labels */
.auth-badge{
  min-width: 96px;
  text-align: center;
  font-size: .78rem;
  padding: .14rem .6rem;
  border-radius: 999px;
  border: 1px solid rgba(150,190,230,.55);
  background: rgba(0,18,36,.55);
  color: #E6F3FF;
  text-transform: uppercase;
  letter-spacing: .12em;
}
.badge-officer{ border-color: rgba(120,255,170,.8); }
.badge-staff  { border-color: rgba(120,200,255,.8); }
.badge-guest  { border-color: rgba(150,190,230,.55); }

.auth-name{
  min-width: 0;
  color: #E6F3FF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: .92rem;
  letter-spacing: .04em;
}
.muted{ color:#9ec5e6; }

/* actions */
.auth-actions{ display: flex; gap: .5rem; }
.auth-btn{
  flex: 1 1 auto;
  text-align: center;
  border: 1px solid rgba(120,255,170,.7);
  background: rgba(0,30,20,.38);
  color: #E6FFF5;
  border-radius: 6px;
  padding: .34rem .55rem;
  cursor: pointer;
  font-size: .88rem;
  letter-spacing: .04em;
}
.auth-btn:hover{ filter: brightness(1.06); }
.auth-btn.danger{
  border-color: rgba(255,130,120,.8);
  background: rgba(30,0,0,.38);
  color: #FFE9E6;
}

/* mobile: dock under title */
@media (max-width: 1100px){
  .auth-status{ position: static; margin: .5rem 0 .25rem auto; }
}
</style>
