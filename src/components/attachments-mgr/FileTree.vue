<template>
  <div
    :class="[
      'w-[250px] bg-sidebar-bg border-r p-2 pr-1 flex flex-col justify-between text-sidebar-fg',
      { 'opacity-50': status === 'loading' },
    ]"
  >
    <!-- 当前路径 -->
    <Breadcrumb class="bg-sidebar-accent w-fit px-2 py-1.5 mr-1 mb-2 rounded overflow-hidden">
      <BreadcrumbList class="flex-nowrap w-fit gap-1 sm:gap-1 overflow-hidden">
        <template
          v-for="(segment, index) in [attachmentsFolderName, ...currentPathSegments]"
          :key="segment"
        >
          <BreadcrumbItem
            class="cursor-pointer select-none hover:text-sidebar-fg transition-colors duration-50"
          >
            {{ segment }}
          </BreadcrumbItem>
          <BreadcrumbSeparator v-if="index !== currentPathSegments.length" class="size-3" />
        </template>
      </BreadcrumbList>
    </Breadcrumb>

    <!-- 刷新状态图标 -->
    <div
      v-if="status !== 'idle'"
      class="flex justify-center items-center mb-2 text-muted-foreground"
    >
      <template v-if="status === 'loading'">
        <Loader2 class="size-4 animate-spin mr-2" />
        {{ $t("kbView.attachmentsManager.refreshing") }}
      </template>
      <template v-else-if="status === 'updated'">
        <Check class="size-4 mr-2" />
        {{ $t("kbView.attachmentsManager.refreshed") }}
      </template>
    </div>

    <!-- 当前路径下的所有文件 -->
    <div class="flex-1 overflow-auto pr-1 mb-2">
      <FileTreeItem
        v-for="dirent in orderedFiles"
        :key="dirent.name"
        :dirent="dirent"
        :path="joinPathSegments([attachmentsBasePath, ...currentPathSegments, dirent.name])"
      />
      <div
        v-if="Object.keys(orderedFiles).length === 0"
        class="text-center text-sm text-muted-foreground py-8"
      >
        {{ $t("kbView.attachmentsManager.noFiles") }}
      </div>
    </div>

    <!-- 上传按钮 -->
    <div class="mr-1 flex gap-x-1">
      <Button variant="outline" class="size-9 flex-shrink-0 p-0" @click="handleRefetchFiles">
        <RefreshCw class="size-4" />
      </Button>
      <Button variant="outline" size="sm" class="w-full">
        <Upload class="size-4 mr-2" />
        {{ $t("kbView.attachmentsManager.upload") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw, Loader2, Check } from "lucide-vue-next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { joinPathSegments } from "@/common/path";
import AttachmentsManagerContext from "@/context/attachmentsManager";
import { getPathSegments } from "@/common/path";
import FileTreeItem from "./FileTreeItem.vue";
import { timeout } from "@/utils/time";

const {
  attachmentsFolderName,
  attachmentsBasePath,
  currentPathSegments,
  orderedFiles,
  refetchFiles,
} = AttachmentsManagerContext.useContext();

// Define a union type for the status
type Status = "idle" | "loading" | "updated";

const status = ref<Status>("idle");

async function handleRefetchFiles() {
  status.value = "loading";
  await Promise.all([refetchFiles(), timeout(1000)]);
  status.value = "updated";
  await timeout(1000);
  status.value = "idle";
}
</script>
