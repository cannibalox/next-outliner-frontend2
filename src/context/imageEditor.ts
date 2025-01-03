import { createContext } from "@/utils/createContext";
import { ref } from "vue";

const ImageEditorContext = createContext(() => {
  const open = ref(true);
  const imageUrl = ref<string | null>(
    "https://letsenhance.io/static/8f5e523ee6b2479e26ecc91b9c25261e/1015f/MainAfter.jpg",
  );
  const deleteOriginal = ref(false);

  const ctx = {
    open,
    imageUrl,
    deleteOriginal,
  };
  globalThis.getImageEditorContext = () => ctx;
  return ctx;
});

export default ImageEditorContext;
