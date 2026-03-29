<p align="center">
  <img src="MyChatMap-logo.png" alt="MyChatMap" width="80" height="80" style="border-radius: 16px;">
</p>

<h1 align="center">MyChatMap</h1>

<p align="center">
  AI 对话的目录导航，让长对话不再难找
</p>

<p align="center">
  <a href="https://github.com/Raymond-Hear/MyChatMap/releases/latest">下载安装</a> ·
  <a href="https://mychatmap.lingfengraymond.top/">产品主页</a> ·
  <a href="https://github.com/Raymond-Hear/MyChatMap/issues">意见反馈</a> ·
  <a href="https://opensource.org/licenses/MIT">MIT License</a>
</p>

---

## 这是什么？

MyChatMap 是一款 Chrome 浏览器扩展，为豆包、腾讯元宝等 AI 对话平台提供消息级目录导航、标签分类和知识图谱管理。

和 AI 聊了三四十轮，想回看之前讨论的某个点？不用再拼命往上滚了。MyChatMap 会自动生成对话目录，点击即可跳转到任意消息。

## 功能特性

### 目录导航
自动为每条用户消息生成目录条目，悬停右侧导航条展开面板，点击即可跳转到对应位置。跳转后目标消息会高亮闪烁，让你一眼就找到。

### 标签分类
创建自定义标签，为对话打标签分类。10 种预设颜色可选，快速识别不同主题的对话。

### 知识图谱
所有对话自动构建为知识图谱网络。每个节点代表一个对话，通过共享标签建立连接，直观发现跨对话的知识关联。

### 导出备份
导出当前对话为结构化 Markdown 文件，或批量打包所有对话为 ZIP。随时备份，永不丢失。

### 隐私安全
所有数据仅存储在浏览器本地（IndexedDB），不上传任何内容到云端。随时可以清理所有数据。

## 支持平台

| 平台 | 状态 |
|------|------|
| 豆包 (doubao.com) | ✅ 支持 |
| 腾讯元宝 (yuanbao.tencent.com) | ✅ 支持 |

## 安装方法

### 方式一：从 Release 下载

1. 前往 [Releases](https://github.com/Raymond-Hear/MyChatMap/releases/latest) 页面下载最新版本的 `.zip` 文件
2. 解压到任意文件夹
3. 打开 Chrome，进入 `chrome://extensions/`
4. 开启右上角的「开发者模式」
5. 点击「加载已解压的扩展程序」，选择解压后的文件夹
6. 完成！

### 方式二：从源码安装

```bash
git clone https://github.com/Raymond-Hear/MyChatMap.git
```

然后在 Chrome 扩展管理页面加载项目根目录即可。

## 使用方法

1. 安装扩展后，访问 [豆包](https://www.doubao.com) 或 [腾讯元宝](https://yuanbao.tencent.com)
2. 打开一个 AI 对话，插件会自动识别并生成目录
3. 将鼠标悬停在页面右侧的导航条上，展开目录面板
4. 点击任意目录条目，即可跳转到对应消息
5. 点击浏览器工具栏的 MyChatMap 图标，可以管理标签、查看知识图谱、导出对话

## 技术栈

- **Manifest V3** — Chrome 扩展最新标准
- **适配器模式** — 每个平台一个适配器，易于扩展
- **Dexie.js** — IndexedDB 封装，用于本地数据存储
- **vis-network** — 知识图谱可视化
- **JSZip** — ZIP 导出打包
- **纯原生 JS** — 无框架依赖，直接加载

## 项目结构

```
MyChatMap/
├── manifest.json                  # 扩展配置
├── background/service-worker.js   # 数据访问层（IndexedDB CRUD）
├── content/                      # 内容脚本（注入到 AI 平台）
│   ├── aic-main.js               # 主入口，适配器选择
│   ├── aic-catalog-ui.js         # 目录导航 UI
│   ├── aic-scroll-tracker.js     # 滚动位置追踪
│   ├── aic-message-bus.js        # 消息通信封装
│   └── adapters/                 # 平台适配器
│       ├── aic-base.js           # 适配器基类
│       ├── aic-doubao.js         # 豆包适配器
│       └── aic-yuanbao.js        # 腾讯元宝适配器
├── popup/                        # 扩展弹窗
│   ├── popup.html
│   ├── popup.js
│   └── mychatmap-graph.js        # 知识图谱逻辑
├── shared/                       # 共享模块
│   ├── aic-constants.js          # 常量定义
│   ├── aic-utils.js              # 工具函数
│   └── db.js                     # 数据库 Schema
├── lib/                          # 第三方库
│   ├── dexie.mjs
│   ├── jszip.min.js
│   └── vis-network.min.js
├── icons/                        # 扩展图标
└── mychatmap-graph.html          # 知识图谱页面
```

## 常见问题

<details>
<summary><b>对话数据安全吗？</b></summary>

完全安全。所有数据仅存储在你的浏览器本地（IndexedDB），不会上传到任何云端服务器。你可以随时在弹窗中点击「清理所有数据」来删除全部本地数据。
</details>

<details>
<summary><b>支持 Edge 浏览器吗？</b></summary>

基于 Manifest V3 标准，理论上支持 Edge。目前主要在 Chrome 上测试，Edge 兼容性验证正在进行中。
</details>

<details>
<summary><b>目录条目可以重命名吗？</b></summary>

可以。悬停在目录条目上，点击编辑图标即可自定义标题，回车确认，ESC 取消。重命名会保存到本地，下次打开同一对话时仍然显示自定义标题。
</details>

<details>
<summary><b>会支持更多平台吗？</b></summary>

后续版本会考虑支持更多 AI 对话平台。如果你有特别想支持的平台，欢迎提 [Issue](https://github.com/Raymond-Hear/MyChatMap/issues)。
</details>

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

[MIT](https://opensource.org/licenses/MIT)

---

<p align="center">
  Made by <a href="https://github.com/Raymond-Hear">聆风Raymond</a>
</p>
