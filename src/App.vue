<template>
  <div class="page-wrapper">
    <Header :planet-path="planetPath" :class="{ animate: animate }" :header="header" />
    <Sidebar :animate="animate" :class="{ animate: animate }" />
  </div>

  <div id="router-view-container">
    <router-view
      :animate="animate"
      :members="members"
    />
  </div>

  <svg style="visibility: hidden; position: absolute" width="0" height="0" xmlns="http://www.w3.org/2000/svg" version="1.1">
    <defs>
      <filter id="round">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -5" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  </svg>

  <audio autoplay>
    <source src="/startup.ogg" type="audio/ogg" />
  </audio>
</template>

<script>
import Header from "./components/layout/Header.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import Config from "@/assets/info/general-config.json";
import Papa from "papaparse";

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
      members: [], // will store member names
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Load MembersMaster CSV
    this.loadMembersCSV(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv"
    );
  },

  methods: {
    setTitleFavicon(title, favicon) {
      document.title = title;
      const link = document.createElement("link");
      link.setAttribute("rel", "shortcut icon");
      link.setAttribute("href", favicon);
      document.head.appendChild(link);
    },

    loadMembersCSV(csvUrl) {
      Papa.parse(csvUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // MembersMaster: the column we want is 'Name'
          const names = results.data.map((row) => row["Name"]).filter((n) => n);
          this.members = names;
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
