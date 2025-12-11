<template>
  <section id="members" class="section-container">
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward-pilot">
        <img src="/icons/license.svg" alt="Members Icon" />
        <h1>Unit ORBAT</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container orbat-wrapper">
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
.section-container {
  padding: 1rem;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
}

.orbat-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* 3-column squad grid by default */
.squad-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

/* Medium screens: 2 columns */
@media (max-width: 900px) {
  .squad-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Small screens: 1 column */
@media (max-width: 600px) {
  .squad-grid {
    grid-template-columns: 1fr;
  }
}

/* SQUAD TILE */
.squad-card {
  background: radial-gradient(
      circle at top left,
      rgba(30, 144, 255, 0.2),
      transparent 55%
    ),
    rgba(0, 10, 30, 0.9);
  border: 1px solid rgba(30, 144, 255, 0.6);
  border-radius: 0.5rem;
  box-shadow: 0 0 18px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  cursor: pointer;
}

/* SQUAD HEADER / FACE */
.squad-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 0.9rem 1rem;
  background: linear-gradient(
    90deg,
    rgba(10, 25, 55, 0.95),
    rgba(10, 25, 55, 0.7)
  );
}

.squad-insignia {
  width: 54px;
  height: 54px;
  border-radius: 0.4rem;
  border: 2px solid #1e90ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.9rem;
  font-size: 0.85rem;
  font-weight: bold;
  color: #1e90ff;
  background: rgba(0, 0, 0, 0.6);
  text-align: center;
}

.squad-meta h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #e0f0ff;
  letter-spacing: 0.05em;
}

.squad-subtitle {
  margin: 0.1rem 0 0 0;
  font-size: 0.75rem;
  color: #9ec5e6;
  text-transform: uppercase;
}

.squad-count {
  margin: 0.35rem 0 0 0;
  font-size: 0.75rem;
  color: #7aa7c7;
}

.squad-chevron {
  font-size: 0.9rem;
  color: #9ec5e6;
  margin-left: 0.8rem;
}

/* EXPAND ANIMATION */
.squad-expand-enter-active,
.squad-expand-leave-active {
  transition: all 0.2s ease-out;
}
.squad-expand-enter-from,
.squad-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.squad-expand-enter-to,
.squad-expand-leave-from {
  opacity: 1;
  max-height: 1600px;
}

/* MEMBERS INSIDE TILE */
.squad-members {
  padding: 0.6rem 1rem 1rem 1rem;
  background: rgba(0, 5, 20, 0.9);
  border-top: 1px solid rgba(30, 144, 255, 0.4);
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.member-card {
  background: rgba(0, 10, 30, 0.8);
  padding: 0.7rem;
  border-left: 3px solid #1e90ff;
  border-radius: 0.25rem;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}

.member-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1e90ff;
}

.subtitle {
  font-size: 0.8rem;
  color: #9ec5e6;
}

.member-info {
  display: flex;
  justify-content: space-between;
  margin: 0.4rem 0;
  font-size: 0.85rem;
}

.member-skills {
  margin: 0.4rem 0;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.2rem;
}

.skill-tag {
  background: #1e90ff;
  color: #fff;
  padding: 0.15rem 0.35rem;
  border-radius: 0.2rem;
  font-size: 0.7rem;
}

.member-footer {
  font-size: 0.65rem;
  margin-top: 0.4rem;
  color: #7aa7c7;
}
</style>
