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
        <div v-if="!squadsToShow.length">
          Loading squads and members...
        </div>

        <div v-else class="squad-grid">
          <div
            v-for="sq in squadsToShow"
            :key="sq.squad"
            class="squad-card"
            @click="openSquad(sq)"
          >
            <!-- Squad header / tile face -->
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
                  {{ sq.members.length }} PERSONNEL REGISTERED
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

    <!-- FULLSCREEN SQUAD ROSTER OVERLAY -->
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

          <button class="squad-close" @click="closeSquad">
            ✕
          </button>
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
              <div class="member-header">
                <!-- Rank insignia -->
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

              <div class="member-body">
                <div class="member-column left">
                  <p><strong>Squad:</strong> {{ member.squad || activeSquad.squad }}</p>
                  <p><strong>Join Date:</strong> {{ member.joinDate || 'Unknown' }}</p>
                  <p><strong>Status:</strong> {{ member.status || 'Active' }}</p>
                  <p><strong>Slot:</strong> {{ member.squadAssignments || 'N/A' }}</p>
                </div>

                <!-- CERTIFICATIONS: labelled checkbox list -->
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

              <div v-if="member.notes" class="member-notes">
                <p class="notes-label">NOTES / BIO</p>
                <div class="notes-body" v-html="member.notes" />
              </div>

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
    animate: {
      type: Boolean,
      required: false,
      default: false,
    },
    members: {
      type: Array,
      required: false,
      default: () => [],
    },
    orbat: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  data() {
    return {
      activeSquad: null, // { squad, members }
    };
  },
  computed: {
    squadsToShow() {
      if (this.orbat && this.orbat.length) {
        return this.orbat
          .slice()
          .sort((a, b) =>
            a.squad.localeCompare(b.squad, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          );
      }
      if (this.members && this.members.length) {
        return [
          {
            squad: "All Personnel",
            members: this.members,
          },
        ];
      }
      return [];
    },
    // Fixed order of certification labels
    certLabels() {
      return [
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
      ];
    },
  },
  methods: {
    openSquad(sq) {
      this.activeSquad = sq;
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
      if (n.includes("chalk")) return "INFANTRY CHALK // UNSC GROUND FORCES";
      if (n.includes("command") || n.includes("hq"))
        return "COMMAND ELEMENT // UNSC GROUND FORCES";
      if (n.includes("pilot") || n.includes("air") || n.includes("wing"))
        return "AVIATION ELEMENT // UNSC AIR ASSETS";
      return "UNSC REGISTERED ELEMENT";
    },

    // ---- CERTIFICATIONS ----------------------------------------------
    hasCert(member, idx) {
      const certs = member.certifications || [];
      const flag = certs[idx];
      return flag === "Y" || flag === true || flag === "1";
    },

    // ---- RANK → IMAGE MAPPING ----------------------------------------
    rankCode(rank) {
      if (!rank) return null;
      const key = rank.trim().toUpperCase();

      const rankMap = {
        // Enlisted / infantry
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

        // Warrant officers
        WO: "WO",
        CWO2: "CWO2",
        CWO3: "CWO3",
        CWO4: "CWO4",
        CWO5: "CWO5",

        // Commissioned officers
        "2NDLT": "2ndLt",
        "1STLT": "1stLt",
        CAPT: "Capt",
        MAJ: "Maj",

        // Medical / hospital corps
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
/* ===== MAIN ORBAT VIEW (same base sizing you liked) =================== */
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

/* 3 large squad tiles */
.squad-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3rem;
  margin-top: 2rem;
}

/* Medium screens */
@media (max-width: 1400px) {
  .squad-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Small screens */
@media (max-width: 900px) {
  .squad-grid {
    grid-template-columns: 1fr;
  }
}

/* Squad tile */
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

/* Squad text */
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

/* Arrow */
.squad-chevron {
  font-size: 1.8rem;
  color: #9ec5e6;
  margin-left: 1.3rem;
}

/* ===== FULLSCREEN SQUAD OVERLAY ====================================== */
.squad-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* The modal panel itself */
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

/* Modal header (title + close) */
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

/* Close button */
.squad-close {
  background: transparent;
  border: 1px solid rgba(220, 230, 241, 0.4);
  color: #dce6f1;
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}

/* Top meta bar in modal */
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

/* Scrollable area */
.squad-modal-scroll {
  margin-top: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

/* Members grid inside modal */
.squad-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1rem;
}

/* Member card styling */
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

.member-rank-insignia-wrapper {
  flex-shrink: 0;
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
  gap: 1rem;
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

/* Certs */
.cert-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.75rem;
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

.cert-none {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* Notes */
.member-notes {
  margin-top: 0.6rem;
  font-size: 0.85rem;
}

.notes-label {
  margin: 0 0 0.2rem 0;
  font-size: 0.75rem;
  opacity: 0.7;
}

.notes-body {
  line-height: 1.3;
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
