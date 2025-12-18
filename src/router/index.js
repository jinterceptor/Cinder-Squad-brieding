// src/router/index.js
import { createMemoryHistory, createWebHistory, createRouter } from "vue-router";

import Status from "@/views/StatusView.vue";
import Pilots from "@/views/PilotsView.vue";
import Events from "@/views/EventsView.vue";

import LoginView from "@/views/LoginView.vue";       // NEW home landing
import AdminGate from "@/views/admin/AdminGate.vue";
import AdminHome from "@/views/admin/AdminHome.vue";

import { isAdmin } from "@/utils/adminAuth";
import Config from "@/assets/info/general-config.json";

const DEFAULT_TITLE = Config.defaultTitle;

const routes = [
  // Landing with two big options
  {
    path: "/",
    name: "Access Portal",
    component: LoginView,
    meta: { title: `${DEFAULT_TITLE} ACCESS PORTAL`, public: true },
  },

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

  // Admin
  {
    path: "/admin/login",
    name: "Admin Login",
    component: AdminGate, // keep dedicated admin login if you still want it
    meta: { title: `${DEFAULT_TITLE} ADMIN LOGIN`, public: true },
  },
  {
    path: "/admin",
    name: "Admin",
    component: AdminHome,
    meta: { title: `${DEFAULT_TITLE} ADMIN`, requiresAdmin: true },
  },

  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: "smooth" };
  },
});

// Single guard: admin gate + title
router.beforeEach((to, _from, next) => {
  // Protect admin routes
  if (to.meta?.requiresAdmin && !isAdmin()) {
    return next({ path: "/admin/login", query: { redirect: to.fullPath } });
  }

  // If already authed, skip any login screens
  if ((to.path === "/" || to.path === "/admin/login") && isAdmin()) {
    return next({ path: "/admin" });
  }

  // Title
  if (to.meta?.title) document.title = String(to.meta.title);

  next();
});

export default router;
