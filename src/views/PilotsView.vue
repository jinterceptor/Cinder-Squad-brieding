<template>
  <section id="members" class="section-container">
    <!-- Header -->
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward-pilot">
        <img src="/icons/license.svg" />
        <h1>UNIT ORBAT</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <!-- ================= ORBAT GRID ================= -->
    <div class="section-content-container">
      <div v-if="!orbat.length" class="loading">
        Loading ORBAT...
      </div>

      <div v-else class="squad-grid">
        <div
          v-for="sq in orbat"
          :key="sq.squad"
          class="squad-card"
          @click="openSquad(sq)"
        >
          <div class="squad-header">
            <div class="squad-insignia">
              {{ squadInitials(sq.squad) }}
            </div>

            <div class="squad-meta">
              <h2>{{ sq.squad }}</h2>
              <p class="squad-subtitle">
                {{ squadDescriptor(sq.squad) }}
              </p>
              <p class="squad-count">
                {{ slotCount(sq) }} SLOTS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= FULLSCREEN SQUAD MODAL ================= -->
    <div
      v-if="activeSquad"
      class="squad-overlay"
      @click.self="closeSquad"
    >
      <div class="squad-modal">
        <!-- Header -->
        <div class="squad-modal-header">
          <div class="section-header clipped-medium-backward-bio">
            <img src="/icons/license.svg" />
            <h1>{{ activeSquad.squad }}</h1>
          </div>
          <button class="squad-close" @click="closeSquad">✕</button>
        </div>

        <!-- Fireteams -->
        <div class="squad-modal-scroll">
          <div
            v-for="ft in activeSquad.fireteams"
            :key="ft.name"
            class="fireteam-block"
          >
            <h3 class="fireteam-title">{{ ft.name }}</h3>

            <div class="slot-grid">
              <div
                v-for="slot in ft.slots"
                :key="slot.role + (slot.member?.id || slot.status)"
                class="slot-card"
                :class="slot.status.toLowerCase()"
              >
                <div class="slot-role">
                  {{ slot.role }}
                </div>

                <!-- FILLED -->
                <template v-if="slot.status === 'FILLED' && slot.member">
                  <div class="slot-name">
                    {{ slot.member.rank }} {{ slot.member.name }}
                  </div>
                  <div class="slot-meta">
                    ID: {{ slot.member.id || "N/A" }}
                  </div>
                </template>

                <!-- VACANT -->
                <template v-else-if="slot.status === 'VACANT'">
                  <div class="slot-status">VACANT</div>
                </template>

                <!-- CLOSED -->
                <template v-else-if="slot.status === 'CLOSED'">
                  <div class="slot-status">CLOSED</div>
                </template>
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
    orbat: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      activeSquad: null,
    };
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
      const p = name.split(" ");
      if (p.length === 1) return p[0].slice(0, 3).toUpperCase();
      return p.map((x) => x[0]).join("").toUpperCase();
    },

    squadDescriptor(name) {
      const n = name.toLowerCase();
      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("command")) return "COMMAND ELEMENT";
      if (n.includes("air") || n.includes("wyvern"))
        return "AVIATION ELEMENT";
      return "UNSC ELEMENT";
    },

    slotCount(sq) {
      return sq.fireteams.reduce(
        (acc, ft) => acc + ft.slots.length,
        0
      );
    },
  },
};
</script>

<style scoped>
/* ===== LAYOUT ======================================================= */
.section-container {
  padding: 2.5rem 3rem;
  font-family: Consolas, "Courier New", monospace;
  color: #dce6f1;
  max-width: 2200px;
  margin: 0 auto;
}

.loading {
  margin-top: 2rem;
  opacity: 0.7;
}

/* ===== SQUAD GRID =================================================== */
.squad-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 2.5rem;
  margin-top: 2rem;
}

.squad-card {
  cursor: pointer;
  background: rgba(0, 10, 30, 0.9);
  border: 2px solid #1e90ff;
  border-radius: 0.8rem;
  padding: 1.4rem 2rem;
  transition: 0.15s ease;
}

.squad-card:hover {
  transform: translateY(-3px);
  border-color: #5ab3ff;
}

.squad-header {
  display: flex;
  gap: 1.4rem;
  align-items: center;
}

.squad-insignia {
  width: 80px;
  height: 80px;
  border: 3px solid #1e90ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: bold;
}

.squad-meta h2 {
  margin: 0;
  font-size: 2rem;
}

.squad-subtitle {
  font-size: 0.95rem;
  color: #9ec5e6;
}

.squad-count {
  font-size: 0.85rem;
  color: #7aa7c7;
}

/* ===== MODAL ======================================================== */
.squad-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.squad-modal {
  background: #050811;
  width: 90vw;
  max-width: 1600px;
  max-height: 90vh;
  border-radius: 0.8rem;
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
}

.squad-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.squad-close {
  background: none;
  border: 1px solid #7aa7c7;
  color: #dce6f1;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
}

.squad-modal-scroll {
  margin-top: 1rem;
  overflow-y: auto;
  flex: 1;
}

/* ===== FIRETEAMS ==================================================== */
.fireteam-block {
  margin-bottom: 2rem;
}

.fireteam-title {
  margin-bottom: 0.6rem;
  font-size: 1.2rem;
  border-bottom: 1px solid #1e90ff;
  padding-bottom: 0.3rem;
}

/* ===== SLOTS ======================================================== */
.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.8rem;
}

.slot-card {
  background: rgba(0, 10, 30, 0.95);
  border-left: 4px solid #1e90ff;
  padding: 0.6rem 0.8rem;
  font-size: 0.85rem;
}

.slot-card.vacant {
  opacity: 0.6;
  border-left-color: #999;
}

.slot-card.closed {
  opacity: 0.4;
  border-left-color: #555;
  text-decoration: line-through;
}

.slot-role {
  font-weight: bold;
  color: #1e90ff;
}

.slot-name {
  margin-top: 0.2rem;
}

.slot-meta,
.slot-status {
  font-size: 0.75rem;
  opacity: 0.75;
}
</style>
