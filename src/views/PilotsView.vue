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
      <div v-if="!allSquads.length">
        Loading squads and members...
      </div>

      <template v-else>
        <!-- COMMAND ELEMENT: single big tile, centered -->
        <div v-if="commandSquad" class="row row-command">
          <div class="row-inner">
            <div
              class="squad-card squad-card-command"
              @click="toggleSquad(commandSquad.squad)"
            >
              <div class="squad-header">
                <div class="squad-insignia">
                  <span>{{ squadInitials(commandSquad.squad) }}</span>
                </div>

                <div class="squad-meta">
                  <h2>{{ commandSquad.squad }}</h2>
                  <p class="squad-subtitle">
                    {{ squadDescriptor(commandSquad.squad) }}
                  </p>
                  <p class="squad-count">
                    {{ commandSquad.members.length }} PERSONNEL REGISTERED
                  </p>
                </div>

                <div class="squad-chevron" :class="{ open: isOpen(commandSquad.squad) }">
                  <span v-if="isOpen(commandSquad.squad)">▼</span>
                  <span v-else>▶</span>
                </div>
              </div>

              <transition name="squad-expand">
                <div
                  v-if="isOpen(commandSquad.squad)"
                  class="squad-members"
                >
                  <div class="members-grid">
                    <div
                      v-for="member in commandSquad.members"
                      :key="member.id || member.name"
                      class="member-card"
                    >
                      <div class="member-header">
                        <h3>{{ member.name.toUpperCase() }}</h3>
                        <span class="subtitle">({{ member.rank }})</span>
                      </div>

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

        <!-- CHALK LINE: three tiles across -->
        <div v-if="chalkSquads.length" class="row row-chalks">
          <div class="row-inner chalk-row">
            <div
              v-for="sq in chalkSquads"
              :key="sq.squad"
              class="squad-card squad-card-chalk"
              @click="toggleSquad(sq.squad)"
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

                <div class="squad-chevron" :class="{ open: isOpen(sq.squad) }">
                  <span v-if="isOpen(sq.squad)">▼</span>
                  <span v-else>▶</span>
                </div>
              </div>

              <transition name="squad-expand">
                <div
                  v-if="isOpen(sq.squad)"
                  class="squad-members"
                >
                  <div class="members-grid">
                    <div
                      v-for="member in sq.members"
                      :key="member.id || member.name"
                      class="member-card"
                    >
                      <div class="member-header">
                        <h3>{{ member.name.toUpperCase() }}</h3>
                        <span class="subtitle">({{ member.rank }})</span>
                      </div>

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

        <!-- OTHER ELEMENTS: stacked tiles -->
        <div v-if="otherSquads.length" class="row row-others">
          <div class="row-inner others-column">
            <div
              v-for="sq in otherSquads"
              :key="sq.squad"
              class="squad-card squad-card-other"
              @click="toggleSquad(sq.squad)"
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

                <div class="squad-chevron" :class="{ open: isOpen(sq.squad) }">
                  <span v-if="isOpen(sq.squad)">▼</span>
                  <span v-else>▶</span>
                </div>
              </div>

              <transition name="squad-expand">
                <div
                  v-if="isOpen(sq.squad)"
                  class="squad-members"
                >
                  <div class="members-grid">
                    <div
                      v-for="member in sq.members"
                      :key="member.id || member.name"
                      class="member-card"
                    >
                      <div class="member-header">
                        <h3>{{ member.name.toUpperCase() }}</h3>
                        <span class="subtitle">({{ member.rank }})</span>
                      </div>

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
      </template>
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
    allSquads() {
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

    commandSquad() {
      return (
        this.allSquads.find((sq) =>
          sq.squad.toLowerCase().includes("broadsword command"),
        ) || null
      );
    },

    chalkSquads() {
      return this.allSquads
        .filter((sq) => {
          const n = sq.squad.toLowerCase();
          return n.startsWith("chalk ") && !n.includes("actual");
        })
        .sort((a, b) => {
          const anum = parseInt(a.squad.replace(/\D/g, ""), 10) || 0;
          const bnum = parseInt(b.squad.replace(/\D/g, ""), 10) || 0;
          return anum - bnum;
        });
    },

    otherSquads() {
      const skip = new Set(
        [
          this.commandSquad ? this.commandSquad.squad : null,
          ...this.chalkSquads.map((c) => c.squad),
        ].filter(Boolean),
      );
      return this.allSquads.filter((sq) => !skip.has(sq.squad));
    },
  },
  methods: {
    toggleSquad(squadName) {
      this.openSquads = {
        ...this.openSquads,
        [squadName]: !this.openSquads[squadName],
      };
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
  max-width: 1100px;
  margin: 0 auto;
}

/* ROWS */
.row {
  margin-top: 1rem;
}

.row-inner {
  width: 100%;
}

/* Command row: single big tile centered */
.row-command .row-inner {
  display: flex;
  justify-content: center;
}

/* Chalk row: three tiles across */
.chalk-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.chalk-row > .squad-card {
  flex: 1 1 calc(33.333% - 1rem);
}

/* Other squads stacked */
.others-column {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
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

.squad-card-command {
  width: 100%;
}

.squad-card-chalk {
  min-width: 260px;
}

/* SQUAD HEADER */
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
  font-size: 1.15rem;
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

/* MEMBERS */
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

/* Responsive: stack chalk tiles on narrow screens */
@media (max-width: 900px) {
  .chalk-row > .squad-card {
    flex: 1 1 100%;
  }
}
</style>
