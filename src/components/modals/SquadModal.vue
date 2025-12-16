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
          <!-- Command elements -->
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

          <div v-if="hierarchy.chalkActual" class="orbat-row center-row actual-row">
            <div class="squad-row single">
              <div class="squad-card" @click="openSquad(hierarchy.chalkActual)">
                <div class="squad-header">
                  <div class="squad-insignia"><span>{{ squadInitials(hierarchy.chalkActual.squad) }}</span></div>
                  <div class="squad-meta">
                    <h2>{{ hierarchy.chalkActual.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(hierarchy.chalkActual.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(hierarchy.chalkActual) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Main formations -->
          <div v-if="hierarchy.chalks.length" class="orbat-row chalk-row">
            <div class="squad-row three">
              <div v-for="sq in hierarchy.chalks" :key="sq.squad" class="squad-card" @click="openSquad(sq)">
                <div class="squad-header">
                  <div class="squad-insignia"><span>{{ squadInitials(sq.squad) }}</span></div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Support -->
          <div v-if="hierarchy.support.length" class="orbat-row">
            <div class="squad-row three">
              <div v-for="sq in hierarchy.support" :key="sq.squad" class="squad-card" @click="openSquad(sq)">
                <div class="squad-header">
                  <div class="squad-insignia"><span>{{ squadInitials(sq.squad) }}</span></div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Other -->
          <div v-if="hierarchy.other.length" class="orbat-row">
            <div class="squad-row three">
              <div v-for="sq in hierarchy.other" :key="sq.squad" class="squad-card" @click="openSquad(sq)">
                <div class="squad-header">
                  <div class="squad-insignia"><span>{{ squadInitials(sq.squad) }}</span></div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ personnelCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div><!-- /.hierarchy-container -->
      </div>
    </div>

    <!-- Squad modal -->
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
              <span v-if="!squadLoadoutStatus.valid" class="warn" :title="squadLoadoutStatus.errors.join(' • ')">⚠ LOADOUT INVALID</span>
              <span v-else class="ok">✓ VALID</span>
            </div>
          </div>

          <div class="squad-tag"><span>{{ squadInitials(activeSquad.squad) }}</span></div>
        </div>

        <div class="squad-modal-scroll">
          <div v-for="ft in activeFireteams" :key="ft.name" class="fireteam-block">
            <div class="fireteam-header">
              <span class="fireteam-title">{{ ft.name.toUpperCase() }}</span>
              <span class="fireteam-count">{{ ft.slots.length }} SLOTS</span>
            </div>

            <div class="squad-members-grid">
              <div
                v-for="(slot, idx) in ft.slots"
                :key="slotKey(slot, idx)"
                class="member-card"
                :class="{ vacant: slot.status === 'VACANT', closed: slot.status === 'CLOSED' }"
              >
                <!-- VACANT/CLOSED tiles -->
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

                <!-- FILLED tiles -->
                <template v-else>
                  <div class="member-header">
                    <div class="member-rank-insignia-wrapper" v-if="rankInsignia(slot.member?.rank)">
                      <img :src="rankInsignia(slot.member.rank)" :alt="slot.member.rank + ' insignia'" class="member-rank-insignia" />
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

                      <!-- Selectable certs + loadouts + disposable rocket -->
                      <div class="loadout-row">
                        <label class="disposable">
                          <input type="checkbox" :checked="getLoadout(slot.member).disposable" @change="toggleDisposable(slot.member)" />
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
              </div><!-- /.member-card -->
            </div><!-- /.squad-members-grid -->
          </div><!-- /.fireteam-block -->
        </div><!-- /.squad-modal-scroll -->
      </div><!-- /.squad-modal -->
    </div><!-- /.squad-overlay -->

    <!-- Click sound -->
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
    orbat: { type: Array, default: () => [] },
  },
  data() {
    return {
      activeSquad: null,

      // Certifications order must match your Google Sheet flags
      certLabels: [
        "Rifleman","Machine Gunner","Anti Tank","Corpsmen","Combat Engineer",
        "Marksman","Breacher","Grenadier","Pilot","RTO","PJ","NCO","Officer",
      ],

      // Persistent per-member loadout state (id → { primary, disposable })
      loadouts: {},

      // Available loadouts and point cost
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

    // Build fireteam groups for the selected squad including VACANT/CLOSED slots
    activeFireteams() {
      if (!this.activeSquad) return [];
      if (this.activeSquad.fireteams && this.activeSquad.fireteams.length) {
        const sorted = this.activeSquad.fireteams.slice().map((ft) => ({
          name: ft.name || "Element",
          slots: (ft.slots || []).slice(),
        }));

        // Order Fireteam 1..4 first, then element/others
        const orderKey = (n) => {
          const t = String(n || "").toLowerCase();
          if (t === "fireteam 1") return 0;
          if (t === "fireteam 2") return 1;
          if (t === "fireteam 3") return 2;
          if (t === "fireteam 4") return 3;
          if (t === "element") return 90;
          return 50;
        };

        // Slot sort: FILLED first (by rank, then name), then VACANT, then CLOSED
        const rankOrder = [
          "MAJ","CAPT","1STLT","2NDLT",
          "CWO5","CWO4","CWO3","CWO2","WO",
          "GYSGT","SSGT","SGT","CPL","LCPL",
          "SPC4","SPC3","SPC2","SPC","PFC","PVT","RCT",
          "HMC","HM1","HM2","HM3","HN","HA","HR",
        ];
        const normalizeRank = (r) => String(r || "").trim().toUpperCase().replace(/\s+/g, "");
        const rankScore = (r) => { const rr = normalizeRank(r); const i = rankOrder.indexOf(rr); return i === -1 ? 999 : i; };
        const statusScore = (s) => {
          const st = String(s || "").toUpperCase();
          if (st === "FILLED") return 0;
          if (st === "VACANT") return 1;
          if (st === "CLOSED") return 2;
          return 3;
        };
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

        sorted.sort((a,b)=> {
          const ka = orderKey(a.name), kb = orderKey(b.name);
          if (ka !== kb) return ka - kb;
          return String(a.name).localeCompare(String(b.name), undefined, { numeric: true });
        });

        return sorted.filter((ft) => ft.slots && ft.slots.length);
      }

      // Fallback: no slot grid, group raw members by fireteam
      const map = {};
      (this.activeSquad.members || []).forEach((m) => {
        const ft = (m.fireteam || "Element").trim() || "Element";
        if (!map[ft]) map[ft] = [];
        map[ft].push({ status: "FILLED", role: m.slot || "Unassigned", member: m });
      });
      return Object.entries(map).map(([name, slots]) => ({ name, slots }));
    },

    // Squad points / validity
    squadLoadoutStatus() {
      if (!this.activeSquad) return { valid: true, points: 0, errors: [] };
      let points = 0;
      const errors = [];
      const explosiveTaken = new Set();

      const slots = [];
      this.activeFireteams.forEach((ft) => (ft.slots || []).forEach((s) => slots.push(s)));

      slots.forEach((slot) => {
        const member = slot.member;
        if (!member) return; // VACANT/CLOSED
        const l = this.getLoadout(member);
        if (l.disposable) {
          points += 1;
          if (explosiveTaken.has("disposable")) errors.push("Duplicate explosive weapon: Disposable");
          explosiveTaken.add("disposable");
        }
        if (l.primary) {
          const def = this.loadoutOptions[l.primary];
          if (def) {
            points += def.points;
            if (def.explosive) {
              if (explosiveTaken.has(l.primary)) errors.push(`Duplicate explosive weapon: ${def.label}`);
              explosiveTaken.add(l.primary);
            }
          }
        }
      });

      if (points > 10) errors.push("Exceeds 10 point maximum");
      return { valid: errors.length === 0, points, errors };
    },
  },
  methods: {
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

    // Display helpers
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

    // Certs
    hasCert(member, idx) {
      const certs = member?.certifications || [];
      const v = certs[idx];
      return v === "Y" || v === true || v === "1";
    },

    // Loadout state
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

    // Insignia mapping (matches your assets)
    rankCode(rank) {
      if (!rank) return null;
      const key = rank.trim().toUpperCase();
      const rankMap = {
        RCT: "Rct", PVT: "Pvt", PFC: "PFC", SPC: "Spc", SPC2: "Spc2", SPC3: "Spc3", SPC4: "Spc4",
        LCPL: "LCpl", CPL: "Cpl", SGT: "Sgt", SSGT: "SSgt", GYSGT: "GySgt",
        WO: "WO", CWO2: "CWO2", CWO3: "CWO3", CWO4: "CWO4", CWO5: "CWO5",
        "2NDLT": "2ndLt", "1STLT": "1stLt", CAPT: "Capt", MAJ: "Maj",
        HR: "HR", HA: "HA", HN: "HN", HM3: "HM3", HM2: "HM2", HM1: "HM1", HMC: "HMC",
      };
      return rankMap[key] || null;
    },
    rankInsignia(rank) { const fileBase = this.rankCode(rank); return fileBase ? `/ranks/${fileBase}.png` : null; },
  },
};
</script>

<style scoped>
.section-container { height: 100vh; overflow-y: auto; padding: 2.5rem 3rem; color: #dce6f1; font-family: "Consolas","Courier New",monospace; width: 100% !important; max-width: 2200px; margin: 0 auto; box-sizing: border-box; }
.section-content-container { width: 100% !important; }
.orbat-wrapper { width: 100%; margin-top: 0.75rem; padding-bottom: 4rem; }
.hierarchy-container { width: 100%; margin-top: 2rem; }
.orbat-row { margin-bottom: 3rem; }
.center-row { display: flex; justify-content: center; }
.squad-row.single { display: flex; justify-content: center; }
.squad-row.three { display: grid; grid-template-columns: repeat(3, minmax(280px, 1fr)); gap: 2.5rem; }
@media (max-width: 1400px) { .squad-row.three { grid-template-columns: repeat(2, minmax(260px, 1fr)); } }
@media (max-width: 900px) { .squad-row.three { grid-template-columns: 1fr; } }

@media (min-width: 900px) {
  .actual-row { position: relative; }
  .actual-row::after { content: ""; position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%); width: 3px; height: 24px; background: rgba(30, 144, 255, 0.6); border-radius: 2px; pointer-events: none; }
  .chalk-row { position: relative; margin-top: 2.5rem; padding-top: 1.5rem; }
  .chalk-row::before { content: ""; position: absolute; top: 0; left: 8%; right: 8%; height: 3px; background: rgba(30,144,255,0.6); border-radius: 2px; pointer-events: none; }
}
.squad-card { background: radial-gradient(circle at top left, rgba(30,144,255,0.25), transparent 65%), rgba(0,10,30,0.9); border: 2px solid rgba(30,144,255,0.85); border-radius: 0.8rem; box-shadow: 0 0 20px rgba(0,0,0,0.8); cursor: pointer; min-height: 210px; padding-right: 1.5rem; transition: 0.15s ease-in-out; }
.squad-card:hover { transform: translateY(-2px); border-color: #5ab3ff; }
.squad-header { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 1.4rem 2rem; }
.squad-insignia { width: 95px; height: 95px; border-radius: 0.6rem; border: 4px solid #1e90ff; display: flex; align-items: center; justify-content: center; margin-right: 1.6rem; font-size: 2rem; font-weight: bold; color: #1e90ff; background: rgba(0,0,0,0.7); text-align: center; }
.squad-meta h2 { margin: 0; font-size: 2.3rem; color: #e0f0ff; letter-spacing: 0.05em; }
.squad-subtitle { margin: 0.2rem 0 0; font-size: 1.1rem; color: #9ec5e6; text-transform: uppercase; }
.squad-count { margin: 0.4rem 0 0; font-size: 1rem; color: #7aa7c7; }

.squad-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.squad-modal { background-color: #050811; color: #dce6f1; width: 92vw; max-width: 1700px; max-height: 90vh; border-radius: 0.8rem; box-shadow: 0 0 24px rgba(0,0,0,0.9); padding: 1.5rem 2rem 2rem; display: flex; flex-direction: column; }
.squad-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
.squad-close { background: transparent; border: 1px solid rgba(220,230,241,0.4); color: #dce6f1; border-radius: 999px; padding: 0.2rem 0.75rem; font-size: 1rem; cursor: pointer; }
.squad-modal-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; border-bottom: 1px solid rgba(30,144,255,0.6); padding-bottom: 0.5rem; }
.squad-modal-meta.invalid { border-bottom-color: rgba(255,190,80,0.9); }
.loadout-status { margin-top: 0.35rem; display: flex; gap: 0.75rem; align-items: center; font-size: 0.85rem; text-transform: uppercase; }
.loadout-status .points { color: #9ec5e6; }
.loadout-status .warn { color: rgba(255,190,80,0.95); }
.loadout-status .ok { color: rgba(120,255,170,0.9); }

.fireteam-block { margin-top: 0.75rem; }
.fireteam-header { display: flex; justify-content: space-between; align-items: baseline; margin: 0.2rem 0 0.4rem; }
.fireteam-title { font-weight: 700; letter-spacing: .06em; color: #e0f0ff; }
.fireteam-count { color: #9ec5e6; font-size: .9rem; }

.squad-members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1rem; }

.member-card { background: rgba(0, 10, 30, 0.95); border-radius: 0.4rem; border-left: 4px solid #1e90ff; box-shadow: 0 0 10px rgba(0,0,0,0.6); padding: 0.9rem 1.1rem; display: flex; flex-direction: column; }
.member-card.vacant, .member-card.closed { opacity: 0.8; border-left-color: rgba(30,144,255,0.35); }
.member-header { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .9rem; }
.member-rank-insignia { width: 44px; height: 44px; object-fit: contain; filter: drop-shadow(0 0 6px rgba(0,0,0,0.6)); }
.member-header h3 { margin: 0; font-size: 1.2rem; color: #1e90ff; }
.rank-line { margin: 0.2rem 0 0; font-size: 0.9rem; color: #9ec5e6; }
.rank { margin-right: 0.6rem; }
.id { opacity: 0.8; }

.member-body { display: flex; gap: 1rem; margin-top: 0.6rem; font-size: 0.9rem; }
.member-column { flex: 1; }
.member-column.left p, .member-column.right p { margin: 0.18rem 0; }

.loadout-row { margin-top: 0.4rem; }
.disposable { user-select: none; }

.cert-list { display: grid; grid-template-columns: 20px 1fr; row-gap: 0.28rem; }
.cert-row { display: contents; }
.cert-checkbox { width: 16px; height: 16px; border: 1px solid rgba(30,144,255,0.6); border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; margin-right: 6px; }
.cert-checkbox.checked { border-color: rgba(120,255,170,0.9); box-shadow: 0 0 6px rgba(120,255,170,0.25) inset; }
.checkbox-dot { width: 10px; height: 10px; background: rgba(120,255,170,0.95); border-radius: 2px; display: block; }
.cert-label { color: #dce6f1; }

.member-footer { margin-top: 0.6rem; font-size: 0.75rem; color: #7aa7c7; display: flex; justify-content: space-between; }
</style>
