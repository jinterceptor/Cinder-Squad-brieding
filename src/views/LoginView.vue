<!-- src/views/LoginView.vue -->
<template>
  <div class="splash-root">
    <div class="splash-bg" aria-hidden="true"></div>

    <section class="splash-center">
      <div class="splash-title">
        <img class="splash-logo" src="/faction-logos/Broadsword111.png" alt="" />
        <div class="splash-text">
          <div class="line-1">UNSC TACNET</div>
          <div class="line-2">{{ subtitle }}</div>
        </div>
      </div>

      <div class="lane-grid">
        <div class="lane-card">
          <div class="lane-head">
            <img src="/icons/license.svg" alt="" />
            <h2>Member Access</h2>
          </div>
          <p class="muted">View rosters, mission status, and logs. No sign-in required.</p>
          <button class="btn-hero" @click="$router.push({ path: '/status' })">Enter as Member</button>
        </div>

        <div class="lane-card">
          <div class="lane-head">
            <img src="/icons/protocol.svg" alt="" />
            <h2>Officer / Staff</h2>
          </div>
          <div class="controls">
            <label class="control">
              <span>Username</span>
              <input v-model="u" type="text" autocomplete="username" />
            </label>
            <label class="control">
              <span>Password</span>
              <input v-model="p" type="password" autocomplete="current-password" @keyup.enter="go" />
            </label>
          </div>
          <button class="btn-hero" :disabled="loading" @click="go">{{ loading ? 'Authorizing…' : 'Sign in' }}</button>
          <p v-if="err" class="err">{{ err }}</p>
          <p v-if="ok" class="ok">Authorized. Redirecting…</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import Config from "@/assets/info/general-config.json";
import { adminLogin, isAdmin } from "@/utils/adminAuth";

export default {
  name: "LoginView",
  data: () => ({ u: "", p: "", loading: false, err: "", ok: false }),
  computed: {
    subtitle() {
      const t = (Config?.defaultTitle || "").trim();
      return t ? `${t} ACCESS PORTAL` : "ACCESS PORTAL";
    },
  },
  mounted() {
    if (isAdmin()) this.$router.replace("/admin");
  },
  methods: {
    async go() {
      this.err = ""; this.ok = false;
      const u = this.u.trim(), p = this.p;
      if (!u || !p) { this.err = "Enter username and password."; return; }
      this.loading = true;
      try {
        await adminLogin(u, p);
        this.ok = true;
        setTimeout(() => this.$router.replace("/admin"), 200);
      } catch (e) {
        this.err = String(e?.message || e);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.splash-root {
  position: relative;
  min-height: calc(100vh - 0px);
  background: radial-gradient(1200px 600px at 50% 10%, rgba(10,30,50,.55), rgba(4,10,20,.96)),
              linear-gradient(180deg, rgba(2,6,12,1), rgba(2,6,12,.98));
  overflow: hidden;
}
.splash-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(800px 800px at 80% -10%, rgba(30,144,255,.07), transparent 60%),
    url("/faction-logos/Broadsword111.png") center 20% / 540px 540px no-repeat;
  opacity: .16; filter: grayscale(.1) contrast(1.05); pointer-events: none;
}
.splash-center {
  position: relative; max-width: 1080px; margin: 6vh auto 0; padding: 0 1rem 4rem;
  display: grid; gap: 1.4rem;
}
.splash-title {
  display: flex; align-items: center; gap: 1rem;
  border: 1px solid rgba(30,144,255,.35); background: rgba(0,10,30,.25);
  border-radius: .75rem; padding: .8rem 1rem; width: max-content;
}
.splash-logo { width: 56px; height: 56px; object-fit: contain; }
.splash-text { display: grid; gap: .15rem; }
.line-1 { font-size: 1.25rem; letter-spacing: .18em; color: #e6f3ff; text-transform: uppercase; }
.line-2 { font-size: .95rem; letter-spacing: .10em; color: #9ec5e6; text-transform: uppercase; }

.lane-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; align-items: start; }
.lane-card { border: 1px dashed rgba(30,144,255,.35); background: rgba(0,10,30,.25); border-radius: .75rem; padding: 1rem; display: grid; gap: .8rem; }
.lane-head { display:flex; align-items:center; gap:.6rem; }
.lane-head img { width: 28px; height: 28px; }
.muted { color:#9ec5e6; }

.controls { display:grid; gap:.6rem; }
.control { display:grid; gap:.25rem; }
.control span { color:#9ec5e6; font-size:.9rem; }
.control input {
  background: rgba(5,20,40,.85);
  border: 1px solid rgba(30,144,255,.35);
  border-radius: .35rem;
  padding: .55rem .65rem;
  color: #e6f3ff;
}

.btn-hero {
  border: 1px solid rgba(120,255,170,.7);
  background: rgba(0,30,20,.35);
  color: #e6fff5;
  border-radius: .55rem;
  padding: .65rem .95rem;
  cursor: pointer;
  text-align: center;
  font-size: 1rem;
  letter-spacing: .06em;
}
.btn-hero:hover { filter: brightness(1.06); }

.err { color:#ffb080; }
.ok { color:#79ffba; }

@media (max-width: 960px){
  .splash-center { margin-top: 4vh; }
  .lane-grid { grid-template-columns: 1fr; }
}
</style>
