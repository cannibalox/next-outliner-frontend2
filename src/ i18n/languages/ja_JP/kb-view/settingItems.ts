const settingItems = {
  basic: {
    textFontFamily: {
      label: "本文フォント",
      desc: "ノートの本文のフォントを指定します。",
    },
    uiFontFamily: {
      label: "インターフェースフォント",
      desc: "ソフトウェアのインターフェースフォントを指定します。他のフォントが指定されていない場合、このフォントがソフトウェアの基本フォントとなります。",
    },
    monospaceFontFamily: {
      label: "コードブロックフォント",
      desc: "インラインコード、コードブロックなど、等幅フォントが必要な場面で使用するフォントを指定します。",
    },
    customCss: {
      label: "カスタム CSS",
      desc: "ナレッジベースの外観をカスタマイズするためのCSSスタイルを追加します。",
    },
  },
  dailynote: {
    defaultDateFormat: {
      label: "デフォルトの日付形式",
      desc: "新しいデイリーノートを作成する際のデフォルトの日付形式です。",
    },
    parentBlockOfNewDailyNote: {
      label: "デイリーノートの保存場所",
      desc: "新しいデイリーノートはこのブロックの下（子ブロックとして）に保存されます。",
    },
  },
  backlinks: {
    showCounter: {
      label: "ブロック右側にバックリンク数を表示",
      desc: "有効にすると、ブロックにバックリンクがある場合、ブロックの右側にフローティングバッジとしてバックリンクの数が表示されます。クリックすると、そのブロックのすべてのバックリンクを表示するフローティングウィンドウが開きます。",
    },
    putNewBlockAt: {
      label: "新規ブロックの挿入位置",
      desc: "参照補完メニューで新規ブロックを作成する際の挿入位置です。指定しない場合、デフォルトでルートブロックの末尾に挿入されます。",
    },
  },
  quickAdd: {
    putNewBlockAt: {
      label: "クイック追加の位置",
      desc: "クイック追加で新しいブロックを作成する際の挿入位置を指定します。指定がない場合、デフォルトでルートブロックの末尾に挿入されます。",
    },
  },
  search: {
    ignoreDiacritics: {
      label: "発音区別符号を無視",
      desc: "有効にすると、検索時に発音区別符号を無視します（例：'e'で'é'にもマッチ）",
    },
  },
};

export default settingItems;
