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

  <svg
    style="visibility: hidden; position: absolute"
    width="0"
    height="0"
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
  >
    <defs>
      <filter id="round">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feColorMatrix
          in="blur"
          mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -5"
          result="goo"
        />
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

      members: [], // MembersMaster: rank, name, joinDate, id, certifications, squad/fireteam/slot filled from RefData
      orbat: [],   // squads + members (built from slotting table)
      reserves: [],
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Local content
    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

    const membersUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv";

    const refDataUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=107253735&single=true&output=csv";

    // Load MembersMaster first, then overlay slotting from RefData
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
          header: false,
          complete: (results) => {
            const rows = results.data;
            const dataRows = rows.slice(2);

            const CERT_COLUMNS = 13;

            const members = dataRows
              .map((row) => {
                const rank = row[0]?.trim() || "";
                const name = row[1]?.trim() || "";
                const joinDate = row[3]?.trim() || "";
                const id = row[4]?.trim() || "";

                const certs = row
                  .slice(5, 5 + CERT_COLUMNS)
                  .map((c) => {
                    const v = (c || "").toString().trim().toUpperCase();
                    return v === "Y" ? "Y" : "N";
                  });

                if (!name) return null;

                return {
                  rank,
                  name,
                  joinDate,
                  id,
                  certifications: certs,

                  // Filled from RefData slotting table:
                  squad: "",
                  fireteam: "",
                  slot: "",
                  squadAssignments: "",
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

    // ---- RefData: Slotting table (Squad Slots + Squad Roles) ----
    async loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,

          // IMPORTANT: keep blanks so headings + spacing don't break context parsing
          skipEmptyLines: false,

          header: false,
          complete: (results) => {
            const rows = results.data;

            const normalize = (str) =>
              String(str || "")
                .replace(/"/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();

            // Find the columns by header row (row index 1)
            const headerRow = rows[1] || [];
            const slotColIndex = headerRow.findIndex((c) => normalize(c) === "squad slots");
            const roleColIndex = headerRow.findIndex((c) => normalize(c) === "squad roles");

            if (slotColIndex === -1 || roleColIndex === -1) {
              console.error("Could not find 'Squad Slots' / 'Squad Roles' in RefData headers:", headerRow);
              resolve([]);
              return;
            }

            let currentSquad = "";
            let currentFireteam = "";

            // Parse heading: "Chalk 1 Fireteam 1"
            const parseHeading = (text) => {
              const raw = String(text || "").trim();
              if (!raw) return null;

              // matches "<SQUAD NAME> Fireteam <number>"
              const m = raw.match(/^(.*?)(?:\s+)?fireteam\s*(\d+)\s*$/i);
              if (!m) return null;

              const squad = m[1].trim();
              const ftNum = m[2].trim();
              if (!squad || !ftNum) return null;

              return { squad, fireteam: `Fireteam ${ftNum}` };
            };

            // Match slot-name to MembersMaster member (robust-ish)
            const findMemberFromSlotName = (slotName) => {
              const s = normalize(slotName);
              if (!s) return null;

              // Extract surname + optional initial
              const parts = s.split(" ");
              const surname = parts[parts.length - 1] || "";
              const initialMatch = s.match(/\b([a-z])\./i);
              const initial = initialMatch ? initialMatch[1].toLowerCase() : "";

              // Try direct inclusion of member name
              let m = this.members.find((mem) => {
                const n = normalize(mem.name);
                return s.includes(n);
              });
              if (m) return m;

              // Try surname + initial match
              m = this.members.find((mem) => {
                const n = normalize(mem.name);
                const nParts = n.split(" ");
                const memSurname = nParts[nParts.length - 1] || "";
                const memInitial = (nParts[0] || "").charAt(0);

                if (!surname || memSurname !== surname) return false;
                if (initial && memInitial !== initial) return false;
                return true;
              });
              if (m) return m;

              // Last resort: surname-only (can be ambiguous)
              return this.members.find((mem) => {
                const n = normalize(mem.name);
                const nParts = n.split(" ");
                const memSurname = nParts[nParts.length - 1] || "";
                return surname && memSurname === surname;
              }) || null;
            };

            const slotAssignments = [];

            // Walk rows after header row
            for (let i = 2; i < rows.length; i++) {
              const row = rows[i] || [];
              const slotCell = row[slotColIndex];
              const roleCell = row[roleColIndex];

              const slotText = String(slotCell || "").trim();
              const roleText = String(roleCell || "").trim();

              // 1) Heading rows live in Role column
              const heading = parseHeading(roleText);
              if (heading) {
                currentSquad = heading.squad;
                currentFireteam = heading.fireteam;
                continue;
              }

              // 2) Slot rows: slotText is the member, roleText is the role
              if (currentSquad && currentFireteam && slotText && roleText) {
                const member = findMemberFromSlotName(slotText);
                if (!member) continue;

                slotAssignments.push({
                  id: member.id,
                  squad: currentSquad,
                  fireteam: currentFireteam,
                  slot: roleText,
                });
              }
            }

            console.log("Slot assignments parsed:", slotAssignments.length);

            // Apply assignments to members
            const byId = new Map(slotAssignments.map((a) => [a.id, a]));

            this.members = this.members.map((m) => {
              const a = byId.get(m.id);
              if (!a) return m;
              return {
                ...m,
                squad: a.squad,
                fireteam: a.fireteam,
                slot: a.slot,
                squadAssignments: a.slot,
              };
            });

            // Build ORBAT from assigned members only
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
