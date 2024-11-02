// import { buildModules } from "@/common/module";
// import { axiosManager } from "@/modules/axiosManager";
// import { beforeAll } from "vitest"
// import { kbEditorLogin } from "@/common/api/auth";
// import fs from "fs";
// import path from "path";

// // XXX update need
// // create a env, with one user logined
// export const useLoginedEnv = () => {
//   let env: Awaited<ReturnType<typeof buildModules<{
//     settings: typeof settings;
//     axiosManager: typeof axiosManager;
//   }>>>;

//   beforeAll(async () => {
//     // 读取配置文件    
//     const configPath = path.resolve("@/../config.json");
//     const configContent = fs.readFileSync(configPath, 'utf8');
//     const config = JSON.parse(configContent);
//     const { serverUrl, location, password } = config.test;

//     env = await buildModules({ settings, axiosManager });
//     env.settings.serverUrl.value = serverUrl;
//     env.settings.location.value = location;
//     const resp = await kbEditorLogin({ location, password });
//     if (!resp.success) throw new Error("login failed");
//     const token = resp.data!.token;
//     if (token) env.axiosManager.token.value = token;

//   });

//   return () => env;
// }

// // create a env, with one user logined, and ws connected
// export const useSingleUserEnv = () => {
  
// }