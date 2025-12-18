<!-- src/views/admin/AdminHome.vue -->
<template>
  <div class="windows-grid">
    <!-- LEFT: nav window (compact, sticky) -->
    <section class="section-container left-window">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/protocol.svg" alt="" />
        <h1>Admin</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <div class="section-content-container">
        <div v-if="!isAuthed" class="muted">
          Restricted. <router-link :to="{ path: '/admin/login', query: { redirect: '/admin' } }">Sign in as staff</router-link>.
        </div>

        <div v-else class="rail">
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
              <div class="rail-foot">Open</div>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- RIGHT: main window (dominant, scrolls internally) -->
    <section class="section-container right-window">
      <div class="section-header clipped-medium-backward right-header">
        <img src="/icons/protocol.svg" alt="" />
        <h1>{{ isAuthed ? windowTitle : 'Locked' }}</h1>
        <div class="right-actions">
          <span v-if="isAuthed" class="user-pill">{{ userDisplay }} · {{ role }}</span>
        </div>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <div class="section-content-container right-content">
        <div v-if="!isAuthed" class="muted">
          Staff only. <router-link :to="{ path: '/admin/login', query: { redirect: '/admin' } }">Sign in</router-link>.
        </div>

        <!-- Promotions -->
        <div v-else-if="activeKey === 'promotions'" class="panel">
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
                  <span class="td ops">
                    <span v-if="isFiniteNum(row.ops)">{{ row.ops }}</span>
                    <span v-else class="muted">N/A</span>
                  </span>
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

                <div v-if="!promotionsTable.length" class="empty">No results.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Discipline -->
        <div v-else-if="activeKey === 'discipline'" class="panel">
          <div class="filters">
            <div class="row">
              <label class="control">
                <span>Search</span>
                <input type="text" v-model="discSearch" placeholder="Name, squad, note" />
              </label>
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
                <span>
                  Warnings (3 slots)
                  <small v-if="role === 'officer'">(officers cannot change warnings)</small>
                </span>
                <div class="warn-toggle">
                  <button
                    type="button"
                    class="warn-pill lvl1"
                    :class="{ on: edit.warn[0] }"
                    @click="toggleWarn(0)"
                    :disabled="role === 'officer'"
                  >1</button>
                  <button
                    type="button"
                    class="warn-pill lvl2"
                    :class="{ on: edit.warn[1] }"
                    @click="toggleWarn(1)"
                    :disabled="role === 'officer'"
                  >2</button>
                  <button
                    type="button"
                    class="warn-pill lvl3"
                    :class="{ on: edit.warn[2] }"
                    @click="toggleWarn(2)"
                    :disabled="role === 'officer'"
                  >3</button>
                </div>
              </label>
            </div>

            <label class="control">
              <span>Disciplinary Notes</span>
              <textarea v-model="edit.notes" rows="3" placeholder="Notes visible to staff and officers"></textarea>
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
                >
                  <span class="td">{{ r.name }}</span>
                  <span class="td">{{ r.squad || '—' }}</span>
                  <span class="td">
                    <span class="status-pill" :class="'st-' + statusClass(r.status)">
                      {{ r.status || 'Unknown' }}
                    </span>
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

        <div v-else class="muted">Select a tool from the left.</div>
      </div>
    </section>
  </div>
</template>

<script>
import { adminToken, adminUser, adminEndpoint, adminSecret, isAdmin } from "@/utils/adminAuth";

export default {
  name: "AdminHome",
  props: { members: Array, orbat: Array, attendance: Array },
  data() {
    return {
      activeKey: "promotions",

      // Promotions filters
      search: "",
      selectedSquad: "__ALL__",
      sortKey: "rank",
      onlyPromotable: false,

      // Discipline API via Netlify proxy (CORS-safe)
      discEndpoint: adminEndpoint(),
      discSecret: adminSecret(),
      discLoading: false,
      discSaving: false,
      discError: "",
      discOK: false,
      disciplineRows: [],

      // RefData CSV (STRICT headers: "Troop List", "Troop Status")
      troopStatusCsvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRq9fpYoWY_heQNfXegQ52zvOIGk-FCMML3kw2cX3M3s8blNRSH6XSRUdtTo7UXaJDDkg4bGQcl3jRP/pub?gid=107253735&single=true&output=csv",
      csvStatusIndex: Object.create(null), // nameKey -> status
      csvTroopIndex: Object.create(null),  // nameKey -> present in Troop List

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
    role() { const u = adminUser(); return (u && (u.role || null)) || "staff"; },
    userDisplay() { const u = adminUser(); return u?.displayName || u?.username || "staff"; },

    /* window title & tiles */
    windowTitle() {
      return { promotions: "Promotions Overview", discipline: "Discipline" }[this.activeKey] || "Admin Tools";
    },
    sections() {
      return [
        {
          key: "promotions",
          title: "Promotions Overview",
          icon: "/icons/protocol.svg",
          preview: [
            { label: "Eligible now", value: this.eligibleNowCount, kind: "ok" },
            { label: "Imminent (≤3)", value: this.imminentCount, kind: "warn" },
          ],
        },
        {
          key: "discipline",
          title: "Discipline",
          icon: "/icons/protocol.svg",
          preview: [
            { label: "Members w/ notes", value: this.disciplineRows.filter(r => !!r.notes).length, kind: "warn" },
            { label: "Any warnings", value: this.disciplineRows.filter(r => r.warnCount > 0).length, kind: "ok" },
          ],
        },
      ];
    },

    /* name/rank/status helpers */
    nameKey() {
      return (name) => String(name || "")
        .replace(/["'.]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    },
    cleanMemberName() {
      return (name) => String(name || "")
        .replace(/\s*[\(\[].*?[\)\]]\s*$/g, "")
        .trim();
    },
    rankKey() {
      return (rank) => String(rank || "").trim().toUpperCase().replace(/[.\s]/g, "");
    },
    normalizeStatus() {
      const pretty = {
        ACTIVE: "Active", RESERVE: "Reserve", ELOA: "ELOA", OTHER: "Other",
        INACTIVE: "Inactive", DISCHARGED: "Discharged", UNKNOWN: "Unknown",
      };
      return (raw) => pretty[String(raw || "").trim().toUpperCase()] || "Unknown";
    },
    statusClass() {
      return (status) =>
        ({
          active: "active", reserve: "reserve", eloa: "eloa",
          inactive: "inactive", other: "other", discharged: "discharged",
        }[String(status || "").toLowerCase()] || "unknown");
    },

    /* attendance */
    attendanceMap() {
      const map = Object.create(null);
      (this.members || []).forEach((m) => {
        const ops = Number(m.opsAttended);
        if (Number.isFinite(ops)) {
          if (m.id != null) map[`ID:${m.id}`] = ops;
          if (m.name) map[`NM:${this.nameKey(m.name)}`] = ops;
        }
      });
      return map;
    },

    /* membership (ORBAT) */
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
        (sq.fireteams || []).forEach((ft) => (ft.slots || []).forEach((sl) => add(s, sl?.member)));
        (sq.members || []).forEach(add.bind(null, s));
      });
      return idx;
    },

    squads() {
      const set = new Set();
      (this.orbat || []).forEach((sq) => {
        const s = String(sq?.squad || "").trim();
        if (s) set.add(s);
      });
      (this.members || []).forEach((m) => {
        const s = String(m?.squad || "").trim();
        if (s) set.add(s);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },

    /* filtering wrt Troop List + Status */
    isDischarged() { return (status) => String(status || "").toLowerCase() === "discharged"; },
    isInTroopList() {
      return (m) => {
        const nk = this.nameKey(this.cleanMemberName(m?.name));
        const hasCsv = Object.keys(this.csvTroopIndex).length > 0; // only enforce after CSV loaded
        return hasCsv ? !!this.csvTroopIndex[nk] : true;
      };
    },
    memberStatusOf() {
      return (m) => {
        const nk = this.nameKey(this.cleanMemberName(m?.name));
        return this.csvStatusIndex[nk] || "Unknown";
      };
    },

    /* roster list for selector */
    membersSorted() {
      return [...(this.members || [])]
        .filter((m) => this.isInTroopList(m) && !this.isDischarged(this.memberStatusOf(m)))
        .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
    },
    membersSortedNonDischarged() { return this.membersSorted; },

    /* promotion rules */
    nextPromotion() {
      const alias = {
        PRIVATE: "PVT", PRIVATEFIRSTCLASS: "PFC", SPECIALIST: "SPC", SPECIALIST2: "SPC2",
        SPECIALIST3: "SPC3", SPECIALIST4: "SPC4", LANCECORPORAL: "LCPL", CORPORAL: "CPL",
        SERGEANT: "SGT", STAFFSERGEANT: "SSGT", GUNNYSERGEANT: "GYSGT",
        SECONDLIEUTENANT: "2NDLT", FIRSTLIEUTENANT: "1STLT", CAPTAIN: "CAPT",
        HOSPITALMANAPPRENTICE: "HA", HOSPITALMAN: "HN", HOSPITALCORPSMANTHIRDCLASS: "HM3",
        HOSPITALCORPSMANSECONDCLASS: "HM2", HOSPITALCORPSMANFIRSTCLASS: "HM1",
        CHIEFHOSPITALCORPSMAN: "HMC",
        WARRANTOFFICER: "WO", CHIEFWARRANTOFFICER2: "CWO2", CHIEFWARRANTOFFICER3: "CWO3",
        CHIEFWARRANTOFFICER4: "CWO4", CHIEFWARRANTOFFICER5: "CWO5",
      };
      const rules = {
        PVT: { nextRank: "PFC", nextAt: 10 },
        PFC: { nextRank: "SPC", nextAt: 20 },
        SPC: { nextRank: "SPC2", nextAt: 30 },
        SPC2: { nextRank: "SPC3", nextAt: 40 },
        SPC3: { nextRank: "SPC4", nextAt: 50 },
        SPC4: { nextRank: "LCpl", nextAt: null },
        LCPL: { nextRank: "Cpl", nextAt: null },
        CPL: { nextRank: "Sgt", nextAt: null },
        SGT: { nextRank: "SSgt", nextAt: null },
        SSGT: { nextRank: "GySgt", nextAt: null },
        GYSGT: { nextRank: "2ndLt", nextAt: null },
        "2NDLT": { nextRank: "1stLt", nextAt: null },
        "1STLT": { nextRank: "Capt", nextAt: null },
        CAPT: { nextRank: null, nextAt: null },
        HA: { nextRank: "HN", nextAt: 10 },
        HN: { nextRank: "HM3", nextAt: 20 },
        HM3: { nextRank: "HM2", nextAt: 30 },
        HM2: { nextRank: "HM1", nextAt: null },
        HM1: { nextRank: "HMC", nextAt: null },
        HMC: { nextRank: null, nextAt: null },
        WO: { nextRank: "CWO2", nextAt: 10 },
        CWO2: { nextRank: "CWO3", nextAt: 20 },
        CWO3: { nextRank: "CWO4", nextAt: 30 },
        CWO4: { nextRank: "CWO5", nextAt: null },
        CWO5: { nextRank: null, nextAt: null },
      };
      return (m) => {
        const rk = alias[this.rankKey(m?.rank)] || this.rankKey(m?.rank);
        return rules[rk] || { nextRank: null, nextAt: null };
      };
    },
    rankScore() {
      const order = [
        "MAJ", "CAPT", "1STLT", "2NDLT", "CWO5", "CWO4", "CWO3", "CWO2", "WO", "GYSGT",
        "SSGT", "SGT", "CPL", "LCPL", "SPC4", "SPC3", "SPC2", "SPC", "PFC", "PVT", "RCT",
        "HMC", "HM1", "HM2", "HM3", "HN", "HA", "HR",
      ];
      return (r) => {
        const idx = order.indexOf(this.rankKey(r));
        return idx === -1 ? 999 : idx;
      };
    },

    promotionsTable() {
      const term = (this.search || "").trim().toLowerCase();
      const squadFilter = this.selectedSquad;
      const onlyProm = !!this.onlyPromotable;

      const rows = [];
      for (const m of (this.members || [])) {
        if (!this.isInTroopList(m)) continue; // require in RefData Troop List
        const status = this.memberStatusOf(m);
        if (this.isDischarged(status)) continue; // hide discharged

        if (term) {
          const hay = [m.name, m.rank, m.squad, status]
            .map((x) => String(x || "").toLowerCase())
            .join(" ");
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

      const sorter =
        {
          rank: (a, b) => a.rankScore - b.rankScore,
          ops: (a, b) => (b.ops ?? -Infinity) - (a.ops ?? -Infinity),
          progress: (a, b) => (b.progress ?? -Infinity) - (a.progress ?? -Infinity),
          name: (a, b) => a.name.localeCompare(b.name),
        }[this.sortKey] || ((a, b) => 0);

      return filtered.sort(sorter);
    },

    eligibleNowCount() {
      return this.promotionsTable.filter((r) => r.opsToNext === 0 && !!r.nextRank).length;
    },
    imminentCount() {
      return this.promotionsTable.filter(
        (r) => Number.isFinite(r.opsToNext) && r.opsToNext > 0 && r.opsToNext <= 3
      ).length;
    },

    /* discipline table assembly */
    disciplineRowsIndexed() {
      const idx = Object.create(null);
      (this.disciplineRows || []).forEach((r) => {
        idx[r.nameKey] = r;
      });
      return idx;
    },
    discTable() {
      const rows = [];
      (this.members || []).forEach((m) => {
        if (!this.isInTroopList(m)) return; // require in RefData Troop List
        const status = this.memberStatusOf(m);
        if (this.isDischarged(status)) return; // hide discharged

        const nk = this.nameKey(this.cleanMemberName(m?.name));
        const squad = String(
          m?.squad ||
          this.membershipIndex[`ID:${m?.id}`] ||
          this.membershipIndex[`NM:${nk}`] ||
          ""
        ).trim();

        const api = this.disciplineRowsIndexed[nk] || { notes: "", warnings: "N, N, N" };
        const bits = (api.warnings || "N, N, N").split(",").map((s) => s.trim().toUpperCase() === "Y");
        const warnCount = bits.filter(Boolean).length;

        rows.push({
          name: m?.name || "Unknown",
          nameKey: this.nameKey(this.cleanMemberName(m?.name)),
          squad,
          status,
          notes: api.notes || "",
          warnings: api.warnings || "N, N, N",
          warnBits: [!!bits[0], !!bits[1], !!bits[2]],
          warnCount,
        });
      });

      return rows.sort((a, b) => a.name.localeCompare(b.name));
    },
    discFiltered() {
      const term = (this.discSearch || "").trim().toLowerCase();
      if (!term) return this.discTable;
      return this.discTable.filter((r) =>
        [r.name, r.squad, r.notes, r.status]
          .map((x) => String(x || "").toLowerCase())
          .join(" ")
          .includes(term)
      );
    },
  },
  methods: {
    isFiniteNum(v) { return Number.isFinite(v); },

    getOps(member) {
      if (member?.id != null && this.attendanceMap[`ID:${member.id}`] !== undefined)
        return this.attendanceMap[`ID:${member.id}`];
      if (member?.name) {
        const nk = this.nameKey(member.name);
        if (this.attendanceMap[`NM:${nk}`] !== undefined)
          return this.attendanceMap[`NM:${nk}`];
      }
      const direct = Number(member?.opsAttended);
      return Number.isFinite(direct) ? direct : null;
    },

    /* CSV: fetch + parse (STRICT: Troop List + Troop Status) */
    async fetchTroopStatusCsv() {
      try {
        const res = await fetch(this.troopStatusCsvUrl, { method: "GET" });
        const csvText = await res.text();
        const rows = this.parseCsv(csvText);
        if (!rows.length) return;

        const header = rows[0].map((h) => String(h || "").trim());
        const hdrLower = header.map((h) => h.toLowerCase().replace(/\s+/g, " ").trim());
        const nameIdx = hdrLower.findIndex((h) => h === "troop list");   // strict
        const statusIdx = hdrLower.findIndex((h) => h === "troop status"); // strict
        if (nameIdx === -1 || statusIdx === -1) return;

        const statusMap = Object.create(null);
        const troopMap = Object.create(null);

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const rawName = String(r[nameIdx] || "").trim();
          if (!rawName) continue;
          const nk = this.nameKey(this.cleanMemberName(rawName));
          troopMap[nk] = true;
          statusMap[nk] = this.normalizeStatus(String(r[statusIdx] || "").trim());
        }
        this.csvStatusIndex = statusMap;
        this.csvTroopIndex = troopMap;
      } catch (e) {
        console.warn("CSV status load failed:", e);
      }
    },

    parseCsv(text) {
      const rows = [];
      let cur = [];
      let val = "";
      let inQ = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
          if (ch === '"') {
            if (text[i + 1] === '"') {
              val += '"';
              i++;
            } else inQ = false;
          } else val += ch;
        } else {
          if (ch === '"') inQ = true;
          else if (ch === ",") {
            cur.push(val);
            val = "";
          } else if (ch === "\n") {
            cur.push(val);
            rows.push(cur);
            cur = [];
            val = "";
          } else if (ch !== "\r") val += ch;
        }
      }
      cur.push(val);
      rows.push(cur);
      if (rows.length && rows[rows.length - 1].every((x) => String(x).length === 0)) rows.pop();
      return rows;
    },

    async loadDiscipline() {
      this.discLoading = true;
      this.discError = "";
      this.discOK = false;
      try {
        const url = `${this.discEndpoint}?secret=${encodeURIComponent(this.discSecret)}&t=${Date.now()}`;
        const res = await fetch(url, { method: "GET" });
        const arr = await res.json();
        this.disciplineRows = (Array.isArray(arr) ? arr : []).map((r) => ({
          name: r.name || "",
          nameKey: this.nameKey(this.cleanMemberName(r.name || r.nameKey || "")),
          notes: r.notes || "",
          warnings: r.warnings || "N, N, N",
          status: this.normalizeStatus(r.status || r.troopStatus),
        }));
      } catch (e) {
        this.discError = String(e?.message || e);
      } finally {
        this.discLoading = false;
        // focus UX for notes after first load
        this.$nextTick(() => {
          const ta = this.$el.querySelector("textarea");
          if (ta) ta.focus();
        });
      }
    },

    focusMemberByNameKey(nk) {
      const m = (this.members || []).find(
        (x) => this.nameKey(this.cleanMemberName(x?.name)) === nk
      );
      if (!m) return;
      if (!this.isInTroopList(m)) return;
      if (this.isDischarged(this.memberStatusOf(m))) return;

      this.edit.memberId = m.id || null;
      this.populateEditFromMember();
    },

    populateEditFromMember() {
      const m = (this.members || []).find(
        (x) => String(x.id || "") === String(this.edit.memberId)
      );
      if (!m) {
        this.edit.notes = "";
        this.edit.warn = [false, false, false];
        return;
      }

      const nk = this.nameKey(this.cleanMemberName(m.name));
      const api = (this.disciplineRows || []).find((r) => r.nameKey === nk);

      const warnings = (api?.warnings || "N, N, N").split(",").map((s) => s.trim().toUpperCase());
      this.edit.notes = api?.notes || "";
      this.edit.warn = [0, 1, 2].map((i) => warnings[i] === "Y");
    },

    toggleWarn(i) {
      if (this.role === "officer") return; // officers cannot change warnings
      const next = [...this.edit.warn];
      next[i] = !next[i];
      this.edit.warn = next;
    },

    warnArrayToString(arr) {
      const a = Array.isArray(arr) ? arr : [false, false, false];
      const out = a.slice(0, 3).map((x) => (x ? "Y" : "N"));
      while (out.length < 3) out.push("N");
      return out.join(", ");
    },

    async saveDiscipline() {
      this.discError = "";
      this.discOK = false;

      const m = (this.members || []).find(
        (x) => String(x.id || "") === String(this.edit.memberId)
      );
      if (!m) { this.discError = "Select a member."; return; }
      if (!this.isInTroopList(m)) { this.discError = "Member not in Troop List."; return; }
      if (this.isDischarged(this.memberStatusOf(m))) { this.discError = "Cannot edit a discharged member."; return; }

      const u = adminUser();
      const payload = {
        secret: this.discSecret,
        action: "saveDiscipline",
        token: adminToken(),
        editor: u?.displayName || u?.username || "unknown",
        name: m.name || "",
        nameKey: this.nameKey(this.cleanMemberName(m.name || "")),
        notes: (this.edit.notes || "").trim(),
        warnings: this.warnArrayToString(this.edit.warn),
      };

      this.discSaving = true;
      try {
        const res = await fetch(this.discEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error || "Save failed");
        this.discOK = true;
        await this.loadDiscipline();
      } catch (e) {
        this.discError = String(e?.message || e);
      } finally {
        this.discSaving = false;
        setTimeout(() => (this.discOK = false), 1500);
      }
    },
  },
};
</script>

<style scoped>
/* ——— Layout restored to the older two-window look ——— */
.user-pill { font-size: .85rem; color: #9ec5e6; }

/* Grid: compact left rail, dominant right content */
.windows-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1rem;
  align-items: start;
}

/* Left: sticky, height fits content only */
.left-window {
  position: sticky;
  top: 1rem;
  align-self: start;
  height: fit-content;
}

/* Right: main window scrolls internally; keeps header visible */
.right-window { min-height: 60vh; }
.right-content {
  max-height: calc(100vh - 210px);
  overflow: auto;
}

/* Rail tiles */
.rail { display: grid; gap: .6rem; }
.rail-card {
  text-align: left;
  border: 1px dashed rgba(30,144,255,.35);
  background: rgba(0,10,30,.25);
  border-radius: .5rem;
  padding: .6rem;
  cursor: pointer;
}
.rail-card.active { outline: 1px solid rgba(120,255,170,.8); }
.rail-card-head { display: flex; align-items: center; gap: .5rem; }
.rail-icon { width: 18px; height: 18px; }
.rail-title { font-weight: 600; }
.rail-card-body { margin-top: .4rem; display: grid; gap: .25rem; }
.rail-line { display: flex; justify-content: space-between; font-size: .9rem; }
.pill { padding: 0 .4rem; border-radius: .35rem; border: 1px solid rgba(30,144,255,.35); }
.pill.ok { border-color: rgba(120,255,170,.7); }
.pill.warn { border-color: rgba(255,180,120,.7); }
.rail-foot { margin-top: .25rem; font-size: .8rem; color: #9ec5e6; }

/* Filters + chips */
.filters { margin-bottom: .5rem; }
.filters .row { display: grid; grid-template-columns: 1fr .8fr .8fr auto; gap: .6rem; align-items: end; }
.control { display: grid; gap: .25rem; }
.control span { color: #9ec5e6; font-size: .9rem; }
.control input, .control select, .control textarea {
  background: rgba(5,20,40,.85);
  border: 1px solid rgba(30,144,255,.35);
  border-radius: .35rem;
  padding: .45rem .55rem;
  color: #e6f3ff;
}
.control.chk { display: flex; align-items: center; gap: .35rem; }
.control.chk span { margin-left: .15rem; }
.chips { display: flex; gap: .5rem; margin: .2rem 0 .6rem; }
.chip { border: 1px solid rgba(30,144,255,.35); border-radius: .35rem; padding: .18rem .4rem; font-size: .85rem; }
.chip.ok { border-color: rgba(120,255,170,.7); }
.chip.warn { border-color: rgba(255,180,120,.7); }

/* Table shell w/ sticky header */
.table-scroll { overflow: hidden; border: 1px solid rgba(30,144,255,.35); border-radius: .4rem; }
.table-shell { width: 100%; }
.tr.head {
  position: sticky;
  top: 0;
  background: rgba(0, 10, 30, 0.85);
  backdrop-filter: blur(2px);
  z-index: 2;
}
.grid6 { display: grid; grid-template-columns: 1.5fr .9fr .9fr .6fr 1.1fr 1.1fr; gap: .35rem; }
.gridFlags { display: grid; grid-template-columns: 1.5fr .9fr .9fr .6fr 2.1fr; gap: .35rem; align-items: center; }
.tr { display: contents; }
.th, .td { padding: .45rem .55rem; border-bottom: 1px solid rgba(30,144,255,.15); }
.rows-scroll { max-height: calc(100vh - 330px); overflow: auto; }
.muted { color: #9ec5e6; }
.empty { padding: .6rem; color: #9ec5e6; text-align: center; }

/* Progress bar */
.bar {
  height: 8px;
  border: 1px solid rgba(30,144,255,.35);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}
.bar.done { border-color: rgba(120,255,170,.8); }
.fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; }

/* Warnings UI */
.warn-toggle { display: flex; gap: .35rem; }
.warn-pill {
  border: 1px solid rgba(255,180,120,.65);
  background: rgba(40,10,0,.35);
  color: #ffd9bf;
  border-radius: .4rem;
  padding: .25rem .5rem;
  cursor: pointer;
}
.warn-pill.on { border-color: rgba(255,100,80,.85); background: rgba(60,0,0,.5); }

.status-pill { border: 1px solid rgba(30,144,255,.35); border-radius: .35rem; padding: .1rem .35rem; font-size: .8rem; }
.st-active { border-color: rgba(120,255,170,.7); }
.st-discharged { border-color: rgba(255,120,120,.7); }

.warn-badges { display: flex; gap: .25rem; align-items: center; }
.dot { width: 8px; height: 8px; border-radius: 50%; border: 1px solid rgba(255,180,120,.6); }
.dot.on { background: rgba(255,120,80,.85); }

/* Panel spacing parity across tools */
.panel { display: grid; gap: .6rem; }
</style>
