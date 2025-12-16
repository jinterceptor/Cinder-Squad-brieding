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
          @mouseenter="playBrowse"
          @click="playClick"
        >
          <img src="/icons/orbital.svg" />
          <span>Status</span>
        </router-link>

        <!-- UNIT ROSTER -->
        <router-link
          class="clipped-bottom-right"
          to="/pilots"
          @mouseenter="playBrowse"
          @click="playClick"
        >
          <img src="/icons/license.svg" />
          <span>Roster</span>
        </router-link>

        <!-- LOGS / EVENTS -->
        <router-link
          class="clipped-bottom-right"
          to="/events"
          @mouseenter="playBrowse"
          @click="playClick"
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
let clickAudio;

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
    // Preload and reuse (gesture-safe once the user has interacted)
    browseAudio = new Audio("/sound/Orbat Main Menu Browse.ogg");
    browseAudio.volume = 0.6;

    clickAudio = new Audio("/sound/Orbat Main Menu Click.ogg");
    clickAudio.volume = 0.7;
  },

  methods: {
    playBrowse() {
      if (!browseAudio) return;
      try {
        browseAudio.currentTime = 0;
        browseAudio.play();
      } catch (_) {
        /* ignore autoplay/focus errors */
      }
    },
    playClick() {
      if (!clickAudio) return;
      try {
        clickAudio.currentTime = 0;
        clickAudio.play();
      } catch (_) {
        /* ignore autoplay/focus errors */
      }
    },
  },
};
</script>
