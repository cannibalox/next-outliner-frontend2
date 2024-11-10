import { useEventBus } from "@/plugins/eventbus";
import { createContext } from "@/utils/createContext";
import { useLocalStorage } from "@vueuse/core";
import { nanoid } from "nanoid";
import { ref } from "vue";

type PomodoroHistoryItem = {
  startTime: number;
  duration: number;
};

export const PomodoroContext = createContext(() => {
  const showPomodoro = ref(false);
  const currentState = ref<{
    phase: "work" | "rest";
    startTime: number;
    timeLeft: number;
    timerId1: number; // 用于定时切换到下一阶段
    timerId2: number; // 用于倒计时，更新 timeLeft
  } | null>(null);
  const pomodoroHistory = useLocalStorage<PomodoroHistoryItem[]>("pomodoroHistory", []);

  const recordHistory = () => {
    // 如果番茄钟持续时间超过 30s，则记录历史
    const actualDuration = Date.now() - currentState.value!.startTime;
    if (actualDuration > 30 * 1000) {
      pomodoroHistory.value.push({
        startTime: currentState.value!.startTime,
        duration: actualDuration / 1000, // in seconds
      });
    }
  }

  const nextPhase = () => {
    // 清除当前的定时器
    if (currentState.value) {
      clearTimeout(currentState.value.timerId1);
      clearInterval(currentState.value.timerId2);
    }

    if (!currentState.value || currentState.value.phase === "rest") {
      // 进入工作阶段
      const duration = 25 * 60; // in seconds
      const timerId1 = setTimeout(nextPhase, duration * 1000) as unknown as number;
      const timerId2 = setInterval(() => {
        if (currentState.value) {
          if (currentState.value.timeLeft > 0) {
            currentState.value.timeLeft -= 1;
          }
        }
      }, 1000) as unknown as number;
      currentState.value = {
        phase: "work",
        startTime: Date.now(),
        timeLeft: duration,
        timerId1: timerId1,
        timerId2: timerId2,
      };
    } else if (currentState.value.phase === "work") {
      recordHistory();

      // 进入休息阶段
      const newDuration = 5 * 60; // in seconds
      const timerId1 = setTimeout(nextPhase, newDuration * 1000) as unknown as number;
      const timerId2 = setInterval(() => {
        if (currentState.value) {
          if (currentState.value.timeLeft > 0) {
            currentState.value.timeLeft -= 1;
          }
        }
      }, 1000) as unknown as number;
      currentState.value = {
        phase: "rest",
        startTime: Date.now(),
        timeLeft: newDuration,
        timerId1: timerId1,
        timerId2: timerId2,
      };
    }
  }

  const stop = () => {
    if (currentState.value) {
      if (currentState.value.phase === "work") recordHistory();

      clearTimeout(currentState.value.timerId1);
      clearInterval(currentState.value.timerId2);
      currentState.value = null;
    }
  }

  return {
    showPomodoro,
    stop,
    nextPhase,
    currentState,
    pomodoroHistory,
  };
});
