import axios, { type AxiosResponse } from "axios";
import { computed, ref } from "vue";
import { z } from "zod";
import { defineModule } from "../common/module";
import { settings } from "./settings";
import { fetchWebpageTitleSchema__Params, fetchWebpageTitleSchema__Result, loginSchema__Params, loginSchema__Result } from "@/common/schema";
import { RESP_CODES } from "@/common/constants";

export const backendApi = defineModule("backendApi", { settings } as const, ({ settings }) => {
  const token = ref("");

  const api = computed(() => {
    if (!settings?.serverUrl?.value) return null;
    console.log(`http://${settings.serverUrl.value}`);
    return axios.create({
      baseURL: `http://${settings.serverUrl.value}`,
      timeout: 10000,
      headers: {
        Authorization: token.value,
      },
    });
  });

  function _createApi<PARAMS_SCHEMA extends z.ZodType, RESULT_SCHEMA extends z.ZodType>(
    name: string,
    paramsSchema: PARAMS_SCHEMA,
    resultSchema: RESULT_SCHEMA,
    resGetter: (
      params: z.infer<PARAMS_SCHEMA>,
    ) => Promise<AxiosResponse<unknown> | undefined | null> | undefined | null,
    sideEffect?: (result: z.infer<RESULT_SCHEMA>) => Promise<void> | void,
  ) {
    return async (params: z.infer<PARAMS_SCHEMA>) => {
      try {
        const res = await resGetter(params);
        if (!res) {
          console.error("NO RESPONSE", name);
          return { code: RESP_CODES.UNKNOWN_ERROR, data: undefined };
        }

        const resSchema = z.object({
          code: z.number(),
          data: resultSchema.optional(),
        });
        const result = resSchema.safeParse(res.data);

        if (!result.success) {
          if (import.meta.env.DEV) {
            console.error("VALIDATION ERROR", name, res.data, result.error.errors);
          }
          throw new Error("VALIDATION ERROR");
        }

        if (sideEffect) {
          await sideEffect(result.data.data);
        }

        return result.data;
      } catch (error) {
        console.error("UNKNOWN ERROR", name, error);
        return { code: RESP_CODES.UNKNOWN_ERROR, data: undefined };
      }
    };
  }

  const login = _createApi(
    "login",
    loginSchema__Params,
    loginSchema__Result,
    (params) => api.value?.post("/auth", params),
    // set token after login
    (result) => {
      token.value = result.token ?? "";
    },
  );

  const fetchWebpageTitle = _createApi(
    "fetchWebpageTitle",
    fetchWebpageTitleSchema__Params,
    fetchWebpageTitleSchema__Result,
    (params) => api.value?.post("/fetchWebpageTitle", params),
  );

  return {
    token,
    login,
    fetchWebpageTitle,
  };
});
