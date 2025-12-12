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
    <div class="squad-meta-bar">
      <div class="squad-title">
        <h2>{{ squadName }}</h2>
        <p class="subtitle">
          {{ squadDescriptor(squadName) }} · {{ members.length }} PERSONNEL
        </p>
      </div>
      <div class="squad-tag">
        <span>{{ squadInitials(squadName) }}</span>
      </div>
    </div>

    <!-- Members grid -->
    <div class="squad-members-grid">
      <div
        v-for="member in members"
        :key="member.id || member.name"
        class="member-card"
      >
        <div class="member-header">
          <div>
            <h3>{{ member.name.toUpperCase() }}</h3>
            <p class="rank-line">
              <span class="rank">{{ member.rank }}</span>
              <span class="id">ID: {{ member.id || 'N/A' }}</span>
            </p>
          </div>
        </div>

        <div class="member-body">
          <div class="member-column left">
            <p><strong>Squad:</strong> {{ member.squad || squadName }}</p>
            <p><strong>Join Date:</strong> {{ member.joinDate || 'Unknown' }}</p>
            <p><strong>Status:</strong> {{ member.status || 'Active' }}</p>
            <p><strong>Slot:</strong> {{ member.squadAssignments || 'N/A' }}</p>
          </div>
          <div class="member-column right">
            <p><strong>Certifications:</strong></p>
            <div class="cert-tags">
              <span
                v-if="member.certifications?.length"
                v-for="(cert, idx) in member.certifications"
                :key="idx"
                class="cert-tag"
              >
                {{ cert }}
              </span>
              <span v-else class="cert-none">NO CERTS ON FILE</span>
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
</template>

<script>
export default {
  name: "SquadModal",
  props: {
    squadName: {
      type: String,
      required: true,
    },
    members: {
      type: Array,
      required: true,
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
.squad-modal {
  padding: 1.5rem 2rem 2rem 2rem;
  background-color: #050811;
  color: #dce6f1;
  font-family: "Consolas", "Courier New", monospace;
  max-height: 90vh;
  overflow-y: auto;
}

.squad-header-container {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.squad-header-container img {
  width: 48px;
  margin-right: 0.5rem;
}

/* Top bar */
.squad-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
  border-bottom: 1px solid rgba(30, 144, 255, 0.6);
  padding-bottom: 0.6rem;
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

/* Members grid inside modal */
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

/* Header */
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
