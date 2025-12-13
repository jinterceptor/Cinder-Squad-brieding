import { createMemoryHistory, createWebHistory, createRouter } from "vue-router";

import Status from "@/views/StatusView.vue";
import Roster from "@/views/PilotsView.vue";
import Events from "@/views/EventsView.vue";
import Config from "@/assets/info/general-config.json";

const DEFAULT_TITLE = Config.defaultTitle;

const routes = [
  {
    path: "/",
    redirect: "/status",
  },
  {
    path: "/status",
    name: "Mission Status",
    component: Status,
    props: true,
    meta: { title: `${DEFAULT_TITLE} BRIEFING SYSTEM` },
  },
  {
    path: "/roster",
    name: "Roster",
    component: Roster,
    props: true,
    meta: { title: `${DEFAULT_TITLE} UNIT ROSTER` },
  },
  {
    path: "/events",
    name: "Operation Log",
    component: Events,
    props: true,
    meta: { title: `${DEFAULT_TITLE} OPERATION LOG` },
  },
];

const router = createRouter({
  history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: "smooth",
      };
    }
  },
});

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title}`;
  next();
});

export default router;
