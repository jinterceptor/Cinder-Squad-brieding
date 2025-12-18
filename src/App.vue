<!-- /src/components/layout/Sidebar.vue -->
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
        <router-link class="clipped-bottom-right" to="/status" @click.native="playBrowse">
          <img src="/icons/orbital.svg" />
          <span>Status</span>
        </router-link>

        <router-link class="clipped-bottom-right" to="/pilots" @click.native="playBrowse">
          <img src="/icons/license.svg" />
          <span>Roster</span>
        </router-link>

        <router-link class="clipped-bottom-right" to="/events" @click.native="playBrowse">
          <img src="/icons/events.svg" />
          <span>Logs</span>
        </router-link>

        <router-link v-if="isOfficerOrStaff" class="clipped-bottom-right" to="/admin" @click.native="playBrowse">
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
  props: { animate: { type: Boolean, required: true } },
  setup() {
    const { isOfficerOrStaff } = useAdminAuth();
    return { isOfficerOrStaff };
  },
  data() {
    return { expandOnHover: false, mobile: "reduced", reduce: false };
  },
  mounted() {
    browseAudio = new Audio("/sound/Orbat Main Menu Browse.ogg");
    browseAudio.volume = 0.6;
  },
  methods: {
    playBrowse() {
      if (!browseAudio) return;
      try { browseAudio.currentTime = 0; browseAudio.play().catch(() => {}); } catch {}
      // why: panel flicker is now route-driven in App.vue watcher
    },
  },
};
</script>

<style scoped>
/* no changes here */
</style>
