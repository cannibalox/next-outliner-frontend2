import { defineModule } from "@/common/module";
import { AsyncTaskQueue } from "@/common/taskQueue";

/**
 * 全局任务队列
 */
export const taskQueue = defineModule(
  "taskQueue",
  {},
  () => new AsyncTaskQueue(),
);