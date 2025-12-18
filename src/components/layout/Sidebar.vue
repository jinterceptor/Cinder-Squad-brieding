<!-- src/components/layout/Sidebar.vue -->
<template>
  <div class="sidebar-page">
    <section class="sidebar-layout">
      <o-sidebar
        id="sidebar"
        position="static"
        :animate="animate"
        :mobile="mobile"
        :expand-on-hover="expandOnHover"
        :reduce="reduce"
        open
      >
        <!-- STATUS -->
        <router-link
          class="clipped-bottom-right"
          to="/status"
          @click.native="playBrowse"
        >
          <img src="/icons/orbital.svg" />
          <span>Status</span>
        </router-link>

        <!-- UNIT ROSTER -->
        <router-link
          class="clipped-bottom-right"
          to="/pilots"
          @click.native="playBrowse"
        >
          <img src="/icons/license.svg" />
          <span>Roster</span>
        </router-link>

        <!-- LOGS / EVENTS -->
        <router-link
          class="clipped-bottom-right"
          to="/events"
          @click.native="playBrowse"
        >
          <img src="/icons/events.svg" />
          <span>Logs</span>
        </router-link>

        <!-- ADMIN (Officer/Staff only) -->
        <router-link
          v-if="isOfficerOrStaff"
          class="clipped-bottom-right"
          to="/admin"
          @click.native="playBrowse"
        >
          <img src="/icons/protocol.svg" />
          <span>Admin</span>
        </router-link>
      </o-sidebar>
    </section>
  </div>
</template>

<script>
import { useAdminAuth } from "@/composables/useAdminAuth";

let browseAudio;

export default {
  name: "Sidebar",
  props: {
    animate: { type: Boolean, required: true },
  },
  setup() {
    const { isOfficerOrStaff } = useAdminAuth(); // why: reactive auth gate
    return { isOfficerOrStaff };
  },
  data() {
    return {
      expandOnHover: false,
      mobile: "reduced",
      reduce: false,
      _flickerTimer: null,
    };
  },
  mounted() {
    // Audio
    browseAudio = new Audio("/sound/Orbat Main Menu Browse.ogg");
    browseAudio.volume = 0.6;

    // Create global flicker overlay once
    if (!document.getElementById("ui-flicker-overlay")) {
      const el = document.createElement("div");
      el.id = "ui-flicker-overlay";
      document.body.appendChild(el);

      // Inject minimal styles once (kept here to avoid touching global CSS files)
      const style = document.createElement("style");
      style.setAttribute("data-ui-flicker", "");
      style.textContent = `
#ui-flicker-overlay{
  position:fixed; inset:0; pointer-events:none; z-index:99998;
  opacity:0; transition:opacity 90ms ease;
  background:
    radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 55%),
    linear-gradient(0deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.0) 100%),
    repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 3px);
  mix-blend-mode: screen;
}
#ui-flicker-overlay.active{
  opacity:1;
  animation: ui-flicker-kf 120ms ease-out 1;
}
@keyframes ui-flicker-kf {
  0%   { opacity: 0.00; filter: blur(0.5px); }
  30%  { opacity: 0.85; filter: blur(0px); }
  65%  { opacity: 0.40; }
  100% { opacity: 0.00; }
}
`;
      document.head.appendChild(style);
    }
  },
  methods: {
    playBrowse() {
      // audio
      if (browseAudio) {
        try {
          browseAudio.currentTime = 0;
          browseAudio.play().catch(() => {});
        } catch {}
      }
      // flicker
      this.triggerFlicker();
    },
    triggerFlicker() {
      const el = document.getElementById("ui-flicker-overlay");
      if (!el) return;
      el.classList.remove("active"); // retrigger animation reliably
      // force reflow so class re-add restarts the animation
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      el.classList.add("active");

      if (this._flickerTimer) clearTimeout(this._flickerTimer);
      this._flickerTimer = setTimeout(() => {
        el.classList.remove("active");
      }, 140);
    },
  },
};
</script>

<style scoped>
/* no visual changes here; overlay styles are injected at runtime */
</style>
