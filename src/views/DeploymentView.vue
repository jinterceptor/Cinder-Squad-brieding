<!-- src/views/DeploymentView.vue -->
<template>
  <div
    id="deploymentView"
    class="content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- LEFT: DEPLOYMENT (own window) -->
    <section id="deploy-main" class="section-container deployment-window">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>DEPLOYMENT</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container" :class="{ animate: animateView }">
        <div class="panel">
          <div v-if="!selectedSquads.length" class="muted">
            No squads found. Ensure ORBAT includes Chalks / Wyvern / Caladrius.
          </div>

          <div class="groups">
            <div v-for="g in plan.units" :key="g.key" class="group-card">
              <div class="group-head">
                <h2 class="group-title" :title="g.title">
                  {{ g.title }}
                  <span class="subcount">({{ filledCount(g) }}/{{ g.slots.length }})</span>
                </h2>
                <div class="group-actions">
                  <button class="ghost small" @click="clearGroup(g.key)">Clear</button>
                  <button class="ghost small" @click="fillFromRoster(g.key)">Auto-fill</button>
                </div>
              </div>

              <div class="slots-grid">
                <div
                  v-for="(slot, sIdx) in g.slots"
                  :key="`slot-${g.key}-${sIdx}`"
                  class="slot"
                  :class="{ vacant: slot.origStatus === 'VACANT', closed: slot.origStatus === 'CLOSED' }"
                >
                  <div class="slot-topline">
                    <span class="slot-tag">#{{ sIdx + 1 }}</span>
                    <span class="slot-role" :title="slot.role || 'Slot'">{{ slot.role || 'Slot' }}</span>
                    <button class="ghost xsmall" v-if="slot.id" @click="clearSlot(g.key, sIdx)">Clear</button>
                  </div>

                  <div class="slot-body">
                    <div class="slot-name" :title="displayName(slot)">
                      {{ displayName(slot) }}
                    </div>
                    <button
                      class="primary pick"
                      :disabled="slot.origStatus === 'CLOSED'"
                      @click="openPicker(g.key, sIdx)"
                    >
                      {{ slot.id ? 'Swap' : (slot.origStatus === 'CLOSED' ? 'Closed' : 'Assign') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="actions-row">
            <button class="ghost" @click="resetPlan">Reset</button>
            <button class="ghost" @click="exportJson">Export JSON</button>
          </div>
        </div>
      </div>
    </section>

    <!-- RIGHT: OVERVIEW (own window) -->
    <section id="deploy-overview" class="section-container overview-window">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/events.svg" alt="" />
          <h1>OVERVIEW</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container" :class="{ animate: animateView }">
        <div class="panel">
          <div class="overview">
            <div class="summary">
              <div v-for="g in plan.units" :key="`sum-${g.key}`" class="summary-row">
                <span class="label">{{ g.title }}</span>
                <span class="value">{{ filledCount(g) }} / {{ g.slots.length }}</span>
              </div>

              <div class="summary-row total">
                <span class="label">Assigned</span>
                <span class="value">{{ totalAssigned }} / {{ totalSlots }}</span>
              </div>
              <div class="summary-row total">
                <span class="label">Unassigned pool</span>
                <span class="value">{{ unassignedCount }}</span>
              </div>
            </div>

            <div class="ov-actions">
              <button class="ghost small" @click="resetPlan">Reset Plan</button>
              <button class="ghost small" @click="exportJson">Export JSON</button>
            </div>

            <div class="ov-free" v-if="freePersonnel.length">
              <h4 class="ov-subtitle">Free Personnel ({{ freePersonnel.length }})</h4>
              <ul class="free-list">
                <li v-for="p in freePersonnel.slice(0, 16)" :key="`free-${p.id}`">
                  <span class="name" :title="p.name">{{ p.name }}</span>
                  <span class="meta" v-if="p.role">· {{ p.role }}</span>
                </li>
              </ul>
              <div v-if="freePersonnel.length > 16" class="muted small">
                +{{ freePersonnel.length - 16 }} more…
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
export default {
  name: "DeploymentView",
  props: {
    animate:  { type: Boolean, default: true },
    members:  { type: Array,   default: () => [] },
    orbat:    { type: Array,   default: () => [] }, // same feed PilotsView uses
  },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",

      plan: { units: [] },

      picker: { open: false, unitKey: "", slotIdx: -1, query: "", onlyFree: false },

      personnel: [],
      STORAGE_KEY: "deploymentPlan",
      MIN_CHALK_SLOTS: 12,
    };
  },
  created() {
    this.personnel = this.buildPersonnelPool();
    this.plan.units = this.loadOrInitPlan(); // auto-fill from current ORBAT
  },
  mounted() { this.triggerFlicker(0); },
  computed: {
    selectedSquads() {
      const wanted = new Set(["chalk 1","chalk 2","chalk 3","chalk 4","wyvern","caladrius"]);
      const rows = (this.orbat || []).filter(sq => wanted.has(String(sq.squad||"").trim().toLowerCase()));
      rows.sort((a,b)=>String(a.squad).localeCompare(String(b.squad), undefined, { numeric:true }));
      return rows;
    },
    currentSlotTitle() {
      if (!this.picker.open) return "";
      const g = this.plan.units.find(u => u.key === this.picker.unitKey);
      return g ? `${g.title} #${this.picker.slotIdx + 1}` : "";
    },
    filteredPersonnel() {
      const q = this.picker.query.trim().toLowerCase();
      const base = this.personnel.filter(p =>
        !q ||
        (p.name||"").toLowerCase().includes(q) ||
        (p.callsign||"").toLowerCase().includes(q) ||
        (p.role||"").toLowerCase().includes(q)
      );
      return this.picker.onlyFree ? base.filter(p => !this.findAssignment(p.id)) : base;
    },

    totalSlots() { return this.plan.units.reduce((n,g)=>n+g.slots.length,0); },
    totalAssigned() { return this.plan.units.reduce((n,g)=>n+g.slots.filter(s=>!!s.id).length,0); },
    freePersonnel() { return this.personnel.filter(p=>!this.findAssignment(p.id)); },
    unassignedCount() { return this.freePersonnel.length; },
  },
  methods: {
    triggerFlicker(delayMs = 0) {
      this.animateView = false;
      this.animationDelay = `${delayMs}ms`;
      this.$nextTick(()=>requestAnimationFrame(()=>this.animateView = true));
    },

    buildPersonnelPool() {
      const pool = [];
      if (this.members?.length) {
        this.members.forEach((m,i)=>{
          const id = String(m.id ?? i+1);
          const nm = String(m.name ?? m.displayName ?? m.username ?? "Unknown");
          const cs = String(m.callsign || "");
          const rl = String(m.slot || m.role || "");
          if (id && nm) pool.push({ id, name:nm, callsign:cs, role:rl });
        });
      } else {
        (this.orbat||[]).forEach(sq=>{
          (sq.fireteams||[]).forEach(ft=>{
            (ft.slots||[]).forEach((s,idx)=>{
              if (s?.status === "FILLED" && s.member) {
                const id = String(s.member.id ?? `${sq.squad}-${ft.name}-${idx}`);
                const nm = String(s.member.name || "Unknown");
                const cs = String(s.member.callsign || "");
                const rl = String(s.role || s.member.slot || "");
                if (id && nm) pool.push({ id, name:nm, callsign:cs, role:rl });
              }
            });
          });
        });
      }
      const seen = new Set(); const out=[];
      for (const p of pool) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
      return out;
    },

    loadOrInitPlan() {
      const saved = sessionStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.units)) {
            this.padChalks(parsed.units); // keep ≥12 for chalks
            return parsed.units;
          }
        } catch {}
      }
      return this.buildUnitsFromOrbat(); // fresh auto-fill from live ORBAT
    },

    buildUnitsFromOrbat() {
      const units = [];
      this.selectedSquads.forEach((sq)=>{
        const key = this.keyFromName(sq.squad);

        // slots exactly from ORBAT
        const fromRoster = [];
        (sq.fireteams||[]).forEach(ft=>{
          (ft.slots||[]).forEach((s)=>{
            const status = String(s?.status || "FILLED").toUpperCase();
            const origStatus = ["VACANT","CLOSED"].includes(status) ? status : "FILLED";
            const member = s?.member;
            fromRoster.push({
              id: member?.id ? String(member.id) : null,
              name: member?.name || null,
              role: s?.role || member?.slot || "",
              origStatus,
            });
          });
        });

        // add Chalk Actual (prefer SL/Actual), then pad chalks to 12
        const withActual = this.isChalk(sq.squad)
          ? this.injectChalkActual(sq, fromRoster)
          : fromRoster;

        const finalSlots = this.isChalk(sq.squad)
          ? this.padSlots(withActual, this.MIN_CHALK_SLOTS)
          : withActual;

        units.push({ key, title: sq.squad, slots: finalSlots });
      });
      return units;
    },

    // Used by Auto-fill button — rebuild that one unit from the same ORBAT feed PilotsView uses
    buildUnitFromOrbatByKey(unitKey) {
      const unit = this.selectedSquads.find(sq => this.keyFromName(sq.squad) === unitKey);
      if (!unit) return null;

      const fromRoster = [];
      (unit.fireteams||[]).forEach(ft=>{
        (ft.slots||[]).forEach((s)=>{
          const status = String(s?.status || "FILLED").toUpperCase();
          const origStatus = ["VACANT","CLOSED"].includes(status) ? status : "FILLED";
          const member = s?.member;
          fromRoster.push({
            id: member?.id ? String(member.id) : null,
            name: member?.name || null,
            role: s?.role || member?.slot || "",
            origStatus,
          });
        });
      });

      const withActual = this.isChalk(unit.squad)
        ? this.injectChalkActual(unit, fromRoster)
        : fromRoster;

      const finalSlots = this.isChalk(unit.squad)
        ? this.padSlots(withActual, this.MIN_CHALK_SLOTS)
        : withActual;

      return { key: unitKey, title: unit.squad, slots: finalSlots };
    },

    injectChalkActual(sq, slots) {
      // why: put "Actual" at slot 1; try find SL/Actual in ORBAT, else leave vacant
      const roleMatch = /(^|\b)(actual|sl|squad\s*leader)(\b|$)/i;
      let actual = null, idx = -1;

      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const r = String(s?.role || "");
        if (!actual && roleMatch.test(r) && s?.id && s?.name) {
          actual = { id: String(s.id), name: s.name, role: r, origStatus: "FILLED" };
          idx = i;
          break;
        }
      }

      const out = slots.slice();
      if (actual) {
        out.splice(idx, 1); // remove original
        out.unshift(actual); // add as first
      } else {
        out.unshift({ id: null, name: null, role: "Actual", origStatus: "VACANT" });
      }
      return out;
    },

    padSlots(arr, min) {
      const out = arr.slice();
      const need = Math.max(0, min - out.length);
      for (let i = 0; i < need; i++) {
        out.push({ id: null, name: null, role: "", origStatus: "VACANT" });
      }
      return out;
    },

    padChalks(units) {
      for (const u of units) {
        if (this.isChalk(u.title)) u.slots = this.padSlots(u.slots, this.MIN_CHALK_SLOTS);
      }
    },

    isChalk(title) { return /chalk\s*\d+/i.test(String(title || "")); },

    persistPlan() { try { sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.plan)); } catch {} },

    keyFromName(name){ return String(name||"").trim().toLowerCase().replace(/\s+/g,"-"); },
    filledCount(g){ return g.slots.reduce((n,s)=>n+(s.id?1:0),0); },
    displayName(slot){ return slot.name || (slot.origStatus==="VACANT" ? "— Vacant —" : "— Empty —"); },

    openPicker(unitKey, slotIdx){
      const g = this.plan.units.find(u=>u.key===unitKey);
      if (!g) return;
      const slot = g.slots[slotIdx];
      if (slot?.origStatus==="CLOSED") return; // why: block closed slots
      this.picker = { ...this.picker, open:true, unitKey, slotIdx, query:"", onlyFree:false };
    },
    closePicker(){ this.picker.open = false; },

    findAssignment(personId){
      for (const g of this.plan.units) {
        const idx = g.slots.findIndex(s=>s.id===personId);
        if (idx>=0) return { unitKey:g.key, slotIdx:idx, title:g.title };
      }
      return null;
    },
    formatAssignment(a){ return `${a.title} #${a.slotIdx+1}`; },

    selectPersonnel(p){
      if (!this.picker.open) return;
      const from = this.findAssignment(p.id);
      const g = this.plan.units.find(u=>u.key===this.picker.unitKey);
      if (!g) return;
      const target = g.slots[this.picker.slotIdx];

      if (from && target?.id && !(from.unitKey===g.key && from.slotIdx===this.picker.slotIdx)) {
        const srcGroup = this.plan.units.find(u=>u.key===from.unitKey);
        const tmp = { ...target };
        target.id = p.id; target.name = p.name; target.role ||= p.role || "";
        srcGroup.slots[from.slotIdx] = { ...srcGroup.slots[from.slotIdx], id: tmp.id, name: tmp.name };
      } else if (!from && target?.id) {
        target.id = p.id; target.name = p.name; target.role ||= p.role || "";
      } else if (from && !target?.id) {
        const srcGroup = this.plan.units.find(u=>u.key===from.unitKey);
        srcGroup.slots[from.slotIdx] = { ...srcGroup.slots[from.slotIdx], id:null, name:null };
        target.id = p.id; target.name = p.name; target.role ||= p.role || "";
      } else if (!from && !target?.id) {
        target.id = p.id; target.name = p.name; target.role ||= p.role || "";
      }

      this.persistPlan();
      this.closePicker();
    },

    clearSlot(unitKey, slotIdx){
      const g = this.plan.units.find(u=>u.key===unitKey);
      if (!g) return;
      g.slots[slotIdx] = { ...g.slots[slotIdx], id:null, name:null };
      this.persistPlan();
    },
    clearGroup(unitKey){
      const g = this.plan.units.find(u=>u.key===unitKey);
      if (!g) return;
      g.slots = g.slots.map(s=>({ ...s, id:null, name:null }));
      this.persistPlan();
    },

    // UPDATED: one-click restore from the same ORBAT used by PilotsView
    fillFromRoster(unitKey){
      const rebuilt = this.buildUnitFromOrbatByKey(unitKey);
      const g = this.plan.units.find(u=>u.key===unitKey);
      if (!g || !rebuilt) return;
      g.title = rebuilt.title;
      g.slots = rebuilt.slots;
      this.persistPlan();
      this.triggerFlicker(0); // small visual confirmation
    },

    resetPlan(){
      this.plan.units = this.buildUnitsFromOrbat();
      this.persistPlan();
      this.triggerFlicker(0);
    },

    exportJson(){
      const payload = JSON.stringify(this.plan, null, 2);
      const blob = new Blob([payload], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "deployment-plan.json"; a.click();
      URL.revokeObjectURL(url);
    },
  },
  watch: {
    // If ORBAT changes, keep current plan unless empty; all Auto-fill clicks use fresh ORBAT anyway.
    orbat: { deep:true, handler(){
      if (!this.plan?.units?.length) this.plan.units = this.buildUnitsFromOrbat();
    }},
    members: { deep:true, handler(){ this.personnel = this.buildPersonnelPool(); } },
    plan: { deep:true, handler(){ this.persistPlan(); } },
  },
};
</script>

<style scoped>
/* PAGE GRID: two windows side-by-side, no overlap */
#deploymentView {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
  gap: 1.2rem;
  align-items: start;
  padding-top: 28px;
  padding-left: 18px;
  padding-right: 18px;
}
@media (max-width: 1280px) { #deploymentView { grid-template-columns: 1fr; } }

/* Make each window (section) honor the grid width, not a global cap */
.deployment-window.section-container,
.overview-window.section-container { max-width: none !important; width: auto; }
.deployment-window { grid-column: 1; }
.overview-window   { grid-column: 2; }

/* section scaffolding */
.header-shell { height: 52px; overflow: hidden; }
.section-header, .section-content-container { width: 100%; }

/* panels */
.panel {
  border: 1px dashed rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.18);
  border-radius: .6rem;
  padding: .8rem .9rem;
}

/* text */
.muted { color: #9ec5e6; }
.small { font-size: .86rem; }

/* groups */
.groups { display: grid; gap: 1rem; }
.group-card {
  border: 1px solid rgba(30,144,255,0.28);
  background: rgba(0,10,30,0.28);
  border-radius: .6rem;
  padding: .7rem .8rem;
  display: grid;
  gap: .6rem;
}
.group-head { display: flex; align-items: baseline; gap: .6rem; }
.group-title {
  margin: 0; color: #d9ebff; text-transform: uppercase; letter-spacing: .12em;
  font-size: 1.12rem; line-height: 1.2;
  flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.subcount { color: #9ec5e6; font-size: .9rem; margin-left: .5rem; }
.group-actions { display: flex; gap: .4rem; }

/* slots grid */
.slots-grid { display: grid; grid-template-columns: repeat(5, minmax(200px, 1fr)); gap: .7rem; }
@media (min-width: 1680px) { .slots-grid { grid-template-columns: repeat(6, minmax(200px, 1fr)); } }
@media (max-width: 1500px) { .slots-grid { grid-template-columns: repeat(4, minmax(180px, 1fr)); } }
@media (max-width: 1100px) { .slots-grid { grid-template-columns: repeat(3, minmax(160px, 1fr)); } }
@media (max-width: 820px)  { .slots-grid { grid-template-columns: repeat(2, minmax(150px, 1fr)); } }
@media (max-width: 560px)  { .slots-grid { grid-template-columns: 1fr; } }

.slot { border: 1px solid rgba(30,144,255,0.25); background: rgba(0,10,30,0.22); border-radius: .55rem; padding: .55rem .6rem; display: grid; gap: .45rem; }
.slot.vacant { border-style: dashed; opacity: .95; }
.slot.closed { filter: grayscale(85%); opacity: .6; background: rgba(1,6,14,.9); }
.slot-topline { display: flex; align-items: center; gap: .5rem; }
.slot-tag { font-size: .78rem; letter-spacing: .12em; color: #9ec5e6; }
.slot-role { margin-left: auto; color: #9ec5e6; font-size: .82rem; opacity: .9; }
.slot-body { display: grid; gap: .45rem; }
.slot-name { color: #e6f3ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 1.2em; }
button.primary.pick { width: 100%; }

/* overview */
.overview { display: grid; gap: .9rem; }
.ov-subtitle { margin: .2rem 0; color: #cfe7ff; letter-spacing: .06em; }
.summary { display: grid; gap: .25rem; }
.summary-row { display: flex; justify-content: space-between; color: #e6f3ff; }
.summary-row .label { color: #9ec5e6; }
.summary-row.total { margin-top: .35rem; border-top: 1px solid rgba(30,144,255,0.25); padding-top: .35rem; }
.ov-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.free-list { list-style: none; margin: .4rem 0 0; padding: 0; display: grid; gap: .2rem; }
.free-list li { display: flex; gap: .4rem; color: #e6f3ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.free-list .meta { color: #9ec5e6; }

/* modal + flicker */
.picker-veil { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 50; }
.picker { width: min(900px, 92vw); max-height: 80vh; overflow: hidden; border-radius: .8rem; border: 1px solid rgba(30,144,255,0.45); background: rgba(0, 10, 30, 0.95); display: grid; grid-template-rows: auto auto 1fr auto; }
.picker-head { display: flex; align-items: center; justify-content: space-between; padding: .8rem .9rem; border-bottom: 1px solid rgba(30,144,255,0.25); }
.picker-controls { display: flex; gap: .8rem; align-items: center; padding: .6rem .9rem; border-bottom: 1px solid rgba(30,144,255,0.18); }
.picker-controls .search { flex: 1 1 auto; padding: .5rem .6rem; border-radius: .45rem; border: 1px solid rgba(30,144,255,0.3); background: rgba(0,10,30,0.3); color: #e6f3ff; }
.check { display: flex; align-items: center; gap: .4rem; color: #cfe7ff; }
.picker-list { overflow: auto; padding: .6rem .4rem; display: grid; gap: .4rem; }
.pick-row { display: grid; grid-template-columns: 1fr auto auto; gap: .6rem; align-items: center; border: 1px solid rgba(30,144,255,0.25); background: rgba(0,10,30,0.2); border-radius: .5rem; padding: .5rem .6rem; }
.pick-row.assigned { background: rgba(30,144,255,0.08); }
.p-name { color: #e6f3ff; font-weight: 600; }
.p-meta .subtle { color: #9ec5e6; font-size: .86rem; }
.badge { color: #79ffba; border: 1px solid rgba(120,255,170,0.55); border-radius: 999px; padding: .1rem .5rem; font-size: .78rem; }

/* Flicker */
.section-content-container.animate { animation: contentEntry 260ms ease-out both; }
@keyframes contentEntry {
  0% { opacity: 0; filter: brightness(1.15) saturate(1.05) blur(1px); }
  60% { opacity: 1; filter: brightness(1.0) saturate(1.0) blur(0); }
  80% { opacity: .98; filter: brightness(1.03); }
  100% { opacity: 1; filter: none; }
}
</style>
