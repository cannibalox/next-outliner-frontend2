<template>
  <Dialog class="importer" v-model:open="open">
    <DialogContent class="max-w-[340px]">
      <DialogHeader>
        <DialogTitle>导入</DialogTitle>
      </DialogHeader>
      <Input
        type="file"
        accept="application/json"
        :multiple="false"
        @change="handleFileChange"
      />
      <DialogFooter>
        <Button variant="outline" size="sm" @click="open = false">取消</Button>
        <Button type="submit"size="sm" :disabled="!file" @click="handleClick2">
          <template v-if="status === 'idle'">
            导入
          </template>
          <template v-else-if="status === 'importing'">
            <LoaderCircle class="size-4 mr-2 animate-spin" />
            正在导入...
          </template>
          <template v-else-if="status === 'success'">
            <Check class="size-4 mr-2" />
            导入成功
          </template>
          <template v-else>
            <X class="size-4 mr-2" />
            导入失败
          </template>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ref } from "vue";
import { LoaderCircle, Check, X } from "lucide-vue-next";
import { globalEnv } from "@/main";

const file = ref<File | null>(null);
const open = defineModel<boolean>("open");
const status = ref<"idle" | "importing" | "success" | "error">("idle");
const {importer} = globalEnv;

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    file.value = input.files[0];
  }
};

const handleClick2 = async () => {
  if (status.value === "idle") {
    if (!file.value) throw new Error("IMPOSSIBLE");
    status.value = "importing";
    try {
      const text = await file.value.text();
      const blocks = importer.parseV1Backup(text);
      await importer.importBlocks(blocks!);
      status.value = "success";
    } catch (err) {
      console.error(err);
      status.value = "error";
    }
  } else if (status.value === "error") {
    status.value = "idle";
  } else if (status.value === "success") {
    open.value = false;
  }
}
</script>
