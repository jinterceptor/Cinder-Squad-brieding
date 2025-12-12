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

    <!-- MAIN CONTENT -->
    <div class="section-content-container">
      <div class="orbat-wrapper">
        <div v-if="!orbat || !orbat.length">
          Loading squads and members...
        </div>

        <div v-else class="hierarchy-container">
          <!-- TOP: CHALK ACTUAL -->
          <div
            v-if="hierarchy.chalkActual"
            class="orbat-row center-row actual-row"
          >
            <div class="squad-row single">
              <div
                class="squad-card"
                @click="openSquad(hierarchy.chalkActual)"
              >
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(hierarchy.chalkActual.squad) }}</span>
                  </div>

                  <div class="squad-meta">
                    <h2>{{ hierarchy.chalkActual.squad }}</h2>
                    <p class="squad-subtitle">
                      {{ squadDescriptor(hierarchy.chalkActual.squad) }}
                    </p>
                    <p class="squad-count">
                      {{ hierarchy.chalkActual.members.length }} PERSONNEL
                    </p>
                  </div>

                  <div class="squad-chevron">
                    <span>▶</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- MIDDLE: CHALKS 1–3 -->
          <div
            v-if="hierarchy.chalks.length"
            class="orbat-row chalk-row"
          >
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
                    <p class="squad-subtitle">
                      {{ squadDescriptor(sq.squad) }}
                    </p>
                    <p class="squad-count">
                      {{ sq.members.length }} PERSONNEL
                    </p>
                  </div>
                  <div class="squad-chevron">
                    <span>▶</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SUPPORT: BROADSWORD, WYVERN, CALADRIUS -->
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
                    <p class="squad-subtitle">
                      {{ squadDescriptor(sq.squad) }}
                    </p>
                    <p class="squad-count">
                      {{ sq.members.length }} PERSONNEL
                    </p>
                  </div>
                  <div class="squad-chevron">
                    <span>▶</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- OTHER: FILLERS, RECRUIT, RESERVES -->
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
                    <p class="squad-subtitle">
                      {{ squadDescriptor(sq.squad) }}</p>
                    <p class="squad-count">
                      {{ sq.members.length }} PERSONNEL
                    </p>
                  </div>
                  <div class="squad-chevron">
                    <span>▶</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ================= FULLSCREEN SQUAD ROSTER OVERLAY ================= -->
    <div v-if="activeSquad" class="squad-overlay">
      <div class="squad-modal">
        <!-- Top bar -->
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

        <!-- Squad meta -->
        <div class="squad-modal-meta">
          <div class="squad-title">
            <h2>{{ activeSquad.squad }}</h2>
            <p class="subtitle">
              {{ squadDescriptor(activeSquad.squad) }} ·
              {{ activeSquad.members.length }} PERSONNEL
            </p>
          </div>
          <div class="squad-tag">
            <span>{{ squadInitials(activeSquad.squad) }}</span>
          </div>
        </div>

        <!-- Scrollable content -->
        <div class="squad-modal-scroll">
          <div class="squad-members-grid">
            <div
              v-for="member in activeSquad.members"
              :key="member.id || member.name"
              class="member-card"
            >
              <!-- Header with rank insignia -->
              <div class="member-header">
                <div
                  class="member-rank-insignia-wrapper"
                  v-if="rankInsignia(member.rank)"
                >
                  <img
                    :src="rankInsignia(member.rank)"
                    :alt="member.rank + ' insignia'"
                    class="member-rank-insignia"
                  />
                </div>

                <div class="member-header-text">
                  <h3>{{ member.name.toUpperCase() }}</h3>
                  <p class="rank-line">
                    <span class="rank">{{ member.rank }}</span>
                    <span class="id">ID: {{ member.id || 'N/A' }}</span>
                  </p>
                </div>
              </div>

              <!-- Body -->
              <div class="member-body">
                <div class="member-column left">
                  <p><strong>Squad:</strong> {{ member.squad || activeSquad.squad }}</p>
                  <p><strong>Join Date:</strong> {{ member.joinDate || 'Unknown' }}</p>
                  <p><strong>Status:</strong> {{ member.status || 'Active' }}</p>
                  <p><strong>Slot:</strong> {{ member.squadAssignments || 'N/A' }}</p>
                </div>

                <!-- Certifications (vertical list) -->
                <div class="member-column right">
                  <p><strong>Certifications:</strong></p>
                  <div class="cert-list">
                    <div
                      v-for="(label, idx) in certLabels"
                      :key="label"
                      class="cert-row"
                    >
                      <span
                        class="cert-checkbox"
                        :class="{ checked: hasCert(member, idx) }"
                      >
                        <span
                          v-if="hasCert(member, idx)"
                          class="checkbox-dot"
                        ></span>
                      </span>
                      <span class="cert-label">{{ label }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="member-footer">
                <span>BIOMETRIC RECORD VALID</span>
                <span>UNSC SYSTEMS DATABASE</span>
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
    members: {
      type: Array,
      default: () => [],
    },
    orbat: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      activeSquad: null,
      certLabels: [
        "Rifleman",
        "Machine Gunner",
        "Anti Tank",
        "Corpsmen",
        "Combat Engineer",
        "Marksman",
        "Breacher",
        "Grenadier",
        "Pilot",
        "RTO",
        "PJ",
        "NCO",
        "Officer",
      ],
    };
  },
  computed: {
    hierarchy() {
      const groups = {
        chalkActual: null,
        chalks: [],
        support: [],
        other: [],
      };

      (this.orbat || []).forEach((sq) => {
        const n = sq.squad.trim().toLowerCase();

        if (n === "chalk actual") {
          groups.chalkActual = sq;
        } else if (n === "chalk 1" || n === "chalk 2" || n === "chalk 3") {
          groups.chalks.push(sq);
        } else if (
          n === "broadsword command" ||
          n === "wyvern air wing" ||
          n === "caladrius"
        ) {
          groups.support.push(sq);
        } else if (
          n === "fillers" ||
          n === "recruit" ||
          n === "reserves"
        ) {
          groups.other.push(sq);
        } else {
          groups.other.push(sq);
        }
      });

      groups.chalks.sort((a, b) => a.squad.localeCompare(b.squad));
      groups.support.sort((a, b) => a.squad.localeCompare(b.squad));
      groups.other.sort((a, b) => a.squad.localeCompare(b.squad));

      return groups;
    },
  },
  methods: {
    openSquad(squad) {
      this.activeSquad = squad;
    },
    closeSquad() {
      this.activeSquad = null;
    },

    squadInitials(name) {
      if (!name) return "UNSC";
      const parts = String(name).trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
      return parts
        .map((p, i) => (i === parts.length - 1 && /\d+/.test(p) ? p : p[0]))
        .join("")
        .toUpperCase();
    },

    squadDescriptor(name) {
      const n = String(name).toLowerCase();
      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("air") || n.includes("wing")) return "AVIATION SUPPORT";
      if (n.includes("command")) return "COMMAND ELEMENT";
      return "UNSC ELEMENT";
    },

    hasCert(member, idx) {
      const certs = member.certifications || [];
      const flag = certs[idx];
      return flag === "Y" || flag === true || flag === "1";
    },

    rankCode(rank) {
      if (!rank) return null;
      const key = rank.trim().toUpperCase();

      const rankMap = {
        RCT: "Rct",
        PVT: "Pvt",
        PFC: "PFC",
        SPC: "Spc",
        SPC2: "Spc2",
        SPC3: "Spc3",
        SPC4: "Spc4",
        LCPL: "LCpl",
        CPL: "Cpl",
        SGT: "Sgt",
        SSGT: "SSgt",

        WO: "WO",
        CWO2: "CWO2",
        CWO3: "CWO3",
        CWO4: "CWO4",
        CWO5: "CWO5",

        "2NDLT": "2ndLt",
        "1STLT": "1stLt",
        CAPT: "Capt",
        MAJ: "Maj",

        HR: "HR",
        HA: "HA",
        HN: "HN",
        HM3: "HM3",
        HM2: "HM2",
        HM1: "HM1",
        HMC: "HMC",
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
/* ===== MAIN CONTAINER ================================================= */
.section-container {
  padding: 2.5rem 3rem;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
  width: 100% !important;
  max-width: 2200px;
  margin: 0 auto;
  box-sizing: border-box;
}

.section-content-container {
  width: 100% !important;
}

.orbat-wrapper {
  width: 100%;
  margin-top: 0.75rem;
}

/* ===== HIERARCHY ROWS / LINES ======================================== */
.hierarchy-container {
  width: 100%;
  margin-top: 2rem;
}

.orbat-row {
  margin-bottom: 3rem;
}

.center-row {
  display: flex;
  justify-content: center;
}

.squad-row.single {
  display: flex;
  justify-content: center;
}

.squad-row.three {
  display: grid;
  grid-template-columns: repeat(3, minmax(280px, 1fr));
  gap: 2.5rem;
}

/* Responsive */
@media (max-width: 1400px) {
  .squad-row.three {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }
}
@media (max-width: 900px) {
  .squad-row.three {
    grid-template-columns: 1fr;
  }
}

/* Command lines on desktop */
@media (min-width: 900px) {
  /* vertical line from Chalk Actual downwards */
  .actual-row {
    position: relative;
  }
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

  /* horizontal line above Chalks 1–3 */
  .chalk-row {
    position: relative;
    margin-top: 2.5rem;
    padding-top: 1.5rem;
  }
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

/* ===== SQUAD TILE ===================================================== */
.squad-card {
  background: radial-gradient(
      circle at top left,
      rgba(30, 144, 255, 0.25),
      transparent 65%
    ),
    rgba(0, 10, 30, 0.9);
  border: 2px solid rgba(30, 144, 255, 0.85);
  border-radius: 0.8rem;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  cursor: pointer;
  min-height: 210px;
  padding-right: 1.5rem;
  transition: 0.15s ease-in-out;
}

.squad-card:hover {
  transform: translateY(-2px);
  border-color: #5ab3ff;
}

.squad-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 1.4rem 2rem;
}

/* Insignia */
.squad-insignia {
  width: 95px;
  height: 95px;
  border-radius: 0.6rem;
  border: 4px solid #1e90ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1.6rem;
  font-size: 2rem;
  font-weight: bold;
  color: #1e90ff;
  background: rgba(0, 0, 0, 0.7);
  text-align: center;
}

.squad-meta h2 {
  margin: 0;
  font-size: 2.3rem;
  color: #e0f0ff;
  letter-spacing: 0.05em;
}

.squad-subtitle {
  margin: 0.2rem 0 0;
  font-size: 1.1rem;
  color: #9ec5e6;
  text-transform: uppercase;
}

.squad-count {
  margin: 0.4rem 0 0;
  font-size: 1rem;
  color: #7aa7c7;
}

.squad-chevron {
  font-size: 1.8rem;
  color: #9ec5e6;
  margin-left: 1.3rem;
}

/* ===== FULLSCREEN MODAL ============================================== */
.squad-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.squad-modal {
  background-color: #050811;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
  width: 90vw;
  max-width: 1600px;
  max-height: 90vh;
  border-radius: 0.8rem;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.9);
  padding: 1.5rem 2rem 2rem 2rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.squad-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.squad-header-left {
  display: flex;
  align-items: center;
}

.squad-header-left img {
  width: 48px;
  margin-right: 0.5rem;
}

.squad-close {
  background: transparent;
  border: 1px solid rgba(220, 230, 241, 0.4);
  color: #dce6f1;
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

.squad-modal-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  border-bottom: 1px solid rgba(30, 144, 255, 0.6);
  padding-bottom: 0.5rem;
}

.squad-title h2 {
  margin: 0;
  font-size: 1.8rem;
  letter-spacing: 0.08em;
}

.squad-title .subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  color: #9ec5e6;
  text-transform: uppercase;
}

.squad-tag {
  border: 2px solid #1e90ff;
  border-radius: 0.4rem;
  padding: 0.35rem 0.8rem;
  font-size: 0.95rem;
  color: #1e90ff;
}

.squad-modal-scroll {
  margin-top: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.squad-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1rem;
}

/* Member card */
.member-card {
  background: rgba(0, 10, 30, 0.95);
  border-radius: 0.4rem;
  border-left: 4px solid #1e90ff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.6);
  padding: 0.9rem 1.1rem;
  display: flex;
  flex-direction: column;
}

/* Header */
.member-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.member-rank-insignia {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.member-header-text h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #1e90ff;
}

.rank-line {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
  color: #9ec5e6;
}

.rank {
  margin-right: 0.6rem;
}

.id {
  opacity: 0.8;
}

/* Body */
.member-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.6rem;
  font-size: 0.9rem;
}

.member-column {
  flex: 1;
}

.member-column.left p,
.member-column.right p {
  margin: 0.18rem 0;
}

/* Certs vertical */
.cert-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 0.2rem;
}

.cert-row {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
}

.cert-checkbox {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid #7aa7c7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.3rem;
  box-sizing: border-box;
}

.cert-checkbox.checked {
  border-color: #1e90ff;
  background: rgba(30, 144, 255, 0.15);
}

.checkbox-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: #1e90ff;
}

.cert-label {
  white-space: nowrap;
}

/* Footer */
.member-footer {
  margin-top: 0.6rem;
  font-size: 0.75rem;
  color: #7aa7c7;
  display: flex;
  justify-content: space-between;
}
</style>
