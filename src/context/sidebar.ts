import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { createContext } from "@/utils/createContext";
import useLocalStorage2 from "@/utils/useLocalStorage";
import { computed, ref, watch } from "vue";
import BlocksContext from "./blocks/blocks";
import type { Block } from "./blocks/view-layer/blocksManager";
import ServerInfoContext from "./serverInfo";
import BlockTreeContext from "./blockTree";

export const SidebarContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext()!;
  const { kbPrefix } = ServerInfoContext.useContext()!;
  const { getBlockTree } = BlockTreeContext.useContext()!;

  const localStorageIds = {
    sidePaneOpen: "sidePaneOpen",
    sidePaneDir: "sidePaneDir",
    sidePaneWidth: "sidePaneWidth",
    sidePaneHeight: "sidePaneHeight",
    sidePaneBlockIds: "sidePaneBlockIds",
  };

  const localStorageKeys = {
    sidePaneOpen: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneOpen}`),
    sidePaneDir: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneDir}`),
    sidePaneWidth: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneWidth}`),
    sidePaneHeight: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneHeight}`),
    sidePaneBlockIds: computed(() => `${kbPrefix.value}${localStorageIds.sidePaneBlockIds}`),
  };

  const sidePaneOpen = useLocalStorage2(localStorageKeys.sidePaneOpen, false);
  const sidePaneDir = useLocalStorage2(localStorageKeys.sidePaneDir, "right");
  const sidePaneWidth = useLocalStorage2(localStorageKeys.sidePaneWidth, 500);
  const sidePaneHeight = useLocalStorage2(localStorageKeys.sidePaneHeight, 300);
  const enableSidePaneAnimation = ref(true);
  const sidePaneBlockIds = useLocalStorage2(localStorageKeys.sidePaneBlockIds, <BlockId[]>[]);

  const sidePaneBlocks = computed(() => {
    return (sidePaneBlockIds.value as BlockId[])
      .map((id) => blocksManager.getBlock(id))
      .filter((b): b is Block => !!b);
  });

  const addToSidePane = (blockId: BlockId) => {
    if (!sidePaneOpen.value) sidePaneOpen.value = true;
    const exists = sidePaneBlockIds.value.includes(blockId);
    if (!exists) {
      sidePaneBlockIds.value = [...sidePaneBlockIds.value, blockId];
      setTimeout(() => {
        // 等待 dom 变动
        const tree = getBlockTree("side-pane");
        if (!tree) return;
        const di2 = tree.findDi((di) => di.type === "side-pane-header" && di.blockId === blockId);
        if (!di2) return;
        tree.focusDi(di2.itemId, { highlight: true, scrollIntoView: true });
      });
    } else {
      const tree = getBlockTree("side-pane");
      if (!tree) return;
      const di = tree.findDi((di) => di.type === "side-pane-header" && di.blockId === blockId);
      if (!di) return;
      tree.focusDi(di.itemId, { highlight: true, scrollIntoView: true });
    }
  };

  const focusNext = (blockId: BlockId) => {
    const tree = getBlockTree("side-pane");
    if (!tree) return;
    const selectedIndex = sidePaneBlockIds.value.indexOf(blockId);
    if (selectedIndex === -1) return;
    const nextIndex = selectedIndex === sidePaneBlockIds.value.length - 1 ? 0 : selectedIndex + 1;
    const nextId = sidePaneBlockIds.value[nextIndex];
    const nextItem = tree.findDi((di) => di.type === "basic-block" && di.block.id === nextId);
    if (!nextItem) return;
    tree.focusDi(nextItem.itemId, { highlight: true, scrollIntoView: true });
  };

  const focusPrev = (blockId: BlockId) => {
    const tree = getBlockTree("side-pane");
    if (!tree) return;
    const selectedIndex = sidePaneBlockIds.value.indexOf(blockId);
    if (selectedIndex === -1) return;
    const prevIndex = selectedIndex === 0 ? sidePaneBlockIds.value.length - 1 : selectedIndex - 1;
    const prevId = sidePaneBlockIds.value[prevIndex];
    const prevItem = tree.findDi((di) => di.type === "basic-block" && di.block.id === prevId);
    if (!prevItem) return;
    tree.focusDi(prevItem.itemId, { highlight: true, scrollIntoView: true });
  };

  return {
    sidePaneOpen,
    sidePaneDir,
    sidePaneWidth,
    sidePaneHeight,
    enableSidePaneAnimation,
    sidePaneBlockIds,
    sidePaneBlocks,
    addToSidePane,
    focusNext,
    focusPrev,
  };
});

export default SidebarContext;
