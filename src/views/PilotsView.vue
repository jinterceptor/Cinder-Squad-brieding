<script>
import Papa from "papaparse";

export default {
  name: "PilotsView",
  props: {
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
  },

  data() {
    return {
      activeSquad: null,

      // OPS DATA
      opsEntries: [],        // [{ labelRaw, ops }]
      opsById: {},           // { memberId: ops }
      opsLoaded: false,

      certLabels: [
        "Rifleman","Machine Gunner","Anti Tank","Corpsmen","Combat Engineer",
        "Marksman","Breacher","Grenadier","Pilot","RTO","PJ","NCO","Officer",
      ],

      loadouts: {},

      loadoutOptions: {
        grenadier: { label: "Grenadier", points: 2, explosive: true },
        antitank: { label: "Anti-Tank", points: 3, explosive: true },
        m247: { label: "M247 SAW", points: 3 },
        m247_50: { label: "M247 .50", points: 5 },
        engineer: { label: "Combat Engineer", points: 2 },
        marksman: { label: "Marksman", points: 2 },
      },
    };
  },

  mounted() {
    this.loadOpsCSV();
  },

  watch: {
    members() {
      this.rebuildOpsMap();
    },
  },

  methods: {
    /* ===============================================================
     * OPS CSV LOAD
     * =============================================================== */
    async loadOpsCSV() {
      const opsUrl =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=1413636180&single=true&output=csv";

      Papa.parse(opsUrl, {
        download: true,
        skipEmptyLines: true,
        header: false,
        complete: (results) => {
          const rows = results.data || [];
          const body = rows.slice(1); // skip header row

          this.opsEntries = body
            .map((r) => {
              const labelRaw = String(r?.[0] ?? "").trim(); // Column A
              const ops = Number.parseInt(r?.[2], 10);      // Column C
              if (!labelRaw || !Number.isFinite(ops)) return null;
              return { labelRaw, ops };
            })
            .filter(Boolean);

          this.opsLoaded = true;
          this.rebuildOpsMap();
        },
      });
    },

    /* ===============================================================
     * NAME MATCHING (Initial + Surname)
     * =============================================================== */
    normalize(str) {
      return String(str || "")
        .replace(/["“”]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    },

    stripNoise(str) {
      return this.normalize(str)
        .replace(/\b(rct|pvt|pfc|spc|spc2|spc3|spc4|lcpl|cpl|sgt|ssgt|gysgt|wo|cwo2|cwo3|cwo4|cwo5|2ndlt|1stlt|capt|maj|ha|hn|hm3|hm2|hm1|hmc)\b/g, "")
        .replace(/\b\d+\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    },

    extractInitialSurname(raw) {
      const cleaned = this.stripNoise(raw).replace(/\b([a-z])\./i, "$1. ");
      const m = cleaned.match(/\b([a-z])\.\s*(.+)$/i);
      if (!m) return null;
      const initial = m[1].toLowerCase();
      const parts = m[2].split(" ").filter(Boolean);
      const surname = parts[parts.length - 1].toLowerCase();
      return { initial, surname };
    },

    memberNameParts(name) {
      const n = this.stripNoise(name);
      const parts = n.split(" ").filter(Boolean);
      if (!parts.length) return null;
      return {
        initial: parts[0][0].toLowerCase(),
        surname: parts[parts.length - 1].toLowerCase(),
      };
    },

    rebuildOpsMap() {
      if (!this.opsLoaded) return;
      const map = {};

      this.members.forEach((m) => {
        const mem = this.memberNameParts(m.name);
        if (!mem) return;

        const hit = this.opsEntries.find((e) => {
          const op = this.extractInitialSurname(e.labelRaw);
          return op && op.initial === mem.initial && op.surname === mem.surname;
        });

        if (hit) map[m.id] = hit.ops;
      });

      this.opsById = map;
    },

    opsAttended(member) {
      return Number.isFinite(this.opsById[member?.id])
        ? this.opsById[member.id]
        : null;
    },

    /* ===============================================================
     * PROMOTION LOGIC
     * =============================================================== */
    promoTrack(rank) {
      const r = String(rank || "").toUpperCase();

      const tracks = [
        [
          ["PVT",2],["PFC",10],["SPC",20],["SPC2",30],["SPC3",40],["SPC4",50]
        ],
        [
          ["HA",2],["HN",10],["HM3",20],["HM2",30]
        ],
        [
          ["CWO2",10],["CWO3",20],["CWO4",30]
        ]
      ];

      for (const t of tracks) {
        const i = t.findIndex(x => x[0] === r);
        if (i !== -1) return { current: t[i], next: t[i+1] || null };
      }
      return null;
    },

    opsToNextPromotion(member) {
      const ops = this.opsAttended(member);
      if (!Number.isFinite(ops)) return { nextRank: null, remaining: null };

      const track = this.promoTrack(member.rank);
      if (!track || !track.next) return { nextRank: null, remaining: 0 };

      return {
        nextRank: track.next[0],
        remaining: Math.max(0, track.next[1] - ops),
      };
    },

    /* ===============================================================
     * EXISTING HELPERS (UNCHANGED)
     * =============================================================== */
    openSquad(sq) { this.activeSquad = sq; },
    closeSquad() { this.activeSquad = null; },

    squadInitials(name) {
      return name.split(" ").map(w => w[0]).join("").toUpperCase();
    },

    squadDescriptor(name) {
      const n = name.toLowerCase();
      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("air") || n.includes("wyvern")) return "AVIATION SUPPORT";
      if (n.includes("command")) return "COMMAND ELEMENT";
      return "UNSC ELEMENT";
    },

    hasCert(member, idx) {
      return member?.certifications?.[idx] === "Y";
    },

    getLoadout(member) {
      if (!this.loadouts[member.id])
        this.loadouts[member.id] = { primary: "", disposable: false };
      return this.loadouts[member.id];
    },

    toggleDisposable(member) {
      const l = this.getLoadout(member);
      this.loadouts[member.id] = { ...l, disposable: !l.disposable };
    },

    setPrimary(member, value) {
      const l = this.getLoadout(member);
      this.loadouts[member.id] = { ...l, primary: value };
    },

    loadoutLabel(key) {
      return this.loadoutOptions[key]?.label || key;
    },

    availableLoadouts(member) {
      const has = (c) => this.hasCert(member, this.certLabels.indexOf(c));
      const o = [];
      if (has("Grenadier")) o.push("grenadier");
      if (has("Anti Tank")) o.push("antitank");
      if (has("Machine Gunner")) o.push("m247","m247_50");
      if (has("Combat Engineer")) o.push("engineer");
      if (has("Marksman")) o.push("marksman");
      return o;
    },
  },
};
</script>
