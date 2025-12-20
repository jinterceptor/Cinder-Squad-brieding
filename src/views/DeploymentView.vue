<template>
  <div
    id="deploymentView"
    class="content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- HEADER -->
    <section class="section-container deployment-window">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>{{ viewMode === 'summary' ? 'DEPLOYMENT' : currentUnit?.title || 'ELEMENT' }}</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <!-- SUMMARY MODE -->
      <div
        v-if="viewMode === 'summary'"
        class="section-content-container deploy-scroll"
        :class="{ animate: animateView }"
      >
        <div class="panel">
          <div class="summary-toolbar">
            <button class="btn ghost small" @click="fillAllFromRoster">Auto-fill All</button>
            <button class="btn ghost small" @click="resetPlan">Reset</button>
            <button class="btn ghost small" @click="exportJson">Export JSON</button>
            <div class="muted small" style="margin-left:auto;">
              Assigned: {{ totalAssigned }} / {{ totalSlots }} · Unassigned: {{ unassignedCount }}
            </div>
          </div>

          <div v-if="!plan.units.length" class="muted">No eligible elements found.</div>

          <div class="cards-grid">
            <div
              v-for="g in plan.units"
              :key="g.key"
              class="unit-card"
              @click="openDetail(g.key)"
              role="button"
              tabindex="0"
            >
              <div class="unit-card-head">
                <img src="/icons/license.svg" alt="" />
                <h2 class="unit-title">{{ g.title }}</h2>
                <span class="pill">{{ filledCount(g) }}/{{ g.slots.length }}</span>
              </div>

              <div class="unit-card-body">
                <ul class="assigned-list">
                  <li v-for="s in g.slots.filter(s=>!!s.id).slice(0,8)" :key="s.id">
                    <span class="name" :title="displayName(s)">{{ displayName(s) }}</span>
                    <span v-if="s.role" class="meta">· {{ s.role }}</span>
                  </li>
                </ul>
                <div v-if="g.slots.filter(s=>!!s.id).length > 8" class="muted small">
                  +{{ g.slots.filter(s=>!!s.id).length - 8 }} more…
                </div>
              </div>

              <div class="unit-card-foot">
                <button class="btn primary small" @click.stop="openDetail(g.key)">Open</button>
                <button class="btn ghost small" @click.stop="fillFromRoster(g.key)">Auto-fill</button>
                <button class="btn ghost small" @click.stop="clearGroup(g.key)">Clear</button>

                <!-- Points only for Chalk 1–4 -->
                <span
                  v-if="isPointsUnit(g.title)"
                  class="pts small"
                  :class="{ over: unitPointsUsed(g) > SQUAD_POINT_CAP }"
                  title="Certification points"
                >
                  {{ unitPointsUsed(g) }} / {{ SQUAD_POINT_CAP }} pts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DETAIL MODE -->
      <div
        v-else
        class="section-content-container deploy-scroll"
        :class="{ animate: animateView }"
      >
        <div class="panel">
          <div class="detail-toolbar">
            <button class="btn ghost small" @click="backToSummary">Back</button>
            <button class="btn ghost small" @click="fillFromRoster(detailKey)">Auto-fill</button>
            <button class="btn ghost small" @click="clearGroup(detailKey)">Clear</button>

            <div class="muted small" style="margin-left:auto; display:flex; align-items:center; gap:.6rem">
              <span>{{ filledCount(currentUnit) }} / {{ currentUnit?.slots.length || 0 }} assigned</span>
              <span class="divider" />
              <span
                v-if="currentUnit && isPointsUnit(currentUnit.title)"
                class="pts big"
                :class="{ over: unitPointsUsed(currentUnit) > SQUAD_POINT_CAP }"
              >
                Points: {{ unitPointsUsed(currentUnit) }} / {{ SQUAD_POINT_CAP }}
              </span>
            </div>
          </div>

          <div v-if="!currentUnit" class="muted">No element selected.</div>

          <div v-else class="group-card">
            <div v-if="detailError" class="warn">{{ detailError }}</div>

            <div class="slots-grid">
              <div
                v-for="(slot, sIdx) in currentUnit.slots"
                :key="`slot-${detailKey}-${sIdx}`"
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
                      @click.stop="clearSlot(detailKey, sIdx)"
                    >Clear</button>
                    <button type="button" class="btn ghost xsmall" @click.stop="removeSlot(detailKey, sIdx)">–</button>
                  </div>
                </div>

                <div class="slot-body">
                  <div class="slot-name" :title="displayName(slot)">{{ displayName(slot) }}</div>

                  <!-- Cert picker -->
                  <div v-if="slot.id" class="zoom-cert">
                    <label>Cert</label>
                    <select
                      class="select"
                      :value="slot.cert || ''"
                      @change="onChangeCert(detailKey, sIdx, $event.target.value)"
                    >
                      <option value="">—</option>
                      <option v-for="c in getCertsForPersonId(slot.id)" :key="c" :value="c">
                        {{ c }}{{ certPointSuffix(c) }}
                      </option>
                    </select>
                  </div>

                  <!-- Disposable: show for ALL in Chalk 1–4 -->
                  <div
                    v-if="slot.id && currentUnit && isPointsUnit(currentUnit.title)"
                    class="disp-row"
                  >
                    <label class="check">
                      <input
                        type="checkbox"
                        :checked="!!slot.disposable"
                        @change="onToggleDisposable(detailKey, sIdx, $event.target.checked)"
                      />
                      Disposable launcher <span class="muted small">( +{{ DISPOSABLE_COST }} pt )</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    class="btn primary pick"
                    :disabled="slot.origStatus === 'CLOSED'"
                    @click.stop="openPicker(detailKey, sIdx)"
                  >
                    {{ slot.id ? 'Swap' : (slot.origStatus === 'CLOSED' ? 'Closed' : 'Assign') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="actions-row">
              <button type="button" class="btn ghost" @click.stop="addSlot(detailKey)">Add slot</button>
              <button type="button" class="btn ghost" @click.stop="exportJson">Export JSON</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ASSIGN/SWAP PICKER -->
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

      viewMode: "summary",
      detailKey: "",
      detailError: "",

      plan: { units: [] },
      picker: { open: false, unitKey: "", slotIdx: -1, query: "", onlyFree: false },

      personnel: [],
      STORAGE_KEY: "deploymentPlan2",

      MIN_CHALK_SLOTS: 12,
      ROLE_ORDER: ["squad lead", "team leader", "corpsman 1", "corpsman 2"],
      EXCLUDED_UNITS: /^(fillers?|recruits?|reserves?)$/i,

      /* certification system */
      SQUAD_POINT_CAP: 10,
      DISPOSABLE_COST: 1,
      CERT_POINTS: {
        "Rifleman": 0,
        "Grenadier": 1,
        "Breacher": 1,
        "RTO": 1,
        "Machine Gunner": 2,
        "Marksman": 2,
        "Combat Engineer": 2,
        "Anti Tank": 3,
        "Corpsmen": 3,
        "PJ": 3,
        "Pilot": 3,
        "NCO": 0,
        "Officer": 0,
      },
      certLabels: [
        "Rifleman","Machine Gunner","Anti Tank","Corpsmen","Combat Engineer",
        "Marksman","Breacher","Grenadier","Pilot","RTO","PJ","NCO","Officer",
      ],
    };
  },
  created() {
    this.personnel = this.buildPersonnelPool(this.orbat);
    const saved = this.loadSaved();
    this.plan.units = (saved ?? this.buildUnitsFromOrbat(this.orbat)).filter(
      (u) => !this.EXCLUDED_UNITS.test(this.normalizeTitle(u.title))
    );
    this.plan.units.forEach(u => u.slots.forEach(s => { if (typeof s.disposable === "undefined") s.disposable = false; }));
  },
  mounted() { this.triggerFlicker(0); },
  computed: {
    currentUnit() { return this.plan.units.find(u => u.key === this.detailKey) || null; },
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
  },
  methods: {
    /* Quick helper: which units use points? */
    isPointsUnit(title) {
      const t = String(title || "").toLowerCase();
      return /\bchalk\s*[1-4]\b/.test(t);
    },

    /* animation */
    triggerFlicker(delayMs = 0) {
      this.animateView = false;
      this.animationDelay = `${delayMs}ms`;
      this.$nextTick(() => requestAnimationFrame(() => (this.animateView = true)));
    },

    /* routing-like mode switches */
    openDetail(unitKey) {
      this.detailKey = unitKey;
      this.viewMode = "detail";
      this.detailError = "";
      this.triggerFlicker(0);
    },
    backToSummary() {
      this.viewMode = "summary";
      this.detailKey = "";
      this.detailError = "";
      this.triggerFlicker(0);
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

    /* cert extraction */
    extractCertsFromMember(member) {
      const arr = member?.certifications;
      if (Array.isArray(arr) && arr.length) {
        const out = [];
        for (let i = 0; i < Math.min(arr.length, this.certLabels.length); i++) {
          const v = arr[i];
          const truthy = v === true || v === 1 || v === "1" || String(v).toUpperCase() === "Y";
          if (truthy) out.push(this.certLabels[i]);
        }
        return [...new Set(out)];
      }
      if (arr && typeof arr === "object") {
        const out = [];
        for (const [k, v] of Object.entries(arr)) {
          const truthy = v === true || v === 1 || v === "1" || String(v).toUpperCase() === "Y";
          if (!truthy) continue;
          const label = this.bestCertLabelMatch(k);
          if (label) out.push(label);
        }
        return [...new Set(out)];
      }
      const raw = member?.certs || member?.skills || member?.cert || "";
      if (typeof raw === "string" && raw.trim()) {
        const tokens = raw.split(/[;,/|]/g).map(s => s.trim()).filter(Boolean);
        return [...new Set(tokens.map(this.bestCertLabelMatch).filter(Boolean))];
      }
      if (Array.isArray(raw)) {
        return [...new Set(raw.map(this.bestCertLabelMatch).filter(Boolean))];
      }
      return [];
    },
    bestCertLabelMatch(name) {
      const n = String(name || "").trim().toLowerCase();
      const map = {
        "rifleman":"Rifleman","mg":"Machine Gunner","machinegunner":"Machine Gunner","machine gunner":"Machine Gunner",
        "anti tank":"Anti Tank","at":"Anti Tank","corpsman":"Corpsmen","medic":"Corpsmen","combat engineer":"Combat Engineer",
        "engineer":"Combat Engineer","marksman":"Marksman","breacher":"Breacher","grenadier":"Grenadier","pilot":"Pilot",
        "rto":"RTO","pj":"PJ","nco":"NCO","officer":"Officer",
      };
      if (map[n]) return map[n];
      for (const label of this.certLabels) if (n.includes(label.toLowerCase())) return label;
      return "";
    },
    getCertsForPersonId(personId) {
      const p = this.personnel.find(pp => String(pp.id) === String(personId));
      return p?.certs || [];
    },
    certPointSuffix(label) {
      const pts = this.CERT_POINTS[label] ?? 0;
      return pts ? ` (+${pts})` : "";
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
              const certs = this.extractCertsFromMember(s.member);
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

    isChalk(title) { return /\bchalk\s*\d+\b/i.test(String(title || "")); },
    padSlots(arr, min) { const out = arr.slice(); while (out.length < min) out.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "", disposable: false }); return out; },
    keyFromName(name) { return String(name || "").trim().toLowerCase().replace(/\s+/g, "-"); },
    filledCount(g) { if(!g) return 0; return g.slots.reduce((n, s) => n + (s.id ? 1 : 0), 0); },
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
              disposable: false,
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
            disposable: false,
          };
          if (slot.id) slot.cert = this.ensureSlotCert(slot, slot.role);
          slots.push(slot);
        });
      });
      let finalSlots = this.sortSlotsByRole(slots);
      if (this.isChalk(unit.squad)) finalSlots = this.padSlots(finalSlots, this.MIN_CHALK_SLOTS);
      return { key: unitKey, title: unit.squad, slots: finalSlots };
    },

    /* points helpers */
    unitPointsUsed(unit) {
      if (!unit || !this.isPointsUnit(unit.title)) return 0;
      return unit.slots.reduce((sum, s) => {
        if (!s.id) return sum;
        const certPts = this.CERT_POINTS[s.cert] ?? 0;
        const dispPts = s.disposable ? this.DISPOSABLE_COST : 0;
        return sum + certPts + dispPts;
      }, 0);
    },
    wouldExceedCap(unitKey, delta) {
      const unit = this.plan.units.find(u => u.key === unitKey);
      if (!unit || !this.isPointsUnit(unit.title)) return false; // never block outside Chalk 1–4
      return this.unitPointsUsed(unit) + delta > this.SQUAD_POINT_CAP;
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
      const isPoints = this.isPointsUnit(g.title);

      const available = this.getCertsForPersonId(p.id);
      const chosenCertDefault = available.includes(target.cert) ? target.cert : (available[0] || target.role || p.role || "");

      // compute delta only if this group is points-enabled
      if (isPoints) {
        const prevPts = (this.CERT_POINTS[target.cert] ?? 0) + (target.disposable ? this.DISPOSABLE_COST : 0);
        const nextPts = (this.CERT_POINTS[chosenCertDefault] ?? 0); // new assignee starts disposable=false
        const delta = nextPts - prevPts;
        if (this.wouldExceedCap(g.key, Math.max(0, delta))) {
          this.detailError = `Point cap ( ${this.SQUAD_POINT_CAP} ) would be exceeded.`;
          return;
        }
      }
      this.detailError = "";

      if (from && target?.id && !(from.unitKey === g.key && from.slotIdx === this.picker.slotIdx)) {
        const srcIdx = this.plan.units.findIndex(u => u.key === from.unitKey);
        const srcGroup = this.plan.units[srcIdx];
        const tmp = { ...target };

        const newTarget = {
          ...target, id: p.id, name: p.name,
          role: target.role || p.role || "", cert: chosenCertDefault, disposable: false,
        };

        const newSrcSlots = srcGroup.slots.slice();
        newSrcSlots[from.slotIdx] = { ...newSrcSlots[from.slotIdx], id: tmp.id, name: tmp.name, cert: tmp.cert || this.ensureSlotCert(tmp, tmp.role), disposable: !!tmp.disposable };
        const newSrc = { ...srcGroup, slots: this.sortSlotsByRole(newSrcSlots) };

        const newGSlots = g.slots.slice();
        newGSlots[this.picker.slotIdx] = newTarget;
        const newG = { ...g, slots: this.sortSlotsByRole(newGSlots) };

        this.plan.units = this.plan.units.map((u, i) => (i === gIdx ? newG : i === srcIdx ? newSrc : u));
      } else {
        const newSlots = g.slots.slice();
        newSlots[this.picker.slotIdx] = { ...target, id: p.id, name: p.name, role: target.role || p.role || "", cert: chosenCertDefault, disposable: false };
        const newG = { ...g, slots: this.sortSlotsByRole(newSlots) };
        this.plan.units = this.plan.units.map((u, i) => (i === gIdx ? newG : u));
      }

      this.persistPlan();
      this.closePicker();
    },

    clearCurrentSlot() { if (!this.picker.open) return; this.clearSlot(this.picker.unitKey, this.picker.slotIdx); },
    clearSlot(unitKey, slotIdx) {
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const newSlots = g.slots.slice();
      newSlots[slotIdx] = { ...newSlots[slotIdx], id: null, name: null, cert: "", disposable: false };
      const newG = { ...g, slots: this.sortSlotsByRole(newSlots) };
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? newG : u));
      this.persistPlan();
      this.detailError = "";
    },
    clearGroup(unitKey) {
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const emptied = g.slots.map(s => ({ ...s, id: null, name: null, cert: "", disposable: false }));
      const newG = { ...g, slots: this.sortSlotsByRole(emptied) };
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? newG : u));
      this.persistPlan();
      this.detailError = "";
    },
    addSlot(unitKey) {
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const g = this.plan.units[idx];
      const newSlots = g.slots.slice();
      newSlots.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "", disposable: false });
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
      this.detailError = "";
    },

    /* points-aware handlers */
    onChangeCert(unitKey, slotIdx, nextCert) {
      const uIdx = this.plan.units.findIndex(u => u.key === unitKey);
      if (uIdx < 0) return;
      const unit = this.plan.units[uIdx];
      const slot = unit.slots[slotIdx];
      const isPoints = this.isPointsUnit(unit.title);

      if (isPoints) {
        const prevPts = (this.CERT_POINTS[slot.cert] ?? 0) + (slot.disposable ? this.DISPOSABLE_COST : 0);
        const nextPts = (this.CERT_POINTS[nextCert] ?? 0) + (slot.disposable ? this.DISPOSABLE_COST : 0);
        const delta = nextPts - prevPts;

        if (this.wouldExceedCap(unitKey, Math.max(0, delta))) {
          this.detailError = `Point cap ( ${this.SQUAD_POINT_CAP} ) would be exceeded.`;
          return;
        }
      }
      this.detailError = "";

      const newSlots = unit.slots.slice();
      newSlots[slotIdx] = { ...slot, cert: nextCert };
      const newU = { ...unit, slots: this.sortSlotsByRole(newSlots) };
      this.plan.units = this.plan.units.map((u, i) => (i === uIdx ? newU : u));
      this.persistPlan();
    },
    onToggleDisposable(unitKey, slotIdx, checked) {
      const uIdx = this.plan.units.findIndex(u => u.key === unitKey);
      if (uIdx < 0) return;
      const unit = this.plan.units[uIdx];
      const slot = unit.slots[slotIdx];

      if (!this.isPointsUnit(unit.title)) {
        // outside Chalk 1–4: ignore / force false
        const newSlots = unit.slots.slice();
        newSlots[slotIdx] = { ...slot, disposable: false };
        const newU = { ...unit, slots: newSlots };
        this.plan.units = this.plan.units.map((u, i) => (i === uIdx ? newU : u));
        this.persistPlan();
        return;
      }

      const add = checked ? this.DISPOSABLE_COST : 0;
      const remove = !checked ? this.DISPOSABLE_COST : 0;
      const delta = add - remove;

      if (this.wouldExceedCap(unitKey, Math.max(0, delta))) {
        this.detailError = `Point cap ( ${this.SQUAD_POINT_CAP} ) would be exceeded.`;
        return;
      }
      this.detailError = "";

      const newSlots = unit.slots.slice();
      newSlots[slotIdx] = { ...slot, disposable: checked === true };
      const newU = { ...unit, slots: newSlots };
      this.plan.units = this.plan.units.map((u, i) => (i === uIdx ? newU : u));
      this.persistPlan();
    },

    /* fill / reset */
    fillFromRoster(unitKey) {
      const rebuilt = this.buildUnitFromOrbatByKey(this.orbat, unitKey);
      if (!rebuilt) return;
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const keepLen = Math.max(this.plan.units[idx].slots.length, rebuilt.slots.length);
      while (rebuilt.slots.length < keepLen) rebuilt.slots.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "", disposable: false });
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? rebuilt : u));
      this.persistPlan();
      this.detailError = "";
      this.triggerFlicker(0);
    },
    fillAllFromRoster() {
      const rebuilt = this.buildUnitsFromOrbat(this.orbat);
      const out = rebuilt.map(u => {
        const prev = this.plan.units.find(x => x.key === u.key);
        const keepLen = prev ? Math.max(prev.slots.length, u.slots.length) : u.slots.length;
        while (u.slots.length < keepLen) u.slots.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "", disposable: false });
        return u;
      });
      this.plan.units = out;
      this.persistPlan();
      this.detailError = "";
      this.triggerFlicker(0);
    },
    resetPlan() {
      this.plan.units = this.buildUnitsFromOrbat(this.orbat);
      this.persistPlan();
      this.detailError = "";
      this.triggerFlicker(0);
    },

    /* utility */
    exportJson() {
      const blob = new Blob([JSON.stringify(this.plan, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "deployment-plan.json"; a.click();
      URL.revokeObjectURL(url);
    },
  },
  watch: {
    orbat: { deep: true, handler(newV) {
      if (Array.isArray(newV) && newV.length) {
        this.personnel = this.buildPersonnelPool(newV);
      }
    }},
    plan:  { deep: true, handler() { this.persistPlan(); } },
  },
};
</script>

<style scoped>
#deploymentView{display:grid;grid-template-columns:1fr;gap:1.2rem;align-items:start;height:calc(94vh - 100px);overflow:hidden;padding:28px 18px 32px}
.deployment-window.section-container{max-width:none!important;width:auto}
.header-shell{height:52px;overflow:hidden}.section-header,.section-content-container{width:100%}
.deploy-scroll{max-height:calc(94vh - 100px - 52px - 36px);overflow-y:auto;scrollbar-gutter:stable both-edges;padding-bottom:36px}

.panel{border:1px dashed rgba(30,144,255,0.35);background:rgba(0,10,30,0.18);border-radius:.6rem;padding:.8rem .9rem;overflow:visible}
.muted{color:#9ec5e6}.small{font-size:.86rem}
.summary-toolbar,.detail-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem}
.divider{width:1px;height:18px;background:rgba(158,197,230,0.35);display:inline-block}

/* Cards */
.cards-grid{display:grid;gap:1rem;grid-template-columns:repeat(3,minmax(260px,1fr))}
@media (max-width:1400px){.cards-grid{grid-template-columns:repeat(2,minmax(260px,1fr))}}
@media (max-width:900px){.cards-grid{grid-template-columns:1fr}}
.unit-card{background:rgba(0,10,30,.32);border:1px solid rgba(30,144,255,.28);border-radius:.7rem;padding:.75rem .8rem;cursor:pointer;transition:transform 80ms ease,border-color 120ms ease,box-shadow 120ms ease}
.unit-card:hover{transform:translateY(-1px);border-color:rgba(120,200,255,.45);box-shadow:0 0 0 1px rgba(120,200,255,.08) inset}
.unit-card-head{display:flex;align-items:center;gap:.6rem}
.unit-card-head img{width:20px;height:20px}
.unit-title{margin:0;color:#d9ebff;text-transform:uppercase;letter-spacing:.12em;font-size:1.02rem;line-height:1.2;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pill{border:1px solid rgba(120,255,190,.45);color:#caffe9;border-radius:999px;padding:.06rem .5rem;font-size:.78rem}
.unit-card-body{margin-top:.6rem}
.assigned-list{list-style:none;margin:0;padding:0;display:grid;gap:.18rem}
.assigned-list li{display:flex;gap:.35rem;color:#e6f3ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.assigned-list .meta{color:#9ec5e6}
.unit-card-foot{display:flex;gap:.45rem;align-items:center;margin-top:.6rem}
.unit-card-foot .pts{margin-left:auto;color:#caffe9;border:1px solid rgba(120,255,190,.45);border-radius:.45rem;padding:.06rem .45rem}
.unit-card-foot .pts.over{color:#ffd4d4;border-color:rgba(255,140,140,.55);}

/* Detail slots */
.group-card{border:1px solid rgba(30,144,255,0.28);background:rgba(0,10,30,0.28);border-radius:.6rem;padding:.7rem .8rem;display:grid;gap:.6rem}
.warn{border:1px solid rgba(255,120,120,.5);background:rgba(90,0,0,.25);color:#ffdcdc;border-radius:.5rem;padding:.4rem .6rem}
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
.zoom-cert{display:grid;gap:.25rem}
.zoom-cert label{color:#9ec5e6;font-size:.82rem;letter-spacing:.06em}
.select{padding:.45rem .55rem;border-radius:.45rem;border:1px solid rgba(30,144,255,0.35);background:rgba(1,8,18,0.45);color:#e6f3ff}
.disp-row{margin-top:.1rem}
.check{display:inline-flex;align-items:center;gap:.4rem}

/* Buttons */
.actions-row{display:flex;gap:.6rem;flex-wrap:wrap;padding-top:.4rem}
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
.pts.big{color:#caffe9;border:1px solid rgba(120,255,190,.45);border-radius:.45rem;padding:.12rem .5rem}
.pts.big.over{color:#ffd4d4;border-color:rgba(255,140,140,.55)}

/* Picker modal */
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

/* Flicker */
.section-content-container.animate{animation:contentEntry 260ms ease-out both}
@keyframes contentEntry{
  0%{opacity:0;filter:brightness(1.1) saturate(1.03) blur(1px)}
  60%{opacity:1;filter:brightness(1.0) saturate(1.0) blur(0)}
  80%{opacity:.98;filter:brightness(1.03)}
  100%{opacity:1;filter:none}
}
</style>
