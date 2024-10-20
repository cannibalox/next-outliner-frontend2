import type { Component } from "vue";

export type HeaderButtonItem = {
  onClick?: () => void;
  icon: Component;
  label: string;
};

export type MoreOptionsItem = { onClick?: () => void; iconOnly?: boolean } & (
  | { itemComp: Component } // 指定 itemComp 组件
  | { icon: Component; label: string } // 或者指定 icon 和 label
);
