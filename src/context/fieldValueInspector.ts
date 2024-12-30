import type { BlockId } from "@/common/type-and-schemas/block/block-id";
import { createContext } from "@/utils/createContext";
import { ref } from "vue";

const FieldValueInspectorContext = createContext(() => {
  const open = ref(false);
  const blockId = ref<BlockId | undefined>(undefined);

  const openFieldValuesInspector = (blockId_: BlockId) => {
    open.value = true;
    blockId.value = blockId_;
  };

  return { open, blockId, openFieldValuesInspector };
});

export default FieldValueInspectorContext;
