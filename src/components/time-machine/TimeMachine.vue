<!-- <template>
  <Dialog v-model:open="timeMachineOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="flex items-center">
          <History class="size-5 mr-2" />
          时光机
        </DialogTitle>
      </DialogHeader>
      <div class="flex flex-col items-center">
        <div class="w-full pt-2 pb-4">
          <div v-if="savePoints.length === 0" class="text-center italic text-muted-foreground py-8">
            没有找到任何存档，也许你想先创建一个？
          </div>
          <div
            v-else
            v-for="(savePoint, index) in savePoints"
            :key="index"
            class="w-full flex items-center justify-between g"
          >
            <div>{{ savePoint.label }}</div>
            <div>{{ savePoint.createdAt }}</div>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent> 更多 </TooltipContent>
                  </Tooltip>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <template v-for="(button, index) in moreButtons" :key="index">
                    <DropdownMenuItem @click="button.onClick">
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <div class="flex items-center">
                            <component
                              :is="button.icon"
                              class="size-5 stroke-[1.8] mr-3"
                            ></component>
                            {{ button.label }}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {{ button.label }}
                        </TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenu>

              <template v-for="(button, index) in buttons" :key="index">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button variant="ghost" size="icon" @click="button.onClick">
                      <component :is="button.icon" class="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {{ button.label }}
                  </TooltipContent>
                </Tooltip>
              </template>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" class="w-[150px]">
          <Plus class="size-4 mr-2" />
          创建新存档
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="tsx">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Plus, MoreHorizontal, RotateCcw, Trash, Eye, ChartPie } from "lucide-vue-next";
import { ref } from "vue";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import TimeMachineContext from "@/context/timeMachine";

const { timeMachineOpen } = TimeMachineContext.useContext()!;

const buttons = [
  {
    icon: RotateCcw,
    label: "恢复到此存档",
    onClick: () => {},
  },
  {
    icon: () => <Trash class="size-4 stroke-red-500" />,
    label: "删除此存档",
    onClick: () => {},
  },
];

const moreButtons = [
  {
    icon: ChartPie,
    label: "存档统计数据",
    onClick: () => {},
  },
  {
    icon: Eye,
    label: "浏览存档",
    onClick: () => {},
  },
];

const savePoints = ref<SavePoint[]>([
  {
    schema: "v2",
    blockInfos: {},
    blockDataDocs: [],
    label: "存档 1",
    createdAt: new Date("2024-10-22 10:00:00"),
  },
  {
    schema: "v2",
    blockInfos: {},
    blockDataDocs: [],
    label: "存档 2",
    createdAt: new Date("2024-10-12 10:00:00"),
  },
]);
</script> -->
