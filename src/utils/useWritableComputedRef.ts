import { computed, type Ref, type ShallowRef } from "vue";

const useWritableComputedRef = <T>(ref: Ref<T> | ShallowRef<T>) => {
  return computed({
    get: () => ref.value,
    set: (value: T) => {
      ref.value = value;
    },
  });
};

export default useWritableComputedRef;
