import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { BlockId } from "@/common/types";
import type { Block } from "@/context/blocks-provider/app-state-layer/blocksManager";
import type {
  BlocksManager,
  ForDescendantsOptions,
} from "@/context/blocks-provider/app-state-layer/blocksManager";

export type DisplayItem = { itemId: string } & (
  | {
      type: "basic-block";
      level: number;
      block: Block;
    }
  | { type: "backlink-block"; block: Block; refBlockId: BlockId }
  | { type: "backlink-header"; blockId: BlockId; backlinks: BlockId[] }
  | { type: "potential-links-header"; blockId: BlockId; potentialLinks: BlockId[] }
  | { type: "potential-links-block"; block: Block; refBlockId: BlockId }
);

export type DisplayItemGenerator = (params: {
  rootBlockIds?: BlockId[];
  rootBlockLevel?: number;
  forceFold?: boolean;
  tempExpanded?: Set<BlockId>;
}) => DisplayItem[];

const defaultDfsOptions = (resultCollector: DisplayItem[]) => {
  const dfsOptions: Partial<ForDescendantsOptions> = {};
  dfsOptions.nonFoldOnly = true;
  dfsOptions.includeSelf = true;

  dfsOptions.onEachBlock = (block, level, ignore) => {
    resultCollector.push({ type: "basic-block", itemId: `block-${block.id}`, block, level });
  };

  return dfsOptions;
};

export const getDefaultDiGenerator: (
  blocksManager: BlocksManager,
  requirePotentialLinks: boolean,
) => DisplayItemGenerator = (blocksManager, requirePotentialLinks) => (params) => {
  if (!params.rootBlockIds) return [];
  const resultCollector: DisplayItem[] = [];
  const dfsOptions = defaultDfsOptions(resultCollector);

  for (const rootBlockId of params.rootBlockIds) {
    dfsOptions.rootBlockId = rootBlockId;

    // 如果没有指定 rootBlockLevel，则根据 blockId 先算出 level
    if (params.rootBlockLevel != null) {
      dfsOptions.rootBlockLevel = params.rootBlockLevel;
    } else {
      const path = blocksManager.getBlockPath(rootBlockId);
      if (path == null) {
        console.error("cannot get path of ", rootBlockId);
        continue;
      }
      dfsOptions.rootBlockLevel = path.length - 1;
    }

    // 生成所有 displayItems
    blocksManager.forDescendants(dfsOptions as ForDescendantsOptions);
  }

  // 添加 backlink 和 potential-links
  const { getBacklinks } = getBacklinksContext() ?? {};
  const { search } = getIndexContext() ?? {};
  if (getBacklinks && search && params.rootBlockIds.length === 1) {
    const rootBlockId = params.rootBlockIds[0];
    const backlinks = getBacklinks(rootBlockId);

    // 添加 backlink header
    resultCollector.push({
      type: "backlink-header",
      itemId: `backlink-header-${params.rootBlockIds[0]}`,
      blockId: params.rootBlockIds[0],
      backlinks: [...backlinks],
    });

    // 添加 backlink blocks
    for (const backlink of backlinks) {
      const block = blocksManager.getBlock(backlink);
      if (!block) continue;
      resultCollector.push({
        type: "backlink-block",
        itemId: `backlink-${backlink}`,
        block,
        refBlockId: rootBlockId,
      });
    }

    const rootBlock = blocksManager.getBlock(rootBlockId);

    if (rootBlock && rootBlock.content[0] === BLOCK_CONTENT_TYPES.TEXT) {
      const potentialLinks = search(rootBlock.ctext)
        .map((l) => blocksManager.getBlock(l.id))
        .filter((l) => l != null)
        .filter((b) => !backlinks.has(b.id) && b.id !== rootBlockId)
        .filter((b) => b.content[0] === BLOCK_CONTENT_TYPES.TEXT);

      if (potentialLinks.length > 0) {
        // 添加 potential-links-header
        resultCollector.push({
          type: "potential-links-header",
          itemId: `potential-links-header-${rootBlockId}`,
          blockId: rootBlockId,
          potentialLinks: potentialLinks.map((b) => b.id),
        });

        // 添加 potential-links-blocks
        for (const potentialLink of potentialLinks) {
          const block = blocksManager.getBlock(potentialLink.id);
          if (!block) continue;
          resultCollector.push({
            type: "potential-links-block",
            itemId: `potential-links-block-${potentialLink.id}`,
            block,
            refBlockId: rootBlockId,
          });
        }
      }
    }
  }

  return resultCollector;
};
