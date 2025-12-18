// src/router/index.js
import { createMemoryHistory, createWebHistory, createRouter } from "vue-router";

import Status from "@/views/StatusView.vue";
import Pilots from "@/views/PilotsView.vue";
import Events from "@/views/EventsView.vue";
import AdminGate from "@/views/admin/AdminGate.vue";
import AdminHome from "@/views/admin/AdminHome.vue";
import { isAdmin } from "@/utils/adminAuth";
import Config from "@/assets/info/general-config.json";

const DEFAULT_TITLE = Config.defaultTitle;

function safeRedirectPath(path) {
  if (typeof path !== "string") return "/admin";
  return path.startsWith("/") ? path : "/admin";
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
    name: "Operations Log",
    component: Events,
    props: true,
    meta: { title: `${DEFAULT_TITLE} OPERATIONS LOG` },
  },

  { path: "/admin/login", name: "Admin Login", component: AdminGate, meta: { title: `${DEFAULT_TITLE} ADMIN LOGIN`, public: true } },
  { path: "/admin", name: "Admin", component: AdminHome, meta: { title: `${DEFAULT_TITLE} ADMIN`, requiresAdmin: true } },

  { path: "/:pathMatch(.*)*", redirect: "/status" },
];

const router = createRouter({
  history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { left: 0, top: 0, behavior: "smooth" };
  },
});

router.beforeEach((to, _from, next) => {
  if (to.meta?.requiresAdmin && !isAdmin()) {
    return next({ path: "/admin/login", query: { redirect: to.fullPath } });
  }
  if (to.path === "/admin/login" && isAdmin()) {
    const target = safeRedirectPath(to.query?.redirect || "/admin");
    return next(target);
  }
  if (to.meta?.title) document.title = String(to.meta.title);
  next();
});

export default router;
