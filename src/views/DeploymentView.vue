<template>
  <div id="deploymentView" class="content-container" :class="{ animate: animateView }" :style="{ 'animation-delay': animationDelay }">
    <section class="section-container deployment-window">
      <div class="header-shell">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>DEPLOYMENT — {{ currentUnit?.title || 'Chalk' }}</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container deploy-scroll" :class="{ animate: animateView }">
        <div class="panel">
          <div class="detail-toolbar">
            <div class="toolbar-left">
              <label class="muted small">Chalk</label>
              <select class="select chalk-picker" v-model="detailKey">
                <option v-for="u in chalkUnits" :key="u.key" :value="u.key">{{ u.title }}</option>
              </select>
              <button class="btn ghost small" @click="fillFromRoster(detailKey)">Auto-fill</button>
              <button class="btn ghost small" @click="clearGroup(detailKey)">Clear</button>
              <button class="btn ghost small" @click="resetPlan">Reset All</button>
            </div>

            <div class="toolbar-right">
              <span class="muted small">{{ filledCount(currentUnit) }} / {{ currentUnit?.slots.length || 0 }} assigned</span>
              <span class="divider" />
              <span v-if="currentUnit" class="pts big" :class="{ over: pointsUsed > SQUAD_POINT_CAP }">
                Points: {{ pointsUsed }} / {{ SQUAD_POINT_CAP }}
              </span>
              <span class="divider" />
              <span class="muted small">{{ authModeLabel }}</span>
            </div>
          </div>

          <div v-if="!apiBase" class="warn">
            Apps Script /exec URL missing. Use your Netlify proxy to avoid CORS:
            <ul style="margin:.3rem 0 .1rem .9rem">
              <li><code>&lt;DeploymentView :execUrl="'/.netlify/functions/gas'" /&gt;</code></li>
              <li><code>window.DEPLOYMENT_EXEC_URL = "/.netlify/functions/gas"</code></li>
              <li><code>localStorage.setItem('deploymentExecUrl','/.netlify/functions/gas')</code></li>
              <li class="muted">Legacy: meta <code>apps-script-exec</code>, <code>window.APP_EXEC_URL</code>, <code>localStorage.execUrl</code></li>
            </ul>
          </div>

          <div v-if="!authToken" class="warn" style="margin-top:.4rem">
            Login required to <strong>Save</strong>. Viewing/Loading is open to everyone.
          </div>

          <div v-if="debugInfo" class="muted small" style="opacity:.8">Status: {{ debugInfo }}</div>
          <div v-if="apiError" class="warn">{{ apiError }}</div>
          <div v-if="!currentUnit" class="muted">No chalk selected.</div>

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
                    <button v-if="slot.id" type="button" class="btn ghost xsmall" @click.stop="clearSlot(detailKey, sIdx)">Clear</button>
                    <button type="button" class="btn ghost xsmall" @click.stop="removeSlot(detailKey, sIdx)">–</button>
                  </div>
                </div>

                <div class="slot-body">
                  <div class="slot-name" :title="displayName(slot)">{{ displayName(slot) }}</div>

                  <div v-if="slot.id" class="zoom-cert">
                    <label>Cert</label>
                    <select class="select" :value="slot.cert || ''" @change="onChangeCert(detailKey, sIdx, $event.target.value)">
                      <option value="">—</option>
                      <option v-for="c in getCertsForPersonId(slot.id)" :key="c" :value="c">{{ c }}{{ certPointSuffix(c) }}</option>
                    </select>
                  </div>

                  <div v-if="slot.id && currentUnit" class="disp-row">
                    <label class="check">
                      <input type="checkbox" :checked="!!slot.disposable" @change="onToggleDisposable(detailKey, sIdx, $event.target.checked)" />
                      <span class="check-label">Disposable launcher <span class="muted small">( +{{ DISPOSABLE_COST }} pt )</span></span>
                    </label>
                  </div>

                  <!-- ✅ Fix: use single quotes inside the JS expression -->
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
              <button type="button" class="btn ghost" @click.stop="exportJson">Export JSON (Local)</button>

              <span class="divider" />
              <button
                type="button"
                class="btn primary"
                :disabled="busy || !apiBase || !authToken"
                @click="saveRemote(detailKey)"
                :title="!authToken ? 'Login required to save' : ''"
              >
                {{ busy ? 'Saving…' : 'Save Chalk (Remote)' }}
              </button>
              <button type="button" class="btn" :disabled="busy || !apiBase" @click="loadRemote(detailKey)">
                Load Chalk (Remote) <span v-if="versions[detailKey] !== undefined" class="muted small">v{{ versions[detailKey] }}</span>
              </button>
              <button type="button" class="btn" :disabled="busy || !apiBase" @click="exportRemote('json')">Export Remote JSON</button>
              <button type="button" class="btn" :disabled="busy || !apiBase" @click="exportRemote('csv')">Export Remote CSV</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Assign/Swap Picker -->
    <div v-if="picker.open" class="picker-veil" @click.self="closePicker">
      <div class="picker">
        <div class="picker-head">
          <h3>{{ currentSlotTitle }} <span class="muted">— select soldier</span></h3>
          <button type="button" class="btn ghost" @click="closePicker">Close</button>
        </div>

        <div class="picker-controls">
          <input v-model="picker.query" placeholder="Search by name / callsign / role" class="search" @keydown.stop />
          <label class="check"><input type="checkbox" v-model="picker.onlyFree" /> <span class="check-label">Show only unassigned</span></label>
        </div>

        <div class="picker-list">
          <div v-for="p in filteredPersonnel" :key="p.id" class="pick-row" :class="{ assigned: !!findAssignment(p.id) }">
            <div class="pick-info">
              <div class="p-name" :title="p.name">{{ p.name }}</div>
              <div class="p-meta">
                <span v-if="p.callsign" class="subtle">{{ p.callsign }}</span>
                <span v-if="p.role" class="subtle">• {{ p.role }}</span>
              </div>
            </div>
            <div class="pick-status">
              <span v-if="findAssignment(p.id)" class="badge">Assigned: {{ formatAssignment(findAssignment(p.id)) }}</span>
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
/* cookie reader without regex (build-safe) */
function readCookie(name) {
  try {
    const target = `${name}=`;
    const parts = document.cookie ? document.cookie.split(';') : [];
    for (let i = 0; i < parts.length; i++) {
      const v = parts[i].trim();
      if (v.startsWith(target)) return decodeURIComponent(v.substring(target.length));
    }
    return '';
  } catch { return ''; }
}

/* support Netlify Identity token if present */
async function netlifyIdentityToken() {
  try {
    const id = window.netlifyIdentity;
    if (!id) return '';
    const user = id.currentUser();
    if (!user) return '';
    const token = await user.jwt();
    return token || '';
  } catch { return ''; }
}

export default {
  name: "DeploymentView",
  props: {
    animate: { type: Boolean, default: true },
    orbat: { type: Array, default: () => [] },
    execUrl: { type: String, default: "" },
    secret: { type: String, default: "PLEX" },
    token:  { type: String, default: "" },
    defaultsCsvUrl: { type: String, default: "" },
  },
  data() {
    return {
      animateView: false,
      animationDelay: "0ms",
      detailKey: "",
      detailError: "",
      apiError: "",
      busy: false,
      plan: { units: [] },
      picker: { open: false, unitKey: "", slotIdx: -1, query: "", onlyFree: false },
      personnel: [],
      STORAGE_KEY: "deploymentPlan2",
      versions: {},
      deviceId: "",
      debugInfo: "",
      MIN_CHALK_SLOTS: 12,
      ROLE_ORDER: ["squad lead", "team leader", "corpsman 1", "corpsman 2"],
      SQUAD_POINT_CAP: 10,
      DISPOSABLE_COST: 1,
      CERT_POINTS: {
        Rifleman: 0, Grenadier: 1, Breacher: 1, RTO: 1,
        "Machine Gunner": 2, Marksman: 2, "Combat Engineer": 2,
        "Anti Tank": 3, Corpsmen: 3, PJ: 3, Pilot: 3, NCO: 0, Officer: 0,
      },
      certLabels: [
        "Rifleman","Machine Gunner","Anti Tank","Corpsmen","Combat Engineer",
        "Marksman","Breacher","Grenadier","Pilot","RTO","PJ","NCO","Officer",
      ],
      identityToken: "",
    };
  },
  async created() {
    this.ensureDeviceId();
    this.personnel = this.buildPersonnelPool(this.orbat);
    this.ensureUnitsBuilt(this.orbat);
    this.identityToken = await netlifyIdentityToken();
  },
  mounted() { this.triggerFlicker(0); },
  computed: {
    chalkUnits() { return this.plan.units; },
    currentUnit() { return this.plan.units.find(u => u.key === this.detailKey) || null; },
    currentSlotTitle() {
      if (!this.picker.open) return "";
      const g = this.plan.units.find(u => u.key === this.picker.unitKey);
      return g ? `${g.title} #${this.picker.slotIdx + 1}` : "";
    },
    filteredPersonnel() {
      const q = this.picker.query.trim().toLowerCase();
      const base = this.personnel.filter(
        p => !q ||
          (p.name || "").toLowerCase().includes(q) ||
          (p.callsign || "").toLowerCase().includes(q) ||
          (p.role || "").toLowerCase().includes(q)
      );
      return this.picker.onlyFree ? base.filter(p => !this.findAssignment(p.id)) : base;
    },
    authToken() {
      const tProp = (this.token || "").trim();
      if (tProp) return tProp;
      const tId = (this.identityToken || "").trim();
      if (tId) return tId;
      try {
        const ls = typeof localStorage !== "undefined" ? localStorage : null;
        const ss = typeof sessionStorage !== "undefined" ? sessionStorage : null;
        const keys = ["token","authToken","jwt","access_token","userToken","GAS_TOKEN","GAS_JWT"];
        for (const k of keys) {
          const v = (ls?.getItem(k) || ss?.getItem(k) || "").trim();
          if (v) return v;
        }
      } catch {}
      try {
        const ck = ["token","authToken","jwt","access_token"];
        for (const c of ck) {
          const v = (readCookie(c) || "").trim();
          if (v) return v;
        }
      } catch {}
      return "";
    },
    authModeLabel() {
      return this.authToken ? "User mode (token)" : "Device mode (anonymous)";
    },
    apiBase() {
      const direct = (this.execUrl || "").trim();
      if (direct) return direct;
      try { if (typeof window !== "undefined" && window.DEPLOYMENT_EXEC_URL) return String(window.DEPLOYMENT_EXEC_URL).trim(); } catch {}
      try {
        const ls = typeof localStorage !== "undefined" ? localStorage : null;
        const ss = typeof sessionStorage !== "undefined" ? sessionStorage : null;
        const ns = ls?.getItem("deploymentExecUrl") || ss?.getItem("deploymentExecUrl") || "";
        if (ns && ns.trim()) return ns.trim();
      } catch {}
      try {
        const meta = document?.querySelector('meta[name="apps-script-exec"]')?.content || "";
        if (meta && meta.trim()) return meta.trim();
      } catch {}
      try {
        if (typeof APP_EXEC_URL !== "undefined" && APP_EXEC_URL) return String(APP_EXEC_URL).trim();
        if (typeof window !== "undefined" && window.APP_EXEC_URL) return String(window.APP_EXEC_URL).trim();
      } catch {}
      try {
        const ls = typeof localStorage !== "undefined" ? localStorage : null;
        const ss = typeof sessionStorage !== "undefined" ? sessionStorage : null;
        const a = ls?.getItem("execUrl") || ss?.getItem("execUrl") || "";
        if (a && a.trim()) return a.trim();
      } catch {}
      return "";
    },
    pointsUsed() { return this.calcUnitPoints(this.currentUnit); },
  },
  methods: {
    async resetPlan() {
      this.detailError = ""; this.apiError = ""; this.debugInfo = "";
      const url = this.defaultsCsvUrl || (typeof window !== "undefined" ? window.DEFAULTS_CSV_URL : "");
      if (url) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`CSV HTTP ${res.status}`);
          const text = await res.text();
          const defaults = this.parseCsvDefaults(text);
          const updated = this.applyCsvDefaults(defaults);
          if (!updated) throw new Error("No matching chalks in CSV.");
          this.persistPlan(); this.triggerFlicker(0);
          this.debugInfo = "Reset from latest CSV defaults."; return;
        } catch (e) { this.apiError = `CSV fallback: ${String(e.message || e)}`; }
      }
      this.ensureUnitsBuilt(this.orbat); this.persistPlan(); this.triggerFlicker(0);
      if (!this.debugInfo) this.debugInfo = "Fallback defaults applied (ORBAT/template).";
    },

    parseCsvDefaults(csvText) {
      const rows = this.csvToRows(csvText);
      if (!rows.length) return {};
      const headers = rows[0].map(h => String(h || "").trim());
      const idx = {
        chalk: this.findHeader(headers, /(chalk|unit)/i),
        slot:  this.findHeader(headers, /(slot|index|position|#)/i, true),
        role:  this.findHeader(headers, /(role)/i),
        cert:  this.findHeader(headers, /(cert)/i, true),
        disp:  this.findHeader(headers, /(disp(osable)?|launcher)/i, true),
      };
      if (idx.chalk < 0 || idx.role < 0) throw new Error("Missing required columns (Chalk/Unit and Role).");
      const out = {};
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r]; if (!row || !row.length) continue;
        const chalkName = String(row[idx.chalk] || "").trim(); if (!chalkName) continue;
        const role = String(row[idx.role] || "").trim();
        const slotNumRaw = idx.slot >= 0 ? String(row[idx.slot] || "").trim() : "";
        const cert = idx.cert >= 0 ? String(row[idx.cert] || "").trim() : "";
        const dispRaw = idx.disp >= 0 ? String(row[idx.disp] || "").trim().toUpperCase() : "";
        const disposable = ["Y","YES","TRUE","1"].includes(dispRaw);
        const key = chalkName.toLowerCase();
        if (!out[key]) out[key] = [];
        out[key].push({ idx: Number(slotNumRaw) || out[key].length + 1, role, cert, disposable: !!disposable });
      }
      Object.keys(out).forEach(k => out[k].sort((a,b)=> (a.idx||9999) - (b.idx||9999)));
      return out;
    },

    applyCsvDefaults(defaultsByChalk) {
      let touched = 0;
      const nextUnits = this.plan.units.map(u => {
        const key = String(u.title || "").trim().toLowerCase();
        const rows = defaultsByChalk[key];
        if (!rows) return u;
        const slots = rows.map(row => ({
          id: null, name: null, role: this.titleCase(row.role || ""), origStatus: "VACANT",
          cert: row.cert || "", disposable: !!row.disposable,
        }));
        const padded = this.isChalk(u.title) ? this.padSlots(slots, this.MIN_CHALK_SLOTS) : slots;
        touched++;
        return { ...u, slots: this.sortSlotsByRole(padded) };
      });
      if (touched > 0) {
        this.plan.units = nextUnits;
        if (!this.plan.units.find(x => x.key === this.detailKey) && this.plan.units.length) {
          this.detailKey = this.plan.units[0].key;
        }
        return true;
      }
      return false;
    },

    csvToRows(text) {
      const rows = []; let i = 0, field = "", row = [], inQuotes = false;
      const pushField = () => { row.push(field); field = ""; };
      const pushRow = () => { rows.push(row); row = []; };
      while (i < text.length) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"') { if (text[i+1] === '"') { field += '"'; i += 2; continue; } inQuotes = false; i++; continue; }
          field += ch; i++; continue;
        } else {
          if (ch === '"') { inQuotes = true; i++; continue; }
          if (ch === ',') { pushField(); i++; continue; }
          if (ch === '\n') { pushField(); pushRow(); i++; continue; }
          if (ch === '\r') { i++; continue; }
          field += ch; i++; continue;
        }
      }
      (field !== "" || row.length) && (pushField(), pushRow());
      return rows.filter(r => r.some(c => String(c).trim() !== ""));
    },

    findHeader(headers, regex, optional = false) {
      const idx = headers.findIndex(h => regex.test(String(h || "")));
      if (idx === -1 && !optional) return -1;
      return idx;
    },

    ensureUnitsBuilt(orbat) {
      const built = this.buildUnitsFromOrbat(orbat).filter(u => this.isPointsUnit(u.title));
      if (built.length === 0) {
        this.plan.units = this.makeDefaultChalks(4, this.MIN_CHALK_SLOTS);
        this.detailKey = this.plan.units[0].key;
        this.debugInfo = "Fallback to default Chalk 1–4 (no/invalid ORBAT).";
        return;
      }
      built.forEach(u => u.slots.forEach(s => { if (typeof s.disposable === "undefined") s.disposable = false; }));
      this.plan.units = built;
      if (!this.detailKey && this.plan.units.length) this.detailKey = this.plan.units[0].key;
      this.debugInfo = `Loaded ${this.plan.units.length} chalk(s) from ORBAT.`;
    },

    makeDefaultChalks(count, size) {
      const arr = [];
      for (let i = 1; i <= count; i++) {
        const title = `Chalk ${i}`;
        const key = this.keyFromName(title);
        const slots = this.padSlots([], size);
        arr.push({ key, title, slots });
      }
      return arr;
    },

    ensureDeviceId() {
      try {
        const key = "orbatDeviceId";
        const existing = localStorage.getItem(key);
        if (existing && /^[a-zA-Z0-9_.-]{8,}$/.test(existing)) { this.deviceId = existing; return; }
        const id = this.makeDeviceId();
        localStorage.setItem(key, id);
        this.deviceId = id;
      } catch { this.deviceId = this.makeDeviceId(); }
    },

    makeDeviceId() {
      const r = (crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(12)) : Array.from({length:12},()=>Math.floor(Math.random()*256));
      return Array.from(r).map(b => b.toString(16).padStart(2,'0')).join('');
    },

    async apiPost(action, body, raw = false) {
      if (!this.apiBase) throw new Error("execUrl missing");
      if (action === "config:save" && !this.authToken) throw new Error("AUTH_REQUIRED: Login required to save.");
      const payload = {
        secret: this.secret || "PLEX",
        action,
        ...(this.authToken ? { token: this.authToken } : { deviceId: this.deviceId }),
        ...body,
      };
      const res = await fetch(this.apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      return raw ? res : res.json();
    },

    unitPayload(unit) {
      return { title: unit.title, slots: unit.slots.map(s => ({ id: s.id, name: s.name, role: s.role, cert: s.cert, disposable: !!s.disposable })) };
    },

    async loadRemote(unitKey) {
      if (!unitKey) return;
      this.apiError = ""; this.busy = true;
      try {
        const { ok, data, error } = await this.apiPost("config:get", { unitId: unitKey });
        if (!ok) throw new Error(error || "Load failed");
        if (!data) { this.apiError = "No remote config yet for this Chalk."; return; }
        const parsed = JSON.parse(data.configJSON || "{}");
        const idx = this.plan.units.findIndex(u => u.key === unitKey);
        if (idx === -1) return;
        const curr = this.plan.units[idx];
        const nextSlots = (parsed.slots || []).map(s => ({
          id: s.id ?? null, name: s.name ?? null, role: s.role || "", origStatus: "FILLED", cert: s.cert || "", disposable: !!s.disposable,
        }));
        const padded = this.isChalk(curr.title) ? this.padSlots(nextSlots, this.MIN_CHALK_SLOTS) : nextSlots;
        const nextUnit = { ...curr, slots: this.sortSlotsByRole(padded) };
        this.plan.units = this.plan.units.map((u, i) => (i === idx ? nextUnit : u));
        this.versions = { ...this.versions, [unitKey]: Number(data.version || 0) };
        this.triggerFlicker(0);
      } catch (e) {
        this.apiError = String(e.message || e);
      } finally { this.busy = false; }
    },

    async saveRemote(unitKey) {
      if (!unitKey) return;
      const unit = this.plan.units.find(u => u.key === unitKey);
      if (!unit) return;
      this.apiError = ""; this.busy = true;
      try {
        const expectedVersion = this.versions[unitKey];
        const payload = this.unitPayload(unit);
        const res = await this.apiPost("config:save", { unitId: unitKey, config: payload, expectedVersion });
        if (res.conflict && res.current) {
          this.apiError = `Remote conflict (v${res.current.version}). Press Save again to overwrite.`;
          this.versions = { ...this.versions, [unitKey]: Number(res.current.version || 0) };
          return;
        }
        if (!res.ok) throw new Error(res.error || "Save failed");
        this.versions = { ...this.versions, [unitKey]: Number(res.data?.version || 0) };
      } catch (e) {
        this.apiError = String(e.message || e);
      } finally { this.busy = false; }
    },

    async exportRemote(format = "json") {
      this.apiError = ""; this.busy = true;
      try {
        const res = await this.apiPost("config:export", { format }, true);
        if (format === "csv") {
          const text = await res.text();
          this.downloadBlob(new Blob([text], { type: "text/csv" }), `chalk-configs-${Date.now()}.csv`);
        } else {
          const j = await res.json();
          this.downloadBlob(new Blob([JSON.stringify(j.data ?? [], null, 2)], { type: "application/json" }), `chalk-configs-${Date.now()}.json`);
        }
      } catch (e) {
        this.apiError = String(e.message || e);
      } finally { this.busy = false; }
    },

    isPointsUnit(title) { const t = String(title || "").toLowerCase(); return /\bchalk\s*[1-4]\b/.test(t); },
    triggerFlicker(delayMs = 0) { this.animateView = false; this.animationDelay = `${delayMs}ms`; this.$nextTick(() => requestAnimationFrame(() => (this.animateView = true))); },
    switchUnit(key) { if (!key || key === this.detailKey) return; this.detailKey = key; this.detailError = ""; this.triggerFlicker(0); },
    persistPlan() { try { sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.plan)); } catch {} },
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
    rolePriority(role) { const key = this.normalizeRole(role); const idx = this.ROLE_ORDER.indexOf(key); return idx === -1 ? 10000 : idx; },
    sortSlotsByRole(slots) { return slots.map((s,i)=>({s,i,p:this.rolePriority(s.role)})).sort((a,b)=>a.p-b.p||a.i-b.i).map(x=>x.s); },
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
      if (Array.isArray(raw)) { return [...new Set(raw.map(this.bestCertLabelMatch).filter(Boolean))]; }
      return [];
    },
    bestCertLabelMatch(name) {
      const n = String(name || "").trim().toLowerCase();
      const map = {
        rifleman:"Rifleman", mg:"Machine Gunner", machinegunner:"Machine Gunner","machine gunner":"Machine Gunner",
        "anti tank":"Anti Tank", at:"Anti Tank", corpsman:"Corpsmen", medic:"Corpsmen","combat engineer":"Combat Engineer",
        engineer:"Combat Engineer", marksman:"Marksman", breacher:"Breacher", grenadier:"Grenadier", pilot:"Pilot",
        rto:"RTO", pj:"PJ", nco:"NCO", officer:"Officer",
      };
      if (map[n]) return map[n];
      for (const label of this.certLabels) if (n.includes(label.toLowerCase())) return label;
      return "";
    },
    getCertsForPersonId(personId) { const p = this.personnel.find(pp => String(pp.id) === String(personId)); return p?.certs || []; },
    certPointSuffix(label) { const pts = this.CERT_POINTS[label] ?? 0; return pts ? ` (+${pts})` : ""; },
    ensureSlotCert(slot, fallbackRole = "") {
      if (slot.cert) return slot.cert;
      const certs = this.getCertsForPersonId(slot.id) || [];
      return certs[0] || this.titleCase(String(fallbackRole || slot.role || ""));
    },
    titleCase(s) { const t = String(s || "").replace(/[_-]+/g, " ").trim(); if (!t) return ""; return t.replace(/\s+/g," ").toLowerCase().replace(/\b\w/g,m=>m.toUpperCase()); },
    buildPersonnelPool(orbat) {
      const pool = [];
      (orbat || []).forEach(sq => {
        (sq.fireteams || []).forEach(ft => {
          (ft.slots || []).forEach((s, idx) => {
            if (s?.member) {
              const id = String(s.member.id ?? `${sq.squad}-${ft.name}-${idx}`);
              const certs = this.extractCertsFromMember(s.member);
              pool.push({ id, name: String(s.member.name || "Unknown"), callsign: String(s.member.callsign || ""), role: String(s.role || s.member.slot || ""), certs });
            }
          });
        });
      });
      const seen = new Set(); const out = [];
      for (const p of pool) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
      return out;
    },
    isChalk(title) { return /\bchalk\s*\d+\b/i.test(String(title || "")); },
    padSlots(arr, min) { const out = arr.slice(); while (out.length < min) out.push({ id:null, name:null, role:"", origStatus:"VACANT", cert:"", disposable:false }); return out; },
    keyFromName(name) { return String(name || "").trim().toLowerCase().replace(/\s+/g, "-"); },
    filledCount(g) { if(!g) return 0; return g.slots.reduce((n, s) => n + (s.id ? 1 : 0), 0); },
    displayName(slot) { return slot.name || (slot.origStatus === "VACANT" ? "— Vacant —" : "— Empty —"); },

    buildUnitsFromOrbat(orbat) {
      const units = [];
      (orbat || []).forEach(sq => {
        const key = this.keyFromName(sq.squad);
        const slots = [];
        (sq.fireteams || []).forEach(ft => {
          (ft.slots || []).forEach(s => {
            const status = String(s?.status || (s?.member ? "FILLED" : "VACANT")).toUpperCase();
            const origStatus = ["VACANT", "CLOSED"].includes(status) ? status : "FILLED";
            const member = s?.member || null;
            const slot = { id: member?.id ? String(member.id) : null, name: member?.name || null, role: s?.role || member?.slot || "", origStatus, cert: "", disposable: false };
            if (slot.id) slot.cert = this.ensureSlotCert(slot, slot.role);
            slots.push(slot);
          });
        });
        let finalSlots = this.sortSlotsByRole(slots);
        if (this.isChalk(sq.squad)) finalSlots = this.padSlots(finalSlots, this.MIN_CHALK_SLOTS);
        if (this.isPointsUnit(sq.squad)) units.push({ key, title: sq.squad, slots: finalSlots });
      });
      return units;
    },

    buildUnitFromOrbatByKey(orbat, unitKey) {
      const unit = (orbat || []).find(sq => this.keyFromName(sq.squad) === unitKey);
      if (!unit) return null;
      const slots = [];
      (unit.fireteams || []).forEach(ft => {
        (ft.slots || []).forEach(s => {
          const status = String(s?.status || (s?.member ? "FILLED" : "VACANT")).toUpperCase();
          const origStatus = ["VACANT", "CLOSED"].includes(status) ? status : "FILLED";
          const member = s?.member || null;
          const slot = { id: member?.id ? String(member.id) : null, name: member?.name || null, role: s?.role || member?.slot || "", origStatus, cert: "", disposable: false };
          if (slot.id) slot.cert = this.ensureSlotCert(slot, slot.role);
          slots.push(slot);
        });
      });
      let finalSlots = this.sortSlotsByRole(slots);
      if (this.isChalk(unit.squad)) finalSlots = this.padSlots(finalSlots, this.MIN_CHALK_SLOTS);
      return { key: unitKey, title: unit.squad, slots: finalSlots };
    },

    calcUnitPoints(unit) {
      if (!unit || !unit.slots) return 0;
      return unit.slots.reduce((sum, s) => {
        if (!s.id) return sum;
        const certPts = this.CERT_POINTS[s.cert] ?? 0;
        const dispPts = s.disposable ? this.DISPOSABLE_COST : 0;
        return sum + certPts + dispPts;
      }, 0);
    },

    wouldExceedCap(unitKey, delta) {
      const unit = this.plan.units.find(u => u.key === unitKey);
      if (!unit) return false;
      return this.calcUnitPoints(unit) + delta > this.SQUAD_POINT_CAP;
    },

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

      const available = this.getCertsForPersonId(p.id);
      const chosenCertDefault = available.includes(target.cert) ? target.cert : (available[0] || target.role || p.role || "");

      const prevPts = (this.CERT_POINTS[target.cert] ?? 0) + (target.disposable ? this.DISPOSABLE_COST : 0);
      const nextPts = (this.CERT_POINTS[chosenCertDefault] ?? 0);
      const delta = nextPts - prevPts;
      if (this.wouldExceedCap(g.key, Math.max(0, delta))) { this.detailError = `Point cap ( ${this.SQUAD_POINT_CAP} ) would be exceeded.`; return; }
      this.detailError = "";

      if (from && target?.id && !(from.unitKey === g.key && from.slotIdx === this.picker.slotIdx)) {
        const srcIdx = this.plan.units.findIndex(u => u.key === from.unitKey);
        const srcGroup = this.plan.units[srcIdx];
        const tmp = { ...target };
        const newTarget = { ...target, id: p.id, name: p.name, role: target.role || p.role || "", cert: chosenCertDefault, disposable: false };

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

    onChangeCert(unitKey, slotIdx, nextCert) {
      const uIdx = this.plan.units.findIndex(u => u.key === unitKey);
      if (uIdx < 0) return;
      const unit = this.plan.units[uIdx];
      const slot = unit.slots[slotIdx];
      const prevPts = (this.CERT_POINTS[slot.cert] ?? 0) + (slot.disposable ? this.DISPOSABLE_COST : 0);
      const nextPts = (this.CERT_POINTS[nextCert] ?? 0) + (slot.disposable ? this.DISPOSABLE_COST : 0);
      const delta = nextPts - prevPts;
      if (this.wouldExceedCap(unitKey, Math.max(0, delta))) { this.detailError = `Point cap ( ${this.SQUAD_POINT_CAP} ) would be exceeded.`; return; }
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
      const add = checked ? this.DISPOSABLE_COST : 0;
      const remove = !checked ? this.DISPOSABLE_COST : 0;
      const delta = add - remove;
      if (this.wouldExceedCap(unitKey, Math.max(0, delta))) { this.detailError = `Point cap ( ${this.SQUAD_POINT_CAP} ) would be exceeded.`; return; }
      this.detailError = "";
      const newSlots = unit.slots.slice();
      newSlots[slotIdx] = { ...slot, disposable: checked === true };
      const newU = { ...unit, slots: newSlots };
      this.plan.units = this.plan.units.map((u, i) => (i === uIdx ? newU : u));
      this.persistPlan();
    },

    fillFromRoster(unitKey) {
      const rebuilt = this.buildUnitFromOrbatByKey(this.orbat, unitKey);
      if (!rebuilt) { this.detailError = "No matching unit in ORBAT."; return; }
      const idx = this.plan.units.findIndex(u => u.key === unitKey);
      if (idx < 0) return;
      const keepLen = Math.max(this.plan.units[idx].slots.length, rebuilt.slots.length);
      while (rebuilt.slots.length < keepLen) rebuilt.slots.push({ id: null, name: null, role: "", origStatus: "VACANT", cert: "", disposable: false });
      this.plan.units = this.plan.units.map((u, i) => (i === idx ? rebuilt : u));
      this.persistPlan();
      this.detailError = "";
      this.triggerFlicker(0);
    },

    exportJson() {
      const blob = new Blob([JSON.stringify(this.plan, null, 2)], { type: "application/json" });
      this.downloadBlob(blob, "deployment-plan.json");
    },

    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    },
  },
  watch: {
    orbat: { deep: true, handler(newV) {
      this.personnel = this.buildPersonnelPool(newV || []);
      const oldKey = this.detailKey;
      this.ensureUnitsBuilt(newV || []);
      if (!this.plan.units.find(u => u.key === oldKey) && this.plan.units.length) {
        this.detailKey = this.plan.units[0].key;
      }
    }},
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
.detail-toolbar{display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem;justify-content:space-between}
.toolbar-left{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}
.toolbar-right{display:flex;gap:.6rem;align-items:center}
.chalk-picker{min-width:160px}
.divider{width:1px;height:18px;background:rgba(158,197,230,0.35);display:inline-block}

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
.check{display:inline-flex;align-items:center;gap:.5rem}
.check .check-label{color:#eaf4ff}
.check input[type="checkbox"]{
  appearance:none;width:16px;height:16px;border:1px solid rgba(120,255,190,.55);border-radius:4px;background:rgba(0,20,14,.5);box-shadow:inset 0 0 0 1px rgba(90,220,160,.15);position:relative;transition:border-color 120ms ease, background 120ms ease, box-shadow 120ms ease,opacity 120ms ease}
.check input[type="checkbox"]:hover{border-color:rgba(120,255,190,.85)}
.check input[type="checkbox"]:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(120,255,190,.35)}
.check input[type="checkbox"]:checked{
  background:linear-gradient(180deg,rgba(10,50,28,.95),rgba(6,32,20,.9));
  border-color:rgba(120,255,190,.85)}
.check input[type="checkbox"]:checked::after{
  content:"";position:absolute;left:3px;top:1px;right:0;bottom:0;width:8px;height:12px;border-right:2px solid #caffe9;border-bottom:2px solid #caffe9;transform:rotate(45deg)}

.actions-row{display:flex;gap:.6rem;flex-wrap:wrap;padding-top:.4rem;align-items:center}
.btn{appearance:none;border:1px solid rgba(30,144,255,0.35);background:linear-gradient(180deg,rgba(6,18,30,.75),rgba(2,10,20,.6));color:#dbeeff;padding:.42rem .7rem;border-radius:.5rem;font-size:.92rem;letter-spacing:.02em;cursor:pointer;transition:transform 80ms ease,background 120ms ease,border-color 120ms ease,box-shadow 120ms ease,opacity 120ms ease;box-shadow:inset 0 0 0 1px rgba(120,200,255,0.08)}
.btn:hover{background:linear-gradient(180deg,rgba(10,28,44,.85),rgba(2,12,20,.7));border-color:rgba(120,200,255,0.5)}
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

.picker-veil{position:fixed;inset:0;background:rgba(0, 0, 0, 0.55);display:grid;place-items:center;z-index:1000}
.picker{width:min(900px,92vw);max-height:80vh;overflow:hidden;border-radius:.8rem;border:1px solid rgba(30,144,255,0.45);background:rgba(0,10,30,0.98);display:grid;grid-template-rows:auto auto 1fr auto}
.picker-head{display:flex;align-items:center;justify-content:space-between;padding:.8rem .9rem;border-bottom:1px solid rgba(30,144,255,0.25)}
.picker-controls{display:flex;gap:.8rem;align-items:center;padding:.6rem .9rem;border-bottom:1px solid rgba(30,144,255,0.18)}
.picker-list{overflow:auto;padding:.6rem .4rem;display:grid;gap:.4rem}
.pick-row{display:grid;grid-template-columns:1fr auto auto;gap:.6rem;align-items:center;border:1px solid rgba(30,144,255,0.25);background:rgba(0,10,30,0.2);border-radius:.5rem;padding:.5rem .6rem}
.pick-row.assigned{background:rgba(30,144,255,0.08)}
.p-name{color:#e6f3ff;font-weight:600}
.p-meta .subtle{color:#9ec5e6;font-size:.86rem}
.badge{color:#79ffba;border:1px solid rgba(120,255,170,0.55);border-radius:999px;padding:.1rem .5rem;font-size:.78rem}

.section-content-container.animate{animation:contentEntry 260ms ease-out both}
@keyframes contentEntry{
  0%{opacity:0;filter:brightness(1.1) saturate(1.03) blur(1px)}
  60%{opacity:1;filter:brightness(1.0) saturate(1.0) blur(0)}
  80%{opacity:.98;filter:brightness(1.03)}
  100%{opacity:1;filter:none}
}
</style>
