<template>
  <div
    class="w-[250px] bg-sidebar-bg border-r p-2 pr-1 flex flex-col justify-between text-sidebar-fg"
  >
    <!-- 当前路径 -->
    <Breadcrumb class="bg-sidebar-accent w-fit px-2 py-1.5 mr-1 mb-2 rounded overflow-hidden">
      <BreadcrumbList class="flex-nowrap w-fit gap-1 sm:gap-1 overflow-hidden">
        <template v-for="(segment, index) in [attachmentsFolderName, ...currentPathSegments]" :key="segment">
          <BreadcrumbItem
            class="cursor-pointer select-none hover:text-sidebar-fg transition-colors duration-50"
          >
            {{ segment }}
          </BreadcrumbItem>
          <BreadcrumbSeparator v-if="index !== currentPathSegments.length" class="size-3" />
        </template>
      </BreadcrumbList>
    </Breadcrumb>

    <!-- 当前路径下的所有文件 -->
    <div class="flex-1 overflow-auto pr-1 mb-2">
      <FileTreeItem
        v-for="dirent in currentFiles"
        :key="dirent.name"
        :dirent="dirent"
        :path="joinPathSegments([attachmentsBasePath, ...currentPathSegments, dirent.name])"
      />
      <div
        v-if="Object.keys(currentFiles).length === 0"
        class="text-center text-sm text-muted-foreground py-8"
      >
        {{ $t("kbView.attachmentsManager.noFiles") }}
      </div>
    </div>

    <!-- 上传按钮 -->
    <div class="mr-1">
      <Button variant="outline" class="w-full">
        <Upload class="size-4 mr-2" />
        {{ $t("kbView.attachmentsManager.upload") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-vue-next";
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

const { attachmentsFolderName, attachmentsBasePath, currentPathSegments, currentFiles } =
  AttachmentsManagerContext.useContext();
</script>
