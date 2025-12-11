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
      :members="members"
      :orbat="orbat"
      :reserves="reserves"
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
      pilotSpecialInfo: Config.pilotSpecialInfo,
      missions: [],
      events: [],
      members: [], // raw MembersMaster
      orbat: [],   // merged RefData + MembersMaster
      reserves: [],
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Load missions and events as before
    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

    // Load live Google Sheet CSVs
    this.loadMembersCSV("https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv");
    this.loadRefDataCSV("https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=107253735&single=true&output=csv");
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

    async loadMembersCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data;

            // Row 2 (index 1) has the real headers
            const headers = rows[1];

            // Data starts from row 3 (index 2)
            const members = rows.slice(2).map((row) => ({
              rank: row[0]?.trim() || "",
              name: row[1]?.trim() || "",
              joinDate: row[3]?.trim() || "",
              id: row[4]?.trim() || "",
              certifications: row.slice(5).map((c) => c?.trim()).filter((c) => c),
            })).filter((m) => m.name);

            console.log("Members loaded:", members.length);
            this.members = members;
            resolve(members);
          },
          error: (err) => {
            console.error("Error loading Members CSV:", err);
            reject(err);
          },
        });
      });
    },

    async loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data;

            // Column N = Squad Assignments, Column O = Squads
            const orbatEntries = rows.slice(1).map((row) => ({
              squadAssignment: row[13]?.trim() || "",
              squad: row[14]?.trim() || "",
              name: row[1]?.trim() || "", // fallback name column if needed
            })).filter((o) => o.squadAssignment);

            console.log("ORBAT loaded:", orbatEntries.length);
            this.orbat = orbatEntries;
            resolve(orbatEntries);
          },
          error: (err) => {
            console.error("Error loading RefData CSV:", err);
            reject(err);
          },
        });
      });
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
