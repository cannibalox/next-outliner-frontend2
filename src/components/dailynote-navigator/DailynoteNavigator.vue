<template>
  <Popover v-model:open="open">
    <PopoverTrigger>
      <slot />
    </PopoverTrigger>
    <PopoverContent class="p-0">
      <CalendarRoot v-slot="{ grid, weekDays }" class="p-3">
        <CalendarHeader>
          <CalendarPrevButton />
          <CalendarHeading />
          <CalendarNextButton />
        </CalendarHeader>

        <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
          <CalendarGrid v-for="month in grid" :key="month.value.toString()">
            <CalendarGridHead>
              <CalendarGridRow>
                <CalendarHeadCell v-for="day in weekDays" :key="day">
                  {{ day }}
                </CalendarHeadCell>
              </CalendarGridRow>
            </CalendarGridHead>
            <CalendarGridBody>
              <CalendarGridRow
                v-for="(weekDates, index) in month.rows"
                :key="`weekDate-${index}`"
                class="mt-2 w-full"
              >
                <CalendarCell
                  v-for="weekDate in weekDates"
                  :key="weekDate.toString()"
                  :date="weekDate"
                >
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <CalendarCellTrigger
                        :day="weekDate"
                        :month="month.value"
                        :data-disabled="hasDailyNote(weekDate) ? undefined : true"
                        @click.capture.prevent.stop="handleClickCell(weekDate.toDate())"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {{
                        !hasDailyNote(weekDate)
                          ? $t("kbView.dailynoteNavigator.noDailyNote")
                          : $t("kbView.dailynoteNavigator.gotoDailyNote")
                      }}
                    </TooltipContent>
                  </Tooltip>
                </CalendarCell>
              </CalendarGridRow>
            </CalendarGridBody>
          </CalendarGrid>
        </div>
      </CalendarRoot>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNextButton,
  CalendarPrevButton,
} from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BlockTreeContext from "@/context/blockTree";
import DailyNoteContext from "@/context/dailynote";
import dayjs from "dayjs";
import { CalendarRoot } from "radix-vue";
import { computed, ref } from "vue";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const { getDateToDailyNote, createDailyNote } = DailyNoteContext.useContext()!;
const { getBlockTree } = BlockTreeContext.useContext()!;

const open = ref(false);
const dateToDailyNote = computed(() => getDateToDailyNote());
const hasDailyNote = (date: Date) => {
  // XXX 这种比较是正确的吗
  const dateIsoString = dayjs(date).format("YYYY-MM-DD");
  return dateToDailyNote.value[dateIsoString] !== undefined;
};

const handleClickCell = (date: Date) => {
  const dateStr = dayjs(date).format("YYYY-MM-DD");
  const blockId = dateToDailyNote.value[dateStr];
  const tree = getBlockTree("main");
  if (!tree) return;
  if (blockId) {
    const di = tree.findDi((item) => item.type === "basic-block" && item.block.id === blockId);
    di && tree.focusDi(di.itemId);
  } else {
    createDailyNote(date);
  }
};
</script>
