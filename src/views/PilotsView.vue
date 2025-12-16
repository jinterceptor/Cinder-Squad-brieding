<!-- src/views/PilotsView.vue -->
<template>
  <section id="members" class="section-container">
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward-pilot">
        <img src="/icons/license.svg" alt="Members Icon" />
        <h1>Unit ORBAT</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <div class="orbat-wrapper">
        <div v-if="!orbat || !orbat.length">Loading squads and members...</div>

        <div v-else class="hierarchy-container">
          <!-- BROADSWORD COMMAND -->
          <div v-if="hierarchy.broadswordCommand" class="orbat-row center-row actual-row">
            <div class="squad-row single">
              <div class="squad-card" @click="openSquad(hierarchy.broadswordCommand)">
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(hierarchy.broadswordCommand.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ hierarchy.broadswordCommand.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(hierarchy.broadswordCommand.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(hierarchy.broadswordCommand) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CHALK ACTUAL -->
          <div v-if="hierarchy.chalkActual" class="orbat-row center-row actual-row">
            <div class="squad-row single">
              <div class="squad-card" @click="openSquad(hierarchy.chalkActual)">
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(hierarchy.chalkActual.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ hierarchy.chalkActual.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(hierarchy.chalkActual.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(hierarchy.chalkActual) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CHALKS -->
          <div v-if="hierarchy.chalks.length" class="orbat-row chalk-row">
            <div class="squad-row three">
              <div
                v-for="sq in hierarchy.chalks"
                :key="sq.squad"
                class="squad-card"
                @click="openSquad(sq)"
              >
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(sq.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SUPPORT -->
          <div v-if="hierarchy.support.length" class="orbat-row">
            <div class="squad-row three">
              <div
                v-for="sq in hierarchy.support"
                :key="sq.squad"
                class="squad-card"
                @click="openSquad(sq)"
              >
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(sq.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- OTHER -->
          <div v-if="hierarchy.other.length" class="orbat-row">
            <div class="squad-row three">
              <div
                v-for="sq in hierarchy.other"
                :key="sq.squad"
                class="squad-card"
                @click="openSquad(sq)"
              >
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(sq.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="activeSquad" class="squad-overlay" @click.self="closeSquad">
      <div class="squad-modal">
        <div class="squad-modal-header">
          <div class="squad-header-left">
            <div class="section-header clipped-medium-backward-bio">
              <img src="/icons/license.svg" />
              <h1>SQUAD ROSTER</h1>
            </div>
            <div class="rhombus-back">&nbsp;</div>
          </div>

          <button class="squad-close" @click="closeSquad">✕</button>
        </div>

        <div class="squad-modal-meta" :class="{ invalid: !squadLoadoutStatus.valid }">
          <div class="squad-title">
            <h2>{{ activeSquad.squad }}</h2>
            <p class="subtitle">
              {{ squadDescriptor(activeSquad.squad) }} ·
              {{ personnelCount(activeSquad) }} PERSONNEL
            </p>

            <div class="loadout-status">
              <span class="points">LOADOUT: {{ squadLoadoutStatus.points }}/10 PTS</span>
              <span v-if="!squadLoadoutStatus.valid" class="warn" :title="squadLoadoutStatus.errors.join(' • ')">
                ⚠ LOADOUT INVALID
              </span>
              <span v-else class="ok">✓ VALID</span>
            </div>
          </div>

          <div class="squad-tag"><span>{{ squadInitials(activeSquad.squad) }}</span></div>
        </div>

        <div class="squad-modal-scroll">
          <div v-for="ft in activeFireteams" :key="ft.name" class="fireteam-block">
            <div class="fireteam-header">
              <span class="fireteam-title">{{ ft.name.toUpperCase() }}</span>
              <span class="fireteam-count">({{ ft.slots.length }} SLOTS)</span>
            </div>

            <div class="squad-members-grid">
              <div
                v-for="(slot, idx) in ft.slots"
                :key="slotKey(slot, idx)"
                class="member-card"
                :class="{ vacant: slot.status === 'VACANT', closed: slot.status === 'CLOSED' }"
              >
                <!-- VACANT / CLOSED -->
                <template v-if="slot.status === 'VACANT' || slot.status === 'CLOSED'">
                  <div class="member-header">
                    <div class="member-header-text">
                      <h3>{{ slot.status }}</h3>
                      <p class="rank-line">
                        <span class="rank">{{ slot.role }}</span>
                        <span class="id">UNFILLED SLOT</span>
                      </p>
                    </div>
                  </div>

                  <div class="member-body">
                    <div class="member-column left">
                      <p><strong>Squad:</strong> {{ activeSquad.squad }}</p>
                      <p><strong>Fireteam:</strong> {{ ft.name }}</p>
                      <p><strong>Role:</strong> {{ slot.role }}</p>
                    </div>
                    <div class="member-column right">
                      <p><strong>Certifications:</strong></p>
                      <span class="cert-none">N/A</span>
                    </div>
                  </div>

                  <div class="member-footer">
                    <span>SLOT STATUS: {{ slot.status }}</span>
                    <span>UNSC ORBAT</span>
                  </div>
                </template>

                <!-- FILLED -->
                <template v-else>
                  <div class="member-header">
                    <div class="member-rank-insignia-wrapper" v-if="rankInsignia(slot.member?.rank)">
                      <img
                        :src="rankInsignia(slot.member.rank)"
                        :alt="slot.member.rank + ' insignia'"
                        class="member-rank-insignia"
                      />
                    </div>

                    <div class="member-header-text">
                      <h3>{{ (slot.member?.name || 'UNKNOWN').toUpperCase() }}</h3>
                      <p class="rank-line">
                        <span class="rank">{{ slot.member?.rank || 'N/A' }}</span>
                        <span class="id">ID: {{ slot.member?.id || 'N/A' }}</span>
                      </p>
                    </div>
                  </div>

                  <div class="member-body">
                    <div class="member-column left">
                      <p><strong>Squad:</strong> {{ slot.member?.squad || activeSquad.squad }}</p>
                      <p><strong>Fireteam:</strong> {{ slot.member?.fireteam || ft.name }}</p>
                      <p><strong>Role:</strong> {{ slot.role || slot.member?.slot || 'Unassigned' }}</p>
                      <p><strong>Join Date:</strong> {{ slot.member?.joinDate || 'Unknown' }}</p>

                      <div
                        class="ops-promo"
                        :class="{ imminent: opsToNextPromotion(slot.member) === 1 || opsToNextPromotion(slot.member) === 0 }"
                      >
                        <p><strong>Ops Attended:</strong> {{ formatOps(getOps(slot.member)) }}</p>
                        <p>
                          <strong>Next Rank:</strong>
                          {{ nextPromotion(slot.member)?.nextRank || '—' }}
                          <span v-if="opsToNextPromotion(slot.member) !== null">
                            ({{ opsToNextPromotion(slot.member) }} ops)
                          </span>
                        </p>
                        <p v-if="nextPromotion(slot.member)?.misc">
                          <strong>Requirements:</strong> {{ nextPromotion(slot.member).misc }}
                        </p>
                      </div>

                      <div class="loadout-row">
                        <label class="disposable">
                          <input
                            type="checkbox"
                            :checked="getLoadout(slot.member).disposable"
                            @change="toggleDisposable(slot.member)"
                          />
                          Disposable Rocket (1pt)
                        </label>
                      </div>

                      <div class="loadout-row">
                        <label class="primary-label">Assigned Loadout</label>
                        <select
                          class="loadout-select"
                          :value="getLoadout(slot.member).primary"
                          @change="setPrimary(slot.member, $event.target.value)"
                        >
                          <option value="">None / Standard</option>
                          <option v-for="opt in availableLoadouts(slot.member)" :key="opt" :value="opt">
                            {{ loadoutLabel(opt) }}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div class="member-column right">
                      <p><strong>Certifications:</strong></p>
                      <div class="cert-list">
                        <div v-for="(label, cidx) in certLabels" :key="label" class="cert-row">
                          <span class="cert-checkbox" :class="{ checked: hasCert(slot.member, cidx) }">
                            <span v-if="hasCert(slot.member, cidx)" class="checkbox-dot"></span>
                          </span>
                          <span class="cert-label">{{ label }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="member-footer">
                    <span>BIOMETRIC RECORD VALID</span>
                    <span>UNSC SYSTEMS DATABASE</span>
                  </div>
                </template>
              </div>
            </div>

            <div class="fireteam-divider"></div>
          </div>
        </div>
      </div>
    </div>

    <audio ref="orbatClickAudio" preload="auto">
      <source src="/sound/Orbat Main Menu Click.ogg" type="audio/ogg" />
    </audio>
  </section>
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
    /* ---------- Attendance merge (ID + multiple robust name variants) ---------- */
    attendanceMap() {
      const map = Object.create(null);

      const addByName = (name, ops) => {
        if (!name) return;

        // Build **multiple** keys so Attendance “nicknames in quotes” match Members without them.
        const raw = this.nameKey(name);                 // cleaned raw
        const rankless = this.nameKeyNoRank(name);      // cleaned w/o rank
        const noQuoted = this.nameKeyNoQuoted(name);    // remove quoted nicknames first
        const noQuotedRank = this.nameKeyNoQuotedNoRank(name); // remove quoted + rank

        const isKey = (k) => k && k.length > 0;

        if (isKey(raw))            map[`NM:${raw}`] = ops;
        if (isKey(rankless))       map[`NR:${rankless}`] = ops;
        if (isKey(noQuoted))       map[`NQ:${noQuoted}`] = ops;
        if (isKey(noQuotedRank))   map[`QN:${noQuotedRank}`] = ops;

        // Initial+Surname variants (handles “T THY TYRSSON” vs “T TYRSSON” / “J KONG JAGRO” vs “J JAGRO”)
        const isRaw = this.initialSurnameKey(raw);
        const isRank = this.initialSurnameKey(rankless);
        const isNoQ = this.initialSurnameKey(noQuoted);
        const isNoQRank = this.initialSurnameKey(noQuotedRank);

        if (isKey(isRaw))        map[`IS:${isRaw}`] = ops;
        if (isKey(isRank))       map[`IS:${isRank}`] = ops;
        if (isKey(isNoQ))        map[`IS:${isNoQ}`] = ops;
        if (isKey(isNoQRank))    map[`IS:${isNoQRank}`] = ops;
      };

      (this.members || []).forEach(m => {
        const ops = Number(m.opsAttended);
        if (!Number.isFinite(ops)) return;
        if (m.id) map[`ID:${m.id}`] = ops;
        addByName(m.name, ops);
      });

      (this.attendance || []).forEach(row => {
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
        else if (["broadsword","wyvern","wyvern air wing","caladrius","ifrit"].includes(n)) groups.support.push(sq);
        else groups.other.push(sq);
      });
      groups.chalks.sort((a,b)=>a.squad.localeCompare(b.squad, undefined, {numeric:true}));
      groups.support.sort((a,b)=>a.squad.localeCompare(b.squad));
      groups.other.sort((a,b)=>a.squad.localeCompare(b.squad));
      return groups;
    },

    /* ---------- Active squad fireteams ---------- */
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

      // Fallback if no slot grid
      const map = {};
      (this.activeSquad.members || []).forEach((m) => {
        const ft = (m.fireteam || "Element").trim() || "Element";
        if (!map[ft]) map[ft] = [];
        map[ft].push({ status: "FILLED", role: m.slot || "Unassigned", member: m });
      });
      return Object.entries(map).map(([name, slots]) => ({ name, slots }));
    },

    /* ---------- Squad points validity ---------- */
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
    /* ===== Name normalization (rank/quotes/nickname-resilient) ===== */
    stripRank(uppercased) {
      const rankPattern = /^(RCT|PVT|PFC|SPC(?:2|3|4)?|LCPL|CPL|SGT|SSGT|GYSGT|WO|CWO[2-5]|[12](?:ND|ST)LT|CAPT|MAJ|HR|HA|HN|HM[123]|HMC)\b[.\s,:-]*/i;
      let s = uppercased;
      while (rankPattern.test(s)) s = s.replace(rankPattern, "");
      return s.trim();
    },
    removeQuotedSegments(str) {
      // Remove `"..."` and `'...'` nickname blocks entirely (before other cleaning)
      return String(str || "").replace(/"[^"]*"|'[^']*'/g, " ").replace(/\s+/g, " ");
    },
    baseClean(name) {
      return String(name || "")
        .replace(/[“”„‟]/g, '"').replace(/[’‘]/g, "'")
        .replace(/\./g, "")         // T. -> T
        .replace(/["']/g, "")       // drop remaining quotes
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    },
    nameKey(name) {            // cleaned raw
      return this.baseClean(name);
    },
    nameKeyNoRank(name) {      // cleaned, w/o rank prefixes
      const raw = this.baseClean(name);
      return this.stripRank(raw);
    },
    nameKeyNoQuoted(name) {    // remove quoted nicknames first, then clean
      const noQ = this.removeQuotedSegments(name);
      return this.baseClean(noQ);
    },
    nameKeyNoQuotedNoRank(name) { // remove quoted, then strip rank
      const noQ = this.removeQuotedSegments(name);
      const cleaned = this.baseClean(noQ);
      return this.stripRank(cleaned);
    },
    initialSurnameKey(cleanedUpperName) {
      if (!cleanedUpperName) return "";
      // Ignore suffixes like JR, SR, III
      const SUFFIX = new Set(["JR","SR","III","IV","V"]);
      const toks = cleanedUpperName.split(" ").filter(Boolean);
      if (toks.length === 0) return "";
      let last = toks[toks.length - 1];
      if (SUFFIX.has(last)) last = toks[toks.length - 2] || last;
      const first = toks[0] || "";
      if (!first || !last) return "";
      const init = first[0]; // initial only
      return `${init} ${last}`.trim();
    },

    /* ===== Attendance lookup (ID → multiple name variants) ===== */
    getOps(member) {
      // 1) ID
      if (member?.id && this.attendanceMap[`ID:${member.id}`] !== undefined) {
        return this.attendanceMap[`ID:${member.id}`];
      }
      // 2) Name variants
      if (member?.name) {
        const raw = this.nameKey(member.name);
        const rankless = this.nameKeyNoRank(member.name);
        const noQ = this.nameKeyNoQuoted(member.name);
        const noQrank = this.nameKeyNoQuotedNoRank(member.name);
        const isRaw = this.initialSurnameKey(raw);
        const isRank = this.initialSurnameKey(rankless);
        const isNoQ = this.initialSurnameKey(noQ);
        const isNoQrank = this.initialSurnameKey(noQrank);

        const tryKeys = [
          `NM:${raw}`, `NR:${rankless}`, `NQ:${noQ}`, `QN:${noQrank}`,
          `IS:${isRaw}`, `IS:${isRank}`, `IS:${isNoQ}`, `IS:${isNoQrank}`,
        ];
        for (const k of tryKeys) {
          if (k.endsWith(":") || k.includes("IS: ") && k.split("IS: ")[1] === "") continue;
          if (this.attendanceMap[k] !== undefined) return this.attendanceMap[k];
        }
      }
      // 3) Fallback
      const direct = Number(member?.opsAttended);
      return Number.isFinite(direct) ? direct : null;
    },

    /* ===== Promotions (your matrix) ===== */
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

    /* ===== UI utils ===== */
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
/* keep your existing styles */
.section-container { height: 100vh; overflow-y: auto; padding: 2.5rem 3rem; color: #dce6f1; font-family: "Consolas","Courier New",monospace; width: 100% !important; max-width: 2200px; margin: 0 auto; box-sizing: border-box; }
.section-content_container { width: 100% !important; }
.orbat-wrapper { width: 100%; margin-top: 0.75rem; padding-bottom: 4rem; }
.hierarchy-container { width: 100%; margin-top: 2rem; }
.orbat-row { margin-bottom: 3rem; }
.center-row { display: flex; justify-content: center; }
.squad-row.single { display: flex; justify-content: center; }
.squad-row.three { display: grid; grid-template-columns: repeat(3, minmax(280px, 1fr)); gap: 2.5rem; }
@media (max-width: 1400px) { .squad-row.three { grid-template-columns: repeat(2, minmax(260px, 1fr)); } }
@media (max-width: 900px) { .squad-row.three { grid-template-columns: 1fr; }
/* (rest of your existing styles unchanged) */
</style>
