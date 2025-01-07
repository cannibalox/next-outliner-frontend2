import { createContext } from "@/utils/createContext";
import { useLocalStorage } from "@vueuse/core";
import { computed, ref } from "vue";
import SettingsContext from "./settings";
import useWritableComputedRef from "@/utils/useWritableComputedRef";

export const TimeMachineContext = createContext(() => {
  const { registerSettingItem, registerSettingGroup } = SettingsContext.useContext()!;

  registerSettingGroup({
    key: "timeMachine",
    label: {
      zh: "时光机",
    },
  });

  const timeMachineOpen = ref(false);

  const autoBackupDefaultValue = {
    hourly: 1 as number | null,
    daily: 1 as number | null,
    weekly: 1 as number | null,
  };
  const autoBackupId = `timeMachine.autoBackup`;
  const autoBackupInterval = useLocalStorage(autoBackupId, autoBackupDefaultValue);

  const autoBackupKeepNumberDefaultValue = {
    hourly: 10 as number | null,
    daily: 10 as number | null,
    weekly: 10 as number | null,
  };
  const autoBackupKeepNumberId = `timeMachine.autoBackupKeepNumber`;
  const autoBackupKeepNumber = useLocalStorage(
    autoBackupKeepNumberId,
    autoBackupKeepNumberDefaultValue,
  );

  registerSettingItem({
    id: autoBackupId + "weekly",
    groupKey: "timeMachine",
    label: {
      zh: "每几周自动生成存档",
    },
    defaultValue: autoBackupDefaultValue.weekly,
    value: computed({
      get: () => autoBackupInterval.value.weekly,
      set: (value) => (autoBackupInterval.value.weekly = value),
    }),
    componentType: {
      type: "integerInput",
    },
  });

  registerSettingItem({
    id: autoBackupKeepNumberId + "weekly",
    groupKey: "timeMachine",
    label: {
      zh: "最多保留几份每周自动备份",
    },
    desc: {
      zh: "如果每周备份数量达到此值，则删除最早的备份。",
    },
    defaultValue: autoBackupKeepNumberDefaultValue.weekly,
    value: computed({
      get: () => autoBackupKeepNumber.value.hourly,
      set: (value) => (autoBackupKeepNumber.value.hourly = value),
    }),
    componentType: {
      type: "integerInput",
    },
  });

  registerSettingItem({
    id: autoBackupId + "daily",
    groupKey: "timeMachine",
    label: {
      zh: "每几日自动生成存档",
    },
    defaultValue: autoBackupDefaultValue.daily,
    value: computed({
      get: () => autoBackupInterval.value.daily,
      set: (value) => (autoBackupInterval.value.daily = value),
    }),
    componentType: {
      type: "integerInput",
    },
  });

  registerSettingItem({
    id: autoBackupKeepNumberId + "daily",
    groupKey: "timeMachine",
    label: {
      zh: "最多保留几份每日自动备份",
    },
    desc: {
      zh: "如果每日备份数量达到此值，则删除最早的备份。",
    },
    defaultValue: autoBackupKeepNumberDefaultValue.daily,
    value: computed({
      get: () => autoBackupKeepNumber.value.daily,
      set: (value) => (autoBackupKeepNumber.value.daily = value),
    }),
    componentType: {
      type: "integerInput",
    },
  });

  registerSettingItem({
    id: autoBackupId + "hourly",
    groupKey: "timeMachine",
    label: {
      zh: "每几小时自动生成存档",
    },
    defaultValue: autoBackupDefaultValue.hourly,
    value: computed({
      get: () => autoBackupInterval.value.hourly,
      set: (value) => (autoBackupInterval.value.hourly = value),
    }),
    componentType: {
      type: "integerInput",
    },
  });

  registerSettingItem({
    id: autoBackupKeepNumberId + "hourly",
    groupKey: "timeMachine",
    label: {
      zh: "最多保留几份每小时自动备份",
    },
    desc: {
      zh: "如果每小时备份数量达到此值，则删除最早的备份。",
    },
    defaultValue: autoBackupKeepNumberDefaultValue.hourly,
    value: computed({
      get: () => autoBackupKeepNumber.value.hourly,
      set: (value) => (autoBackupKeepNumber.value.hourly = value),
    }),
    componentType: {
      type: "integerInput",
    },
  });

  const inactiveThresholdDefaultValue = 30;
  const inactiveThresholdId = `timeMachine.inactiveThreshold`;
  const inactiveThreshold = useLocalStorage(inactiveThresholdId, inactiveThresholdDefaultValue);
  registerSettingItem({
    id: inactiveThresholdId,
    groupKey: "timeMachine",
    label: {
      zh: "不活跃检测阈值",
    },
    desc: {
      zh: "如果一段时间无操作，则会自动生成不活跃归档。此值控制多久无操作算不活跃，单位：秒。",
    },
    defaultValue: inactiveThresholdDefaultValue,
    value: useWritableComputedRef(inactiveThreshold),
    componentType: {
      type: "integerInput",
    },
  });

  return {
    timeMachineOpen,
  };
});

export default TimeMachineContext;
