<!-- src/views/DeploymentView.vue -->
<template>
  <div
    id="deploymentView"
    class="content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- MAIN: DEPLOYMENT -->
    <section id="deploy-main" class="section-container">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>DEPLOYMENT</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container deploy-width">
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
    orbat:    { type: Array,   default: () => [] },
  },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",
      plan: { units: [] },
      picker: { open: false, unitKey: "", slotIdx: -1, query: "", onlyFree: false },
      personnel: [],
      STORAGE_KEY: "deploymentPlan",
    };
  },
  created() {
    this.personnel = this.buildPersonnelPool();
    this.plan.units = this.loadOrInitPlan();
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
        try { const parsed = JSON.parse(saved); if (Array.isArray(parsed?.units)) return parsed.units; } catch {}
      }
      return this.initPlanFromOrbat();
    },
    initPlanFromOrbat() {
      const units = [];
      this.selectedSquads.forEach((sq)=>{
        const key = this.keyFromName(sq.squad);
        const slots = [];
        (sq.fireteams||[]).forEach(ft=>{
          (ft.slots||[]).forEach(s=>{
            const status = String(s?.status || "FILLED").toUpperCase();
            const origStatus = ["VACANT","CLOSED"].includes(status) ? status : "FILLED";
            const member = s?.member;
            slots.push({
              id: member?.id ? String(member.id) : null,
              name: member?.name || null,
              role: s?.role || member?.slot || "",
              origStatus,
            });
          });
        });
        units.push({ key, title: sq.squad, slots });
      });
      return units;
    },
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
      } else if (from && from.unitKey===g.key && from.slotIdx===this.picker.slotIdx) {
        // noop
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
    clearCurrentSlot(){
      if (!this.picker.open) return;
      this.clearSlot(this.picker.unitKey, this.picker.slotIdx);
      this.closePicker();
    },

    fillFromRoster(unitKey){
      const g = this.plan.units.find(u=>u.key===unitKey);
      if (!g) return;
      for (let i=0;i<g.slots.length;i++){
        const s = g.slots[i];
        if (s.id || s.origStatus==="CLOSED") continue;
        const pick = this.personnel.find(p=>!this.findAssignment(p.id));
        if (!pick) break;
        s.id = pick.id; s.name = pick.name; s.role ||= pick.role || "";
      }
      this.persistPlan();
    },
    resetPlan(){
      this.plan.units = this.initPlanFromOrbat();
      this.persistPlan();
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
    orbat: { deep:true, handler(){ if (!this.plan?.units?.length) this.plan.units = this.initPlanFromOrbat(); } },
    members: { deep:true, handler(){ this.personnel = this.buildPersonnelPool(); } },
    plan: { deep:true, handler(){ this.persistPlan(); } },
  },
};
</script>

<style scoped>
/* Page baseline */
#deploymentView {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.2rem;
  align-items: start;
  padding-top: 28px;
  padding-left: 18px;
  padding-right: 18px;
}

/* WIDTH CONTROL
   - Wrapper sets total usable width
   - Panel takes full width so the border expands with content */
.deploy-width {
  display: flex;
  justify-content: flex-start;
  width: min(1600px, 95vw);      /* <-- overall window width */
  max-width: 100%;
}
.deploy-width > .panel {
  width: 100%;                   /* <-- make the bordered window fill wrapper */
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

/* Slots grid */
.slots-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(200px, 1fr));
  gap: .7rem;
}
@media (min-width: 1680px) { .slots-grid { grid-template-columns: repeat(6, minmax(200px, 1fr)); } }
@media (max-width: 1500px) { .slots-grid { grid-template-columns: repeat(4, minmax(180px, 1fr)); } }
@media (max-width: 1100px) { .slots-grid { grid-template-columns: repeat(3, minmax(160px, 1fr)); } }
@media (max-width: 820px)  { .slots-grid { grid-template-columns: repeat(2, minmax(150px, 1fr)); } }
@media (max-width: 560px)  { .slots-grid { grid-template-columns: 1fr; } }

.slot {
  border: 1px solid rgba(30,144,255,0.25);
  background: rgba(0,10,30,0.22);
  border-radius: .55rem;
  padding: .55rem .6rem;
  display: grid; gap: .45rem;
}
.slot.vacant { border-style: dashed; opacity: .95; }
.slot.closed { filter: grayscale(85%); opacity: .6; background: rgba(1,6,14,.9); }
.slot-topline { display: flex; align-items: center; gap: .5rem; }
.slot-tag { font-size: .78rem; letter-spacing: .12em; color: #9ec5e6; }
.slot-role { margin-left: auto; color: #9ec5e6; font-size: .82rem; opacity: .9; }
.slot-body { display: grid; gap: .45rem; }
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

/* Picker modal */
.picker-veil {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: grid; place-items: center; z-index: 50;
}
.picker {
  width: min(900px, 92vw);
  max-height: 80vh;
  overflow: hidden;
  border-radius: .8rem;
  border: 1px solid rgba(30,144,255,0.45);
  background: rgba(0, 10, 30, 0.95);
  display: grid; grid-template-rows: auto auto 1fr auto;
}
.picker-head { display: flex; align-items: center; justify-content: space-between; padding: .8rem .9rem; border-bottom: 1px solid rgba(30,144,255,0.25); }
.picker-controls { display: flex; gap: .8rem; align-items: center; padding: .6rem .9rem; border-bottom: 1px solid rgba(30,144,255,0.18); }
.picker-controls .search { flex: 1 1 auto; padding: .5rem .6rem; border-radius: .45rem; border: 1px solid rgba(30,144,255,0.3); background: rgba(0,10,30,0.3); color: #e6f3ff; }
.check { display: flex; align-items: center; gap: .4rem; color: #cfe7ff; }

.picker-list { overflow: auto; padding: .6rem .4rem; display: grid; gap: .4rem; }
.pick-row {
  display: grid; grid-template-columns: 1fr auto auto; gap: .6rem; align-items: center;
  border: 1px solid rgba(30,144,255,0.25); background: rgba(0,10,30,0.2); border-radius: .5rem; padding: .5rem .6rem;
}
.pick-row.assigned { background: rgba(30,144,255,0.08); }
.p-name { color: #e6f3ff; font-weight: 600; }
.p-meta .subtle { color: #9ec5e6; font-size: .86rem; }
.badge { color: #79ffba; border: 1px solid rgba(120,255,170,0.55); border-radius: 999px; padding: .1rem .5rem; font-size: .78rem; }
.pick-actions { display: flex; align-items: center; }
.picker-foot { display: flex; align-items: center; justify-content: space-between; padding: .6rem .9rem; border-top: 1px solid rgba(30,144,255,0.18); }

/* Content fade-in */
.section-content-container.animate { animation: contentEntry 260ms ease-out both; }
@keyframes contentEntry {
  0% { opacity: 0; filter: brightness(1.15) saturate(1.05) blur(1px); }
  60% { opacity: 1; filter: brightness(1.0) saturate(1.0) blur(0); }
  80% { opacity: .98; filter: brightness(1.03); }
  100% { opacity: 1; filter: none; }
}
</style>
