<template>
  <div class="page-wrapper">
    <Header :planet-path="planetPath" :class="{ animate: animate }" :header="header" />
    <Sidebar :animate="animate" :class="{ animate: animate }" />
  </div>

  <div id="router-view-container">
    <router-view :members="members" />
  </div>
</template>

<script>
import Header from "./components/layout/Header.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import Papa from "papaparse";
import Config from "@/assets/info/general-config.json";

export default {
  components: { Header, Sidebar },

  data() {
    return {
      animate: Config.animate,
      planetPath: Config.planetPath,
      header: Config.header,
      members: [], // this will hold all member names
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MEMBERS", Config.icon);

    // Load MembersMaster CSV
    this.loadMembersCSV(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv"
    );
  },

  mounted() {
    this.$router.push("/pilots"); // we can rename later
  },

  methods: {
    setTitleFavicon(title, favicon) {
      document.title = title;
      const link = document.createElement("link");
      link.rel = "shortcut icon";
      link.href = favicon;
      document.head.appendChild(link);
    },

    loadMembersCSV(csvUrl) {
      Papa.parse(csvUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("MembersMaster headers:", results.meta.fields);

          // Column 2 = 'Name' (assuming first real data row)
          this.members = results.data
            .map((row) => row["Name"]?.trim())
            .filter((name) => name); // remove empty
          console.log("Members loaded:", this.members.length);
        },
        error: (err) => {
          console.error("Failed to load MembersMaster CSV:", err);
        },
      });
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
