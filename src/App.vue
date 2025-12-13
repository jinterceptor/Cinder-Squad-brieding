<template>
  <section id="members" class="section-container">
    <!-- Header -->
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
          <!-- TOP -->
          <div v-if="hierarchy.chalkActual" class="orbat-row center-row actual-row">
            <div class="squad-row single">
              <div class="squad-card" @click="openSquad(hierarchy.chalkActual)">
                <div class="squad-header">
                  <div class="squad-insignia"><span>{{ squadInitials(hierarchy.chalkActual.squad) }}</span></div>
                  <div class="squad-meta">
                    <h2>{{ hierarchy.chalkActual.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(hierarchy.chalkActual.squad) }}</p>
                    <p class="squad-count">{{ squadCount(hierarchy.chalkActual) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CHALKS -->
          <div v-if="hierarchy.chalks.length" class="orbat-row chalk-row">
            <div class="squad-row three">
              <div v-for="sq in hierarchy.chalks" :key="sq.squad" class="squad-card" @click="openSquad(sq)">
                <div class="squad-header">
                  <div class="squad-insignia"><span>{{ squadInitials(sq.squad) }}</span></div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ squadCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SUPPORT -->
          <div v-if="hierarchy.support.length" class="orbat-row">
            <div class="squad-row three">
              <div v-for="sq in hierarchy.support" :key="sq.squad" class="squad-card" @click="openSquad(sq)">
                <div class="squad-header">
                  <div class="squad-insignia"><span>{{ squadInitials(sq.squad) }}</span></div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ squadCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- OTHER -->
          <div v-if="hierarchy.other.length" class="orbat-row">
            <div class="squad-row three">
              <div v-for="sq in hierarchy.other" :key="sq.squad" class="squad-card" @click="openSquad(sq)">
                <div class="squad-header">
                  <div class="squad-insignia"><span>{{ squadInitials(sq.squad) }}</span></div>
                  <div class="squad-meta">
                    <h2>{{ sq.squad }}</h2>
                    <p class="squad-subtitle">{{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">{{ squadCount(sq) }} PERSONNEL</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- OVERLAY -->
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

        <div class="squad-modal-meta">
          <div class="squad-title">
            <h2>{{ activeSquad.squad }}</h2>
            <p class="subtitle">
              {{ squadDescriptor(activeSquad.squad) }} · {{ squadCount(activeSquad) }} PERSONNEL
            </p>
          </div>
          <div class="squad-tag"><span>{{ squadInitials(activeSquad.squad) }}</span></div>
        </div>

        <div class="squad-modal-scroll">
          <div v-if="!activeSquad.fireteams || !activeSquad.fireteams.length" class="empty-ft">
            NO SLOTTING DATA FOUND FOR THIS ELEMENT
          </div>

          <div v-else class="fireteam-stack">
            <div v-for="ft in sortedFireteams(activeSquad.fireteams)" :key="ft.name" class="fireteam-block">
              <div class="fireteam-header">
                <h3>{{ ft.name }}</h3>
              </div>

              <div class="slots-grid">
                <div v-for="(slot, idx) in ft.slots" :key="ft.name + '-' + idx"
                     class="slot-card"
                     :class="slot.status === 'VACANT' ? 'slot-vacant' : slot.status === 'CLOSED' ? 'slot-closed' : ''">

                  <div class="slot-role">{{ slot.role }}</div>

                  <div v-if="slot.status === 'VACANT' || slot.status === 'CLOSED'" class="slot-empty">
                    <span class="slot-state">{{ slot.status }}</span>
                    <span class="slot-sub">NO ASSIGNMENT</span>
                  </div>

                  <div v-else class="slot-member">
                    <div class="slot-member-top">
                      <img
                        v-if="rankInsignia(slot.member?.rank)"
                        :src="rankInsignia(slot.member.rank)"
                        class="rank-img"
                        :alt="slot.member.rank + ' insignia'"
                      />
                      <div class="slot-member-text">
                        <div class="slot-name">{{ (slot.member?.name || 'UNKNOWN').toUpperCase() }}</div>
                        <div class="slot-meta">
                          <span class="slot-rank">{{ slot.member?.rank || '' }}</span>
                          <span class="slot-id">ID: {{ slot.member?.id || 'N/A' }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="slot-certs">
                      <div class="cert-row" v-for="(label, cIdx) in certLabels" :key="label">
                        <span class="cert-checkbox" :class="{ checked: hasCert(slot.member, cIdx) }">
                          <span v-if="hasCert(slot.member, cIdx)" class="checkbox-dot"></span>
                        </span>
                        <span class="cert-label">{{ label }}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
    <!-- END OVERLAY -->
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
      certLabels: [
        "Rifleman","Machine Gunner","Anti Tank","Corpsmen","Combat Engineer","Marksman",
        "Breacher","Grenadier","Pilot","RTO","PJ","NCO","Officer",
      ],
    };
  },
  computed: {
    hierarchy() {
      const groups = { chalkActual: null, chalks: [], support: [], other: [] };

      (this.orbat || []).forEach((sq) => {
        const n = String(sq.squad || "").trim().toLowerCase();

        if (n === "chalk actual") groups.chalkActual = sq;
        else if (n === "chalk 1" || n === "chalk 2" || n === "chalk 3" || n === "chalk 4") groups.chalks.push(sq);
        else if (n === "broadsword" || n === "wyvern" || n === "caladrius" || n === "ifrit") groups.support.push(sq);
        else if (n === "fillers" || n === "recruit" || n === "reserves") groups.other.push(sq);
        else groups.other.push(sq);
      });

      const sortByName = (a, b) => a.squad.localeCompare(b.squad, undefined, { numeric: true, sensitivity: "base" });
      groups.chalks.sort(sortByName);
      groups.support.sort(sortByName);
      groups.other.sort(sortByName);

      return groups;
    },
  },
  methods: {
    openSquad(sq) { this.activeSquad = sq; },
    closeSquad() { this.activeSquad = null; },

    sortedFireteams(fireteams) {
      const arr = (fireteams || []).slice();
      // Fireteam 1, Fireteam 2, Element...
      const key = (n) => {
        const m = String(n).match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 999;
      };
      return arr.sort((a, b) => key(a.name) - key(b.name) || String(a.name).localeCompare(String(b.name)));
    },

    squadCount(sq) {
      const fts = sq?.fireteams || [];
      let count = 0;
      fts.forEach((ft) => {
        (ft.slots || []).forEach((s) => {
          if (s?.status === "FILLED" && s?.member) count++;
        });
      });
      return count;
    },

    squadInitials(name) {
      if (!name) return "UNSC";
      const parts = String(name).trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
      return parts.map((p, i) => (i === parts.length - 1 && /\d+/.test(p) ? p : p[0])).join("").toUpperCase();
    },

    squadDescriptor(name) {
      const n = String(name).toLowerCase();
      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("command") || n.includes("actual")) return "COMMAND ELEMENT";
      if (n.includes("wyvern")) return "AVIATION SUPPORT";
      return "UNSC ELEMENT";
    },

    hasCert(member, idx) {
      const certs = member?.certifications || [];
      const flag = certs[idx];
      return flag === "Y" || flag === true || flag === "1";
    },

    rankCode(rank) {
      if (!rank) return null;
      const key = String(rank).trim().toUpperCase();

      const rankMap = {
        RCT: "Rct", PVT: "Pvt", PFC: "PFC",
        SPC: "Spc", SPC2: "Spc2", SPC3: "Spc3", SPC4: "Spc4",
        LCPL: "LCpl", CPL: "Cpl", SGT: "Sgt", SSGT: "SSgt",
        WO: "WO", CWO2: "CWO2", CWO3: "CWO3", CWO4: "CWO4", CWO5: "CWO5",
        "2NDLT": "2ndLt", "1STLT": "1stLt", CAPT: "Capt", MAJ: "Maj",
        HR: "HR", HA: "HA", HN: "HN", HM3: "HM3", HM2: "HM2", HM1: "HM1", HMC: "HMC",
      };

      return rankMap[key] || null;
    },

    rankInsignia(rank) {
      const fileBase = this.rankCode(rank);
      if (!fileBase) return null;
      return `/ranks/${fileBase}.png`;
    },
  },
};
</script>

<style scoped>
.section-container {
  padding: 2.5rem 3rem;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
  width: 100% !important;
  max-width: 2200px;
  margin: 0 auto;
  box-sizing: border-box;
}

.section-content-container { width: 100% !important; }
.orbat-wrapper { width: 100%; margin-top: 0.75rem; }

.hierarchy-container { width: 100%; margin-top: 2rem; }
.orbat-row { margin-bottom: 3rem; }
.center-row { display: flex; justify-content: center; }

.squad-row.single { display: flex; justify-content: center; }
.squad-row.three {
  display: grid;
  grid-template-columns: repeat(3, minmax(280px, 1fr));
  gap: 2.5rem;
}

@media (max-width: 1400px) {
  .squad-row.three { grid-template-columns: repeat(2, minmax(260px, 1fr)); }
}
@media (max-width: 900px) {
  .squad-row.three { grid-template-columns: 1fr; }
}

/* command lines */
@media (min-width: 900px) {
  .actual-row { position: relative; }
  .actual-row::after {
    content: "";
    position: absolute;
    bottom: -24px;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 24px;
    background: rgba(30, 144, 255, 0.6);
    border-radius: 2px;
    pointer-events: none;
  }

  .chalk-row { position: relative; margin-top: 2.5rem; padding-top: 1.5rem; }
  .chalk-row::before {
    content: "";
    position: absolute;
    top: 0;
    left: 8%;
    right: 8%;
    height: 3px;
    background: rgba(30, 144, 255, 0.6);
    border-radius: 2px;
    pointer-events: none;
  }
}

/* squad tiles */
.squad-card {
  background: radial-gradient(circle at top left, rgba(30,144,255,0.25), transparent 65%), rgba(0,10,30,0.9);
  border: 2px solid rgba(30, 144, 255, 0.85);
  border-radius: 0.8rem;
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
  cursor: pointer;
  min-height: 210px;
  padding-right: 1.5rem;
  transition: 0.15s ease-in-out;
}
.squad-card:hover { transform: translateY(-2px); border-color: #5ab3ff; }

.squad-header { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 1.4rem 2rem; }
.squad-insignia {
  width: 95px; height: 95px; border-radius: 0.6rem; border: 4px solid #1e90ff;
  display:flex; align-items:center; justify-content:center;
  margin-right: 1.6rem;
  font-size: 2rem; font-weight: bold; color:#1e90ff;
  background: rgba(0,0,0,0.7);
}
.squad-meta h2 { margin:0; font-size: 2.3rem; color:#e0f0ff; letter-spacing:0.05em; }
.squad-subtitle { margin: 0.2rem 0 0; font-size: 1.1rem; color:#9ec5e6; text-transform: uppercase; }
.squad-count { margin: 0.4rem 0 0; font-size: 1rem; color:#7aa7c7; }

/* overlay */
.squad-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.85);
  z-index: 9999;
  display:flex; align-items:center; justify-content:center;
}
.squad-modal {
  background-color:#050811;
  width: 92vw; max-width: 1750px;
  max-height: 90vh;
  border-radius: 0.8rem;
  box-shadow: 0 0 24px rgba(0,0,0,0.9);
  padding: 1.5rem 2rem 2rem;
  display:flex; flex-direction: column;
  box-sizing: border-box;
}
.squad-modal-header { display:flex; justify-content: space-between; align-items:center; margin-bottom: 0.8rem; }
.squad-header-left { display:flex; align-items:center; }
.squad-header-left img { width:48px; margin-right: 0.5rem; }

.squad-close {
  background: transparent;
  border: 1px solid rgba(220,230,241,0.4);
  color:#dce6f1;
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

.squad-modal-meta {
  display:flex; justify-content: space-between; align-items:center;
  border-bottom: 1px solid rgba(30,144,255,0.6);
  padding-bottom: 0.5rem;
  margin-bottom: 0.8rem;
}
.squad-title h2 { margin:0; font-size: 1.8rem; letter-spacing: 0.08em; }
.squad-title .subtitle { margin: 0.25rem 0 0; font-size: 0.95rem; color:#9ec5e6; text-transform: uppercase; }

.squad-tag {
  border: 2px solid #1e90ff;
  border-radius: 0.4rem;
  padding: 0.35rem 0.8rem;
  font-size: 0.95rem;
  color:#1e90ff;
}

.squad-modal-scroll { flex: 1; overflow-y: auto; margin-top: 0.5rem; }
.empty-ft { padding: 1rem; opacity: 0.8; }

.fireteam-stack { display:flex; flex-direction: column; gap: 1rem; }
.fireteam-block { border: 1px solid rgba(30,144,255,0.25); border-radius: 0.6rem; overflow: hidden; }
.fireteam-header {
  padding: 0.7rem 1rem;
  background: rgba(30,144,255,0.08);
  border-bottom: 1px solid rgba(30,144,255,0.25);
}
.fireteam-header h3 { margin:0; font-size: 1.1rem; letter-spacing: 0.06em; color:#9ec5e6; text-transform: uppercase; }

.slots-grid {
  padding: 1rem;
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 1rem;
}

.slot-card {
  background: rgba(0, 10, 30, 0.95);
  border-left: 4px solid #1e90ff;
  border-radius: 0.4rem;
  padding: 0.9rem 1rem;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
  display:flex;
  flex-direction: column;
  gap: 0.55rem;
}
.slot-vacant { border-left-color: rgba(220,230,241,0.25); opacity: 0.8; }
.slot-closed { border-left-color: rgba(255,80,80,0.35); opacity: 0.75; }

.slot-role { font-size: 0.95rem; color:#e0f0ff; letter-spacing: 0.04em; text-transform: uppercase; }

.slot-empty { padding: 0.4rem 0; display:flex; flex-direction: column; gap: 0.15rem; }
.slot-state { font-weight: bold; color:#9ec5e6; }
.slot-sub { font-size: 0.85rem; color:#7aa7c7; }

.slot-member-top { display:flex; gap: 0.75rem; align-items: center; }
.rank-img { width: 40px; height: 40px; object-fit: contain; }
.slot-name { color:#1e90ff; font-weight: bold; font-size: 1.05rem; }
.slot-meta { font-size: 0.85rem; color:#9ec5e6; display:flex; gap: 0.6rem; }
.slot-id { opacity: 0.85; }

.slot-certs { margin-top: 0.25rem; display:flex; flex-direction: column; gap: 0.12rem; }
.cert-row { display:flex; align-items:center; font-size: 0.78rem; }
.cert-checkbox {
  width: 14px; height: 14px;
  border-radius: 3px;
  border: 1px solid #7aa7c7;
  display:inline-flex; align-items:center; justify-content:center;
  margin-right: 0.35rem;
}
.cert-checkbox.checked { border-color:#1e90ff; background: rgba(30,144,255,0.15); }
.checkbox-dot { width: 8px; height: 8px; border-radius: 2px; background:#1e90ff; }
.cert-label { white-space: nowrap; }
</style>
