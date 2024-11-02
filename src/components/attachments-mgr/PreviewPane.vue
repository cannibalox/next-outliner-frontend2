<template>
  <div class="flex items-center justify-center flex-grow">
    <div v-if="activeDirent" class="flex flex-col items-center text-muted-foreground gap-y-6">
      <!-- Preview -->
      <template v-if="activeDirent.isPreview && activeDirentExtname">
        <!-- Image preview -->
        <template v-if="previewingImage">
          <div v-if="previewingImage.status === 'fetching'" class="flex items-center">
            <Loader2 class="size-4 mr-2 animate-spin" />
            {{ $t("kbView.attachmentsManager.previewPane.fetchingImage") }}
          </div>
          <div
            v-else-if="previewingImage.status === 'synced'"
            class="flex flex-col items-center gap-y-4"
          >
            <img :src="previewingImage.url" class="max-w-full max-h-full" />
            <div class="flex items-center gap-x-2">
              <Button variant="outline" size="sm" @click="activeDirent.isPreview = false">
                <X class="size-4 mr-2" />
                {{ $t("kbView.attachmentsManager.previewPane.closePreview") }}
              </Button>
              <Button variant="outline" size="sm" @click="activeDirent.isPreview = false">
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
                    <Download class="size-4 mr-2" />
                    {{ $t("kbView.attachmentsManager.previewPane.download") }}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link2 class="size-4 mr-2" />
                    {{ $t("kbView.attachmentsManager.previewPane.reference") }}
                  </DropdownMenuItem>
                  <DropdownMenuItem class="!text-red-500">
                    <Trash2 class="size-4 mr-2" />
                    {{ $t("kbView.attachmentsManager.previewPane.delete") }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <!-- todo styles -->
          <div v-else-if="previewingImage.status === 'fetchError'">
            {{ previewingImage.msg }}
          </div>
        </template>
      </template>

      <!-- Dirent basic info and actions -->
      <template v-else>
        <component :is="icon" class="size-20" />
        <div class="text-sm break-all px-8">
          {{ activeFileNameAndExtname }}
        </div>
        <div class="flex items-center justify-center flex-wrap gap-2">
          <!-- For image, only show preview and insert image button, hide other buttons in dropdown -->
          <template v-if="activeDirentExtname && imageExtnames.includes(activeDirentExtname)">
            <Button
              variant="outline"
              size="sm"
              :disabled="!canPreview"
              @click="activeDirent.isPreview = true"
            >
              <Eye class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.openPreview") }}
            </Button>
            <Button
              v-if="canInsertImage"
              variant="outline"
              size="sm"
              @click="handleInsertImage(activeDirent.path)"
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
            <Button
              variant="outline"
              size="sm"
              :disabled="!canPreview"
              @click="activeDirent.isPreview = true"
            >
              <Eye class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.openPreview") }}
            </Button>
            <Button variant="outline" size="sm" @click="handleDownload(activeDirent.path)">
              <Download class="size-4 mr-2" />
              {{ $t("kbView.attachmentsManager.previewPane.download") }}
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
import BlocksContext from "@/context/blocks-provider/blocks";
import LastFocusContext from "@/context/lastFocus";
import { EditorView as PMEditorView } from "prosemirror-view";
import { EditorView as CMEditorView } from "@codemirror/view";
import { BLOCK_CONTENT_TYPES } from "@/common/constants";
import { useTaskQueue } from "@/plugins/taskQueue";
import type { BlockPosSiblingOffset } from "@/context/blocks-provider/blocksEditor";
import type { ImageContent } from "@/common/types";
import { autoRetryGet } from "@/utils/auto-retry";
import { fsGetAttachmentSignedUrl } from "@/common/api/fs";
import AxiosContext from "@/context/axios";
import ImagesContext from "@/context/images";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { getSeperator } from "@/common/path";

const { blockEditor } = BlocksContext.useContext();
const tasakQueue = useTaskQueue();
const { serverUrl } = AxiosContext.useContext();
const { useImage } = ImagesContext.useContext();
const { lastFocusedBlockId, lastFocusedEditorView } = LastFocusContext.useContext();
const { attachmentsBasePath, activeDirent, open } = AttachmentsManagerContext.useContext();
const activeFileRelativePath = computed(() => {
  const rootPath = attachmentsBasePath.value;
  const activePath = activeDirent.value?.path;
  if (!activePath) return null;
  return activePath.slice(rootPath.length + 1);
});
const activeFileNameAndExtname = computed(() => {
  if (!activeDirent.value || activeDirent.value.isDirectory) return null;
  const seperator = getSeperator();
  return activeDirent.value.path.split(seperator).pop();
});
const activeDirentExtname = computed(() => {
  if (!activeDirent.value || activeDirent.value.isDirectory) return null;
  return activeDirent.value.path.split(".").pop();
});

const imageExtnames = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];
const audioExtnames = ["mp3", "wav", "m4a"];
const videoExtnames = ["mp4", "webm", "ogg"];

const previewingImage = computed(() => {
  if (!activeDirent.value) return null;
  if (!activeDirentExtname.value) return null;
  if (!imageExtnames.includes(activeDirentExtname.value)) return null;
  return useImage(activeDirent.value.path).value;
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
  if (!activeDirent.value) return false;
  if (activeDirent.value.isDirectory) return false;
  const extname = activeDirent.value.path.split(".").pop();
  if (extname === "mp3" || extname === "wav" || extname === "m4a") return true;
  else if (extname === "pdf") return true;
  else if (extname === "png" || extname === "jpg" || extname === "jpeg") return true;
  return false;
});

const canInsertImage = computed(() => {
  if (!activeDirent.value) return false;
  if (activeDirent.value.isDirectory) return false;
  const extname = activeDirent.value.path.split(".").pop();
  if (extname === "png" || extname === "jpg" || extname === "jpeg") return true;
  return false;
});

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
      blockEditor.changeBlockContent(blockId, imageContent);
      open.value = false;
    });
  } else {
    // 否则在当前块下方插入图片块
    tasakQueue.addTask(() => {
      const pos: BlockPosSiblingOffset = {
        baseBlockId: blockId,
        offset: 1,
      };
      blockEditor.insertNormalBlock(pos, imageContent);
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
</script>
