import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/login/kb-editor",
    },
    {
      path: "/login",
      component: () => import("@/views/login-view/LoginView.vue"),
      children: [
        {
          path: "kb-editor",
          component: () => import("@/views/login-view/KbEditorLoginView.vue"),
        },
        {
          path: "admin",
          component: () => import("@/views/login-view/AdminLoginView.vue"),
        },
      ],
    },
    {
      path: "/admin-dashboard/:serverUrl",
      component: () => import("@/views/admin-dashboard/AdminDashboard.vue"),
      beforeEnter: (to, from, next) => {
        const serverInfoContext = globalThis.getServerInfoContext();
        const tokenPayload = serverInfoContext?.tokenPayload?.value;
        const targetServerUrl = to.params.serverUrl as string;
        if (
          !tokenPayload ||
          tokenPayload.role !== "admin" ||
          tokenPayload.serverUrl !== targetServerUrl
        ) {
          serverInfoContext?.logout();
          next({ path: "/login/admin" });
        } else {
          next();
        }
      },
    },
    {
      path: "/kb/:serverUrl/:location/:rootBlockId?/:focusedBlockId?",
      component: () => import("../views/kb-view/KbView.vue"),
      beforeEnter: (to, from, next) => {
        const serverInfoContext = globalThis.getServerInfoContext();
        const tokenPayload = serverInfoContext?.tokenPayload?.value;
        const targetServerUrl = to.params.serverUrl as string;
        const targetLocation = to.params.location as string;
        // invalid or missing token
        if (
          !tokenPayload ||
          tokenPayload.role !== "kb-editor" ||
          tokenPayload.serverUrl !== targetServerUrl ||
          tokenPayload.location !== targetLocation
        ) {
          serverInfoContext?.logout();
          next({ path: "/login/kb-editor" });
        } else {
          next();
        }
      },
    },
  ],
});

export default router;
