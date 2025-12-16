<!-- src/views/PilotsView.vue -->
<template>
  <!-- unchanged template from your current working version -->
  <!-- ...SNIP... (keep your existing template exactly as it is) -->
</template>

<script>
export default {
  name: "PilotsView",
  props: {
    members: { type: Array, default: () => [] },
    orbat:   { type: Array, default: () => [] },
    attendance: { type: Array, default: () => [] },
  },
  data() {
    return {
      activeSquad: null,
      certLabels: [
        "Rifleman","Machine Gunner","Anti Tank","Corpsmen","Combat Engineer",
        "Marksman","Breacher","Grenadier","Pilot","RTO","PJ","NCO","Officer",
      ],
      loadouts: {},
      loadoutOptions: {
        grenadier: { label: "Grenadier", points: 2, explosive: true },
        antitank:  { label: "Anti-Tank", points: 3, explosive: true },
        m247:      { label: "M247 SAW", points: 3 },
        m247_50:   { label: "M247 .50", points: 5 },
        engineer:  { label: "Combat Engineer", points: 2 },
        marksman:  { label: "Marksman", points: 2 },
      },
    };
  },
  computed: {
    /* ---------- Attendance merge (ID + normalized name) ---------- */
    attendanceMap() {
      const map = Object.create(null);

      // Helper to index multiple keys for a name/ops pair
      const addByName = (name, ops) => {
        if (!name) return;
        const raw = this.nameKey(name);              // raw normalized
        const rankless = this.nameKeyNoRank(name);   // normalized without leading rank
        if (raw)      map[`NM:${raw}`] = ops;
        if (rankless) map[`NR:${rankless}`] = ops;
      };

      // From members prop (preferred)
      (this.members || []).forEach((m) => {
        const ops = Number(m.opsAttended);
        if (!Number.isFinite(ops)) return;
        if (m.id)   map[`ID:${m.id}`] = ops;
        addByName(m.name, ops);
      });

      // From optional attendance prop
      (this.attendance || []).forEach((row) => {
        const ops = Number(row?.ops ?? row?.attended ?? row?.value);
        if (!Number.isFinite(ops)) return;
        if (row?.id) map[`ID:${row.id}`] = ops;
        addByName(row?.name, ops);
      });

      return map;
    },

    /* ---------- ORBAT groupings ---------- */
    hierarchy() {
      const groups = { broadswordCommand: null, chalkActual: null, chalks: [], support: [], other: [] };
      (this.orbat || []).forEach((sq) => {
        const n = String(sq.squad || "").trim().toLowerCase();
        if (n === "broadsword command") groups.broadswordCommand = sq;
        else if (n === "chalk actual") groups.chalkActual = sq;
        else if (["chalk 1","chalk 2","chalk 3","chalk 4"].includes(n)) groups.chalks.push(sq);
        else if (["broadsword","wyvern","wyvern air wing","caladrius","ifrit"].includes(n)) groups.support.push(sq;
        else groups.other.push(sq);
      });
      groups.chalks.sort((a,b)=>a.squad.localeCompare(b.squad, undefined, {numeric:true}));
      groups.support.sort((a,b)=>a.squad.localeCompare(b.squad));
      groups.other.sort((a,b)=>a.squad.localeCompare(b.squad));
      return groups;
    },

    /* ---------- Active squad fireteams (unchanged) ---------- */
    activeFireteams() {
      if (!this.activeSquad) return [];
      if (this.activeSquad.fireteams && this.activeSquad.fireteams.length) {
        const sorted = this.activeSquad.fireteams.slice().map((ft) => ({
          name: ft.name || "Element",
          slots: (ft.slots || []).slice(),
        }));
        const orderKey = (n) => {
          const t = String(n || "").toLowerCase();
          if (t === "fireteam 1") return 0;
          if (t === "fireteam 2") return 1;
          if (t === "fireteam 3") return 2;
          if (t === "fireteam 4") return 3;
          if (t === "element") return 90;
          return 50;
        };
        sorted.sort((a,b)=>{
          const ka = orderKey(a.name), kb = orderKey(b.name);
          if (ka !== kb) return ka - kb;
          return String(a.name).localeCompare(String(b.name), undefined, {numeric:true});
        });

        const rankOrder = [
          "MAJ","CAPT","1STLT","2NDLT",
          "CWO5","CWO4","CWO3","CWO2","WO",
          "GYSGT","SSGT","SGT","CPL","LCPL",
          "SPC4","SPC3","SPC2","SPC","PFC","PVT","RCT",
          "HMC","HM1","HM2","HM3","HN","HA","HR",
        ];
        const normalizeRank = (r) => String(r || "").trim().toUpperCase().replace(/\s+/g, "");
        const rankScore = (r) => { const rr = normalizeRank(r); const idx = rankOrder.indexOf(rr); return idx === -1 ? 999 : idx; };
        const statusScore = (s) => { const st = String(s || "").toUpperCase(); if (st === "FILLED") return 0; if (st === "VACANT") return 1; if (st === "CLOSED") return 2; return 3; };
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

        sorted.forEach((ft) => {
          ft.slots = (ft.slots || []).slice().sort((a, b) => {
            const as = statusScore(a.status), bs = statusScore(b.status);
            if (as !== bs) return as - bs;
            if (a.status !== "FILLED" || b.status !== "FILLED") return collator.compare(String(a.role || ""), String(b.role || ""));
            const ar = rankScore(a.member?.rank), br = rankScore(b.member?.rank);
            if (ar !== br) return ar - br;
            return collator.compare(String(a.member?.name || ""), String(b.member?.name || ""));
          });
        });
        return sorted.filter((ft) => ft.slots && ft.slots.length);
      }

      const map = {};
      (this.activeSquad.members || []).forEach((m) => {
        const ft = (m.fireteam || "Element").trim() || "Element";
        if (!map[ft]) map[ft] = [];
        map[ft].push({ status: "FILLED", role: m.slot || "Unassigned", member: m });
      });
      return Object.entries(map).map(([name, slots]) => ({ name, slots }));
    },

    /* ---------- Squad points validity (unchanged) ---------- */
    squadLoadoutStatus() {
      if (!this.activeSquad) return { valid: true, points: 0, errors: [] };
      let points = 0; const errors = []; const explosiveTaken = new Set();
      this.activeFireteams.forEach((ft) => (ft.slots || []).forEach((slot) => {
        const member = slot.member; if (!member) return;
        const l = this.getLoadout(member);
        if (l.disposable) { points += 1; if (explosiveTaken.has("disposable")) errors.push("Duplicate explosive weapon: Disposable"); explosiveTaken.add("disposable"); }
        if (l.primary) { const def = this.loadoutOptions[l.primary]; if (def) { points += def.points; if (def.explosive) { if (explosiveTaken.has(l.primary)) errors.push(`Duplicate explosive weapon: ${def.label}`); explosiveTaken.add(l.primary); } } }
      }));
      if (points > 10) errors.push("Exceeds 10 point maximum");
      return { valid: errors.length === 0, points, errors };
    },
  },
  methods: {
    /* ========== Name normalization (rank-aware) ========== */
    stripRank(uppercased) {
      // Remove one or more leading rank tokens + punctuation/spaces
      // e.g., "SGT \"T. THY\" TYRSSON" → "T. THY TYRSSON"
      const rankPattern = /^(RCT|PVT|PFC|SPC(?:2|3|4)?|LCPL|CPL|SGT|SSGT|GYSGT|WO|CWO[2-5]|[12](?:ND|ST)LT|CAPT|MAJ|HR|HA|HN|HM[123]|HMC)\b[.\s,:-]*/i;
      let s = uppercased;
      while (rankPattern.test(s)) {
        s = s.replace(rankPattern, "");
      }
      return s.trim();
    },
    baseClean(name) {
      // remove quotes/periods, collapse spaces, uppercase
      return String(name || "")
        .replace(/[“”„‟]/g, '"')   // normalize unicode quotes
        .replace(/[’‘]/g, "'")
        .replace(/["']/g, "")      // drop quotes
        .replace(/\./g, "")        // drop periods (T. -> T)
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    },
    nameKey(name) {
      // raw normalized key (keeps any leading words as-is, just cleaned)
      return this.baseClean(name);
    },
    nameKeyNoRank(name) {
      // normalized key with leading rank(s) removed
      const raw = this.baseClean(name);
      return this.stripRank(raw);
    },

    /* ========== Attendance lookup (uses both raw & rankless) ========== */
    getOps(member) {
      // ID
      if (member?.id && this.attendanceMap[`ID:${member.id}`] !== undefined) {
        return this.attendanceMap[`ID:${member.id}`];
      }
      // Name raw
      if (member?.name) {
        const raw = this.nameKey(member.name);
        const rankless = this.nameKeyNoRank(member.name);
        if (this.attendanceMap[`NM:${raw}`] !== undefined) {
          return this.attendanceMap[`NM:${raw}`];
        }
        if (this.attendanceMap[`NR:${rankless}`] !== undefined) {
          return this.attendanceMap[`NR:${rankless}`];
        }
      }
      // Fallback to member field
      const direct = Number(member?.opsAttended);
      return Number.isFinite(direct) ? direct : null;
    },

    /* ========== Promotions (unchanged from your matrix) ========== */
    rankKey(rank) { return String(rank || "").trim().toUpperCase().replace(/[.\s]/g, ""); },
    nextPromotion(member) {
      const key = this.rankKey(member?.rank);
      const alias = {
        PRIVATE: "PVT", PRIVATEFIRSTCLASS: "PFC", SPECIALIST: "SPC",
        SPECIALIST2: "SPC2", SPECIALIST3: "SPC3", SPECIALIST4: "SPC4",
        LANCECORPORAL: "LCPL", CORPORAL: "CPL", SERGEANT: "SGT",
        STAFFSERGEANT: "SSGT", GUNNYSERGEANT: "GYSGT",
        SECONDLIEUTENANT: "2NDLT", FIRSTLIEUTENANT: "1STLT", CAPTAIN: "CAPT",
        HOSPITALMANAPPRENTICE: "HA", HOSPITALMAN: "HN",
        HOSPITALCORPSMANTHIRDCLASS: "HM3",
        HOSPITALCORPSMANSECONDCLASS: "HM2",
        HOSPITALCORPSMANFIRSTCLASS: "HM1",
        CHIEFHOSPITALCORPSMAN: "HMC",
        WARRANTOFFICER: "WO",
        CHIEFWARRANTOFFICER2: "CWO2", CHIEFWARRANTOFFICER3: "CWO3",
        CHIEFWARRANTOFFICER4: "CWO4", CHIEFWARRANTOFFICER5: "CWO5",
      };
      const rk = alias[key] || key;

      const rules = {
        PVT:  { nextRank: "PFC",  nextAt: 2,  misc: null },
        PFC:  { nextRank: "SPC",  nextAt: 10, misc: null },
        SPC:  { nextRank: "SPC2", nextAt: 20, misc: null },
        SPC2: { nextRank: "SPC3", nextAt: 30, misc: null },
        SPC3: { nextRank: "SPC4", nextAt: 40, misc: "Multiple Specialist Certs; Trainer / S-Shop personnel" },
        SPC4: { nextRank: "LCpl", nextAt: null, misc: "Junior NCO, RTO; NCOs in training / New FTLs" },
        LCPL: { nextRank: "Cpl",  nextAt: null, misc: "Junior NCO, RTO; Active FTLs & FTL experience" },
        CPL:  { nextRank: "Sgt",  nextAt: null, misc: "Senior NCO, RTO; Active SLs only" },
        SGT:  { nextRank: "SSgt", nextAt: null, misc: "Senior NCO, RTO; Active SLs only & SL experience / Platoon NCOIC" },
        SSGT: { nextRank: "GySgt",nextAt: null, misc: "Senior NCO, RTO; Active Platoon NCOIC & experience" },
        GYSGT:{ nextRank: "2ndLt",nextAt: null, misc: "Officer, RTO; Support staff / Platoon lead" },
        "2NDLT": { nextRank: "1stLt", nextAt: null, misc: "Officer, RTO; Platoon lead & experience" },
        "1STLT": { nextRank: "Capt",  nextAt: null, misc: "Officer, RTO; Unit lead only" },
        CAPT:    { nextRank: null,    nextAt: null, misc: null },
        HA:  { nextRank: "HN",  nextAt: 2,  misc: "Assigned to Corpsman slot" },
        HN:  { nextRank: "HM3", nextAt: 10, misc: "Assigned to Corpsman slot" },
        HM3: { nextRank: "HM2", nextAt: 20, misc: "Assigned to Corpsman slot" },
        HM2: { nextRank: "HM1", nextAt: 30, misc: "Assigned to Corpsman slot" },
        HM1: { nextRank: "HMC", nextAt: null, misc: "Medical; Medic Trainer" },
        HMC: { nextRank: null,  nextAt: null, misc: "Medical Corps lead" },
        WO:   { nextRank: "CWO2", nextAt: 10, misc: null },
        CWO2: { nextRank: "CWO3", nextAt: 20, misc: null },
        CWO3: { nextRank: "CWO4", nextAt: 30, misc: null },
        CWO4: { nextRank: "CWO5", nextAt: null, misc: null },
        CWO5: { nextRank: null,   nextAt: null, misc: null },
      };

      return rules[rk] || { nextRank: null, nextAt: null, misc: null };
    },
    opsToNextPromotion(member) {
      const ops = this.getOps(member);
      const rule = this.nextPromotion(member);
      if (!Number.isFinite(ops)) return null;
      if (!Number.isFinite(rule.nextAt)) return null;
      return Math.max(0, rule.nextAt - ops);
    },

    /* ========== UI helpers (unchanged) ========== */
    playOrbatClick() {
      const a = this.$refs.orbatClickAudio;
      if (!a || typeof a.play !== "function") return;
      try { a.currentTime = 0; a.play().catch(() => {}); } catch {}
    },
    openSquad(sq) { this.playOrbatClick(); this.activeSquad = sq; },
    closeSquad() { this.activeSquad = null; },
    personnelCount(sq) {
      if (sq.fireteams && sq.fireteams.length) {
        let count = 0;
        sq.fireteams.forEach((ft) => (ft.slots || []).forEach((s) => { if (s.status === "FILLED" && s.member) count++; }));
        return count;
      }
      return (sq.members || []).length;
    },
    slotKey(slot, idx) { return slot.member?.id || `${slot.status}-${slot.role}-${idx}`; },
    squadInitials(name) {
      if (!name) return "UNSC";
      const parts = String(name).trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
      return parts.map((p, i) => (i === parts.length - 1 && /\d+/.test(p) ? p : p[0])).join("").toUpperCase();
    },
    squadDescriptor(name) {
      const n = String(name || "").toLowerCase();
      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("air") || n.includes("wing") || n.includes("wyvern")) return "AVIATION SUPPORT";
      if (n.includes("command") || n.includes("actual")) return "COMMAND ELEMENT";
      return "UNSC ELEMENT";
    },

    /* ========== Certs & loadouts (unchanged) ========== */
    hasCert(member, idx) {
      const certs = member?.certifications || [];
      return certs[idx] === "Y" || certs[idx] === true || certs[idx] === "1";
    },
    getLoadout(member) {
      const id = member?.id;
      if (!id) return { primary: "", disposable: false };
      if (!this.loadouts[id]) this.loadouts[id] = { primary: "", disposable: false };
      return this.loadouts[id];
    },
    toggleDisposable(member) {
      const id = member?.id; if (!id) return;
      const curr = this.getLoadout(member);
      this.loadouts[id] = { ...curr, disposable: !curr.disposable };
    },
    setPrimary(member, value) {
      const id = member?.id; if (!id) return;
      const curr = this.getLoadout(member);
      this.loadouts[id] = { ...curr, primary: value || "" };
    },
    loadoutLabel(key) { const def = this.loadoutOptions[key]; return def ? `${def.label} (${def.points}pt)` : key; },
    availableLoadouts(member) {
      const has = (label) => this.hasCert(member, this.certLabels.indexOf(label));
      const opts = [];
      if (has("Grenadier")) opts.push("grenadier");
      if (has("Anti Tank")) opts.push("antitank");
      if (has("Machine Gunner")) { opts.push("m247", "m247_50"); }
      if (has("Combat Engineer")) opts.push("engineer");
      if (has("Marksman")) opts.push("marksman");
      return opts;
    },

    /* ========== Rank insignia (unchanged) ========== */
    rankCode(rank) {
      if (!rank) return null;
      const key = rank.trim().toUpperCase();
      const map = {
        RCT: "Rct", PVT: "Pvt", PFC: "PFC", SPC: "Spc", SPC2: "Spc2", SPC3: "Spc3", SPC4: "Spc4",
        LCPL: "LCpl", CPL: "Cpl", SGT: "Sgt", SSGT: "SSgt", GYSGT: "GySgt",
        WO: "WO", CWO2: "CWO2", CWO3: "CWO3", CWO4: "CWO4", CWO5: "CWO5",
        "2NDLT": "2ndLt", "1STLT": "1stLt", CAPT: "Capt", MAJ: "Maj",
        HR: "HR", HA: "HA", HN: "HN", HM3: "HM3", HM2: "HM2", HM1: "HM1", HMC: "HMC",
      };
      return map[key] || null;
    },
    rankInsignia(rank) { const base = this.rankCode(rank); return base ? `/ranks/${base}.png` : null; },
    formatOps(v) { const n = Number(v); return Number.isFinite(n) ? n : "—"; },
  },
};
</script>

<style scoped>
/* keep your existing styles as-is */
</style>
