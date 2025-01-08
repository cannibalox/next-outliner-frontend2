import { createContext } from "@/utils/createContext";
import SettingsContext from "./settings";
import { useLocalStorage } from "@vueuse/core";
import useWritableComputedRef from "@/utils/useWritableComputedRef";
import IndexContext from ".";
import BlocksContext from "./blocks/blocks";
import { watch } from "vue";
import { INTERNAL_BLOCK_PARENT_ID } from "./blocks/view-layer/blocksManager";
import { contentNodesToPmNode, plainTextToTextContent } from "@/utils/pm";
import dayjs from "dayjs";
import { useToast } from "@/components/ui/toast/use-toast";
import { useI18n } from "vue-i18n";
import { useTaskQueue } from "@/plugins/taskQueue";
import BlockTreeContext from "./blockTree";
import { getPmSchema } from "@/components/prosemirror/pmSchema";

const DAILY_NOTE_TAG = "day";

const DailyNoteContext = createContext(() => {
  const { registerSettingGroup, registerSettingItem } = SettingsContext.useContext()!;
  const { getBacklinks } = IndexContext.useContext()!;
  const { blocksManager, blockEditor, synced } = BlocksContext.useContext()!;
  const { toast } = useToast();
  const { t } = useI18n();
  const taskQueue = useTaskQueue();
  const { getBlockTree } = BlockTreeContext.useContext()!;

  // 确保存在 day 块可以用作标签
  // TODo: 只执行一次添加
  watch(
    synced,
    (newValue, oldValue) => {
      // not synced -> synced
      if (!oldValue && newValue) {
        const schema = getPmSchema({ getBlockRef: blocksManager.getBlockRef });
        const dayBlock = blocksManager.getBlock("day");
        if (dayBlock) return;
        const tr = blocksManager.createBlockTransaction({ type: "ui" });
        tr.addBlock({
          id: "day",
          type: "normalBlock",
          fold: false,
          parentId: INTERNAL_BLOCK_PARENT_ID,
          childrenIds: [],
          content: plainTextToTextContent("Day", schema),
          metadata: {},
        });
        tr.commit();
      }
    },
    { immediate: true },
  );

  const blockIdValidator = (value: string) => {
    if (!value) return "没有指定块 ID";
    const block = blocksManager.getBlock(value);
    return block ? undefined : "无效的块 ID";
  };

  registerSettingGroup({
    key: "dailynote",
    label: { zh: "每日笔记" },
  });

  const defaultDateFormatKey = "dailynote.defaultDateFormat";
  const defaultDateFormatDefaultValue = "YYYY-MM-DD";
  const defaultDateFormat = useLocalStorage(defaultDateFormatKey, defaultDateFormatDefaultValue);
  registerSettingItem({
    id: defaultDateFormatKey,
    groupKey: "dailynote",
    defaultValue: defaultDateFormatDefaultValue,
    label: { zh: "默认日期格式" },
    desc: { zh: "创建新的每日笔记时，默认使用的日期格式" },
    value: useWritableComputedRef(defaultDateFormat),
    componentType: { type: "textInput" },
  });

  const parentBlockOfNewDailyNoteKey = "dailynote.parentBlockOfNewDailyNote";
  const parentBlockOfNewDailyNoteDefaultValue = "";
  const parentBlockOfNewDailyNote = useLocalStorage(
    parentBlockOfNewDailyNoteKey,
    parentBlockOfNewDailyNoteDefaultValue,
  );
  registerSettingItem({
    id: parentBlockOfNewDailyNoteKey,
    groupKey: "dailynote",
    defaultValue: parentBlockOfNewDailyNoteDefaultValue,
    label: { zh: "每日笔记的存放位置" },
    desc: { zh: "创建的新每日笔记将会放到这个块下（作为子块）" },
    value: useWritableComputedRef(parentBlockOfNewDailyNote),
    componentType: { type: "blockIdInput" },
  });

  const getAllDailyNotes = () => {
    const dailyNotes = getBacklinks(DAILY_NOTE_TAG, "tag");
    return [...dailyNotes];
  };

  const getDateToDailyNote = () => {
    const dailyNotes = getAllDailyNotes();
    const dates = {} as Record<string, string>;
    for (const blockId of dailyNotes) {
      const block = blocksManager.getBlock(blockId);
      if (!block) continue;
      const date = dayjs(block.ctext).format("YYYY-MM-DD");
      dates[date] = blockId;
    }
    return dates;
  };

  const createDailyNote = (date: Date) => {
    const main = getBlockTree("main");
    if (!main) return;
    const dateToDailyNote = getDateToDailyNote();
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const schema = getPmSchema({ getBlockRef: blocksManager.getBlockRef });
    // 如果已经存在，则不创建
    if (dateToDailyNote[dateStr]) return;
    // 否则创建
    if (!parentBlockOfNewDailyNote.value) {
      toast({
        title: t("kbView.dailynoteNavigator.dontKnowWhereToCreate.title"),
        description: t("kbView.dailynoteNavigator.dontKnowWhereToCreate.desc"),
      });
      return;
    }
    taskQueue.addTask(async () => {
      const { newNormalBlockId } =
        blockEditor.insertNormalBlock({
          pos: {
            parentId: parentBlockOfNewDailyNote.value,
            childIndex: "first",
          },
          content: contentNodesToPmNode([
            schema.text(dateStr + " "),
            schema.nodes.blockRef_v2.create({ toBlockId: "day", tag: true }),
          ]),
        }) ?? {};
      if (newNormalBlockId) {
        await main.nextUpdate();
        main.focusBlock(newNormalBlockId, { highlight: true, expandIfFold: true });
      }
    });
  };

  const ctx = {
    defaultDateFormat,
    parentBlockOfNewDailyNote,
    getAllDailyNotes,
    getDateToDailyNote,
    createDailyNote,
  };
  return ctx;
});

export default DailyNoteContext;
