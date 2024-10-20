import { defineModule } from "@/common/module";
import { eventBus } from "./eventBus";
import type { SearchOptions, SearchResult } from "minisearch";
import MiniSearch from "minisearch";
import type { BlockId } from "@/common/types";
import { blocksManager } from "./blocksManager";

export const fulltextSearch = defineModule(
  "fulltextSearch",
  {eventBus, blocksManager},
  ({eventBus, blocksManager}) => {
    const fulltextIndex = new MiniSearch({
      fields: ["ctext", "mtext"],
      storeFields: ["id"],
    });

    const dirtySet = new Set<BlockId>();

    eventBus.on("afterBlocksTrCommit", (tr) => {
      for (const patch of tr.patches) {
        if (patch.op === "delete") {
          dirtySet.add(patch.blockId);
        } else {
          dirtySet.add(patch.block.id);
        }
      }
      console.log("dirty set=", dirtySet);
    });

    const _updateIndex = () => {
      if (dirtySet.size === 0) return;
      for (const blockId of dirtySet) {
        const block = blocksManager.getBlock(blockId);
        // 这个块被删除了
        if (block == null && fulltextIndex.has(blockId)) {
          fulltextIndex.discard(blockId);
        } else if (block && block.type === "normalBlock") {
          if (fulltextIndex.has(blockId))
            fulltextIndex.discard(blockId);
          fulltextIndex.add(block);
        }
      }
      dirtySet.clear();
    }

    const search = (query: string, opts: SearchOptions) => {
      _updateIndex();
      return fulltextIndex.search(query, opts);
    }

    return {
      search,
    };
  }
)