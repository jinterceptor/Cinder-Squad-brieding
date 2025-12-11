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

      members: [], // MembersMaster: rank, name, joinDate, id, certifications, squad
      orbat: [],   // optional later grouping structure
      reserves: [],
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Local content
    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

    // Load sheets: RefData AFTER members so we can match names
    const membersUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv";

    const refDataUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=107253735&single=true&output=csv";

    this.loadMembersCSV(membersUrl).then(() => {
      this.loadRefDataCSV(refDataUrl);
    });
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

    // ---- MembersMaster ----
    async loadMembersCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: true,
          header: false,         // we'll handle rows manually
          complete: (results) => {
            const rows = results.data;

            // Row 0: title row (Member Details / Certifications etc.) -> ignore
            // Row 1: actual headers -> we already know their positions
            // Data starts at row index 2
            const dataRows = rows.slice(2);

            const members = dataRows
              .map((row) => {
                const rank = row[0]?.trim() || "";
                const name = row[1]?.trim() || "";
                const joinDate = row[3]?.trim() || "";
                const id = row[4]?.trim() || "";
                const certs = row
                  .slice(5)
                  .map((c) => c?.trim())
                  .filter((c) => c);

                if (!name) return null;

                return {
                  rank,
                  name,
                  joinDate,
                  id,
                  certifications: certs,
                  squad: "", // will be filled from RefData
                };
              })
              .filter(Boolean);

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

    // ---- RefData: squad assignments ----
    async loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: true,
          header: false,      // we'll find "Squad Member" / "Squads" ourselves
          complete: (results) => {
            const rows = results.data;

            // Row 1 (index 1) should contain "Squad Member" and "Squads" in columns N/O
            const headerRow = rows[1] || [];
            const memberColIndex = headerRow.findIndex(
              (cell) => String(cell).trim().toLowerCase() === "squad member"
            );
            const squadColIndex = headerRow.findIndex(
              (cell) => String(cell).trim().toLowerCase() === "squads"
            );

            if (memberColIndex === -1 || squadColIndex === -1) {
              console.error("Could not find 'Squad Member' or 'Squads' columns in RefData.", headerRow);
              resolve([]);
              return;
            }

            // Data rows start after headerRow -> index 2 onwards
            const assignments = rows
              .slice(2)
              .map((row) => {
                const memberLabel = row[memberColIndex]?.trim();
                const squadName = row[squadColIndex]?.trim();
                if (!memberLabel || !squadName) return null;
                return { memberLabel, squad: squadName };
              })
              .filter(Boolean);

            console.log("Raw squad assignments:", assignments.length);

            // Apply squad to members: RefData uses "Rank Name" for memberLabel
            this.members = this.members.map((m) => {
              const fullLabel = `${m.rank} ${m.name}`.trim();
              const match = assignments.find((a) => a.memberLabel === fullLabel);
              return {
                ...m,
                squad: match ? match.squad : "",
              };
            });

            // Optional: build a basic orbat structure (squads with members)
            const orbatMap = {};
            this.members.forEach((m) => {
              if (!m.squad) return;
              if (!orbatMap[m.squad]) orbatMap[m.squad] = [];
              orbatMap[m.squad].push(m);
            });
            this.orbat = Object.entries(orbatMap).map(([squad, members]) => ({
              squad,
              members,
            }));

            console.log("Squads in ORBAT:", this.orbat.length);
            resolve(this.orbat);
          },
          error: (err) => {
            console.error("Error loading RefData CSV:", err);
            reject(err);
          },
        });
      });
    },

    // ---- Missions / Events (unchanged) ----
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
