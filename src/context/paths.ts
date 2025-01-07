import { createContext } from "@/utils/createContext";
import ServerInfoContext from "./serverInfo";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { joinPathSegments } from "@/common/helper-functions/path";

const PathsContext = createContext(() => {
  const { serverUrl } = ServerInfoContext.useContext()!;
  const route = useRoute();

  const dbBasePath = computed(() => route.params.location as string);
  const attachmentsFolderName = ref("attachments");
  const attachmentsBasePath = computed(() =>
    joinPathSegments([dbBasePath.value, attachmentsFolderName.value]),
  );

  const ctx = {
    dbBasePath,
    attachmentsFolderName,
    attachmentsBasePath,
  };
  return ctx;
});

export default PathsContext;
