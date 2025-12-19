<!-- src/views/admin/AdminHome.vue -->
<template>
  <div
    class="windows-grid content-container"
    :class="{ animate: animateView }"
    :style="{ 'animation-delay': animationDelay }"
  >
    <!-- LEFT WINDOW: Admin nav -->
    <section class="section-container left-window">
      <!-- Narrow wrapper; inner header stays full so shapes render -->
      <div class="header-shell header-admin">
        <div class="section-header clipped-medium-backward-pilot">
          <img src="/icons/protocol.svg" alt="" />
          <h1>Admin</h1>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

      <div class="section-content-container">
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
      <div class="header-shell header-right">
        <div class="section-header clipped-medium-backward-pilot right-header">
          <img src="/icons/protocol.svg" alt="" />
          <h1>{{ windowTitle }}</h1>
          <div class="right-actions"></div>
        </div>
        <div class="rhombus-back">&nbsp;</div>
      </div>

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
                  <option value="rank">Rank (high→low)</option>
                  <option value="ops">Ops attended</option>
                  <option value="progress">Progress to next rank</option>
                  <option value="name">Name (A→Z)</option>
                </select>
              </label>
              <label class="control chk">
                <input type="checkbox" v-model="onlyPromotable" />
                <span>Promotable only</span>
              </label>
            </div>
          </div>

          <div class="chips">
            <span class="chip">Total: {{ promotionsTable.length }}</span>
            <span class="chip ok">Eligible now: {{ eligibleNowCount }}</span>
            <span class="chip warn">Imminent (≤3): {{ imminentCount }}</span>
          </div>

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
                  <span class="td ops"><span v-if="isFiniteNum(row.ops)">{{ row.ops }}</span><span v-else class="muted">N/A</span></span>
                  <span class="td next">
                    <span v-if="row.nextRank">{{ row.nextRank }} <small v-if="row.nextAt">({{ row.nextAt }})</small></span>
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

        <!-- Discipline -->
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
      animateView: false,
      animationDelay: "0ms",
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

      // RefData CSV
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
  mounted() {
    this.triggerFlicker();
  },
  computed: {
    isAuthed() { return isAdmin(); },
    nameKey() {
      return (name) =>
        String(name || "")
          .replace(/["'.]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase();
    },
    cleanMemberName() { return (name) => String(name || "").replace(/\s*[\(\[].*?[\)\]]\s*$/g, "").trim(); },
    rankKey() { return (rank) => String(rank || "").trim().toUpperCase().replace(/[.\s]/g, ""); },
    normalizeStatus() {
      const pretty = { ACTIVE:"Active", RESERVE:"Reserve", ELOA:"ELOA", OTHER:"Other", INACTIVE:"Inactive", UNKNOWN:"Unknown", DISCHARGED:"Discharged" };
      return (raw) => pretty[String(raw || "").trim().toUpperCase()] || "Unknown";
    },
    statusIndexFromApi() {
      const idx = Object.create(null);
      (this.disciplineRows || []).forEach(r => {
        const nk = r.nameKey || this.nameKey(r.name || "");
        const s = this.normalizeStatus(r.status || r.troopStatus);
        if (nk) idx[nk] = s;
      });
      return idx;
    },
    statusIndex() {
      return new Proxy({}, {
        get: (_, k) => this.csvStatusIndex[k] ?? this.statusIndexFromApi[k],
        has: (_, k) => (k in this.csvStatusIndex) || (k in this.statusIndexFromApi)
      });
    },
    memberStatusOf() { return (m) => this.statusIndex[this.nameKey(this.cleanMemberName(m?.name))] || "Unknown"; },
    isDischarged() { return (status) => String(status || "").toLowerCase() === "discharged"; },
    isInTroopList() {
      return (m) => {
        const nk = this.nameKey(this.cleanMemberName(m?.name));
        const hasCsv = Object.keys(this.csvTroopIndex).length > 0;
        return hasCsv ? !!this.csvTroopIndex[nk] : true;
      };
    },
    attendanceMap() {
      const map = Object.create(null);
      (this.members || []).forEach((m) => {
        const ops = Number(m.opsAttended);
        if (Number.isFinite(ops)) {
          if (m.id != null) map[`ID:${m.id}`] = ops;
          if (m.name) map[`NM:${this.nameKey(m.name)}`] = ops;
        }
      });
      (this.attendance || []).forEach((row) => {
        const ops = Number(row?.ops ?? row?.attended ?? row?.value);
        if (!Number.isFinite(ops)) return;
        if (row?.id != null) map[`ID:${row.id}`] = ops;
        if (row?.name) map[`NM:${this.nameKey(row.name)}`] = ops;
      });
      return map;
    },
    membershipIndex() {
      const idx = Object.create(null);
      const nk = this.nameKey;
      const add = (squadName, m) => {
        if (!m) return;
        if (m.id != null) idx[`ID:${m.id}`] = squadName;
        if (m.name) idx[`NM:${nk(m.name)}`] = squadName;
      };
      (this.orbat || []).forEach((sq) => {
        const s = String(sq?.squad || "").trim();
        if (!s) return;
        (sq?.fireteams || []).forEach((ft) => (ft?.slots || []).forEach((slot) => add(s, slot?.member)));
        (sq?.members || []).forEach((m) => add(s, m));
      });
      return idx;
    },
    squads() {
      const set = new Set();
      (this.orbat || []).forEach((sq) => { const s = String(sq?.squad || "").trim(); if (s) set.add(s); });
      (this.members || []).forEach((m) => { const s = String(m?.squad || "").trim(); if (s) set.add(s); });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
    membersSorted() {
      return [...(this.members || [])]
        .filter(m => this.isInTroopList(m) && !this.isDischarged(this.memberStatusOf(m)))
        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    },
    membersSortedNonDischarged() { return this.membersSorted; },
    windowTitle() {
      if (!this.isAuthed) return "Locked";
      return { promotions: "PROMOTIONS OVERVIEW", discipline: "DISCIPLINE (NOTES & WARNINGS)", audits: "ROSTER AUDITS" }[this.activeKey] || "ADMIN TOOLS";
    },
    sections() {
      return [
        { key: "promotions", title: "Promotions Overview", icon: "/icons/protocol.svg",
          preview: [
            { label: "Eligible now", value: this.eligibleNowCount, kind: "ok" },
            { label: "Imminent (≤3)", value: this.imminentCount, kind: "warn" },
          ]},
        { key: "discipline", title: "Discipline", icon: "/icons/protocol.svg",
          preview: [
            { label: "Members w/ notes", value: this.disciplineRows.filter(r => !!r.notes).length, kind: "warn" },
            { label: "Any warnings", value: this.disciplineRows.filter(r => r.warnCount > 0).length, kind: "ok" },
          ]},
        { key: "audits", title: "Roster Audits", icon: "/icons/protocol.svg", preview: [] },
      ];
    },
    nextPromotion() {
      const alias = { PRIVATE:"PVT", PRIVATEFIRSTCLASS:"PFC", SPECIALIST:"SPC", SPECIALIST2:"SPC2", SPECIALIST3:"SPC3", SPECIALIST4:"SPC4", LANCECORPORAL:"LCPL", CORPORAL:"CPL", SERGEANT:"SGT", STAFFSERGEANT:"SSGT", GUNNYSERGEANT:"GYSGT", SECONDLIEUTENANT:"2NDLT", FIRSTLIEUTENANT:"1STLT", CAPTAIN:"CAPT", HOSPITALMANAPPRENTICE:"HA", HOSPITALMAN:"HN", HOSPITALCORPSMANTHIRDCLASS:"HM3", HOSPITALCORPSMANSECONDCLASS:"HM2", HOSPITALCORPSMANFIRSTCLASS:"HM1", CHIEFHOSPITALCORPSMAN:"HMC", WARRANTOFFICER:"WO", CHIEFWARRANTOFFICER2:"CWO2", CHIEFWARRANTOFFICER3:"CWO3", CHIEFWARRANTOFFICER4:"CWO4", CHIEFWARRANTOFFICER5:"CWO5" };
      const rules = {
        PVT:{nextRank:"PFC",nextAt:10}, PFC:{nextRank:"SPC",nextAt:20}, SPC:{nextRank:"SPC2",nextAt:30},
        SPC2:{nextRank:"SPC3",nextAt:40}, SPC3:{nextRank:"SPC4",nextAt:50}, SPC4:{nextRank:"LCpl",nextAt:null},
        LCPL:{nextRank:"Cpl",nextAt:null}, CPL:{nextRank:"Sgt",nextAt:null}, SGT:{nextRank:"SSgt",nextAt:null},
        SSGT:{nextRank:"GySgt",nextAt:null}, GYSGT:{nextRank:"2ndLt",nextAt:null}, "2NDLT":{nextRank:"1stLt",nextAt:null},
        "1STLT":{nextRank:"Capt",nextAt:null}, CAPT:{nextRank:null,nextAt:null},
        HA:{nextRank:"HN",nextAt:10}, HN:{nextRank:"HM3",nextAt:20}, HM3:{nextRank:"HM2",nextAt:30},
        HM2:{nextRank:"HM1",nextAt:null}, HM1:{nextRank:"HMC",nextAt:null}, HMC:{nextRank:null,nextAt:null},
        WO:{nextRank:"CWO2",nextAt:10}, CWO2:{nextRank:"CWO3",nextAt:20}, CWO3:{nextRank:"CWO4",nextAt:30},
        CWO4:{nextRank:"CWO5",nextAt:null}, CWO5:{nextRank:null,nextAt:null},
      };
      return (member) => {
        const rk = alias[this.rankKey(member?.rank)] || this.rankKey(member?.rank);
        return rules[rk] || { nextRank: null, nextAt: null };
      };
    },
    promotionsTable() {
      const term = (this.search || "").trim().toLowerCase();
      const squadFilter = this.selectedSquad;
      const onlyProm = !!this.onlyPromotable;
      const rows = [];
      for (const m of (this.members || [])) {
        if (!this.isInTroopList(m)) continue;
        const status = this.memberStatusOf(m);
        if (this.isDischarged(status)) continue;

        if (term) {
          const hay = [m.name, m.rank, m.squad, status].map(x => String(x || "").toLowerCase()).join(" ");
          if (!hay.includes(term)) continue;
        }
        const squad = String(
          m?.squad ||
          this.membershipIndex[`ID:${m?.id}`] ||
          this.membershipIndex[`NM:${this.nameKey(m?.name)}`] ||
          ""
        ).trim();
        if (squadFilter && squadFilter !== "__ALL__" && squad !== squadFilter) continue;

        const rule = this.nextPromotion(m);
        const ops = this.getOps(m);
        const nextRank = rule?.nextRank ?? null;
        const nextAt = rule?.nextAt ?? null;

        let progress = 0;
        let opsToNext = null;
        if (Number.isFinite(nextAt) && Number.isFinite(ops)) {
          progress = Math.min(100, Math.max(0, Math.round((ops / nextAt) * 100)));
          opsToNext = Math.max(0, nextAt - ops);
        }

        rows.push({
          id: m.id,
          name: m.name || "Unknown",
          rank: m.rank || "N/A",
          squad,
          status,
          ops: Number.isFinite(ops) ? ops : null,
          nextRank,
          nextAt,
          progress,
          opsToNext,
          rankScore: this.rankScore(m?.rank),
        });
      }

      const filtered = onlyProm ? rows.filter((r) => r.opsToNext === 0 && !!r.nextRank) : rows;
      const sorter = {
        rank: (a, b) => a.rankScore - b.rankScore,
        ops: (a, b) => (b.ops ?? -Infinity) - (a.ops ?? -Infinity),
        progress: (a, b) => (b.progress ?? -Infinity) - (a.progress ?? -Infinity),
        name: (a, b) => a.name.localeCompare(b.name),
      }[this.sortKey] || ((a, b) => 0);

      return filtered.sort(sorter);
    },
    eligibleNowCount() { return this.promotionsTable.filter((r) => r.opsToNext === 0 && !!r.nextRank).length; },
    imminentCount()     { return this.promotionsTable.filter((r) => Number.isFinite(r.opsToNext) && r.opsToNext > 0 && r.opsToNext <= 3).length; },
    rankScore() {
      const order = ["MAJ","CAPT","1STLT","2NDLT","CWO5","CWO4","CWO3","CWO2","WO","GYSGT","SSGT","SGT","CPL","LCPL","SPC4","SPC3","SPC2","SPC","PFC","PVT","RCT","HMC","HM1","HM2","HM3","HN","HA","HR"];
      return (r) => { const idx = order.indexOf(this.rankKey(r)); return idx === -1 ? 999 : idx; };
    },

    disciplineRowsIndexed() {
      const idx = Object.create(null);
      (this.disciplineRows || []).forEach(r => { idx[r.nameKey] = r; });
      return idx;
    },
    discTable() {
      const rows = [];
      (this.members || []).forEach(m => {
        if (!this.isInTroopList(m)) return;
        const status = this.memberStatusOf(m);
        if (this.isDischarged(status)) return;

        const nk = this.nameKey(m?.name);
        const squad = String(m?.squad || this.membershipIndex[`ID:${m?.id}`] || this.membershipIndex[`NM:${nk}`] || '').trim();
        const api = this.disciplineRowsIndexed[nk] || { notes: '', warnings: 'N, N, N' };
        const bits = (api.warnings || 'N, N, N').split(',').map(s => s.trim().toUpperCase() === 'Y');
        const warnCount = bits.filter(Boolean).length;
        rows.push({
          name: m?.name || 'Unknown',
          nameKey: this.nameKey(this.cleanMemberName(m?.name)),
          squad,
          status,
          notes: api.notes || '',
          warnings: api.warnings || 'N, N, N',
          warnBits: [!!bits[0], !!bits[1], !!bits[2]],
          warnCount,
        });
      });
      return rows.sort((a,b) => a.name.localeCompare(b.name));
    },
    discFiltered() {
      const term = (this.discSearch || '').trim().toLowerCase();
      if (!term) return this.discTable;
      return this.discTable.filter(r => {
        const hay = [r.name, r.squad, r.notes, r.status].map(x => String(x||'').toLowerCase()).join(' ');
        return hay.includes(term);
      });
    },
  },
  watch: {
    isAuthed(v) {
      if (v) {
        this.loadDiscipline();
        if (this.troopStatusCsvUrl) this.fetchTroopStatusCsv();
      }
    },
  },
  methods: {
    triggerFlicker(delayMs = 0) {
      this.animateView = false;
      this.animationDelay = `${delayMs}ms`;
      this.$nextTick(() => {
        requestAnimationFrame(() => { this.animateView = true; });
      });
    },
    isFiniteNum(v) { return Number.isFinite(v); },
    getOps(member) {
      if (member?.id != null && this.attendanceMap[`ID:${member.id}`] !== undefined) return this.attendanceMap[`ID:${member.id}`];
      if (member?.name) {
        const nk = this.nameKey(member.name);
        if (this.attendanceMap[`NM:${nk}`] !== undefined) return this.attendanceMap[`NM:${nk}`];
      }
      const direct = Number(member?.opsAttended);
      return Number.isFinite(direct) ? direct : null;
    },
    statusClass(status) {
      const s = String(status || 'Unknown').toLowerCase();
      if (s === 'active') return 'active';
      if (s === 'reserve') return 'reserve';
      if (s === 'eloa') return 'eloa';
      if (s === 'inactive') return 'inactive';
      if (s === 'other') return 'other';
      if (s === 'discharged') return 'discharged';
      return 'unknown';
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
          if (ch === '"') { if (text[i + 1] === '"') { val += '"'; i++; } else { inQ = false; } }
          else { val += ch; }
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
        const arr = Array.isArray(data) ? data : [];
        this.disciplineRows = arr.map(r => ({
          name: r.name || '',
          nameKey: this.nameKey(this.cleanMemberName(r.name || r.nameKey || '')),
          notes: r.notes || '',
          warnings: r.warnings || 'N, N, N',
          status: this.normalizeStatus(r.status || r.troopStatus),
        }));
      } catch (e) { this.discError = String(e?.message || e); }
      finally { this.discLoading = false; }
    },
    async refreshDiscipline() {
      await this.loadDiscipline();
      if (this.troopStatusCsvUrl) await this.fetchTroopStatusCsv();
    },
    focusMemberByNameKey(nk) {
      const m = (this.members || []).find(x => this.nameKey(this.cleanMemberName(x?.name)) === nk);
      if (!m) return;
      if (!this.isInTroopList(m)) return;
      if (this.isDischarged(this.memberStatusOf(m))) return;
      this.edit.memberId = m.id || null;
      this.populateEditFromMember();
      this.$nextTick(() => { const ta = this.$el.querySelector('textarea'); if (ta) ta.focus(); });
    },
    populateEditFromMember() {
      const m = (this.members || []).find(x => String(x.id || '') === String(this.edit.memberId));
      if (!m) { this.edit.notes = ''; this.edit.warn = [false,false,false]; return; }
      const nk = this.nameKey(this.cleanMemberName(m.name));
      const api = (this.disciplineRows || []).find(r => (r.nameKey) === nk);
      const warnings = (api?.warnings || 'N, N, N').split(',').map(s => s.trim().toUpperCase());
      this.edit.notes = api?.notes || '';
      this.edit.warn = [0,1,2].map(i => warnings[i] === 'Y');
    },
    warnArrayToString(arr) {
      const a = Array.isArray(arr) ? arr : [false, false, false];
      const out = a.slice(0,3).map(x => (x ? 'Y' : 'N'));
      while (out.length < 3) out.push('N');
      return out.join(', ');
    },
    toggleWarn(i) { const next = [...this.edit.warn]; next[i] = !next[i]; this.edit.warn = next; },
    async saveDiscipline() {
      this.discError = ""; this.discOK = false;
      const m = (this.members || []).find(x => String(x.id || '') === String(this.edit.memberId));
      if (!m) { this.discError = "Select a member."; return; }
      if (!this.isInTroopList(m)) { this.discError = "Member not in Troop List."; return; }
      if (this.isDischarged(this.memberStatusOf(m))) { this.discError = "Cannot edit a discharged member."; return; }

      const payload = {
        secret: this.discSecret,
        name: m.name || '',
        nameKey: this.nameKey(this.cleanMemberName(m.name || '')),
        notes: (this.edit.notes || '').trim(),
        warnings: this.warnArrayToString(this.edit.warn),
      };

      this.discSaving = true;
      try {
        const res = await fetch(this.discEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });
        const text = await res.text();
        let data; try { data = JSON.parse(text); } catch { data = { ok:false, error:'Bad JSON from server' }; }
        if (!data?.ok) throw new Error(data?.error || 'Save failed');

        this.discOK = true;
        await this.refreshDiscipline();
      } catch (e) { this.discError = String(e?.message || e); }
      finally {
        this.discSaving = false;
        setTimeout(() => (this.discOK = false), 1500);
      }
    },
  },
};
</script>

<style scoped>
/* Reserve space to avoid end-of-fade width snap */
.right-window .section-content-container.right-content { scrollbar-gutter: stable; }
.rows-scroll { scrollbar-gutter: stable; }

/* Header alignment shell (matches other views) */
.header-shell { height: 52px; overflow: hidden; }

/* Narrow the LEFT header wrapper */
.header-admin {
  width: 38%;
  min-width: 220px;
  display: inline-block;
}

/* Make the right header wrapper slightly cropped for symmetry (optional tweak) */
.header-right {
  width: 72%;
  min-width: 520px;
  display: inline-block;
}

/* Prevent wrap & vertical drop of the Admin title */
.header-admin .section-header { white-space: nowrap; }
.header-admin .section-header h1 { line-height: 52px; }

/* ✨ Recreate the right chamfer on the narrowed Admin plate */
.header-admin .section-header {
  /* match the usual left notch while adding a right diagonal cut */
  --right-chamfer: 40px;
  --left-notch: 24px;
  position: relative;
  clip-path: polygon(
    0 0,
    calc(100% - var(--right-chamfer)) 0,
    100% 50%,
    calc(100% - var(--right-chamfer)) 100%,
    0 100%,
    var(--left-notch) 50%
  );
}

/* Help compositor */
.content-container { will-change: opacity, filter; contain: paint; }

/* (unchanged layout + visuals) */
.windows-grid { display: grid; grid-template-columns: 380px minmax(1080px, 1fr); column-gap: 2.4rem; align-items: start; width: 100%; }
.windows-grid > .section-container { position: relative !important; width: 100%; max-width: none; align-self: start; }
.left-window { height: auto !important; max-height: none !important; }
.right-window { display: flex; flex-direction: column; max-height: 100vh; overflow: hidden; }
.right-window .section-content-container.right-content { flex: 1 1 auto; min-height: 0; overflow: hidden; padding: .6rem .6rem .2rem; }

.promotions-panel { display: flex; flex-direction: column; gap: .6rem; height: 72vh; max-height: 72vh; min-height: 50vh; overflow: hidden; }

.control { display: grid; gap: .2rem; }
.control span { font-size: .85rem; color: #9ec5e6; }
.control input, .control select, .control textarea { background: rgba(5,20,40,0.85); border: 1px solid rgba(30,144,255,0.35); border-radius: .35rem; padding: .35rem .45rem; color: #e6f3ff; }
.control textarea { resize: vertical; }
.control input::placeholder, .control textarea::placeholder { color: #aac7e6; }
.control input:focus, .control select:focus, .control textarea:focus { outline: none; border-color: rgba(30,144,255,0.6); }
.control select option { background: rgba(5,20,40,0.98); color: #e6f3ff; }
.control.chk { display: flex; align-items: center; gap: .45rem; padding-top: 1.25rem; }
.control.chk input[type="checkbox"] { width: 16px; height: 16px; accent-color: #78ffd0; }
.control.chk span { color: #e6f3ff; font-size: .9rem; }

.filters { border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; padding: .5rem; margin-bottom: .6rem; }
.filters .row { display: grid; grid-template-columns: 1.2fr auto auto auto; gap: .6rem; align-items: end; }
.chips { display: flex; gap: .45rem; margin-bottom: .55rem; flex-wrap: wrap; }
.chip { padding: .25rem .5rem; border-radius: 999px; background: rgba(0,10,30,0.25); border: 1px solid rgba(30,144,255,0.45); color: #e6f3ff; }
.chip.ok { border-color: rgba(120,255,170,0.7); }
.chip.warn { border-color: rgba(255,190,80,0.7); }

.muted { color: #9ec5e6; }
.ok-text { color: #79ffba; }
.empty { color: #9ec5e6; padding: .8rem; text-align: center; }

.rail { display: grid; gap: .6rem; align-content: start; }
.rail-card { text-align: left; border: 1px solid rgba(30,144,255,0.35); background: rgba(0,10,30,0.35); border-radius: .5rem; padding: .6rem; cursor: pointer; }
.rail-card.active { border-color: rgba(120,255,170,0.7); }
.rail-card-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .35rem; }
.rail-icon { width: 20px; height: 20px; }
.rail-title, .rail-line .label { color: #d9ebff; }
.pill { font-size: .85rem; border: 1px solid rgba(30,144,255,0.45); border-radius: 999px; padding: .05rem .5rem; color: #e6f3ff; }
.rail-foot { margin-top: .25rem; font-size: .8rem; color: #9ec5e6; }

.table-scroll { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden; }
.table-shell { flex: 1 1 auto; min-height: 0; border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; background: rgba(0,10,30,0.18); display: flex; flex-direction: column; overflow: hidden; }
.grid6 { display: grid; grid-template-columns: 1.6fr .8fr 1fr .6fr .9fr 1.2fr; align-items: center; }
.gridFlags { display: grid; grid-template-columns: 1.4fr .9fr .9fr 1fr 2.7fr; align-items: center; }
.tr.head { font-weight: 600; background: rgba(0,10,30,0.35); border-bottom: 1px dashed rgba(30,144,255,0.25); flex: 0 0 auto; }
.rows-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; }
.tr .th, .tr .td { padding: .4rem .5rem; color: #e6f3ff; border-bottom: 1px dashed rgba(30,144,255,0.18); }
.rows-scroll .tr:last-child .td { border-bottom: 0; }

.bar { height: 8px; background: rgba(0,10,30,0.35); border: 1px solid rgba(30,144,255,0.35); border-radius: 999px; position: relative; overflow: hidden; }
.bar .fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0%; transition: width .25s ease; background: rgba(120,200,255,0.6); }
.bar.done .fill { background: rgba(120,255,170,0.7); }

.warn-row { position: relative; }
.warn-row::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: transparent; }
.warn-0 { background: transparent; }
.warn-1 { background: rgba(255, 200, 80, 0.06); }
.warn-1::before { background: rgba(255, 200, 80, 0.8); }
.warn-2 { background: rgba(255, 140, 60, 0.08); }
.warn-2::before { background: rgba(255, 140, 60, 0.85); }
.warn-3 { background: rgba(255, 90, 90, 0.10); }
.warn-3::before { background: rgba(255, 90, 90, 0.9); }

.warncells { display: flex; align-items: center; }
.warn-badges { display: inline-flex; gap: .35rem; align-items: center; }
.warn-badges .dot { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(150,190,230,0.35); background: rgba(0,10,30,0.25); box-shadow: inset 0 0 0 2px rgba(0,0,0,0.2); }
.warn-badges .dot.on { border-color: rgba(150,190,230,0.6); }
.warn-badges.w1 .dot.on { background: rgba(255, 200, 80, 0.75); }
.warn-badges.w2 .dot.on { background: rgba(255, 140, 60, 0.85); }
.warn-badges.w3 .dot.on { background: rgba(255, 90, 90, 0.95); }

.status-pill { padding: .1rem .5rem; border-radius: 999px; border: 1px solid rgba(150,190,230,0.35); background: rgba(0,10,30,0.25); font-size: .82rem; }
.status-pill.st-active { border-color: rgba(120,255,170,0.7); }
.status-pill.st-reserve { border-color: rgba(120,200,255,0.7); }
.status-pill.st-eloa { border-color: rgba(200,180,255,0.7); }
.status-pill.st-inactive { border-color: rgba(200,200,200,0.4); }
.status-pill.st-other { border-color: rgba(255,190,80,0.6); }
.status-pill.st-unknown { border-color: rgba(150,190,230,0.35); }
.status-pill.st-discharged { border-color: rgba(255,90,90,0.9); }

.flag-form { border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; padding: .6rem; display: grid; gap: .6rem; background: rgba(0,10,30,0.25); }
.flag-form .row { display: grid; grid-template-columns: 1.6fr 1fr; gap: .6rem; }
.flag-form .row.end { grid-template-columns: 1fr auto auto; align-items: center; }

@media (max-width: 1200px) {
  .windows-grid { grid-template-columns: 340px 1fr; column-gap: 1.4rem; }
  .promotions-panel { height: 68vh; max-height: 68vh; }
  .flag-form .row { grid-template-columns: 1fr; }
}
@media (max-width: 980px) {
  .windows-grid { grid-template-columns: 1fr; }
  .right-window { order: 1; }
  .left-window { order: 2; }
  .promotions-panel { height: 64vh; max-height: 64vh; }
  .flag-form .row { grid-template-columns: 1fr; }
}
</style>
