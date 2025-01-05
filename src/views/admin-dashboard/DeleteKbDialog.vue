<template>
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger asChild>
      <slot />
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ $t("adminDashboard.kbManagement.deleteKbDialog.title") }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{
            $t("adminDashboard.kbManagement.deleteKbDialog.description", {
              location: props.location,
              name: props.name,
            })
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="status === 'deleting'">
          {{ $t("adminDashboard.kbManagement.deleteKbDialog.cancelBtn") }}
        </AlertDialogCancel>
        <Button variant="destructive" :disabled="status === 'deleting'" @click="handleDelete">
          <Loader2 v-if="status === 'deleting'" class="size-4 mr-2 animate-spin" />
          <Check v-else-if="status === 'deleteSuccess'" class="size-4 mr-2" />
          <X v-else-if="status === 'deleteFailed'" class="size-4 mr-2" />
          {{ $t(`adminDashboard.kbManagement.deleteKbDialog.status.${status}`) }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteKb } from "@/common/api-call/kb";
import { Check, Loader2, Trash2, X } from "lucide-vue-next";

const props = defineProps<{
  location: string;
  name: string;
}>();
const open = ref(false);
const status = ref<"idle" | "deleting" | "deleteSuccess" | "deleteFailed">("idle");

async function handleDelete() {
  if (status.value === "deleting") return;
  if (status.value === "deleteSuccess" || status.value === "deleteFailed") {
    status.value = "idle";
    return;
  }

  status.value = "deleting";
  const res = await deleteKb({ location: props.location });
  if (res.success) {
    status.value = "deleteSuccess";
    setTimeout(() => {
      status.value = "idle";
      open.value = false;
    }, 1000);
  } else {
    status.value = "deleteFailed";
    setTimeout(() => {
      status.value = "idle";
      open.value = false;
    }, 1000);
  }
}
</script>
