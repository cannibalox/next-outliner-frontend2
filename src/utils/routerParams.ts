import { computed } from "vue";
import { useRoute, useRouter } from "vue-router"
import { z } from "zod";

const paramsSchema = z.object({
  serverUrl: z.string().optional(),
  location: z.string().optional(),
  rootBLockId: z.string().optional(),
  focusedBlockId: z.string().optional(),
});

export const useRouterParams = () => {
  const route = useRoute();
  const router = useRouter();
  const params = computed({
    get: () => {
      const validationResult = paramsSchema.safeParse({
        serverUrl: route.params.serverUrl,
        location: route.params.location,
        rootBLockId: route.params.rootBLockId,
        focusedBlockId: route.params.focusedBlockId,
      });
      console.log("params.get", validationResult);
      if (!validationResult.success) {
        // todo
        return;
      }
      const { serverUrl, location, rootBLockId, focusedBlockId } = validationResult.data;
      return {
        serverUrl: serverUrl ? decodeURIComponent(serverUrl) : undefined,
        location: location ? decodeURIComponent(location) : undefined,
        rootBLockId: rootBLockId ? decodeURIComponent(rootBLockId) : undefined,
        focusedBlockId: focusedBlockId ? decodeURIComponent(focusedBlockId) : undefined,
      };
    },
    set: (val) => {
      const validationResult = paramsSchema.safeParse(val);
      if (!validationResult.success) {
        console.error("invalid router params", val);
        return;
      }
      const { serverUrl, location, rootBLockId, focusedBlockId } = validationResult.data;
      router.push({
        params: {
          serverUrl: serverUrl ? encodeURIComponent(serverUrl) : undefined,
          location: location ? encodeURIComponent(location) : undefined,
          rootBLockId: rootBLockId ? encodeURIComponent(rootBLockId) : undefined,
          focusedBlockId: focusedBlockId ? encodeURIComponent(focusedBlockId) : undefined,
        }
      })
    }
  });

  return params;
}