import { createContext } from "@/utils/createContext";
import BlocksContext from "./blocks-provider/blocks";
import { ref, shallowRef } from "vue";
import type { BlockId } from "@/common/types";
import { useEventBus } from "@/plugins/eventbus";
import { plainTextToTextContent } from "@/utils/pm";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { Block } from "./blocks-provider/app-state-layer/blocksManager";
import { type Fragment, Node } from "prosemirror-model";
import { pmSchema } from "@/components/prosemirror/pmSchema";
import { z } from "zod";

const powerupValueTypeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("richtext") }),
  z.object({ type: z.literal("blockRef") }),
  z.object({
    type: z.literal("array"),
    itemType: z.enum(["richtext", "blockRef", "block"]),
  }),
]);

type PowerupValueType = z.infer<typeof powerupValueTypeSchema>;

const powerupBlockMetadataSchema = z.object({
  disabled: z.boolean().optional(),
  buildIndex: z.boolean().optional(),
  valueType: powerupValueTypeSchema,
});

type PowerupMetadata = z.infer<typeof powerupBlockMetadataSchema>;

type Eater<CTX> = (content: Fragment | null, ctx?: CTX) => Fragment | null;

////////////// Value Parser //////////////

// Powerup 是一类特殊的块，主要用法是作为属性键
//
// 比如：
// - 1984
//   - [[Author]]: [[George Orwell]]
//   - [[Year]]: 1949
//   - [[Tags]]
//     - [[Dystopia]]
//     - [[Fiction]]
// [[Author]], [[Year]], [[Tags]] 都是 powerup 块
//
// Powerup 块有唯一的 name，并且使用 name 作为 id 和块内容（文本块）
// 因此可以直接通过 blocksManager.getBlock("Author") 获取到 Author 这个 powerup 块
// 但是不推荐这样做，而是通过 powerupManager 提供的函数来访问和操作 powerup 块

const PowerupManagerContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext();
  // const eventBus = useEventBus();
  const allPowerupBlockNames = ref<Set<string> | null>(null);

  const initPowerupBlockNames = () => {
    if (allPowerupBlockNames.value) return;
    allPowerupBlockNames.value = new Set();
    for (const blockRef of blocksManager.loadedBlocks.values()) {
      const block = blockRef.value;
      if (block && block.type === "normalBlock" && "powerup" in block.metadata) {
        allPowerupBlockNames.value.add(block.id);
      }
    }
  };

  const isPowerupBlock = (blockId: BlockId) => {
    initPowerupBlockNames();
    return allPowerupBlockNames.value!.has(blockId);
  };

  ////////////////////////////// Parser /////////////////////////////////////

  const eatPowerupAndSeparator: Eater<{ powerupName: string }> = (content, ctx) => {
    if (!content) return null;
    let fst = content.firstChild;
    if (!fst || fst.type.name !== "blockRef_v2") return null;
    const powerupName = fst.attrs.toBlockId;
    if (!isPowerupBlock(powerupName)) return null;
    content = content.cut(fst.nodeSize);
    fst = content.firstChild;
    if (fst && fst.isText) {
      const text = fst.text;
      if (!text || (!text.startsWith(":") && !text.startsWith("："))) return null;
      content = content.cut(1);
    }
    ctx && (ctx.powerupName = powerupName);
    return content;
  };

  const eatWhitespace: Eater<{ cutSize: number }> = (content, ctx) => {
    if (!content) return null;
    let fst = content.firstChild;
    if (fst && fst.isText) {
      const text = fst.text;
      if (!text) return null;
      const leadingSpaceCount = text.search(/\S|$/);
      content = content.cut(leadingSpaceCount);
      ctx && (ctx.cutSize = leadingSpaceCount);
    }
    return content;
  };

  const eatBlockRef: Eater<{ toBlockId: string; tag: string }> = (content, ctx) => {
    if (!content) return null;
    let fst = content.firstChild;
    if (!fst || fst.type.name !== "blockRef_v2") return null;
    const { toBlockId, tag } = fst.attrs ?? {};
    content = content.cut(fst.nodeSize);
    ctx && (ctx.toBlockId = toBlockId);
    ctx && (ctx.tag = tag);
    return content;
  };

  /////////////////////////////////////////////////////////////////////

  const addPowerupBlock = (name: string, metadata: PowerupMetadata) => {
    const existed = blocksManager.getBlock(name);
    if (existed) {
      throw new Error(`Powerup block ${name} already exists`);
    }
    blocksManager.addBlock({
      id: name,
      type: "normalBlock",
      content: plainTextToTextContent(name),
      fold: true,
      parentId: "root",
      childrenIds: [],
      metadata: {
        powerup: metadata,
      },
    });
    initPowerupBlockNames();
    allPowerupBlockNames.value!.add(name);
  };

  const setPowerupBlockMetadata = (name: string, metadata: PowerupMetadata) => {
    const block = blocksManager.getBlock(name);
    if (!block || block.type !== "normalBlock") {
      throw new Error(`Powerup block ${name} not found`);
    }
    blocksManager.updateBlock({
      ...block,
      metadata,
    });
  };

  const getPowerupBlockMetadata = (name: string): PowerupMetadata | null => {
    const block = blocksManager.getBlock(name);
    if (!block || block.content[0] !== BLOCK_CONTENT_TYPES.TEXT) return null;
    const res = powerupBlockMetadataSchema.safeParse(block.metadata?.powerup);
    return res.success ? res.data : null;
  };

  const parsePowerupRecordBlock = (block: Block | null | undefined) => {
    if (!block || block.type !== "normalBlock" || block.content[0] !== BLOCK_CONTENT_TYPES.TEXT)
      return;

    let content: Fragment | null = null;
    try {
      content = Node.fromJSON(pmSchema, block.content[1]).content;
    } catch (e) {}
    if (!content) return;

    const ctx = {} as any;

    content = eatPowerupAndSeparator(content, ctx);
    if (!content || !ctx.powerupName || !isPowerupBlock(ctx.powerupName)) return;

    const metadata = getPowerupBlockMetadata(ctx.powerupName);
    if (!metadata) return;

    if (metadata.valueType.type === "richtext") {
      return { powerupName: ctx.powerupName, metadata, value: content };
    } else if (metadata.valueType.type === "blockRef") {
      const ctx = {} as any;
      content = eatPowerupAndSeparator(content);
      content = eatWhitespace(content);
      content = eatBlockRef(content, ctx);
      if (!content) return;
      return { powerupName: ctx.powerupName, metadata, value: ctx.toBlockId };
    } else {
      // array
      let arr: any[] = [];
      for (const childBlockRef of block.childrenRefs) {
        const childBlock = childBlockRef.value;
        if (
          !childBlock ||
          childBlock.type !== "normalBlock" ||
          childBlock.content[0] !== BLOCK_CONTENT_TYPES.TEXT
        )
          continue;

        let content: Fragment | null = null;
        try {
          content = Node.fromJSON(pmSchema, childBlock.content[1]).content;
        } catch (e) {}
        if (!content) return;

        if (metadata.valueType.itemType === "richtext") {
          arr.push(content);
        } else if (metadata.valueType.itemType === "blockRef") {
          const ctx = {} as any;
          content = eatWhitespace(content);
          content = eatBlockRef(content, ctx);
          if (!content) return;
          arr.push(ctx.toBlockId);
        } else if (metadata.valueType.itemType === "block") {
          arr.push(childBlock.id);
        }
      }
      return { powerupName: ctx.powerupName, metadata, value: arr };
    }
  };

  // e.g.
  // - 1984
  //   - [[Author]]: [[George Orwell]]
  //   - [[Year]]: 1949
  //   - [[Tags]]
  //     - [[Dystopia]]
  //     - [[Fiction]]
  // getPowerupValues("{{blockId of 1984}}") 会返回
  // {
  //   "Author": "George Orwell",
  //   "Year": "1949",
  //   "Tags": ["Dystopia", "Fiction"]
  // }
  const getPowerupValues = (blockId: BlockId) => {
    const block = blocksManager.getSrcBlock(blockId);
    if (!block) return null;

    const ret: Record<string, any> = {};
    for (const childBlockRef of block.childrenRefs) {
      const childBlock = childBlockRef.value;
      if (!childBlock) continue;
      const res = parsePowerupRecordBlock(childBlock);
      if (!res) continue;
      const { powerupName, metadata, value } = res;
      ret[powerupName] = value;
    }

    return ret;
  };

  const ctx = {
    addPowerupBlock,
    setPowerupBlockMetadata,
    getPowerupBlockMetadata,
    getPowerupValues,
  };
  globalThis.getPowerupManagerContext = () => ctx;
  return ctx;
});

export default PowerupManagerContext;
