import { createContext } from "@/utils/createContext";
import SettingsContext from "./settings";
import { useLocalStorage } from "@vueuse/core";
import useWritableComputedRef from "@/utils/useWritableComputedRef";
import type { BlockId } from "@/common/types";
import BlocksContext from "./blocks-provider/blocks";
import { z } from "zod";
import IndexContext from ".";

const BacklinksContext = createContext(() => {
  const { registerSettingGroup, registerSettingItem } = SettingsContext.useContext();
  const { blocksManager } = BlocksContext.useContext();
  const { backlinksIndex } = IndexContext.useContext();

  registerSettingGroup({
    key: "backlinks",
    label: {
      en: "Backlinks",
      zh: "反向链接",
    },
  });

  const showBacklinksCounterKey = "backlinks.showCounter";
  const showBacklinksCounterDefaultValue = true;
  const showBacklinksCounter = useLocalStorage(
    showBacklinksCounterKey,
    showBacklinksCounterDefaultValue,
  );
  registerSettingItem({
    id: showBacklinksCounterKey,
    groupKey: "backlinks",
    label: {
      zh: "块右侧显示反向链接个数",
    },
    desc: {
      zh: "如果开启，则如果一个块有反向链接，则会在块右侧以悬浮胶囊的形式显示反向链接个数",
    },
    defaultValue: showBacklinksCounterDefaultValue,
    value: useWritableComputedRef(showBacklinksCounter),
    componentType: {
      type: "switch",
    },
  });

  // 暂时没有考虑
  // - A
  //   - [[Alias]]
  //     - B
  //       - [[Alias]]
  //         - C
  // 这种阴间的情况
  const getAllAliases = (blockId: BlockId, includeSelf = true) => {
    const ret: BlockId[] = includeSelf ? [blockId] : [];
    const powerupCtx = getPowerupManagerContext();
    const powerupValues = powerupCtx?.getPowerupValues(blockId) ?? {};
    // 情况 1：
    // - this block
    //   - [[Alias]]
    //     - alias1
    //     - ...
    if ("Alias" in powerupValues) {
      const aliases = powerupValues.Alias;
      const res = z.array(z.string()).safeParse(aliases);
      if (res.success) {
        ret.push(...res.data);
      }
      return ret;
    }
    // 情况 2：
    // - parent block
    //   - [[Alias]]
    //     - this block
    {
      const block = blocksManager.getBlock(blockId);
      if (!block) return ret;
      const parentBlock = block.parentRef.value;
      const parentParentBlock = parentBlock?.parentRef.value;
      if (!parentParentBlock) return ret;
      const powerupValues = powerupCtx?.getPowerupValues(parentParentBlock.id) ?? {};
      if ("Alias" in powerupValues) {
        const aliases = powerupValues.Alias;
        const res = z.array(z.string()).safeParse(aliases);
        if (res.success) {
          ret.push(...res.data);
        }
        return ret;
      }
    }
    return ret;
  };

  const getBacklinks = (blockId: BlockId) => {
    const aliases = getAllAliases(blockId);
    const ret = new Set<BlockId>();
    for (const alias of aliases) {
      const blockIds = backlinksIndex.value[alias];
      for (const id of blockIds ?? []) {
        ret.add(id);
      }
    }
    return ret;
  };

  const ctx = {
    showBacklinksCounter,
    getAllAliases,
    getBacklinks,
  };
  globalThis.getBacklinksContext = () => ctx;
  return ctx;
});

export default BacklinksContext;
