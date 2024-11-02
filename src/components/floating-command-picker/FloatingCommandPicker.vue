<!-- <template>
  <Popover v-model:open="open">
    <PopoverTrigger> </PopoverTrigger>
    <PopoverContent
      class="floating-command-picker-content py-2 pb-0 px-1 max-h-[300px] max-w-[300px] overflow-hidden"
      trap-focus
      tabindex="-1"
      @keydown="handleKeydown"
    >
      
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Ref, type ShallowRef } from "vue";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import RefSuggestionsContext from "@/context/refSuggestions";
import type { BlockId } from "@/common/types";
import { nextTick } from "vue";
import { calcPopoverPos } from "@/utils/popover";
import { Input } from "../ui/input";
import { useDebounceFn } from "@vueuse/core";
import BlocksContext from "@/context/blocks-provider/blocks";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { Block } from "@/context/blocks-provider/blocksManager";
import TextContent from "../block-contents/TextContent.vue";
import { Search } from "lucide-vue-next";
import { generateKeydownHandlerSimple } from "@/context/keymap";
import { ScrollArea } from "../ui/scroll-area";
import { PopoutCommandPickerContext } from "@/context/popout-command-picker";

const { registerRefSuggestions } = RefSuggestionsContext.useContext();
const { fulltextSearch, blocksManager } = BlocksContext.useContext();
const { showPos, open, focusItemIndex, suggestions, suppressMouseOver } = PopoutCommandPickerContext.useContext();

watch(showPos, async () => {
  await nextTick();

  if (!showPos.value) {
    // 延迟 1s 移除样式，因为有淡出动画
    setTimeout(() => {
      document.body.style.removeProperty("--popover-x");
      document.body.style.removeProperty("--popover-y");
    }, 1000);
    return;
  }

  const el = document.querySelector("[data-radix-popper-content-wrapper]");
  if (!(el instanceof HTMLElement)) return;
  const { x, y } = showPos.value!;
  // const elRect = el.getBoundingClientRect();
  // 这里固定宽度，高度计算，因为候选变化会导致高度变化，如果每次候选变化都重新计算高度
  // 可能导致 popover 位置变化，体验不好
  const popoverPos = calcPopoverPos(300, 300, x, y, {
    // const popoverPos = calcPopoverPos(elRect.width, elRect.height, x, y, {
    // showPos 是行内元素右上角的位置
    // 为了防止遮挡当前行，如果是向下方弹出，应该向下偏移 30px
    offset: (pos) => {
      pos.leftDown.y += 30;
      pos.rightDown.y += 30;
      return pos;
    },
  });
  // 默认向右下弹出
  // 这里把弹出位置作为 CSS 变量绑定到 body 上
  // 因为 shadcn / radix 把 popover 的样式写死了
  // 只能这样去覆盖
  document.body.style.setProperty("--popover-x", `${popoverPos.rightDown.x}px`);
  document.body.style.setProperty("--popover-y", `${popoverPos.rightDown.y}px`);
});

const onInput = (e: any) => {
  if (e.isComposing) return;
  updateSuggestions();
};

const onCompositionEnd = (e: any) => {
  updateSuggestions();
};

const withScrollSuppressed = (fn: () => boolean, timeout = 500) => {
  suppressMouseOver.value = true;
  setTimeout(() => (suppressMouseOver.value = false), timeout);
  return fn();
};

const ensureFocusedVisible = () => {
  setTimeout(() => {
    const el = document.body.querySelector(".ref-suggestions-content .focus");
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({ block: "nearest" });
  });
};

const handleKeydown = generateKeydownHandlerSimple({
  Escape: {
    run: () => {
      cb.value?.(null);
      return true;
    },
  },
  Enter: {
    run: () => {
      cb.value?.(suggestions.value[focusItemIndex.value]?.value?.id ?? null);
      return true;
    },
  },
  Backspace: {
    run: () => {
      if (query.value.length == 0) {
        showPos.value = null;
        cb.value?.(null);
        return true;
      }
      return false;
    },
  },
  ArrowUp: {
    run: () => {
      return withScrollSuppressed(() => {
        if (focusItemIndex.value > 0) {
          focusItemIndex.value--;
        } else {
          focusItemIndex.value = suggestions.value.length - 1;
        }
        ensureFocusedVisible();
        return true;
      });
    },
    preventDefault: true,
    stopPropagation: true,
  },
  ArrowDown: {
    run: () => {
      return withScrollSuppressed(() => {
        if (focusItemIndex.value < suggestions.value.length - 1) {
          focusItemIndex.value++;
        } else {
          focusItemIndex.value = 0;
        }
        ensureFocusedVisible();
        return true;
      });
    },
    preventDefault: true,
    stopPropagation: true,
  },
  Home: {
    run: () => {
      return withScrollSuppressed(() => {
        focusItemIndex.value = 0;
        ensureFocusedVisible();
        return true;
      });
    },
  },
  End: {
    run: () => {
      return withScrollSuppressed(() => {
        focusItemIndex.value = suggestions.value.length - 1;
        ensureFocusedVisible();
        return true;
      });
    },
  },
});

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

onMounted(() => {
  registerRefSuggestions({
    openRefSuggestions: (_showPos, _cb, _initQuery) => {
      cb.value = _cb;
      query.value = _initQuery ?? "";
      // updateSuggestions
      focusItemIndex.value = 0;
      showPos.value = _showPos;
    },
  });
});
</script>

<style lang="scss">
// 覆盖 radix-vue 的样式，这允许我们自己指定 popover 的位置
// 这里使用了 :has 选择器，保证不干扰其他 popover 的样式
[data-radix-popper-content-wrapper]:has(> .ref-suggestions-content) {
  transform: translate(var(--popover-x), var(--popover-y)) !important;
}
</style> -->
