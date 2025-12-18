<!-- src/views/admin/AdminHome.vue -->
<template>
  <div class="windows-grid">
    <!-- LEFT WINDOW: Admin nav -->
    <section class="section-container left-window">
      <div class="section-header clipped-medium-backward-pilot">
        <img src="/icons/protocol.svg" alt="" />
        <h1>Admin</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <div class="section-content-container">
        <!-- Tiles only (no password box). Route guard ensures auth. -->
        <div v-if="isAuthed" class="rail">
          <button
            v-for="s in sections"
            :key="s.key"
            class="rail-card"
            :class="{ active: activeKey === s.key }"
            @click="activeKey = s.key"
          >
            <div class="rail-card-head">
              <img :src="s.icon" class="rail-icon" alt="" />
              <div class="rail-title">{{ s.title }}</div>
            </div>
            <div v-if="s.preview && s.preview.length" class="rail-card-body">
              <div v-for="line in s.preview" :key="line.label" class="rail-line">
                <span class="label">{{ line.label }}</span>
                <span class="pill" :class="line.kind">{{ line.value }}</span>
              </div>
              <div class="rail-foot">Click to open</div>
            </div>
          </button>
        </div>
        <div v-else class="muted">Staff only.</div>
      </div>
    </section>

    <!-- RIGHT WINDOW -->
    <section class="section-container right-window">
      <div class="section-header clipped-medium-backward-pilot right-header">
        <img src="/icons/protocol.svg" alt="" />
        <h1>{{ windowTitle }}</h1>
        <div class="right-actions"></div>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <div class="section-content-container right-content">
        <div v-if="!isAuthed" class="muted">Staff only.</div>

        <!-- Promotions -->
        <div v-else-if="activeKey === 'promotions'" class="promotions-panel">
          <div class="filters">
            <div class="row">
              <label class="control">
                <span>Search</span>
                <input type="text" v-model="search" placeholder="Name, rank, squad" />
              </label>
              <label class="control">
                <span>Squad</span>
                <select v-model="selectedSquad">
                  <option value="__ALL__">All squads</option>
                  <option v-for="s in squads" :key="s" :value="s">{{ s }}</option>
                </select>
              </label>
              <label class="control">
                <span>Sort by</span>
                <select v-model="sortKey">
                  <option value="rank">Rank</option>
                  <option value="name">Name</option>
                  <option value="squad">Squad</option>
                  <option value="ops">Ops</option>
                </select>
              </label>
              <label class="control" style="align-self:end">
                <span>&nbsp;</span>
                <label class="checkbox">
                  <input type="checkbox" v-model="onlyPromotable" />
                  <span>Promotable only</span>
                </label>
              </label>
            </div>
          </div>

          <!-- Table: fixed header, scroll body -->
          <div class="table-scroll">
            <div class="table-shell">
              <div class="tr head grid6">
                <span class="th name">Name</span>
                <span class="th rank">Rank</span>
                <span class="th squad">Squad</span>
                <span class="th ops">Ops</span>
                <span class="th next">Next Rank</span>
                <span class="th prog">Progress</span>
              </div>
              <div class="rows-scroll">
                <div v-for="row in promotionsTable" :key="row.id || row.name" class="tr grid6">
                  <span class="td name">{{ row.name }}</span>
                  <span class="td rank">{{ row.rank }}</span>
                  <span class="td squad">{{ row.squad || '—' }}</span>
                  <span class="td ops">
                    <span v-if="isFiniteNum(row.ops)">{{ row.ops }}</span>
                    <span v-else class="muted">N/A</span>
                  </span>
                  <span class="td next">
                    <span v-if="row.nextRank">
                      {{ row.nextRank }} <small v-if="row.nextAt">({{ row.nextAt }})</small>
                    </span>
                    <span v-else class="muted">—</span>
                  </span>
                  <span class="td prog">
                    <div class="bar" :class="{ done: row.opsToNext === 0 && row.nextRank }">
                      <div class="fill" :style="{ width: (row.progress ?? 0) + '%' }"></div>
                    </div>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Discipline (notes + warnings) -->
        <div v-else-if="activeKey === 'discipline'" class="promotions-panel">
          <div class="filters">
            <div class="row">
              <label class="control">
                <span>Search</span>
                <input type="text" v-model="discSearch" placeholder="Name, squad, note" />
              </label>
              <div class="control" style="align-self:end">
                <span>&nbsp;</span>
                <button class="btn-sm" @click="refreshDiscipline" :disabled="discLoading">
                  {{ discLoading ? 'Refreshing…' : 'Refresh' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Editor -->
          <div class="flag-form">
            <div class="row">
              <label class="control">
                <span>Member</span>
                <select v-model="edit.memberId" @change="populateEditFromMember">
                  <option :value="null">Select member…</option>
                  <option
                    v-for="m in membersSortedNonDischarged"
                    :key="m.id || m.name"
                    :value="m.id || null"
                  >
                    {{ m.name }} <span v-if="m.squad">— {{ m.squad }}</span>
                  </option>
                </select>
              </label>

              <label class="control">
                <span>Warnings (3 slots)</span>
                <div class="warn-toggle">
                  <button type="button" class="warn-pill lvl1" :class="{ on: edit.warn[0] }" @click="toggleWarn(0)">1</button>
                  <button type="button" class="warn-pill lvl2" :class="{ on: edit.warn[1] }" @click="toggleWarn(1)">2</button>
                  <button type="button" class="warn-pill lvl3" :class="{ on: edit.warn[2] }" @click="toggleWarn(2)">3</button>
                </div>
              </label>
            </div>

            <label class="control">
              <span>Disciplinary Notes</span>
              <textarea v-model="edit.notes" rows="3" placeholder="Notes visible to staff"></textarea>
            </label>

            <div class="row end">
              <button class="btn-sm" @click="saveDiscipline" :disabled="discSaving || !edit.memberId">
                {{ discSaving ? 'Saving…' : 'Save' }}
              </button>
              <p v-if="discError" class="login-error" style="margin:0">{{ discError }}</p>
              <p v-if="discOK" class="ok-text" style="margin:0">Saved.</p>
            </div>
          </div>

          <!-- List -->
          <div class="table-scroll">
            <div class="table-shell">
              <div class="tr head gridFlags">
                <span class="th">Member</span>
                <span class="th">Squad</span>
                <span class="th">Status</span>
                <span class="th">Warnings</span>
                <span class="th">Notes</span>
              </div>
              <div class="rows-scroll">
                <div
                  v-for="r in discFiltered"
                  :key="r.nameKey"
                  class="tr gridFlags"
                  :class="['warn-row', 'warn-'+r.warnCount]"
                  @click="focusMemberByNameKey(r.nameKey)"
                  style="cursor:pointer"
                  :title="'Click to edit '+r.name"
                >
                  <span class="td">{{ r.name }}</span>
                  <span class="td">{{ r.squad || '—' }}</span>
                  <span class="td">
                    <span class="status-pill" :class="'st-' + statusClass(r.status)">{{ r.status || 'Unknown' }}</span>
                  </span>
                  <span class="td warncells">
                    <div class="warn-badges" :class="'w'+r.warnCount" aria-label="Warnings">
                      <span class="dot" :class="{ on: r.warnBits[0] }"></span>
                      <span class="dot" :class="{ on: r.warnBits[1] }"></span>
                      <span class="dot" :class="{ on: r.warnBits[2] }"></span>
                    </div>
                  </span>
                  <span class="td">{{ r.notes || '—' }}</span>
                </div>
                <div v-if="!discFiltered.length && !discLoading" class="empty">No entries.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Future pages -->
        <div v-else-if="activeKey === 'audits'">
          <div class="empty">Coming soon. This is a stub to demonstrate future admin pages.</div>
        </div>

        <div v-else class="muted">Select a tool from the left.</div>
      </div>
    </section>
  </div>
</template>

<script>
import { isAdmin, adminEndpoint, adminSecret } from "@/utils/adminAuth";

export default {
  name: "AdminHome",
  props: {
    members: { type: Array, default: () => [] },
    orbat: { type: Array, default: () => [] },
    attendance: { type: Array, default: () => [] },
  },
  data() {
    return {
      activeKey: "promotions",

      // Promotions
      search: "",
      selectedSquad: "__ALL__",
      sortKey: "rank",
      onlyPromotable: false,

      // Discipline API (Netlify proxy)
      discEndpoint: adminEndpoint(),
      discSecret: adminSecret(),
      discLoading: false,
      discSaving: false,
      discError: "",
      discOK: false,
      disciplineRows: [],

      // RefData CSV (STRICT headers)
      troopStatusCsvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=107253735&single=true&output=csv",
      csvStatusIndex: Object.create(null),
      csvTroopIndex: Object.create(null),

      // Discipline filters + editor
      discSearch: "",
      edit: { memberId: null, notes: "", warn: [false, false, false] },
    };
  },
  created() {
    if (this.isAuthed) {
      this.loadDiscipline();
      this.fetchTroopStatusCsv();
    }
  },
  computed: {
    isAuthed() { return isAdmin(); },
    windowTitle() {
      if (this.activeKey === "promotions") return "Promotions";
      if (this.activeKey === "discipline") return "Discipline";
      if (this.activeKey === "audits") return "Audits";
      return "Admin";
    },
    squads() {
      const s = new Set();
      (this.members || []).forEach((m) => { if (m.squad) s.add(m.squad); });
      return Array.from(s).sort();
    },
    promotionsTable() {
      const rows = (this.members || []).map((m) => {
        const ops = this.formatOps(m.opsAttended);
        const ladder = this.promotionLadderFor(m.rank);
        const nextRank = ladder?.nextRank || null;
        const opsToNext = this.opsToNextPromotion(m);
        const progress = nextRank && Number.isFinite(opsToNext)
          ? Math.min(100, Math.round((Number(m.opsAttended || 0) / ladder.nextAt) * 100))
          : 0;
        return {
          id: m.id, name: m.name, rank: m.rank, squad: m.squad || "",
          ops, nextRank, nextAt: ladder?.nextAt || null, opsToNext, progress,
        };
      });

      let filtered = rows;
      if (this.search.trim()) {
        const q = this.search.trim().toLowerCase();
        filtered = filtered.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.rank.toLowerCase().includes(q) ||
          r.squad.toLowerCase().includes(q)
        );
      }
      if (this.selectedSquad !== "__ALL__") {
        filtered = filtered.filter(r => r.squad === this.selectedSquad);
      }
      if (this.onlyPromotable) {
        filtered = filtered.filter(r => r.nextRank && r.opsToNext === 0);
      }

      if (this.sortKey === "name") filtered.sort((a,b)=>a.name.localeCompare(b.name));
      else if (this.sortKey === "squad") filtered.sort((a,b)=>a.squad.localeCompare(b.squad));
      else if (this.sortKey === "ops") filtered.sort((a,b)=>(Number(b.ops||0)-Number(a.ops||0)));
      else filtered.sort((a,b)=>a.rank.localeCompare(b.rank)); // default rank
      return filtered;
    },
  },
  methods: {
    isFiniteNum(v) { return Number.isFinite(Number(v)); },
    refreshDiscipline() { this.loadDiscipline(); },
    statusClass(st) {
      const s = String(st || "").toLowerCase();
      if (s.includes("active")) return "ok";
      if (s.includes("reserve")) return "warn";
      if (s.includes("discharg")) return "bad";
      return "na";
    },
    normalizeStatus(s) {
      const n = String(s || "").toLowerCase();
      if (n.includes("active")) return "Active Duty";
      if (n.includes("reserve")) return "Reserve";
      if (n.includes("discharg")) return "Discharged";
      return s || "Unknown";
    },

    async fetchTroopStatusCsv() {
      try {
        const res = await fetch(this.troopStatusCsvUrl, { method: 'GET' });
        const csvText = await res.text();
        const rows = this.parseCsv(csvText);
        if (!rows.length) return;

        const header = rows[0].map(h => String(h || '').trim());
        const hdrLower = header.map(h => h.toLowerCase().replace(/\s+/g,' ').trim());
        const nameIdx = hdrLower.findIndex(h => h === 'troop list');
        const statusIdx = hdrLower.findIndex(h => h === 'troop status');
        if (nameIdx === -1 || statusIdx === -1) return;

        const statusMap = Object.create(null);
        const troopMap = Object.create(null);
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const rawName = String(r[nameIdx] || '').trim();
          if (!rawName) continue;
          const nk = this.nameKey(this.cleanMemberName(rawName));
          troopMap[nk] = true;
          statusMap[nk] = this.normalizeStatus(String(r[statusIdx] || '').trim());
        }
        this.csvStatusIndex = statusMap;
        this.csvTroopIndex = troopMap;
      } catch {}
    },
    parseCsv(text) {
      const rows = [];
      let cur = [];
      let val = '';
      let inQ = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
          if (ch === '"') {
            if (text[i + 1] === '"') { val += '"'; i++; } else { inQ = false; }
          } else { val += ch; }
        } else {
          if (ch === '"') inQ = true;
          else if (ch === ',') { cur.push(val); val = ''; }
          else if (ch === '\n') { cur.push(val); rows.push(cur); cur = []; val = ''; }
          else if (ch === '\r') { /* ignore */ }
          else { val += ch; }
        }
      }
      cur.push(val); rows.push(cur);
      if (rows.length && rows[rows.length - 1].every(x => String(x).length === 0)) rows.pop();
      return rows;
    },

    async loadDiscipline() {
      if (!this.discEndpoint || !this.discSecret) return;
      this.discLoading = true; this.discError = ""; this.discOK = false;
      try {
        const url = `${this.discEndpoint}?secret=${encodeURIComponent(this.discSecret)}&t=${Date.now()}`;
        const res = await fetch(url, { method: 'GET' });
        const data = await res.json();
        const arr = Array.isArray(data)
          ? data
          : (Array.isArray(data?.data) ? data.data : []);
        this.disciplineRows = arr.map((r) => {
          return {
            name: r?.name || "",
            nameKey: this.nameKey(this.cleanMemberName(r?.name || "")),
            squad: r?.squad || "",
            status: r?.status || "",
            warnBits: [
              !!(r?.warn1 === true || r?.warn1 === "Y" || r?.warn1 === 1),
              !!(r?.warn2 === true || r?.warn2 === "Y" || r?.warn2 === 1),
              !!(r?.warn3 === true || r?.warn3 === "Y" || r?.warn3 === 1),
            ],
            warnCount: [r?.warn1, r?.warn2, r?.warn3].filter(w => w === true || w === "Y" || w === 1).length,
            notes: r?.notes || "",
          };
        });
        this.discOK = true;
      } catch (e) {
        this.discError = String(e?.message || e || "Failed");
      } finally {
        this.discLoading = false;
      }
    },

    saveDiscipline: async function () {
      if (!this.discEndpoint || !this.discSecret) return;
      this.discSaving = true; this.discError = ""; this.discOK = false;
      try {
        const payload = {
          secret: this.discSecret,
          action: "admin.discipline:save",
          memberId: this.edit.memberId,
          notes: this.edit.notes,
          warn1: !!this.edit.warn[0],
          warn2: !!this.edit.warn[1],
          warn3: !!this.edit.warn[2],
        };
        const res = await fetch(this.discEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // why: keep it 'simple' request
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.ok !== true) throw new Error(data?.error || "Save failed");
        this.discOK = true;
      } catch (e) {
        this.discError = String(e?.message || e || "Failed");
      } finally {
        this.discSaving = false;
        setTimeout(() => { this.discOK = false; }, 1400);
      }
    },

    // helpers
    isFiniteNum(v) { return Number.isFinite(Number(v)); },
    cleanMemberName(n) { return String(n || "").replace(/^["'\s]+|["'\s]+$/g, ""); },
    nameKey(n) { return String(n || "").toLowerCase().replace(/\s+/g, " ").trim(); },

    rankKey(rank) { return String(rank || "").trim().toUpperCase().replace(/\s+/g, ""); },
    promotionLadderFor(rank) {
      const r = this.rankKey(rank);
      return ({
        PVT: { nextAt: 2, nextRank: "PFC" }, PFC: { nextAt: 10, nextRank: "SPC" },
        SPC: { nextAt: 20, nextRank: "SPC2" }, SPC2: { nextAt: 30, nextRank: "SPC3" },
        SPC3: { nextAt: 40, nextRank: "SPC4" }, SPC4: { nextAt: 50, nextRank: null },
        HA:  { nextAt: 2, nextRank: "HN" }, HN:  { nextAt: 10, nextRank: "HM3" },
        HM3: { nextAt: 20, nextRank: "HM2" }, HM2: { nextAt: 30, nextRank: null },
        CWO2:{ nextAt: 10, nextRank: "CWO3" }, CWO3:{ nextAt: 20, nextRank: "CWO4" },
        CWO4:{ nextAt: 30, nextRank: null },
      })[r] || null;
    },
    opsToNextPromotion(member) {
      const ops = Number(member?.opsAttended);
      if (!Number.isFinite(ops)) return null;
      const ladder = this.promotionLadderFor(member?.rank);
      if (!ladder || !ladder.nextAt) return null;
      return Math.max(0, ladder.nextAt - ops);
    },
    formatOps(v) {
      const n = Number(v);
      return Number.isFinite(n) ? n : "—";
    },
  },
};
</script>

<style scoped>
/* keep your existing AdminHome styles here; no visual changes needed for the header swap */
.windows-grid { display: grid; grid-template-columns: 380px 1fr; column-gap: 1.8rem; align-items: start; }
.left-window { min-height: 70vh; }
.right-window { min-height: 70vh; }

.rail { display: grid; gap: .8rem; }
.rail-card { background: rgba(0,10,30,0.8); border: 1px solid rgba(30,144,255,.35); border-radius: .5rem; padding: .6rem; text-align: left; }
.rail-card.active { border-color: rgba(30,144,255,.85); box-shadow: 0 0 0 2px rgba(30,144,255,.15) inset; }
.rail-card-head { display: grid; grid-template-columns: 28px 1fr; align-items: center; gap: .6rem; }
.rail-icon { width: 28px; height: 28px; }
.rail-title { font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #dce6f1; }
.rail-card-body { margin-top: .4rem; display: grid; gap: .25rem; }
.rail-line { display: grid; grid-template-columns: 1fr auto; gap: .6rem; }
.rail-line .label { color: #a8c0d9; }
.pill { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 24px; padding: 0 .5rem; border-radius: 999px; font-weight: 700; letter-spacing: .06em; }
.pill.ok { background: rgba(60,180,120,.15); color: #9ef3c8; border: 1px solid rgba(60,180,120,.35); }
.pill.warn { background: rgba(255,200,80,.1); color: #ffdd99; border: 1px solid rgba(255,200,80,.3); }
.pill.bad { background: rgba(255,80,80,.08); color: #ffaaaa; border: 1px solid rgba(255,80,80,.28); }

.promotions-panel { display: grid; gap: 1rem; height: 70vh; max-height: 70vh; overflow: hidden; }
.filters .row { display: grid; grid-template-columns: 1fr 220px 160px; gap: .6rem; }
.control { display: grid; gap: .25rem; }
.control > span { color: #9fb1c7; font-size: .9rem; letter-spacing: .08em; text-transform: uppercase; }
.control input, .control select, .control textarea { background: rgba(0,10,30,0.25); color: #dce6f1; border: 1px solid rgba(30,144,255,.35); border-radius: .35rem; padding: .45rem .55rem; }

.table-scroll { overflow: auto; border: 1px solid rgba(30,144,255,.35); border-radius: .5rem; background: rgba(0,10,30,.25); }
.table-shell { min-width: 780px; }
.tr.head { background: rgba(0,10,30,.45); position: sticky; top: 0; z-index: 1; }
.grid6 { display: grid; grid-template-columns: 2fr 1fr 1fr .6fr 1.2fr .8fr; gap: .6rem; align-items: center; }
.tr, .td, .th { padding: .5rem .6rem; }
.th { color: #a8c0d9; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
.bar { height: 10px; border-radius: 999px; background: rgba(90,130,170,.25); border: 1px solid rgba(90,130,170,.35); overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, rgba(30,144,255,.4), rgba(170,255,210,.6)); }
.bar.done .fill { background: linear-gradient(90deg, rgba(60,200,140,.7), rgba(170,255,210,.95)); }

.muted { color: #8aa3bd; }
.ok-text { color: #9ef3c8; }
.btn-sm { background: rgba(0,10,30,0.35); border: 1px solid rgba(30,144,255,0.35); color: #dce6f1; border-radius: .35rem; padding: .35rem .6rem; }
.status-pill { padding: .15rem .45rem; border-radius: 999px; font-weight: 700; letter-spacing: .06em; }
.st-ok { color: #9ef3c8; border: 1px solid rgba(60,180,120,.35); background: rgba(60,180,120,.12); }
.st-warn { color: #ffd38a; border: 1px solid rgba(255,200,80,.35); background: rgba(255,200,80,.12); }
.st-bad { color: #ffaaaa; border: 1px solid rgba(255,80,80,.35); background: rgba(255,80,80,.12); }
.st-na { color: #aac3de; border: 1px solid rgba(120,150,180,.35); background: rgba(120,150,180,.12); }
</style>
