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
    /* ---------- Attendance merge (ID + robust name variants + alias) ---------- */
    attendanceMap() {
      const map = Object.create(null);

      const addVariants = (cleanUpper, ops) => {
        if (!cleanUpper) return;
        const isKey = this.initialSurnameKey(cleanUpper);
        const lnKey = this.lastNameKey(cleanUpper);
        map[`NM:${cleanUpper}`] = ops;
        const rankless = this.stripRank(cleanUpper);
        map[`NR:${rankless}`] = ops;
        if (isKey) map[`IS:${isKey}`] = ops;
        if (lnKey) map[`LN:${lnKey}`] = ops;

        // collapse Initial + Nickname + Surname → Initial + Surname
        const collapsed = this.collapseInitialNicknameSurname(rankless);
        if (collapsed && collapsed !== rankless) {
          const cis = this.initialSurnameKey(collapsed);
          const cln = this.lastNameKey(collapsed);
          map[`NR:${collapsed}`] = ops;
          if (cis) map[`IS:${cis}`] = ops;
          if (cln) map[`LN:${cln}`] = ops;
        }

        // explicit aliases
        const alias = this.aliasCanonical(rankless);
        if (alias) {
          const ais = this.initialSurnameKey(alias);
          const aln = this.lastNameKey(alias);
          map[`AL:${alias}`] = ops;
          if (ais) map[`IS:${ais}`] = ops;
          if (aln) map[`LN:${aln}`] = ops;
        }
      };

      (this.members || []).forEach(m => {
        const ops = this.parseOps(m.opsAttended);
        if (ops === null) return;
        if (m.id) map[`ID:${m.id}`] = ops;
        const clean = this.nameKey(m.name);
        addVariants(clean, ops);
      });

      (this.attendance || []).forEach(row => {
        const ops = this.parseOps(row?.ops ?? row?.attended ?? row?.value ?? row?.C);
        if (ops === null) return;
        if (row?.id) map[`ID:${row.id}`] = ops;
        const name = row?.name ?? row?.A;
        const clean = this.nameKey(name);
        addVariants(clean, ops);
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

            if (a.status !== "FILLED" || b.status !== "FILLED") {
              return collator.compare(String(a.role || ""), String(b.role || ""));
            }

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
    /* ===== Parsing & normalization ===== */
    parseOps(v) {
      if (v === null || v === undefined) return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      const s = String(v).trim();
      if (s === "") return null;
      const m = s.match(/-?\d+/); // first integer
      if (!m) return null;
      const n = parseInt(m[0], 10);
      return Number.isFinite(n) ? n : null;
    },
    stripRank(uppercased) {
      const rankPattern = /^(RCT|PVT|PFC|SPC(?:2|3|4)?|LCPL|CPL|SGT|SSGT|GYSGT|WO|CWO[2-5]|[12](?:ND|ST)LT|CAPT|MAJ|HR|HA|HN|HM[123]|HMC)\b[.\s,:-]*/i;
      let s = uppercased;
      while (rankPattern.test(s)) s = s.replace(rankPattern, "");
      return s.trim();
    },
    baseClean(name) {
      return String(name || "")
        .replace(/[“”„‟]/g, '"').replace(/[’‘]/g, "'")
        .replace(/["']/g, "")    // drop quote chars but KEEP words
        .replace(/\./g, "")      // T. -> T
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    },
    nameKey(name) { return this.baseClean(name); },

    /* Collapse “T THY TYRSSON” → “T TYRSSON” when first token is 1 char and we have >=3 tokens. */
    collapseInitialNicknameSurname(cleanUpper) {
      if (!cleanUpper) return "";
      const toks = cleanUpper.split(" ").filter(Boolean);
      if (toks.length >= 3 && toks[0].length === 1) {
        // keep first and last only
        return `${toks[0]} ${toks[toks.length - 1]}`;
      }
      return cleanUpper;
    },

    /* Explicit alias map (uppercased, rankless). Add more if needed. */
    aliasCanonical(ranklessUpper) {
      if (!ranklessUpper) return null;
      const map = {
        "T THY TYRSSON": "T TYRSSON",
        "J KONG JAGRO": "J JAGRO",
      };
      return map[ranklessUpper] || null;
    },

    initialSurnameKey(cleanedUpperName) {
      if (!cleanedUpperName) return "";
      const SUFFIX = new Set(["JR","SR","III","IV","V"]);
      const toks = cleanedUpperName.split(" ").filter(Boolean);
      if (!toks.length) return "";
      let last = toks[toks.length - 1];
      if (SUFFIX.has(last) && toks.length >= 2) last = toks[toks.length - 2];
      const first = toks[0] || "";
      if (!first || !last) return "";
      return `${first[0]} ${last}`.trim();
    },
    lastNameKey(cleanedUpperName) {
      if (!cleanedUpperName) return "";
      const SUFFIX = new Set(["JR","SR","III","IV","V"]);
      const toks = cleanedUpperName.split(" ").filter(Boolean);
      if (!toks.length) return "";
      let last = toks[toks.length - 1];
      if (SUFFIX.has(last) && toks.length >= 2) last = toks[toks.length - 2];
      return last || "";
    },

    /* ===== Attendance lookup ===== */
    getOps(member) {
      // 1) ID
      if (member?.id && this.attendanceMap[`ID:${member.id}`] !== undefined) {
        return this.attendanceMap[`ID:${member.id}`];
      }
      // 2) Names: try alias/collapse first
      if (member?.name) {
        const raw = this.nameKey(member.name);        // includes rank
        const rankless = this.stripRank(raw);

        const collapsed = this.collapseInitialNicknameSurname(rankless);
        const alias = this.aliasCanonical(rankless);

        const tries = [
          alias && `AL:${alias}`,
          // direct rankless/raw
          `NR:${rankless}`, `NM:${raw}`,
          // initial+surname, last-name
          `IS:${this.initialSurnameKey(rankless)}`, `LN:${this.lastNameKey(rankless)}`,
          `IS:${this.initialSurnameKey(raw)}`,      `LN:${this.lastNameKey(raw)}`,
          // collapsed
          collapsed && `NR:${collapsed}`,
          collapsed && `IS:${this.initialSurnameKey(collapsed)}`,
          collapsed && `LN:${this.lastNameKey(collapsed)}`,
        ].filter(Boolean);

        for (const k of tries) {
          if (k.endsWith(":")) continue;
          if (this.attendanceMap[k] !== undefined) return this.attendanceMap[k];
        }
      }
      // 3) Fallback
      const direct = this.parseOps(member?.opsAttended);
      return direct !== null ? direct : null;
    },

    /* ===== Promotions (unchanged rules) ===== */
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
      return parts.map((p, i) => (i === parts.length - 1 && /\d+/.test(p) ? p : p[0]))
                  .join("").toUpperCase();
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
/* Layout */
.section-container { height: 100vh; overflow-y: auto; padding: 2.5rem 3rem; color: #dce6f1; font-family: "Consolas","Courier New",monospace; width: 100% !important; max-width: 2200px; margin: 0 auto; box-sizing: border-box; }
.section-content_container { width: 100% !important; }
.orbat-wrapper { width: 100%; margin-top: 0.75rem; padding-bottom: 4rem; }
.hierarchy-container { width: 100%; margin-top: 2rem; }
.orbat-row { margin-bottom: 3rem; }
.center-row { display: flex; justify-content: center; }
.squad-row.single { display: flex; justify-content: center; }
.squad-row.three { display: grid; grid-template-columns: repeat(3, minmax(280px, 1fr)); gap: 2.5rem; }
@media (max-width: 1400px) { .squad-row.three { grid-template-columns: repeat(2, minmax(260px, 1fr)); } }
@media (max-width: 900px) { .squad-row.three { grid-template-columns: 1fr; } }

/* Connector lines */
@media (min-width: 900px) {
  .actual-row { position: relative; }
  .actual-row::after { content: ""; position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%); width: 3px; height: 24px; background: rgba(30, 144, 255, 0.6); border-radius: 2px; pointer-events: none; }
  .chalk-row { position: relative; margin-top: 2.5rem; padding-top: 1.5rem; }
  .chalk-row::before { content: ""; position: absolute; top: 0; left: 8%; right: 8%; height: 3px; background: rgba(30,144,255,0.6); border-radius: 2px; pointer-events: none; }
}

/* Squad tiles */
.squad-card { background: radial-gradient(circle at top left, rgba(30,144,255,0.25), transparent 65%), rgba(0,10,30,0.9); border: 2px solid rgba(30,144,255,0.85); border-radius: 0.8rem; box-shadow: 0 0 20px rgba(0,0,0,0.8); cursor: pointer; min-height: 210px; padding-right: 1.5rem; transition: 0.15s ease-in-out; }
.squad-card:hover { transform: translateY(-2px); border-color: #5ab3ff; }
.squad-header { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 1.4rem 2rem; }
.squad-insignia { width: 95px; height: 95px; border-radius: 0.6rem; border: 4px solid #1e90ff; display: flex; align-items: center; justify-content: center; margin-right: 1.6rem; font-size: 2rem; font-weight: bold; color: #1e90ff; background: rgba(0,0,0,0.7); text-align: center; }
.squad-meta h2 { margin: 0; font-size: 2.3rem; color: #e0f0ff; letter-spacing: 0.05em; }
.squad-subtitle { margin: 0.2rem 0 0; font-size: 1.1rem; color: #9ec5e6; text-transform: uppercase; }
.squad-count { margin: 0.4rem 0 0; font-size: 1rem; color: #7aa7c7; }

/* Modal shell */
.squad-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.squad-modal { background-color: #050811; color: #dce6f1; width: 92vw; max-width: 1700px; max-height: 90vh; border-radius: 0.8rem; box-shadow: 0 0 24px rgba(0,0,0,0.9); padding: 1.5rem 2rem 2rem; display: flex; flex-direction: column; }
.squad-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
.squad-close { background: transparent; border: 1px solid rgba(220,230,241,0.4); color: #dce6f1; border-radius: 999px; padding: 0.2rem 0.75rem; font-size: 1rem; cursor: pointer; }

/* Meta */
.squad-modal-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; border-bottom: 1px solid rgba(30,144,255,0.6); padding-bottom: 0.5rem; }
.squad-modal-meta.invalid { border-bottom-color: rgba(255,190,80,0.9); }
.loadout-status { margin-top: 0.35rem; display: flex; gap: 0.75rem; align-items: center; font-size: 0.85rem; text-transform: uppercase; }
.loadout-status .points { color: #9ec5e6; }
.loadout-status .warn { color: rgba(255,190,80,0.95); }
.loadout-status .ok { color: rgba(120,255,170,0.9); }

/* Scroll + Fireteam blocks */
.squad-modal-scroll { overflow: auto; padding-right: .4rem; margin-top: .8rem; max-height: calc(90vh - 200px); }
.fireteam-block { margin-bottom: 1.2rem; }
.fireteam-header { position: sticky; top: 0; display: flex; justify-content: space-between; align-items: baseline; padding: .35rem .25rem; background: linear-gradient(to bottom, rgba(5,8,17,.92), rgba(5,8,17,.75)); z-index: 1; border-top: 1px solid rgba(30,144,255,.35); border-bottom: 1px solid rgba(30,144,255,.15); }
.fireteam-title { font-weight: 700; letter-spacing: .06em; color: #e0f0ff; }
.fireteam-count { color: #9ec5e6; font-size: .9rem; }
.fireteam-divider { height: 1px; background: rgba(30,144,255,.28); margin: .9rem 0 1.2rem; }

/* Cards grid */
.squad-members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: .85rem; }

/* Cards */
.member-card { background: rgba(0, 10, 30, 0.95); border-radius: 0.4rem; border-left: 4px solid #1e90ff; box-shadow: 0 0 10px rgba(0,0,0,0.6); padding: 0.9rem 1.1rem; display: flex; flex-direction: column; }
.member-card.vacant, .member-card.closed { opacity: 0.9; border-left-color: rgba(30,144,255,0.35); }

/* Header */
.member-header { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .9rem; }
.member-header h3 { margin: 0; font-size: 1.1rem; color: #e0f0ff; word-break: break-word; }
.rank-line { margin: 0.15rem 0 0; font-size: 0.88rem; color: #9ec5e6; display: flex; gap: .6rem; flex-wrap: wrap; }
.member-rank-insignia-wrapper { width: 46px; height: 46px; display: grid; place-items: center; }
.member-rank-insignia { max-width: 46px; max-height: 46px; object-fit: contain; }

/* Body */
.member-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-top: 0.6rem; font-size: 0.9rem; }
.member-column p { margin: 0.18rem 0; }

/* Ops / promo */
.ops-promo { margin-top: 0.45rem; padding: 0.45rem 0.55rem; border: 1px dashed rgba(30,144,255,0.45); border-radius: 0.35rem; background: rgba(0,10,30,0.35); }
.ops-promo.imminent { border-color: rgba(120,255,170,0.85); background: rgba(0,50,20,0.35); color: rgba(120,255,170,0.95); box-shadow: 0 0 10px rgba(120,255,170,0.15) inset; }

/* Loadout controls */
.loadout-row { margin-top: 0.4rem; }
.disposable { user-select: none; }
.primary-label { display: block; margin-bottom: .15rem; font-size: .85rem; color: #9ec5e6; }
.loadout-select { width: 100%; background: #040a14; border: 1px solid rgba(30,144,255,.45); color: #dce6f1; border-radius: .3rem; padding: .25rem .35rem; }

/* Certs */
.cert-list { display: grid; grid-template-columns: 20px 1fr; row-gap: .28rem; }
.cert-row { display: contents; }
.cert-checkbox { width: 16px; height: 16px; border: 1px solid rgba(30,144,255,.6); border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; margin-right: 6px; }
.cert-checkbox.checked { border-color: rgba(120,255,170,.9); box-shadow: 0 0 6px rgba(120,255,170,.25) inset; }
.checkbox-dot { width: 10px; height: 10px; background: rgba(120,255,170,.95); border-radius: 2px; display: block; }
.cert-label { color: #dce6f1; }
.cert-none { font-size: .85rem; opacity: .75; }

/* Footer */
.member-footer { margin-top: 0.6rem; font-size: 0.75rem; color: #7aa7c7; display: flex; justify-content: space-between; }

/* Safety belt */
:deep(.squad-modal img) { max-width: 100%; height: auto; }
</style>
