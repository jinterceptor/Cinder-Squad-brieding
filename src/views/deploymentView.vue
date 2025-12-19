<template>
  <div
    id="deploymentView"
    class="content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- LEFT COLUMN: DEPLOYMENT GROUPS -->
    <section id="deploy-groups" class="section-container">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>DEPLOYMENT</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container">
        <div class="panel">
          <div class="groups">
            <div v-for="g in plan.units" :key="g.key" class="group-card">
              <div class="group-head">
                <h2 class="group-title" :title="g.title">{{ g.title }}</h2>
                <div class="group-actions">
                  <button class="ghost small" @click="clearGroup(g.key)">Clear</button>
                </div>
              </div>

              <div class="slots-grid">
                <div
                  v-for="(slot, sIdx) in g.slots"
                  :key="sIdx"
                  class="slot"
                >
                  <div class="slot-topline">
                    <span class="slot-tag">#{{ sIdx + 1 }}</span>
                    <button class="ghost xsmall" v-if="slot.id" @click="clearSlot(g.key, sIdx)">Clear</button>
                  </div>

                  <div class="slot-body">
                    <div class="slot-name" :title="slot.name || 'Empty'">
                      {{ slot.name || '— Empty —' }}
                    </div>
                    <button class="primary pick" @click="openPicker(g.key, sIdx)">
                      {{ slot.id ? 'Swap' : 'Assign' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- FOOTER ACTIONS -->
          <div class="actions-row">
            <button class="ghost" @click="resetPlan">Reset</button>
            <button class="ghost" @click="exportJson">Export JSON</button>
          </div>
        </div>
      </div>
    </section>

    <!-- RIGHT COLUMN: (OPTIONAL) Help / Summary -->
    <section id="deploy-side" class="section-container">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>TOOLS</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container">
        <div class="panel">
          <div class="tools">
            <div class="tool-block">
              <h3 class="tool-title">Quick Tips</h3>
              <ul class="tips">
                <li>Click a slot to assign or swap a soldier.</li>
                <li>Soldiers can only occupy one slot across all groups.</li>
                <li>Use “Clear” to free a slot.</li>
                <li>Draft autosaves in your browser until reset.</li>
              </ul>
            </div>
            <div class="tool-block">
              <h3 class="tool-title">Summary</h3>
              <div class="summary">
                <div
                  v-for="g in plan.units"
                  :key="g.key"
                  class="summary-row"
                >
                  <span class="label">{{ g.title }}</span>
                  <span class="value">
                    {{ g.slots.filter(s => !!s.id).length }} / {{ g.slots.length }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>        
      </div>
    </section>

    <!-- PICKER MODAL -->
    <div v-if="picker.open" class="picker-veil" @click.self="closePicker">
      <div class="picker">
        <div class="picker-head">
          <h3>
            {{ currentSlotTitle }}
            <span class="muted">— select soldier</span>
          </h3>
          <button class="ghost" @click="closePicker">Close</button>
        </div>

        <div class="picker-controls">
          <input
            v-model="picker.query"
            placeholder="Search by name / callsign / role"
            class="search"
            @keydown.stop
          />
          <label class="check">
            <input type="checkbox" v-model="picker.onlyFree" />
            Show only unassigned
          </label>
        </div>

        <div class="picker-list">
          <div
            v-for="p in filteredPersonnel"
            :key="p.id"
            class="pick-row"
            :class="{ assigned: !!findAssignment(p.id) }"
          >
            <div class="pick-info">
              <div class="p-name" :title="p.name">{{ p.name }}</div>
              <div class="p-meta">
                <span v-if="p.callsign" class="subtle">{{ p.callsign }}</span>
                <span v-if="p.role" class="subtle">• {{ p.role }}</span>
              </div>
            </div>

            <div class="pick-status">
              <span v-if="findAssignment(p.id)" class="badge">
                Assigned: {{ formatAssignment(findAssignment(p.id)) }}
              </span>
            </div>

            <div class="pick-actions">
              <button class="primary small" @click="selectPersonnel(p)">Select</button>
            </div>
          </div>
        </div>

        <div class="picker-foot">
          <button class="ghost" @click="clearCurrentSlot">Clear slot</button>
          <span class="muted">Selecting someone already assigned will swap them.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * DeploymentView
 * - UI-only draft planner for Chalks, Caladrius, Wyvern
 * - Swaps/assigns any soldier into any slot
 * - Persists to sessionStorage under "deploymentPlan"
 * - Integrate your roster: replace getAllPersonnel() with your real source
 */
export default {
  name: "DeploymentView",
  props: {
    // Optional: inject roster from parent; else falls back to demo data.
    allPersonnel: { type: Array, default: null },
  },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",

      plan: {
        units: [], // [{key,title,slots:[{id,name}]}]
      },

      picker: {
        open: false,
        unitKey: "",
        slotIdx: -1,
        query: "",
        onlyFree: false,
      },

      personnel: [], // normalized: [{id,name,callsign?,role?}]
      STORAGE_KEY: "deploymentPlan",
    };
  },
  created() {
    this.personnel = this.normalizePersonnel(this.allPersonnel || this.getAllPersonnel());
    this.plan.units = this.loadOrInitPlan();
  },
  mounted() {
    this.triggerFlicker(0);
  },
  computed: {
    currentSlotTitle() {
      if (!this.picker.open) return "";
      const g = this.plan.units.find(u => u.key === this.picker.unitKey);
      if (!g) return "";
      return `${g.title} #${this.picker.slotIdx + 1}`;
    },
    filteredPersonnel() {
      const q = this.picker.query.trim().toLowerCase();
      const rows = this.personnel.filter(p => {
        if (!q) return true;
        return (
          (p.name || "").toLowerCase().includes(q) ||
          (p.callsign || "").toLowerCase().includes(q) ||
          (p.role || "").toLowerCase().includes(q)
        );
      });
      if (this.picker.onlyFree) {
        return rows.filter(p => !this.findAssignment(p.id));
      }
      return rows;
    },
  },
  methods: {
    triggerFlicker(delayMs = 0) {
      this.animateView = false;
      this.animationDelay = `${delayMs}ms`;
      this.$nextTick(() => requestAnimationFrame(() => (this.animateView = true)));
    },

    // --- Personnel source (replace with your real roster loader later) ---
    getAllPersonnel() {
      // TODO: wire to your Pilots/roster source. This is placeholder data.
      const demo = [
        { id: "100", name: "M. Jinter", callsign: "JINTER", role: "Rifleman" },
        { id: "101", name: "A. Avery", callsign: "AVERY", role: "Grenadier" },
        { id: "102", name: "K. Varga", callsign: "VARGA", role: "AT" },
        { id: "103", name: "S. Doyle", callsign: "DOYLE", role: "Medic" },
        { id: "104", name: "R. Pike", callsign: "PIKE", role: "MG" },
        { id: "105", name: "B. Nash", callsign: "NASH", role: "Pilot" },
        { id: "106", name: "T. Roman", callsign: "ROMAN", role: "CE" },
        { id: "107", name: "Y. Carter", callsign: "CARTER", role: "Breacher" },
        { id: "108", name: "D. Quinn", callsign: "QUINN", role: "RTO" },
        { id: "109", name: "H. Wyre", callsign: "WYRE", role: "Armor" },
      ];
      return demo;
    },
    normalizePersonnel(rows) {
      return (rows || [])
        .map((r, i) => ({
          id: String(r.id ?? i + 1),
          name: String(r.name ?? r.displayName ?? r.username ?? "Unknown"),
          callsign: r.callsign ? String(r.callsign) : "",
          role: r.role ? String(r.role) : "",
        }))
        .filter(x => !!x.id && !!x.name);
    },

    // --- Plan init / persistence ---
    loadOrInitPlan() {
      const saved = sessionStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.units)) return parsed.units;
        } catch {}
      }
      // New plan with sensible slot counts (adjust easily):
      return [
        { key: "chalk1", title: "Chalk 1", slots: this.makeEmptySlots(8) },
        { key: "chalk2", title: "Chalk 2", slots: this.makeEmptySlots(8) },
        { key: "chalk3", title: "Chalk 3", slots: this.makeEmptySlots(8) },
        { key: "caladrius", title: "Caladrius", slots: this.makeEmptySlots(4) },
        { key: "wyvern", title: "Wyvern", slots: this.makeEmptySlots(4) },
      ];
    },
    makeEmptySlots(n) {
      return Array.from({ length: n }, () => ({ id: null, name: null }));
    },
    persistPlan() {
      try {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.plan));
      } catch {}
    },

    // --- Slots / Picker ---
    openPicker(unitKey, slotIdx) {
      this.picker.unitKey = unitKey;
      this.picker.slotIdx = slotIdx;
      this.picker.query = "";
      this.picker.onlyFree = false;
      this.picker.open = true;
    },
    closePicker() {
      this.picker.open = false;
    },

    // Find where a soldier currently sits
    findAssignment(personId) {
      for (const g of this.plan.units) {
        const idx = g.slots.findIndex(s => s.id === personId);
        if (idx >= 0) return { unitKey: g.key, slotIdx: idx, title: g.title };
      }
      return null;
    },
    formatAssignment(a) {
      return `${a.title} #${a.slotIdx + 1}`;
    },

    // Slot actions
    selectPersonnel(p) {
      if (!this.picker.open) return;

      const from = this.findAssignment(p.id); // may be null
      const g = this.plan.units.find(u => u.key === this.picker.unitKey);
      if (!g) return;
      const target = g.slots[this.picker.slotIdx];

      // Case 1: target occupied and picked is assigned elsewhere => swap
      if (from && target?.id && !(from.unitKey === g.key && from.slotIdx === this.picker.slotIdx)) {
        const srcGroup = this.plan.units.find(u => u.key === from.unitKey);
        const tmp = { ...target };
        // put p into target
        target.id = p.id; target.name = p.name;
        // put tmp into source
        srcGroup.slots[from.slotIdx] = { id: tmp.id, name: tmp.name };
      }
      // Case 2: picked already here => no-op
      else if (from && from.unitKey === g.key && from.slotIdx === this.picker.slotIdx) {
        // nothing
      }
      // Case 3: target occupied, picked free => replace target (free previous)
      else if (!from && target?.id) {
        target.id = p.id; target.name = p.name;
      }
      // Case 4: target empty, picked assigned elsewhere => move
      else if (from && !target?.id) {
        const srcGroup = this.plan.units.find(u => u.key === from.unitKey);
        // clear source
        srcGroup.slots[from.slotIdx] = { id: null, name: null };
        // move to target
        target.id = p.id; target.name = p.name;
      }
      // Case 5: target empty, picked free => assign
      else if (!from && !target?.id) {
        target.id = p.id; target.name = p.name;
      }

      this.persistPlan();
      this.closePicker();
    },
    clearSlot(unitKey, slotIdx) {
      const g = this.plan.units.find(u => u.key === unitKey);
      if (!g) return;
      g.slots[slotIdx] = { id: null, name: null };
      this.persistPlan();
    },
    clearGroup(unitKey) {
      const g = this.plan.units.find(u => u.key === unitKey);
      if (!g) return;
      g.slots = g.slots.map(() => ({ id: null, name: null }));
      this.persistPlan();
    },
    clearCurrentSlot() {
      if (!this.picker.open) return;
      this.clearSlot(this.picker.unitKey, this.picker.slotIdx);
      this.closePicker();
    },

    // Utilities
    resetPlan() {
      this.plan.units = this.loadOrInitPlan();
      this.persistPlan();
    },
    exportJson() {
      const payload = JSON.stringify(this.plan, null, 2);
      // simple download
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "deployment-plan.json"; a.click();
      URL.revokeObjectURL(url);
    },
  },
  watch: {
    plan: {
      deep: true,
      handler() { this.persistPlan(); },
    },
  },
};
</script>

<style scoped>
/* Page layout: two columns similar to other views */
#deploymentView {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 1.2rem;
  align-items: start;
  padding-top: 28px;
  padding-left: 18px;
  padding-right: 18px;
}

/* common shells */
.header-shell { height: 52px; overflow: hidden; }
.panel {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.18);
  border-radius: .6rem;
  padding: .8rem .9rem;
}
.muted { color: #9ec5e6; }

/* Groups */
.groups {
  display: grid;
  gap: 1rem;
}
.group-card {
  border: 1px solid rgba(30,144,255,0.28);
  background: rgba(0,10,30,0.28);
  border-radius: .6rem;
  padding: .7rem .8rem;
  display: grid;
  gap: .6rem;
}
.group-head {
  display: flex; align-items: center; gap: .6rem;
}
.group-title {
  margin: 0; color: #d9ebff; text-transform: uppercase; letter-spacing: .12em;
  font-size: 1.02rem; line-height: 1.2;
  flex: 1 1 auto;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.group-actions { display: flex; gap: .4rem; }

/* Slots */
.slots-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: .6rem;
}
@media (max-width: 1400px) { .slots-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 900px)  { .slots-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.slot {
  border: 1px solid rgba(30,144,255,0.25);
  background: rgba(0,10,30,0.22);
  border-radius: .55rem;
  padding: .55rem .6rem;
  display: grid; gap: .45rem;
}
.slot-topline {
  display: flex; align-items: center; gap: .5rem;
}
.slot-tag {
  font-size: .78rem; letter-spacing: .12em; color: #9ec5e6;
}
.slot-body {
  display: grid; gap: .45rem;
}
.slot-name {
  color: #e6f3ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  min-height: 1.2em;
}
button.primary.pick { width: 100%; }

/* Buttons */
button {
  cursor: pointer;
  border-radius: .45rem;
  border: 1px solid rgba(30,144,255,0.38);
  background: rgba(0,10,30,0.35);
  color: #e6f3ff;
  padding: .34rem .6rem;
  font-size: .88rem;
}
button.primary {
  border-color: rgba(120,255,170,0.55);
  background: rgba(20,60,35,0.45);
  color: #cffff0;
}
button.ghost {
  border-color: rgba(30,144,255,0.28);
  background: rgba(0,0,0,0.2);
  color: #d9ebff;
}
button.small { padding: .25rem .5rem; font-size: .82rem; }
button.xsmall { padding: .18rem .4rem; font-size: .76rem; }

/* Tools right column */
.tools { display: grid; gap: .9rem; }
.tool-title { margin: 0 0 .3rem; color: #d9ebff; letter-spacing: .1em; }
.tips { margin: 0; padding-left: 1rem; color: #cfe7ff; }
.summary { display: grid; gap: .25rem; }
.summary-row { display: flex; justify-content: space-between; color: #e6f3ff; }
.summary-row .label { color: #9ec5e6; }

/* Picker modal */
.picker-veil {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: grid; place-items: center; z-index: 50;
}
.picker {
  width: min(880px, 92vw);
  max-height: 80vh;
  overflow: hidden;
  border-radius: .8rem;
  border: 1px solid rgba(30,144,255,0.45);
  background: rgba(0, 10, 30, 0.95);
  display: grid; grid-template-rows: auto auto 1fr auto;
}
.picker-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: .8rem .9rem; border-bottom: 1px solid rgba(30,144,255,0.25);
}
.picker-controls {
  display: flex; gap: .8rem; align-items: center;
  padding: .6rem .9rem; border-bottom: 1px solid rgba(30,144,255,0.18);
}
.picker-controls .search {
  flex: 1 1 auto; padding: .5rem .6rem; border-radius: .45rem;
  border: 1px solid rgba(30,144,255,0.3);
  background: rgba(0,10,30,0.3); color: #e6f3ff;
}
.check { display: flex; align-items: center; gap: .4rem; color: #cfe7ff; }

.picker-list {
  overflow: auto; padding: .6rem .4rem;
  display: grid; gap: .4rem;
}
.pick-row {
  display: grid; grid-template-columns: 1fr auto auto; gap: .6rem;
  align-items: center;
  border: 1px solid rgba(30,144,255,0.25);
  background: rgba(0,10,30,0.2);
  border-radius: .5rem;
  padding: .5rem .6rem;
}
.pick-row.assigned { background: rgba(30,144,255,0.08); }
.p-name { color: #e6f3ff; font-weight: 600; }
.p-meta .subtle { color: #9ec5e6; font-size: .86rem; }
.badge {
  color: #79ffba; border: 1px solid rgba(120,255,170,0.55);
  border-radius: 999px; padding: .1rem .5rem; font-size: .78rem;
}
.pick-actions { display: flex; align-items: center; }
.picker-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: .6rem .9rem; border-top: 1px solid rgba(30,144,255,0.18);
}

/* Responsive stack */
@media (max-width: 1100px) {
  #deploymentView { grid-template-columns: 1fr; padding-left: 12px; padding-right: 12px; }
}
</style>
