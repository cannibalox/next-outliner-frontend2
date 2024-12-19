<template>
  <div
    class="block-item flex items-center ml-6 mt-10 mb-2 text-muted-foreground"
    data-item-type="backlink-header"
  >
    <Link class="size-4 mr-2" />
    <div>{{ $t("kbView.backlinksPanel.nBacklinks", { count: backlinks.length }) }}</div>
  </div>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/types";
import { Link } from "lucide-vue-next";

const props = defineProps<{
  blockId: BlockId;
  backlinks: BlockId[];
}>();
</script>
