<template>
  <Card class="w-[400px]">
    <CardHeader>
      <CardTitle> {{ $t("login.kbEditorLogin.title") }} </CardTitle>
      <CardDescription></CardDescription>
    </CardHeader>

    <CardContent>
      <div class="grid items-center w-full gap-4">
        <div class="flex flex-col space-y-3">
          <Label> {{ $t("login.kbEditorLogin.serverUrlLabel") }} </Label>
          <div class="relative">
            <Input
              v-model="serverUrl"
              :placeholder="$t('login.kbEditorLogin.serverUrlPlaceholder')"
              @input="testConn"
            />
            <div class="absolute right-3 top-3">
              <CircleCheck
                v-if="['connSuccess', 'noKbServer'].includes(serverStatus)"
                class="size-4 text-green-600"
              />
              <LoaderCircle
                v-else-if="serverStatus === 'connecting'"
                class="size-4 animate-spin text-gray-500"
              />
            </div>
          </div>
          <div
            v-if="
              serverUrl.length > 0 &&
              !['connSuccess', 'connecting', 'noKbServer'].includes(serverStatus)
            "
            class="flex items-center text-red-500 text-sm"
          >
            <X class="size-4 mr-2" />
            {{ $t(`login.kbEditorLogin.serverStatus.${serverStatus}`) }}
          </div>
          <span
            v-if="serverStatus === 'noKbServer'"
            class="text-blue-500 text-sm"
            v-html="$t('login.kbEditorLogin.noKbServerMsg')"
          >
          </span>
        </div>

        <div class="flex flex-col space-y-2">
          <Label> {{ $t("login.kbEditorLogin.kbLocationLabel") }} </Label>
          <div class="flex items-center gap-2">
            <Select
              :disabled="serverStatus !== 'connSuccess'"
              v-model:model-value="selectedKbLocation"
            >
              <SelectTrigger>
                {{ selectedKbLocation ? kbList[selectedKbLocation].name : "-" }}
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="kb in kbList" :key="kb.location" :value="kb.location">
                  <div>
                    {{ kb.name }}
                    <div class="text-xs text-gray-500">{{ kb.location }}</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              :disabled="serverStatus !== 'connSuccess'"
              @click="refreshKbList(true)"
              class="size-10 p-2"
              :tooltip="$t('login.kbEditorLogin.refreshKbListTooltip')"
            >
              <RefreshCcw class="size-4" />
            </Button>
          </div>
        </div>

        <div class="flex flex-col space-y-2">
          <Label> {{ $t("login.kbEditorLogin.passwordLabel") }} </Label>
          <Input
            v-model="password"
            type="password"
            :disabled="serverStatus !== 'connSuccess' || !selectedKbLocation"
            @input="loginStatus = 'idle'"
          />
          <div
            v-if="loginStatus === 'loginFailed_InvalidPassword' || loginStatus === 'loginFailed_Unknown'"
            class="text-red-500 text-sm flex items-center"
          >
            <X class="size-4 mr-2" />
            {{ $t(`login.kbEditorLogin.loginStatus.${loginStatus}`) }}
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter class="flex justify-center gap-8">
      <router-link
        to="/login/admin"
        class="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
      >
        {{ $t("login.kbEditorLogin.adminLoginBtn") }}
      </router-link>

      <Button
        class="min-w-[100px]"
        @click="login"
        :disabled="serverStatus !== 'connSuccess' || !selectedKbLocation"
      >
        <Loader2 v-if="loginStatus === 'loggingIn'" class="size-4 mr-2 animate-spin" />
        <Check v-else-if="loginStatus === 'loginSuccess'" class="size-4 mr-2" />
        {{ $t(`login.kbEditorLogin.loginBtn.${loginStatus}`) }}
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { kbEditorLogin } from "@/common/api/auth";
import { getAllKbInfo } from "@/common/api/kb";
import { ping } from "@/common/api/misc";
import { RESP_CODES } from "@/common/constants";
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AxiosContext from "@/context/axios";
import TokenContext from "@/context/token";
import router from "@/router";
import { useDebounceFn } from "@vueuse/core";
import { Check, X, CircleCheck, Loader2, LoaderCircle, RefreshCcw } from "lucide-vue-next";
import { ref } from "vue";
import { z } from "zod";

const { token } = TokenContext.useContext();
const { serverUrl } = AxiosContext.useContext();
const password = ref<string>("");
const selectedKbLocation = ref<string | undefined>(undefined);
const kbList = ref<Record<string, { name: string; location: string }>>({});
const serverStatus = ref<"invalidURL" | "connFailed" | "connecting" | "connSuccess" | "noKbServer">(
  "invalidURL",
);
const loginStatus = ref<
  "idle" | "loggingIn" | "loginSuccess" | "loginFailed_InvalidPassword" | "loginFailed_Unknown"
>("idle");
const { toast } = useToast();

const testConn = useDebounceFn(async () => {
  const url = serverUrl.value;
  // 验证 URL 格式
  const urlSchcema = z.string().url();
  const result = urlSchcema.safeParse(serverUrl.value);
  if (!result.success) {
    console.log("URL 格式不正确");
    serverStatus.value = "invalidURL";
    return;
  }
  // 测试连接
  serverStatus.value = "connecting";
  const resp = await ping({});
  if (url !== serverUrl.value) return; // 失序响应，丢弃
  if (resp.success) {
    serverStatus.value = "connSuccess";
    refreshKbList(); // 连接成功后更新知识库列表
  } else {
    serverStatus.value = "connFailed";
  }
});

const refreshKbList = async (showToast = false) => {
  const url = serverUrl.value;
  const resp = await getAllKbInfo({});
  if (url !== serverUrl.value) return; // 失序响应
  if (!resp.success) {
    serverStatus.value = "connFailed";
    return;
  }
  kbList.value = (resp.data ?? []).reduce(
    (acc, kb) => {
      acc[kb.location] = {
        name: kb.name,
        location: kb.location,
      };
      return acc;
    },
    {} as Record<string, { name: string; location: string }>,
  );
  // 默认选第一个
  if (Object.keys(kbList.value).length > 0) {
    selectedKbLocation.value = Object.keys(kbList.value)[0];
  } else {
    serverStatus.value = "noKbServer";
  }
  if (showToast) {
    toast({
      title: "刷新知识库列表成功",
      description: `服务器 ${serverUrl.value} 上有 ${resp.data?.length} 个知识库`,
    });
  }
};

const login = async () => {
  if (!selectedKbLocation.value) return;
  loginStatus.value = "loggingIn";
  const res = await kbEditorLogin({
    location: selectedKbLocation.value,
    password: password.value,
    serverUrl: serverUrl.value,
  });
  console.log(res);
  if (res.success) {
    loginStatus.value = "loginSuccess";
    token.value = res.data!.token;
    setTimeout(() => {
      const p1 = encodeURIComponent(serverUrl.value);
      const p2 = encodeURIComponent(selectedKbLocation.value!);
      router.push(`/kb/${p1}/${p2}`);
    }, 1000);
  } else {
    loginStatus.value =
      res.code === RESP_CODES.PASSWORD_INCORRECT
        ? "loginFailed_InvalidPassword"
        : "loginFailed_Unknown";
  }
};
</script>
