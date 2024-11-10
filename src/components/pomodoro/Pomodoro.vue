<template>
  <Popover>
    <PopoverTrigger>
      <div class="flex items-center justify-center px-2 gap-x-2">
        <slot />
        <div v-if="currentState" class="font-normal text-base">
          {{ formattedRestTime }}
        </div>
      </div>
    </PopoverTrigger>
    <PopoverContent class="p-2 w-[250px] mt-">
      <div class="flex items-center justify-center text-3xl font-bold pt-3">
        {{ formattedRestTime }}
      </div>
      <div class="text-center text-sm text-muted-foreground pt-1 pb-4">
        <span v-if="currentState?.phase === 'work'" class="text-blue-500">{{
          $t("kbView.pomodoro.working")
        }}</span>
        <span v-else-if="currentState?.phase === 'rest'" class="text-green-700">{{
          $t("kbView.pomodoro.resting")
        }}</span>
      </div>
      <div class="flex items-center justify-center gap-x-2">
        <Button variant="outline" size="sm" class="flex-grow" @click="nextPhase">
          <Play v-if="!currentState" class="size-4 mr-2" />
          <FastForward v-else-if="currentState.phase === 'rest'" class="size-4 mr-2" />
          <Pause v-else class="size-4 mr-2" />
          {{
            !currentState || currentState.phase === "rest"
              ? $t("kbView.pomodoro.startWorking")
              : $t("kbView.pomodoro.startResting")
          }}
        </Button>
        <Button
          v-if="currentState"
          class="flex-grow !text-red-500"
          variant="outline"
          size="sm"
          @click="stop"
        >
          <Square class="size-4 mr-2" />
          {{ $t("kbView.pomodoro.stop") }}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { PomodoroContext } from "@/context/pomodoro";
import { FastForward, Pause, Play, Square } from "lucide-vue-next";
import { computed } from "vue";

const { stop, nextPhase, currentState, pomodoroHistory } = PomodoroContext.useContext();
const formattedRestTime = computed(() => {
  return !currentState.value
    ? "25:00"
    : `${Math.floor(currentState.value.timeLeft / 60)
        .toString()
        .padStart(2, "0")}:${(currentState.value.timeLeft % 60).toString().padStart(2, "0")}`;
});
</script>
