// import { createContext } from "@/utils/createContext";
// import { ref, computed, type FunctionalComponent } from "vue";

// export type ContextualCommand = {
//   icon?: FunctionalComponent;
//   label: FunctionalComponent;
  
// };

// export const PopoutCommandPickerContext = createContext(() => {
//   const showPos = ref<{ x: number; y: number } | null>(null);
//   const open = computed({
//     get: () => showPos.value !== null,
//     set: (val) => !val && (showPos.value = null),
//   });
//   const focusItemIndex = ref<number>(0);
//   const suggestions = ref<ContextualCommand[]>([]);
//   const suppressMouseOver = ref(false);

//   return {
//     showPos,
//     open,
//     focusItemIndex,
//     suggestions,
//     suppressMouseOver,
//   };
// });
