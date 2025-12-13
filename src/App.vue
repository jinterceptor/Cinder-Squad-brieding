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

      members: [],  // from MembersMaster
      orbat: [],    // built from RefData slotting (Squad Slots + Squad Roles)
      reserves: [], // optional convenience list
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    // Local content
    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

    // Google Sheet CSVs
    const membersUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv";

    const refDataUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=107253735&single=true&output=csv";

    // Load MembersMaster first, then overlay RefData slotting
    this.loadMembersCSV(membersUrl).then(() => {
      this.loadRefDataCSV(refDataUrl);
    });
  },

  mounted() {
    this.$router.push("/status");
  },

  methods: {
    /* ===============================================================
     * Utilities
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
     * MEMBERS MASTER
     * =============================================================== */
    async loadMembersCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: true,
          header: false,
          complete: (results) => {
            // Row 0 = title, Row 1 = headers, so data begins at Row 2
            const rows = (results.data || []).slice(2);

            const CERT_COLUMNS = 13; // fixed order, Y/N flags

            this.members = rows
              .map((row) => {
                const name = row?.[1]?.trim();
                if (!name) return null;

                return {
                  rank: row?.[0]?.trim() || "",
                  name,
                  joinDate: row?.[3]?.trim() || "",
                  id: row?.[4]?.trim() || "",
                  certifications: (row || [])
                    .slice(5, 5 + CERT_COLUMNS)
                    .map((c) => (String(c || "").trim().toUpperCase() === "Y" ? "Y" : "N")),

                  // filled from RefData slotting
                  squad: "",
                  fireteam: "",
                  slot: "",
                };
              })
              .filter(Boolean);

            console.log("Members loaded:", this.members.length);
            resolve(this.members);
          },
          error: (err) => {
            console.error("MembersMaster parse error:", err);
            reject(err);
          },
        });
      });
    },

    /* ===============================================================
     * REFDATA — SLOT-BASED ORBAT (Squad Slots + Squad Roles)
     * =============================================================== */
    async loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,

          // Keep blanks because headings/sections may rely on spacing
          skipEmptyLines: false,

          header: false,
          complete: (results) => {
            const rows = results.data || [];

            /* ---------- Find header row robustly (row 0 or 1) ---------- */
            let headerRowIndex = -1;
            let col = {};

            const findCol = (row, names) => {
              const normNames = names.map((n) => this.normalize(n));
              return row.findIndex((cell) => normNames.includes(this.normalize(cell)));
            };

            for (let i = 0; i <= 1; i++) {
              const row = rows[i] || [];
              const slotIdx = findCol(row, ["Squad Slots", "Slot"]);
              const roleIdx = findCol(row, ["Squad Roles", "Role"]);

              // We only REQUIRE slot + role to build ORBAT
              if (slotIdx !== -1 && roleIdx !== -1) {
                headerRowIndex = i;
                col = { sl: slotIdx, r: roleIdx };
                break;
              }
            }

            if (headerRowIndex === -1) {
              console.error("RefData headings not found. Row0:", rows[0], "Row1:", rows[1]);
              resolve([]);
              return;
            }

            console.log("RefData header row used:", headerRowIndex, col);

            /* ---------- Parse headings + slots ---------- */
            const parseHeading = (txt) => {
              const raw = String(txt || "").trim();
              if (!raw) return null;

              // Fireteam heading: "Chalk 1 Fireteam 1"
              const ft = raw.match(/^(.*?)(?:\s+)?fireteam\s*(\d+)\s*$/i);
              if (ft) {
                return {
                  squad: ft[1].trim(),
                  fireteam: `Fireteam ${ft[2]}`,
                };
              }

              // Non-fireteam heading: "Broadsword" / "Wyvern" / "Caladrius" etc.
              // We treat these as a heading if the cell is "word-like" and not a normal role.
              // Since roles are usually things like "Rifleman", "Squad Lead", etc, headings tend to be
              // a single unit name with no punctuation.
              if (/^[A-Za-z0-9\s-]{3,}$/.test(raw) && !raw.toLowerCase().includes("rifle")) {
                // We will accept as heading, but ONLY if the next rows look like roles.
                // (Simple acceptance here—good enough for your sheet as described.)
                return {
                  squad: raw.trim(),
                  fireteam: "Element",
                };
              }

              return null;
            };

            const findMember = (slotName) => {
              const sn = this.normalize(slotName);

              // Try direct includes of the member's name (works for `M. Jinter`, etc)
              const direct = this.members.find((m) => sn.includes(this.normalize(m.name)));
              if (direct) return direct;

              // Fallback: surname match
              const parts = sn.split(" ");
              const surname = parts[parts.length - 1] || "";
              if (!surname) return null;

              return (
                this.members.find((m) => {
                  const np = this.normalize(m.name).split(" ");
                  const ms = np[np.length - 1] || "";
                  return ms === surname;
                }) || null
              );
            };

            let currentSquad = "";
            let currentFireteam = "Element";
            const parsedSlots = [];

            for (let i = headerRowIndex + 1; i < rows.length; i++) {
              const row = rows[i] || [];
              const slotTxt = String(row[col.sl] || "").trim();
              const roleTxt = String(row[col.r] || "").trim();

              // Headings appear in role column (as you described)
              const heading = parseHeading(roleTxt);
              if (heading) {
                currentSquad = heading.squad;
                currentFireteam = heading.fireteam || "Element";
                continue;
              }

              if (!currentSquad) continue;
              if (!roleTxt) continue; // role is mandatory for slot rows

              const slotLower = slotTxt.toLowerCase();

              // Vacant / Closed slots
              if (slotLower === "vacant" || slotLower === "closed") {
                parsedSlots.push({
                  squad: currentSquad,
                  fireteam: currentFireteam || "Element",
                  role: roleTxt,
                  status: slotLower.toUpperCase(),
                  member: null,
                });
                continue;
              }

              // Filled slots (name present)
              if (slotTxt) {
                const member = findMember(slotTxt);

                parsedSlots.push({
                  squad: currentSquad,
                  fireteam: currentFireteam || "Element",
                  role: roleTxt,
                  status: member ? "FILLED" : "FILLED", // still show as filled even if unmatched
                  member: member || { rank: "", name: slotTxt, id: "" },
                });

                // If we matched a real member, stamp their slot data
                if (member) {
                  member.squad = currentSquad;
                  member.fireteam = currentFireteam;
                  member.slot = roleTxt;
                }
              }
            }

            console.log("Parsed slot rows:", parsedSlots.length);

            /* ---------- Build ORBAT with guaranteed sections ---------- */
            const ALWAYS_SQUADS = [
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
              "Fillers",
            ];

            const orbatMap = {};
            ALWAYS_SQUADS.forEach((s) => {
              orbatMap[s] = { squad: s, fireteams: {} };
            });

            // Insert parsed slots
            parsedSlots.forEach((s) => {
              const squadName = s.squad || "Reserves";
              if (!orbatMap[squadName]) orbatMap[squadName] = { squad: squadName, fireteams: {} };

              const ftName = s.fireteam || "Element";
              orbatMap[squadName].fireteams[ftName] ??= { name: ftName, slots: [] };
              orbatMap[squadName].fireteams[ftName].slots.push(s);
            });

            // Put unassigned members into Reserves->Element
            const unassigned = this.members.filter((m) => !m.squad);
            if (unassigned.length) {
              orbatMap["Reserves"].fireteams["Element"] ??= { name: "Element", slots: [] };
              unassigned.forEach((m) => {
                orbatMap["Reserves"].fireteams["Element"].slots.push({
                  squad: "Reserves",
                  fireteam: "Element",
                  role: "Unassigned",
                  status: "FILLED",
                  member: m,
                });
              });
            }

            // Final array form expected by PilotsView
            this.orbat = Object.values(orbatMap).map((s) => ({
              squad: s.squad,
              fireteams: Object.values(s.fireteams),
            }));

            // Convenience list
            this.reserves = unassigned;

            console.log("ORBAT built:", this.orbat.length);
            resolve(this.orbat);
          },
          error: (err) => {
            console.error("RefData parse error:", err);
            reject(err);
          },
        });
      });
    },

    /* ===============================================================
     * MISSIONS / EVENTS (unchanged)
     * =============================================================== */
    async importMissions(files) {
      const contents = await Promise.all(Object.values(files).map((f) => f()));
      contents.forEach((c) => {
        const l = c.split("\n");
        this.missions.push({
          slug: l[0],
          name: l[1],
          status: l[2],
          content: l.slice(3).join("\n"),
        });
      });
      this.missions.sort((a, b) => b.slug - a.slug);
    },

    async importEvents(files) {
      const contents = await Promise.all(Object.values(files).map((f) => f()));
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
