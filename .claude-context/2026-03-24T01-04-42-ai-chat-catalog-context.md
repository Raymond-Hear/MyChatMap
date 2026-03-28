# AI对话目录插件 - 上下文接力文档

**生成时间**: 2026-03-24 01:04:42
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

### 未完成（4项）
- ⬜ #28 错误提示 UI（解析失败时的俏皮提示 + 反馈入口）- P1
- ⬜ #32 Edge 兼容性测试 - P2
- ⬜ #33 单元测试 - P2
- ⬜ #34 性能优化验证 - P2

---

## 3. 本次会话完成的工作

### 3.1 Minimap UI 重构（已完成）

**问题**: 原 UI 存在三个问题：
1. 导航条太长，占画面比例太高
2. 条目少时分散太开（使用 `space-evenly`）
3. Tooltip 位置偏差，无法点击重命名

**解决方案**: 完全重写 `content/aic-catalog-ui.js`

**新设计**:
```
┌─────────────────────────────────────┐
│                                     │
│         [AI对话内容区域]             │
│                                     │
│  用户消息1                          │
│  AI回复1                            │
│  用户消息2                          │
│                                     │
│                              ┌────┐ │
│                              │ ── │ │  ← Minimap（右侧细条）
│                              │ ── │ │    条目居中排列
│                              │ ── │ │
│                              └────┘ │
│                                ↓    │
│                         悬停时展开   │
│                                ↓    │
│   ┌────────────────────────────┐    │
│   │ 📑 对话目录          3 条  │    │  ← 目录面板
│   │ ─────────────────────────  │    │    220px 宽
│   │ ① 用户第一句话...      ✏️  │    │    显示序号+内容+重命名按钮
│   │ ② 第二句话内容...      ✏️  │    │
│   │ ③ 第三句话...          ✏️  │    │
│   └────────────────────────────┘    │
└─────────────────────────────────────┘
```

**关键实现**:
- 外层容器 `#aic-catalog-container` 包裹 minimap + 面板
- Minimap 使用 `justify-content: center`，条目从中间向两边扩散
- 面板默认 `width: 0`，悬停时展开为 `220px`
- 重命名按钮（✏️）悬停条目时显示，点击后变为输入框
- 面板固定显示，不会消失，可以自由操作

### 3.2 项目进度表更新（已完成）

更新了 `项目进度表.md`：
- 更新日期：2026-03-24
- 完成度从 27/34 更新为 30/34
- 标记 #16、#21、#27 为已完成
- 添加 2026-03-24 更新记录（UI 重构、Popup 完善、架构优化）

---

## 4. 文件结构

```
AI对话目录插件/
├── manifest.json                    # Manifest V3 配置
├── content/
│   ├── aic-main.js                  # 主入口，适配器选择，数据持久化
│   ├── aic-catalog-ui.js            # Minimap + 目录面板 UI（刚重写）
│   ├── aic-scroll-tracker.js        # IntersectionObserver 滚动追踪
│   ├── aic-message-bus.js           # 消息通信
│   └── adapters/
│       ├── aic-base.js              # 适配器基类
│       ├── aic-kimi.js              # Kimi 适配器（支持 kimi.com）
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
├── 【PRD】AI对话目录插件.md          # 产品需求文档
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
- `_onItemClick(index)` - 点击跳转
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
                    ├── .aic-panel-text    // 内容
                    └── .aic-panel-rename  // 重命名按钮
```

### 适配器基类
**文件**: `content/adapters/aic-base.js`

**主要方法**:
- `matches()` - 判断是否匹配当前页面
- `getMessageList()` - 获取消息列表
- `getConversationId()` - 获取对话ID
- `getConversationTitle()` - 获取对话标题

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

# 2. 查看最新代码（特别是刚重写的 UI 组件）
Read content/aic-catalog-ui.js

# 3. 如需继续开发错误提示 UI，查看主入口
Read content/aic-main.js
```

---

## 8. 注意事项

1. **Minimap 条目居中**: 使用 `justify-content: center` 实现从中间向两边扩散
2. **面板悬停交互**: 鼠标移到 `#aic-catalog-container` 时面板展开，离开时不立即消失（有过渡动画）
3. **重命名逻辑**: 点击 ✏️ 按钮后，原文本隐藏，显示输入框，回车确认，ESC 取消
4. **适配器选择**: `aic-main.js` 中的 `selectAdapter()` 按顺序尝试各适配器
5. **数据持久化**: 对话自动保存到 IndexedDB，重命名后也会立即保存

---

*此文档由 Claude Code 自动生成，用于会话上下文接力。*
