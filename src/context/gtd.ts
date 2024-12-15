import { createContext } from "@/utils/createContext";
import useWritableComputedRef from "@/utils/useWritableComputedRef";
import { useLocalStorage } from "@vueuse/core";
import { computed, watch } from "vue";
import { z } from "zod";
import SettingsContext from "./settings";
import KeymapContext from "./keymap";
import { useTaskQueue } from "@/plugins/taskQueue";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { EditorView as PmEditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { pmSchema } from "@/components/prosemirror/pmSchema";
import type { BlockId } from "@/common/types";
import { textContentFromBlockRef, textContentFromString } from "@/utils/pm";
import type { BlockPos } from "./blocks-provider/app-state-layer/blocksEditor";
import dayjs from "dayjs";
import { useToast } from "@/components/ui/toast";

type StatusTransRecord = {
  from: string;
  to: string;
  timestamp: Date;
};

const GtdContext = createContext(() => {
  const { moveProsemirrorKeybinding } = KeymapContext.useContext();
  const { registerSettingItem, registerSettingGroup } = SettingsContext.useContext();
  const { toast } = useToast();

  registerSettingGroup({
    key: "gtd",
    label: {
      zh: "GTD",
    },
  });
  const blockIdValidator = (value: string) => {
    const blocksContext = globalThis.getBlocksContext();
    if (!blocksContext) return undefined;
    const block = blocksContext.blocksManager.getBlock(value);
    return block ? undefined : "无效的块 ID";
  };

  const addTaskRecordWhenToggleStatusKey = "gtd.addTaskRecordWhenToggleStatus";
  const addTaskRecordWhenToggleStatusDefaultValue = true;
  const addTaskRecordWhenToggleStatus = useLocalStorage(
    addTaskRecordWhenToggleStatusKey,
    addTaskRecordWhenToggleStatusDefaultValue,
  );
  registerSettingItem({
    id: addTaskRecordWhenToggleStatusKey,
    groupKey: "gtd",
    defaultValue: addTaskRecordWhenToggleStatusDefaultValue,
    label: { zh: "切换状态时自动生成记录" },
    value: useWritableComputedRef(addTaskRecordWhenToggleStatus),
    componentType: { type: "switch" },
  });

  const timestampFormatKey = "gtd.timestampFormat";
  const timestampFormatDefaultValue = "YYYY-MM-DD HH:mm:ss";
  const timestampFormat = useLocalStorage(timestampFormatKey, timestampFormatDefaultValue);
  registerSettingItem({
    id: timestampFormatKey,
    groupKey: "gtd",
    defaultValue: timestampFormatDefaultValue,
    label: { zh: "时间戳格式" },
    desc: {
      zh: '生成的状态转换记录格式为 "{{指定的时间戳格式}} - from {{旧状态}} to {{新状态}}"',
    },
    value: useWritableComputedRef(timestampFormat),
    componentType: {
      type: "textInput",
    },
  });

  const statusTransRecordParentBlockIdKey = "gtd.statusTransRecordParentBlockId";
  const statusTransRecordParentBlockIdDefaultValue = "";
  const statusTransRecordParentBlockId = useLocalStorage(
    statusTransRecordParentBlockIdKey,
    statusTransRecordParentBlockIdDefaultValue,
  );
  registerSettingItem({
    id: statusTransRecordParentBlockIdKey,
    groupKey: "gtd",
    defaultValue: statusTransRecordParentBlockIdDefaultValue,
    label: { zh: "状态转换记录的存储位置" },
    desc: {
      zh: "指定一个块 ID，一个块的状态转换记录将以以下格式存放：\n- {{指定的块的引用}}\n    - 第一条记录\n    - 第二条记录",
    },
    value: useWritableComputedRef(statusTransRecordParentBlockId),
    componentType: { type: "textInput", validator: blockIdValidator },
  });

  const ignoreRecordThresholdKey = "gtd.ignoreRecordThreshold";
  const ignoreRecordThresholdDefaultValue = 30;
  const ignoreRecordThreshold = useLocalStorage(
    ignoreRecordThresholdKey,
    ignoreRecordThresholdDefaultValue,
  );
  registerSettingItem({
    id: ignoreRecordThresholdKey,
    groupKey: "gtd",
    defaultValue: ignoreRecordThresholdDefaultValue,
    label: { zh: "记录生成阈值 (单位：秒)" },
    desc: { zh: "如果一个距离上一次状态转换的时长小于该阈值，则不会生成对应的状态转换记录" },
    value: useWritableComputedRef(ignoreRecordThreshold),
    componentType: {
      type: "integerInput",
      min: 0,
    },
  });

  const statusTagsKey = "gtd.statusTags";
  const statusTagsDefaultValue = `{
  "later": "{{yourBlockId}}",
  "now": "{{yourBlockId}}",
  "done": "{{yourBlockId}}"
}`;
  const statusTagsSchema = z
    .string()
    .transform((s) => {
      try {
        return JSON.parse(s);
      } catch (e) {
        return null;
      }
    })
    .pipe(
      z.object({
        later: z.string(),
        now: z.string(),
        done: z.string(),
      }),
    );
  const statusTags = useLocalStorage(statusTagsKey, statusTagsDefaultValue);
  registerSettingItem({
    id: statusTagsKey,
    groupKey: "gtd",
    defaultValue: statusTagsDefaultValue,
    label: { zh: "状态标签" },
    desc: {
      zh: '所有状态标签，格式为 JSON，每个字段格式为 "{{状态标签名}}: {{状态标签块 ID}}"。注意：应至少指定 later, now, done 对应的块 ID，否则 GTD 系统将无法正常工作。',
    },
    value: useWritableComputedRef(statusTags),
    componentType: {
      type: "json",
      schema: statusTagsSchema,
    },
  });
  const parsedStatusTags = computed(() => {
    const parsed = statusTagsSchema.safeParse(statusTags.value);
    return parsed.data ?? null;
  });

  const nextStatusKeybindingKey = "gtd.nextStatusKeybinding";
  const nextStatusKeybindingDefaultValue = "Mod-Enter";
  const nextStatusKeybinding = useLocalStorage(
    nextStatusKeybindingKey,
    nextStatusKeybindingDefaultValue,
  );
  registerSettingItem({
    id: nextStatusKeybindingKey,
    groupKey: "gtd",
    defaultValue: nextStatusKeybindingDefaultValue,
    label: { zh: "快捷键：切换到下一个状态" },
    value: useWritableComputedRef(nextStatusKeybinding),
    componentType: { type: "keybindingInput" },
  });

  watch(
    nextStatusKeybinding,
    (value, oldValue) => {
      moveProsemirrorKeybinding(value, oldValue, {
        run: () => {
          const taskQueue = useTaskQueue();
          taskQueue.addTask(() => {
            if (!parsedStatusTags.value) {
              // toast
              return;
            }
            const blocksContext = globalThis.getBlocksContext();
            const lastFocusContext = globalThis.getLastFocusContext();
            if (!blocksContext || !lastFocusContext) return;
            const blockId = lastFocusContext.lastFocusedBlockId.value;
            const view = lastFocusContext.lastFocusedEditorView.value;
            if (!(view instanceof PmEditorView) || !blockId) return;
            const statusLabels = Object.keys(parsedStatusTags.value);
            const statusTagIds = Object.values(parsedStatusTags.value);

            let currStatusNodeInfo: any = null;
            view.state.doc.content.descendants((node, pos) => {
              if (currStatusNodeInfo) return false;
              if (node.type.name === "blockRef_v2" && node.attrs.tag) {
                const index = statusTagIds.indexOf(node.attrs.toBlockId);
                if (index !== -1) {
                  currStatusNodeInfo = {
                    node,
                    pos,
                    index,
                  };
                  return false;
                }
              }
            });

            if (!currStatusNodeInfo) {
              // 在块末尾添加一个状态标签
              const tr = view.state.tr.insertText(" ", view.state.doc.content.size);
              tr.insert(
                tr.doc.content.size,
                pmSchema.nodes.blockRef_v2.create({
                  toBlockId: statusTagIds[0],
                  tag: true,
                }),
              );
              view.dispatch(tr);
              // 添加状态转换记录
              addTaskRecordWhenToggleStatus.value &&
                addStatusTransRecord(
                  {
                    from: "none",
                    to: statusLabels[0],
                    timestamp: new Date(),
                  },
                  blockId,
                );
            } else {
              const pos = currStatusNodeInfo.pos;
              const toIndex =
                currStatusNodeInfo.index === statusTagIds.length - 1
                  ? 0
                  : currStatusNodeInfo.index + 1;
              const nextStatusId = statusTagIds[toIndex];
              const tr = view.state.tr.replaceRangeWith(
                pos,
                pos + 1,
                pmSchema.nodes.blockRef_v2.create({
                  toBlockId: nextStatusId,
                  tag: true,
                }),
              );
              view.dispatch(tr);
              // 添加状态转换记录
              addTaskRecordWhenToggleStatus.value &&
                addStatusTransRecord(
                  {
                    from: statusLabels[currStatusNodeInfo.index],
                    to: statusLabels[toIndex],
                    timestamp: new Date(),
                  },
                  blockId,
                );
            }
          });
          return true;
        },
        stopPropagation: true,
        preventDefault: true,
      });
    },
    { immediate: true },
  );

  const prevStatusKeybindingKey = "gtd.prevStatusKeybinding";
  const prevStatusKeybindingDefaultValue = "Mod-Shift-Enter";
  const prevStatusKeybinding = useLocalStorage(
    prevStatusKeybindingKey,
    prevStatusKeybindingDefaultValue,
  );
  registerSettingItem({
    id: prevStatusKeybindingKey,
    groupKey: "gtd",
    defaultValue: prevStatusKeybindingDefaultValue,
    label: { zh: "快捷键：切换到上一个状态" },
    value: useWritableComputedRef(prevStatusKeybinding),
    componentType: { type: "keybindingInput" },
  });

  watch(
    prevStatusKeybinding,
    (value, oldValue) => {
      moveProsemirrorKeybinding(value, oldValue, {
        run: () => {
          const taskQueue = useTaskQueue();
          taskQueue.addTask(() => {
            if (!parsedStatusTags.value) {
              // toast
              return;
            }
            const blocksContext = globalThis.getBlocksContext();
            const lastFocusContext = globalThis.getLastFocusContext();
            if (!blocksContext || !lastFocusContext) return;
            const view = lastFocusContext.lastFocusedEditorView.value;
            const blockId = lastFocusContext.lastFocusedBlockId.value;
            if (!(view instanceof PmEditorView) || !blockId) return;
            const statusLabels = Object.keys(parsedStatusTags.value);
            const statusTagIds = Object.values(parsedStatusTags.value);

            let currStatusNodeInfo: any = null;
            view.state.doc.content.descendants((node, pos) => {
              if (currStatusNodeInfo) return false;
              if (node.type.name === "blockRef_v2" && node.attrs.tag) {
                const index = statusTagIds.indexOf(node.attrs.toBlockId);
                if (index !== -1) {
                  currStatusNodeInfo = {
                    node,
                    pos,
                    index,
                  };
                  return false;
                }
              }
            });

            if (!currStatusNodeInfo) {
              // 在块末尾添加一个状态标签
              const tr = view.state.tr.insertText(" ", view.state.doc.content.size);
              tr.insert(
                tr.doc.content.size,
                pmSchema.nodes.blockRef_v2.create({
                  toBlockId: statusTagIds[statusTagIds.length - 1],
                  tag: true,
                }),
              );
              view.dispatch(tr);
              // 添加状态转换记录
              addTaskRecordWhenToggleStatus.value &&
                addStatusTransRecord(
                  {
                    from: "none",
                    to: statusLabels[statusLabels.length - 1],
                    timestamp: new Date(),
                  },
                  blockId,
                );
            } else {
              const pos = currStatusNodeInfo.pos;
              const toIndex =
                currStatusNodeInfo.index === 0
                  ? statusTagIds.length - 1
                  : currStatusNodeInfo.index - 1;
              const nextStatusId = statusTagIds[toIndex];
              const tr = view.state.tr.replaceRangeWith(
                pos,
                pos + 1,
                pmSchema.nodes.blockRef_v2.create({
                  toBlockId: nextStatusId,
                  tag: true,
                }),
              );
              view.dispatch(tr);
              // 添加状态转换记录
              addTaskRecordWhenToggleStatus.value &&
                addStatusTransRecord(
                  {
                    from: statusLabels[currStatusNodeInfo.index],
                    to: statusLabels[toIndex],
                    timestamp: new Date(),
                  },
                  blockId,
                );
            }
          });
          return true;
        },
        stopPropagation: true,
        preventDefault: true,
      });
    },
    { immediate: true },
  );

  const globalArchiveBlockIdKey = "gtd.globalArchiveBlockId";
  const globalArchiveBlockIdDefaultValue = "";
  const globalArchiveBlockId = useLocalStorage(
    globalArchiveBlockIdKey,
    globalArchiveBlockIdDefaultValue,
  );
  registerSettingItem({
    id: globalArchiveBlockIdKey,
    groupKey: "gtd",
    defaultValue: globalArchiveBlockIdDefaultValue,
    label: { zh: "全局归档块 ID" },
    desc: {
      zh: '归档时的操作如果是 "移动到全局归档块"，则需要先在这里指定全局归档的块 ID',
    },
    value: useWritableComputedRef(globalArchiveBlockId),
    componentType: { type: "textInput", validator: blockIdValidator },
  });

  // 添加状态转换记录
  const addStatusTransRecord = (record: StatusTransRecord, blockId: BlockId) => {
    const blocksContext = globalThis.getBlocksContext();
    if (!blocksContext) return;
    const { blocksManager, blockEditor } = blocksContext;
    const block = blocksManager.getBlock(blockId);
    if (!block) return;

    // 校验 statusTransRecordParentBlockId
    const recordsParentBlock = blocksManager.getBlock(statusTransRecordParentBlockId.value);
    if (!recordsParentBlock) return;

    const timestamp = dayjs(record.timestamp).format(timestampFormat.value);
    const recordContent = textContentFromString(
      `${timestamp} - from \"${record.from}\" to \"${record.to}\"`,
    );

    const taskQueue = useTaskQueue();
    for (const childBlockRef of block.childrenRefs) {
      const childBlock = childBlockRef.value;
      if (childBlock?.olinks.includes(recordsParentBlock.id)) {
        // append
        taskQueue.addTask(() => {
          const pos: BlockPos = {
            parentId: childBlock.id,
            childIndex: "last-space",
          };
          blockEditor.insertNormalBlock({
            pos,
            content: recordContent,
          });
        });
        return;
      }
    }
    // create
    taskQueue.addTask(() => {
      const pos1: BlockPos = {
        parentId: blockId,
        childIndex: "first",
      };
      const { newNormalBlockId } =
        blockEditor.insertNormalBlock({
          pos: pos1,
          content: textContentFromBlockRef(recordsParentBlock.id),
        }) ?? {};
      if (!newNormalBlockId) return;
      const pos2: BlockPos = {
        parentId: newNormalBlockId,
        childIndex: "last-space",
      };
      blockEditor.insertNormalBlock({
        pos: pos2,
        content: recordContent,
      });
    });
  };

  const getStatusTransRecords = (blockId: BlockId): StatusTransRecord[] => {
    const { blocksManager } = globalThis.getBlocksContext() ?? {};
    if (!blocksManager) return [];
    const block = blocksManager.getBlock(blockId);
    if (!block) return [];

    // 校验 statusTransRecordParentBlockId
    const recordsParentBlock = blocksManager.getBlock(statusTransRecordParentBlockId.value);
    if (!recordsParentBlock) return [];

    for (const childBlockRef of block.childrenRefs) {
      const childBlock = childBlockRef.value;
      if (childBlock?.olinks.includes(recordsParentBlock.id)) {
        const records = childBlock.childrenRefs
          .map((ref) => {
            const ctext = ref.value?.ctext;
            if (!ctext) return null;
            const match = ctext.match(/(.+?) - from \"(\w+)\" to \"(\w+)\"/);
            if (!match) return null;
            const timestamp = new Date(match[1]);
            if (isNaN(timestamp.getTime())) return null;
            return {
              from: match[2],
              to: match[3],
              timestamp,
            };
          })
          .filter((record): record is StatusTransRecord => !!record);
        return records;
      }
    }
    return [];
  };

  const ctx = {
    timestampFormat,
    ignoreRecordThreshold,
    statusTags,
    nextStatusKeybinding,
    statusTransRecordParentBlockId,
    parsedStatusTags,
    globalArchiveBlockId,
    getStatusTransRecords,
    addStatusTransRecord,
  };
  globalThis.getGtdContext = () => ctx;
  return ctx;
});

export default GtdContext;
