import { computed, ComputedRef, ref, Ref } from "vue";
import { appState, ExposedSth, InitBy, State } from "./app";
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { settings } from "./settings";
import { defineModule } from "./registry";
import { z } from "zod";

/// Schemas
const loginSchema__Params = z.object({
  username: z.string(),
  password: z.string(),
});
const loginSchema__Result = z.object({
  token: z.string(),
});

export const backendApi = defineModule("backendApi", [settings], ({ settings }) => {
  const token = ref("");

  const api = computed(() => {
    if (!settings?.serverUrl.value) return null;
    return axios.create({
      baseURL: `http://${settings.serverUrl.value}`,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });
  });

  function _createApi<
    PARAMS_SCHEMA extends z.ZodType<any, any, any>,
    RESULT_SCHEMA extends z.ZodType<any, any, any>,
  >(
    name: string,
    paramsSchema: PARAMS_SCHEMA,
    resultSchema: RESULT_SCHEMA,
    resGetter: (params: z.infer<PARAMS_SCHEMA>) => Promise<AxiosResponse<unknown>> | undefined | null,
  ) {
    return async (params: z.infer<PARAMS_SCHEMA>) => {
      const res = await resGetter(params);
      if (!res) return { status: 500, data: null };
      const result = resultSchema.safeParse(res.data);

      if (!result.success) {
        if (import.meta.env.DEV) {
          console.error(name, res.data, result.error.errors);
        }
        throw new Error("Development Error");
      }

      return { status: res.status, data: result.data as z.infer<RESULT_SCHEMA> };
    };
  }

  const login = _createApi(
    "login",
    loginSchema__Params,
    loginSchema__Result,
    (params) => api.value?.post("/auth", params),
  );

  return {
    token,
    login,
  };
});

export class BackendApi
  implements ExposedSth<ReturnType<BackendApi["getExposed"]>>, InitBy<typeof appState>
{
  private _token: Ref<string> = ref("");
  private _axios?: ComputedRef<AxiosInstance | null>;

  getExposed() {
    return {
      token: this._token,
      post: this.post,
      get: this.get,
      login: this.login,
    };
  }

  init(state: State<typeof appState>) {
    const { serverUrl, location } = state.settingsManager;

    this._axios = computed(() => {
      if (serverUrl.value) {
        return axios.create({
          baseURL: `http://${serverUrl.value}`,
          timeout: 10000,
          headers: {
            Authorization: `Bearer ${this._token.value}`,
          },
        });
      } else return null;
    });
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    if (!this._axios?.value) return null;
    try {
      const resp = await this._axios.value.post(url, data, config);
      if ("error" in resp) {
        console.error(resp.error);
        return null;
      }
      return resp.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async get(url: string, config?: AxiosRequestConfig) {
    if (!this._axios?.value) return null;
    try {
      const resp = await this._axios.value.get(url, config);
      if ("error" in resp) {
        console.error(resp.error);
        return null;
      }
      return resp.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async login(password: string) {
    const newToken = (await this.post("/auth", { password }))?.token;
    if (newToken) this._token.value = newToken;
    else return;
    console.info("login success, token:", this._token.value);
  }
}
