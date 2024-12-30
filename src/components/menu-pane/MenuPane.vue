<template>
  <Sheet v-model:open="menuPaneOpen">
    <!-- Hide close button -->
    <SheetContent side="left" class="flex flex-col gap-4 items-center [&>:last-child]:hidden">
      <!-- <Calendar class="w-fit" /> -->
      <Tabs defaultValue="favorite" class="w-full flex-grow h-full flex flex-col">
        <TabsList class="w-full">
          <TabsTrigger value="favorite" class="w-full">收藏</TabsTrigger>
          <TabsTrigger value="recent" class="w-full">最近</TabsTrigger>
        </TabsList>
        <TabsContent value="favorite" ref="favoriteTab" class="h-0 flex-grow pr-1 overflow-y-auto">
          <Button
            variant="ghost"
            v-for="block in favoriteBlocks"
            :key="block.id"
            class="menu-item w-full text-sm font-normal py-[6px] justify-start group/fi h-fit text-left text-clip overflow-x"
            @click="handleClickFavoriteBlock(block)"
          >
            <GripVertical class="stroke-muted-foreground -ml-2 size-4 mr-2" />
            <BlockContent :block="block" :block-tree="undefined" readonly />
            <X
              class="size-4 transition-[opacity,color] duration-200 text-muted-foreground hover:text-foreground ml-auto opacity-0 group-hover/fi:opacity-100"
              @click.stop="handleRemoveFavoriteBlock(block)"
            />
          </Button>
        </TabsContent>
        <TabsContent value="recent">最近</TabsContent>
      </Tabs>

      <div class="flex items-center justify-between border rounded-lg space-x-4 w-full p-4">
        <div class="flex items-center space-x-4">
          <Avatar>
            <!-- <AvatarImage :src="currKbInfo?.avatar" /> -->
            <AvatarFallback>{{ avatarFallback }}</AvatarFallback>
          </Avatar>
          <div>
            <p class="text-sm font-medium leading-none">{{ currKbInfo?.name }}</p>
            <p class="text-sm text-muted-foreground">{{ currKbInfo?.location }}</p>
          </div>
        </div>
        <Button variant="outline" size="icon">
          <LogOut class="size-4" />
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { Sheet, SheetContent } from "@/components/ui/sheet";
import MenubarContext from "@/context/menubar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import FavoriteContext from "@/context/favorite";
import { Button } from "../ui/button";
import BlockContent from "../block-contents/BlockContent.vue";
import { GripVertical, LogOut, X } from "lucide-vue-next";
import { Calendar } from "../ui/calendar";
import { useRouterParams } from "@/utils/routerParams";
import { KbInfoContext } from "@/context/kbinfo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { computed, ref } from "vue";
import type { Block } from "@/context/blocks/view-layer/blocksManager";

const { menuPaneOpen } = MenubarContext.useContext();
const { favoriteBlocks, favoriteBlockIds } = FavoriteContext.useContext();
const { currKbInfo, kbs } = KbInfoContext.useContext();

const favoriteTab = ref<HTMLElement | null>(null);

const avatarFallback = computed(() => {
  const name = currKbInfo.value?.name;
  return name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "";
});

const handleClickFavoriteBlock = (block: Block) => {
  const { getBlockTree } = globalThis.getBlockTreeContext() ?? {};
  if (!getBlockTree) return;
  const blockTree = getBlockTree("main");
  if (!blockTree) return;
  blockTree.focusBlock(block.id);
  menuPaneOpen.value = false;
};

const handleRemoveFavoriteBlock = (block: Block) => {
  favoriteBlockIds.value = favoriteBlockIds.value.filter((id) => id !== block.id);
};
</script>

<style lang="scss">
.menu-item .ProseMirror {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  cursor: pointer;
}
</style>
