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
            @click="openSquadModal(sq)"
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
  </section>
</template>

<script>
import SquadModal from "@/components/modals/SquadModal.vue";

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
    openSquadModal(sq) {
      this.$oruga.modal.open({
        component: SquadModal,
        custom: true,
        trapFocus: true,
        props: {
          squadName: sq.squad,
          members: sq.members,
        },
        class: "custom-modal",
        width: 1920,
      });
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
/* Use your latest size-tuned styles */

/* Make this view span the full router-view width */
.section-container {
  padding: 2.5rem 3rem;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
  width: 100% !important;
  max-width: 2200px; /* wide */
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
  gap: 3rem; /* wide spacing */
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
  min-height: 210px;
  padding-right: 1.5rem;
}

/* SQUAD HEADER (reduced vertically) */
.squad-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 1.4rem 2rem;
}

/* INSIGNIA BLOCK */
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

/* Squad title text */
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
</style>
