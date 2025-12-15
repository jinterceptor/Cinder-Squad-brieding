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
      </o-sidebar>
    </section>
  </div>
</template>

<script>
let browseAudio;

export default {
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
    // Create once, reuse forever (browser-gesture safe)
    browseAudio = new Audio("/Orbat Main Menu Browse.ogg");
    browseAudio.volume = 0.6;
  },

  methods: {
    playBrowse() {
      if (!browseAudio) return;

      // Restart sound cleanly
      browseAudio.currentTime = 0;
      browseAudio.play().catch(() => {
        // Autoplay or focus restriction — fail silently
      });
    },
  },
};
</script>
