<!-- src/views/admin/AdminHome.vue -->
<template>
  <div class="windows-grid">
    <!-- LEFT WINDOW: Admin nav -->
    <section class="section-container left-window">
      <div class="section-header clipped-medium-backward">
        <img src="/icons/protocol.svg" alt="" />
        <h1>Admin</h1>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <div class="section-content-container">
        <!-- Inline login -->
        <div v-if="!isAuthed" class="login-card">
          <label class="control">
            <span>Password</span>
            <input
              type="password"
              v-model="passwordInput"
              placeholder="Enter unit password"
              @keyup.enter="tryLogin"
            />
          </label>
          <button class="btn-sm" @click="tryLogin">Log in</button>
          <p v-if="loginError" class="login-error">{{ loginError }}</p>
        </div>

        <!-- Tiles -->
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
              <div class="rail-foot">Click to open</div>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- RIGHT WINDOW: Overview -->
    <section class="section-container right-window">
      <div class="section-header clipped-medium-backward right-header">
        <img src="/icons/protocol.svg" alt="" />
        <h1>{{ windowTitle }}</h1>
        <div class="right-actions"><!-- intentionally empty --></div>
      </div>
      <div class="rhombus-back">&nbsp;</div>

      <div class="section-content-container right-content">
        <div v-if="!isAuthed" class="muted">Enter the admin password in the left window to continue.</div>

        <!-- Promotions -->
        <div v-else-if="activeKey === 'promotions'">
          <!-- Filters -->
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
                Promotable only
              </label>
            </div>
          </div>

          <!-- Summary chips -->
          <div class="chips">
            <span class="chip">Total: {{ promotionsTable.length }}</span>
            <span class="chip ok">Eligible now: {{ eligibleNowCount }}</span>
            <span class="chip warn">Imminent (≤3): {{ imminentCount }}</span>
          </div>

          <!-- Table -->
          <div class="table">
            <div class="tr head">
              <span class="th name">Name</span>
              <span class="th rank">Rank</span>
              <span class="th squad">Squad</span>
              <span class="th ops">Ops</span>
              <span class="th next">Next Rank</span>
              <span class="th prog">Progress</span>
              <span class="th act">Actions</span>
            </div>

            <div v-for="row in promotionsTable" :key="row.id" class="tr">
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
              <span class="td act">
                <button class="btn-sm" v-if="row.opsToNext === 0 && row.nextRank" @click="markPromoted(row)">Mark</button>
                <button class="btn-sm ghost" @click="openMember(row)">Open</button>
              </span>
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
export default {
  name: "AdminHome",
  props: {
    /* Same feed as PilotsView */ // :contentReference[oaicite:3]{index=3}
    members: { type: Array, default: () => [] },
    orbat:   { type: Array, default: () => [] },
    attendance: { type: Array, default: () => [] },
  },
  data() {
    return {
      // auth
      isAuthed: false,
      passwordInput: "",
      loginError: "",
      activeKey: "promotions",

      // filters
      search: "",
      selectedSquad: "__ALL__",
      sortKey: "rank",
      onlyPromotable: false,
    };
  },
  created() {
    // fresh login on reload
    try {
      localStorage.removeItem("admin-auth");
      sessionStorage.removeItem("admin-authed");
    } catch {}
  },
  computed: {
    /* ======= Borrowed logic from PilotsView (normalized) ======= */ // :contentReference[oaicite:4]{index=4}
    nameKey() {
      return (name) =>
        String(name || "")
          .replace(/["'.]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase();
    },
    attendanceMap() {
      const map = Object.create(null);
      (this.members || []).forEach(m => {
        const ops = Number(m.opsAttended);
        if (Number.isFinite(ops)) {
          if (m.id) map[`ID:${m.id}`] = ops;
          if (m.name) map[`NM:${this.nameKey(m.name)}`] = ops;
        }
      });
      (this.attendance || []).forEach(row => {
        const ops = Number(row?.ops ?? row?.attended ?? row?.value);
        if (!Number.isFinite(ops)) return;
        if (row?.id) map[`ID:${row.id}`] = ops;
        if (row?.name) map[`NM:${this.nameKey(row.name)}`] = ops;
      });
      return map;
    },
    rankKey() {
      return (rank) => String(rank || "").trim().toUpperCase().replace(/[.\s]/g, "");
    },
    nextPromotion() {
      // exact ruleset used in PilotsView (copied) // :contentReference[oaicite:5]{index=5}
      const alias = {
        PRIVATE: "PVT", PRIVATEFIRSTCLASS: "PFC", SPECIALIST: "SPC",
        SPECIALIST2: "SPC2", SPECIALIST3: "SPC3", SPECIALIST4: "SPC4",
        LANCECORPORAL: "LCPL", CORPORAL: "CPL", SERGEANT: "SGT",
        STAFFSERGEANT: "SSGT", GUNNYSERGEANT: "GYSGT",
        SECONDLIEUTENANT: "2NDLT", FIRSTLIEUTENANT: "1STLT", CAPTAIN: "CAPT",
        HOSPITALMANAPPRENTICE: "HA", HOSPITALMAN: "HN",
        HOSPITALCORPSMANTHIRDCLASS: "HM3",
        HOSPITALCORPSMANSECONDCLASS: "HM2",
        HOSPITALCORPSMANFIRSTCLASS: "HM1",
        CHIEFHOSPITALCORPSMAN: "HMC",
        WARRANTOFFICER: "WO",
        CHIEFWARRANTOFFICER2: "CWO2", CHIEFWARRANTOFFICER3: "CWO3",
        CHIEFWARRANTOFFICER4: "CWO4", CHIEFWARRANTOFFICER5: "CWO5",
      };
      const rules = {
        PVT:  { nextRank: "PFC",  nextAt: 10,  misc: null },
        PFC:  { nextRank: "SPC",  nextAt: 20,  misc: null },
        SPC:  { nextRank: "SPC2", nextAt: 30,  misc: null },
        SPC2: { nextRank: "SPC3", nextAt: 40,  misc: null },
        SPC3: { nextRank: "SPC4", nextAt: 50,  misc: "Multiple Specialist Certs; Trainer / S-Shop personnel" },
        SPC4: { nextRank: "LCpl", nextAt: null, misc: "Junior NCO, RTO; NCOs in training / New FTLs" },
        LCPL: { nextRank: "Cpl",  nextAt: null, misc: "Junior NCO, RTO; Active FTLs & FTL experience" },
        CPL:  { nextRank: "Sgt",  nextAt: null, misc: "Senior NCO, RTO; Active SLs only" },
        SGT:  { nextRank: "SSgt", nextAt: null, misc: "Senior NCO, RTO; Active SLs only & SL experience / Platoon NCOIC" },
        SSGT: { nextRank: "GySgt",nextAt: null, misc: "Senior NCO, RTO; Active Platoon NCOIC & experience" },
        GYSGT:{ nextRank: "2ndLt",nextAt: null, misc: "Support staff / Platoon lead" },

        "2NDLT": { nextRank: "1stLt", nextAt: null, misc: null },
        "1STLT": { nextRank: "Capt",  nextAt: null, misc: null },
        CAPT:    { nextRank: null,    nextAt: null, misc: null },

        HA:  { nextRank: "HN",  nextAt: 10,  misc: null },
        HN:  { nextRank: "HM3", nextAt: 20,  misc: null },
        HM3: { nextRank: "HM2", nextAt: 30,  misc: null },
        HM2: { nextRank: "HM1", nextAt: null, misc: null },
        HM1: { nextRank: "HMC", nextAt: null, misc: "Assigned to Corpsman slot & Medic Trainer" },
        HMC: { nextRank: null,  nextAt: null, misc: null },

        WO:   { nextRank: "CWO2", nextAt: 10, misc: null },
        CWO2: { nextRank: "CWO3", nextAt: 20, misc: null },
        CWO3: { nextRank: "CWO4", nextAt: 30, misc: null },
        CWO4: { nextRank: "CWO5", nextAt: null, misc: null },
        CWO5: { nextRank: null,   nextAt: null, misc: "Flight Lead" },
      };
      return (member) => {
        const rk = alias[this.rankKey(member?.rank)] || this.rankKey(member?.rank);
        return rules[rk] || { nextRank: null, nextAt: null, misc: null };
      };
    },
    opsToNextPromotion() {
      return (member) => {
        const ops = this.getOps(member);
        const rule = this.nextPromotion(member);
        if (!Number.isFinite(ops)) return null;
        if (!Number.isFinite(rule.nextAt)) return null;
        return Math.max(0, rule.nextAt - ops);
      };
    },

    /* ORBAT membership → squad lookup identical to how squads are structured */ // :contentReference[oaicite:6]{index=6}
    membershipIndex() {
      const idx = Object.create(null);
      const nk = this.nameKey;

      const addMember = (squadName, m) => {
        if (!m) return;
        if (m.id != null) idx[`ID:${m.id}`] = squadName;
        if (m.name) idx[`NM:${nk(m.name)}`] = squadName;
      };

      (this.orbat || []).forEach((sq) => {
        const squadName = String(sq?.squad || "").trim();
        if (!squadName) return;

        // fireteam/slots style
        (sq?.fireteams || []).forEach(ft => (ft?.slots || []).forEach(slot => addMember(squadName, slot?.member)));
        // flat members style
        (sq?.members || []).forEach(m => addMember(squadName, m));
      });

      return idx;
    },

    /* Source squads list: union of ORBAT squads and member.squad fields */
    squads() {
      const set = new Set();
      (this.orbat || []).forEach(sq => { const s = String(sq?.squad || "").trim(); if (s) set.add(s); });
      (this.members || []).forEach(m => { const s = String(m?.squad || "").trim(); if (s) set.add(s); });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },

    windowTitle() {
      if (!this.isAuthed) return "Locked";
      return { promotions: "Promotions Overview", audits: "Roster Audits" }[this.activeKey] || "Admin Tools";
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
        { key: "audits", title: "Roster Audits", icon: "/icons/protocol.svg", preview: [] },
      ];
    },

    /* Build the table: resolve ops + next rank + correct squad by ORBAT */
    promotionsTable() {
      const term = (this.search || "").trim().toLowerCase();
      const squadFilter = this.selectedSquad;
      const onlyProm = !!this.onlyPromotable;

      const rows = [];
      for (const m of (this.members || [])) {
        if (term) {
          const hit =
            (m.name || "").toLowerCase().includes(term) ||
            (m.rank || "").toLowerCase().includes(term) ||
            (m.squad || "").toLowerCase().includes(term);
          if (!hit) continue;
        }

        // squad: prefer m.squad, else from ORBAT membership
        const squad = String(m?.squad || this.membershipIndex[`ID:${m?.id}`] || this.membershipIndex[`NM:${this.nameKey(m?.name)}`] || "").trim();
        if (squadFilter && squadFilter !== "__ALL__" && squad !== squadFilter) continue;

        const rule = this.nextPromotion(m);
        const ops = this.getOps(m);
        const nextRank = rule?.nextRank ?? null;
        const nextAt = rule?.nextAt ?? null;

        let progress = 0, opsToNext = null;
        if (Number.isFinite(nextAt) && Number.isFinite(ops)) {
          progress = Math.min(100, Math.max(0, Math.round((ops / nextAt) * 100)));
          opsToNext = Math.max(0, nextAt - ops);
        }

        rows.push({
          id: m.id,
          name: m.name || "Unknown",
          rank: m.rank || "N/A",
          squad,
          ops: Number.isFinite(ops) ? ops : null,
          nextRank,
          nextAt,
          progress,
          opsToNext,
          rankScore: this.rankScore(m?.rank),
        });
      }

      const filtered = onlyProm ? rows.filter(r => r.opsToNext === 0 && !!r.nextRank) : rows;
      const sorter = {
        rank: (a,b) => a.rankScore - b.rankScore,
        ops: (a,b) => (b.ops ?? -Infinity) - (a.ops ?? -Infinity),
        progress: (a,b) => (b.progress ?? -Infinity) - (a.progress ?? -Infinity),
        name: (a,b) => a.name.localeCompare(b.name),
      }[this.sortKey] || ((a,b)=>0);

      return filtered.sort(sorter);
    },

    eligibleNowCount() { return this.promotionsTable.filter(r => r.opsToNext === 0 && !!r.nextRank).length; },
    imminentCount()    { return this.promotionsTable.filter(r => Number.isFinite(r.opsToNext) && r.opsToNext > 0 && r.opsToNext <= 3).length; },

    rankScore() {
      const order = [
        "MAJ","CAPT","1STLT","2NDLT",
        "CWO5","CWO4","CWO3","CWO2","WO",
        "GYSGT","SSGT","SGT","CPL","LCPL",
        "SPC4","SPC3","SPC2","SPC","PFC","PVT","RCT",
        "HMC","HM1","HM2","HM3","HN","HA","HR",
      ];
      return (r) => {
        const idx = order.indexOf(this.rankKey(r));
        return idx === -1 ? 999 : idx;
      };
    },
  },
  methods: {
    /* Auth */
    tryLogin() {
      const code = String(this.passwordInput || "").trim().toLowerCase();
      if (!code) { this.loginError = "Please enter the password."; return; }
      if (code === "150th") { this.isAuthed = true; this.passwordInput = ""; this.loginError = ""; }
      else { this.loginError = "Invalid password."; }
    },

    /* Same as PilotsView resolution order (ID -> Name -> direct) */ // :contentReference[oaicite:7]{index=7}
    getOps(member) {
      if (member?.id && this.attendanceMap[`ID:${member.id}`] !== undefined) {
        return this.attendanceMap[`ID:${member.id}`];
      }
      if (member?.name) {
        const nk = this.nameKey(member.name);
        if (this.attendanceMap[`NM:${nk}`] !== undefined) {
          return this.attendanceMap[`NM:${nk}`];
        }
      }
      const direct = Number(member?.opsAttended);
      return Number.isFinite(direct) ? direct : null;
    },

    /* Actions (stubbed) */
    markPromoted(row) { alert(`${row.name} marked as promoted to ${row.nextRank}. (Stub)`); },
    openMember(row) { console.log("Open member (stub):", row); },

    /* Utils */
    isFiniteNum(v) { return Number.isFinite(v); },
  },
};
</script>

<style scoped>
/* Layout: LEFT 380px, RIGHT wide (dominant) */
.windows-grid {
  display: grid;
  grid-template-columns: 380px minmax(1080px, 1fr);
  column-gap: 2.4rem;
  align-items: start;
  width: 100%;
}
.windows-grid > .section-container { position: relative !important; width: 100%; max-width: none; }

/* Decoration */
.rhombus-back { height: 6px; background: repeating-linear-gradient(45deg, rgba(30,144,255,.2) 0px, rgba(30,144,255,.2) 10px, transparent 10px, transparent 20px ); }
.clipped-medium-backward {
  clip-path: polygon(0 0, 100% 0, 92% 100%, 0% 100%);
  background: linear-gradient(90deg, rgba(5,20,40,.85), rgba(5,20,40,.5));
  padding: .4rem .75rem;
  border: 1px solid rgba(30,144,255,.35);
  border-left-width: 0;
  border-radius: 0 .35rem .35rem 0;
}
.section-header { display: flex; align-items: center; gap: .6rem; }
.section-header img { width: 28px; height: 28px; }

/* Right header grid */
.right-header { display: grid; grid-template-columns: auto 1fr auto; align-items: center; }

/* Left: tiles + login */
.rail { display: grid; gap: .6rem; align-content: start; }
.rail-card {
  text-align: left;
  border: 1px solid rgba(30,144,255,0.35);
  background: rgba(0,10,30,0.35);
  border-radius: .5rem;
  padding: .6rem;
  cursor: pointer;
}
.rail-card.active { border-color: rgba(120,255,170,0.7); }
.rail-card-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .35rem; }
.rail-icon { width: 20px; height: 20px; }
.rail-title { font-weight: 600; }
.rail-card-body { display: grid; gap: .25rem; }
.rail-line { display: flex; align-items: center; justify-content: space-between; }
.pill { font-size: .85rem; border: 1px solid rgba(30,144,255,.45); border-radius: 999px; padding: .05rem .5rem; }
.pill.ok { border-color: rgba(120,255,170,0.7); }
.pill.warn { border-color: rgba(255,190,80,0.7); }
.rail-foot { margin-top: .25rem; font-size: .8rem; color: #9ec5e6; }

.login-card { border: 1px solid rgba(30,144,255,0.35); background: rgba(0,10,30,0.35); border-radius: .5rem; padding: .6rem; display: grid; gap: .5rem; }
.login-error { color: #ffb080; margin: .2rem 0 0; }

/* Controls */
.btn-sm { font-size: .85rem; padding: .25rem .5rem; border-radius: .35rem; border: 1px solid rgba(30,144,255,0.45); background: rgba(0,10,30,0.25); color: #cfe6ff; cursor: pointer; }
.btn-sm.ghost { background: transparent; border-color: rgba(30,144,255,0.45); }
.control { display: grid; gap: .2rem; }
.control span { font-size: .85rem; color: #9ec5e6; }
.control input, .control select { background: rgba(0,10,30,0.3); border: 1px solid rgba(30,144,255,0.35); border-radius: .35rem; padding: .35rem .45rem; color: #cfe6ff; }
.control.chk { align-items: center; grid-auto-flow: column; gap: .35rem; }

/* Right content */
.right-content { padding: .6rem; }
.filters { border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; padding: .5rem; margin-bottom: .6rem; }
.filters .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: .6rem; align-items: end; }
.chips { display: flex; gap: .45rem; margin-bottom: .55rem; flex-wrap: wrap; }
.chip { padding: .25rem .5rem; border-radius: 999px; background: rgba(0,10,30,0.25); border: 1px solid rgba(30,144,255,.45); color: #cfe6ff; font-size: .85rem; }
.chip.ok { border-color: rgba(120,255,170,0.7); }
.chip.warn { border-color: rgba(255,190,80,0.7); }

/* Table */
.table { border: 1px dashed rgba(30,144,255,0.35); border-radius: .35rem; overflow: hidden; }
.tr { display: grid; grid-template-columns: 1.6fr .8fr 1fr .6fr .9fr 1.2fr .9fr; align-items: center; }
.tr.head { background: rgba(0,10,30,0.35); font-weight: 600; }
.th, .td { padding: .4rem .5rem; border-bottom: 1px dashed rgba(30,144,255,0.25); }
.tr:last-child .td { border-bottom: 0; }
.muted { color: #9ec5e6; }

/* Progress bar */
.bar { height: 8px; background: rgba(0,10,30,0.35); border: 1px solid rgba(30,144,255,0.35); border-radius: 999px; position: relative; overflow: hidden; }
.bar .fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0%; transition: width .25s ease; background: rgba(120,200,255,0.6); }
.bar.done .fill { background: rgba(120,255,170,0.7); }

/* Responsive */
@media (max-width: 1200px) {
  .windows-grid { grid-template-columns: 340px 1fr; column-gap: 1.4rem; }
}
@media (max-width: 980px) {
  .windows-grid { grid-template-columns: 1fr; }
  .right-window { order: 1; }
  .left-window { order: 2; }
}
</style>
