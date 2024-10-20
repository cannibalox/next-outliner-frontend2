import { defineModule } from "@/common/module";
import { blocksManager, type AddBlockParams } from "./blocksManager";
import type { BlockContent, BlockId, Block, MirrorBlock, NormalBlock, VirtualBlock } from "@/common/types";
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

  const normalizePos = (pos: BlockPos): BlockPosParentChild | null => {
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
      if (!baseBlock || baseBlock.id == "root") return null;
      const parentBlock = baseBlock.parentRef.value;
      if (!parentBlock) return null;
      const index = parentBlock.childrenIds.indexOf(pos.baseBlockId);
      return {
        parentId: parentBlock.id,
        childIndex: Math.min(parentBlock.childrenIds.length, Math.max(0, index + pos.offset)),
      } as BlockPosParentChild;
    }
  };

  const toggleFold = (blockId: BlockId, fold?: boolean) => {
    const block = blocksManager.getBlock(blockId);
    if (!block) return;

    fold ??= !block.fold;
    if (block.fold == fold) return;

    block.fold = fold;
    blocksManager.updateBlock(block);
  }

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

  const insertNormalBlock = (_pos: BlockPos, content: BlockContent, meta?: Record<string, any>, childrenIds: BlockId[] = []) => {
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
      childrenIds,
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
        childrenCreated: false,
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
    const blocksToDelete: Block[] = [];

    const _deleteBlock = (block: Block) => {
      // 1. 删除一个普通块，其所有后代及其镜像块和虚拟块都会删除
      // 2. 删除一个虚拟块，其来源块的所有后代及其镜像块和虚拟块都会删除
      if (block.type == "normalBlock" || block.type == "virtualBlock") {
        const occurs = blocksManager.getOccurs(block.acturalSrc, true);
        const occurBlocks = occurs.map((id) => blocksManager.getBlock(id)).filter((b) => b != null);
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
    for (const block of blocksToDelete) tr.deleteBlock(block.id);

    // 此外，还需将 blockId 从其父块的孩子中删除
    if (block.type == "normalBlock" || block.type == "virtualBlock") {
      const parentBlock = blocksManager.getBlock(block.parentId);
      if (!parentBlock) return;
      const index = parentBlock.childrenIds.indexOf(block.id);
      if (index < 0) return;
      const parentOccurs = blocksManager.getOccurs(parentBlock.acturalSrc, true);
      for (const occur of parentOccurs) {
        const occurBlock = blocksManager.getBlock(occur);
        if (!occurBlock) continue;
        occurBlock.childrenIds.splice(index, 1);
        tr.updateBlock(occurBlock);
      }
    } else {
      const parentBlock = blocksManager.getBlock(block.parentId);
      if (!parentBlock) return;
      const index = parentBlock.childrenIds.indexOf(block.id);
      if (index < 0) return;
      parentBlock.childrenIds.splice(index, 1);
      tr.updateBlock(parentBlock);
    }

    tr.commit();
  };

  const promoteBlock = (blockId: BlockId) => {
    let focusNext;
    const tr = blocksManager.createBlockTransaction();
    
    const block = blocksManager.getBlock(blockId);
    if (!block) return;
    if (block.id == "root") return; // cannot promote root block
    const srcBlock = blocksManager.getBlock(block.acturalSrc);
    if (!srcBlock) return;

    const parentBlock = block.parentRef.value;
    if (!parentBlock) return;
    // note: srcBlock's parent must be normal block
    const parentSrcBlock = blocksManager.getBlock(parentBlock.acturalSrc);
    if (!parentSrcBlock) return;

    // locate block to promote in its parent block's childrenIds
    const index = parentBlock.childrenIds.indexOf(block.id);
    if (index <= 0) return;

    const prevBlock = blocksManager.getBlock(parentBlock.childrenIds[index - 1]);
    if (!prevBlock) return;
    const prevSrcBlock = blocksManager.getBlock(prevBlock.acturalSrc);
    if (!prevSrcBlock) return;

    // delete index-th block from parentSrcBlock and append to prevSrcBlock
    const deleted = parentSrcBlock.childrenIds.splice(index, 1)[0];
    const deletedBlock = blocksManager.getBlock(deleted);
    if (!deletedBlock) return;
    tr.updateBlock(parentSrcBlock);
    prevSrcBlock.childrenIds.push(deleted);
    if (prevSrcBlock.id == prevBlock.id) {
      // need expand & focus?
      prevSrcBlock.fold = false;
      focusNext = deleted;
    }
    tr.updateBlock(prevSrcBlock);
    deletedBlock.parentId = prevSrcBlock.id; // update deletedBlock's parent
    tr.updateBlock(deletedBlock);

    // sync to all the mirrors and virtuals
    const parentOccurs = blocksManager.getOccurs(parentSrcBlock.id, false);
    for (const occurId of parentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated) continue;
      const deletedId = occurBlock.childrenIds.splice(index, 1)[0];
      tr.updateBlock(occurBlock);
      tr.deleteBlock(deletedId);
      // gs.deleteVirtual(srcBlock.id, deletedId);
    }

    const prevOccurs = blocksManager.getOccurs(prevSrcBlock.id, false);
    for (const occurId of prevOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated) continue;
      const newVirtualBlock = {
        ...srcBlock,
        id: nanoid(),
        parentId: occurBlock.id,
        type: "virtualBlock",
        fold: true,
        src: srcBlock.id,
        childrenCreated: false,
      } as const;
      occurBlock.childrenIds.push(newVirtualBlock.id);
      if (occurId == prevBlock.id) {
        occurBlock.fold = false;
        focusNext = newVirtualBlock.id;
      }
      tr.updateBlock(occurBlock);
      tr.addBlock(newVirtualBlock);
      // gs.addVirtual(srcBlock.id, newVirtualBlock.id);
    }

    tr.commit();

    return { focusNext };
  };

  const demoteBlock = (blockId: BlockId) => {
    let focusNext;
    const tr = blocksManager.createBlockTransaction();

    const block = blocksManager.getBlock(blockId);
    if (!block) return;
    if (block.parentId == "null") return;
    const srcBlock = blocksManager.getBlock(block.acturalSrc);
    if (!srcBlock) return;

    const parentBlock = blocksManager.getBlock(block.parentId);
    if (!parentBlock) return;
    if (parentBlock.parentId == "null") return;
    const parentSrcBlock = blocksManager.getBlock(parentBlock.acturalSrc);
    if (!parentSrcBlock) return;

    const parentParentBlock = blocksManager.getBlock(parentBlock.parentId);
    if (!parentParentBlock) return;
    const parentParentSrcBlock = blocksManager.getBlock(parentParentBlock.acturalSrc);
    if (!parentParentSrcBlock) return;

    // Example 1.
    // - block1                              Desirable:  - block1
    //   - block2                                        - block3
    // - block3                                            - block1 [mirror]
    //   - block1 [mirror]                                 - block2
    //     - block2 [virtual] <-- demote this
    //
    // Example2.
    // - block2                              Desirable:  - block2
    // - block1                                          - block1
    //   - block2 [mirror]                               - block3
    // - block3                                            - block1 [mirror]
    //   - block1 [mirror]                                 - block2 [mirror]
    //     - block2 [virtual] <-- demote this

    // delete srcBlock from its parent
    const index1 = parentSrcBlock.childrenIds.indexOf(srcBlock.id);
    const deleted = parentSrcBlock.childrenIds.splice(index1, 1)[0];
    const deletedBlock = blocksManager.getBlock(deleted);
    if (!deletedBlock) return;
    tr.updateBlock(parentSrcBlock);

    let index2;
    if (parentBlock.type == "mirrorBlock" && parentParentBlock.type == "normalBlock") {
      // actually, parentParentBlock must be NormalBlock
      // append block to new parent, right after parentBlock
      index2 = parentParentBlock.childrenIds.indexOf(parentBlock.id);
      parentParentBlock.childrenIds.splice(index2 + 1, 0, deleted);
      tr.updateBlock(parentParentBlock);

      // change parent of srcBlock
      deletedBlock.parentId = parentParentBlock.id;
      tr.updateBlock(deletedBlock);
      focusNext = deleted;
    } else {
      // append srcBlock to new parent, right after parentSrcBlock
      index2 = parentParentSrcBlock.childrenIds.indexOf(parentSrcBlock.id);
      parentParentSrcBlock.childrenIds.splice(index2 + 1, 0, deleted);
      tr.updateBlock(parentParentSrcBlock);

      // change parent of srcBlock
      deletedBlock.parentId = parentParentSrcBlock.id;
      tr.updateBlock(deletedBlock);

      if (parentParentBlock.id == parentParentSrcBlock.id) {
        focusNext = deleted;
      }
    }

    // sync to all the mirrors and virtuals
    const parentOccurs = blocksManager.getOccurs(parentSrcBlock.id, false);
    for (const occurId of parentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated) continue;
      const deletedId = occurBlock.childrenIds.splice(index1, 1)[0];
      tr.updateBlock(occurBlock);
      tr.deleteBlock(deletedId);
      // state.deleteVirtual(srcBlock.id, deletedId);
    }

    const parentParentOccurs = blocksManager.getOccurs(parentParentSrcBlock.id, false);
    for (const occurId of parentParentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated) continue;
      const newVirtualBlock = {
        ...srcBlock,
        id: nanoid(),
        parentId: occurBlock.id,
        type: "virtualBlock",
        fold: true,
        src: srcBlock.id,
        childrenCreated: false,
      } as const;
      if (parentParentBlock.id == occurId) {
        // need focus?
        focusNext = newVirtualBlock.id;
      }
      occurBlock.childrenIds.splice(index2 + 1, 0, newVirtualBlock.id);
      tr.updateBlock(occurBlock);
      tr.addBlock(newVirtualBlock);
    }

    tr.commit();

    return { focusNext };
  };

  return {
    normalizePos,
    changeBlockContent,
    insertNormalBlock,
    deleteBlock,
    promoteBlock,
    demoteBlock,
    toggleFold,
  };
});
