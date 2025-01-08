<template>
  <Drawer v-model:open="openKeybindings">
    <DrawerTrigger>
      <slot />
    </DrawerTrigger>

    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{{ $t("kbView.keybindings.title") }}</DrawerTitle>
        <DrawerDescription>{{ $t("kbView.keybindings.description") }}</DrawerDescription>
      </DrawerHeader>

      <div class="p-4 space-y-4">
        <div v-for="(group, groupName) in keyBindings" :key="groupName" class="space-y-2">
          <h3 class="font-medium text-muted-foreground text-sm">{{ groupName }}</h3>
          <div class="space-y-1">
            <div
              v-for="(binding, index) in group"
              :key="index"
              class="flex justify-between items-center text-sm"
            >
              <span>{{ binding.description }}</span>
              <kbd class="px-2 py-1 bg-muted rounded">{{ binding.key }}</kbd>
            </div>
          </div>
        </div>
      </div>

      <DrawerFooter>
        <DrawerClose asChild>
          <Button variant="ghost"> {{ $t("kbView.keybindings.close") }} </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>

<script setup lang="ts">
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import KeymapContext from "@/context/keymap";
import { Button } from "../ui/button";
import { useI18n } from "vue-i18n";

const { openKeybindings } = KeymapContext.useContext()!;
const { t } = useI18n();

// 定义按键绑定数据
const keyBindings = {
  [t("kbView.keybindings.normal.groupName")]: [
    { key: "Alt/Option + ↑", description: t("kbView.keybindings.normal.swapUp") },
    { key: "Alt/Option + ↓", description: t("kbView.keybindings.normal.swapDown") },
    { key: "Command/Ctrl + ↓", description: t("kbView.keybindings.normal.expand") },
    { key: "Command/Ctrl + ↑", description: t("kbView.keybindings.normal.collapse") },
    { key: "Tab", description: t("kbView.keybindings.normal.indent") },
    { key: "Shift + Tab", description: t("kbView.keybindings.normal.outdent") },
    { key: "Command/Ctrl + m", description: t("kbView.keybindings.normal.insertInlineMath") },
    {
      key: "Command/Ctrl + Shift + m",
      description: t("kbView.keybindings.normal.insertBlockMath"),
    },
    { key: "Command/Ctrl + b", description: t("kbView.keybindings.normal.bold") },
    { key: "Command/Ctrl + i", description: t("kbView.keybindings.normal.italic") },
    { key: "Command/Ctrl + `", description: t("kbView.keybindings.normal.code") },
    { key: "Command/Ctrl + =", description: t("kbView.keybindings.normal.highlight") },
  ],
};
</script>
