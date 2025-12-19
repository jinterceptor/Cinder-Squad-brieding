// /src/router/index.js
import { createRouter, createWebHistory } from "vue-router";

import Status from "@/views/StatusView.vue";
import Pilots from "@/views/PilotsView.vue";
import Events from "@/views/EventsView.vue";
import AdminHome from "@/views/admin/AdminHome.vue";
import Training from "@/views/TrainingView.vue"; // <-- NEW

import { isAdmin } from "@/utils/adminAuth";
import Config from "@/assets/info/general-config.json";

const DEFAULT_TITLE = Config.defaultTitle || "UNSC BRIEFING";

// Only gate /admin; never send users to /admin/login anymore.
function isStaff() {
  const role = sessionStorage.getItem("authRole");
  return role === "staff" || isAdmin();
}

const routes = [
  { path: "/", redirect: "/status" },

  {
    path: "/status",
    name: "Mission Status",
    component: Status,
    props: true,
    meta: { title: `${DEFAULT_TITLE} BRIEFING SYSTEM` },
  },
  {
    path: "/pilots",
    name: "Unit Roster",
    component: Pilots,
    props: true,
    meta: { title: `${DEFAULT_TITLE} UNIT ROSTER` },
  },
  {
    path: "/events",
    name: "Events",
    component: Events,
    props: true,
    meta: { title: `${DEFAULT_TITLE} EVENTS` },
  },

  // NEW: Training page
  {
    path: "/training",
    name: "Training",
    component: Training,
    props: true,
    meta: { title: `${DEFAULT_TITLE} TRAINING` },
  },

  {
    path: "/admin",
    name: "Admin",
    component: AdminHome,
    props: true,
    meta: { title: `${DEFAULT_TITLE} ADMIN`, requiresAdmin: true },
  },

  // Hard-block legacy login routes to avoid loops
  { path: "/admin/login", redirect: "/status" },
  { path: "/login", redirect: "/status" },

  { path: "/:pathMatch(.*)*", redirect: "/status" },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to, _from, next) => {
  if (to.meta?.requiresAdmin && !isStaff()) return next("/status");
  if (to.meta?.title) document.title = String(to.meta.title);
  next();
});

export default router;
