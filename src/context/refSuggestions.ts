import type { BlockId } from "@/common/types";
import { createContext } from "@/utils/createContext";
import { computed, ref, type FunctionalComponent, type ShallowRef } from "vue";
import BlocksContext from "./blocks-provider/blocks";
import { useDebounceFn } from "@vueuse/core";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { Block } from "./blocks-provider/blocksManager";

const RefSuggestionsContext = createContext(() => {
  const { fulltextSearch, blocksManager } = BlocksContext.useContext();
  const showPos = ref<{ x: number; y: number } | null>(null);
  const open = computed({
    get: () => showPos.value !== null,
    set: (val) => !val && (showPos.value = null),
  });
  const query = ref<string>("");
  const cb = ref<((blockId: BlockId | null) => void) | null>(null);
  const focusItemIndex = ref<number>(0);
  const suggestions = ref<ShallowRef<Block>[]>([]);
  const suppressMouseOver = ref(false); // 是否抑制 mouseover 事件

  const updateSuggestions = useDebounceFn(() => {
    if (!query.value || query.value.trim().length == 0) {
      suggestions.value = [];
      return;
    }
    const result = fulltextSearch.search(query.value, { prefix: true });
    suggestions.value = result
      .slice(0, 100)
      .map((item) => blocksManager.getBlockRef(item.id))
      // 只显示文本块
      .filter((blockRef) => {
        const block = blockRef.value;
        return block != null && block.content[0] === BLOCK_CONTENT_TYPES.TEXT;
      }) as any;
    focusItemIndex.value = 0;
  }, 100);

  const withScrollSuppressed = (fn: () => boolean, timeout = 500) => {
    suppressMouseOver.value = true;
    setTimeout(() => (suppressMouseOver.value = false), timeout);
    return fn();
  };

  const openRefSuggestions = (_showPos: { x: number; y: number }, _cb: (blockId: BlockId | null) => void, _initQuery?: string) => {
    cb.value = _cb;
      query.value = _initQuery ?? "";
      // updateSuggestions
      focusItemIndex.value = 0;
      showPos.value = _showPos;
  };

  const ctx = {
    showPos,
    open,
    query,
    cb,
    focusItemIndex,
    suggestions,
    suppressMouseOver,
    updateSuggestions,
    withScrollSuppressed,
    openRefSuggestions,
  };

  // 注册到全局
  globalThis.getRefSuggestionsContext = () => ctx;

  return ctx;
});

export default RefSuggestionsContext;
