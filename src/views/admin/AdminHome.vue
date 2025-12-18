<!-- src/views/admin/AdminHome.vue -->
<template>
  <div class="admin-root">
    <!-- left nav / tiles stays unchanged -->

    <!-- Discipline panel (example table binding) -->
    <section v-if="activePanel === 'discipline'" class="discipline-panel">
      <div class="panel-header">
        <h2>Disciplinary Notes & Warnings</h2>
      </div>

      <div class="table-wrap">
        <table class="grid-table">
          <thead>
            <tr>
              <th style="width: 24ch;">Trooper</th>
              <th style="width: 12ch;">Status</th>
              <th>Notes</th>
              <th style="width: 14ch;">Warnings</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredDiscipline" :key="row._id">
              <td>{{ row.name }}</td>
              <td :class="statusClass(row.troopStatus || row.status)">
                {{ row.troopStatus || row.status || 'Unknown' }}
              </td>
              <td>{{ row.notes || '' }}</td>
              <td>{{ (row.warnings || '').toString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- other panels unchanged -->
  </div>
</template>

<script>
import { onMounted, ref, computed } from "vue";
import { isOfficerOrStaff } from "@/utils/adminAuth";

export default {
  name: "AdminHome",
  setup() {
    const activePanel = ref("discipline");

    // your actual data sources
    const discipline = ref([]);
    const promotableOnly = ref(false);
    const search = ref("");

    const filteredDiscipline = computed(() => {
      let list = discipline.value || [];
      if (search.value) {
        const q = search.value.toLowerCase();
        list = list.filter(r => (r.name || "").toLowerCase().includes(q));
      }
      if (promotableOnly.value) {
        list = list.filter(r => (r.promotable === true));
      }
      return list;
    });

    onMounted(() => {
      // load your data exactly as before
      // (left as-is to avoid altering your existing logic)
    });

    function statusClass(val) {
      const v = String(val || "").trim().toLowerCase();
      if (v === "active") return "status-active";
      if (v === "reserve" || v === "eloa") return "status-reserve";
      if (v === "inactive" || v === "other" || v === "unknown") return "status-inactive";
      if (v === "discharged") return "status-discharged";
      return "status-unknown";
    }

    return {
      activePanel,
      discipline,
      filteredDiscipline,
      promotableOnly,
      search,
      statusClass,
      isOfficerOrStaff, // if template uses it
    };
  },
};
</script>

<style scoped>
/* keep your existing styles; only add these lines if you don't already have them */
.status-active     { color:#c6ffdd; border-left:3px solid #38d39f; padding-left:.4rem; }
.status-reserve    { color:#b7e6ff; border-left:3px solid #4cb3ff; padding-left:.4rem; }
.status-inactive   { color:#d0cfe0; border-left:3px solid #888;   padding-left:.4rem; }
.status-discharged { color:#ffb0a0; border-left:3px solid #ff6b6b; padding-left:.4rem; }
.status-unknown    { color:#cfd8e3; border-left:3px solid #6aa1c7; padding-left:.4rem; }

.table-wrap { overflow: auto; max-height: 70vh; }
.grid-table { width: 100%; border-collapse: collapse; }
.grid-table th, .grid-table td { padding: .45rem .6rem; border-bottom: 1px solid rgba(255,255,255,.08); }
.grid-table thead th { position: sticky; top: 0; background: rgba(5,15,25,.85); z-index: 1; }
</style>
