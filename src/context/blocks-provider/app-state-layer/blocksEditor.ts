import type { BlockContent, BlockId } from "@/common/types";
import { nanoid } from "nanoid";
import type {
  Block,
  BlocksManager,
  BlockTransaction,
  MirrorBlock,
  VirtualBlock,
} from "./blocksManager";
import { BlockTreeContext, type BlockTree } from "../../blockTree";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";

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

export const createBlocksEditor = (blocksManager: BlocksManager) => {
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
    blocksManager.updateBlock(block, { type: "ui" });
  };

  const changeBlockContent = (params: {
    blockId: BlockId;
    content: BlockContent;
    tr?: BlockTransaction;
    commit?: boolean;
  }) => {
    const { getOccurs } = getIndexContext()!;
    let { blockId, content, tr, commit } = params;
    tr ??= blocksManager.createBlockTransaction({ type: "ui", changeSources: [blockId] });
    commit ??= true;

    const block = blocksManager.getBlock(blockId);
    if (!block) return;
    const occurs = getOccurs(block.acturalSrc);
    const ctext = blocksManager.getCtext(content);
    const olinks =
      content[0] === BLOCK_CONTENT_TYPES.TEXT ? blocksManager.getOlinks(content[1]) : [];
    const boosting = 0; // TODO
    for (const occur of occurs) {
      const occurBlock = blocksManager.getBlock(occur);
      if (!occurBlock) continue;
      occurBlock.content = content;
      occurBlock.ctext = ctext;
      occurBlock.olinks = olinks;
      occurBlock.boosting = boosting;
      tr.updateBlock(occurBlock);
    }

    if (commit) tr.commit();
  };

  const insertNormalBlock = (params: {
    pos: BlockPos;
    content: BlockContent;
    meta?: Record<string, any>;
    childrenIds?: BlockId[];
    tr?: BlockTransaction;
    commit?: boolean;
  }) => {
    const { getOccurs } = getIndexContext()!;
    let { pos, content, meta, childrenIds, tr, commit } = params;
    childrenIds ??= [];
    tr ??= blocksManager.createBlockTransaction({ type: "ui" });
    commit ??= true;

    let focusNext;
    const normalizedPos = normalizePos(pos);
    if (!normalizedPos) return;
    const { parentId, childIndex } = normalizedPos;
    const parentBlock = blocksManager.getBlock(parentId);
    if (!parentBlock) return;

    const parentSrcBlock =
      parentBlock.type == "normalBlock"
        ? parentBlock
        : blocksManager.getBlock(parentBlock.acturalSrc);
    if (!parentSrcBlock) return;

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

    const parentOccues = getOccurs(parentSrcBlock.acturalSrc, false);
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

    if (commit) tr.commit();
    return { focusNext, newNormalBlockId: id };
  };

  const insertNormalBlocks = (params: {
    pos: BlockPos;
    blocks: {
      // 普通块的 id，如果为空，则自动生成
      id?: BlockId;
      content: BlockContent;
      // 如果为空，则默认没有孩子
      childrenIds?: BlockId[];
      meta?: Record<string, any>;
    }[];
    tr?: BlockTransaction;
    commit?: boolean;
  }) => {
    const { getOccurs } = getIndexContext()!;
    let { pos, blocks, tr, commit } = params;
    if (blocks.length === 0) return;
    tr ??= blocksManager.createBlockTransaction({ type: "ui" });
    commit ??= true;

    let focusNext;
    const normalizedPos = normalizePos(pos);
    if (!normalizedPos) return;
    const { parentId, childIndex } = normalizedPos;
    const parentBlock = blocksManager.getBlock(parentId);
    if (!parentBlock) return;

    const parentSrcBlock =
      parentBlock.type == "normalBlock"
        ? parentBlock
        : blocksManager.getBlock(parentBlock.acturalSrc);
    if (!parentSrcBlock) return;

    // 创建所有新块的ID
    const newBlockIds = blocks.map((b) => b.id ?? nanoid());

    // 批量添加普通块
    blocks.forEach(({ content, meta, childrenIds }, index) => {
      const id = newBlockIds[index];
      tr!.addBlock({
        id,
        type: "normalBlock",
        parentId,
        childrenIds: childrenIds ?? [],
        fold: false, // 新插入的普通块默认不折叠
        content,
        metadata: meta ?? {},
      });
    });

    // 更新父块的子块列表
    parentSrcBlock.childrenIds.splice(childIndex, 0, ...newBlockIds);
    if (parentSrcBlock.fold) {
      parentSrcBlock.fold = false;
    }
    tr.updateBlock(parentSrcBlock);

    // 如果父块是源块且插入位置是当前位置，则聚焦第一个新块
    if (parentId == parentSrcBlock.id) {
      focusNext = newBlockIds[0];
    }

    // 为父块的所有镜像和虚拟块创建对应的虚拟块
    const parentOccurs = getOccurs(parentSrcBlock.acturalSrc, false);
    for (const occur of parentOccurs) {
      const occurBlock = blocksManager.getBlock(occur);
      if (!occurBlock || (occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated))
        continue;

      // 为每个新块创建对应的虚拟块
      const newVirtualIds = newBlockIds.map((srcId) => {
        const newId = nanoid();
        tr!.addBlock({
          id: newId,
          type: "virtualBlock",
          // 虚拟块都先不创建孩子，这不会造成问题
          // 因为我们这里创建的虚拟块都是折叠的，并且标记了 childrenCreated = false
          childrenIds: [],
          fold: true,
          parentId: occurBlock.id,
          src: srcId,
          childrenCreated: false,
        });
        return newId;
      });

      // 批量更新镜像/虚拟块的子块列表
      occurBlock.childrenIds.splice(childIndex, 0, ...newVirtualIds);
      if (occur == parentId) {
        occurBlock.fold = false;
        focusNext = newVirtualIds[0];
      }
      tr.updateBlock(occurBlock);
    }

    if (commit) tr.commit();
    return { focusNext, newNormalBlockIds: newBlockIds };
  };

  const insertMirrorBlock = (params: {
    pos: BlockPos;
    srcBlockId: BlockId;
    tr?: BlockTransaction;
    commit?: boolean;
  }) => {
    const { getOccurs } = getIndexContext()!;
    let { pos, srcBlockId, tr, commit } = params;
    tr ??= blocksManager.createBlockTransaction({ type: "ui" });
    commit ??= true;
    let focusNext;

    const normalizedPos = normalizePos(pos);
    if (!normalizedPos) return;
    const { parentId, childIndex } = normalizedPos;
    const parentBlock = blocksManager.getBlock(parentId);
    if (!parentBlock) return;

    const parentSrcBlock =
      parentBlock.type == "normalBlock"
        ? parentBlock
        : blocksManager.getBlock(parentBlock.acturalSrc);
    if (!parentSrcBlock) return;

    const srcBlock = blocksManager.getBlock(srcBlockId);
    if (!srcBlock) return;
    const srcSrcBlock =
      srcBlock.type === "normalBlock" ? srcBlock : blocksManager.getBlock(srcBlock.acturalSrc);
    if (!srcSrcBlock) return;

    const newMirrorBlockId = nanoid();
    const vChildBlockIds: BlockId[] = [];
    for (const childId of srcSrcBlock.childrenIds) {
      const childBlock = blocksManager.getBlock(childId);
      if (!childBlock) continue;
      const vChildBlock: VirtualBlock = {
        ...childBlock,
        id: nanoid(),
        parentId: newMirrorBlockId,
        type: "virtualBlock",
        fold: true,
        src: childId,
        acturalSrc: "src" in childBlock ? childBlock.src : childBlock.id,
        childrenCreated: false,
      };
      tr.addBlock(vChildBlock);
      vChildBlockIds.push(vChildBlock.id);
    }

    const newMirrorBlock: MirrorBlock = {
      ...srcBlock,
      id: newMirrorBlockId,
      parentId: parentSrcBlock.id,
      type: "mirrorBlock",
      childrenIds: vChildBlockIds,
      fold: true,
      src: srcSrcBlock.id,
    };
    tr.addBlock(newMirrorBlock);
    if (parentId == parentSrcBlock.id) {
      parentSrcBlock.fold = false;
      focusNext = newMirrorBlockId;
    }
    parentSrcBlock.childrenIds.splice(childIndex, 0, newMirrorBlock.id);
    tr.updateBlock(parentSrcBlock);

    const parentOccurs = getOccurs(parentSrcBlock.id, false);
    for (const occurId of parentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock) continue;
      const newBlock: VirtualBlock = {
        ...newMirrorBlock,
        id: nanoid(),
        parentId: occurId,
        type: "virtualBlock",
        childrenIds: [],
        fold: true,
        src: newMirrorBlock.id,
        childrenCreated: false,
      };
      if (occurId == parentId) {
        occurBlock.fold = false;
        focusNext = newBlock.id;
      }
      if (occurBlock.type === "virtualBlock" && !occurBlock.childrenCreated) continue;
      occurBlock.childrenIds.splice(childIndex, 0, newBlock.id);
      tr.updateBlock(occurBlock);
    }

    if (commit) tr.commit();
    return { focusNext };
  };

  const moveBlock = (params: {
    blockId: BlockId;
    pos: BlockPos;
    tr?: BlockTransaction;
    commit?: boolean;
  }) => {
    const { getOccurs } = getIndexContext()!;
    let focusNext;
    let { blockId, pos, tr, commit } = params;
    commit ??= true;

    const normalizedPos = normalizePos(pos);
    if (!normalizedPos) return null;

    const block = blocksManager.getBlock(blockId);
    if (!block) return null;
    const srcBlock = blocksManager.getBlock(block.acturalSrc);
    if (!srcBlock) return null;

    const srcParentBlock = blocksManager.getBlock(srcBlock.parentId);
    if (!srcParentBlock) return null;

    const targetParentBlock = blocksManager.getBlock(normalizedPos.parentId);
    if (!targetParentBlock) return null;
    const targetParentActualSrcBlock = blocksManager.getBlock(targetParentBlock.acturalSrc);
    if (!targetParentActualSrcBlock) return null;

    const index = srcParentBlock.childrenIds.indexOf(srcBlock.id);
    if (index == -1) return null;

    let insertIndex;
    if (srcParentBlock.id == targetParentActualSrcBlock.id) {
      insertIndex =
        index < normalizedPos.childIndex ? normalizedPos.childIndex - 1 : normalizedPos.childIndex;
    } else {
      insertIndex = normalizedPos.childIndex;
    }

    if (insertIndex < 0 || insertIndex > targetParentActualSrcBlock.childrenIds.length) {
      return null;
    }

    tr ??= blocksManager.createBlockTransaction({ type: "ui" });

    // 同级之间移动
    if (srcParentBlock.id == targetParentActualSrcBlock.id) {
      // unchanged
      if (index == normalizedPos.childIndex || index + 1 == normalizedPos.childIndex) {
        return null;
      }
      srcParentBlock.childrenIds.splice(index, 1);
      srcParentBlock.childrenIds.splice(insertIndex, 0, srcBlock.id);
      tr.updateBlock(srcParentBlock);
      if (srcParentBlock.id == normalizedPos.parentId) {
        focusNext = srcBlock.id;
      }
    } else {
      // delete srcBlock from its parent
      srcParentBlock.childrenIds.splice(index, 1);
      tr.updateBlock(srcParentBlock);
      // add srcBlock to new parent
      targetParentActualSrcBlock.childrenIds.splice(insertIndex, 0, srcBlock.id);
      tr.updateBlock(targetParentActualSrcBlock);
      // update parent of srcBlock
      srcBlock.parentId = targetParentActualSrcBlock.id;
      tr.updateBlock(srcBlock);
      if (targetParentActualSrcBlock.id == normalizedPos.parentId) {
        focusNext = srcBlock.id;
      }
    }

    // sync to all the mirrors and virtuals
    const oldParentOccurs = getOccurs(srcParentBlock.id, false);
    for (const occurId of oldParentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || (occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated))
        continue;
      const deletedId = occurBlock.childrenIds.splice(index, 1)[0];
      tr.updateBlock(occurBlock);
      tr.deleteBlock(deletedId);
    }

    const newParentOccurs = getOccurs(targetParentActualSrcBlock.id, false);
    for (const occurId of newParentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || (occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated))
        continue;
      const newVirtualBlock: VirtualBlock = {
        ...structuredClone(srcBlock),
        id: nanoid(),
        parentId: occurBlock.id,
        type: "virtualBlock",
        childrenIds: [],
        fold: true,
        src: srcBlock.id,
        childrenCreated: false,
      };
      if (occurId == normalizedPos.parentId) {
        focusNext = newVirtualBlock.id;
      }
      occurBlock.childrenIds.splice(insertIndex, 0, newVirtualBlock.id);
      tr.updateBlock(occurBlock);
      tr.addBlock(newVirtualBlock);
    }

    if (commit) tr.commit();

    return focusNext ? { focusNext } : null;
  };

  const deleteBlock = (params: { blockId: BlockId; tr?: BlockTransaction; commit?: boolean }) => {
    const { getOccurs } = getIndexContext()!;
    let { blockId, tr, commit } = params;
    commit ??= true;

    const block = blocksManager.getBlock(blockId);
    if (!block) return;
    const blocksToDelete: Block[] = [];

    const _deleteBlock = (block: Block) => {
      // 1. 删除一个普通块，其所有后代及其镜像块和虚拟块都会删除
      // 2. 删除一个虚拟块，其来源块的所有后代及其镜像块和虚拟块都会删除
      if (block.type == "normalBlock" || block.type == "virtualBlock") {
        const occurs = getOccurs(block.acturalSrc, true);
        const occurBlocks = occurs
          .map((id) => blocksManager.getBlock(id))
          .filter((b) => b != null) as Block[];
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

    tr ??= blocksManager.createBlockTransaction({ type: "ui" });
    for (const block of blocksToDelete) tr.deleteBlock(block.id);

    // 此外，还需将 blockId 从其父块的孩子中删除
    if (block.type == "normalBlock" || block.type == "virtualBlock") {
      const parentBlock = blocksManager.getBlock(block.parentId);
      if (!parentBlock) return;
      const index = parentBlock.childrenIds.indexOf(block.id);
      if (index < 0) return;
      const parentOccurs = getOccurs(parentBlock.acturalSrc, true);
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

    if (commit) tr.commit();
  };

  const promoteBlock = (params: { blockId: BlockId; tr?: BlockTransaction; commit?: boolean }) => {
    const { getOccurs } = getIndexContext()!;
    let focusNext;
    let { blockId, tr, commit } = params;
    tr ??= blocksManager.createBlockTransaction({ type: "ui" });
    commit ??= true;

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
    const parentOccurs = getOccurs(parentSrcBlock.id, false);
    for (const occurId of parentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || (occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated))
        continue;
      const deletedId = occurBlock.childrenIds.splice(index, 1)[0];
      tr.updateBlock(occurBlock);
      tr.deleteBlock(deletedId);
      // gs.deleteVirtual(srcBlock.id, deletedId);
    }

    const prevOccurs = getOccurs(prevSrcBlock.id, false);
    for (const occurId of prevOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || (occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated))
        continue;
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

    if (commit) tr.commit();

    return { focusNext };
  };

  const demoteBlock = (params: { blockId: BlockId; tr?: BlockTransaction; commit?: boolean }) => {
    const { getOccurs } = getIndexContext()!;
    let focusNext;
    let { blockId, tr, commit } = params;
    tr ??= blocksManager.createBlockTransaction({ type: "ui" });
    commit ??= true;

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
    const parentOccurs = getOccurs(parentSrcBlock.id, false);
    for (const occurId of parentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || (occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated))
        continue;
      const deletedId = occurBlock.childrenIds.splice(index1, 1)[0];
      tr.updateBlock(occurBlock);
      tr.deleteBlock(deletedId);
      // state.deleteVirtual(srcBlock.id, deletedId);
    }

    const parentParentOccurs = getOccurs(parentParentSrcBlock.id, false);
    for (const occurId of parentParentOccurs) {
      const occurBlock = blocksManager.getBlock(occurId);
      if (!occurBlock || (occurBlock.type == "virtualBlock" && !occurBlock.childrenCreated))
        continue;
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

    if (commit) tr.commit();

    return { focusNext };
  };

  const locateBlock = async (blockId: BlockId, blockTree?: BlockTree) => {
    const blockTreeContext = getBlockTreeContext()!;
    const { getBlockTree } = blockTreeContext;
    blockTree ??= getBlockTree("main");
    if (!blockTree) return;
    const { mainRootBlockId } = getMainTreeContext()!; // TODO: 有点令人迷惑，是否应该允许通过 BlockTree 修改 root block？

    const rootBlockIds = blockTree.getRootBlockIds();
    const targetPath = blocksManager.getBlockPath(blockId);
    if (targetPath == null) return;

    // 找到合适的 rootBlockId
    let rootBlockId, index;
    for (const id of rootBlockIds) {
      index = targetPath.findIndex((block) => block.id === id);
      if (index != -1) {
        rootBlockId = id;
        break;
      }
    }

    // 找到了合适的 rootBlockId？
    // 则从根块开始，一路展开即可看到目标块
    if (rootBlockId && index != null && index > 0) {
      let changed = false;
      for (let i = index; i > 0; i--) {
        const block = targetPath[i];
        if (block.fold) {
          changed = true;
          await toggleFold(block.id, false);
        }
      }
    } else {
      // 计算合适的 blockId，仅用于 main tree
      if (blockTree.getId() !== "main") return;
      const rootPath = blocksManager.getBlockPath(rootBlockIds[0]);
      if (!rootPath) return;
      // targetPath 和 rootPath 的最近公共祖先就是最合适的 mainRootBlockId
      let i = rootPath.length - 1,
        j = targetPath.length - 1;
      while (i >= 0 && j >= 0) {
        if (rootPath[i].id != targetPath[j].id) break;
        i--;
        j--;
      }
      const newRoot = i < 0 ? rootPath[0] : j < 0 ? targetPath[0] : rootPath[i + 1];
      const blocksToExpand =
        i < 0 ? targetPath.slice(0, j + 1) : j < 0 ? rootPath.slice(0, i + 1) : targetPath.slice(j);
      mainRootBlockId.value = newRoot.id;
      let changed = false;
      for (const block of blocksToExpand) {
        if (block.fold) {
          changed = true;
          await toggleFold(block.id, false);
        }
      }
    }
  };

  return {
    normalizePos,
    changeBlockContent,
    insertNormalBlock,
    insertNormalBlocks,
    insertMirrorBlock,
    deleteBlock,
    promoteBlock,
    demoteBlock,
    toggleFold,
    moveBlock,
    locateBlock,
  };
};
