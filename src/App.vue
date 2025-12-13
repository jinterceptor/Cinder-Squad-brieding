<template>
  <div class="page-wrapper">
    <Header
      :planet-path="planetPath"
      :class="{ animate: animate }"
      :header="header"
    />
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

      missions: [],
      events: [],

      members: [],
      orbat: [],
      reserves: [],
    };
  },

  created() {
    this.setTitleFavicon(
      Config.defaultTitle + " MISSION BRIEFING",
      Config.icon
    );

    this.importMissions(
      import.meta.glob("@/assets/missions/*.md", {
        query: "?raw",
        import: "default",
      })
    );
    this.importEvents(
      import.meta.glob("@/assets/events/*.md", {
        query: "?raw",
        import: "default",
      })
    );

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
    /* ===============================================================
     *  Utilities
     * =============================================================== */
    normalize(str) {
      return String(str || "")
        .replace(/"/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    },

    setTitleFavicon(title, favicon) {
      document.title = title;
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = favicon;
      document.head.appendChild(link);
    },

    /* ===============================================================
     *  MEMBERS MASTER
     * =============================================================== */
    async loadMembersCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: true,
          header: false,
          complete: (results) => {
            const rows = results.data.slice(2); // skip title + headers
            const CERT_COLUMNS = 13;

            this.members = rows
              .map((row) => {
                const name = row[1]?.trim();
                if (!name) return null;

                return {
                  rank: row[0]?.trim() || "",
                  name,
                  joinDate: row[3]?.trim() || "",
                  id: row[4]?.trim() || "",
                  certifications: row
                    .slice(5, 5 + CERT_COLUMNS)
                    .map((c) =>
                      String(c || "")
                        .trim()
                        .toUpperCase() === "Y"
                        ? "Y"
                        : "N"
                    ),

                  squad: "",
                  fireteam: "",
                  slot: "",
                };
              })
              .filter(Boolean);

            console.log("Members loaded:", this.members.length);
            resolve(this.members);
          },
          error: reject,
        });
      });
    },

    /* ===============================================================
     *  REFDATA — SLOT-BASED ORBAT
     * =============================================================== */
    async loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: false,
          header: false,
          complete: (results) => {
            const rows = results.data;

            /* ---------- Find header row ---------- */
            let headerRowIndex = -1;
            let col = {};

            const findCol = (row, names) =>
              row.findIndex((c) =>
                names.includes(this.normalize(c))
              );

            for (let i = 0; i < 2; i++) {
              const row = rows[i] || [];
              const m = findCol(row, ["squad member"]);
              const s = findCol(row, ["squads"]);
              const sl = findCol(row, ["squad slots", "slot"]);
              const r = findCol(row, ["squad roles", "role"]);

              if (m !== -1 && s !== -1 && sl !== -1 && r !== -1) {
                headerRowIndex = i;
                col = { m, s, sl, r };
                break;
              }
            }

            if (headerRowIndex === -1) {
              console.error("RefData headers not found");
              resolve([]);
              return;
            }

            /* ---------- Slot parsing ---------- */
            const parseHeading = (txt) => {
              const m = String(txt || "")
                .trim()
                .match(/^(.*?)(?:\s+)?fireteam\s*(\d+)/i);
              if (!m) return null;
              return {
                squad: m[1].trim(),
                fireteam: `Fireteam ${m[2]}`,
              };
            };

            const findMember = (label) => {
              const n = this.normalize(label);
              return (
                this.members.find((m) =>
                  n.includes(this.normalize(m.name))
                ) || null
              );
            };

            const slots = [];
            let currentSquad = "";
            let currentFireteam = "";

            for (let i = headerRowIndex + 1; i < rows.length; i++) {
              const row = rows[i] || [];
              const slotTxt = String(row[col.sl] || "").trim();
              const roleTxt = String(row[col.r] || "").trim();

              const heading = parseHeading(roleTxt);
              if (heading) {
                currentSquad = heading.squad;
                currentFireteam = heading.fireteam;
                continue;
              }

              if (!currentSquad || !roleTxt) continue;

              const lower = slotTxt.toLowerCase();

              if (lower === "vacant" || lower === "closed") {
                slots.push({
                  squad: currentSquad,
                  fireteam: currentFireteam || "Element",
                  role: roleTxt,
                  status: lower.toUpperCase(),
                  member: null,
                });
                continue;
              }

              const member = findMember(slotTxt);
              if (!member) continue;

              slots.push({
                squad: currentSquad,
                fireteam: currentFireteam || "Element",
                role: roleTxt,
                status: "FILLED",
                member,
              });

              member.squad = currentSquad;
              member.fireteam = currentFireteam;
              member.slot = roleTxt;
            }

            /* ---------- Build ORBAT ---------- */
            const ALWAYS = [
              "Chalk Actual",
              "Chalk 1",
              "Chalk 2",
              "Chalk 3",
              "Chalk 4",
              "Broadsword",
              "Ifrit",
              "Wyvern",
              "Caladrius",
              "Reserves",
              "Recruit",
            ];

            const orbatMap = {};
            ALWAYS.forEach(
              (s) => (orbatMap[s] = { squad: s, fireteams: {} })
            );

            slots.forEach((s) => {
              const sq = orbatMap[s.squad];
              sq.fireteams[s.fireteam] ??= {
                name: s.fireteam,
                slots: [],
              };
              sq.fireteams[s.fireteam].slots.push(s);
            });

            /* ---------- Unassigned → Reserves ---------- */
            this.members.forEach((m) => {
              if (!m.squad) {
                orbatMap["Reserves"].fireteams["Element"] ??= {
                  name: "Element",
                  slots: [],
                };
                orbatMap["Reserves"].fireteams["Element"].slots.push(
                  {
                    role: "Unassigned",
                    status: "FILLED",
                    member: m,
                  }
                );
              }
            });

            this.orbat = Object.values(orbatMap).map((s) => ({
              squad: s.squad,
              fireteams: Object.values(s.fireteams),
            }));

            console.log("ORBAT built:", this.orbat.length);
            resolve(this.orbat);
          },
          error: reject,
        });
      });
    },

    /* ===============================================================
     *  MISSIONS / EVENTS
     * =============================================================== */
    async importMissions(files) {
      const contents = await Promise.all(
        Object.values(files).map((f) => f())
      );
      contents.forEach((c) => {
        const l = c.split("\n");
        this.missions.push({
          slug: l[0],
          name: l[1],
          status: l[2],
          content: l.slice(3).join("\n"),
        });
      });
    },

    async importEvents(files) {
      const contents = await Promise.all(
        Object.values(files).map((f) => f())
      );
      contents.forEach((c) => {
        const l = c.split("\n");
        this.events.push({
          title: l[0],
          location: l[1],
          time: l[2],
          thumbnail: l[3],
          content: l.slice(4).join("\n"),
        });
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
