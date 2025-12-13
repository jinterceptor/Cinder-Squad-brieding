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

      // Primary dataset (MembersMaster)
      members: [],

      // What PilotsView uses (classic structure: { squad, members: [] })
      orbat: [],

      // Convenience bucket (optional; kept for compatibility)
      reserves: [],
    };
  },

  created() {
    this.setTitleFavicon(Config.defaultTitle + " MISSION BRIEFING", Config.icon);

    this.importMissions(
      import.meta.glob("@/assets/missions/*.md", { query: "?raw", import: "default" })
    );
    this.importEvents(
      import.meta.glob("@/assets/events/*.md", { query: "?raw", import: "default" })
    );

    const membersUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=1185035639&single=true&output=csv";

    const refDataUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRur4HOP2tdxileoG5jqAOslvnbLmjelTbY2JEQWVkvALwG3QrH16ktAVg7HiItyHeTib2jY-MMb24Z/pub?gid=107253735&single=true&output=csv";

    // Load MembersMaster first (so RefData can match to real member records)
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
     * MEMBERS MASTER (MembersMaster CSV)
     * =============================================================== */
    async loadMembersCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: true,
          header: false,
          complete: (results) => {
            // Row 0 = title row, Row 1 = header row, data starts at row 2
            const rows = (results.data || []).slice(2);

            const CERT_COLUMNS = 13;

            const members = rows
              .map((row) => {
                const name = row[1]?.trim();
                if (!name) return null;

                const rank = row[0]?.trim() || "";
                const joinDate = row[3]?.trim() || "";
                const id = row[4]?.trim() || "";

                const certifications = row
                  .slice(5, 5 + CERT_COLUMNS)
                  .map((c) => (String(c || "").trim().toUpperCase() === "Y" ? "Y" : "N"));

                return {
                  rank,
                  name,
                  joinDate,
                  id,
                  certifications,

                  // These get filled/overridden by RefData:
                  squad: "",
                  fireteam: "",
                  slot: "",
                  slotStatus: "", // "VACANT" / "CLOSED" / ""
                };
              })
              .filter(Boolean);

            this.members = members;
            console.log("Members loaded:", this.members.length);
            resolve(members);
          },
          error: (err) => {
            console.error("Error loading MembersMaster:", err);
            reject(err);
          },
        });
      });
    },

    /* ===============================================================
     * REFDATA (RefData CSV)
     * - Part A: "Squad Member" + "Squads" sets general membership
     * - Part B: "Squad Slots/Slot" + "Squad Roles/Role" sets fireteam + role
     * =============================================================== */
    async loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          // Keep blanks so section headers / spacing don’t break context
          skipEmptyLines: false,
          header: false,
          complete: (results) => {
            const rows = results.data || [];

            // ----------- Find a usable header row (row 0 or row 1 typically) -----------
            const headerCandidates = [
              { idx: 0, row: rows[0] || [] },
              { idx: 1, row: rows[1] || [] },
              { idx: 2, row: rows[2] || [] },
            ];

            const findCol = (row, names) => {
              const want = names.map((n) => this.normalize(n));
              return row.findIndex((cell) => want.includes(this.normalize(cell)));
            };

            let headerRowIndex = -1;
            let colMember = -1; // "Squad Member"
            let colSquad = -1; // "Squads"
            let colSlotName = -1; // "Squad Slots" or "Slot"
            let colRole = -1; // "Squad Roles" or "Role"

            for (const cand of headerCandidates) {
              const row = cand.row;

              const m = findCol(row, ["Squad Member"]);
              const s = findCol(row, ["Squads"]);
              const sl = findCol(row, ["Squad Slots", "Slot"]);
              const r = findCol(row, ["Squad Roles", "Role"]);

              // Accept if we have at least the slots+roles OR member+squads.
              // In practice we usually have all four.
              if ((m !== -1 && s !== -1) || (sl !== -1 && r !== -1)) {
                headerRowIndex = cand.idx;
                colMember = m;
                colSquad = s;
                colSlotName = sl;
                colRole = r;
                break;
              }
            }

            if (headerRowIndex === -1) {
              console.error("RefData headings not found (checked rows 0–2).");
              resolve([]);
              return;
            }

            console.log("RefData header row used:", headerRowIndex, {
              colMember,
              colSquad,
              colSlotName,
              colRole,
            });

            // Helpers
            const isVacantOrClosed = (txt) => {
              const t = this.normalize(txt);
              if (t === "vacant") return "VACANT";
              if (t === "closed") return "CLOSED";
              return "";
            };

            const matchMemberFromLabel = (label) => {
              const s = this.normalize(label);
              if (!s) return null;

              // Try direct inclusion of full member.name
              const direct = this.members.find((mem) => s.includes(this.normalize(mem.name)));
              if (direct) return direct;

              // Try surname + initial approach
              const parts = s.split(" ");
              const surname = parts[parts.length - 1] || "";
              const initialMatch = s.match(/\b([a-z])\./i);
              const initial = initialMatch ? initialMatch[1].toLowerCase() : "";

              // Match by surname + initial (if available)
              const bySurname = this.members.find((mem) => {
                const n = this.normalize(mem.name);
                const np = n.split(" ");
                const memSurname = np[np.length - 1] || "";
                const memInitial = (np[0] || "").charAt(0);
                if (!surname || memSurname !== surname) return false;
                if (initial && memInitial !== initial) return false;
                return true;
              });
              if (bySurname) return bySurname;

              // Last resort: surname-only
              return (
                this.members.find((mem) => {
                  const n = this.normalize(mem.name);
                  const np = n.split(" ");
                  const memSurname = np[np.length - 1] || "";
                  return surname && memSurname === surname;
                }) || null
              );
            };

            // ==========================================================
            // PART A: General squad membership (Squad Member + Squads)
            // ==========================================================
            if (colMember !== -1 && colSquad !== -1) {
              const assignments = rows
                .slice(headerRowIndex + 1)
                .map((row) => {
                  const memberLabel = row[colMember];
                  const squadName = row[colSquad];
                  if (!memberLabel || !squadName) return null;

                  const label = String(memberLabel).trim();
                  const squad = String(squadName).trim();
                  if (!label || !squad) return null;

                  return { label, squad };
                })
                .filter(Boolean);

              // Apply membership squads (non-slot baseline)
              this.members = this.members.map((m) => {
                // only set if not already set later; slotting will override
                const fullLabelGuess = `${m.rank} ${m.name}`.trim();

                const hit =
                  assignments.find((a) => this.normalize(a.label) === this.normalize(fullLabelGuess)) ||
                  assignments.find((a) => this.normalize(a.label).includes(this.normalize(m.name)));

                return {
                  ...m,
                  squad: hit ? hit.squad : m.squad,
                };
              });

              console.log("General squad assignments applied:", assignments.length);
            }

            // ==========================================================
            // PART B: Slotting + fireteams/roles (Squad Slots + Squad Roles)
            // ==========================================================
            // This is what adds: squad + fireteam + slot + vacant/closed
            const slotRows = [];
            const discoveredSquads = new Set();

            if (colSlotName !== -1 && colRole !== -1) {
              let currentSquad = "";
              let currentFireteam = "";

              const parseFireteamHeading = (text) => {
                const raw = String(text || "").trim();
                if (!raw) return null;
                // "<SQUAD> Fireteam <N>"
                const m = raw.match(/^(.*?)(?:\s+)?fireteam\s*(\d+)\s*$/i);
                if (!m) return null;
                return { squad: m[1].trim(), fireteam: `Fireteam ${m[2].trim()}` };
              };

              // Also allow headings like "Broadsword", "Ifrit", etc (no fireteam)
              const parseUnitHeading = (text) => {
                const raw = String(text || "").trim();
                if (!raw) return null;

                // reject if it's obviously a role label (too short/too generic would be ambiguous)
                // We'll only accept as a unit heading if it matches known unit names,
                // or if it's a single word / title-cased and not "Squad Lead" etc.
                const n = this.normalize(raw);

                const known = [
                  "chalk actual",
                  "chalk 1",
                  "chalk 2",
                  "chalk 3",
                  "chalk 4",
                  "broadsword",
                  "broadsword command",
                  "ifrit",
                  "wyvern",
                  "wyvern air wing",
                  "caladrius",
                  "fillers",
                  "reserves",
                  "recruit",
                  "recruits",
                ];

                if (known.includes(n)) {
                  return { squad: raw.trim(), fireteam: "Element" };
                }

                return null;
              };

              for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const row = rows[i] || [];
                const slotName = String(row[colSlotName] || "").trim(); // name / vacant / closed
                const roleText = String(row[colRole] || "").trim(); // heading OR role

                // Headings live in the role column
                const ft = parseFireteamHeading(roleText);
                if (ft) {
                  currentSquad = ft.squad;
                  currentFireteam = ft.fireteam;
                  discoveredSquads.add(currentSquad);
                  continue;
                }

                const unit = parseUnitHeading(roleText);
                if (unit) {
                  currentSquad = unit.squad;
                  currentFireteam = unit.fireteam;
                  discoveredSquads.add(currentSquad);
                  continue;
                }

                // If we don't have a current squad context, skip.
                if (!currentSquad) continue;

                // If row doesn't contain a role, it's probably spacing -> skip
                if (!roleText) continue;

                // Vacant / Closed tiles
                const status = isVacantOrClosed(slotName);
                if (status) {
                  slotRows.push({
                    squad: currentSquad,
                    fireteam: currentFireteam || "Element",
                    slot: roleText,
                    status,
                    member: null,
                  });
                  continue;
                }

                // A real member in a slot
                if (slotName) {
                  const member = matchMemberFromLabel(slotName);

                  slotRows.push({
                    squad: currentSquad,
                    fireteam: currentFireteam || "Element",
                    slot: roleText,
                    status: member ? "FILLED" : "UNKNOWN",
                    member: member || { name: slotName }, // placeholder if not matched
                  });

                  // Overlay onto real member record if matched
                  if (member) {
                    member.squad = currentSquad;
                    member.fireteam = currentFireteam || "Element";
                    member.slot = roleText;
                    member.slotStatus = "";
                  }
                }
              }

              console.log("Parsed slot rows:", slotRows.length);
            } else {
              console.warn("No slotting columns found in RefData (Slot/Role).");
            }

            // ==========================================================
            // Ensure squads are represented (even if empty)
            // ==========================================================
            const ALWAYS_SQUADS = [
              "Chalk Actual",
              "Chalk 1",
              "Chalk 2",
              "Chalk 3",
              "Chalk 4",
              "Broadsword Command",
              "Broadsword",
              "Ifrit",
              "Wyvern Air Wing",
              "Wyvern",
              "Caladrius",
              "Fillers",
              "Reserves",
              "Recruit",
            ];

            // Build classic ORBAT map from member.squad
            const orbatMap = {};
            const ensureSquad = (s) => {
              if (!s) return;
              if (!orbatMap[s]) orbatMap[s] = [];
            };

            ALWAYS_SQUADS.forEach(ensureSquad);
            discoveredSquads.forEach(ensureSquad);

            // Put members into their squads (from either baseline or slotting override)
            this.members.forEach((m) => {
              if (!m.squad) return;
              ensureSquad(m.squad);
              orbatMap[m.squad].push(m);
            });

            // Sort members inside each squad (stable + nice)
            Object.keys(orbatMap).forEach((k) => {
              orbatMap[k] = orbatMap[k].slice().sort((a, b) =>
                (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
              );
            });

            // Output format PilotsView expects
            this.orbat = Object.entries(orbatMap).map(([squad, members]) => ({
              squad,
              members,
            }));

            // Convenience reserves list (optional)
            this.reserves = (orbatMap["Reserves"] || []).slice();

            console.log("ORBAT built:", this.orbat.length);
            resolve(this.orbat);
          },
          error: (err) => {
            console.error("Error loading RefData:", err);
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
