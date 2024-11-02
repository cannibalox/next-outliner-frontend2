import { z } from "zod";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { AddBlockParams, BlocksManager } from "@/context/blocks-provider/blocksManager";

// v1 schema
const BlockContentSchema_v1 = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    docContent: z.any(),
  }),
  z.object({
    type: z.literal("image"),
    path: z.string(),
    uploadStatus: z.union([z.literal("notUploaded"), z.literal("uploading"), z.literal("uploaded")]),
    align: z.union([z.literal("left"), z.literal("center")]),
    caption: z.string().optional(),
    width: z.number().optional(),
  }),
  z.object({
    type: z.literal("code"),
    code: z.string(),
    lang: z.string().optional(),
  }),
  z.object({
    type: z.literal("mathDisplay"),
    src: z.string(),
  }),
]);

const NormalBlockSchema_v1 = z.object({
  id: z.string().uuid(),
  type: z.literal("normalBlock"),
  parent: z.union([z.string().uuid(), z.literal("null")]),
  childrenIds: z.array(z.string().uuid()),
  fold: z.boolean(),
  content: BlockContentSchema_v1,
  metadata: z.any(),
});

const MirrorBlockSchema_v1 = z.object({
  id: z.string().uuid(),
  type: z.literal("mirrorBlock"),
  parent: z.string().uuid(),
  childrenIds: z.array(z.string().uuid()),
  fold: z.boolean(),
  src: z.string().uuid(),
});

const VirtualBlockSchema_v1 = z.object({
  id: z.string().uuid(),
  type: z.literal("virtualBlock"),
  parent: z.string().uuid(),
  childrenIds: z.union([z.array(z.string().uuid()), z.literal("null")]),
  fold: z.boolean(),
  src: z.string().uuid(),
});

const BlockSchema_v1 = z.discriminatedUnion("type", [NormalBlockSchema_v1, MirrorBlockSchema_v1, VirtualBlockSchema_v1]);

const BackupSchema_v1 = z.object({
  blocks: z.array(BlockSchema_v1),
});

export const parseV1Backup = (text: string) => {
  const result = BackupSchema_v1.safeParse(JSON.parse(text));
  if (!result.success) {
    console.warn("Invalid backup", result.error);
    return null;
  }

  const fromV1Block = (v1Block: z.infer<typeof BlockSchema_v1>): AddBlockParams | null => {
    const params = {
      id: v1Block.id,
      type: v1Block.type,
      fold: v1Block.fold,
      parentId: v1Block.parent,
      childrenIds: v1Block.childrenIds == "null" ? [] : v1Block.childrenIds,
      ...(v1Block.type === "normalBlock" ? {content:
        v1Block.content.type === "text" ? [BLOCK_CONTENT_TYPES.TEXT, v1Block.content.docContent]
        : v1Block.content.type === "code" ? [BLOCK_CONTENT_TYPES.CODE, v1Block.content.code, v1Block.content.lang]
        : v1Block.content.type == "image" ? [
          BLOCK_CONTENT_TYPES.IMAGE, v1Block.content.path, v1Block.content.align, v1Block.content.caption, v1Block.content.width
        ]
        : v1Block.content.type == "mathDisplay" ? [
          BLOCK_CONTENT_TYPES.MATH, v1Block.content.src
        ] : undefined,
        metadata: v1Block.metadata} : {}),
      ...(v1Block.type === "mirrorBlock" ? {src: v1Block.src} : {}),
      ...(v1Block.type === "virtualBlock" ? {src: v1Block.src, childrenCreated: v1Block.childrenIds != "null"} : {}),
    } as AddBlockParams;
    return params;
  }

  const blocks = result.data.blocks.map(fromV1Block)
    .filter((b) => !!b);
  return blocks;
}
    
export const importBlocks = (blocks: AddBlockParams[], blocksManager: BlocksManager) => {
  const linkBlocks = [];
  const blockIds = new Set(blocks.map(block => block.id));
  const blocksToInsert = [];
  for (const block of blocks) {
    // 如果这个块的 parentId 不在 blocks 中
    // 说明这个块应该连接到现有的 block 下面 (目前直接放到 root 下面)
    if (!blockIds.has(block.parentId)) {
      block.parentId = "root";
      linkBlocks.push(block);
    }
    blocksToInsert.push(block);
  }

  console.log(linkBlocks);

  // if (linkBlocks.length > 0) {
  //   console.error("More than one candidate."); // TODO
  //   return;
  // }

  const tr = blocksManager.createBlockTransaction();
  blocksToInsert.reverse(); // 倒序插入
  for (const block of blocksToInsert) {
    tr.addBlock(block);
  }

  const rootBlock = blocksManager.getBlock("root");
  if (!rootBlock) {
    return;
  }
  tr.updateBlock({
    ...rootBlock,
    childrenIds: [...rootBlock.childrenIds, linkBlocks[0].id],
  });

  tr.commit();
}