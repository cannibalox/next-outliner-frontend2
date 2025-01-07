<template>
  <Card class="w-[400px]">
    <CardHeader>
      <CardTitle> {{ $t("login.adminLogin.title") }} </CardTitle>
      <CardDescription></CardDescription>
    </CardHeader>

    <CardContent>
      <div class="grid items-center w-full gap-4">
        <div class="flex flex-col space-y-3">
          <Label> {{ $t("login.adminLogin.serverUrlLabel") }} </Label>
          <Input v-model="serverUrl" :placeholder="$t('login.adminLogin.serverUrlPlaceholder')" />
        </div>

        <div class="flex flex-col space-y-2">
          <Label> {{ $t("login.adminLogin.passwordLabel") }} </Label>
          <Input v-model="password" type="password" />
        </div>
      </div>

      <div v-if="errMsg" class="text-red-500 flex items-center text-sm mt-2">
        <X class="size-4 mr-2" />
        {{ errMsg }}
      </div>
    </CardContent>

    <CardFooter class="flex justify-center gap-8">
      <router-link
        to="/login/kb-editor"
        class="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
      >
        {{ $t("login.adminLogin.kbEditorLoginBtn") }}
      </router-link>

      <Button class="min-w-[100px]" @click="login" :disabled="loginStatus === 'loggingIn'">
        <Loader2 v-if="loginStatus === 'loggingIn'" class="size-4 mr-2 animate-spin" />
        <Check v-else-if="loginStatus === 'loginSuccess'" class="size-4 mr-2" />
        <X v-else-if="loginStatus !== 'idle'" class="size-4 mr-2" />
        {{
          $t(`login.adminLogin.loginBtn.${loginStatus}`) ??
          $t("login.adminLogin.loginBtn.loginFailed")
        }}
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { z } from "zod";
import { X, Loader2, Check } from "lucide-vue-next";
import { adminLogin } from "@/common/api-call/auth";
import { RESP_CODES } from "@/common/constants";
import { timeout } from "@/utils/time";
import router from "@/router";
import ServerInfoContext from "@/context/serverInfo";

const { serverUrl, token } = ServerInfoContext.useContext()!;
const password = ref("");
const { t } = useI18n();
const loginStatus = ref<
  | "idle"
  | "loggingIn"
  | "loginSuccess"
  | "invalidServerUrl"
  | "cannotConnectToServer"
  | "invalidPassword"
  | "maxAttempts"
>("idle");
const errMsg = computed(() => {
  if (["idle", "loggingIn", "loginSuccess"].includes(loginStatus.value)) return null;
  return t(`login.adminLogin.errMsg.${loginStatus.value}`);
});

const login = async () => {
  loginStatus.value = "loggingIn";
  const url = serverUrl.value;
  // 验证 URL 格式
  const urlSchcema = z.string().url();
  const result = urlSchcema.safeParse(url);
  if (!result.success) {
    console.log("URL 格式不正确, err=", result.error);
    loginStatus.value = "invalidServerUrl";
    return;
  }
  const [resp] = await Promise.all([
    adminLogin({ serverUrl: url, password: password.value }),
    timeout(2000), // 等待至少两秒
  ]);
  if (resp.success) {
    loginStatus.value = "loginSuccess";
    token.value = resp.data.token;
    setTimeout(() => {
      // 2s 后跳转到 dashboard
      const p = encodeURIComponent(url);
      router.push(`/admin-dashboard/${p}`);
    }, 2000);
  }
  // error handling
  else if (resp.code === RESP_CODES.PASSWORD_INCORRECT) {
    loginStatus.value = "invalidPassword";
  } else if (resp.code === RESP_CODES.EXCEED_MAX_ATTEMPTS) {
    loginStatus.value = "maxAttempts";
  } else {
    loginStatus.value = "cannotConnectToServer";
  }
};
</script>
