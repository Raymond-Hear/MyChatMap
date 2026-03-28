# AI对话目录插件 - 上下文接力文档

**生成时间**: 2026-03-24 01:34:27
**项目路径**: D:\ClaudeCode Code\AI对话目录插件
**当前版本**: v0.0.1
**作者**: 聆风Raymond

---

## 1. 项目概述

**AI对话目录插件** 是一款 Chrome 浏览器扩展，为 Kimi、DeepSeek、豆包、腾讯元宝等国内 AI 平台提供**消息级目录导航**功能。

### 核心功能
- 实时自动生成对话目录（基于 MutationObserver）
- 右侧 Minimap 导航条（DeepSeek 风格），悬停展开完整目录面板
- 点击目录条目跳转到对应消息位置
- 条目重命名功能（持久化到 IndexedDB）
- 导出当前对话/所有对话（Markdown/ZIP）
- 纯本地存储，隐私安全

### 技术栈
- Manifest V3 Chrome 扩展
- Vanilla JavaScript（无框架）
- IndexedDB + Dexie.js 数据持久化
- IntersectionObserver 滚动位置跟踪

---

## 2. 当前进度

**总体完成度**: 30/34（88%）

### 已完成（30项）
- ✅ 基础架构（Manifest V3、项目结构、消息通信）
- ✅ 4个平台适配器（Kimi、DeepSeek、豆包、腾讯元宝）
- ✅ Minimap 导航条（右侧细条，条目居中排列）
- ✅ 悬停展开目录面板（220px 宽，显示完整条目列表）
- ✅ 条目重命名（面板内直接编辑，回车确认）
- ✅ 当前位置高亮（minimap + 面板同步高亮）
- ✅ 导出功能（Markdown/ZIP）
- ✅ Popup 面板（已存对话、导出按钮、关于信息）
- ✅ 数据层（IndexedDB、Service Worker CRUD）
- ✅ 图片/附件图标标识（🖼️ 📎）

### 未完成（4项）
- ⬜ #28 错误提示 UI（解析失败时的俏皮提示 + 反馈入口）- P1
- ⬜ #32 Edge 兼容性测试 - P2
- ⬜ #33 单元测试 - P2
- ⬜ #34 性能优化验证 - P2

---

## 3. 本次会话完成的工作

### 3.1 Bug 修复

#### Kimi 目录不显示问题
**文件**: `content/adapters/aic-kimi.js`

**修改内容**:
- 改进了 `_extractContent` 方法，添加更多内容选择器
- 使用 TreeWalker 遍历文本节点，更可靠地提取内容
- 添加了调试日志

```javascript
// 优先选择器列表
['.hyc-content-text', '.hyc-content-md', '.segment-content',
 '[class*="content"]', '[class*="text"]', '[class*="markdown"]',
 '.prose', '.rich-text']
```

#### Kimi/DeepSeek 不自动保存问题
**文件**: `content/aic-main.js`

**修改内容**:
- 原来只在消息数量变化时保存，现在只要有消息就会保存
- 修改了 `refreshCatalog` 函数中的保存逻辑

```javascript
// 只要有消息就保存（不只是数量变化时）
if (messages.length > 0) {
  lastMessageCount = messages.length;
  saveConversationToDB(messages);
}
```

#### 鼠标闪烁问题
**文件**: `content/aic-catalog-ui.js`

**修改内容**:
- 使用 `pointer-events: none/auto` 替代 `visibility`
- 简化了过渡动画

```css
#aic-panel {
  pointer-events: none;
  transition: width 0.2s ease, opacity 0.2s ease;
}
#aic-catalog-container:hover #aic-panel {
  pointer-events: auto;
}
```

#### 跳转位置不精准问题
**文件**: `content/aic-catalog-ui.js`

**修改内容**:
- 改进了 `_onItemClick` 函数
- 添加了视口检测，如果 `scrollIntoView` 不成功，使用备用滚动方案

```javascript
// 备用方案：如果 scrollIntoView 不工作，使用 scrollTo
setTimeout(() => {
  const rect = targetEl.getBoundingClientRect();
  const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
  if (!isInViewport) {
    const scrollTop = window.pageYOffset + rect.top - window.innerHeight / 2 + rect.height / 2;
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
  }
}, 350);
```

### 3.2 功能优化

#### 图片/附件图标标识
**文件**: `content/aic-catalog-ui.js`, `content/adapters/aic-kimi.js`

**修改内容**:
- 在 Kimi 适配器中添加 `hasFile` 检测
- 在目录面板中显示图标：🖼️ 图片、📎 文件

```javascript
// 确定图标
let icon = '';
if (isImageOnly || msg.hasImage) {
  icon = '🖼️ ';
} else if (isFileOnly || msg.hasFile) {
  icon = '📎 ';
}
```

### 3.3 PRD 更新
**文件**: `【PRD】AI对话目录插件.md`

- 添加了"已知问题与后续优化"章节
- 记录了当前 Bug 和功能优化项

---

## 4. 文件结构

```
AI对话目录插件/
├── manifest.json                    # Manifest V3 配置
├── content/
│   ├── aic-main.js                  # 主入口，适配器选择，数据持久化
│   ├── aic-catalog-ui.js            # Minimap + 目录面板 UI
│   ├── aic-scroll-tracker.js        # IntersectionObserver 滚动追踪
│   ├── aic-message-bus.js           # 消息通信
│   └── adapters/
│       ├── aic-base.js              # 适配器基类
│       ├── aic-kimi.js              # Kimi 适配器（已修复内容提取）
│       ├── aic-deepseek.js          # DeepSeek 适配器
│       ├── aic-doubao.js            # 豆包适配器
│       └── aic-yuanbao.js           # 腾讯元宝适配器
├── popup/
│   ├── popup.html                   # Popup 面板 HTML
│   └── popup.js                     # Popup 逻辑
├── background/
│   └── service-worker.js            # Service Worker，IndexedDB CRUD
├── shared/
│   ├── db.js                        # Dexie.js 数据库封装
│   ├── aic-utils.js                 # 工具函数
│   └── aic-constants.js             # 常量
├── lib/
│   └── jszip.min.js                 # JSZip 库（导出 ZIP）
├── icons/                           # 插件图标
├── 项目进度表.md                     # 进度追踪
├── 【PRD】AI对话目录插件.md          # 产品需求文档（已更新）
└── .claude-context/                 # 上下文接力文件
```

---

## 5. 关键代码位置

### Minimap UI 组件
**文件**: `content/aic-catalog-ui.js`

**主要方法**:
- `init(themeColor)` - 初始化容器、minimap、面板
- `update(messages, themeColor)` - 更新目录数据
- `_renderMinimap()` - 渲染右侧细条横线
- `_renderPanel()` - 渲染悬停面板
- `_onItemClick(index)` - 点击跳转（已改进滚动逻辑）
- `_startRename(itemEl, message)` - 重命名

**DOM 结构**:
```javascript
#aic-catalog-container
  ├── #aic-minimap           // 右侧细条
  │     └── .aic-minimap-line // 横线条目
  └── #aic-panel             // 悬停展开的面板
        ├── .aic-panel-header // 标题"对话目录"
        └── .aic-panel-content
              └── .aic-panel-item  // 目录条目
                    ├── .aic-panel-index   // 序号
                    ├── .aic-panel-text    // 内容（含 🖼️/📎 图标）
                    └── .aic-panel-rename  // 重命名按钮
```

### Kimi 适配器（已修复）
**文件**: `content/adapters/aic-kimi.js`

**关键改进**:
```javascript
// 改进的内容提取逻辑
_extractContent(messageEl) {
  // 1. 尝试多个选择器
  // 2. 使用 TreeWalker 遍历文本节点
  // 3. 排除按钮、图标、头像等噪声
  // 4. 清理 UI 文本噪声
}
```

---

## 6. 待办事项（Next Steps）

### P1 - 发布前建议完成
- [ ] **错误提示 UI (#28)**
  - 当页面解析失败时，显示俏皮提示
  - 示例："喵~ 页面好像变了，等我主人更新一下 🐱"
  - 添加反馈入口（GitHub issue 链接）
  - 建议位置：`aic-main.js` 中 `selectAdapter()` 返回 null 时

### P2 - 发布后迭代
- [ ] Edge 兼容性测试
- [ ] 单元测试
- [ ] 性能优化验证（目录生成 <500ms、跳转 <100ms、内存 <50MB）

---

## 7. 快速恢复指令

如需继续开发，请执行：

```bash
# 1. 读取项目进度表
Read 项目进度表.md

# 2. 查看最新代码
Read content/aic-catalog-ui.js
Read content/adapters/aic-kimi.js

# 3. 如需开发错误提示 UI，查看主入口
Read content/aic-main.js
```

---

## 8. 注意事项

1. **Minimap 条目居中**: 使用 `justify-content: center` 实现从中间向两边扩散
2. **面板悬停交互**: 鼠标移到 `#aic-catalog-container` 时面板展开，使用 `pointer-events` 控制
3. **重命名逻辑**: 点击 ✏️ 按钮后，原文本隐藏，显示输入框，回车确认，ESC 取消
4. **Kimi 内容提取**: 如果仍有问题，检查控制台日志，查看哪个选择器匹配成功
5. **数据持久化**: 现在只要有消息就会保存，不只是数量变化时

---

## 9. 测试建议

刷新页面后测试以下功能：

1. **Kimi 目录显示** - 打开 Kimi 对话，查看目录是否正常显示
2. **自动保存** - 在 Kimi/DeepSeek 发送消息，检查是否能导出
3. **鼠标悬停** - 检查面板是否正常展开，无闪烁
4. **跳转功能** - 点击目录条目，检查是否跳转到正确位置
5. **图片/文件标识** - 发送带图片/文件的消息，检查是否显示图标

---

*此文档由 Claude Code 自动生成，用于会话上下文接力。*
