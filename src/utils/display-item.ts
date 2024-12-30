import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import type { Block } from "@/context/blocks/view-layer/blocksManager";
import type {
  BlocksManager,
  ForDescendantsOptions,
} from "@/context/blocks/view-layer/blocksManager";

// - block-item
//   - basic-block
//   - backlink-block
//   - backlink-descendant
//   - potential-links-block
//   - potential-links-descendant
// - non-block-item
//   - backlink-header
//   - potential-links-header
export type DisplayItem = { itemId: string } & (
  | { type: "basic-block"; level: number; block: Block }
  | { type: "backlink-block"; block: Block; refBlockId: BlockId }
  | { type: "backlink-header"; blockId: BlockId; backlinks: BlockId[] }
  | { type: "backlink-descendant"; block: Block; level: number }
  | { type: "potential-links-header"; blockId: BlockId; potentialLinks: BlockId[] }
  | { type: "potential-links-block"; block: Block; refBlockId: BlockId }
  | { type: "potential-links-descendant"; block: Block; level: number }
);

export type DisplayBlockItem =
  | (DisplayItem & { type: "basic-block" })
  | (DisplayItem & { type: "backlink-block" })
  | (DisplayItem & { type: "backlink-descendant" })
  | (DisplayItem & { type: "potential-links-block" })
  | (DisplayItem & { type: "potential-links-descendant" });

export type DisplayGeneratorContext = {
  rootBlockIds: BlockId[];
  rootBlockLevel: number;
  // 是否显示反链面板
  showBacklinks?: boolean;
  // 是否显示潜在链接面板
  showPotentialLinks?: boolean;
  blocksManager: BlocksManager;
  expandedBPBlockIds: Record<BlockId, boolean>;
};

export const isBlockDi = (item: DisplayItem) => {
  const result =
    item.type === "basic-block" ||
    item.type === "backlink-block" ||
    item.type === "backlink-descendant" ||
    item.type === "potential-links-block" ||
    item.type === "potential-links-descendant";
  return result ? item.block : undefined;
};

export const generateDisplayItems = (ctx: DisplayGeneratorContext) => {
  const {
    rootBlockIds,
    rootBlockLevel,
    showBacklinks,
    showPotentialLinks,
    blocksManager,
    expandedBPBlockIds,
  } = ctx;

  const resultCollector: DisplayItem[] = [];

  for (const rootBlockId of rootBlockIds) {
    blocksManager.forDescendants({
      rootBlockId,
      rootBlockLevel,
      nonFoldOnly: true,
      includeSelf: true,
      onEachBlock: (block, level) => {
        resultCollector.push({
          type: "basic-block",
          itemId: `block-${block.id}`,
          block,
          level,
        });
      },
    });
  }

  if (rootBlockIds.length === 1) {
    const rootBlockId = rootBlockIds[0];

    // 如果要显示反链
    let backlinks: [Set<BlockId> | undefined] = [undefined];
    if (showBacklinks)
      addBacklinkItems(rootBlockId, resultCollector, blocksManager, backlinks, expandedBPBlockIds);

    // 如果要显示潜在链接
    if (showPotentialLinks)
      addPotentialLinksItems(
        rootBlockId,
        resultCollector,
        blocksManager,
        backlinks,
        expandedBPBlockIds,
      );
  }

  return resultCollector;
};

const addBacklinkItems = (
  rootBlockId: BlockId,
  resultCollector: DisplayItem[],
  blocksManager: BlocksManager,
  backlinksCollector: [Set<BlockId> | undefined],
  expandedBPBlockIds: Record<BlockId, boolean>,
) => {
  const { getBacklinksConsideringAliases } = getBacklinksContext() ?? {};
  if (!getBacklinksConsideringAliases) return;

  const backlinks = getBacklinksConsideringAliases(rootBlockId);
  if (backlinks.size <= 0) return;

  // 添加 backlink header
  resultCollector.push({
    type: "backlink-header",
    itemId: `backlink-header-${rootBlockId}`,
    blockId: rootBlockId,
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

    blocksManager.forDescendants({
      rootBlockId: backlink,
      rootBlockLevel: 0,
      nonFoldOnly: true,
      includeSelf: false,
      ignore: (b) => {
        if (expandedBPBlockIds[b.id]) return "keep-self-and-descendants";
        return "ignore-descendants";
      },
      onEachBlock: (block, level) => {
        resultCollector.push({
          type: "backlink-descendant",
          itemId: `backlink-descendant-${block.id}`,
          block,
          level,
        });
      },
    });
  }

  backlinksCollector[0] = backlinks;
};

const addPotentialLinksItems = (
  rootBlockId: BlockId,
  resultCollector: DisplayItem[],
  blocksManager: BlocksManager,
  backlinksCollector: [Set<BlockId> | undefined],
  expandedBPBlockIds: Record<BlockId, boolean>,
) => {
  const { getBacklinksConsideringAliases } = getBacklinksContext() ?? {};
  const { search } = getIndexContext() ?? {};
  if (!search || !getBacklinksConsideringAliases) return;

  const backlinks = backlinksCollector[0] ?? getBacklinksConsideringAliases(rootBlockId);
  const rootBlock = blocksManager.getBlock(rootBlockId);

  if (rootBlock && rootBlock.content[0] === BLOCK_CONTENT_TYPES.TEXT) {
    const potentialLinks = search(rootBlock.ctext)
      .map((l) => blocksManager.getBlock(l.id))
      .filter((l): l is Block => l != null)
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

        blocksManager.forDescendants({
          rootBlockId: potentialLink.id,
          rootBlockLevel: 0,
          nonFoldOnly: true,
          includeSelf: false,
          ignore: (b) => {
            if (expandedBPBlockIds[b.id]) return "keep-self-and-descendants";
            return "ignore-descendants";
          },
          onEachBlock: (block, level) => {
            resultCollector.push({
              type: "potential-links-descendant",
              itemId: `potential-links-descendant-${block.id}`,
              block,
              level,
            });
          },
        });
      }
    }
  }
};
