import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
          tokenPayload.serverUrl !== targetServerUrl ||
          tokenPayload.location !== targetLocation
        ) {
          next({ path: "/login/kb-editor" });
        } else {
          next();
        }
      },
    },
  ],
});

export default router;
