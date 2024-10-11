import { BlockContentSchema, BlockIdSchema, BlockStatusSchema } from "@/common/types";
import { z } from "zod";

export const BlockInfoSchema = z.tuple([
  // status
  BlockStatusSchema,
  // parent id
  BlockIdSchema,
  // children ids
  z.array(BlockIdSchema),
  // doc id
  z.number(),
  // src
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