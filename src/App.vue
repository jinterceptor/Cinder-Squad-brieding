<template>
  <div class="page-wrapper">
    <Header :planet-path="planetPath" :class="{ animate: animate }" :header="header" />
    <Sidebar :animate="animate" :class="{ animate: animate }" />
  </div>

  <div id="router-view-container">
    <!-- Passing pilots array to PilotsView -->
    <router-view :pilots="pilots" />
  </div>
</template>

<script>
import Header from "./components/layout/Header.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import Papa from "papaparse"; // PapaParse for CSV parsing
import Config from "@/assets/info/general-config.json";

export default {
  components: {
    Header,
    Sidebar,
  },

  data() {
    return {
      animate: Config.animate,
      planetPath: Config.planetPath,
      header: Config.header,
      members: [], // raw member names
      pilots: [],  // displayed in PilotsView
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Import MembersMaster CSV (just names for now)
    this.importMembers(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv"
    );
  },

  mounted() {
    this.$router.push("/status");
  },

  methods: {
    setTitleFavicon(title, favicon) {
      document.title = title;
      const headEl = document.querySelector("head");
      const faviconEl = document.createElement("link");
      faviconEl.setAttribute("rel", "shortcut icon");
      faviconEl.setAttribute("href", favicon);
      headEl.appendChild(faviconEl);
    },

    async importMembers(csvUrl) {
      try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Pull only "Name" column
            this.members = results.data
              .map((row) => row["Name"]?.trim())
              .filter((name) => name);

            // For testing, populate pilots with same array
            this.pilots = [...this.members];

            console.log("Members loaded:", this.members);
          },
          error: (err) => {
            console.error("Error parsing MembersMaster CSV:", err);
          },
        });
      } catch (err) {
        console.error("Failed to fetch MembersMaster CSV:", err);
      }
    },
  },
};
</script>

<style>
#app {
  min-height: 100vh;
  overflow: hidden !important;
}
</style>
