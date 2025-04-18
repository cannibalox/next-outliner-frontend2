const attachmentsManager = {
  title: "附件管理器",
  description: "管理你的所有附件文件",
  upload: "上传",
  uploading: "上传中...",
  noFiles: "没有文件",
  searchPlaceholder: "搜索文件...",
  filterByType: "按类型筛选",
  allFiles: "所有文件",
  folders: "文件夹",
  images: "图片",
  documents: "文档",
  audio: "音频",
  video: "视频",
  others: "其他",
  sortBy: "排序方式",
  sortByName: "按名称",
  sortByDate: "按日期",
  sortBySize: "按大小",
  refreshing: "正在刷新...",
  refreshed: "刷新成功",
  uploadSuccess: {
    title: "上传成功",
    description: "成功上传 {0} 个文件",
  },
  uploadError: {
    title: "上传失败",
    duplicateFiles: "以下文件已存在: {0}",
    unknown: "未知错误",
  },
  previewPane: {
    openPreview: "预览",
    download: "下载",
    reference: "插入块引用",
    pathReference: "插入路径引用",
    insertImage: "插入图片",
    fetchingImage: "图片加载中...",
    closePreview: "关闭预览",
    delete: "删除",
    info: "详细信息",
  },
  uploadStatus: {
    idle: "空闲",
    uploading: "上传中...",
    success: "上传成功",
    failed: "上传失败",
  },
  fetchFilesStatus: {
    idle: "空闲",
    fetching: "正在获取文件列表...",
    success: "获取文件列表成功",
    failed: "获取文件列表失败",
  },
  actions: {
    rename: "重命名",
    copy: "复制",
    info: "详细信息",
    delete: "删除",
    download: "下载",
    refresh: "刷新",
    preview: "预览",
  },
  hiddenFiles: "{count} 个文件被过滤隐藏",
  rename: {
    title: "重命名",
    description: "请输入新的文件名",
    newNameLabel: "新文件名",
    newNamePlaceholder: "请输入新文件名",
    cancelBtn: "取消",
    submitBtn: "应用",
    error: {
      emptyName: "文件名不能为空",
      sameName: "新文件名不能与原文件名相同",
      duplicateName: "该文件名已存在",
    },
  },
  renameSuccess: {
    title: "重命名成功",
    description: "文件已重命名",
  },
  renameError: {
    title: "重命名失败",
    unknown: "未知错误",
  },
  delete: {
    title: "删除文件",
    description: "确定要删除这个文件吗？",
    folderWarning: "你正在删除一个文件夹，其中的所有文件都会被删除。",
    fileCount: "此文件夹包含 {count} 个文件",
    warning: "此操作不可恢复",
    cancelBtn: "取消",
    submitBtn: "删除",
  },
  deleteSuccess: {
    title: "删除成功",
    description: "文件已删除",
  },
  deleteError: {
    title: "删除失败",
    unknown: "未知错误",
  },
  downloadError: {
    title: "下载失败",
    unknown: "未知错误",
  },
  info: {
    title: "文件信息",
    name: "名称",
    path: "路径",
    type: "类型",
    size: "大小",
    modifiedTime: "修改时间",
    createdTime: "创建时间",
    closeBtn: "关闭",
  },
  selectFileToPreview: "选择文件以预览",
  fileNotPreviewable: "暂不支持预览此类型的文件",
  tooltip: {
    showPreview: "显示预览面板",
    hidePreview: "隐藏预览面板",
    filter: "筛选文件",
    sort: "排序文件",
  },
};

export default attachmentsManager;
