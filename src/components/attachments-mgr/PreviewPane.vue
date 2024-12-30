<template>
  <div class="flex items-center justify-center flex-grow">
    <div v-if="activeDirent" class="flex flex-col items-center text-muted-foreground gap-y-6">
      <!-- Preview -->
      <template v-if="activePathInfo && activePathInfo.isPreview">
        <!-- Image preview -->
        <template v-if="activePathInfo.isImage && previewingImage">
          <ImagePreviewPane
            :image="previewingImage"
            @close="handleTogglePreview"
            @insertImage="handleInsertImage(activePathInfo.relativePath)"
            @download="handleDownload(activePathInfo.absolutePath)"
            @reference="handleInsertPathRef(activePathInfo.relativePath)"
            @delete="handleDelete(activePathInfo.absolutePath)"
          />
        </template>
      </template>

      <!-- Dirent basic info and actions -->
      <template v-else-if="activePathInfo">
        <component :is="icon" class="size-20" />
        <div class="text-sm break-all px-8">
          {{ activePathInfo.fileNameAndExtname }}
        </div>
        <div class="flex items-center justify-center flex-wrap gap-2">
          <!-- For image, only show preview and insert image button, hide other buttons in dropdown -->
          <template v-if="activePathInfo.isImage">
            <Button variant="outline" size="sm" @click="handleTogglePreview">
              <Eye class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.openPreview") }}
            </Button>

            <Button
              variant="outline"
              size="sm"
              @click="handleInsertImage(activePathInfo.relativePath)"
            >
              <ImageIcon class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.insertImage") }}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="sm" class="size-9 p-0">
                  <MoreHorizontal class="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Info class="size-4 mr-2" />
                  {{ $t("kbView.attachmentsManager.previewPane.info") }}
                </DropdownMenuItem>
                <DropdownMenuItem @click="handleDownload(activeDirent.path)">
                  <Download class="size-4 mr-2" />
                  {{ $t("kbView.attachmentsManager.previewPane.download") }}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link2 class="size-4 mr-2" />
                  {{ $t("kbView.attachmentsManager.previewPane.reference") }}
                </DropdownMenuItem>
                <DropdownMenuItem class="!text-red-500" @click="handleDelete(activeDirent.path)">
                  <Trash2 class="size-4 mr-2" />
                  {{ $t("kbView.attachmentsManager.previewPane.delete") }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </template>

          <!-- For other previewable files, only show preview and download button, hide other buttons in dropdown -->
          <template v-else-if="canPreview">
            <Button variant="outline" size="sm" @click="handleTogglePreview">
              <Eye class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.openPreview") }}
            </Button>

            <Button variant="outline" size="sm" @click="handleDownload(activeDirent.path)">
              <Download class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.download") }}
            </Button>

            <Button
              variant="outline"
              size="sm"
              @click="handleInsertPathRef(activePathInfo.relativePath)"
            >
              <Link2 class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.pathReference") }}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="sm" class="size-9 p-0">
                  <MoreHorizontal class="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Info class="size-4 mr-2" />
                  {{ $t("kbView.attachmentsManager.previewPane.info") }}
                </DropdownMenuItem>
                <DropdownMenuItem @click="handleDownload(activeDirent.path)">
                  <Link2 class="size-4 mr-2" />
                  {{ $t("kbView.attachmentsManager.previewPane.reference") }}
                </DropdownMenuItem>
                <DropdownMenuItem class="!text-red-500" @click="handleDelete(activeDirent.path)">
                  <Trash2 class="size-4 mr-2" />
                  {{ $t("kbView.attachmentsManager.previewPane.delete") }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </template>

          <template v-else>
            <Button
              variant="outline"
              size="sm"
              @click="handleInsertPathRef(activePathInfo.relativePath)"
            >
              <Link2 class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.pathReference") }}
            </Button>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import AttachmentsManagerContext from "@/context/attachmentsManager";
import { computed } from "vue";
import {
  File,
  Folder,
  Eye,
  Download,
  Link2,
  ImageIcon,
  Loader2,
  X,
  MoreHorizontal,
  Trash2,
  Info,
} from "lucide-vue-next";
import Audio from "@/components/icons/Audio.vue";
import Compressed from "@/components/icons/Compressed.vue";
import Image from "@/components/icons/Image.vue";
import Pdf from "@/components/icons/Pdf.vue";
import Word from "@/components/icons/Word.vue";
import { Button } from "@/components/ui/button";
import BlocksContext from "@/context/blocks/blocks";
import LastFocusContext from "@/context/lastFocus";
import { EditorView as PMEditorView } from "prosemirror-view";
import { EditorView as CMEditorView } from "@codemirror/view";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { useTaskQueue } from "@/plugins/taskQueue";
import type { BlockPosSiblingOffset } from "@/context/blocks/view-layer/blocksEditor";
import type { ImageContent } from "@/common/types";
import { autoRetryGet } from "@/utils/auto-retry";
import { fsGetAttachmentSignedUrl } from "@/common/api/fs";
import ServerInfoContext from "@/context/serverInfo";
import ImagesContext from "@/context/images";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { getSeperator } from "@/common/path";
import { pmSchema } from "../prosemirror/pmSchema";
import ImagePreviewPane from "./ImagePreviewPane.vue";
import { isImage, isAudio, isVideo } from "@/utils/fileType";

const { blockEditor } = BlocksContext.useContext();
const tasakQueue = useTaskQueue();
const { serverUrl } = ServerInfoContext.useContext();
const { useImage } = ImagesContext.useContext();
const { lastFocusedBlockId, lastFocusedEditorView } = LastFocusContext.useContext();
const { attachmentsBasePath, activeDirent, open } = AttachmentsManagerContext.useContext();

const activePathInfo = computed(() => {
  const rootPath = attachmentsBasePath.value;
  if (!activeDirent.value) return null;
  const activePath = activeDirent.value.path;
  const seperator = getSeperator();

  const extname = activeDirent.value.isDirectory
    ? undefined
    : activeDirent.value.path.split(".").pop();

  const fileNameAndExtname = activeDirent.value.isDirectory
    ? undefined
    : activePath.split(seperator).pop();

  return {
    isDirectory: activeDirent.value.isDirectory,
    isPreview: activeDirent.value.isPreview,
    absolutePath: activePath,
    relativePath: activePath.slice(rootPath.length + 1),
    extname,
    fileNameAndExtname,
    isImage: extname && isImage(extname),
    isAudio: extname && isAudio(extname),
    isVideo: extname && isVideo(extname),
  };
});

const previewingImage = useImage(() => {
  if (!activePathInfo.value?.isImage) return null;
  return activePathInfo.value.relativePath;
});

const icon = computed(() => {
  if (!activeDirent.value) return null;
  if (activeDirent.value.isDirectory) return Folder;
  const extname = activeDirent.value.path.split(".").pop();
  if (extname === "mp3" || extname === "wav" || extname === "m4a") return Audio;
  else if (extname === "zip" || extname === "rar" || extname === "7z") return Compressed;
  else if (
    extname === "png" ||
    extname === "jpg" ||
    extname === "jpeg" ||
    extname === "gif" ||
    extname === "bmp" ||
    extname === "webp"
  )
    return Image;
  else if (extname === "pdf") return Pdf;
  else if (extname === "doc" || extname === "docx") return Word;
  return File;
});

const canPreview = computed(() => {
  if (!activePathInfo.value || !activePathInfo.value.extname) return false;
  return (
    activePathInfo.value.isAudio ||
    activePathInfo.value.isVideo ||
    activePathInfo.value.isImage ||
    ["pdf", "doc", "docx"].includes(activePathInfo.value.extname)
  );
});

const handleTogglePreview = () => {
  if (!activeDirent.value) return;
  activeDirent.value.isPreview = !activeDirent.value.isPreview;
};

const handleInsertImage = (relativePath: string) => {
  const blockId = lastFocusedBlockId.value;
  if (!blockId) return;
  const editorView = lastFocusedEditorView.value;
  const imageContent: ImageContent = [
    BLOCK_CONTENT_TYPES.IMAGE,
    relativePath,
    "left",
    null,
    null,
    [],
  ];
  const isEmptyTextBlock =
    editorView instanceof PMEditorView && editorView.state.doc.content.size === 0;
  const isEmptyCodeBlock = editorView instanceof CMEditorView && editorView.state.doc.length === 0;
  // 如果当前块是空文本或代码块，则将这个空块变为图片块
  if (isEmptyTextBlock || isEmptyCodeBlock) {
    tasakQueue.addTask(() => {
      blockEditor.changeBlockContent({ blockId, content: imageContent });
      open.value = false;
    });
  } else {
    // 否则在当前块下方插入图片块
    tasakQueue.addTask(() => {
      const pos: BlockPosSiblingOffset = {
        baseBlockId: blockId,
        offset: 1,
      };
      blockEditor.insertNormalBlock({ pos, content: imageContent });
    });
  }
};

const handleDownload = async (path: string) => {
  const res = await fsGetAttachmentSignedUrl({ path });
  if (!res.success) return;
  // TODO: tooltip
  const signedUrl = res.data.signedUrl;
  const a = document.createElement("a");
  a.href = `http://${serverUrl.value}${signedUrl}`;
  a.download = path;
  a.click();
};

const handleDelete = async (path: string) => {
  // const res = await fsDeleteAttachment({ path });
  // if (!res.success) return;
  // open.value = false;
};

const handleInsertPathRef = (path: string | undefined) => {
  if (!path) return;
  const view = lastFocusedEditorView.value;
  if (!(view instanceof PMEditorView)) return;
  const pathRefNode = pmSchema.nodes.pathRef.create({ path });
  const tr = view.state.tr.replaceSelectionWith(pathRefNode);
  view.dispatch(tr);
};
</script>
