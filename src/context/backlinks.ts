import { createContext } from "@/utils/createContext";
import SettingsContext from "./settings";
import { useLocalStorage } from "@vueuse/core";
import useWritableComputedRef from "@/utils/useWritableComputedRef";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import BlocksContext from "./blocks/blocks";
import { z } from "zod";
import IndexContext from ".";

const BacklinksContext = createContext(() => {
  const { registerSettingGroup, registerSettingItem } = SettingsContext.useContext();
  const { blocksManager } = BlocksContext.useContext();
  const { getBacklinks } = IndexContext.useContext();

  const blockIdValidator = (value: string) => {
    if (!value) return "没有指定块 ID";
    const block = blocksManager.getBlock(value);
    return block ? undefined : "无效的块 ID";
  };

  registerSettingGroup({
    key: "backlinks",
    label: {
      en: "Backlinks",
      zh: "块引用 & 反向链接",
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
      zh: "如果开启，则如果一个块有反向链接，则会在块右侧以悬浮胶囊的形式显示反向链接个数。点击即可打开一个悬浮窗口，用于浏览这个块的所有反向链接。",
    },
    defaultValue: showBacklinksCounterDefaultValue,
    value: useWritableComputedRef(showBacklinksCounter),
    componentType: {
      type: "switch",
    },
  });

  const putNewBlockAtKey = "backlinks.putNewBlockAt";
  const putNewBlockAtDefaultValue = "";
  const putNewBlockAt = useLocalStorage(putNewBlockAtKey, putNewBlockAtDefaultValue);
  registerSettingItem({
    id: putNewBlockAtKey,
    groupKey: "backlinks",
    label: {
      zh: "新块插入位置",
    },
    desc: {
      zh: "在引用补全菜单中，选择创建新块时新块插入的位置。如果不指定，默认会插入根块末尾。",
    },
    defaultValue: putNewBlockAtDefaultValue,
    value: useWritableComputedRef(putNewBlockAt),
    componentType: {
      type: "textInput",
      validator: blockIdValidator,
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
    const { getFieldValues } = getFieldsManagerContext()!;
    const fieldValues = getFieldValues(blockId) ?? {};
    // 情况 1：
    // - this block
    //   - [[Alias]]
    //     - alias1
    //     - ...
    if ("Alias" in fieldValues) {
      const aliases = fieldValues.Alias;
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
      const fieldValues = getFieldValues(parentParentBlock.id) ?? {};
      if ("Alias" in fieldValues) {
        const aliases = fieldValues.Alias;
        const res = z.array(z.string()).safeParse(aliases);
        if (res.success) {
          ret.push(...res.data);
        }
        return ret;
      }
    }
    return ret;
  };

  const getBacklinksConsideringAliases = (
    blockId: BlockId,
    type: "blockRef" | "tag" | "both" = "both",
  ) => {
    const aliases = getAllAliases(blockId);
    const ret = new Set<BlockId>();
    for (const alias of aliases) {
      const blockIds = getBacklinks(alias, type);
      for (const id of blockIds ?? []) {
        ret.add(id);
      }
    }
    return ret;
  };

  const ctx = {
    showBacklinksCounter,
    getAllAliases,
    getBacklinksConsideringAliases,
  };
  globalThis.getBacklinksContext = () => ctx;
  return ctx;
});

export default BacklinksContext;
