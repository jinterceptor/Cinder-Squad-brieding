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
      :members="activeMembers"
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
import Papa from "papaparse";

export default {
  components: { Header, Sidebar },

  data() {
    return {
      animate: Config.animate,
      initialSlug: Config.initialSlug,
      planetPath: Config.planetPath,
      header: Config.header,
      clocks: [],
      events: [],
      missions: [],
      members: [],        // Raw MembersMaster sheet
      orbat: [],          // Merged RefData + MembersMaster
      activeMembers: [],  // Members currently in unit
      reserves: [],       // Members in reserve
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Load missions and events from local assets
    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

    // Load live Google Sheets
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

    // ------------------------
    // Import MembersMaster sheet
    // ------------------------
    async importMembers(csvUrl) {
      const response = await fetch(csvUrl);
      const csvText = await response.text();

      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      console.log("MembersMaster headers:", parsed.meta.fields);

      this.members = parsed.data.map((row) => {
        const standardColumns = ["Rank", "Name", "Join Date", "Member ID"];
        const certifications = Object.keys(row)
          .filter((key) => !standardColumns.includes(key) && row[key]?.trim())
          .map((key) => key.trim());

        return {
          rank: row["Rank"]?.trim(),
          name: row["Name"]?.trim(),
          joinDate: row["Join Date"]?.trim(),
          id: row["Member ID"]?.trim(),
          certifications,
        };
      });

      console.log("Members loaded:", this.members.length);
    },

    // ------------------------
    // Import RefData sheet and merge with members
    // ------------------------
    async importRefData(csvUrl) {
      const response = await fetch(csvUrl);
      const csvText = await response.text();

      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      console.log("RefData headers:", parsed.meta.fields);

      const orbatEntries = parsed.data.map((row) => ({
        status: row["Active Non Res"]?.trim() || row["Recruits"]?.trim() || row["Not Placed"]?.trim() || row["Reserves"]?.trim(),
        recruit: row["Recruits"]?.trim(),
        notPlaced: row["Not Placed"]?.trim(),
        reserves: row["Reserves"]?.trim(),
        allSquads: row["All Squads"]?.trim(),
        squadAssignments: row["Squad Assingments"]?.trim(),
        squad: row["Squads"]?.trim(),
        memberId: row["Member ID"]?.trim(),
      }));

      this.orbat = orbatEntries.map((entry) => {
        const member = this.members.find((m) => m.id === entry.memberId) || {};
        return { ...entry, ...member };
      });

      // Filter for convenience
      this.activeMembers = this.orbat.filter((m) => m.status?.toLowerCase() === "active non res");
      this.reserves = this.orbat.filter((m) => m.status?.toLowerCase() === "reserves");

      console.log("ORBAT loaded:", this.orbat.length, "Active Members:", this.activeMembers.length, "Reserves:", this.reserves.length);
    },

    // ------------------------
    // Import Missions
    // ------------------------
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

    // ------------------------
    // Import Events
    // ------------------------
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
