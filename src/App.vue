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

      members: [],   // from MembersMaster
      orbat: [],     // built from RefData slotting + fallback membership
      reserves: [],  // optional later
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    this.importMissions(import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" }));
    this.importEvents(import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" }));

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
            const rows = results.data.slice(2); // skip title + header rows
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
          error: reject,
        });
      });
    },

    /* ===============================================================
     *  REFDATA — Slotting + fallback squad membership
     * =============================================================== */
    async loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: false, // KEEP empties; headings rely on them
          header: false,
          complete: (results) => {
            const rows = results.data;

            // Try first 2 rows as header candidates
            const headerCandidates = [
              { idx: 0, row: rows[0] || [] },
              { idx: 1, row: rows[1] || [] },
            ];

            const findCol = (row, names) => {
              const wanted = names.map((n) => this.normalize(n));
              return row.findIndex((c) => wanted.includes(this.normalize(c)));
            };

            let headerRowIndex = -1;
            let col = { m: -1, s: -1, sl: -1, r: -1 };

            for (const cand of headerCandidates) {
              const r = cand.row;

              const m = findCol(r, ["Squad Member"]);
              const s = findCol(r, ["Squads"]);
              const sl = findCol(r, ["Squad Slots", "Slot"]);
              const role = findCol(r, ["Squad Roles", "Role"]);

              // We accept if we can do at least membership matching, and preferably slotting too.
              if (m !== -1 && s !== -1) {
                headerRowIndex = cand.idx;
                col = { m, s, sl, r: role };
                break;
              }
            }

            if (headerRowIndex === -1) {
              console.error("RefData headers not found (Squad Member / Squads)");
              resolve([]);
              return;
            }

            console.log("RefData header row used:", headerRowIndex, col);

            // ---------- 1) FALLBACK MEMBERSHIP: Squad Member + Squads ----------
            // This ensures Chalk Actual / Wyvern / Caladrius etc can still populate even if not in slotting.
            const membership = rows
              .slice(headerRowIndex + 1)
              .map((row) => {
                const memberLabel = String(row[col.m] || "").trim();
                const squadName = String(row[col.s] || "").trim();
                if (!memberLabel || !squadName) return null;
                return { memberLabel, squad: squadName, normLabel: this.normalize(memberLabel) };
              })
              .filter(Boolean);

            // Helper: find member by label (rank + name strings)
            const findMemberByLabel = (labelNorm) => {
              // 1) direct contains normalized full name
              const direct = this.members.find((mem) => labelNorm.includes(this.normalize(mem.name)));
              if (direct) return direct;

              // 2) initial + surname heuristic
              const parts = labelNorm.split(" ");
              const surname = parts[parts.length - 1] || "";
              const initialMatch = labelNorm.match(/\b([a-z])\./i);
              const initial = initialMatch ? initialMatch[1].toLowerCase() : "";

              return (
                this.members.find((mem) => {
                  const n = this.normalize(mem.name);
                  const np = n.split(" ");
                  const memSurname = np[np.length - 1] || "";
                  const memInitial = (np[0] || "").charAt(0);
                  if (!surname || memSurname !== surname) return false;
                  if (initial && memInitial !== initial) return false;
                  return true;
                }) || null
              );
            };

            // Apply fallback squad if present
            membership.forEach((m) => {
              const mem = findMemberByLabel(m.normLabel);
              if (!mem) return;
              if (!mem.squad) mem.squad = m.squad; // don't overwrite slotting later
            });

            // ---------- 2) SLOT PARSING: Slot + Role columns ----------
            const KNOWN_SQUADS = [
              "Chalk Actual",
              "Chalk 1",
              "Chalk 2",
              "Chalk 3",
              "Chalk 4",
              "Broadsword",
              "Broadsword Command",
              "Ifrit",
              "Wyvern",
              "Wyvern Air Wing",
              "Caladrius",
              "Reserves",
              "Recruit",
              "Recruits",
              "Fillers",
            ].map((s) => this.normalize(s));

            const parseHeading = (txt) => {
              const raw = String(txt || "").trim();
              if (!raw) return null;

              // Fireteam heading
              const ft = raw.match(/^(.*?)(?:\s+)?fireteam\s*(\d+)\s*$/i);
              if (ft) {
                return { squad: ft[1].trim(), fireteam: `Fireteam ${ft[2].trim()}` };
              }

              // Non-fireteam unit heading (Broadsword, Wyvern, Caladrius, etc.)
              if (KNOWN_SQUADS.includes(this.normalize(raw))) {
                return { squad: raw.trim(), fireteam: "Element" };
              }

              return null;
            };

            // If slotting columns not found, we still build ORBAT from membership
            const canSlot = col.sl !== -1 && col.r !== -1;

            const slotRows = [];
            let currentSquad = "";
            let currentFireteam = "Element";

            if (canSlot) {
              for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const row = rows[i] || [];

                const slotTxt = String(row[col.sl] || "").trim(); // member name, or VACANT/CLOSED
                const roleTxt = String(row[col.r] || "").trim();  // role, OR heading text

                const heading = parseHeading(roleTxt);
                if (heading) {
                  currentSquad = heading.squad;
                  currentFireteam = heading.fireteam || "Element";
                  continue;
                }

                if (!currentSquad || !roleTxt) continue;

                const lowerSlot = this.normalize(slotTxt);

                // Vacant / Closed slots
                if (lowerSlot === "vacant" || lowerSlot === "closed") {
                  slotRows.push({
                    squad: currentSquad,
                    fireteam: currentFireteam || "Element",
                    role: roleTxt,
                    status: lowerSlot.toUpperCase(), // VACANT / CLOSED
                    member: null,
                  });
                  continue;
                }

                // Filled slot
                const mem = slotTxt ? findMemberByLabel(this.normalize(slotTxt)) : null;
                if (!mem) continue;

                mem.squad = currentSquad;
                mem.fireteam = currentFireteam;
                mem.slot = roleTxt;

                slotRows.push({
                  squad: currentSquad,
                  fireteam: currentFireteam || "Element",
                  role: roleTxt,
                  status: "FILLED",
                  member: mem,
                });
              }
            }

            console.log("Parsed slot rows:", slotRows.length);

            // ---------- 3) BUILD ORBAT: always include squads even if empty ----------
            const ALWAYS_SQUADS = [
              "Chalk Actual",
              "Chalk 1",
              "Chalk 2",
              "Chalk 3",
              "Chalk 4",
              "Broadsword Command",
              "Broadsword",
              "Ifrit",
              "Wyvern",
              "Caladrius",
              "Fillers",
              "Recruit",
              "Reserves",
            ];

            const orbatMap = {};
            ALWAYS_SQUADS.forEach((s) => {
              orbatMap[s] = {
                squad: s,
                members: [],
                // used by the view to group / show vacant slots
                fireteams: {}, // { [name]: { name, slots: [] } }
              };
            });

            // Put filled members into squad members list
            this.members.forEach((m) => {
              if (!m.squad) return;

              // normalize squad keys to your canonical labels if needed
              let squadKey = m.squad;
              if (!orbatMap[squadKey]) {
                orbatMap[squadKey] = { squad: squadKey, members: [], fireteams: {} };
              }

              orbatMap[squadKey].members.push(m);

              const ftName = m.fireteam || "Element";
              orbatMap[squadKey].fireteams[ftName] ??= { name: ftName, slots: [] };
              orbatMap[squadKey].fireteams[ftName].slots.push({
                role: m.slot || "Unassigned",
                status: "FILLED",
                member: m,
              });
            });

            // Add vacant/closed slots into fireteams too (so the UI can show them)
            slotRows
              .filter((s) => s.status === "VACANT" || s.status === "CLOSED")
              .forEach((s) => {
                if (!orbatMap[s.squad]) {
                  orbatMap[s.squad] = { squad: s.squad, members: [], fireteams: {} };
                }
                const ft = s.fireteam || "Element";
                orbatMap[s.squad].fireteams[ft] ??= { name: ft, slots: [] };
                orbatMap[s.squad].fireteams[ft].slots.push({
                  role: s.role,
                  status: s.status,
                  member: null,
                });
              });

            // Any unassigned members -> drop into Reserves by default (you can change later)
            this.members.forEach((m) => {
              if (m.squad) return;
              orbatMap["Reserves"].members.push(m);
              orbatMap["Reserves"].fireteams["Element"] ??= { name: "Element", slots: [] };
              orbatMap["Reserves"].fireteams["Element"].slots.push({
                role: "Unassigned",
                status: "FILLED",
                member: m,
              });
            });

            // Finalize orbat array
            this.orbat = Object.values(orbatMap).map((s) => ({
              squad: s.squad,
              members: (s.members || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")),
              fireteams: Object.values(s.fireteams || {}),
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
    },
  },
};
</script>

<style>
#app {
  min-height: 100vh;
  overflow: hidden !important; /* KEEP as-is; PilotsView will be scroll container */
}
</style>
