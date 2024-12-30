<template>
  <div class="flex items-center gap-2">
    <AutoComplete>
      <AutoCompleteTrigger as-child>
        <AutoCompleteInput v-model="item.value.value" @input="handleInput"></AutoCompleteInput>
      </AutoCompleteTrigger>
      <AutoCompleteContent>
        <AutoCompleteNoResult v-if="blockSearchResult.length == 0">
          {{ $t("kbView.settingsPanel.noResult") }}
        </AutoCompleteNoResult>
        <AutoCompleteSuggestionItem
          v-for="item in blockSearchResult"
          :value="item.id"
          :key="item.id"
        >
          <BlockContent
            :key="item.id"
            :readonly="true"
            :block="item as unknown as Block"
            :highlight-terms="queryTerms"
          ></BlockContent>
        </AutoCompleteSuggestionItem>
      </AutoCompleteContent>
    </AutoComplete>
    <ResetButton :item="item" />
  </div>
  <div v-if="validationMsg" class="text-red-500 text-sm mt-2">
    {{ validationMsg }}
  </div>
</template>

<script setup lang="ts">
import IndexContext from "@/context";
import BlocksContext from "@/context/blocks/blocks";
import type { Block } from "@/context/blocks/view-layer/blocksManager";
import type { SettingItem } from "@/context/settings";
import { cjkNgramTokenize } from "@/utils/tokenize";
import { useDebounceFn } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import BlockContent from "../block-contents/BlockContent.vue";
import {
  AutoComplete,
  AutoCompleteContent,
  AutoCompleteInput,
  AutoCompleteNoResult,
  AutoCompleteSuggestionItem,
  AutoCompleteTrigger,
} from "../ui/autocomplete";
import ResetButton from "./ResetButton.vue";

const props = defineProps<{
  item: SettingItem<string, "blockIdInput">;
}>();

const { blocksManager } = BlocksContext.useContext();
const { search } = IndexContext.useContext();

const { t } = useI18n();
const blockSearchResult = ref<Block[]>([]);
const queryTerms = computed(() => {
  const inputText = props.item.value.value;
  if (inputText.length == 0) return [];
  return cjkNgramTokenize(inputText, false, 1) ?? [];
});
const focusIndex = ref(-1); // -1: 没有选中项
const allowedBlockTypes = ref<boolean[]>([true, false, false, false, false]); // 默认只允许文本块
const validationMsg = computed(() => {
  const inputText = props.item.value.value;
  if (inputText.trim().length !== 0 && blocksManager.getBlock(inputText.trim())) return undefined;
  return t("kbView.settingsPanel.invalidBlockId");
});

const updateBlockSearchResult = () => {
  const inputText = props.item.value.value;
  if (inputText.trim().length === 0) {
    blockSearchResult.value = [];
    return;
  }
  blockSearchResult.value = search(inputText)
    .map((r) => blocksManager.getBlock(r.id))
    .filter((b): b is Block => b !== null)
    .filter((b) => b.type == "normalBlock" && allowedBlockTypes.value[b.content[0]]);
  focusIndex.value = blockSearchResult.value.length > 0 ? 0 : -1;
};

const handleInput = useDebounceFn((e: any) => {
  if (e.isComposing) return;
  updateBlockSearchResult();
}, 500);
</script>
