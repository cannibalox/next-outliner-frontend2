export const messages = {
  zh: {
    login: {
      kbEditorLogin: {
        title: "打开知识库",
        serverUrlLabel: "服务器 URL",
        serverUrlPlaceholder: "输入服务器 URL，例如 http://43.134.1.60/:8081",
        noKbServerMsg: '此服务器上没有知识库，你可以<a class="cursor-pointer">以管理员身份登录</a>，然后在控制面板创建新知识库。',
        kbLocationLabel: "知识库",
        refreshKbListTooltip: "刷新知识库列表",
        passwordLabel: "密码",
        adminLoginBtn: "管理员登陆",
        serverStatus: {
          invalidURL: "URL 格式不正确",
          connFailed: "连接失败",
          connecting: "连接中",
          connSuccess: "连接成功",
          noKbServer: "没有知识库服务器",
        },
        loginStatus: {
          idle: "空闲",
          loggingIn: "登录中",
          loginSuccess: "登录成功",
          loginFailed_InvalidPassword: "密码错误",
          loginFailed_Unknown: "未知错误，请联系服务器管理员",
        },
        loginBtn: {
          idle: "登录",
          loggingIn: "登录中...",
          loginSuccess: "登录成功",
          loginFailed_InvalidPassword: "登录",
          loginFailed_Unknown: "登录",
        }
      },
      adminLogin: {
        title: "管理员登录",
        serverUrlLabel: "服务器 URL",
        serverUrlPlaceholder: "输入服务器 URL，例如 http://43.134.1.60/:8081",
        passwordLabel: "密码",
        loginStatus: {
          loggingIn: "登录中...",
          loginSuccess: "登录成功",
          invalidServerUrl: "URL 格式不正确",
          cannotConnectToServer: "无法连接到服务器",
          invalidPassword: "密码错误",
          maxAttempts: "达到最大尝试次数，请稍后再试",
        },
      }
    },
    kbView: {
      loadingKb: "加载知识库中...",
      refSuggestions: {
        noSuggestions: "没有结果",
      },
      attachmentsManager: {
        title: "附件管理器",
        upload: "上传",
        noFiles: "没有文件",
        previewPane: {
          openPreview: "预览",
          download: "下载",
          reference: "插入引用",
          insertImage: "插入图片",
          fetchingImage: "图片加载中...",
          closePreview: "关闭预览",
          delete: "删除",
          info: "详细信息"
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
        }
      },
      imageContent: {
        fetchingImage: "图片加载中...",
        addCaption: "添加图片描述",
        deleteImage: "删除图片",
        blend: "与背景混合",
        circle: "裁剪为圆形",
        invert: "反色",
        invertW: "反色（白底）",
        outline: "描边",
        width: "宽度",
        wider: "更宽",
        narrower: "更窄",
        resetWidth: "重置",
      }
    }
  },
}