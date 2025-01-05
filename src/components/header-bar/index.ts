import type { Component, FunctionalComponent, Ref } from "vue";

export type HeaderBarItemType = {
  onClick?: () => void;
  icon: FunctionalComponent;
  label: FunctionalComponent;
  active?: Ref<boolean>;
  disabled?: Ref<boolean>;
};
