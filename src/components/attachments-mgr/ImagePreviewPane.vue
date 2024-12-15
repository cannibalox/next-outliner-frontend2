<template>
  <div v-if="image.status === 'fetching'" class="flex items-center">
    <Loader2 class="size-4 mr-2 animate-spin" />
    {{ $t("kbView.attachmentsManager.previewPane.fetchingImage") }}
  </div>
  <div v-else-if="image.status === 'synced'" class="flex flex-col items-center gap-y-4">
    <img :src="image.url" class="max-w-full max-h-full" />
    <div class="flex items-center gap-x-2">
      <Button variant="outline" size="sm" @click="$emit('close')">
        <X class="size-4 mr-2" />
        {{ $t("kbView.attachmentsManager.previewPane.closePreview") }}
      </Button>
      <Button variant="outline" size="sm" @click="$emit('insertImage')">
        <ImageIcon class="size-4 mr-2" />
        {{ $t("kbView.attachmentsManager.previewPane.insertImage") }}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="size-9 p-0">
            <MoreHorizontal class="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="$emit('download')">
            <Download class="size-4 mr-2" />
            {{ $t("kbView.attachmentsManager.previewPane.download") }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="$emit('reference')">
            <Link2 class="size-4 mr-2" />
            {{ $t("kbView.attachmentsManager.previewPane.reference") }}
          </DropdownMenuItem>
          <DropdownMenuItem class="!text-red-500" @click="$emit('delete')">
            <Trash2 class="size-4 mr-2" />
            {{ $t("kbView.attachmentsManager.previewPane.delete") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
  <div v-else-if="image.status === 'fetchError'">
    {{ $t("kbView.attachmentsManager.previewPane.fetchImageError") }}
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";
import { Button } from "@/components/ui/button";
import { Loader2, X, ImageIcon, MoreHorizontal, Download, Link2, Trash2 } from "lucide-vue-next";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import type { ImageState } from "@/context/images";

const props = defineProps<{
  image: ImageState;
}>();

const emit = defineEmits(["close", "insertImage", "download", "reference", "delete"]);
</script>
