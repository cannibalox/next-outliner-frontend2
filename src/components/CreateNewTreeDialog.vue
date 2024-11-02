<template>
  <AlertDialog v-model:open="show">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle> 创建新知识树 </AlertDialogTitle>
        <AlertDialogDescription>
          没有找到已有知识树，是否要创建一个新知识树？
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel @click="show = false">取消</AlertDialogCancel>
          <AlertDialogAction @click="() => {
            blocksManager.ensureTree();
            show = false;
          }">创建</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogHeader>
    </AlertDialogContent>
  </AlertDialog>
</template>

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
} from "@/components/ui/alert-dialog";
import { globalEnv } from "@/main";
import { onMounted, ref } from "vue";

const show = ref(false);
const { globalUiVars, blocksManager } = globalEnv;

onMounted(() => {
  globalUiVars.registerCreateNewTreeDialog({
    open: () => show.value = true,
  });
});
</script>
