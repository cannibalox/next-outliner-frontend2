import { createContext } from "@/utils/createContext";
import { fsGetAttachmentSignedUrl } from "@/common/api-call/fs";
import { ref } from "vue";
import ServerInfoContext from "./serverInfo";
import {
  getExtname,
  isAnimateImage,
  isAudio,
  isStaticImage,
  isText,
  isVideo,
} from "@/utils/fileType";

export type ViewingTextAttachment = {
  type: "text";
  name: string;
  lang: string;
  path: string;
  content: string;
  tempContent: string;
  save: () => void;
};

export type ViewingImageAttachment = {
  type: "image";
  name: string;
  path: string;
  url: string;
};

export type ViewingAnimateImageAttachment = {
  type: "animateImage";
  name: string;
  path: string;
  url: string;
};

export type ViewingAudioAttachment = {
  type: "audio";
  name: string;
  path: string;
  url: string;
};

export type ViewingVideoAttachment = {
  type: "video";
  name: string;
  path: string;
  url: string;
};

export type ViewingAttachment =
  | ViewingTextAttachment
  | ViewingImageAttachment
  | ViewingAnimateImageAttachment
  | ViewingAudioAttachment
  | ViewingVideoAttachment;

type ViewerStatus = "idle" | "loading" | "viewing" | "error";

const AttachmentViewerContext = createContext(() => {
  const { serverUrl } = ServerInfoContext.useContext()!;
  const viewingAttachment = ref<ViewingAttachment | null>(null);
  const status = ref<ViewerStatus>("idle");
  const errorMessage = ref<string>("");

  const previewTextFile = async (name: string, path: string) => {
    try {
      status.value = "loading";
      errorMessage.value = "";

      // 获取签名 URL
      const resp = await fsGetAttachmentSignedUrl({
        path,
        attachment: false,
        inferMimeType: true,
      });

      if (!resp.success) {
        throw new Error("Failed to get signed URL");
      }

      // 从签名 URL 获取文本内容
      const url = `${serverUrl.value}${resp.data.signedUrl}`;
      const textResp = await fetch(url);
      if (!textResp.ok) {
        throw new Error("Failed to fetch text content");
      }

      const content = await textResp.text();

      viewingAttachment.value = {
        type: "text",
        name,
        lang: getExtname(name),
        path,
        content,
        tempContent: content,
        save: () => {
          // TODO: 实现保存功能
          console.log("Save content");
        },
      };

      status.value = "viewing";
    } catch (error) {
      console.error("Error previewing text attachment", error);
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "Unknown error";
      viewingAttachment.value = null;
    }
  };

  const previewStaticImageFile = async (name: string, path: string) => {
    try {
      status.value = "loading";
      errorMessage.value = "";

      // 获取签名 URL
      const resp = await fsGetAttachmentSignedUrl({
        path,
        attachment: false,
        inferMimeType: true,
      });

      if (!resp.success) {
        throw new Error("Failed to get signed URL");
      }

      const url = `${serverUrl.value}${resp.data.signedUrl}`;

      viewingAttachment.value = {
        type: "image",
        name,
        path,
        url,
      };

      status.value = "viewing";
    } catch (error) {
      console.error("Error previewing image attachment", error);
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "Unknown error";
      viewingAttachment.value = null;
    }
  };

  const previewAnimateImageFile = async (name: string, path: string) => {
    try {
      status.value = "loading";
      errorMessage.value = "";

      // 获取签名 URL
      const resp = await fsGetAttachmentSignedUrl({
        path,
        attachment: false,
        inferMimeType: true,
      });

      if (!resp.success) {
        throw new Error("Failed to get signed URL");
      }

      const url = `${serverUrl.value}${resp.data.signedUrl}`;

      viewingAttachment.value = {
        type: "animateImage",
        name,
        path,
        url,
      };

      status.value = "viewing";
    } catch (error) {
      console.error("Error previewing image attachment", error);
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "Unknown error";
      viewingAttachment.value = null;
    }
  };

  const previewAudioFile = async (name: string, path: string) => {
    try {
      status.value = "loading";
      errorMessage.value = "";

      // 获取签名 URL
      const resp = await fsGetAttachmentSignedUrl({
        path,
        attachment: false,
        inferMimeType: true,
      });

      if (!resp.success) {
        throw new Error("Failed to get signed URL");
      }

      const url = `${serverUrl.value}${resp.data.signedUrl}`;

      viewingAttachment.value = {
        type: "audio",
        name,
        path,
        url,
      };

      status.value = "viewing";
    } catch (error) {
      console.error("Error previewing audio attachment", error);
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "Unknown error";
      viewingAttachment.value = null;
    }
  };

  const previewVideoFile = async (name: string, path: string) => {
    try {
      status.value = "loading";
      errorMessage.value = "";

      const resp = await fsGetAttachmentSignedUrl({
        path,
        attachment: false,
        inferMimeType: true,
      });

      if (!resp.success) {
        throw new Error("Failed to get signed URL");
      }

      const url = `${serverUrl.value}${resp.data.signedUrl}`;

      viewingAttachment.value = {
        type: "video",
        name,
        path,
        url,
      };

      status.value = "viewing";
    } catch (error) {
      console.error("Error previewing video attachment", error);
      status.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "Unknown error";
      viewingAttachment.value = null;
    }
  };

  const closeViewer = () => {
    viewingAttachment.value = null;
    status.value = "idle";
    errorMessage.value = "";
  };

  const handlePreview = async (path: string, name: string) => {
    if (isText(name)) {
      await previewTextFile(name, path);
    } else if (isStaticImage(name)) {
      await previewStaticImageFile(name, path);
    } else if (isAnimateImage(name)) {
      await previewAnimateImageFile(name, path);
    } else if (isAudio(name)) {
      await previewAudioFile(name, path);
    } else if (isVideo(name)) {
      await previewVideoFile(name, path);
    }
  };

  return {
    viewingAttachment,
    status,
    errorMessage,
    previewTextFile,
    previewStaticImageFile,
    previewAnimateImageFile,
    previewAudioFile,
    previewVideoFile,
    handlePreview,
    closeViewer,
  };
});

export default AttachmentViewerContext;
