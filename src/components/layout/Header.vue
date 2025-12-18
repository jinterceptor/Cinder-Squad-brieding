<!-- src/components/layout/Header.vue -->
<template>
  <header class="hdr-root">
    <!-- Auth status (LEFT, no tile bg) -->
    <div class="auth-status">
      <div class="auth-top">
        <span class="auth-badge" :class="roleClass">
          <span class="auth-icon" aria-hidden="true"></span>
          <span v-if="authed">{{ roleLabel }}</span>
          <span v-else>GUEST</span>
        </span>

        <span class="auth-name" v-if="authed">{{ displayName }}</span>
        <span class="auth-name muted" v-else>NOT SIGNED IN</span>
      </div>

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

/* existing header layout */
.location-row.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 1.2rem;
  align-items: end;
}
.span-2 { grid-column: span 2; }
.location-row h4 { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.7rem; }
.subtitle { font-size: 0.85rem; letter-spacing: 0.08em; }

/* --------- Auth status (LEFT, no background tile) --------- */
.auth-status{
  --auth-left: 750px;
  position: absolute;
  top: 10px;                /* slightly higher */
  left: var(--auth-left);
  display: grid;
  gap: .4rem;
  min-width: 260px;
  /* No background, no border — integrates with header */
  padding: 0;
}

/* compact top row */
.auth-top{
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .5rem;
  align-items: center;
}

/* Badge: pill. Officer = cool cyan; Staff = darker military olive. */
.auth-badge{
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  min-width: 110px;
  justify-content: center;
  text-align: center;
  font-size: .78rem;
  padding: .16rem .65rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: #E6F3FF;
  border: 1px solid rgba(150,190,230,.5);   /* default/guest */
  background: rgba(0,18,36,.42);
}

/* small “chevron” icon */
.auth-icon{
  width: 12px; height: 12px;
  border-radius: 2px;
  background:
    linear-gradient(135deg, transparent 40%, rgba(255,255,255,.18) 40% 52%, transparent 52%),
    linear-gradient(315deg, transparent 40%, rgba(255,255,255,.18) 40% 52%, transparent 52%);
  opacity: .9;
}

/* Officer: cyan/teal, a bit subdued */
.badge-officer{
  border-color: rgba(120,200,255,.8);
  background: rgba(6,24,40,.55);
}

/* Staff: darker military olive look */
.badge-staff{
  border-color: rgba(88,128,88,.85);
  background: linear-gradient(180deg, rgba(10,24,12,.72), rgba(10,24,12,.5));
}
.badge-staff .auth-icon{
  background:
    linear-gradient(135deg, transparent 40%, rgba(190,230,190,.22) 40% 52%, transparent 52%),
    linear-gradient(315deg, transparent 40%, rgba(190,230,190,.22) 40% 52%, transparent 52%);
}

/* Guest state (unused when authed) */
.badge-guest{
  border-color: rgba(150,190,230,.5);
}

/* name & actions */
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

.auth-actions{ display: flex; gap: .45rem; }
.auth-btn{
  flex: 1 1 auto;
  text-align: center;
  border: 1px solid rgba(120,255,170,.7);
  background: rgba(0,30,20,.25);
  color: #e6fff5;
  border-radius: 6px;
  padding: .32rem .55rem;
  cursor: pointer;
  font-size: .88rem;
  letter-spacing: .04em;
}
.auth-btn:hover{ filter: brightness(1.06); }
.auth-btn.danger{
  border-color: rgba(255,130,120,.8);
  background: rgba(30,0,0,.28);
  color: #ffe9e6;
}

/* Mobile: stack under the title */
@media (max-width: 1100px){
  .auth-status{ position: static; margin: .5rem 0 .25rem auto; }
}
</style>
