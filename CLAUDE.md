# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ChatMap** (formerly AI对话目录插件) is a Chrome browser extension (Manifest V3) that provides message-level catalog navigation and knowledge graph management for AI chat platforms including Doubao and Tencent Yuanbao. It generates a real-time table of contents for long conversations, allowing users to quickly jump to any message.

> **v0.2.0**: Only Doubao (豆包) and Tencent Yuanbao (腾讯元宝) are supported. Kimi and DeepSeek adapters have been removed. New features: tag management and knowledge graph view (vis-network).

## Architecture

### Extension Structure (Manifest V3)

```
manifest.json
├── background/service-worker.js    # IndexedDB CRUD operations
├── content/                        # Content scripts injected into AI platforms
│   ├── aic-main.js                 # Main entry point, adapter selection
│   ├── aic-catalog-ui.js           # Minimap navigation UI component
│   ├── aic-scroll-tracker.js       # IntersectionObserver scroll tracking
│   ├── aic-message-bus.js          # Chrome message passing wrapper
│   └── adapters/                   # Platform-specific DOM adapters
│       ├── aic-base.js             # Base adapter class
│       ├── aic-doubao.js           # Doubao (doubao.com)
│       └── aic-yuanbao.js          # Tencent Yuanbao
├── chatmap-graph.html              # Knowledge graph page (new tab)
├── popup/                          # Extension popup panel
│   ├── popup.html
│   └── popup.js
├── shared/                         # Shared utilities
│   ├── aic-constants.js            # Constants and message types
│   ├── aic-utils.js                # Utility functions
│   └── db.js                       # Dexie.js database schema
└── lib/                            # Third-party libraries
    ├── dexie.mjs                   # IndexedDB wrapper
    ├── jszip.min.js                # ZIP export
    └── vis-network.min.js          # Knowledge graph visualization
```

### Key Architectural Patterns

**1. Adapter Pattern for Platform Support**
Each AI platform has its own DOM structure. Adapters extend `AIC_BaseAdapter` and implement:
- `matches()` - Check if adapter supports current URL
- `getMessageList()` - Extract messages from DOM
- `getConversationId()` - Unique ID for the conversation
- `_analyzeMessage()` - Determine if message is user or AI

**2. Module Loading Order**
Files load in sequence via manifest.json (critical for dependencies):
1. `shared/aic-constants.js` - Constants available globally
2. `shared/aic-utils.js` - `AIC_Utils` utility object
3. `content/adapters/aic-base.js` - Base adapter class
4. Platform adapters (kimi, deepseek, doubao, yuanbao)
5. `content/aic-catalog-ui.js` - UI component
6. `content/aic-main.js` - Main orchestration

**3. Communication Flow**
- Content scripts → Service Worker: `chrome.runtime.sendMessage()`
- Message types defined in `AIC_CONSTANTS` (MSG_SAVE_CONVERSATION, etc.)
- Service Worker handles all IndexedDB operations via Dexie.js

**4. State Management**
- Uses global namespace: `window.__AICatalog` and `window.__AICatalog_Adapters`
- No framework - plain ES6+ with IIFE pattern
- IndexedDB for persistence (conversations and settings tables)

## Development Workflow

**No build system** - Direct file loading:
1. Open Chrome/Edge → Extensions → Developer mode
2. "Load unpacked" → Select project root directory
3. Edit files directly
4. Click "Reload" in extension management page to refresh

**Testing:**
- Manual testing only (no test framework configured)
- Test on each supported platform: Kimi, DeepSeek, Doubao, Tencent Yuanbao
- Check browser console for `[AI对话目录]` prefixed logs

## Common Issues When Modifying Code

**1. SVG className Error**
SVG elements have `SVGAnimatedString` for className, not string. Use the `_getClassName()` helper in adapters:
```javascript
_getClassName(el) {
  if (typeof el.className === 'string') return el.className;
  if (el.className?.baseVal) return el.className.baseVal;
  return el.getAttribute('class') || '';
}
```

**2. URL Pattern Matching**
Platform URLs vary:
- Doubao: `www.doubao.com`
- Yuanbao: `yuanbao.tencent.com`
Adapters must handle all URL variants in `matches()` and `getConversationId()`.

**3. DOM Selection Strategy**
Platforms use CSS Modules with hashed class names. Use multiple fallback selectors:
```javascript
const selectors = [
  '#scroll-list > div',
  '[class*="message"]',
  '[class*="chat-item"]',
];
```

**4. Message Type Detection**
User vs AI detection uses multiple strategies:
- data attributes (data-role, data-speaker)
- Image alt attributes
- SVG icons
- Markdown presence (AI messages usually have .ds-markdown)
- Position in container (alternating pattern)

## File Loading and Execution

Content scripts run at `document_idle`. The execution flow:
1. All JS files load in manifest-defined order
2. Each adapter registers itself to `window.__AICatalog_Adapters`
3. `aic-main.js` runs `selectAdapter()` to find matching adapter
4. `start()` initializes MutationObserver and UI
5. `refreshCatalog()` extracts messages and updates UI
6. `saveConversationToDB()` persists to IndexedDB via Service Worker

## Data Flow

```
DOM Mutation (new message)
  ↓
MutationObserver detects change
  ↓
refreshCatalog() calls adapter.getMessageList()
  ↓
updateCatalog() updates UI (aic-catalog-ui.js)
  ↓
saveConversationToDB() sends to Service Worker
  ↓
Service Worker saves to IndexedDB via Dexie.js
```

## Platform-Specific Notes

> **v0.2.0**: Only Doubao and Tencent Yuanbao are supported. Kimi and DeepSeek have been removed.

**Doubao (doubao.com):**
- Uses data-testid attributes
- Relatively stable selectors

**Tencent Yuanbao (yuanbao.tencent.com):**
- Uses BEM-style class names
- `.agent-chat__list__item` for messages

**Removed Platforms (for future reference):**
- Kimi: Used CSS Modules with hashed class names, messages in `#scroll-list` container
- DeepSeek: Had semantic classes `.ds-message`, `.ds-markdown`. Removed due to virtual scrolling/lazy loading causing incomplete message extraction

## Remaining Tasks (from 项目进度表.md)

- **#28** Error提示 UI - Show playful error messages when parsing fails
- **#32** Edge兼容性测试 - Test on Edge browser
- **#33** 单元测试 - Add unit tests
- **#34** 性能优化验证 - Validate performance metrics

## Important Constants

From `shared/aic-constants.js`:
- `MUTATION_DEBOUNCE: 300` - Delay before refreshing catalog
- `HIGHLIGHT_FLASH_COUNT: 3` - Number of highlight flashes on jump
- `TITLE_MAX_LENGTH: 8` - Default title length for catalog items
- `CATALOG_WIDTH: 240` - Width of catalog panel in pixels
