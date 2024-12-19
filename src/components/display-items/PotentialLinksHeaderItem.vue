<template>
  <div
    class="block-item flex items-center ml-6 mt-10 text-muted-foreground mb-2"
    data-item-type="potential-links-header"
  >
    <Link class="size-4 mr-2" />
    <div>{{ $t("kbView.backlinksPanel.nPotentialLinks", { count: potentialLinks.length }) }}</div>
  </div>
</template>

<script setup lang="ts">
import type { BlockId } from "@/common/types";
import { Link } from "lucide-vue-next";

const props = defineProps<{
  blockId: BlockId;
  potentialLinks: BlockId[];
}>();
</script>
