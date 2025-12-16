<template>
  <div class="squad-modal">
    <!-- Header -->
    <div class="squad-header-container">
      <div class="section-header clipped-medium-backward-bio">
        <img src="/icons/license.svg" />
        <h1>SQUAD ROSTER</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>
    </div>

    <!-- Squad meta -->
    <div class="squad-meta-bar" :class="{ invalid: false }">
      <div class="squad-title">
        <h2>{{ safeSquadName }}</h2>
        <p class="subtitle">
          {{ squadDescriptor(safeSquadName) }} · {{ safeMembers.length }} PERSONNEL
        </p>
      </div>
      <div class="squad-tag">
        <span>{{ squadInitials(safeSquadName) }}</span>
      </div>
    </div>

    <!-- Scrollable content area -->
    <div class="squad-scroll">
      <!-- Members grid -->
      <div class="squad-members-grid">
        <div
          v-for="m in safeMembers"
          :key="m.id || m.name || m._key"
          class="member-card"
          :class="{ vacant: m._status === 'VACANT', closed: m._status === 'CLOSED' }"
        >
          <!-- Header -->
          <div class="member-header">
            <div class="member-rank-insignia-wrapper" v-if="rankInsignia(m.rank)">
              <img :src="rankInsignia(m.rank)" :alt="m.rank + ' insignia'" class="member-rank-insignia" />
            </div>

            <div>
              <h3>{{ (m.name || 'UNKNOWN').toUpperCase() }}</h3>
              <p class="rank-line">
                <span class="rank">{{ m.rank || 'N/A' }}</span>
                <span class="id">ID: {{ m.id || 'N/A' }}</span>
              </p>
            </div>
          </div>

          <!-- Body -->
          <div class="member-body">
            <div class="member-column left">
              <p><strong>Squad:</strong> {{ m.squad || safeSquadName }}</p>
              <p><strong>Fireteam:</strong> {{ m.fireteam || 'Element' }}</p>
              <p><strong>Role:</strong> {{ m.slot || 'Unassigned' }}</p>
              <p><strong>Join Date:</strong> {{ m.joinDate || 'Unknown' }}</p>
              <p><strong>Status:</strong> {{ m.status || 'Active' }}</p>
            </div>

            <div class="member-column right">
              <p><strong>Certifications:</strong></p>
              <div class="cert-tags">
                <template v-if="m._certs && m._certs.length">
                  <span v-for="(c, idx) in m._certs" :key="idx" class="cert-tag">{{ c }}</span>
                </template>
                <span v-else class="cert-none">NO CERTS ON FILE</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="m.notes" class="member-notes">
            <p class="notes-label">NOTES / BIO</p>
            <div class="notes-body" v-html="m.notes" />
          </div>

          <!-- Footer -->
          <div class="member-footer">
            <span>BIOMETRIC RECORD VALID</span>
            <span>UNSC SYSTEMS DATABASE</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Minimal defensive normalization so tiles never crash.
// Why: Upstream data sometimes has "Y/N" flags for certifications, missing names/ids, and no "squadAssignments".
export default {
  name: "SquadModal",
  props: {
    squadName: { type: String, required: true },
    members: { type: Array, required: true },
    // Optional: pass your labels from parent to stay in sync with PilotsView
    certLabels: {
      type: Array,
      default: () => [
        "Rifleman","Machine Gunner","Anti Tank","Corpsmen","Combat Engineer",
        "Marksman","Breacher","Grenadier","Pilot","RTO","PJ","NCO","Officer",
      ],
    },
  },
  computed: {
    safeSquadName() {
      return String(this.squadName || "").trim() || "UNSC ELEMENT";
    },
    safeMembers() {
      return (this.members || []).map((m, idx) => {
        const name = typeof m?.name === "string" && m.name.trim() ? m.name.trim() : "Unknown";
        const id = m?.id || null;
        const rank = m?.rank || "";
        const status = m?.status || "Active";

        // Slot/role: accept either `slot` or legacy `squadAssignments`
        const slot = m?.slot || m?.squadAssignments || "";

        // Certifications: accept "Y/N" flags array (aligns with PilotsView) OR array of strings already
        let certs = [];
        if (Array.isArray(m?.certifications)) {
          const arr = m.certifications;
          if (arr.length && typeof arr[0] === "string" && (arr[0] === "Y" || arr[0] === "N")) {
            certs = arr
              .map((flag, i) => (String(flag).toUpperCase() === "Y" ? this.certLabels[i] : null))
              .filter(Boolean);
          } else if (arr.length && typeof arr[0] === "string") {
            certs = arr.filter(Boolean); // assume already label-like
          }
        }

        // Normalize slot status when this component is reused from a slots view
        const _status = String(m?.status || (m?.member ? "FILLED" : "")).toUpperCase();
        return {
          ...m,
          _key: `${name}-${idx}`,
          name,
          id,
          rank,
          status,
          slot,
          _certs: certs,
          _status,
        };
      });
    },
  },
  methods: {
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
      const n = String(name || "").toLowerCase();
      if (n.includes("chalk")) return "INFANTRY ELEMENT";
      if (n.includes("command") || n.includes("actual") || n.includes("hq")) return "COMMAND ELEMENT";
      if (n.includes("air") || n.includes("wing") || n.includes("wyvern") || n.includes("pilot")) return "AVIATION SUPPORT";
      return "UNSC ELEMENT";
    },

    // Match the insignia mapping you used on the roster view
    rankCode(rank) {
      if (!rank) return null;
      const key = String(rank).trim().toUpperCase();
      const map = {
        RCT: "Rct", PVT: "Pvt", PFC: "PFC", SPC: "Spc", SPC2: "Spc2", SPC3: "Spc3", SPC4: "Spc4",
        LCPL: "LCpl", CPL: "Cpl", SGT: "Sgt", SSGT: "SSgt", GYSGT: "GySgt",
        WO: "WO", CWO2: "CWO2", CWO3: "CWO3", CWO4: "CWO4", CWO5: "CWO5",
        "2NDLT": "2ndLt", "1STLT": "1stLt", CAPT: "Capt", MAJ: "Maj",
        HR: "HR", HA: "HA", HN: "HN", HM3: "HM3", HM2: "HM2", HM1: "HM1", HMC: "HMC",
      };
      return map[key] || null;
    },
    rankInsignia(rank) {
      const base = this.rankCode(rank);
      return base ? `/ranks/${base}.png` : null;
    },
  },
};
</script>

<style scoped>
.squad-modal {
  padding: 1.5rem 2rem 2rem 2rem;
  background-color: #050811;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;

  max-height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* Header strip */
.squad-header-container {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.squad-header-container img {
  width: 48px;
  margin-right: 0.5rem;
}

/* Top meta bar */
.squad-meta-bar {
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
.squad-scroll {
  margin-top: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

/* Members grid inside scroll */
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

.member-card.vacant,
.member-card.closed {
  opacity: 0.75;
}

.member-card.vacant .rank-line,
.member-card.closed .rank-line {
  color: #cfdcea;
}

/* Header */
.member-header {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: .9rem;
}

.member-rank-insignia {
  width: 44px;
  height: 44px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(0,0,0,0.6));
}

.member-header h3 {
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
.cert-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-top: 0.2rem;
}

.cert-tag {
  background: #1e90ff;
  color: #fff;
  padding: 0.18rem 0.45rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
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
