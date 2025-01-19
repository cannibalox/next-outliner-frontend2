const attachmentsManager = {
  title: "附件管理器",
  description: "管理你的所有附件檔案",
  upload: "上載",
  uploading: "上載中...",
  noFiles: "沒有檔案",
  searchPlaceholder: "搜尋檔案...",
  filterByType: "按類型篩選",
  allFiles: "所有檔案",
  folders: "資料夾",
  images: "圖片",
  documents: "文件",
  audio: "音訊",
  video: "影片",
  others: "其他",
  sortBy: "排序方式",
  sortByName: "按名稱",
  sortByDate: "按日期",
  sortBySize: "按大小",
  refreshing: "正在重新整理...",
  refreshed: "重新整理成功",
  uploadSuccess: {
    title: "上載成功",
    description: "成功上載 {0} 個檔案",
  },
  uploadError: {
    title: "上載失敗",
    duplicateFiles: "以下檔案已存在: {0}",
    unknown: "未知錯誤",
  },
  previewPane: {
    openPreview: "預覽",
    download: "下載",
    reference: "插入區塊引用",
    pathReference: "插入路徑引用",
    insertImage: "插入圖片",
    fetchingImage: "圖片載入中...",
    closePreview: "關閉預覽",
    delete: "刪除",
    info: "詳細資訊",
  },
  uploadStatus: {
    idle: "空閒",
    uploading: "上載中...",
    success: "上載成功",
    failed: "上載失敗",
  },
  fetchFilesStatus: {
    idle: "空閒",
    fetching: "正在獲取檔案列表...",
    success: "獲取檔案列表成功",
    failed: "獲取檔案列表失敗",
  },
  actions: {
    rename: "重新命名",
    copy: "複製",
    info: "詳細資訊",
    delete: "刪除",
    download: "下載",
    refresh: "重新整理",
    preview: "預覽",
  },
  hiddenFiles: "{count} 個檔案被篩選隱藏",
  rename: {
    title: "重新命名",
    description: "請輸入新的檔案名稱",
    newNameLabel: "新檔案名稱",
    newNamePlaceholder: "請輸入新檔案名稱",
    cancelBtn: "取消",
    submitBtn: "套用",
    error: {
      emptyName: "檔案名稱不能為空",
      sameName: "新檔案名稱不能與原檔案名稱相同",
      duplicateName: "該檔案名稱已存在",
    },
  },
  renameSuccess: {
    title: "重新命名成功",
    description: "檔案已重新命名",
  },
  renameError: {
    title: "重新命名失敗",
    unknown: "未知錯誤",
  },
  delete: {
    title: "刪除檔案",
    description: "確定要刪除這個檔案嗎？",
    folderWarning: "你正在刪除一個資料夾，其中的所有檔案都會被刪除。",
    fileCount: "此資料夾包含 {count} 個檔案",
    warning: "此操作不可恢復",
    cancelBtn: "取消",
    submitBtn: "刪除",
  },
  deleteSuccess: {
    title: "刪除成功",
    description: "檔案已刪除",
  },
  deleteError: {
    title: "刪除失敗",
    unknown: "未知錯誤",
  },
  downloadError: {
    title: "下載失敗",
    unknown: "未知錯誤",
  },
  info: {
    title: "檔案資訊",
    name: "名稱",
    path: "路徑",
    type: "類型",
    size: "大小",
    modifiedTime: "修改時間",
    createdTime: "建立時間",
    closeBtn: "關閉",
  },
  selectFileToPreview: "選擇檔案以預覽",
  fileNotPreviewable: "暫不支援預覽此類型的檔案",
  tooltip: {
    showPreview: "顯示預覽面板",
    hidePreview: "隱藏預覽面板",
    filter: "篩選檔案",
    sort: "排序檔案",
  },
};

export default attachmentsManager;