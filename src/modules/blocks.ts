import { type ABlock, type BlockId, type LoadingBlock, type LoadedMirrorBlock, type LoadedNormalBlock, type LoadedVirtualBlock, type LoadingNormalBlock, type LoadingMirrorBlock, type LoadingVirtualBlock } from "@/common/types";
import { ref, type Ref, shallowReactive, watch } from "vue";
import { appState, type ExposedSth } from "./app";
import type { BlockData } from "@/yjs/types";
import { extractBlockStatus } from "@/common/extractBlockStatus";
import type { YMap } from "node_modules/yjs/dist/src/internals";

const registerModule = <ENV extends Record<string, any>>(module: {
  id: keyof ENV;
  deps: (keyof ENV)[];
  init: (_deps: { [K in (typeof module.deps)[number]]?: ENV[K] }) => Promise<Record<string, any>>;
}): void => {};

registerModule<{
  blocksManager: {};
  yjsManager: {},
  configManager: { },
}>({
  id: "blocksManager",
  deps: ["yjsManager", "configManager"],
  init: async ({ yjsManager, configManager }) => {
    const blocks = new Map<BlockId, Ref<ABlock | null>>();
    const loadingBlocks = new Map<BlockId, Ref<LoadingBlock>>();

    const blockInfoMapObserver: Parameters<YMap<any>["observe"]>[0] = (event) => {
      if (!deps.yjsManager.blockInfoMap.value || !deps.yjsManager.blockDataDocs.value) return;
      if (event.transaction.origin == "local") return;
      const changes = event.changes.keys.entries();
      for (const [key, { action, oldValue }] of changes) {
        if (action == "delete") {
          const block = this._blocks.get(key);
          if (block) {
            if (block.value) block.value.deleted = true;
            this._blocks.delete(key);
          }
        } else if (action == "add" || action == "update") {
          const blockInfo = blockInfoMap.value.get(key)!;
          const [status, parentId, childrenIds, docId, src] = blockInfo;
          const { type, fold } = extractBlockStatus(status);
          if (type == "normalBlock") {
            const belongingDoc = blockDataDocs.value.get(docId.toString());
            if (!belongingDoc) {
              console.error("Cannot find doc for block", key);
              continue;
            }
            // this block is a normal block, and its data doc is not loaded yet
            if (!belongingDoc.isLoaded) {
              belongingDoc.load();
              this._loadingBlocks.set(key, ref({
                type: "normalBlock",
                loading: true,
                parentId,
                childrenIds,
                id: key,
                fold,
                deleted: false,
                docId,
              }));
              continue;
            }
            const blockDataMap = belongingDoc?.getMap<BlockData>("blockData");
            if (!blockDataMap) {
              console.error("Cannot find blockDataMap in doc", belongingDoc);
              continue;
            }
            const blockData = blockDataMap.get(key);
            if (blockData) {
              // this block is a normal block, and its data is loaded
              const [blockContent, blockMetadata] = blockData;
              if (blockContent == null) {
                console.error("Normal Block content is null", key);
                continue;
              }
              this._setBlock(key, {
                type: "normalBlock",
                loading: false,
                id: key,
                deleted: false,
                parentId,
                parentRef: this._getBlockRef(parentId),
                childrenIds,
                childrenRefs: childrenIds.map(id => this._getBlockRef(id)),
                fold,
                content: blockContent,
                ctext: "",
                metadata: blockMetadata,
                mtext: "",
                olinks: [],
                boosting: 0,
                acturalSrc: key,
                docId,
              } as LoadedNormalBlock);
            } else {
              // this block is a normal block, and its data is not loaded yet
              this._loadingBlocks.set(key, ref({
                type: "normalBlock",
                loading: true,
                parentId,
                childrenIds,
                id: key,
                fold,
                deleted: false,
                docId,
              }));
            }
          } else {
            if (!src) {
              console.error("Cannot find src for block", key);
              continue;
            }
            const srcBlockInfo = blockInfoMap.value.get(src!);
            if (!srcBlockInfo) {
              console.error("Cannot find src block info for block", key);
              continue;
            }
            const [srcStatus, srcParentId, srcChildrenIds, srcDocId] = srcBlockInfo;
            const { type: srcType, fold: srcFold } = extractBlockStatus(srcStatus);
            if (srcType == "normalBlock") {
              const srcBelongingDoc = blockDataDocs.value.get(srcDocId.toString());
              if (!srcBelongingDoc) {
                console.error("Cannot find doc for src block", src);
                continue;
              }
              // this block is a mirror / virtual block, and its data doc is not loaded yet
              if (!srcBelongingDoc.isLoaded) {
                srcBelongingDoc.load();
                const srcBlock: LoadingNormalBlock = {
                  type: "normalBlock",
                  loading: true,
                  parentId: srcParentId,
                  childrenIds: srcChildrenIds,
                  id: src,
                  fold: srcFold,
                  deleted: false,
                  docId: srcDocId,
                };
                const block: LoadingMirrorBlock | LoadingVirtualBlock = {
                  type,
                  loading: true,
                  parentId,
                  childrenIds,
                  id: key,
                  fold,
                  deleted: false,
                  docId,
                  src,
                };
                this._loadingBlocks.set(src, ref(srcBlock));
                this._loadingBlocks.set(key, ref(block));
                continue;
              }
              const srcBlockDataMap = srcBelongingDoc?.getMap<BlockData>("blockData");
              if (!srcBlockDataMap) {
                console.error("Cannot find blockDataMap in doc", srcBelongingDoc);
                continue;
              }
              const srcBlockData = srcBlockDataMap.get(src);
              if (srcBlockData) {
                // this block is a mirror / virtual block, and its src block is loaded
                const [srcBlockContent, srcBlockMetadata] = srcBlockData;
                if (srcBlockContent == null) {
                  console.error("Mirror / Virtual Block's src block content is null", key);
                  continue;
                }
                const block: LoadedMirrorBlock | LoadedVirtualBlock = {
                  type: type as "mirrorBlock" | "virtualBlock",
                  loading: false,
                  id: key,
                  deleted: false,
                  parentId,
                  parentRef: this._getBlockRef(parentId),
                  childrenIds,
                  childrenRefs: childrenIds.map(id => this._getBlockRef(id)),
                  fold,
                  content: srcBlockContent,
                  ctext: "",
                  metadata: srcBlockMetadata,
                  mtext: "",
                  olinks: [],
                  boosting: 0,
                  src,
                  acturalSrc: src,
                  docId,
                };
                this._setBlock(key, block);
              } else {
                // this block is a mirror / virtual block, and its src block is not loaded yet
                const block: LoadingMirrorBlock | LoadingVirtualBlock = {
                  type,
                  loading: true,
                  parentId,
                  childrenIds,
                  id: key,
                  fold,
                  deleted: false,
                  docId,
                  src,
                };
                this._loadingBlocks.set(key, ref(block));
              }
            } else {
              console.error("Src type must be normalBlock, but got", srcType);
              continue;
            }
          }
        }
      }
    }
  }
})

export class BlocksManager
  implements ExposedSth<ReturnType<BlocksManager["getExposed"]>>
{
  private _blocks: Map<BlockId, Ref<ABlock | null>> = new Map();
  private _loadingBlocks: Map<BlockId, Ref<LoadingBlock>> = new Map();

  getExposed() {
    return {};
  }

  private _registerPullCbToYjs() {
    const { blockInfoMap, blockDataDocs } = appState.yjsManager;
    
    watch([blockInfoMap, blockDataDocs], () => {
      blockInfoMap.value?.observe();

      blockDataDocs.value?.forEach((doc, _docId) => {
        const blockDataMap = doc.getMap<BlockData>("blockData");
        if (!blockDataMap) {
          console.error("Cannot find blockDataMap in doc", doc);
          return;
        }
        blockDataMap.observe((event) => {
          if (event.transaction.origin == "local") return;
          const changes = event.changes.keys.entries();
          for (const [key, { action, oldValue }] of changes) {
            // for each add & update event, check if there is a loading block can be loaded
            if (action == "add" || action == "update") {
              for (const loadingBlock of this._loadingBlocks.values()) {
                const { type, id } = loadingBlock.value;
                const src = "src" in loadingBlock.value ? loadingBlock.value.src : null;
                // the loading block is a normal block, and the data of its block is loaded
                if (type == "normalBlock" && id == key) {
                  const blockData = blockDataMap.get(key);
                  if (blockData) {
                    const [blockContent, blockMetadata] = blockData;
                    if (blockContent == null) {
                      console.error("Normal Block content is null", key);
                      continue;
                    }
                    const block: LoadedNormalBlock = {
                      ...loadingBlock.value,
                      loading: false,
                      parentRef: this._getBlockRef(loadingBlock.value.parentId),
                      childrenRefs: loadingBlock.value.childrenIds.map(id => this._getBlockRef(id)),
                      content: blockContent,
                      ctext: "",
                      metadata: blockMetadata,
                      mtext: "",
                      olinks: [],
                      boosting: 0,
                      acturalSrc: id,
                      docId: Number(_docId),
                    }
                    this._setBlock(key, block);
                    this._loadingBlocks.delete(key);
                  } else {
                    console.error("Cannot find block data", key);
                  }
                }

                // the loading block is a mirror / virtual block, and the data of its src block is loaded
                if ((type == "mirrorBlock" || type == "virtualBlock") && src == key) {
                  const blockData = blockDataMap.get(src);
                  if (blockData) {
                    const [blockContent, blockMetadata] = blockData;
                    if (blockContent == null) {
                      console.error("Mirror / Virtual Block's src block content is null", key);
                      continue;
                    }
                    const block: LoadedMirrorBlock | LoadedVirtualBlock = {
                      ...loadingBlock.value,
                      loading: false,
                      parentRef: this._getBlockRef(loadingBlock.value.parentId),
                      childrenRefs: loadingBlock.value.childrenIds.map(id => this._getBlockRef(id)),
                      content: blockContent,
                      ctext: "",
                      metadata: blockMetadata,
                      mtext: "",
                      olinks: [],
                      boosting: 0,
                      acturalSrc: src,
                      docId: Number(_docId),
                    }
                    this._setBlock(key, block);
                    this._loadingBlocks.delete(key);
                  } else {
                    console.error("Cannot find block data", key);
                  }
                }
              }
            }
          }
        });
      });
    }, { immediate: true });
  }

  private _setBlock(blockId: BlockId, block: ABlock | null) {
    if (this._blocks.has(blockId)) {
      this._blocks.get(blockId)!.value = block;
    } else {
      const blockRef = ref(block) as Ref<ABlock | null>;
      this._blocks.set(blockId, blockRef);
    }
  }

  private _getBlockRef(blockId: BlockId) {
    let blockRef = this._blocks.get(blockId);
    if (!blockRef) {
      blockRef = ref(null);
      this._blocks.set(blockId, blockRef);
    }
    return blockRef;
  }
}