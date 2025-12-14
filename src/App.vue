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

  <!-- UNSC startup tone -->
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

      members: [],   // Personnel roster (MembersMaster)
      orbat: [],     // ORBAT generated from RefData membership + slotting
      reserves: [],  // Optional later (kept for compatibility)
    };
  },

  created() {
    // Theme: make the browser title read more UNSC-friendly
    this.setTitleFavicon(Config.defaultTitle + " UNSC BRIEFING", Config.icon);

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
     *  UNSC ID SCRAMBLER (#####-#####-XX)
     *  - Deterministic per member (same input => same output)
     *  - Collision-checked for uniqueness
     * =============================================================== */
    makeInitials(name) {
      const parts = String(name || "").trim().toUpperCase().split(/\s+/).filter(Boolean);
      if (!parts.length) return "XX";

      const first = parts[0]?.[0] || "X";
      const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || "X") : "X";

      return `${first}${last}`;
    },

    // Stable 32-bit hash (FNV-1a)
    hash32(str) {
      let h = 2166136261;
      const s = String(str || "");
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },

    pad5(n) {
      return String(n).padStart(5, "0");
    },

    makeUNSCId(oldId, name, used) {
      const initials = this.makeInitials(name);

      // Seed from old id + name so it's "scrambled" but consistent
      let seed = this.hash32(`${oldId}::${name}`);

      let a = seed % 100000;
      let b = ((seed / 100000) >>> 0) % 100000;

      let candidate = `${this.pad5(a)}-${this.pad5(b)}-${initials}`;

      // Collision-safe: walk until unused
      while (used.has(candidate)) {
        seed = (seed + 1) >>> 0;
        a = seed % 100000;
        b = ((seed / 100000) >>> 0) % 100000;
        candidate = `${this.pad5(a)}-${this.pad5(b)}-${initials}`;
      }

      used.add(candidate);
      return candidate;
    },

    /* ===============================================================
     *  PERSONNEL ROSTER (MembersMaster)
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

            const usedUNSCIds = new Set();

            this.members = rows
              .map((row) => {
                const name = row[1]?.trim();
                if (!name) return null;

                const oldId = row[4]?.trim() || "";

                return {
                  rank: row[0]?.trim() || "",
                  name,
                  joinDate: row[3]?.trim() || "",
                  id: this.makeUNSCId(oldId, name, usedUNSCIds), // ✅ UNSC formatted
                  certifications: row
                    .slice(5, 5 + CERT_COLUMNS)
                    .map((c) => (String(c || "").trim().toUpperCase() === "Y" ? "Y" : "N")),

                  // Filled from RefData:
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
     *  REFDATA — membership (N/O) + slotting (P/Q)
     * =============================================================== */
    async loadRefDataCSV(csvUrl) {
      return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
          download: true,
          skipEmptyLines: false,
          header: false,
          complete: (results) => {
            const rows = results.data || [];

            // --- helper to find a column in a row by any of several names ---
            const findCol = (row, names) => {
              const wanted = names.map((n) => this.normalize(n));
              return row.findIndex((c) => wanted.includes(this.normalize(c)));
            };

            // --- 1) Find membership headers (Squad Member / Squads) in first 2 rows ---
            let membershipHeaderRowIndex = -1;
            let memberCol = -1;
            let squadCol = -1;

            for (let i = 0; i < 2; i++) {
              const r = rows[i] || [];
              const m = findCol(r, ["Squad Member"]);
              const s = findCol(r, ["Squads"]);
              if (m !== -1 && s !== -1) {
                membershipHeaderRowIndex = i;
                memberCol = m;
                squadCol = s;
                break;
              }
            }

            if (membershipHeaderRowIndex === -1) {
              console.error("RefData: could not find membership headers (Squad Member / Squads).");
              resolve([]);
              return;
            }

            // --- 2) Find slotting headers (Slot + Role column) by scanning first 4 rows ---
            const KNOWN_ROLE_HEADER_HINTS = [
              "squad roles",
              "role",
              "chalk 1 fireteam 1",
              "chalk 2 fireteam 1",
              "chalk 3 fireteam 1",
              "chalk 4 fireteam 1",
              "broadsword",
              "wyvern",
              "caladrius",
              "ifrit",
              "chalk actual",
            ];

            let slotHeaderRowIndex = -1;
            let slotCol = -1;
            let roleCol = -1;

            for (let i = 0; i < 4; i++) {
              const r = rows[i] || [];
              const sl = findCol(r, ["Squad Slots", "Slot"]);
              if (sl === -1) continue;

              let rc = findCol(r, ["Squad Roles", "Role"]);

              if (rc === -1) {
                rc = r.findIndex((c) => {
                  const n = this.normalize(c);
                  if (!n) return false;
                  if (n.includes("fireteam")) return true;
                  return KNOWN_ROLE_HEADER_HINTS.includes(n);
                });
              }

              if (sl !== -1 && rc !== -1) {
                slotHeaderRowIndex = i;
                slotCol = sl;
                roleCol = rc;
                break;
              }
            }

            const slottingAvailable = slotHeaderRowIndex !== -1 && slotCol !== -1 && roleCol !== -1;

            console.log("RefData membership header row:", membershipHeaderRowIndex, { memberCol, squadCol });
            console.log("RefData slotting:", slottingAvailable ? { slotHeaderRowIndex, slotCol, roleCol } : "NOT FOUND");

            // --- member matching helper (label -> member) ---
            const findMemberByLabel = (label) => {
              const labelNorm = this.normalize(label);
              if (!labelNorm) return null;

              let m = this.members.find((mem) => labelNorm.includes(this.normalize(mem.name)));
              if (m) return m;

              const parts = labelNorm.split(" ");
              const surname = parts[parts.length - 1] || "";
              const initialMatch = labelNorm.match(/\b([a-z])\./i);
              const initial = initialMatch ? initialMatch[1].toLowerCase() : "";

              m =
                this.members.find((mem) => {
                  const n = this.normalize(mem.name);
                  const np = n.split(" ");
                  const memSurname = np[np.length - 1] || "";
                  const memInitial = (np[0] || "").charAt(0);
                  if (!surname || memSurname !== surname) return false;
                  if (initial && memInitial !== initial) return false;
                  return true;
                }) || null;

              return m;
            };

            /* ==========================================================
             * A) MEMBERSHIP (Squad Member / Squads)
             * ========================================================== */
            const membershipRows = rows
              .slice(membershipHeaderRowIndex + 1)
              .map((r) => {
                const label = String(r[memberCol] || "").trim();
                const squad = String(r[squadCol] || "").trim();
                if (!label || !squad) return null;
                return { label, squad };
              })
              .filter(Boolean);

            membershipRows.forEach(({ label, squad }) => {
              const mem = findMemberByLabel(label);
              if (!mem) return;
              if (!mem.squad) mem.squad = squad;
            });

            /* ==========================================================
             * B) SLOTTING (Slot + Role column)
             * ========================================================== */
            const slotEntries = [];

            const parseHeading = (txt) => {
              const raw = String(txt || "").trim();
              if (!raw) return null;

              const ft = raw.match(/^(.*?)(?:\s+)?fireteam\s*(\d+)\s*$/i);
              if (ft) {
                return { squad: ft[1].trim(), fireteam: `Fireteam ${ft[2].trim()}` };
              }

              const n = this.normalize(raw);
              const singles = [
                "broadsword",
                "broadsword command",
                "ifrit",
                "wyvern",
                "wyvern air wing",
                "caladrius",
                "chalk actual",
              ];
              if (singles.includes(n)) {
                return { squad: raw.trim(), fireteam: "Element" };
              }

              return null;
            };

            if (slottingAvailable) {
              let currentSquad = "";
              let currentFireteam = "Element";

              for (let i = slotHeaderRowIndex + 1; i < rows.length; i++) {
                const r = rows[i] || [];
                const slotTxt = String(r[slotCol] || "").trim();
                const roleTxt = String(r[roleCol] || "").trim();

                const heading = parseHeading(roleTxt);
                if (heading) {
                  currentSquad = heading.squad;
                  currentFireteam = heading.fireteam || "Element";
                  continue;
                }

                if (!currentSquad || !roleTxt) continue;

                const slotNorm = this.normalize(slotTxt);

                if (slotNorm === "vacant" || slotNorm === "closed") {
                  slotEntries.push({
                    squad: currentSquad,
                    fireteam: currentFireteam,
                    role: roleTxt,
                    status: slotNorm.toUpperCase(),
                    member: null,
                  });
                  continue;
                }

                const mem = slotTxt ? findMemberByLabel(slotTxt) : null;
                if (!mem) continue;

                mem.squad = currentSquad;
                mem.fireteam = currentFireteam;
                mem.slot = roleTxt;

                slotEntries.push({
                  squad: currentSquad,
                  fireteam: currentFireteam,
                  role: roleTxt,
                  status: "FILLED",
                  member: mem,
                });
              }
            }

            console.log("Parsed slot entries:", slotEntries.length);

            /* ==========================================================
             * C) BUILD ORBAT (always include all squads)
             * ========================================================== */
            const ALWAYS_SQUADS = [
              "Chalk Actual",
              "Chalk 1",
              "Chalk 2",
              "Chalk 3",
              "Chalk 4",
              "Broadsword Command",
              "Wyvern",
              "Caladrius",
              "Fillers",
              "Recruit",
              "Reserves",
            ];

            const orbatMap = {};
            ALWAYS_SQUADS.forEach((s) => {
              orbatMap[s] = { squad: s, members: [], fireteams: {} };
            });

            this.members.forEach((m) => {
              if (!m.squad) return;

              if (!orbatMap[m.squad]) {
                orbatMap[m.squad] = { squad: m.squad, members: [], fireteams: {} };
              }

              orbatMap[m.squad].members.push(m);

              const ft = (m.fireteam || "").trim();
              const role = (m.slot || "").trim();
              if (ft && role) {
                orbatMap[m.squad].fireteams[ft] ??= { name: ft, slots: [] };
                const exists = orbatMap[m.squad].fireteams[ft].slots.some(
                  (s) => s.status === "FILLED" && s.member?.id && s.member.id === m.id && s.role === role
                );
                if (!exists) {
                  orbatMap[m.squad].fireteams[ft].slots.push({ role, status: "FILLED", member: m });
                }
              }
            });

            slotEntries.forEach((e) => {
              if (!orbatMap[e.squad]) {
                orbatMap[e.squad] = { squad: e.squad, members: [], fireteams: {} };
              }
              const ftName = e.fireteam || "Element";
              orbatMap[e.squad].fireteams[ftName] ??= { name: ftName, slots: [] };

              if (e.status === "FILLED" && e.member?.id) {
                const exists = orbatMap[e.squad].fireteams[ftName].slots.some(
                  (s) => s.status === "FILLED" && s.member?.id === e.member.id && s.role === e.role
                );
                if (exists) return;
              }

              orbatMap[e.squad].fireteams[ftName].slots.push({
                role: e.role,
                status: e.status,
                member: e.member,
              });
            });

            this.orbat = Object.values(orbatMap).map((s) => ({
              squad: s.squad,
              members: (s.members || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")),
              fireteams: Object.values(s.fireteams || {}).map((ft) => ({
                name: ft.name,
                slots: (ft.slots || []).slice(),
              })),
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
  overflow: hidden !important;
}
</style>
