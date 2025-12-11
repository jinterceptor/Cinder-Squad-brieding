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
            @click="toggleSquad(sq.squad)"
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

              <div class="squad-chevron" :class="{ open: isOpen(sq.squad) }">
                <span v-if="isOpen(sq.squad)">▼</span>
                <span v-else>▶</span>
              </div>
            </div>

            <!-- Members inside squad -->
            <transition name="squad-expand">
              <div
                v-if="isOpen(sq.squad)"
                class="squad-members"
                @click.stop
              >
                <div class="members-grid">
                  <div
                    v-for="member in sq.members"
                    :key="member.id || member.name"
                    class="member-card"
                  >
                    <!-- Header -->
                    <div class="member-header">
                      <h3>{{ member.name.toUpperCase() }}</h3>
                      <span class="subtitle">({{ member.rank }})</span>
                    </div>

                    <!-- Info blocks -->
                    <div class="member-info">
                      <div class="info-left">
                        <p><strong>Join Date:</strong> {{ member.joinDate }}</p>
                        <p><strong>Member ID:</strong> {{ member.id }}</p>
                      </div>
                      <div class="info-right">
                        <p>CALLSIGN AVAILABLE</p>
                        <p>IDENTITY VERIFIED</p>
                        <p>DATA REGISTERED</p>
                      </div>
                    </div>

                    <!-- Skills / Certifications -->
                    <div class="member-skills">
                      <p><strong>Certifications:</strong></p>
                      <div class="skills-tags">
                        <span
                          v-for="(cert, index) in member.certifications"
                          :key="index"
                          class="skill-tag"
                        >
                          {{ cert }}
                        </span>
                      </div>
                    </div>

                    <!-- Footer / Biometric -->
                    <div class="member-footer">
                      <p>BIOMETRIC RECORD VALID</p>
                      <p>UNSC SYSTEMS DATABASE</p>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
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
      openSquads: {}, // { [squadName]: boolean }
    };
  },
  computed: {
    squadsToShow() {
      if (this.orbat && this.orbat.length) {
        // Sort for consistency
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
  },
  methods: {
    toggleSquad(squadName) {
      this.openSquads[squadName] = !this.openSquads[squadName];
    },
    isOpen(squadName) {
      return !!this.openSquads[squadName];
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
  },
};
</script>

<style scoped>
/* Make this view span the full router-view width */
.section-container {
  padding: 2.5rem 3rem;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
  width: 100% !important;
  max-width: 2200px; /* increased horizontal space */
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

/* === SQUAD GRID ====================================================== */
/* 3 large tiles */
.squad-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3rem; /* widened horizontally */
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

/* === SQUAD TILE ====================================================== */
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

  /* ↓↓↓ reduced 20% from previous */
  min-height: 210px;

  /* ↓↓↓ slightly wider presentation */
  padding-right: 1.5rem;
}

/* === SQUAD HEADER (reduced vertical space) ============================ */
.squad-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;

  /* ↓↓↓ padding reduced from 2rem → 1.4rem (~30%) */
  padding: 1.4rem 2rem;
}

/* === INSIGNIA BLOCK (reduced 20%) ==================================== */
.squad-insignia {
  width: 95px;  /* was 120px */
  height: 95px; /* was 120px */
  border-radius: 0.6rem;
  border: 4px solid #1e90ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1.6rem;
  font-size: 2rem; /* was 2.4rem */
  font-weight: bold;
  color: #1e90ff;
  background: rgba(0, 0, 0, 0.7);
  text-align: center;
}

/* === SQUAD TITLE ====================================================== */
.squad-meta h2 {
  margin: 0;

  /* horizontally bigger title */
  font-size: 2.3rem; /* slightly increased */
  color: #e0f0ff;
  letter-spacing: 0.05em;
}

.squad-subtitle {
  margin: 0.2rem 0 0;
  font-size: 1.1rem; /* slightly reduced vertically */
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

/* Expansion animation */
.squad-expand-enter-active,
.squad-expand-leave-active {
  transition: all 0.25s ease-out;
}
.squad-expand-enter-from,
.squad-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.squad-expand-enter-to,
.squad-expand-leave-from {
  opacity: 1;
  max-height: 2000px;
}

/* === EXPANDED MEMBERS AREA ============================================ */
.squad-members {
  padding: 1.2rem 2rem 1.6rem 2rem; /* reduced vertical padding */
  background: rgba(0, 5, 20, 0.96);
  border-top: 1px solid rgba(30, 144, 255, 0.7);
}

/* Member cards grid */
.members-grid {
  display: grid;

  /* horizontally increased, vertically reduced layout */
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));

  gap: 1.2rem;
  margin-top: 0.6rem;
}

/* === MEMBER CARD ======================================================= */
.member-card {
  background: rgba(0, 10, 30, 0.95);
  padding: 0.9rem 1.1rem;
  border-left: 4px solid #1e90ff;
  border-radius: 0.3rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
}

/* Member card text sizes reduced slightly vertically */
.member-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #1e90ff;
}

.subtitle {
  font-size: 0.95rem;
  color: #9ec5e6;
}

.member-info {
  display: flex;
  justify-content: space-between;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.member-skills {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.2rem;
}

.skill-tag {
  background: #1e90ff;
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}

.member-footer {
  font-size: 0.75rem;
  margin-top: 0.5rem;
  color: #7aa7c7;
}
</style>
