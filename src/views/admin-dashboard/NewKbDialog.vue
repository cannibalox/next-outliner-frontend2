<template>
  <Dialog v-model:open="open">
    <DialogTrigger asChild>
      <slot />
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ $t("adminDashboard.kbManagement.newKbDialog.title") }}</DialogTitle>
        <DialogDescription>
          {{ $t("adminDashboard.kbManagement.newKbDialog.description") }}
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <label for="name" class="text-right">
            {{ $t("adminDashboard.kbManagement.newKbDialog.nameLabel") }}
          </label>
          <Input
            id="name"
            v-model="name"
            class="col-span-3"
            :placeholder="$t('adminDashboard.kbManagement.newKbDialog.namePlaceholder')"
          />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <label for="location" class="text-right">
            {{ $t("adminDashboard.kbManagement.newKbDialog.locationLabel") }}
          </label>
          <Input
            id="location"
            v-model="location"
            class="col-span-3"
            :placeholder="$t('adminDashboard.kbManagement.newKbDialog.locationPlaceholder')"
          />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <label for="password" class="text-right">
            {{ $t("adminDashboard.kbManagement.newKbDialog.passwordLabel") }}
          </label>
          <Input
            id="password"
            v-model="password"
            type="password"
            class="col-span-3"
            :placeholder="$t('adminDashboard.kbManagement.newKbDialog.passwordPlaceholder')"
          />
        </div>
      </div>
      <DialogFooter class="flex gap-2">
        <Button variant="outline" @click="handleCancel">
          {{ $t("adminDashboard.kbManagement.newKbDialog.cancelBtn") }}
        </Button>
        <Button type="submit" @click="handleSubmit" :disabled="status === 'creating'">
          <Loader2 v-if="status === 'creating'" class="size-4 mr-2 animate-spin" />
          <Check v-else-if="status === 'createSuccess'" class="size-4 mr-2" />
          <X v-else-if="status === 'createFailed'" class="size-4 mr-2" />
          {{ $t(`adminDashboard.kbManagement.newKbDialog.createBtn.${status}`) }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createKb } from "@/common/api-call/kb";
import { Loader2, Check, X } from "lucide-vue-next";

const open = ref(false);
const name = ref("");
const location = ref("");
const password = ref("");
const status = ref<"idle" | "creating" | "createSuccess" | "createFailed">("idle");

const resetState = () => {
  name.value = "";
  location.value = "";
  password.value = "";
  status.value = "idle";
};

async function handleSubmit() {
  if (status.value === "creating") return;
  if (status.value === "createSuccess" || status.value === "createFailed") {
    status.value = "idle";
    return;
  }
  status.value = "creating";
  const res = await createKb({
    name: name.value,
    location: location.value,
    password: password.value,
  });
  if (res.success) {
    status.value = "createSuccess";
    setTimeout(() => {
      resetState();
      open.value = false;
    }, 1000);
  } else {
    status.value = "createFailed";
    setTimeout(() => {
      resetState();
      open.value = false;
    }, 1000);
  }
}

function handleCancel() {
  resetState();
  open.value = false;
}
</script>
