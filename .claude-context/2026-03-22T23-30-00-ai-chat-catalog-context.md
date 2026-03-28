# Context Handoff: AI对话目录插件

> **Saved**: 2026-03-22 23:30:00
> **Project**: AI对话目录插件 (Chrome Extension)
> **Working Directory**: D:\ClaudeCode Code\AI对话目录插件
> **Model**: Sonnet 4.5

---

## Quick Resume Instructions

Read this entire file to understand the context. Then:

1. Navigate to the working directory: `D:\ClaudeCode Code\AI对话目录插件`
2. Review the "Next Steps" section below.
3. Begin working on the first next step.
4. Reference "Key Decisions" to avoid revisiting settled questions.

---

## 1. Project Overview

**What is this project?**

A Chrome Extension (Manifest V3) that provides message-level catalog navigation for AI conversations across 4 Chinese AI platforms: Kimi, DeepSeek, 豆包 (Doubao), and 腾讯元宝 (Tencent Yuanbao). Users can see a floating panel listing all user messages in a conversation, click to jump to any message, rename entries, and export conversations to Markdown/ZIP. All data is stored locally in IndexedDB (privacy-first).

**Tech Stack:**

| Component | Technology | Notes |
|-----------|-----------|-------|
| Language | JavaScript (plain, no TypeScript) | No build step |
| Extension API | Chrome Extension Manifest V3 | content_scripts + service_worker |
| Storage | IndexedDB + Dexie.js | lib/jszip.min.js bundled for ZIP export |
| UI | Inline CSS in content script | FAB floating button + hover-expand panel |
| Architecture | Adapter Pattern | Platform-specific adapters extend AIC_BaseAdapter |

**Project Structure (relevant parts):**

```
D:\ClaudeCode Code\AI对话目录插件/
├── manifest.json                      # Manifest V3, content_scripts for 4 platforms
├── background/
│   └── service-worker.js              # Background CRUD for IndexedDB
├── content/
│   ├── aic-main.js                    # Main entry (IIFE), adapter selection + UI
│   ├── aic-message-bus.js             # Chrome message wrapper
│   ├── aic-scroll-tracker.js          # IntersectionObserver scroll tracking
│   ├── aic-catalog-ui.js             # Modular UI component (UNUSED, main.js uses inline)
│   └── adapters/
│       ├── aic-base.js                # Base adapter class (interface definition)
│       ├── aic-doubao.js              # Doubao adapter (COMPLETE)
│       ├── aic-kimi.js                # Kimi adapter (IMPLEMENTED)
│       ├── aic-deepseek.js            # DeepSeek adapter (IMPLEMENTED)
│       └── aic-yuanbao.js             # Yuanbao adapter (IMPLEMENTED)
├── popup/
│   ├── popup.html                     # Extension popup UI
│   └── popup.js                       # Popup logic (export, clear data)
├── shared/
│   ├── aic-constants.js               # Constants
│   ├── aic-utils.js                   # Utility functions (AIC_Utils.safeText etc.)
│   └── db.js                         # Dexie.js IndexedDB schema
├── lib/
│   └── jszip.min.js                   # JSZip for ZIP export
├── icons/                             # Extension icons (16, 48, 128)
├── 【PRD】AI对话目录插件.md            # Full product requirements document
├── 项目进度表.md                      # Project progress tracking (updated)
└── .claude-context/                    # Context backups (local only)
```

---

## 2. Conversation Summary

### What We Discussed

- **Project exploration**: Analyzed the entire codebase to understand architecture, current implementation status, and what remained to be done.
- **Progress table creation**: Created `项目进度表.md` with 33 (now 34) tracked tasks across 8 categories.
- **Platform adapter implementation**: Researched DOM structures for Kimi, DeepSeek, and Tencent Yuanbao by analyzing open-source Greasy Fork userscripts (exporters, navigators, etc.) that target these platforms.
- **Main entry refactoring**: Rewrote `aic-main.js` from hardcoded Doubao-only logic to a multi-platform adapter pattern with dynamic adapter selection.
- **Adapter implementation**: Implemented all 3 remaining platform adapters (Kimi, DeepSeek, Yuanbao) with appropriate DOM selector strategies.

### Key Outcomes

- **P0 blocker resolved**: All 4 platform adapters are now implemented, unblocking the MVP release.
- **Architecture improvement**: `aic-main.js` now uses `selectAdapter()` to dynamically pick the right adapter based on the current URL, with SPA route change detection supporting cross-platform navigation.
- **Project progress**: Completion rate went from ~67% (22/33) to ~76% (26/34).

---

## 3. Progress & TODO Status

### Completed

- [x] Project exploration and codebase analysis
- [x] Created project progress tracking table (`项目进度表.md`)
- [x] Researched Kimi DOM structure (found `.chat-content-item-user/assistant` selectors from Kimi K2 exporter script)
- [x] Researched DeepSeek DOM structure (found `.dad65929` container, `fa81`/`f9bf7997` message classes, `ds-markdown` content from multiple Greasy Fork scripts)
- [x] Researched Yuanbao DOM structure (no public docs found; implemented multi-strategy fallback approach)
- [x] Refactored `aic-main.js` to multi-platform adapter pattern
- [x] Implemented Kimi adapter (`content/adapters/aic-kimi.js`)
- [x] Implemented DeepSeek adapter (`content/adapters/aic-deepseek.js`)
- [x] Implemented Yuanbao adapter (`content/adapters/aic-yuanbao.js`)
- [x] Updated project progress table

### In Progress

(none)

### Not Started

- [ ] #21 Module UI unification (aic-main.js inline UI vs aic-catalog-ui.js)
- [ ] #17 Lazy loading detection prompt
- [ ] #27 Popup about information
- [ ] #28 Error prompt UI
- [ ] #16 History conversation processing toggle
- [ ] #32 Edge compatibility testing
- [ ] #33 Unit tests
- [ ] #34 Performance optimization

---

## 4. Key Decisions Made

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Kimi uses semantic class names (`.chat-content-item-user`) | Confirmed from Kimi K2 exporter Greasy Fork script | Could have used hash class detection like DeepSeek |
| DeepSeek uses CSS Modules hash class names (`fa81`, `f9bf7997`) | Confirmed from multiple Greasy Fork scripts; these are partial matches | Could use `ds-markdown` only but would miss container structure |
| Yuanbao uses multi-strategy fallback detection | No public DOM docs available; used data-role, class keywords, layout direction detection | Could wait for manual inspection but would block development |
| main.js remains IIFE with inline UI (not modular) | Keeps the approach consistent with existing working code; avoids breaking changes | Could refactor to use aic-catalog-ui.js but adds risk |
| Adapter selection happens at runtime via `selectAdapter()` | Allows dynamic platform switching without page reload | Could use manifest content_scripts per-platform but duplicates code |

---

## 5. Files Modified

### Created

| File | Purpose |
|------|---------|
| `项目进度表.md` | Project progress tracking table with 34 tasks |

### Modified

| File | Changes Made |
|------|-------------|
| `content/adapters/aic-kimi.js` | Replaced placeholder with full implementation (125 lines). Selectors: `.chat-content-item`, `.chat-content-item-user`, `.segment-content` |
| `content/adapters/aic-deepseek.js` | Replaced placeholder with full implementation (165 lines). Selectors: `.dad65929` container, `fa81`/`f9bf7997` message classes, `ds-markdown` content |
| `content/adapters/aic-yuanbao.js` | Replaced placeholder with full implementation (297 lines). Multi-strategy: data-role, class keywords, layout direction, fallback global search |
| `content/aic-main.js` | Major refactor: removed hardcoded Doubao functions (`isDoubaoPage`, `isChatPage`, `getMessageList`, `getConversationId`, `getConversationTitle`, `getModel`), added `selectAdapter()` function, proxy functions through adapter, platform switching support in SPA route detection. Added platform name display in panel header. |

---

## 6. Technical Context

### Patterns & Conventions

- **Adapter Pattern**: Each platform extends `AIC_BaseAdapter`, overrides `matches()`, `getMessageList()`, `getConversationId()`, `getConversationTitle()`
- **Registration**: Adapters register to `window.__AICatalog_Adapters[ClassName]`
- **IIFE Architecture**: `aic-main.js` is a self-contained IIFE, does NOT rely on global adapter classes (they're loaded by manifest order but the IIFE uses `window.__AICatalog_Adapters` directly)
- **Selector Strategy**: Doubao uses `data-testid` (stable); DeepSeek uses hash class partial matching (`_hasClassPart`); Kimi uses semantic classes; Yuanbao uses multi-strategy fallback
- **Function naming**: `AIC_Utils.safeText()` is used in adapters (from shared/aic-utils.js)
- **Log prefix**: `[AI对话目录]` used throughout

### Important Code References

- `selectAdapter()`: `content/aic-main.js:34-65` -- Iterates adapter classes, instantiates and calls `matches()` to find the right one
- `getMessageList()` proxy: `content/aic-main.js:527-530` -- Delegates to `adapter.getMessageList()`
- `startMutationObserver()`: `content/aic-main.js:723-752` -- Gets container via `adapter.getMessageContainer()` for focused observation
- SPA route detection: `content/aic-main.js:756-806` -- Detects URL changes, re-selects adapter, handles platform switches
- `_hasClassPart()`: `content/adapters/aic-deepseek.js:136-141` -- Partial class name matching for CSS Modules
- `_detectMessageType()`: `content/adapters/aic-yuanbao.js:190-231` -- 4-strategy message type detection

### Configuration & Environment

- `manifest.json` declares content_scripts for all 4 platforms with load order: constants → utils → message-bus → base adapter → kimi → deepseek → doubao → yuanbao → scroll-tracker → catalog-ui → main
- Permissions: `storage`, `activeTab`
- No build step required; plain JS files loaded by Chrome Extension

---

## 7. Open Questions & Risks

| Question/Risk | Status | Notes |
|---------------|--------|-------|
| Kimi selectors based on Kimi K2 exporter script | Open | The script targets `kimi.com/chat/*` (new domain); `kimi.moonshot.cn` may have different DOM. Needs testing |
| DeepSeek hash class names will change with updates | Open | `fa81`, `f9bf7997`, `dad65929` are version-specific. The `ds-markdown` selector is more stable |
| Yuanbao adapter uses generic detection (no confirmed selectors) | Open | The multi-strategy approach may have false positives/negatives. Needs real-world testing |
| `aic-catalog-ui.js` exists but is unused | Open | main.js uses inline UI. Should either adopt it or delete it |
| PRD Section 11 has unconfirmed items | Open | Plugin name, author homepage link, contact email, IP character image |
| No unit tests exist | Open | Critical for maintaining adapter selectors across platform updates |

---

## 8. Next Steps (Ordered)

1. **Test all platform adapters on real websites**: Open each platform (Kimi, DeepSeek, Doubao, Yuanbao) in a browser with the extension loaded. Verify that messages are detected, the catalog panel appears, and click-to-jump works. This is the highest priority since selector validity is unconfirmed for 3 of 4 platforms.

2. **Fix any broken selectors**: Based on testing results, update the selector strings in the adapter files. For DeepSeek, pay attention to hash class name changes. For Yuanbao, add confirmed selectors if found during inspection.

3. **P1 tasks**: Implement lazy loading detection (#17), Popup about info (#27), error prompt UI (#28). These are relatively independent and can be done in any order.

4. **Module UI unification (#21)**: Decide whether to adopt `aic-catalog-ui.js` or keep the inline approach in `aic-main.js`. The inline approach is simpler but duplicates code.

5. **GitHub security check**: Before publishing, run a security scan to ensure no sensitive data (API keys, tokens, local paths) are included in the repo.

---

## 9. Context Backup History

| Date | File | Notes |
|------|------|-------|
| 2026-03-22 | `2026-03-22T23-30-00-ai-chat-catalog-context.md` | Initial context save. Implemented all 4 platform adapters, refactored main.js to multi-platform adapter pattern. Progress: 76% complete. |

---

*This context backup was generated by the context-save skill (上下文接力).*
*To continue, start a new Claude Code session and reference this file.*
