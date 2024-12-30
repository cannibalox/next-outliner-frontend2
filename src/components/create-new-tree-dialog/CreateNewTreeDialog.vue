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
import BlocksContext from "@/context/blocks/blocks";
import CreateNewTreeDialogContext from "@/context/createNewTreeDialog";

const { blocksManager } = BlocksContext.useContext();
const { open, status, closeCreateNewTreeDialog } = CreateNewTreeDialogContext.useContext();

const createNewTree = async () => {
  status.value = "creating";
  try {
    if (blocksManager.getRootBlockRef().value != null) {
      status.value = "done";
      setTimeout(closeCreateNewTreeDialog, 1000);
      return;
    }
    await blocksManager.createNewTree();
    status.value = "done";
    setTimeout(closeCreateNewTreeDialog, 1000);
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
          {{ $t("kbView.createNewTreeDialog.title") }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t("kbView.createNewTreeDialog.description") }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="status === 'creating'" @click="closeCreateNewTreeDialog">
          {{ $t("kbView.createNewTreeDialog.cancelBtn") }}
        </AlertDialogCancel>
        <AlertDialogAction :disabled="status === 'creating'" @click="createNewTree">
          <template v-if="status === 'waiting'">
            {{ $t("kbView.createNewTreeDialog.confirmBtn") }}
          </template>
          <template v-else-if="status === 'creating'">
            <Loader2 class="size-4 mr-2 animate-spin" />
            {{ $t("kbView.createNewTreeDialog.creating") }}
          </template>
          <template v-else-if="status === 'done'">
            <Check class="size-4 mr-2" />
            {{ $t("kbView.createNewTreeDialog.done") }}
          </template>
          <template v-else-if="status === 'failed'">
            <X class="size-4 mr-2" />
            {{ $t("kbView.createNewTreeDialog.failed") }}
          </template>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
