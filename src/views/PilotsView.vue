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
      <!-- No data yet -->
      <div v-if="!squadsToShow.length">
        Loading squads and members...
      </div>

      <!-- Squad tiles -->
      <div v-else class="squad-grid">
        <div
          v-for="squad in squadsToShow"
          :key="squad.squad"
          class="squad-card"
        >
          <!-- Squad header (click to expand/collapse) -->
          <div class="squad-header" @click="toggleSquad(squad.squad)">
            <div class="squad-title">
              <h2>{{ squad.squad }}</h2>
              <p>{{ squad.members.length }} personnel</p>
            </div>
            <div class="squad-chevron" :class="{ open: isOpen(squad.squad) }">
              <span v-if="isOpen(squad.squad)">▼</span>
              <span v-else>▶</span>
            </div>
          </div>

          <!-- Members inside squad -->
          <transition name="squad-expand">
            <div
              v-if="isOpen(squad.squad)"
              class="squad-members"
            >
              <div class="members-grid">
                <div
                  v-for="member in squad.members"
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
      openSquads: {}, // { [squadName]: true/false }
    };
  },
  computed: {
    // Prefer structured orbat (from RefData). If it's empty, fall back to a single pseudo-squad.
    squadsToShow() {
      if (this.orbat && this.orbat.length) {
        // Sort squads nicely (handles "Chalk 1", "Chalk 2", etc.)
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
      this.$set
        ? this.$set(this.openSquads, squadName, !this.openSquads[squadName])
        : (this.openSquads[squadName] = !this.openSquads[squadName]);
    },
    isOpen(squadName) {
      // default: start collapsed
      return !!this.openSquads[squadName];
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

/* Squad grid (each squad is a tile) */
.squad-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.squad-card {
  background: rgba(0, 10, 30, 0.85);
  border-left: 4px solid #1e90ff;
  border-radius: 0.3rem;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

/* Squad header (click to expand) */
.squad-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 1rem;
  cursor: pointer;
  background: rgba(10, 20, 40, 0.9);
}

.squad-title h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e90ff;
}

.squad-title p {
  margin: 0;
  font-size: 0.8rem;
  color: #9ec5e6;
}

.squad-chevron {
  font-size: 0.9rem;
  color: #9ec5e6;
}

/* Expand animation */
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
  max-height: 1000px;
}

/* Members grid inside each squad */
.squad-members {
  padding: 0.5rem 1rem 1rem 1rem;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.member-card {
  background: rgba(0, 10, 30, 0.7);
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
