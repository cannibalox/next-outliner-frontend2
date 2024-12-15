<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui/alert-dialog";
import { Check, Loader2, X } from "lucide-vue-next";
import BlocksContext from "@/context/blocks-provider/blocks";
import { textContentFromString } from "@/utils/pm";
import LastFocusContext from "@/context/lastFocus";
import PasteDialogContext from "@/context/pasteDialog";
import { useTaskQueue } from "@/plugins/taskQueue";
import { computed } from "vue";

const { blocksManager, blockEditor } = BlocksContext.useContext();
const { lastFocusedBlockId } = LastFocusContext.useContext();
const { open, status, content, closePasteDialog } = PasteDialogContext.useContext();
const taskQueue = useTaskQueue();

// 计算统计信息
const stats = computed(() => {
  const lines = content.value.split(/\r?\n/).filter((line) => line.trim());
  const charCount = content.value.length;
  const blockCount = lines.length;
  return {
    charCount,
    blockCount,
  };
});

const paste = async () => {
  if (!lastFocusedBlockId.value) return;

  status.value = "pasting";
  try {
    const lines = content.value.split(/\r?\n/).filter((line) => line.trim());
    const total = lines.length;

    // 处理第一行
    await taskQueue.addTask(() => {
      const tr = blocksManager.createBlockTransaction();
      const blockId = lastFocusedBlockId.value!;
      blockEditor.changeBlockContent({
        blockId,
        content: textContentFromString(lines[0]),
        tr,
        commit: false,
      });
      tr.commit();
    });

    // 处理剩余行
    if (lines.length > 1) {
      const remainingLines = lines.slice(1);
      await taskQueue.addTask(() => {
        const tr = blocksManager.createBlockTransaction();
        blockEditor.insertNormalBlocks({
          pos: {
            baseBlockId: lastFocusedBlockId.value!,
            offset: 1, // 从第一行后开始插入
          },
          blocks: remainingLines.map((line) => ({
            content: textContentFromString(line),
          })),
          tr,
          commit: false,
        });
        tr.commit();
      });
    }

    status.value = "done";
    setTimeout(closePasteDialog, 1000);
  } catch (err) {
    console.error(err);
    status.value = "failed";
  }
};
</script>

<template>
  <AlertDialog :open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ $t("kbView.pasteDialog.title") }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{
            $t("kbView.pasteDialog.description", {
              blockCount: stats.blockCount,
              charCount: stats.charCount,
            })
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="status === 'pasting'" @click="closePasteDialog">
          {{ $t("kbView.pasteDialog.cancelBtn") }}
        </AlertDialogCancel>
        <AlertDialogAction :disabled="status === 'pasting'" @click="paste">
          <template v-if="status === 'waiting'">
            {{ $t("kbView.pasteDialog.confirmBtn") }}
          </template>
          <template v-else-if="status === 'pasting'">
            <Loader2 class="size-4 mr-2 animate-spin" />
            {{ $t("kbView.pasteDialog.pasting") }}
          </template>
          <template v-else-if="status === 'done'">
            <Check class="size-4 mr-2" />
            {{ $t("kbView.pasteDialog.done") }}
          </template>
          <template v-else-if="status === 'failed'">
            <X class="size-4 mr-2" />
            {{ $t("kbView.pasteDialog.failed") }}
          </template>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
