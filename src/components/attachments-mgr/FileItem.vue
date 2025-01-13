<template>
  <div class="group w-full flex items-center h-8 px-2 hover:bg-muted rounded-sm overflow-hidden">
    <div v-if="!isDirectory" class="w-8 flex-shrink-0" />
    <Label :for="name" class="flex-1 flex items-center cursor-pointer min-w-0">
      <component :is="isDirectory ? Folder : File" class="size-4 mr-2 flex-shrink-0" />
      <span class="text-sm truncate flex-1">{{ name }}</span>
    </Label>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" class="size-8 p-0 opacity-0 group-hover:opacity-100">
          <MoreHorizontal class="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem v-if="!isDirectory">
          <Download class="size-4 mr-2" />
          {{ $t("kbView.attachmentsManager.actions.download") }}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil class="size-4 mr-2" />
          {{ $t("kbView.attachmentsManager.actions.rename") }}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy class="size-4 mr-2" />
          {{ $t("kbView.attachmentsManager.actions.copy") }}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Info class="size-4 mr-2" />
          {{ $t("kbView.attachmentsManager.actions.info") }}
        </DropdownMenuItem>
        <DropdownMenuItem class="!text-red-500">
          <Trash class="size-4 mr-2" />
          {{ $t("kbView.attachmentsManager.actions.delete") }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { File, Folder, MoreHorizontal, Pencil, Copy, Info, Trash, Download } from "lucide-vue-next";

defineProps<{
  name: string;
  isDirectory: boolean;
}>();
</script>
