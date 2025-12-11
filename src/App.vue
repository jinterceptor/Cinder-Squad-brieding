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
      initialSlug: Config.initialSlug,
      planetPath: Config.planetPath,
      header: Config.header,
      members: [], // array of member objects
      missions: [],
      events: [],
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Import missions/events as before
    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

    // Load MembersMaster CSV
    this.loadMembersCSV(
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

    async loadMembersCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log("MembersMaster headers: ", results.meta.fields);
            const members = results.data.map((row) => ({
              rank: row["Rank"]?.trim() || "",
              name: row["Name"]?.trim() || "",
              joinDate: row["Join Date"]?.trim() || "",
              id: row["Member ID"]?.trim() || "",
              certifications: Object.keys(row)
                .slice(5) // assuming certifications start at column 6
                .filter((key) => row[key]?.trim())
                .map((key) => key),
            })).filter((m) => m.name); // filter out blank rows
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

    async importMissions(files) {
      const filePromises = Object.keys(files).map((path) => files[path]());
      const fileContents = await Promise.all(filePromises);
      fileContents.forEach((content) => {
        const lines = content.split("\n");
        const mission = {
          slug: lines[0],
          name: lines[1],
          status: lines[2],
          content: lines.slice(3).join("\n"),
        };
        this.missions.push(mission);
      });
      this.missions.sort((a, b) => b.slug - a.slug);
    },

    async importEvents(files) {
      const filePromises = Object.keys(files).map((path) => files[path]());
      const fileContents = await Promise.all(filePromises);
      fileContents.forEach((content) => {
        const lines = content.split("\n");
        const event = {
          title: lines[0],
          location: lines[1],
          time: lines[2],
          thumbnail: lines[3],
          content: lines.slice(4).join("\n"),
        };
        this.events.push(event);
      });
      this.events.reverse();
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
