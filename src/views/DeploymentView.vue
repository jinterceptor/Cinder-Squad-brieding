<!-- src/views/DeploymentView.vue -->
<template>
  <div
    id="deploymentView"
    class="content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- LEFT: DEPLOYMENT -->
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
          <div v-if="!plan.units.length" class="muted">
            No eligible elements found. (Reserves / Fillers / Recruits are excluded.)
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
                  <button class="ghost small" @click="addSlot(g.key)">Add slot</button>
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
                    <div style="display:flex; gap:.35rem;">
                      <button class="ghost xsmall" v-if="slot.id" @click="clearSlot(g.key, sIdx)">Clear</button>
                      <button class="ghost xsmall" @click="removeSlot(g.key, sIdx)">–</button>
                    </div>
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

          <!-- FOOTER ACTIONS -->
          <div class="actions-row" style="display:flex; gap:.6rem; flex-wrap:wrap;">
            <button class="ghost" @click="resetPlan">Reset</button>
            <button class="ghost" @click="fillAllFromRoster">Auto-fill All</button>
            <button class="ghost" @click="exportJson">Export JSON</button>
          </div>
        </div>
      </div>
    </section>

    <!-- RIGHT: OVERVIEW -->
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
                <li v-for="p in freePersonnel.slice(0, 18)" :key="`free-${p.id}`">
                  <span class="name" :title="p.name">{{ p.name }}</span>
                  <span class="meta" v-if="p.role">· {{ p.role }}</span>
                </li>
              </ul>
              <div v-if="freePersonnel.length > 18" class="muted small">
                +{{ freePersonnel.length - 18 }} more…
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
 * Notes:
 * - If parent provides `orbat` (same as PilotsView), we use it.
 * - Optional CSV fallback: pass prop `orbatCsvUrl` or set env `VITE_ORBAT_CSV_URL`.
 * - Excludes squad titles: Reserves / Fillers / Recruits (case-insensitive).
 * - Only includes members that are "active":
 *   - member.active === true  OR  member.status === 'ACTIVE' (case-insensitive).
 */
export default {
  name: "DeploymentView",
  props: {
    animate: { type: Boolean, default: true },
    orbat: { type: Array, default: () => [] },           // preferred (from PilotsView feed)
    orbatCsvUrl: { type: String, default: "" },          // optional fallback URL
  },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",

      plan: { units: [] },

      picker: { open: false, unitKey: "", slotIdx: -1, query: "", onlyFree: false },

      personnel: [],
      rawOrbat: [],

      STORAGE_KEY: "deploymentPlan2",
      MIN_CHALK_SLOTS: 12,
      EXCLUDE_SQUADS: new Set(["reserves", "fillers", "recruits"]),
    };
  },
  async created() {
    // Load ORBAT: prefer prop; else CSV fallback (if provided)
    await this.ensureOrbatLoaded();

    // Build personnel pool (active only)
    this.personnel = this.buildPersonnelPool(this.rawOrbat);

    // Load saved plan or init from ORBAT
    const saved = this.loadSaved();
    this.plan.units = saved ?? this.buildUnitsFromOrbat(this.rawOrbat);
  },
  mounted() { this.triggerFlicker(0); },
  computed: {
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
    /* ---- lifecycle helpers ---- */
    async ensureOrbatLoaded() {
      if (Array.isArray(this.orbat) && this.orbat.length) {
        this.rawOrbat = this.filterOrbatSquads(this.orbat);
        return;
      }
      const url = this.orbatCsvUrl || import.meta.env.VITE_ORBAT_CSV_URL || "";
      if (!url) { this.rawOrbat = []; return; }
      try {
        const text = await fetch(url, { cache: "no-store" }).then(r => r.text());
        this.rawOrbat = this.filterOrbatSquads(this.parseOrbatCsv(text));
      } catch {
        this.rawOrbat = [];
      }
    },

    loadSaved() {
      try {
        const saved = sessionStorage.getItem(this.STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.units)) return parsed.units;
      } catch {}
      return null;
    },

    persistPlan() {
      try { sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.plan)); } catch {}
    },

    triggerFlicker(delayMs = 0) {
      this.animateView = false;
      this.animationDelay = `${delayMs}ms`;
      this.$nextTick(()=>requestAnimationFrame(()=>this.animateView = true));
    },

    /* ---- CSV parsing (fallback) ---- */
    parseOrbatCsv(text) {
      // Minimal CSV parser -> array of rows (naive, assumes no quoted commas)
      const rows = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(r => r.split(","));
      if (!rows.length) return [];

      // This part is **project-specific**. We approximate a common structure:
      // Expect columns like: squad, fireteam, role, member_id, member_name, member_callsign, member_status, slot_status
      // Adjust as needed to match PilotsView if schema differs.
      const header = rows[0].map(h => h.trim().toLowerCase());
      const idx = (name) => header.indexOf(name);

      const cSquad = idx("squad");
      const cFT = idx("fireteam");
      const cRole = idx("role");
      const cId = idx("member_id");
      const cName = idx("member_name");
      const cCall = idx("member_callsign");
      const cMStatus = idx("member_status");
      const cSStatus = idx("slot_status");

      const bySquad = new Map();

      for (let i=1; i<rows.length; i++) {
        const r = rows[i];
        const squad = (r[cSquad] || "").trim();
        const ft = (r[cFT] || "").trim();
        const role = (r[cRole] || "").trim();
        const mId = (r[cId] || "").trim();
        const mName = (r[cName] || "").trim();
        const mCall = (r[cCall] || "").trim();
        const mStatus = (r[cMStatus] || "").trim();
        const slotStatus = (r[cSStatus] || "").trim();

        if (!bySquad.has(squad)) bySquad.set(squad, { squad, fireteams: [] });
        const sq = bySquad.get(squad);

        let team = sq.fireteams.find(x => x.name === ft);
        if (!team) { team = { name: ft, slots: [] }; sq.fireteams.push(team); }

        const member = (mId || mName) ? {
          id: mId || undefined,
          name: mName || undefined,
          callsign: mCall || undefined,
          status: mStatus || undefined,
          active: String(mStatus||"").toUpperCase() === "ACTIVE"
        } : null;

        team.slots.push({
          role,
          status: slotStatus || (member ? "FILLED" : "VACANT"),
          member
        });
      }

      return Array.from(bySquad.values());
    },

    /* ---- ORBAT transforms ---- */
    filterOrbatSquads(orbat) {
      // Exclude Reserves / Fillers / Recruits (case-insensitive)
      return (orbat || []).filter(sq => {
        const n = String(sq?.squad || "").trim().toLowerCase();
        return !this.EXCLUDE_SQUADS.has(n);
      });
    },

    isActiveMember(member) {
      if (!member) return false;
      const stat = String(member.status || "").toUpperCase();
      if (typeof member.active === "boolean") return member.active;
      return stat === "ACTIVE";
    },

    /* Build a personnel pool (for picker) from ORBAT, active only */
    buildPersonnelPool(orbat) {
      const pool = [];
      (orbat || []).forEach(sq=>{
        (sq.fireteams||[]).forEach(ft=>{
          (ft.slots||[]).forEach((s,idx)=>{
            if (s?.member && this.isActiveMember(s.member)) {
              const id = String(s.member.id ?? `${sq.squad}-${ft.name}-${idx}`);
              const nm = String(s.member.name || "Unknown");
              const cs = String(s.member.callsign || "");
              const rl = String(s.role || s.member.slot || "");
              if (id && nm) pool.push({ id, name:nm, callsign:cs, role:rl });
            }
          });
        });
      });
      // Deduplicate by id
      const seen = new Set(); const out=[];
      for (const p of pool) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
      return out;
    },

    /* Build the working plan from ORBAT (active-only) */
    buildUnitsFromOrbat(orbat) {
      const units = [];
      (orbat || []).forEach((sq)=>{
        const key = this.keyFromName(sq.squad);
        const slots = [];

        (sq.fireteams||[]).forEach(ft=>{
          (ft.slots||[]).forEach(s=>{
            const status = String(s?.status || (s?.member ? "FILLED" : "VACANT")).toUpperCase();
            const origStatus = ["VACANT","CLOSED"].includes(status) ? status : "FILLED";
            const member = this.isActiveMember(s?.member) ? s.member : null;

            slots.push({
              id: member?.id ? String(member.id) : null,
              name: member?.name || null,
              role: s?.role || member?.slot || "",
              origStatus,
            });
          });
        });

        // Keep as-is (no longer forcing only Chalks), as requested: “every element except …”
        // For Chalks, we still want capacity to over-fill -> pad to MIN_CHALK_SLOTS
        const finalSlots = this.isChalk(sq.squad)
          ? this.padSlots(slots, this.MIN_CHALK_SLOTS)
          : slots;

        units.push({ key, title: sq.squad, slots: finalSlots });
      });
      return units;
    },

    buildUnitFromOrbatByKey(orbat, unitKey) {
      const unit = (orbat || []).find(sq => this.keyFromName(sq.squad) === unitKey);
      if (!unit) return null;

      const slots = [];
      (unit.fireteams||[]).forEach(ft=>{
        (ft.slots||[]).forEach(s=>{
          const status = String(s?.status || (s?.member ? "FILLED" : "VACANT")).toUpperCase();
          const origStatus = ["VACANT","CLOSED"].includes(status) ? status : "FILLED";
          const member = this.isActiveMember(s?.member) ? s.member : null;

          slots.push({
            id: member?.id ? String(member.id) : null,
            name: member?.name || null,
            role: s?.role || member?.slot || "",
            origStatus,
          });
        });
      });

      const finalSlots = this.isChalk(unit.squad)
        ? this.padSlots(slots, this.MIN_CHALK_SLOTS)
        : slots;

      return { key: unitKey, title: unit.squad, slots: finalSlots };
    },

    isChalk(title) { return /chalk\s*\d+/i.test(String(title || "")); },
    padSlots(arr, min) {
      const out = arr.slice();
      const need = Math.max(0, min - out.length);
      for (let i = 0; i < need; i++) {
        out.push({ id: null, name: null, role: "", origStatus: "VACANT" });
      }
      return out;
    },

    /* ---- small utils ---- */
    keyFromName(name){ return String(name||"").trim().toLowerCase().replace(/\s+/g,"-"); },
    filledCount(g){ return g.slots.reduce((n,s)=>n+(s.id?1:0),0); },
    displayName(slot){ return slot.name || (slot.origStatus==="VACANT" ? "— Vacant —" : "— Empty —"); },

    /* ---- picker + assignment ---- */
    openPicker(unitKey, slotIdx){
      const g = this.plan.units.find(u=>u.key===unitKey);
      if (!g || g.slots[slotIdx]?.origStatus==="CLOSED") return;
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
      const gIdx = this.plan.units.findIndex(u=>u.key===this.picker.unitKey);
      if (gIdx < 0) return;
      const g = this.plan.units[gIdx];
      const target = g.slots[this.picker.slotIdx];

      // Swap across groups if needed (immutable updates for Vue reactivity)
      if (from && target?.id && !(from.unitKey===g.key && from.slotIdx===this.picker.slotIdx)) {
        const srcIdx = this.plan.units.findIndex(u=>u.key===from.unitKey);
        const srcGroup = this.plan.units[srcIdx];
        const tmp = { ...target };

        const newTarget = { ...target, id: p.id, name: p.name, role: target.role || p.role || "" };
        const newSrcSlots = srcGroup.slots.slice();
        newSrcSlots[from.slotIdx] = { ...newSrcSlots[from.slotIdx], id: tmp.id, name: tmp.name };
        const newSrc = { ...srcGroup, slots: newSrcSlots };

        const newGSlots = g.slots.slice();
        newGSlots[this.picker.slotIdx] = newTarget;
        const newG = { ...g, slots: newGSlots };

        this.plan.units = this.plan.units.map((u,i)=> i===gIdx ? newG : (i===srcIdx ? newSrc : u));
      } else {
        const newSlots = g.slots.slice();
        newSlots[this.picker.slotIdx] = { ...target, id: p.id, name: p.name, role: target.role || p.role || "" };
        const newG = { ...g, slots: newSlots };
        this.plan.units = this.plan.units.map((u,i)=> i===gIdx ? newG : u);
      }

      this.persistPlan();
      this.closePicker();
    },

    clearSlot(unitKey, slotIdx){
      const idx = this.plan.units.findIndex(u=>u.key===unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const newSlots = g.slots.slice();
      newSlots[slotIdx] = { ...newSlots[slotIdx], id:null, name:null };
      const newG = { ...g, slots: newSlots };
      this.plan.units = this.plan.units.map((u,i)=> i===idx ? newG : u);
      this.persistPlan();
    },

    clearGroup(unitKey){
      const idx = this.plan.units.findIndex(u=>u.key===unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const newG = { ...g, slots: g.slots.map(s=>({ ...s, id:null, name:null })) };
      this.plan.units = this.plan.units.map((u,i)=> i===idx ? newG : u);
      this.persistPlan();
    },

    addSlot(unitKey){
      const idx = this.plan.units.findIndex(u=>u.key===unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const newSlots = g.slots.slice();
      newSlots.push({ id:null, name:null, role:"", origStatus:"VACANT" });
      const newG = { ...g, slots: newSlots };
      this.plan.units = this.plan.units.map((u,i)=> i===idx ? newG : u);
      this.persistPlan();
    },

    removeSlot(unitKey, slotIdx){
      const idx = this.plan.units.findIndex(u=>u.key===unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      if (g.slots.length <= 1) return;
      const newSlots = g.slots.slice();
      newSlots.splice(slotIdx, 1);
      const newG = { ...g, slots: newSlots };
      this.plan.units = this.plan.units.map((u,i)=> i===idx ? newG : u);
      this.persistPlan();
    },

    /* ---- Auto-fill ---- */
    fillFromRoster(unitKey){
      const rebuilt = this.buildUnitFromOrbatByKey(this.rawOrbat, unitKey);
      const idx = this.plan.units.findIndex(u=>u.key===unitKey);
      if (idx < 0 || !rebuilt) return;
      // Keep current length if larger (over-filled): re-pad to max(current, rebuilt)
      const len = Math.max(this.plan.units[idx].slots.length, rebuilt.slots.length);
      while (rebuilt.slots.length < len) rebuilt.slots.push({ id:null, name:null, role:"", origStatus:"VACANT" });

      this.plan.units = this.plan.units.map((u,i)=> i===idx ? rebuilt : u);
      this.persistPlan();
      this.triggerFlicker(0);
    },

    fillAllFromRoster(){
      const rebuilt = this.buildUnitsFromOrbat(this.rawOrbat);
      // Preserve any over-fill lengths already present
      const out = rebuilt.map(u=>{
        const prev = this.plan.units.find(x=>x.key===u.key);
        const len = prev ? Math.max(prev.slots.length, u.slots.length) : u.slots.length;
        while (u.slots.length < len) u.slots.push({ id:null, name:null, role:"", origStatus:"VACANT" });
        return u;
      });
      this.plan.units = out;
      this.persistPlan();
      this.triggerFlicker(0);
    },

    resetPlan(){
      this.plan.units = this.buildUnitsFromOrbat(this.rawOrbat);
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
    // If parent updates orbat, rebuild base but keep current plan unless you reset.
    orbat: { deep:true, immediate:false, handler(newV){
      if (Array.isArray(newV) && newV.length) {
        this.rawOrbat = this.filterOrbatSquads(newV);
        // Also update personnel list
        this.personnel = this.buildPersonnelPool(this.rawOrbat);
      }
    }},
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
@media (max-width: 1280px) {
  #deploymentView { grid-template-columns: 1fr; }
}

/* each window respects grid */
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
