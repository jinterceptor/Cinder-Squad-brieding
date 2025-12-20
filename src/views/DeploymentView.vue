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

      <div class="section-content-container deploy-scroll" :class="{ animate: animateView }">
        <div class="panel">
          <div v-if="!plan.units.length" class="muted">No eligible elements found.</div>

          <div class="groups">
            <div v-for="g in plan.units" :key="g.key" class="group-card">
              <div class="group-head">
                <h2 class="group-title" :title="g.title">
                  {{ g.title }} <span class="subcount">({{ filledCount(g) }}/{{ g.slots.length }})</span>
                </h2>
                <div class="group-actions">
                  <button type="button" class="btn ghost small" @click.stop="openZoom(g.key)">Zoom</button>
                  <button type="button" class="btn ghost small" @click.stop="clearGroup(g.key)">Clear</button>
                  <button type="button" class="btn ghost small" @click.stop="addSlot(g.key)">Add slot</button>
                  <button type="button" class="btn ghost small" @click.stop="fillFromRoster(g.key)">Auto-fill</button>
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
                      <button
                        v-if="slot.id"
                        type="button"
                        class="btn ghost xsmall"
                        @click.stop="clearSlot(g.key, sIdx)"
                      >Clear</button>
                      <button type="button" class="btn ghost xsmall" @click.stop="removeSlot(g.key, sIdx)">–</button>
                    </div>
                  </div>

                  <div class="slot-body">
                    <div class="slot-name" :title="displayName(slot)">{{ displayName(slot) }}</div>

                    <!-- quick cert chip (view-only; edit in Zoom) -->
                    <div v-if="slot.id" class="cert-row">
                      <span class="chip" :title="slot.cert ? `Certification: ${slot.cert}` : 'No certification set'">
                        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
                          <circle cx="10" cy="10" r="8"></circle>
                        </svg>
                        <span>{{ slot.cert || '—' }}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      class="btn primary pick"
                      :disabled="slot.origStatus === 'CLOSED'"
                      @click.stop="openPicker(g.key, sIdx)"
                    >
                      {{ slot.id ? 'Swap' : (slot.origStatus === 'CLOSED' ? 'Closed' : 'Assign') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- FOOTER ACTIONS -->
          <div class="actions-row">
            <button type="button" class="btn ghost" @click.stop="resetPlan">Reset</button>
            <button type="button" class="btn ghost" @click.stop="fillAllFromRoster">Auto-fill All</button>
            <button type="button" class="btn ghost" @click.stop="exportJson">Export JSON</button>
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

      <div class="section-content-container overview-scroll" :class="{ animate: animateView }">
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
              <button type="button" class="btn ghost small" @click.stop="resetPlan">Reset Plan</button>
              <button type="button" class="btn ghost small" @click.stop="exportJson">Export JSON</button>
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

    <!-- ASSIGN/SWAP PICKER MODAL -->
    <div v-if="picker.open" class="picker-veil" @click.self="closePicker">
      <div class="picker">
        <div class="picker-head">
          <h3>
            {{ currentSlotTitle }}
            <span class="muted">— select soldier</span>
          </h3>
          <button type="button" class="btn ghost" @click="closePicker">Close</button>
        </div>

        <div class="picker-controls">
          <input v-model="picker.query" placeholder="Search by name / callsign / role" class="search" @keydown.stop />
          <label class="check"><input type="checkbox" v-model="picker.onlyFree" /> Show only unassigned</label>
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
              <button type="button" class="btn primary small" @click.stop="selectPersonnel(p)">Select</button>
            </div>
          </div>
        </div>

        <div class="picker-foot">
          <button type="button" class="btn ghost" @click="clearCurrentSlot">Clear slot</button>
          <span class="muted">Selecting someone already assigned will swap them.</span>
        </div>
      </div>
    </div>

    <!-- PER-SQUAD ZOOM -->
    <div v-if="zoom.open" class="zoom-veil" @click.self="closeZoom">
      <div class="zoom">
        <div class="zoom-head">
          <h3>{{ zoomUnit?.title || 'Element' }}</h3>
          <div class="zoom-actions">
            <button class="btn ghost small" @click="fillFromRoster(zoom.unitKey)" title="Auto-fill from roster">Auto-fill</button>
            <button class="btn ghost small" @click="closeZoom">Close</button>
          </div>
        </div>

        <div class="zoom-grid">
          <div
            v-for="(slot, sIdx) in zoomUnit?.slots || []"
            :key="`zoom-slot-${zoom.unitKey}-${sIdx}`"
            class="zoom-slot"
            :class="{ vacant: slot.origStatus === 'VACANT', closed: slot.origStatus === 'CLOSED' }"
          >
            <div class="zoom-top">
              <span class="slot-tag">#{{ sIdx + 1 }}</span>
              <span class="slot-role">{{ slot.role || 'Slot' }}</span>
              <div class="gap"></div>
              <button class="btn ghost xsmall" @click.stop="openPicker(zoom.unitKey, sIdx)">Assign/Swap</button>
              <button v-if="slot.id" class="btn ghost xsmall" @click.stop="clearSlot(zoom.unitKey, sIdx)">Clear</button>
            </div>

            <div class="zoom-body">
              <div class="zoom-name" :title="displayName(slot)">{{ displayName(slot) }}</div>

              <!-- cert selector -->
              <div v-if="slot.id" class="zoom-cert">
                <label>Cert</label>
                <select
                  class="select"
                  :value="slot.cert || ''"
                  @change="setSlotCert(zoom.unitKey, sIdx, $event.target.value)"
                >
                  <option value="">—</option>
                  <option v-for="c in getCertsForPersonId(slot.id)" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="zoom-foot">
          <button class="btn ghost" @click="closeZoom">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "DeploymentView",
  props: { animate: { type: Boolean, default: true }, orbat: { type: Array, default: () => [] } },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",
      plan: { units: [] },

      picker: { open: false, unitKey: "", slotIdx: -1, query: "", onlyFree: false },
      zoom: { open: false, unitKey: "" },

      personnel: [],
      STORAGE_KEY: "deploymentPlan2",
      MIN_CHALK_SLOTS: 12,
      ROLE_ORDER: ["squad lead", "team leader", "corpsman 1", "corpsman 2"],
      EXCLUDED_UNITS: /^(fillers?|recruits?|reserves?)$/i,
    };
  },
  created() {
    this.personnel = this.buildPersonnelPool(this.orbat);
    const saved = this.loadSaved();
    this.plan.units = (saved ?? this.buildUnitsFromOrbat(this.orbat)).filter(
      (u) => !this.EXCLUDED_UNITS.test(this.normalizeTitle(u.title))
    );
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
      const base = this.personnel.filter(
        p =>
          !q ||
          (p.name || "").toLowerCase().includes(q) ||
          (p.callsign || "").toLowerCase().includes(q) ||
          (p.role || "").toLowerCase().includes(q)
      );
      return this.picker.onlyFree ? base.filter(p => !this.findAssignment(p.id)) : base;
    },
    totalSlots() { return this.plan.units.reduce((n, g) => n + g.slots.length, 0); },
    totalAssigned() { return this.plan.units.reduce((n, g) => n + g.slots.filter(s => !!s.id).length, 0); },
    freePersonnel() { return this.personnel.filter(p => !this.findAssignment(p.id)); },
    unassignedCount() { return this.freePersonnel.length; },

    zoomUnit() {
      if (!this.zoom.open) return null;
      return this.plan.units.find(u => u.key === this.zoom.unitKey) || null;
    },
  },
  methods: {
    /* animation */
    triggerFlicker(delayMs = 0) {
      this.animateView = false;
      this.animationDelay = `${delayMs}ms`;
      this.$nextTick(() => requestAnimationFrame(() => (this.animateView = true)));
    },

    /* persistence */
    normalizeTitle(t) { return String(t || "").trim(); },
    loadSaved() {
      try {
        const saved = sessionStorage.getItem(this.STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed?.units)) return null;
        return parsed.units.filter((u) => !this.EXCLUDED_UNITS.test(this.normalizeTitle(u.title)));
      } catch {}
      return null;
    },
    persistPlan() { try { sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.plan)); } catch {} },

    /* role sort helpers */
    normalizeRole(txt) {
      const t = String(txt || "").toLowerCase().trim();
      if (/\bsquad\s*lead(er)?\b|\bsl\b|\bactual\b/.test(t)) return "squad lead";
      if (/\bteam\s*lead(er)?\b|\btl\b/.test(t)) return "team leader";
      if (/\b(corps?man|medic)\b/.test(t)) {
        const m = t.match(/\b(corps?man|medic)\s*(\d+)\b/);
        if (m && m[2]) return Number(m[2]) === 2 ? "corpsman 2" : "corpsman 1";
        return "corpsman 1";
      }
      return t;
    },
    rolePriority(role) {
      const key = this.normalizeRole(role);
      const idx = this.ROLE_ORDER.indexOf(key);
      return idx === -1 ? 10_000 : idx;
    },
    sortSlotsByRole(slots) {
      return slots
        .map((s, i) => ({ s, i, p: this.rolePriority(s.role) }))
        .sort((a, b) => a.p - b.p || a.i - b.i)
        .map(x => x.s);
    },

    /* personnel + certs */
    extractCertsFromMember(member) {
      // Accept: Array<string>, string, or object { CertName: 'Y'|'N'|true|false }
      const raw = member?.certs || member?.certifications || member?.skills || member?.cert || [];
      // Object: pick keys with truthy value
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const out = [];
        for (const [k, v] of Object.entries(raw)) {
          const val = (v ?? "").toString().trim().toLowerCase();
          const truthy = v === true || val === "y" || val === "yes" || val === "1" || val === "true";
          if (truthy) out.push(this.titleCase(k));
        }
        return [...new Set(out)];
      }
      // Array
      if (Array.isArray(raw)) {
        return [...new Set(raw.map((x) => this.titleCase(String(x || ""))).filter(Boolean))];
      }
      // String
      if (typeof raw === "string") {
        return [...new Set(raw.split(/[;,/|]/g).map((x) => this.titleCase(x)).filter(Boolean))];
      }
      return [];
    },
    getCertsForPersonId(personId) {
      const p = this.personnel.find(pp => String(pp.id) === String(personId));
      return p?.certs || [];
    },
    ensureSlotCert(slot, fallbackRole = "") {
      if (slot.cert) return slot.cert;
      const certs = this.getCertsForPersonId(slot.id) || [];
      return certs[0] || this.titleCase(String(fallbackRole || slot.role || ""));
    },
    titleCase(s) {
      const t = String(s || "").replace(/[_-]+/g, " ").trim();
      if (!t) return "";
      return t.replace(/\s+/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    },

    /* builders */
    buildPersonnelPool(orbat) {
      const pool = [];
      (orbat || []).forEach(sq => {
        (sq.fireteams || []).forEach(ft => {
          (ft.slots || []).forEach((s, idx) => {
            if (s?.member) {
              const id = String(s.member.id ?? `${sq.squad}-${ft.name}-${idx}`);
              const certs = this.extractCertsFromMember(s.member); // <-- fixed
              pool.push({
                id,
                name: String(s.member.name || "Unknown"),
                callsign: String(s.member.callsign || ""),
                role: String(s.role || s.member.slot || ""),
                certs,
              });
            }
          });
        });
      });
      const seen = new Set(); const out = [];
      for (const p of pool) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
      return out;
    },
    isChalk(title) { return /chalk\s*\d+/i.test(String(title || "")); },
    padSlots(arr, min) { const out = arr.slice(); while (out.length < min) out.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "" }); return out; },
    keyFromName(name) { return String(name || "").trim().toLowerCase().replace(/\s+/g, "-"); },
    filledCount(g) { return g.slots.reduce((n, s) => n + (s.id ? 1 : 0), 0); },
    displayName(slot) { return slot.name || (slot.origStatus === "VACANT" ? "— Vacant —" : "— Empty —"); },

    buildUnitsFromOrbat(orbat) {
      const units = [];
      (orbat || []).forEach(sq => {
        if (this.EXCLUDED_UNITS.test(this.normalizeTitle(sq.squad))) return;
        const key = this.keyFromName(sq.squad);
        const slots = [];
        (sq.fireteams || []).forEach(ft => {
          (ft.slots || []).forEach(s => {
            const status = String(s?.status || (s?.member ? "FILLED" : "VACANT")).toUpperCase();
            const origStatus = ["VACANT", "CLOSED"].includes(status) ? status : "FILLED";
            const member = s?.member || null;
            const slot = {
              id: member?.id ? String(member.id) : null,
              name: member?.name || null,
              role: s?.role || member?.slot || "",
              origStatus,
              cert: "",
            };
            if (slot.id) slot.cert = this.ensureSlotCert(slot, slot.role);
            slots.push(slot);
          });
        });
        let finalSlots = this.sortSlotsByRole(slots);
        if (this.isChalk(sq.squad)) finalSlots = this.padSlots(finalSlots, this.MIN_CHALK_SLOTS);
        units.push({ key, title: sq.squad, slots: finalSlots });
      });
      return units;
    },
    buildUnitFromOrbatByKey(orbat, unitKey) {
      const unit = (orbat || []).find(sq => this.keyFromName(sq.squad) === unitKey);
      if (!unit) return null;
      if (this.EXCLUDED_UNITS.test(this.normalizeTitle(unit.squad))) return null;

      const slots = [];
      (unit.fireteams || []).forEach(ft => {
        (ft.slots || []).forEach(s => {
          const status = String(s?.status || (s?.member ? "FILLED" : "VACANT")).toUpperCase();
          const origStatus = ["VACANT", "CLOSED"].includes(status) ? status : "FILLED";
          const member = s?.member || null;
          const slot = {
            id: member?.id ? String(member.id) : null,
            name: member?.name || null,
            role: s?.role || member?.slot || "",
            origStatus,
            cert: "",
          };
          if (slot.id) slot.cert = this.ensureSlotCert(slot, slot.role);
          slots.push(slot);
        });
      });
      let finalSlots = this.sortSlotsByRole(slots);
      if (this.isChalk(unit.squad)) finalSlots = this.padSlots(finalSlots, this.MIN_CHALK_SLOTS);
      return { key: unitKey, title: unit.squad, slots: finalSlots };
    },

    /* interactions */
    openPicker(unitKey, slotIdx) {
      const g = this.plan.units.find(u => u.key === unitKey);
      if (!g || g.slots[slotIdx]?.origStatus === "CLOSED") return;
      this.picker = { ...this.picker, open: true, unitKey, slotIdx, query: "", onlyFree: false };
    },
    closePicker() { this.picker.open = false; },

    findAssignment(personId) {
      for (const g of this.plan.units) {
        const idx = g.slots.findIndex(s => String(s.id) === String(personId));
        if (idx >= 0) return { unitKey: g.key, slotIdx: idx, title: g.title };
      }
      return null;
    },
    formatAssignment(a) { return `${a.title} #${a.slotIdx + 1}`; },

    selectPersonnel(p) {
      if (!this.picker.open) return;
      const from = this.findAssignment(p.id);
      const gIdx = this.plan.units.findIndex(u => u.key === this.picker.unitKey);
      if (gIdx < 0) return;
      const g = this.plan.units[gIdx];
      const target = g.slots[this.picker.slotIdx];
      const chosenCertDefault = (this.getCertsForPersonId(p.id)[0] || target.role || p.role || "");

      if (from && target?.id && !(from.unitKey === g.key && from.slotIdx === this.picker.slotIdx)) {
        const srcIdx = this.plan.units.findIndex(u => u.key === from.unitKey);
        const srcGroup = this.plan.units[srcIdx];
        const tmp = { ...target };
        const newTarget = { ...target, id: p.id, name: p.name, role: target.role || p.role || "", cert: target.cert || chosenCertDefault };

        const newSrcSlots = srcGroup.slots.slice();
        newSrcSlots[from.slotIdx] = { ...newSrcSlots[from.slotIdx], id: tmp.id, name: tmp.name, cert: tmp.cert || this.ensureSlotCert(tmp, tmp.role) };
        const newSrc = { ...srcGroup, slots: this.sortSlotsByRole(newSrcSlots) };

        const newGSlots = g.slots.slice();
        newGSlots[this.picker.slotIdx] = newTarget;
        const newG = { ...g, slots: this.sortSlotsByRole(newGSlots) };

        this.plan.units = this.plan.units.map((u, i) => (i === gIdx ? newG : i === srcIdx ? newSrc : u));
      } else {
        const newSlots = g.slots.slice();
        newSlots[this.picker.slotIdx] = { ...target, id: p.id, name: p.name, role: target.role || p.role || "", cert: target.cert || chosenCertDefault };
        const newG = { ...g, slots: this.sortSlotsByRole(newSlots) };
        this.plan.units = this.plan.units.map((u, i) => (i === gIdx ? newG : u));
      }

      this.persistPlan();
      this.closePicker();
    },

    clearCurrentSlot() {
      if (!this.picker.open) return;
      this.clearSlot(this.picker.unitKey, this.picker.slotIdx);
    },
    clearSlot(unitKey, slotIdx) {
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const newSlots = g.slots.slice();
      newSlots[slotIdx] = { ...newSlots[slotIdx], id: null, name: null, cert: "" };
      const newG = { ...g, slots: this.sortSlotsByRole(newSlots) };
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? newG : u));
      this.persistPlan();
    },
    clearGroup(unitKey) {
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const emptied = g.slots.map(s => ({ ...s, id: null, name: null, cert: "" }));
      const newG = { ...g, slots: this.sortSlotsByRole(emptied) };
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? newG : u));
      this.persistPlan();
    },
    addSlot(unitKey) {
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const newSlots = g.slots.slice();
      newSlots.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "" });
      const newG = { ...g, slots: this.sortSlotsByRole(newSlots) };
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? newG : u));
      this.persistPlan();
    },
    removeSlot(unitKey, slotIdx) {
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const newSlots = g.slots.slice();
      newSlots.splice(slotIdx, 1);
      const newG = { ...g, slots: this.sortSlotsByRole(newSlots) };
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? newG : u));
      this.persistPlan();
    },

    /* fill / reset */
    fillFromRoster(unitKey) {
      const rebuilt = this.buildUnitFromOrbatByKey(this.orbat, unitKey);
      if (!rebuilt) return;
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const keepLen = Math.max(this.plan.units[idx].slots.length, rebuilt.slots.length);
      while (rebuilt.slots.length < keepLen) rebuilt.slots.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "" });
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? rebuilt : u));
      this.persistPlan();
      this.triggerFlicker(0);
    },
    fillAllFromRoster() {
      const rebuilt = this.buildUnitsFromOrbat(this.orbat);
      const out = rebuilt.map(u => {
        const prev = this.plan.units.find(x => x.key === u.key);
        const keepLen = prev ? Math.max(prev.slots.length, u.slots.length) : u.slots.length;
        while (u.slots.length < keepLen) u.slots.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "" });
        return u;
      });
      this.plan.units = out;
      this.persistPlan();
      this.triggerFlicker(0);
    },
    resetPlan() {
      this.plan.units = this.buildUnitsFromOrbat(this.orbat);
      this.persistPlan();
      this.triggerFlicker(0);
    },

    /* zoom */
    openZoom(unitKey) { this.zoom = { open: true, unitKey }; },
    closeZoom() { this.zoom = { open: false, unitKey: "" }; },
    setSlotCert(unitKey, slotIdx, value) {
      const gIdx = this.plan.units.findIndex(u => u.key === unitKey);
      if (gIdx < 0) return;
      const g = this.plan.units[gIdx];
      const newSlots = g.slots.slice();
      newSlots[slotIdx] = { ...newSlots[slotIdx], cert: String(value || "") };
      this.plan.units = this.plan.units.map((u, i) => (i === gIdx ? { ...g, slots: newSlots } : u));
      this.persistPlan();
    },
  },
  watch: {
    orbat: { deep: true, handler(newV) { if (Array.isArray(newV) && newV.length) this.personnel = this.buildPersonnelPool(newV); } },
    plan:  { deep: true, handler() { this.persistPlan(); } },
  },
};
</script>

<style scoped>
/* layout + styles unchanged from your current themed version */
#deploymentView{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,440px);gap:1.2rem;align-items:start;height:calc(94vh - 100px);overflow:hidden;padding:28px 18px 32px;}
@media (max-width:1280px){#deploymentView{grid-template-columns:1fr;}}
.deployment-window.section-container,.overview-window.section-container{max-width:none!important;width:auto;}
.deployment-window{grid-column:1}.overview-window{grid-column:2}
.header-shell{height:52px;overflow:hidden}.section-header,.section-content-container{width:100%}
.deploy-scroll,.overview-scroll{max-height:calc(94vh - 100px - 52px - 36px);overflow-y:auto;scrollbar-gutter:stable both-edges;padding-bottom:36px}
.panel{border:1px dashed rgba(30,144,255,0.35);background:rgba(0,10,30,0.18);border-radius:.6rem;padding:.8rem .9rem;overflow:visible}
.muted{color:#9ec5e6}.small{font-size:.86rem}.actions-row{display:flex;gap:.6rem;flex-wrap:wrap;padding-top:.4rem}
.btn{appearance:none;border:1px solid rgba(30,144,255,0.35);background:linear-gradient(180deg,rgba(6,18,30,.75),rgba(2,10,20,.6));color:#dbeeff;padding:.42rem .7rem;border-radius:.5rem;font-size:.92rem;letter-spacing:.02em;cursor:pointer;transition:transform 80ms ease,background 120ms ease,border-color 120ms ease,box-shadow 120ms ease,opacity 120ms ease;box-shadow:inset 0 0 0 1px rgba(120,200,255,0.08)}
.btn:hover{background:linear-gradient(180deg,rgba(10,28,44,.85),rgba(2,12,22,.7));border-color:rgba(120,200,255,0.5)}
.btn:active{transform:translateY(1px) scale(0.995)}
.btn:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(120,200,255,0.35)}
.btn[disabled]{opacity:.45;cursor:not-allowed}
.btn.small{padding:.32rem .55rem;font-size:.86rem;border-radius:.45rem}
.btn.xsmall{padding:.22rem .45rem;font-size:.80rem;border-radius:.42rem}
.btn.primary{background:linear-gradient(180deg,rgba(8,40,22,.9),rgba(6,28,18,.85));border-color:rgba(90,220,160,0.45);box-shadow:inset 0 0 0 1px rgba(90,220,160,0.15)}
.btn.primary:hover{border-color:rgba(120,255,190,0.6);background:linear-gradient(180deg,rgba(10,50,28,.95),rgba(6,32,20,.9))}
.btn.ghost{background:rgba(0,10,30,0.25)}
button.pick{width:100%}
.search{flex:1 1 auto;padding:.5rem .6rem;border-radius:.45rem;border:1px solid rgba(30,144,255,0.35);background:rgba(1,8,18,0.45);color:#e6f3ff}
.search::placeholder{color:#86a8c6}
.search:focus{outline:none;border-color:rgba(120,200,255,0.55);box-shadow:0 0 0 2px rgba(120,200,255,0.25);background:rgba(1,12,24,0.55)}
.check{display:flex;align-items:center;gap:.45rem;color:#cfe7ff}.check input{width:16px;height:16px}
.groups{display:grid;gap:1rem;padding-bottom:2px}
.group-card{border:1px solid rgba(30,144,255,0.28);background:rgba(0,10,30,0.28);border-radius:.6rem;padding:.7rem .8rem;display:grid;gap:.6rem}
.group-head{display:flex;align-items:baseline;gap:.6rem}
.group-title{margin:0;color:#d9ebff;text-transform:uppercase;letter-spacing:.12em;font-size:1.12rem;line-height:1.2;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.subcount{color:#9ec5e6;font-size:.9rem;margin-left:.5rem}
.group-actions{display:flex;gap:.4rem;flex-wrap:wrap}
.slots-grid{display:grid;grid-template-columns:repeat(5,minmax(200px,1fr));gap:.7rem}
@media (min-width:1680px){.slots-grid{grid-template-columns:repeat(6,minmax(200px,1fr))}}
@media (max-width:1500px){.slots-grid{grid-template-columns:repeat(4,minmax(180px,1fr))}}
@media (max-width:1100px){.slots-grid{grid-template-columns:repeat(3,minmax(160px,1fr))}}
@media (max-width:820px){.slots-grid{grid-template-columns:repeat(2,minmax(150px,1fr))}}
@media (max-width:560px){.slots-grid{grid-template-columns:1fr}}
.slot{border:1px solid rgba(30,144,255,0.25);background:linear-gradient(180deg,rgba(1,8,16,0.6),rgba(0,10,20,0.32));border-radius:.55rem;padding:.55rem .6rem;display:grid;gap:.45rem;transition:border-color 120ms ease,box-shadow 120ms ease,transform 80ms ease}
.slot:hover{border-color:rgba(120,200,255,0.45);box-shadow:0 0 0 1px rgba(120,200,255,0.08) inset}
.slot.vacant{border-style:dashed;opacity:.98}
.slot.closed{filter:grayscale(85%);opacity:.6;background:rgba(1,6,14,.9)}
.slot-topline{display:flex;align-items:center;gap:.5rem}
.slot-tag{font-size:.78rem;letter-spacing:.12em;color:#9ec5e6}
.slot-role{margin-left:auto;color:#9ec5e6;font-size:.82rem;opacity:.9}
.slot-body{display:grid;gap:.45rem}
.slot-name{color:#e6f3ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:1.2em}
.cert-row{display:flex}
.chip{display:inline-flex;align-items:center;gap:.35rem;border:1px solid rgba(90,220,160,0.45);color:#bfffe0;background:rgba(4,24,16,.5);padding:.16rem .45rem;border-radius:999px;font-size:.78rem;letter-spacing:.02em}
.chip svg circle{fill:none;stroke:rgba(120,255,190,0.7);stroke-width:2}
.overview{display:grid;gap:.9rem}
.ov-subtitle{margin:.2rem 0;color:#cfe7ff;letter-spacing:.06em}
.summary{display:grid;gap:.25rem}
.summary-row{display:flex;justify-content:space-between;color:#e6f3ff}
.summary-row .label{color:#9ec5e6}
.summary-row.total{margin-top:.35rem;border-top:1px solid rgba(30,144,255,0.25);padding-top:.35rem}
.ov-actions{display:flex;gap:.5rem;flex-wrap:wrap}
.free-list{list-style:none;margin:.4rem 0 0;padding:0;display:grid;gap:.2rem}
.free-list li{display:flex;gap:.4rem;color:#e6f3ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.free-list .meta{color:#9ec5e6}
.picker-veil{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:grid;place-items:center;z-index:1000}
.picker{width:min(900px,92vw);max-height:80vh;overflow:hidden;border-radius:.8rem;border:1px solid rgba(30,144,255,0.45);background:rgba(0,10,30,0.98);display:grid;grid-template-rows:auto auto 1fr auto}
.picker-head{display:flex;align-items:center;justify-content:space-between;padding:.8rem .9rem;border-bottom:1px solid rgba(30,144,255,0.25)}
.picker-controls{display:flex;gap:.8rem;align-items:center;padding:.6rem .9rem;border-bottom:1px solid rgba(30,144,255,0.18)}
.picker-list{overflow:auto;padding:.6rem .4rem;display:grid;gap:.4rem}
.pick-row{display:grid;grid-template-columns:1fr auto auto;gap:.6rem;align-items:center;border:1px solid rgba(30,144,255,0.25);background:rgba(0,10,30,0.2);border-radius:.5rem;padding:.5rem .6rem}
.pick-row.assigned{background:rgba(30,144,255,0.08)}
.p-name{color:#e6f3ff;font-weight:600}
.p-meta .subtle{color:#9ec5e6;font-size:.86rem}
.badge{color:#79ffba;border:1px solid rgba(120,255,170,0.55);border-radius:999px;padding:.1rem .5rem;font-size:.78rem}
.zoom-veil{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:grid;place-items:center;z-index:1100}
.zoom{width:min(1200px,94vw);max-height:88vh;overflow:hidden;border-radius:.9rem;border:1px solid rgba(30,144,255,0.45);background:rgba(0,10,30,0.98);display:grid;grid-template-rows:auto 1fr auto;animation:contentEntry 260ms ease-out both}
.zoom-head{display:flex;align-items:center;justify-content:space-between;padding:.8rem .9rem;border-bottom:1px solid rgba(30,144,255,0.25)}
.zoom-actions{display:flex;gap:.6rem;flex-wrap:wrap}
.zoom-grid{overflow:auto;padding:.8rem .9rem;display:grid;gap:.8rem;grid-template-columns:repeat(3,minmax(240px,1fr))}
@media (max-width:1000px){.zoom-grid{grid-template-columns:repeat(2,minmax(240px,1fr))}}
@media (max-width:640px){.zoom-grid{grid-template-columns:1fr}}
.zoom-slot{border:1px solid rgba(30,144,255,0.35);background:linear-gradient(180deg,rgba(1,8,16,0.6),rgba(0,10,20,0.32));border-radius:.6rem;padding:.7rem .75rem;display:grid;gap:.5rem}
.zoom-slot.vacant{border-style:dashed}
.zoom-top{display:flex;align-items:center;gap:.5rem}.zoom-top .gap{flex:1 1 auto}
.zoom-body{display:grid;gap:.5rem}
.zoom-name{color:#e6f3ff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zoom-cert{display:grid;gap:.25rem}
.zoom-cert label{color:#9ec5e6;font-size:.82rem;letter-spacing:.06em}
.select{padding:.45rem .55rem;border-radius:.45rem;border:1px solid rgba(30,144,255,0.35);background:rgba(1,8,18,0.45);color:#e6f3ff}
.zoom-foot{padding:.7rem .9rem;border-top:1px solid rgba(30,144,255,0.25);display:flex;justify-content:flex-end;gap:.6rem}
.section-content-container.animate{animation:contentEntry 260ms ease-out both}
@keyframes contentEntry{0%{opacity:0;filter:brightness(1.15) saturate(1.05) blur(1px)}60%{opacity:1;filter:brightness(1.0) saturate(1.0) blur(0)}80%{opacity:.98;filter:brightness(1.03)}100%{opacity:1;filter:none}}
</style>
