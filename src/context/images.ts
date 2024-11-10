import { fsGetAttachmentSignedUrl, fsUpload } from "@/common/api/fs";
import { autoRetryGet } from "@/utils/auto-retry";
import { createContext } from "@/utils/createContext";
import { computed, reactive } from "vue";
import TokenContext from "./token";
import { getSeperator, isAbsolutePath, joinPathSegments } from "@/common/path";
import AxiosContext from "./axios";
import AttachmentsManagerContext from "./attachmentsManager";
import PathsContext from "./paths";

export type ImageState =
  | { status: "fetching" }
  | { status: "synced"; url: string }
  | { status: "fetchError"; msg: string }
  | { status: "uploading" }
  | { status: "uploadError"; msg: string };

type FetchTask = {
  promise: Promise<string>;
  cancel: () => void;
}

const ImagesContext = createContext(() => {
  const { serverUrl } = AxiosContext.useContext();
  const images = reactive<Record<string, ImageState>>({});
  const { tokenPayload } = TokenContext.useContext();
  const { attachmentsBasePath } = PathsContext.useContext();
  // imagePath => fetchTask
  const fetchTasks = reactive<Record<string, FetchTask>>({});

  const useImage = (imagePath: string, refetch: boolean = false) => {
    console.debug("useImage", imagePath, refetch);
    for (; ;) {
      if (images[imagePath]?.status === "fetching") {
        if (refetch) {
          // 如果需要重新获取，则取消之前的获取任务
          console.debug("图片正在获取，重新获取", imagePath);
          const prevTask = fetchTasks[imagePath];
          if (prevTask) {
            prevTask.cancel();
            delete fetchTasks[imagePath];
          }
        } else break;
      }

      // 如果图片状态不存在，则创建一个
      if (!images[imagePath]) {
        images[imagePath] = { status: "fetching" };
      }

      if (images[imagePath].status === "uploadError") {
        console.debug("图片上传失败，无法获取", imagePath);
        images[imagePath] = { status: "fetchError", msg: "图片上传失败，无法获取" };
        break;
      }

      if (images[imagePath].status === "uploading") {
        console.debug("图片正在上传，无法获取", imagePath);
        images[imagePath] = { status: "fetchError", msg: "图片正在上传，上传完成后再获取" };
        break;
      }

      // 开始获取图片
      queueMicrotask(async () => {
        images[imagePath] = { status: "fetching" };

        if (!tokenPayload.value) {
          console.debug("token 不存在，无法获取图片", imagePath);
          images[imagePath] = { status: "fetchError", msg: "token 不存在" };
          return;
        }

        // 如果是相对路径，则需要转换为绝对路径
        const location = tokenPayload.value.location;
        if (!isAbsolutePath(imagePath)) {
          imagePath = joinPathSegments([location, imagePath]);
        }
        if (!imagePath.startsWith(location)) {
          console.debug("图片路径不合法", imagePath);
          images[imagePath] = { status: "fetchError", msg: "图片路径不合法" };
          return;
        }

        // 获取图片
        let cancelled = false;
        const [promise, cancel] = autoRetryGet<string>(
          (onSuccess) => {
            fsGetAttachmentSignedUrl({ path: imagePath, inferMimeType: true, attachment: false }).then(
              (res) => res.success && onSuccess(res.data.signedUrl),
            );
          },
          { mode: "backoff", base: 500, max: 5000 },
          5,
          true,
        );
        promise
          // 成功
          .then((signedUrl) => {
            if (cancelled) return; // 如果已取消，则不设置图片状态
            console.debug("图片获取成功", imagePath);
            images[imagePath] = {
              status: "synced",
              url: `http://${serverUrl.value}${signedUrl}`,
            };
            delete fetchTasks[imagePath]; // 删除获取任务
          })
          // 失败
          .catch((err) => {
            if (cancelled) return; // 如果已取消，则不设置图片状态
            console.debug("图片获取失败", imagePath, err.message);
            images[imagePath] = {
              status: "fetchError",
              msg: err.message,
            };
            delete fetchTasks[imagePath]; // 删除获取任务
          });

        // 注册获取任务
        const task = {
          promise,
          cancel: () => {
            cancel();
            cancelled = true; // 标记为已取消
          }
        }
        fetchTasks[imagePath] = task;
      });
      break;
    }

    return computed(() => images[imagePath]);
  };

  const uploadImage = (image: File, targetPath_?: string) => {
    const targetPath = targetPath_ ?? joinPathSegments([
      attachmentsBasePath.value,
      image.name,
    ]);
    images[targetPath] = { status: "uploading" };
    queueMicrotask(async () => {
      const res = await fsUpload([[targetPath, image]]);
      if (res.success) {
        console.log("图片上传成功", targetPath);
        useImage(targetPath);
      } else {
        images[targetPath] = { status: "uploadError", msg: "图片上传失败" };
      }
    });
    return computed(() => images[targetPath]);
  }

  const ctx = { images, useImage, uploadImage };
  globalThis.getImagesContext = () => ctx;
  return ctx;
});

export default ImagesContext;
