<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex flex-row gap-0 max-w-[80vw] max-h-[80vh] w-[800px] h-[600px] p-0 !outline-none"
    >
      <DialogHeader class="hidden">
        <DialogTitle>
          {{ $t("kbView.settingsPanel.title") }}
        </DialogTitle>
      </DialogHeader>
      <div class="left w-[200px] bg-sidebar-bg border-r p-2 pr-1 flex flex-col text-sidebar-fg">
        <div class="text-sm text-muted-foreground font-semibold px-4 py-2">Settings</div>
        <div class="flex flex-col gap-1">
          <Button
            v-for="group in settingGroups"
            :key="group.key"
            variant="ghost"
            :data-active="group.key === activeGroupKey"
            class="w-full h-7 justify-start font-normal text-sidebar-fg data-[active=true]:bg-accent"
            @click="activeGroupKey = group.key"
          >
            {{ getTrans(group.label, locale) }}
          </Button>
        </div>
      </div>
      <div class="right w-0 flex flex-col items-center flex-grow pr-1">
        <div class="flex flex-col gap-y-6 w-full overflow-y-auto overflow-x-hidden px-4 py-8">
          <div
            class="flex flex-col"
            v-for="item in getAllSettingItemsInGroup(activeGroupKey)"
            :key="item.id"
          >
            <Label class="mb-2"> {{ getTrans(item.label, locale) }} </Label>
            <Label
              v-if="item.desc"
              class="text-[.8em] text-muted-foreground mb-2 whitespace-pre-wrap"
            >
              {{ getTrans(item.desc, locale) }}
            </Label>

            <TextInputComp v-if="item.componentType.type === 'textInput'" :item="item as any" />
            <IntegerInputComp
              v-else-if="item.componentType.type === 'integerInput'"
              :item="item as any"
            />
            <JsonComp v-else-if="item.componentType.type === 'json'" :item="item as any" />
            <KeybindingComp
              v-else-if="item.componentType.type === 'keybindingInput'"
              :item="item as any"
            />
            <SelectComp v-else-if="item.componentType.type === 'select'" :item="item as any" />
            <SwitchComp v-else-if="item.componentType.type === 'switch'" :item="item as any" />
            <FontSelector
              v-else-if="item.componentType.type === 'fontSelector'"
              :item="item as any"
            />
            <BlockIdInputComp
              v-else-if="item.componentType.type === 'blockIdInput'"
              :item="item as any"
            />
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import SettingsContext, { type SettingItem } from "@/context/settings";
import SettingsPanelContext from "@/context/settingsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useI18n } from "vue-i18n";
import getTrans from "@/utils/getTrans";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

import KeybindingInput from "../keybinding-input/KeybindingInput.vue";
import { RefreshCcw } from "lucide-vue-next";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import ResetButton from "./ResetButton.vue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import TextInputComp from "./TextInputComp.vue";
import IntegerInputComp from "./IntegerInputComp.vue";
import JsonComp from "./JsonComp.vue";
import KeybindingComp from "./KeybindingComp.vue";
import SelectComp from "./SelectComp.vue";
import SwitchComp from "./SwitchComp.vue";
import FontSelector from "./FontSelector.vue";
import BlockIdInputComp from "./BlockIdInputComp.vue";

const { locale } = useI18n();
const { open, activeGroupKey } = SettingsPanelContext.useContext();
const { settingGroups, getAllSettingItemsInGroup } = SettingsContext.useContext();
</script>
