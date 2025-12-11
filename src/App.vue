<template>
  <div class="page-wrapper">
    <Header :planet-path="planetPath" :class="{ animate: animate }" :header="header" />
    <Sidebar :animate="animate" :class="{ animate: animate }" />
  </div>

  <div id="router-view-container">
    <router-view
      :animate="animate"
      :initial-slug="initialSlug"
      :missions="missions"
      :events="events"
      :pilots="pilots"
      :clocks="clocks"
      :reserves="reserves"
      :orbat="orbat"
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

export default {
  components: {
    Header,
    Sidebar,
  },

  data() {
    return {
      animate: Config.animate,
      initialSlug: Config.initialSlug,
      planetPath: Config.planetPath,
      header: Config.header,
      pilotSpecialInfo: Config.pilotSpecialInfo,
      clocks: [],
      events: [],
      missions: [],
      members: [], // raw MembersMaster
      orbat: [],   // merged RefData + MembersMaster
      pilots: [],  // this is what PilotsView will use
      reserves: [],
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Missions and Events imports remain as before
    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

    // Live Google Sheet imports
    this.importMembers("https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv");
    this.importRefData("https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=107253735&single=true&output=csv");
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
      const response = await fetch(csvUrl);
      const text = await response.text();
      const rows = text.split("\n").slice(1); // skip header row
      const members = rows.map((row) => {
        const cols = row.split(",");
        return {
          rank: cols[0]?.trim(),
          name: cols[1]?.trim(),
          joinDate: cols[3]?.trim(),
          id: cols[4]?.trim(),
          certifications: cols.slice(5).map((c) => c.trim()).filter((c) => c), // filter out empty
        };
      });
      this.members = members;
    },

    async importRefData(csvUrl) {
      const response = await fetch(csvUrl);
      const text = await response.text();
      const rows = text.split("\n").slice(1); // skip header row

      // Parse RefData CSV
      const orbatEntries = rows.map((row) => {
        const cols = row.split(",");
        return {
          status: cols[0]?.trim(), // Active Non Res / Recruit / Not Placed / Reserves
          recruit: cols[1]?.trim(),
          notPlaced: cols[2]?.trim(),
          reserves: cols[3]?.trim(),
          allSquads: cols[4]?.trim(),
          squadAssignments: cols[5]?.trim(),
          squad: cols[6]?.trim(),
          memberId: cols[7]?.trim(), // assume Member ID is in column H / index 7
        };
      });

      // Merge with MembersMaster data
      this.orbat = orbatEntries.map((entry) => {
        const member = this.members.find((m) => m.id === entry.memberId) || {};
        return {
          ...entry,
          ...member,
        };
      });

      // Populate pilots and reserves for convenience
      this.pilots = this.orbat.filter((m) => m.status?.toLowerCase() === "active non res" || m.status?.toLowerCase() === "pilot");
      this.reserves = this.orbat.filter((m) => m.status?.toLowerCase() === "reserves");
    },

    async importMissions(files) {
      const filePromises = Object.keys(files).map((path) => files[path]());
      const fileContents = await Promise.all(filePromises);
      fileContents.forEach((content) => {
        const mission = {
          slug: content.split("\n")[0],
          name: content.split("\n")[1],
          status: content.split("\n")[2],
          content: content.split("\n").splice(3).join("\n"),
        };
        this.missions = [...this.missions, mission];
      });
      this.missions = this.missions.sort((a, b) => b.slug - a.slug);
    },

    async importEvents(files) {
      const filePromises = Object.keys(files).map((path) => files[path]());
      const fileContents = await Promise.all(filePromises);
      fileContents.forEach((content) => {
        const event = {
          title: content.split("\n")[0],
          location: content.split("\n")[1],
          time: content.split("\n")[2],
          thumbnail: content.split("\n")[3],
          content: content.split("\n").splice(4).join("\n"),
        };
        this.events = [...this.events, event];
      });
      this.events = this.events.reverse();
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
