import { defineModule } from "@/common/module";
import { blocksManager, type AddOrUpdateBlockParams } from "./blocksManager";
import type { BlockContent, BlockId, LoadedBlock } from "@/common/types";
import { nanoid } from "nanoid";

export type BlockPos = BlockPosSiblingOffset | NonNormalizedBlockPosParentChild;

export type BlockPosParentChild = {
  parentId: BlockId;
  childIndex: number;
};

export type NonNormalizedBlockPosParentChild = {
  parentId: BlockId;
  childIndex: number | "first" | "last" | "last-space";
};

export type BlockPosSiblingOffset = {
  baseBlockId: BlockId;
  offset: number;
};

export const blockEditor = defineModule("blockEditor", { blocksManager }, ({ blocksManager }) => {
  const getCtext = (content: BlockContent) => {
    return ""; // TODO
  };

  const getOlinks = (content: BlockContent) => {
    return []; // TODO
  };

  const getBoosting = (content: BlockContent) => {
    return 0; // TODO
  };

  const normalizePos = (pos: BlockPos) => {
    if ("parentId" in pos) {
      // BlockPosParentChild or NonNormalizedBlockPosParentChild
      // handle 'first', 'last' and 'last-space'
      if (typeof pos.childIndex == "string") {
        const parentBlock = blocksManager.getBlock(pos.parentId);
        if (!parentBlock) return null;
        return {
          parentId: pos.parentId,
          childIndex:
            pos.childIndex == "first"
              ? 0
              : pos.childIndex == "last"
              ? parentBlock.childrenIds.length - 1
              : parentBlock.childrenIds.length,
        } as BlockPosParentChild;
      } else {
        return pos as BlockPosParentChild;
      }
    } else {
      // BlockPosSiblingOffset
      const baseBlock = blocksManager.getBlock(pos.baseBlockId);
      if (!baseBlock || baseBlock.id == "root") return;
      const parentBlock = baseBlock.parentRef.value;
      if (!parentBlock) return null;
      const index = parentBlock.childrenIds.indexOf(pos.baseBlockId);
      return {
        parentId: parentBlock.id,
        childIndex: Math.min(
          parentBlock.childrenIds.length,
          Math.max(0, index + pos.offset),
        ),
      } as BlockPosParentChild;
    }
  };

  const changeBlockContent = (blockId: BlockId, content: BlockContent) => {
    const block = blocksManager.getBlock(blockId);
    if (!block) return;
    const occurs = blocksManager.getOccurs(block.acturalSrc);
    const ctext = getCtext(content);
    const olinks = getOlinks(content);
    const boosting = getBoosting(content);
    for (const occur of occurs) {
      const occurBlock = blocksManager.getBlock(occur);
      if (!occurBlock) continue;
      occurBlock.content = content;
      occurBlock.ctext = ctext;
      occurBlock.olinks = olinks;
      occurBlock.boosting = boosting;
      blocksManager.updateBlock(occurBlock);
    }
  };

  const insertNormalBlock = (_pos: BlockPos, content: BlockContent, meta?: Record<string, any>) => {
    let focusNext;
    const pos = normalizePos(_pos);
    if (!pos) return;
    const { parentId, childIndex } = pos;
    const parentBlock = blocksManager.getBlock(pos.parentId);
    if (!parentBlock) return;

    const parentSrcBlock =
      parentBlock.type == "normalBlock"
        ? parentBlock
        : blocksManager.getBlock(parentBlock.acturalSrc);
    if (!parentSrcBlock) return;

    const tr = blocksManager.createBlockTransaction();
    const id = nanoid();
    tr.addBlock({
      id,
      type: "normalBlock",
      parentId,
      childrenIds: [],
      fold: true,
      content,
      metadata: meta ?? {},
    });

    if (parentId == parentSrcBlock.id) {
      if (parentSrcBlock.fold) {
        parentSrcBlock.fold = false;
      }
      focusNext = id;
    }
    parentSrcBlock.childrenIds.splice(childIndex, 0, id);
    tr.updateBlock(parentSrcBlock);

    const parentOccues = blocksManager.getOccurs(parentSrcBlock.acturalSrc, false);
    for (const occur of parentOccues) {
      const occurBlock = blocksManager.getBlock(occur);
      if (!occurBlock) continue;
      if (occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated) continue;
      const newId = nanoid();
      tr.addBlock({
        id: newId,
        type: "virtualBlock",
        childrenIds: [],
        fold: true,
        parentId: occurBlock.id,
        src: id,
        childrenCreated: true,
      });

      if (occur == parentId) {
        if (occurBlock.fold) {
          occurBlock.fold = false;
        }
        focusNext = newId;
      }

      occurBlock.childrenIds.splice(childIndex, 0, newId);
      tr.updateBlock(occurBlock);
    }

    tr.commit();
    return { focusNext, newNormalBlockId: id };
  };

  const deleteBlock = (blockId: BlockId) => {
    const block = blocksManager.getBlock(blockId);
    if (!block) return;
    const blocksToDelete: LoadedBlock[] = [];

    const _deleteBlock = (block: LoadedBlock) => {
      // 1. 删除一个普通块，其所有后代及其镜像块和虚拟块都会删除
      // 2. 删除一个虚拟块，其来源块的所有后代及其镜像块和虚拟块都会删除
      if (block.type == "normalBlock" || block.type == "virtualBlock") {
        const occurs = blocksManager.getOccurs(block.acturalSrc, true);
        const occurBlocks = occurs
          .map((id) => blocksManager.getBlock(id))
          .filter((b) => b != null);
        blocksToDelete.push(...occurBlocks);
        for (const occurBlock of occurBlocks) {
          for (const child of occurBlock.childrenIds) {
            const childBlock = blocksManager.getBlock(child);
            if (!childBlock) continue;
            _deleteBlock(childBlock); // 递归删除
          }
        }
      } else if (block.type == "mirrorBlock") {
        // 3. 删除一个镜像块，其所有后代都会删除，但不会影响其来源块
        blocksToDelete.push(block);
        for (const child of block.childrenIds) {
          const childBlock = blocksManager.getBlock(child);
          if (!childBlock) continue;
          _deleteBlock(childBlock); // 递归删除
        }
      }
    };

    _deleteBlock(block);

    const tr = blocksManager.createBlockTransaction();
    for (const block of blocksToDelete)
      tr.deleteBlock(block.id);
    tr.commit();
  };

  return {
    normalizePos,
    changeBlockContent,
    insertNormalBlock,
    deleteBlock,
  };
});
