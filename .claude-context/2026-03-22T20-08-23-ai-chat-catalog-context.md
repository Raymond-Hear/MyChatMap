# Context Handoff: AI对话目录插件

> **Saved**: 2026-03-22 20:08:23
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

A Chrome Extension (Manifest V3) that provides message-level catalog navigation for AI conversations across 4 Chinese AI platforms: Kimi, DeepSeek, 豆包 (Doubao), and 腾讯元宝 (Tencent Yuanbao). Users can see a floating panel listing all user messages in a conversation, click to jump to any message, rename entries, and export conversations to Markdown/ZIP. All data is stored locally in IndexedDB (privacy-first). Progress: 27/34 tasks (79%) complete.

**Tech Stack:**

| Component | Technology | Notes |
|-----------|-----------|-------|
| Language | JavaScript (plain, no TypeScript) | No build step |
| Extension API | Chrome Extension Manifest V3 | content_scripts + service_worker |
| Storage | IndexedDB + Dexie.js | lib/jszip.min.js bundled for ZIP export |
| UI | Inline CSS in content script | FAB floating button + hover-expand panel |
| Architecture | Adapter Pattern | Platform-specific adapters extend AIC_BaseAdapter |

**Project Structure:**

```
D:\ClaudeCode Code\AI对话目录插件/
├── manifest.json                      # Manifest V3, content_scripts for 4 platforms (kimi.com added)
├── background/
│   └── service-worker.js              # Background CRUD for IndexedDB
├── content/
│   ├── aic-main.js                    # Main entry (IIFE), adapter selection + UI + loading states
│   ├── aic-message-bus.js             # Chrome message wrapper
│   ├── aic-scroll-tracker.js          # IntersectionObserver scroll tracking (fixed global ref)
│   ├── aic-catalog-ui.js             # Modular UI component (UNUSED, main.js uses inline)
│   └── adapters/
│       ├── aic-base.js                # Base adapter class (interface definition)
│       ├── aic-doubao.js              # Doubao adapter (WORKING, unchanged)
│       ├── aic-kimi.js                # Kimi adapter (REWRITTEN 2026-03-22)
│       ├── aic-deepseek.js            # DeepSeek adapter (REWRITTEN 2026-03-22)
│       └── aic-yuanbao.js             # Yuanbao adapter (REWRITTEN 2026-03-22)
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

- **Context restore**: Loaded previous session context from `.claude-context/2026-03-22T23-30-00-ai-chat-catalog-context.md`. Project was at 76% completion with all 4 adapters "implemented" but untested.
- **User-reported bugs**: 5 issues across 3 platforms:
  1. Kimi: completely fails to detect chat page
  2. DeepSeek: detects the page but catalog is always empty
  3. Yuanbao: only shows 2 empty directory entries, clicks jump to top
  4. No loading state: shows empty catalog instead of "scanning..." indicator
  5. DeepSeek gray sidebar line: only appears on 2 conversations
- **Root cause research**: Dispatched 3 parallel research agents to investigate current DOM structures of Kimi, DeepSeek, and Yuanbao by analyzing 7+ Greasy Fork scripts and GitHub repos (latest from 2026-03-19).
- **Adapter rewrites**: Rewrote all 3 broken adapters with confirmed selectors.
- **Bug fixes**: Fixed scroll tracker global reference bug, added loading state UI, added lazy loading toast, filtered empty content entries.

### Key Outcomes

- **Kimi adapter**: Discovered kimi.moonshot.cn 302 redirects to kimi.com. Added kimi.com to manifest. Rewrote selectors to use `#scroll-list`, `div[data-message-id]`, `div[class^="chatItemBox_"]` with multi-strategy user/AI detection.
- **DeepSeek adapter**: Discovered `fa81` selector doesn't exist. Rewrote to use `.ds-message` stable semantic selector (distinguishes user/AI by presence of `.ds-markdown`). Hash class names kept as fallback. Handles DeepSeek R1 thinking chain (`.ds-think-content`).
- **Yuanbao adapter**: Discovered actual BEM selectors: `.agent-chat__list__item`, `--human` modifier, `.hyc-content-text`, `data-conv-speaker`. Explains why old generic selectors found nothing.
- **Loading UX**: Added spinner animation during initial scan, toast notification for lazy loading detection, filtered empty content entries.
- **Scroll tracker bug**: Fixed `window.__AICatalog.AIC_ScrollTracker` vs `window.__AICatalog_ScrollTracker` mismatch.
- **Progress**: 26/34 -> 27/34 (79%).

---

## 3. Progress & TODO Status

### Completed

- [x] Kimi adapter rewrite (aic-kimi.js) -- new selectors + kimi.com domain
- [x] DeepSeek adapter rewrite (aic-deepseek.js) -- .ds-message + hash fallback
- [x] Yuanbao adapter rewrite (aic-yuanbao.js) -- .agent-chat__ BEM selectors
- [x] manifest.json -- added `https://*.kimi.com/*`
- [x] Scroll tracker global reference bug fix (aic-scroll-tracker.js)
- [x] Loading state spinner in panel (aic-main.js)
- [x] Lazy loading toast notification (aic-main.js)
- [x] Empty content entry filtering (aic-main.js updateCatalog)
- [x] Project progress table updated (项目进度表.md)

### In Progress

(none)

### Not Started

- [ ] #21 Module UI unification (aic-main.js inline UI vs aic-catalog-ui.js)
- [ ] #27 Popup about information
- [ ] #28 Error prompt UI
- [ ] #16 History conversation processing toggle
- [ ] #32 Edge compatibility testing
- [ ] #33 Unit tests
- [ ] #34 Performance optimization

### Blocked / TBD

- [ ] **Real-world testing**: All 3 rewritten adapters are based on Greasy Fork script research, NOT on actual browser DevTools inspection. They need to be tested on the real websites. Kimi's user/AI message differentiation is particularly uncertain (relies on class name keyword matching and fallback heuristics).

---

## 4. Key Decisions Made

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Kimi uses `#scroll-list` + `div[data-message-id]` | Confirmed from Greasy Fork "AI Chat Window Enhancer Pro" script (#517672) | Could use API interception (like export script does) but adds complexity |
| DeepSeek uses `.ds-message` as primary selector | Stable semantic class, confirmed by 7 scripts including Feb 2026 script. Hash classes change with builds. | Could keep only hash classes but would break every DeepSeek update |
| Yuanbao uses `.agent-chat__list__item--human` BEM | Confirmed by 5 scripts + 52pojie script from 2026-03-19. BEM naming is Tencent's internal convention. | Could use `data-conv-speaker` attribute (also works, kept as fallback) |
| Filter empty content entries instead of showing them | User reported confusing UX with 2 empty entries. Better to show nothing than empty items. | Could show "[加载中...]" per entry but adds visual clutter |
| Two-tier selector strategy (semantic + fallback) | Semantic selectors are stable but may not exist on older versions. Hash classes work on current version but break on updates. | Could use only one tier but reduces robustness |

---

## 5. Files Modified

### Modified

| File | Changes Made |
|------|-------------|
| `manifest.json` | Added `https://*.kimi.com/*` to content_scripts matches |
| `content/adapters/aic-kimi.js` | Complete rewrite (192 lines). Selectors: `#scroll-list`, `div[data-message-id]`, `div[class^="chatItemBox_"]`. Multi-strategy user/AI detection (data attrs, class keywords, avatar analysis, index fallback). Content extraction from `.hyc-content-text`, `.segment-content`, etc. |
| `content/adapters/aic-deepseek.js` | Complete rewrite (233 lines). Primary: `.ds-message` + `.ds-markdown` for user/AI distinction. Fallback: hash classes `._9663006` (user), `._4f9bf79` (AI). Handles R1 thinking chain (`.ds-think-content`). Updated hash classes to `_9663006` (was `fa81`). |
| `content/adapters/aic-yuanbao.js` | Complete rewrite (285 lines). Primary: `.agent-chat__list__item` + `--human` modifier. Content: `.hyc-content-text`, `.hyc-content-md`. Fallback: `data-conv-speaker` attribute. Notes virtual scrolling limitation (only visible messages in DOM). |
| `content/aic-scroll-tracker.js` | Fixed global export: `window.__AICatalog_ScrollTracker` (was `window.__AICatalog.AIC_ScrollTracker`) |
| `content/aic-main.js` | Added: `showLoadingState()` with spinner CSS, `showToast()` with fade animation CSS. Modified `updateCatalog()`: filters empty content entries, shows lazy loading toast when 30%+ messages are empty, updates visible count. Modified `start()`: calls `showLoadingState()` after panel creation. Added CSS for `.aic-loading`, `.aic-loading-spinner`, `.aic-toast`, `@keyframes aic-spin`, `@keyframes aic-toast-fade`. |
| `项目进度表.md` | Updated: 27/34 (79%). Added "2026-03-22 修复记录" section documenting all adapter fixes, bug fixes, and new features. |

---

## 6. Technical Context

### Patterns & Conventions

- **Adapter Pattern**: Each platform extends `AIC_BaseAdapter`, overrides `matches()`, `getMessageList()`, `getConversationId()`, `getConversationTitle()`
- **Registration**: Adapters register to `window.__AICatalog_Adapters[ClassName]`
- **IIFE Architecture**: `aic-main.js` is a self-contained IIFE
- **Selector Strategy**: Each adapter now uses a two-tier approach: stable semantic selectors (primary) + hash/generic selectors (fallback)
- **Function naming**: `AIC_Utils.safeText()` is used in adapters
- **Log prefix**: `[AI对话目录]` used throughout

### Important Code References

- `selectAdapter()`: `content/aic-main.js:34-65` -- Adapter selection logic
- `updateCatalog()`: `content/aic-main.js:409-485` -- Now filters empty entries + shows lazy loading toast
- `showLoadingState()`: `content/aic-main.js:90-93` -- Spinner during initial scan
- `showToast()`: `content/aic-main.js:95-104` -- Lazy loading notification
- `getMessageList()` (Kimi): `content/adapters/aic-kimi.js:30-71` -- data-message-id + chatItemBox_ strategies
- `getMessageList()` (DeepSeek): `content/adapters/aic-deepseek.js:39-112` -- .ds-message strategy + hash fallback
- `getMessageList()` (Yuanbao): `content/adapters/aic-yuanbao.js:37-111` -- BEM + data-conv-speaker + generic fallback
- `_analyzeMessage()` (Kimi): `content/adapters/aic-kimi.js:130-168` -- 4-tier user/AI detection

### Confirmed Selectors Summary

| Platform | Container | Message Item | User Detection | Content |
|----------|-----------|-------------|---------------|---------|
| Doubao | `[data-testid="chat-messages-container"]` | `data-testid=send/receive_message` | `data-testid` | `data-testid="message_text_content"` |
| Kimi | `#scroll-list` | `div[data-message-id]` or `div[class^="chatItemBox_"]` | class keywords, avatar, data attrs | `.hyc-content-text`, `.segment-content` |
| DeepSeek | `.ds-message` parent | `.ds-message` | has `.ds-markdown` = AI, no = user | `.ds-markdown` (AI), direct text (user) |
| Yuanbao | `.agent-chat__container` | `.agent-chat__list__item` | `--human` modifier | `.hyc-content-text`, `.hyc-content-md` |

---

## 7. Open Questions & Risks

| Question/Risk | Status | Notes |
|---------------|--------|-------|
| Kimi user/AI differentiation untested | Open | Selectors from Greasy Fork scripts; `data-message-id` existence confirmed but role distinction needs DevTools verification. Fallback uses class keyword matching + index parity. |
| DeepSeek `.ds-message` availability | Open | Confirmed by 7 scripts including Feb 2026, but need real browser test. Hash class names `_9663006`/`_4f9bf79` may already be outdated. |
| Yuanbao virtual scrolling | Open | Only visible messages exist in DOM. Full conversation requires scrolling to trigger rendering or API interception. Current adapter shows only what's visible. |
| Gray sidebar line on DeepSeek | Resolved | Was the FAB button in snap-right state; only appeared on 2 conversations because only those had working selectors. Should be fixed with new adapter. |
| `aic-catalog-ui.js` unused | Open | main.js uses inline UI. Should either adopt it or remove from manifest to save load time. |
| PRD Section 11 unconfirmed items | Open | Plugin name, author homepage link, contact email, IP character image |

---

## 8. Next Steps (Ordered)

1. **Test all platform adapters on real websites**: This is the highest priority. Load the extension in Chrome, open each platform (Kimi at kimi.com, DeepSeek at chat.deepseek.com, Doubao at doubao.com, Yuanbao at yuanbao.tencent.com), verify messages are detected, catalog panel appears, and click-to-jump works. Use DevTools Console to check `[AI对话目录]` log output for selector matching results.

2. **Fix any broken selectors based on testing**: If selectors don't match, open DevTools Elements panel on the target platform, inspect actual chat message DOM, and update the adapter accordingly. Pay special attention to:
   - Kimi: How user vs AI messages differ (check for `data-role`, `data-speaker`, avatar elements)
   - DeepSeek: Whether `.ds-message` exists and whether `.ds-markdown` reliably indicates AI messages
   - Yuanbao: Whether `.agent-chat__list__item` and `--human` modifier are present

3. **P1 tasks** (can be done in parallel with testing):
   - #27 Popup about information (add version, author link, privacy note to popup.html)
   - #28 Error prompt UI (add error state to panel when adapter fails to find messages)
   - #21 Module UI unification (decide: adopt aic-catalog-ui.js or keep inline in aic-main.js)

4. **GitHub security check**: Before publishing, run `/github-security-check` to scan for sensitive data.

### Suggested Approach for New Session

The user has reported specific bugs on 3 platforms. The adapters have been rewritten based on research but NOT tested on real websites. The new session should focus on getting the user to test and then iterating on any remaining selector issues. Start by asking the user to test on each platform and report results, then fix selectors based on actual DOM inspection if needed.

---

## 9. Context Backup History

| Date | File | Notes |
|------|------|-------|
| 2026-03-22 23:30 | `2026-03-22T23-30-00-ai-chat-catalog-context.md` | Initial context save. Implemented all 4 platform adapters, refactored main.js. Progress: 76%. |
| 2026-03-22 20:08 | `2026-03-22T20-08-23-ai-chat-catalog-context.md` | Bug fix session. Rewrote Kimi/DeepSeek/Yuanbao adapters with confirmed selectors. Fixed scroll tracker bug. Added loading state + lazy loading toast. Progress: 79%. |

---

*This context backup was generated by the context-save skill (上下文接力).*
*To continue, start a new Claude Code session and reference this file.*
