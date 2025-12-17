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

        <!-- ADMIN -->
        <router-link
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
let browseAudio;

export default {
  name: "Sidebar",
  props: {
    animate: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      expandOnHover: false,
      mobile: "reduced",
      reduce: false,
    };
  },
  mounted() {
    // single instance; respects user gesture
    browseAudio = new Audio("/sound/Orbat Main Menu Browse.ogg");
    browseAudio.volume = 0.6;
  },
  methods: {
    playBrowse() {
      if (!browseAudio) return;
      try {
        browseAudio.currentTime = 0;
        browseAudio.play().catch(() => {});
      } catch {}
    },
  },
};
</script>
