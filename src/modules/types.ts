import { BlockContentSchema, BlockIdSchema, BlockStatusSchema } from "@/common/types";
import { z } from "zod";

export const BlockInfoSchema = z.tuple([
  // status 用一个整数记录这个块的类型和折叠状态
  BlockStatusSchema,
  // parent id
  BlockIdSchema,
  // children ids
  z.array(BlockIdSchema),
  // 这个 block 的数据所在的数据 doc 的名字
  // 如果是镜像块或虚拟块，这个值为 null
  z.number().nullable(),
  // 如果是普通块，这个值为 null
  // 如果是镜像块或虚拟块，指向源块的 id
  BlockIdSchema.nullable()
]);

export const BlockDataSchema = z.tuple([
  // content (only for normal blocks)
  BlockContentSchema.nullable(),
  // metadata
  z.record(z.any()),
]);

export type BlockInfo = z.infer<typeof BlockInfoSchema>;
export type BlockData = z.infer<typeof BlockDataSchema>;