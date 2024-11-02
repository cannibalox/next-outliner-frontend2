import { AsyncTaskQueue } from "@/common/taskQueue";
import { inject, type App } from "vue";

export const useTaskQueue = () => {
  return globalTaskQueue;
}

const globalTaskQueue = new AsyncTaskQueue();

export const taskQueuePlugin = {
  install(app: App) {
    app.provide("taskQueue", globalTaskQueue);
  }
}