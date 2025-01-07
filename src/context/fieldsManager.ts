import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { getPmSchema } from "@/components/prosemirror/pmSchema";
import { createContext } from "@/utils/createContext";
import { plainTextToTextContent } from "@/utils/pm";
import { type Fragment, Node } from "prosemirror-model";
import { ref } from "vue";
import { z } from "zod";
import BlocksContext from "./blocks/blocks";
import type { Block } from "./blocks/view-layer/blocksManager";

// Field 是一类特殊的块，用作属性键
//
// 比如：
// - 1984
//   - [[Author]]: [[George Orwell]]
//   - [[Year]]: 1949
//   - [[Tags]]
//     - [[Dystopia]]
//     - [[Fiction]]
// [[Author]], [[Year]], [[Tags]] 都是 field
// 可以使用 getFieldValues({{ blockId of 1984 }}) 获取到 1984 的属性值：
// {
//   "Author": "{{blockId of George Orwell}}",
//   "Year": "1949",
//   "Tags": ["{{blockId of Dystopia}}", "{{blockId of Fiction}}"]
// }

const fieldValueTypeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("richtext") }),
  z.object({ type: z.literal("blockRef") }),
  z.object({
    type: z.literal("array"),
    itemType: z.enum(["richtext", "blockRef", "block"]),
  }),
]);

type FieldValueType = z.infer<typeof fieldValueTypeSchema>;

const fieldMetadataSchema = z.object({
  buildIndex: z.boolean().optional(),
  valueType: fieldValueTypeSchema,
});

type FieldMetadataType = z.infer<typeof fieldMetadataSchema>;

type Eater<CTX> = (content: Fragment | null, ctx?: CTX) => Fragment | null;

const FieldsManagerContext = createContext(() => {
  const { blocksManager } = BlocksContext.useContext()!;
  // const eventBus = useEventBus();
  const allFieldNames = ref<Set<string> | null>(null);
  const schema = getPmSchema({ getBlockRef: blocksManager.getBlockRef });

  const initFieldNames = () => {
    if (allFieldNames.value) return;
    allFieldNames.value = new Set();
    for (const blockRef of blocksManager.loadedBlocks.values()) {
      const block = blockRef.value;
      if (block && block.type === "normalBlock" && "field" in block.metadata) {
        allFieldNames.value.add(block.id);
      }
    }
  };

  const isField = (blockId: BlockId) => {
    initFieldNames();
    return allFieldNames.value!.has(blockId);
  };

  ////////////////////////////// Parser /////////////////////////////////////

  const eatFieldAndSeparator: Eater<{ fieldName: string }> = (content, ctx) => {
    if (!content) return null;
    let fst = content.firstChild;
    if (!fst || fst.type.name !== "blockRef_v2") return null;
    const fieldName = fst.attrs.toBlockId;
    if (!isField(fieldName)) return null;
    content = content.cut(fst.nodeSize);
    fst = content.firstChild;
    if (fst && fst.isText) {
      const text = fst.text;
      if (!text || (!text.startsWith(":") && !text.startsWith("："))) return null;
      content = content.cut(1);
    }
    ctx && (ctx.fieldName = fieldName);
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

  const addField = (name: string, fieldMetadata: FieldMetadataType) => {
    const existed = blocksManager.getBlock(name);
    if (existed) {
      throw new Error(`Field ${name} already exists`);
    }
    const schema = getPmSchema({ getBlockRef: blocksManager.getBlockRef });
    blocksManager.addBlock(
      {
        id: name,
        type: "normalBlock",
        content: plainTextToTextContent(name, schema),
        fold: true,
        parentId: "root",
        childrenIds: [],
        metadata: {
          field: fieldMetadata,
        },
      },
      { type: "ui" },
    );
    initFieldNames();
    allFieldNames.value!.add(name);
  };

  const setFieldMetadata = (name: string, metadata: FieldMetadataType) => {
    const block = blocksManager.getBlock(name);
    if (!block || block.type !== "normalBlock") {
      throw new Error(`Field ${name} not found`);
    }
    blocksManager.updateBlock(
      {
        ...block,
        metadata,
      },
      { type: "ui" },
    );
  };

  const getFieldMetadata = (name: string): FieldMetadataType | null => {
    const block = blocksManager.getBlock(name);
    if (!block || block.content[0] !== BLOCK_CONTENT_TYPES.TEXT) return null;
    const res = fieldMetadataSchema.safeParse(block.metadata?.field);
    return res.success ? res.data : null;
  };

  const parseFieldValues = (block: Block | null | undefined) => {
    if (!block || block.type !== "normalBlock" || block.content[0] !== BLOCK_CONTENT_TYPES.TEXT)
      return;

    let content: Fragment | null = null;
    try {
      content = Node.fromJSON(schema, block.content[1]).content;
    } catch (e) {}
    if (!content) return;

    const ctx = {} as any;

    content = eatFieldAndSeparator(content, ctx);
    if (!content || !ctx.fieldName || !isField(ctx.fieldName)) return;

    const metadata = getFieldMetadata(ctx.fieldName);
    if (!metadata) return;

    if (metadata.valueType.type === "richtext") {
      return { fieldName: ctx.fieldName, metadata, value: content };
    } else if (metadata.valueType.type === "blockRef") {
      const ctx = {} as any;
      content = eatFieldAndSeparator(content);
      content = eatWhitespace(content);
      content = eatBlockRef(content, ctx);
      if (!content) return;
      return { fieldName: ctx.fieldName, metadata, value: ctx.toBlockId };
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
          content = Node.fromJSON(schema, childBlock.content[1]).content;
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
      return { fieldName: ctx.fieldName, metadata, value: arr };
    }
  };

  // e.g.
  // - 1984
  //   - [[Author]]: [[George Orwell]]
  //   - [[Year]]: 1949
  //   - [[Tags]]
  //     - [[Dystopia]]
  //     - [[Fiction]]
  // getFieldValues("{{blockId of 1984}}") 会返回
  // {
  //   "Author": "George Orwell",
  //   "Year": "1949",
  //   "Tags": ["Dystopia", "Fiction"]
  // }
  const getFieldValues = (blockId: BlockId) => {
    const block = blocksManager.getSrcBlock(blockId);
    if (!block) return null;

    const ret: Record<string, any> = {};
    for (const childBlockRef of block.childrenRefs) {
      const childBlock = childBlockRef.value;
      if (!childBlock) continue;
      const res = parseFieldValues(childBlock);
      if (!res) continue;
      const { fieldName, metadata, value } = res;
      ret[fieldName] = value;
    }

    return ret;
  };

  const ctx = {
    addField,
    setFieldMetadata,
    getFieldMetadata,
    getFieldValues,
  };
  return ctx;
});

export default FieldsManagerContext;
