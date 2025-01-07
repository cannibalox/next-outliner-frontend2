<template>
  <Collapsible v-model:open="open">
    <CollapsibleTrigger as-child>
      <div
        :data-active="path === activeDirent?.path"
        @click="handleClickItem(dirent, path)"
        class="flex items-center px-2 py-1 my-0.5 cursor-default select-none hover:bg-muted rounded-sm text-sm data-[active=true]:bg-muted"
      >
        <ChevronDown
          v-if="dirent.isDirectory"
          class="size-4 mr-2 flex-shrink-0 transition-transform duration-50"
          :class="{ '-rotate-90': !open }"
        />
        <File v-else class="size-4 mr-2 flex-shrink-0" />
        <span class="whitespace-nowrap overflow-hidden text-ellipsis">{{ dirent.name }}</span>
      </div>
    </CollapsibleTrigger>
    <CollapsibleContent v-if="dirent.isDirectory" class="ml-6">
      <FileTreeItem
        v-for="subDirent in dirent.subDirents"
        :key="subDirent.name"
        :dirent="subDirent"
        :path="joinPathSegments([path, subDirent.name])"
      />
    </CollapsibleContent>
  </Collapsible>
</template>

<script setup lang="ts">
import type { Dirents } from "@/common/type-and-schemas/dirents";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ChevronDown, File, Folder } from "lucide-vue-next";
import { ref } from "vue";
import AttachmentsManagerContext from "@/context/attachmentsManager";
import { joinPathSegments } from "@/common/helper-functions/path";

defineProps<{
  dirent: Dirents[string];
  path: string;
}>();

const open = ref(false);
const { activeDirent } = AttachmentsManagerContext.useContext()!;

const handleClickItem = (dirent: Dirents[string], path: string) => {
  activeDirent.value = {
    path,
    isDirectory: dirent.isDirectory,
    isPreview: false,
  };
};
</script>
