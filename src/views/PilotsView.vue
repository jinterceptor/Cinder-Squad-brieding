<template>
  <section id="members" class="section-container">
    <div style="height: 52px; overflow: hidden">
      <div class="section-header clipped-medium-backward-pilot">
        <img src="/icons/license.svg" alt="Members Icon" />
        <h1>UNIT ORBAT</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <div class="section-content-container">
      <div class="orbat-wrapper">

        <!-- Loading -->
        <div v-if="sortedHierarchy.length === 0">
          Loading squads and members...
        </div>

        <!-- Hierarchical ORBAT Groups -->
        <div v-else class="hierarchy-container">
          
          <!-- TOP: Chalk Actual -->
          <div class="orbat-row centered-row">
            <SquadTile
              v-if="hierarchy.chalkActual"
              :squad="hierarchy.chalkActual"
              @open="openSquad"
            />
          </div>

          <!-- Middle: Chalks -->
          <div class="orbat-row three-cols">
            <SquadTile
              v-for="sq in hierarchy.chalks"
              :key="sq.squad"
              :squad="sq"
              @open="openSquad"
            />
          </div>

          <!-- Support -->
          <div class="orbat-row three-cols">
            <SquadTile
              v-for="sq in hierarchy.support"
              :key="sq.squad"
              :squad="sq"
              @open="openSquad"
            />
          </div>

          <!-- Other categories -->
          <div class="orbat-row three-cols">
            <SquadTile
              v-for="sq in hierarchy.other"
              :key="sq.squad"
              :squad="sq"
              @open="openSquad"
            />
          </div>

        </div>
      </div>
    </div>

    <!-- ================= FULLSCREEN SQUAD MODAL ================= -->
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
              {{ descriptor(activeSquad.squad) }} ·
              {{ activeSquad.members.length }} PERSONNEL
            </p>
          </div>
          <div class="squad-tag">
            <span>{{ initials(activeSquad.squad) }}</span>
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
                    <span class="rank">{{ member.rank }}</span> · 
                    <span class="id">ID: {{ member.id || 'N/A' }}</span>
                  </p>
                </div>

                <!-- RANK INSIGNIA -->
                <img
                  v-if="rankIcon(member.rank)"
                  :src="rankIcon(member.rank)"
                  class="rank-icon"
                />
              </div>

              <div class="member-body">
                <div class="member-column left">
                  <p><strong>Squad:</strong> {{ member.squad || activeSquad.squad }}</p>
                  <p><strong>Join Date:</strong> {{ member.joinDate || 'Unknown' }}</p>
                  <p><strong>Status:</strong> {{ member.status || 'Active' }}</p>
                </div>

                <div class="member-column right">
                  <div class="cert-grid">
                    <div
                      v-for="(cert, idx) in certList(member)"
                      :key="idx"
                      class="cert-row"
                    >
                      <span class="cert-label">{{ cert.label }}</span>
                      <span class="cert-box" :class="{ yes: cert.value === 'Y' }"></span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="member-footer">
                <span>BIOMETRIC RECORD VALID</span>
                <span>UNSC DATABASE</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script>
import SquadTile from "@/components/SquadTile.vue"; // extracted tile component for cleanliness

export default {
  name: "PilotsView",
  props: {
    members: Array,
    orbat: Array,
  },

  components: { SquadTile },

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
    sortedHierarchy() {
      return this.orbat || [];
    },

    hierarchy() {
      const groups = {
        chalkActual: null,
        chalks: [],
        support: [],
        other: [],
      };

      for (const sq of this.sortedHierarchy) {
        const name = sq.squad.trim().toLowerCase();

        if (name === "chalk actual") groups.chalkActual = sq;
        else if (name.startsWith("chalk")) groups.chalks.push(sq);
        else if (
          name === "broadsword command" ||
          name === "wyvern air wing" ||
          name === "caladrius"
        ) {
          groups.support.push(sq);
        } else {
          groups.other.push(sq);
        }
      }

      // Sort categories for clean display
      groups.chalks.sort((a, b) => a.squad.localeCompare(b.squad));
      groups.support.sort((a, b) => a.squad.localeCompare(b.squad));
      groups.other.sort((a, b) => a.squad.localeCompare(b.squad));

      return groups;
    },
  },

  methods: {
    openSquad(sq) {
      this.activeSquad = sq;
    },
    closeSquad() {
      this.activeSquad = null;
    },

    initials(name) {
      return name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase();
    },

    descriptor(name) {
      const n = name.toLowerCase();

      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("air") || n.includes("wing")) return "AVIATION SUPPORT";
      if (n.includes("command")) return "COMMAND ELEMENT";

      return "UNSC ELEMENT";
    },

    rankIcon(rank) {
      if (!rank) return null;
      const cleaned = rank.replace(/[^a-z0-9]/gi, "").toUpperCase();
      return `/ranks/${cleaned}.png`;
    },

    certList(member) {
      return this.certLabels.map((label, i) => ({
        label,
        value: member.certifications?.[i] || "N",
      }));
    },
  },
};
</script>

<style scoped>
/* ORGANIZATION LAYOUT */
.hierarchy-container {
  width: 100%;
  margin-top: 2rem;
}

.orbat-row {
  display: flex;
  justify-content: center;
  gap: 2.5rem;
  margin-bottom: 3rem;
}

.centered-row {
  justify-content: center;
}

.three-cols {
  justify-content: center;
  display: grid;
  grid-template-columns: repeat(3, minmax(300px, 1fr));
  gap: 2.5rem;
}

/* MODAL (unchanged except for cert layout tweaks) */
.squad-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* Cert list vertical layout */
.cert-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cert-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cert-label {
  font-size: 0.8rem;
  opacity: 0.85;
}

.cert-box {
  width: 16px;
  height: 16px;
  border: 2px solid #1e90ff;
  border-radius: 3px;
}

.cert-box.yes {
  background: #1e90ff;
}
</style>
