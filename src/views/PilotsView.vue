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

    <div class="section-content-container">
      <div class="orbat-wrapper">
        <div v-if="!orbat || !orbat.length">
          Loading squads and members...
        </div>

        <div v-else class="hierarchy-container">
          <!-- BROADSWORD COMMAND -->
          <div
            v-if="hierarchy.command"
            class="orbat-row center-row actual-row"
          >
            <div class="squad-row single">
              <div
                class="squad-card"
                @click="openSquad(hierarchy.command)"
              >
                <div class="squad-header">
                  <div class="squad-insignia">
                    <span>{{ squadInitials(hierarchy.command.squad) }}</span>
                  </div>
                  <div class="squad-meta">
                    <h2>{{ hierarchy.command.squad }}</h2>
                    <p class="squad-subtitle">
                      {{ squadDescriptor(hierarchy.command.squad) }}
                    </p>
                    <p class="squad-count">
                      {{ personnelCount(hierarchy.command) }} PERSONNEL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CHALK ACTUAL -->
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
                      {{ personnelCount(hierarchy.chalkActual) }} PERSONNEL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CHALKS -->
          <div v-if="hierarchy.chalks.length" class="orbat-row chalk-row">
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
                      {{ personnelCount(sq) }} PERSONNEL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SUPPORT -->
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
                      {{ personnelCount(sq) }} PERSONNEL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- OTHER -->
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
                      {{ squadDescriptor(sq.squad) }}
                    </p>
                    <p class="squad-count">
                      {{ personnelCount(sq) }} PERSONNEL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FULLSCREEN SQUAD OVERLAY -->
    <div v-if="activeSquad" class="squad-overlay" @click.self="closeSquad">
      <div class="squad-modal">
        <div class="squad-modal-header">
          <div class="section-header clipped-medium-backward-bio">
            <img src="/icons/license.svg" />
            <h1>SQUAD ROSTER</h1>
          </div>
          <button class="squad-close" @click="closeSquad">✕</button>
        </div>

        <div class="squad-modal-scroll">
          <div
            v-for="ft in activeFireteams"
            :key="ft.name"
            class="fireteam-block"
          >
            <div class="fireteam-header">
              <span class="fireteam-title">
                {{ ft.name.toUpperCase() }}
              </span>
              <span class="fireteam-count">
                {{ ft.slots.length }} SLOTS
              </span>
            </div>

            <div class="squad-members-grid">
              <div
                v-for="(slot, idx) in ft.slots"
                :key="slotKey(slot, idx)"
                class="member-card"
              >
                <div class="member-header">
                  <div class="member-header-text">
                    <h3>{{ slot.member?.name || slot.status }}</h3>
                    <p class="rank-line">
                      <span class="rank">{{ slot.member?.rank || '' }}</span>
                      <span class="id">
                        {{ slot.member?.id || 'UNFILLED SLOT' }}
                      </span>
                    </p>
                  </div>
                </div>

                <div class="member-footer">
                  <span>UNSC ORBAT</span>
                  <span>BIOMETRIC VALID</span>
                </div>
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
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
  },

  data() {
    return {
      activeSquad: null,
    };
  },

  computed: {
    hierarchy() {
      const groups = {
        command: null,
        chalkActual: null,
        chalks: [],
        support: [],
        other: [],
      };

      (this.orbat || []).forEach((sq) => {
        const n = String(sq.squad || "").toLowerCase();

        if (n === "broadsword command") groups.command = sq;
        else if (n === "chalk actual") groups.chalkActual = sq;
        else if (n.startsWith("chalk ")) groups.chalks.push(sq);
        else if (["wyvern","caladrius","ifrit"].some(k => n.includes(k)))
          groups.support.push(sq);
        else groups.other.push(sq);
      });

      groups.chalks.sort((a,b)=>a.squad.localeCompare(b.squad, undefined, {numeric:true}));
      return groups;
    },

    activeFireteams() {
      if (!this.activeSquad) return [];

      if (this.activeSquad.fireteams?.length) {
        return this.activeSquad.fireteams;
      }

      const map = {};
      (this.activeSquad.members || []).forEach((m) => {
        const ft = m.fireteam || "Element";
        map[ft] ??= [];
        map[ft].push({ status: "FILLED", member: m });
      });

      return Object.entries(map).map(([name, slots]) => ({ name, slots }));
    },
  },

  methods: {
    openSquad(sq) {
      this.activeSquad = sq;
    },
    closeSquad() {
      this.activeSquad = null;
    },

    personnelCount(sq) {
      return (sq.members || []).length;
    },

    slotKey(slot, idx) {
      return slot.member?.id || idx;
    },

    squadInitials(name) {
      if (!name) return "UNSC";
      return name.split(" ").map(p=>p[0]).join("").toUpperCase();
    },

    squadDescriptor(name) {
      const n = String(name || "").toLowerCase();
      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("air") || n.includes("wyvern")) return "AVIATION SUPPORT";
      if (n.includes("command")) return "COMMAND ELEMENT";
      return "UNSC ELEMENT";
    },
  },
};
</script>

<style scoped>
/* unchanged styles – keep your existing CSS */
</style>
