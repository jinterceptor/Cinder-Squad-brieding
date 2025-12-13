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
        <router-link class="clipped-bottom-right" to="/status">
          <img src="/icons/orbital.svg" />
          <span>Status</span>
        </router-link>

        <!-- UNIT ROSTER (formerly Pilots) -->
        <router-link class="clipped-bottom-right" to="/pilots">
          <img src="/icons/license.svg" />
          <span>Roster</span>
        </router-link>

        <!-- LOGS / EVENTS -->
        <router-link class="clipped-bottom-right" to="/events">
          <img src="/icons/events.svg" />
          <span>Logs</span>
        </router-link>
      </o-sidebar>
    </section>
  </div>
</template>

<script>
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
};
</script>
