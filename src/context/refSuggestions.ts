import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { createContext } from "@/utils/createContext";
import { computed, ref, type ShallowRef } from "vue";
import BlocksContext from "./blocks/blocks";
import { useDebounceFn } from "@vueuse/core";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { Block } from "./blocks/view-layer/blocksManager";
import IndexContext from ".";

type SuggestionItem = { type: "block"; block: ShallowRef<Block> } | { type: "createNew" };

const RefSuggestionsContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext()!;
  const { search } = IndexContext.useContext()!;
  const showPos = ref<{ x: number; y: number } | null>(null);
  const open = computed({
    get: () => showPos.value !== null,
    set: (val) => !val && (showPos.value = null),
  });
  const query = ref<string>("");
  const cb = ref<((blockId: BlockId | null, close: () => void) => void) | null>(null);
  const focusItemIndex = ref<number>(0);
  const suggestions = ref<SuggestionItem[]>([]);
  const allowCreateNew = ref(false); // 是否允许创建新块
  const suppressMouseOver = ref(false); // 是否抑制 mouseover 事件

  const updateSuggestions = useDebounceFn(() => {
    const newSuggestions: SuggestionItem[] = [];
    if (query.value && query.value.trim().length > 0) {
      const result = search(query.value);
      result
        .slice(0, 100)
        .map((id) => blocksManager.getBlockRef(id as string))
        // 只显示文本块
        .filter((blockRef) => {
          const block = blockRef.value;
          return block != null && block.content[0] === BLOCK_CONTENT_TYPES.TEXT;
        })
        .forEach((blockRef) => {
          newSuggestions.push({ type: "block", block: blockRef as ShallowRef<Block> });
        });
    }
    if (allowCreateNew.value && query.value.trim().length > 0) {
      newSuggestions.push({ type: "createNew" });
    }
    suggestions.value = newSuggestions;
    focusItemIndex.value = 0;
  }, 100);

  const withScrollSuppressed = (fn: () => boolean, timeout = 500) => {
    suppressMouseOver.value = true;
    setTimeout(() => (suppressMouseOver.value = false), timeout);
    return fn();
  };

  const openRefSuggestions = (
    _showPos: { x: number; y: number },
    _cb: (blockId: BlockId | null, close: () => void) => void,
    _initQuery?: string,
    _allowCreateNew = false,
  ) => {
    cb.value = _cb;
    query.value = _initQuery ?? "";
    suggestions.value = [];
    allowCreateNew.value = _allowCreateNew;
    updateSuggestions();
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
  return ctx;
});

export default RefSuggestionsContext;
