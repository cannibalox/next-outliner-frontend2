import type { BlockId, BlockWithLevel } from "@/common/types";
import { globalEnv } from "@/main";
import type { ForDescendantsOptions } from "@/modules/blocksManager";

export type DisplayItem = { itemId: string } & { type: "block"; block: BlockWithLevel };

export type DisplayItemGenerator = (params: {
  rootBlockIds?: BlockId[];
  rootBlockLevel?: number;
  forceFold?: boolean;
  tempExpanded?: Set<BlockId>;
}) => DisplayItem[];

const defaultDfsOptions = (resultCollector: DisplayItem[]) => {
  const {} = globalEnv;

  const dfsOptions: Partial<ForDescendantsOptions> = {};
  dfsOptions.nonFoldOnly = true;
  dfsOptions.includeSelf = true;

  dfsOptions.onEachBlock = (block, ignore) => {
    resultCollector.push({ type: "block", itemId: `block-${block.id}`, block });
  };

  return dfsOptions;
};

export const defaultDiGenerator: DisplayItemGenerator = (params) => {
  if (!params.rootBlockIds) return [];
  const resultCollector: DisplayItem[] = [];
  const dfsOptions = defaultDfsOptions(resultCollector);
  const { blocksManager } = globalEnv;

  for (const rootBlockId of params.rootBlockIds) {
    dfsOptions.rootBlockId = rootBlockId;

    // 如果没有指定 rootBlockLevel，则根据 blockId 先算出 level
    if (params.rootBlockLevel != null) {
      dfsOptions.rootBlockLevel = params.rootBlockLevel;
    } else {
      const path = blocksManager.getBlockIdPath(rootBlockId);
      if (path == null) {
        console.error("cannot get path of ", rootBlockId);
        continue;
      }
      dfsOptions.rootBlockLevel = path.length - 1;
    }

    // 生成所有 displayItems
    blocksManager.forDescendants(dfsOptions as ForDescendantsOptions);
  }

  return resultCollector;
};
