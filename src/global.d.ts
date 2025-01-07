import type ServerInfoContext from "./context/serverInfo";

export declare global {
  var getAxios: () => AxiosInstance | undefined;
  var getServerInfoContext: () => ReturnType<typeof ServerInfoContext.useContext> | undefined;
}
