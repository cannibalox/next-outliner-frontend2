const misc = {
  loadingKb: "載入知識庫中...",
  backup: {
    createBackup: "建立備份",
    createBackupSuccess: "備份成功",
    createBackupFailed: "備份失敗",
  },
  backlinksPanel: {
    nBacklinks: "{count} 個反向連結",
    nPotentialLinks: "{count} 個潛在連結",
  },
  keybindingInput: {
    empty: "點擊設定快速鍵",
  },
  codeblock: {
    unknownLanguage: "未知語言",
    copyCode: "複製程式碼",
    copySuccess: "程式碼區塊中的程式碼已複製到剪貼簿",
  },
  imageEditor: {
    title: "圖片編輯器",
    description: "支援圖片裁剪、旋轉，自動最佳化掃描檔案等功能",
    cancel: "取消",
    save: "套用變更",
    saveAs: "另存新檔",
    deleteOriginal: "是否刪除原圖？",
  },
  fusionCommand: {
    noResults: "沒有找到相關內容",
    noCommandResults: "沒有找到相關命令",
    allowedBlockTypes: "允許的區塊類型",
    searchPlaceholder: "搜尋知識庫",
    searchHelp:
      "↑↓ 和 Home, End 可選擇搜尋結果，↵ 跳轉到選中項，⌘+↵ 插入區塊連結，esc 關閉搜尋面板",
    commandHelp: "輸入 / 可搜尋命令，↑↓ 和 Home, End 選擇命令然後 ↵ 執行命令，esc 關閉命令面板",
  },
  blockMover: {
    moveSuccess: "移動 {count} 個區塊成功",
    focusMovedBlock: "聚焦到移動後的區塊",
    inputPlaceholder: "移動到...",
  },
  refSuggestions: {
    noSuggestions: "沒有結果",
    createNewUnder1: "在",
    createNewUnder2: "下建立新區塊",
    placeholder: "試試輸入 / 或 !",
  },
  pomodoro: {
    startWorking: "開工吧！",
    startResting: "休息一下",
    stop: "停止",
    working: "工作中...",
    resting: "休息中...",
  },
  settingsPanel: {
    title: "設定",
    invalidJson: "無效的 JSON",
    reset: "重設為預設值",
    noResult: "沒有找到符合條件的區塊",
    invalidBlockId: "無效的區塊 ID",
  },
  syncStatus: {
    synced: "所有變更已同步",
    syncing: "同步中",
    disconnected: "同步失敗",
  },
  sidePane: {
    remove: "從側欄移除此項",
    prev: "聚焦到上一項",
    next: "聚焦到下一項",
    collapse: "摺疊側邊欄",
    moveToRight: "移動側邊欄到右側",
    moveToBottom: "移動側邊欄到下方",
    setFilter: "設定過濾條件",
    setSort: "設定排序條件",
    empty: "🤔 目前側邊欄為空",
    searchAndAdd: "搜尋區塊並新增到側邊欄",
    emptyTip:
      '您可以透過以下方式新增內容：\n  - 在區塊選單中選擇"新增到側邊欄"\n  - 使用快速鍵 Command/Ctrl + K\n  - 右上角點擊 "+" 按鈕搜尋新增區塊',
  },

  backlinks: {
    openBacklinksPanel: "開啟反向連結面板",
  },
  createNewTreeDialog: {
    title: "建立新文件",
    description: "沒有找到根區塊，這可能是因為：\n1. 這是一個新文件\n2. 資料還在同步中",
    waitingForSync: '正在等待同步，如果確定這是新文件，可以點擊"建立"按鈕建立新文件。',
    waitBtn: "等待",
    createBtn: "建立",
    creating: "正在建立...",
    done: "建立成功",
    failed: "建立失敗",
  },
  pasteDialog: {
    title: "不要不要",
    description: "太大啦！放進來會壞掉的！要不試試分段貼上？",
    cancelBtn: "我知道了",
  },

  exporter: {
    title: "匯出",
    description: "匯出選中子樹為 HTML, PDF, Markdown, Plain Text 等多種格式",
    preview: "預覽",
    copyToClipboard: "複製到剪貼簿",
    exportToFile: "匯出到檔案",
    cancel: "取消",
    exportFormat: "匯出格式",
  },
  fontSelector: {
    notAvailable: "(未安裝)",
    notSpecified: "(未指定)",
    addCustomFont: "新增自訂字型",
    addCustomFontTitle: "新增自訂字型",
    addCustomFontDesc: "輸入你想要使用的字型名稱",
    fontNamePlaceholder: "輸入字型名稱",
    cancel: "取消",
    confirm: "確認",
    fontInstalled: "字型已安裝",
    fontNotInstalled: "字型似乎尚未安裝",
  },
  fieldValuesInspector: {
    title: "屬性檢視器",
    description: "查看這個區塊的所有屬性值",
  },
  dailynoteNavigator: {
    noDailyNote: "這一天沒有每日筆記，點擊以建立",
    gotoDailyNote: "點擊以前往這一天的每日筆記",
    dontKnowWhereToCreate: {
      title: "不知道在哪裡建立每日筆記",
      desc: '你應該到 "設定 > 每日筆記 > 每日筆記的存放位置" 設定新建立的每日筆記的存放位置',
    },
  },
  history: {
    goToPrev: "後退，右鍵查看所有歷史項目",
    goToNext: "前進，右鍵查看所有歷史項目",
  },

  timeMachine: {
    title: "時光機",
    description: "備份和還原你的筆記",
    preview: "預覽此備份",
    restore: "回退到此備份",
    delete: "刪除此備份",
    createBackup: "建立新備份",
    size: "{size} MB",
    refresh: "重新整理備份列表",
    noBackup: "沒有備份",
  },
  attachmentViewer: {
    allowEdit: "允許編輯",
    save: "儲存",
    loading: "正在載入...",
    audioNotSupported: "音訊格式不受支援",
    videoNotSupported: "視訊格式不受支援",
  },
  settingGroups: {
    basic: "基本設定",
    timeMachine: "時光機",
    dailynote: "每日筆記",
    backlinks: "區塊引用 & 反向連結",
  },

  blockRefContextMenu: {
    title: "區塊別名",
    addAlias: "新增新別名...",
    noAliases: "暫無別名",
    backlinkCount: "{count} 個引用",
    cannotDelete: "無法刪除：此別名正在被引用",
    deleteAlias: {
      title: "刪除別名",
      description: "確定要刪除這個別名嗎？此操作不可復原。",
      cancel: "取消",
      confirm: "刪除",
    },
  },
  blockPath: {
    image: "[圖片]",
    video: "[視訊]",
    code: "[程式碼]",
    math: "[公式]",
    carousel: "[輪播]",
    audio: "[音訊]",
    query: "[查詢]",
    unknown: "[未知]",
  },
  blockRefTagSettings: {
    title: "引用設定",
    description: "配置區塊引用和標籤的設定",
    color: "引用/標籤顏色",
    relatedFields: "關聯欄位",
    selectField: "選擇欄位",
    unsavedChanges: "有未儲存的更改",
    cancel: "取消",
    save: "儲存",
    noFields: "沒有關聯欄位",
    addField: "添加新欄位",
    insertExistingField: "插入現有欄位",
    searchFields: "搜索字段",
    noFieldsFound: "未找到字段",
    tooltips: {
      settings: "字段設置",
      delete: "刪除字段",
    },
    buildIndex: "建立索引",
    valueType: "值類型",
    selectValueType: "選擇值類型",
    valueTypes: {
      richtext: "富文本",
      blockRef: "區塊引用",
      fileRef: "檔案引用",
      arrayOfBlockRef: "區塊引用陣列",
      arrayOfFileRef: "檔案引用陣列",
      arrayOfRichText: "區塊陣列",
    },
    addTypes: {
      single: "單一",
      richText: "富文本",
      blockReference: "區塊引用",
      file: "檔案",
      array: "陣列",
      arrayOfBlockReference: "區塊引用陣列",
      arrayOfFileReference: "檔案引用陣列",
      arrayOfBlock: "區塊陣列",
    },
  },
};

export default misc;