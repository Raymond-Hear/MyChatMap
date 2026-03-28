# Context Backup: AI对话目录插件

**Date:** 2025-03-25  
**Project:** AI对话目录插件 (AI Conversation Catalog Plugin)  
**Status:** Bug fixes in progress - Kimi and DeepSeek adapters

---

## Project Context

Chrome Extension (Manifest V3) providing message-level catalog navigation for AI chat platforms (Kimi, DeepSeek, Doubao, Tencent Yuanbao). Generates real-time table of contents for long conversations with right-side minimap navigation.

---

## Conversation Summary

User reported two critical issues:
1. **Kimi**: Directory empty (no messages detected)
2. **DeepSeek**: Not auto-saving conversations to IndexedDB

### Root Causes Identified

**Kimi Issue:**
- `svg.className` is `SVGAnimatedString`, not string - causing `toLowerCase()` error
- DOM selectors outdated (no `data-message-id` or `chatItemBox_` classes found)
- `_analyzeMessage()` method crashing before extracting messages

**DeepSeek Issue:**
- `getConversationId()` regex didn't match URL format `/a/chat/s/{uuid}`
- Missing `/s/` segment in pattern
- Caused "对话ID为空" (empty conversation ID) error

---

## Progress & TODO

### Completed
- [x] Fixed SVG className error in Kimi adapter (`_getClassName()` helper)
- [x] Updated Kimi `getMessageList()` to try multiple selectors
- [x] Fixed DeepSeek `getConversationId()` URL pattern matching
- [x] Improved DeepSeek `_detectMessageType()` with better user/AI detection
- [x] Added conversation change detection in `refreshCatalog()`
- [x] Enhanced debug logging throughout
- [x] Created CLAUDE.md documentation

### In Progress
- [ ] Testing Kimi fixes (user needs to verify)
- [ ] Testing DeepSeek fixes (user needs to verify)

### Next Steps (if issues persist)
1. Check browser console for `[AI对话目录]` logs
2. Verify Kimi shows: "Kimi 使用最佳选择器，找到 N 个元素"
3. Verify DeepSeek shows: "准备保存对话: deepseek_xxx"
4. If Kimi still fails, may need actual DOM inspection from user's browser
5. Consider adding more aggressive fallback selectors

---

## Files Modified

| File | Changes |
|------|---------|
| `content/adapters/aic-kimi.js` | Added `_getClassName()` helper, rewrote `getMessageList()` with multiple selector strategy, fixed `_analyzeMessage()` SVG handling, improved `getConversationId()` |
| `content/adapters/aic-deepseek.js` | Fixed `getConversationId()` URL patterns, added `_detectMessageType()` method, improved user/AI detection logic |
| `content/aic-main.js` | Added `currentConversationId` tracking, enhanced `refreshCatalog()` with conversation change detection, improved `saveConversationToDB()` logging |
| `content/aic-catalog-ui.js` | Added null checks and array validation in `update()` and `_renderPanel()` |
| `popup/popup.js` | Updated `detectPlatform()` to include `kimi.com` and `deepseek.com` domains |
| `manifest.json` | Added additional domain matches for kimi.com, deepseek.com, doubao.com |
| `CLAUDE.md` | Created documentation file |

---

## Key Technical Details

### SVG className Handling
SVG elements return `SVGAnimatedString` for `className`, not string. Always use:
```javascript
_getClassName(el) {
  if (typeof el.className === 'string') return el.className;
  if (el.className?.baseVal) return el.className.baseVal;
  return el.getAttribute('class') || '';
}
```

### URL Patterns by Platform
- **Kimi**: `https://www.kimi.com/chat/{uuid}` (uuid with hyphens)
- **DeepSeek**: `https://chat.deepseek.com/a/chat/s/{uuid}` (note the `/s/`)

### Adapter Selection Order
1. AIC_KimiAdapter
2. AIC_DeepseekAdapter
3. AIC_DoubaoAdapter
4. AIC_YuanbaoAdapter

### Message Detection Strategy
Uses multiple fallbacks:
1. data attributes (data-role, data-speaker)
2. Image alt/src attributes
3. SVG icons (with safe className access)
4. Markdown presence (AI messages typically have `.ds-markdown`)
5. Position in container (alternating user/AI pattern)

---

## Open Questions

1. Are the Kimi selectors finding the right elements? Need user to verify console logs.
2. Is DeepSeek correctly identifying user vs AI messages now? Need verification.
3. Should we add more defensive error handling around DOM access?

---

## Quick Resume Instructions

If continuing this session:

1. **Read the latest logs** from user to see if fixes worked
2. **If Kimi still fails:**
   - Ask user to open DevTools → Elements tab
   - Find the message container structure
   - Update selectors in `aic-kimi.js` `getMessageList()`
3. **If DeepSeek still fails:**
   - Check console for "准备保存对话" log
   - Verify URL format matches patterns in `getConversationId()`
4. **Test on all 4 platforms** when fixes are confirmed

---

## Notes

- Extension has no build system - direct file loading
- Reload extension in Chrome after each change
- Check `项目进度表.md` for remaining tasks (#28, #32, #33, #34)
- Current completion: 30/34 tasks (88%)
