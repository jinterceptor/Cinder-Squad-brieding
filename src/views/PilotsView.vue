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

    <!-- FULLSCREEN SQUAD OVERLAY -->
    <div v-if="activeSquad" class="squad-overlay">
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
              {{ squadDescriptor(activeSquad.squad) }} ·
              {{ activeSquad.members.length }} PERSONNEL
            </p>
          </div>
          <div class="squad-tag">
            <span>{{ squadInitials(activeSquad.squad) }}</span>
          </div>
        </div>

        <div class="squad-modal-scroll">
          <div class="squad-members-grid">

            <div
              v-for="member in activeSquad.members"
              :key="member.id || member.name"
              class="member-card"
            >
              <div class="member-header">
                <div>
                  <h3>{{ member.name.toUpperCase() }}</h3>
                  <p class="rank-line">
                    <span class="rank">{{ member.rank }}</span>
                    <span class="id">ID: {{ member.id || "N/A" }}</span>
                  </p>
                </div>
              </div>

              <div class="member-body">
                <div class="member-column left">
                  <p><strong>Squad:</strong> {{ member.squad || activeSquad.squad }}</p>
                  <p><strong>Join Date:</strong> {{ member.joinDate || "Unknown" }}</p>
                  <p><strong>Status:</strong> {{ member.status || "Active" }}</p>
                  <p><strong>Slot:</strong> {{ member.squadAssignments || "N/A" }}</p>
                </div>

                <div class="member-column right">
                  <p><strong>Certifications:</strong></p>

                  <!-- Single-row horizontal scroll certs -->
                  <div class="cert-list">
                    <div
                      v-for="(label, idx) in certLabels"
                      :key="idx"
                      class="cert-row"
                    >
                      <span
                        class="cert-checkbox"
                        :class="{ filled: member.certifications[idx] === 'Y' }"
                      ></span>
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
  </section>
</template>

<script>
export default {
  name: "PilotsView",
  props: {
    members: Array,
    orbat: Array,
  },
  data() {
    return {
      activeSquad: null,
      certLabels: [
        "Rifleman",
        "Machine Gunner",
        "Anti Tank",
        "Corpsman",
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
    squadsToShow() {
      if (this.orbat?.length) {
        return this.orbat.slice().sort((a, b) =>
          a.squad.localeCompare(b.squad, undefined, { numeric: true })
        );
      }
      return [];
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
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
      return parts
        .map((p, i) => (/\d/.test(p) ? p : p[0]))
        .join("")
        .toUpperCase();
    },
    squadDescriptor(name) {
      const n = String(name).toLowerCase();
      if (n.includes("chalk")) return "INFANTRY CHALK // UNSC GROUND FORCES";
      if (n.includes("command")) return "COMMAND ELEMENT // UNSC GROUND FORCES";
      return "UNSC REGISTERED ELEMENT";
    },
  },
};
</script>

<style scoped>
/* -------------------------------------------------------
   MAIN GRID + SQUAD CARD SIZING
------------------------------------------------------- */
.section-container {
  padding: 2.5rem 3rem;
  color: #dce6f1;
  font-family: "Consolas", monospace;
  width: 100%;
  max-width: 2200px;
  margin: 0 auto;
}

.squad-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3rem;
  margin-top: 2rem;
}

/* Responsive */
@media (max-width: 1400px) {
  .squad-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .squad-grid {
    grid-template-columns: 1fr;
  }
}

.squad-card {
  background: radial-gradient(
      circle at top left,
      rgba(30, 144, 255, 0.25),
      transparent 65%
    ),
    rgba(0, 10, 30, 0.9);
  border: 2px solid rgba(30, 144, 255, 0.85);
  border-radius: 0.8rem;
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

.squad-insignia {
  width: 95px;
  height: 95px;
  border-radius: 0.6rem;
  border: 4px solid #1e90ff;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 1.6rem;
  font-size: 2rem;
  font-weight: bold;
  color: #1e90ff;
}

/* -------------------------------------------------------
   FULLSCREEN MODAL
------------------------------------------------------- */
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
  background: #050811;
  width: 90vw;
  max-width: 1600px;
  max-height: 90vh;
  padding: 1.5rem 2rem;
  border-radius: 0.8rem;
  display: flex;
  flex-direction: column;
  color: #dce6f1;
}

.squad-modal-scroll {
  flex: 1;
  overflow-y: auto;
}

.squad-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1rem;
}

/* -------------------------------------------------------
   MEMBER CARD
------------------------------------------------------- */
.member-card {
  background: rgba(0, 10, 30, 0.95);
  border-left: 4px solid #1e90ff;
  padding: 1rem;
  border-radius: 0.4rem;
}

.member-header h3 {
  margin: 0;
  color: #1e90ff;
}

.rank-line {
  margin: 0.2rem 0;
  color: #9ec5e6;
}

.member-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.6rem;
}

.cert-list {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  white-space: nowrap;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.cert-row {
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
}

.cert-checkbox {
  width: 13px;
  height: 13px;
  border: 2px solid #1e90ff;
  border-radius: 3px;
  margin-right: 0.35rem;
}

.cert-checkbox.filled {
  background: #1e90ff;
}

.cert-label {
  margin-right: 0.5rem;
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
