// AI对话目录插件 - 腾讯元宝适配器
// 适配 yuanbao.tencent.com 聊天页面
// 2026-03-22 更新：基于实际 DOM 调试结果修复
// 实际 DOM 确认（2026-03-22 DevTools 检查）：
//   - .agent-chat__container 不存在！容器是 list__item 的父元素
//   - .agent-chat__list__item 每个代表一轮（用户 OR AI），不是一轮里包含两者
//   - 用户消息: --human 修饰符 + data-conv-speaker="human"
//   - AI 消息: --ai 修饰符 + data-conv-speaker="ai"
//   - 用户消息文本: .hyc-content-text（纯文本）
//   - AI 消息文本: .hyc-content-md（markdown 渲染后的内容，可能有多段）
//   - 气泡内容容器: .agent-chat__bubble__content

console.log('[AI对话目录] ===== aic-yuanbao.js 开始执行 =====');

class AIC_YuanbaoAdapter extends AIC_BaseAdapter {
  constructor() {
    super();
    this.platform = 'yuanbao';
    this.name = '腾讯元宝';
    this.themeColor = '#6C5CE7';

    this.selectors = {
      // 消息列表项（每条用户或AI消息各一个）
      messageItem: '.agent-chat__list__item',
      // 用户消息标识
      humanModifier: 'agent-chat__list__item--human',
      // AI 消息标识
      aiModifier: 'agent-chat__list__item--ai',
      // 用户消息文本（纯文本，仅在 --human 元素内）
      userContent: '.hyc-content-text',
      // AI 消息文本（markdown 渲染后，仅在 --ai 元素内）
      aiContent: '.hyc-content-md',
      // 气泡内容容器（包含实际文本，排除 checkbox 等工具栏元素）
      bubbleContent: '.agent-chat__bubble__content',
      // 输入框
      inputArea: '.agent-chat__input-box',
    };
  }

  matches() {
    return window.location.hostname.includes('yuanbao.tencent.com');
  }

  getMessageList() {
    const messages = [];
    const listItems = document.querySelectorAll(this.selectors.messageItem);

    if (listItems.length === 0) {
      console.log('[AI对话目录] 元宝: 未找到 .agent-chat__list__item');
      return messages;
    }

    listItems.forEach((el, idx) => {
      // 通过 BEM 修饰符判断消息类型
      const isHuman = el.classList.contains(this.selectors.humanModifier);
      const isAI = el.classList.contains(this.selectors.aiModifier);

      // 跳过既不是 human 也不是 ai 的元素（可能是工具栏、分隔线等）
      if (!isHuman && !isAI) return;

      const type = isHuman ? 'user' : 'ai';

      // 使用 data-conv-id 作为稳定 ID
      const id = el.getAttribute('data-conv-id') ||
                 `yuanbao_${type}_${idx}`;

      // 提取内容
      const content = isHuman ? this._extractUserContent(el) : this._extractAIContent(el);
      const hasImage = !!(el.querySelector('.agent-chat__bubble__content img'));

      messages.push({
        id,
        type,
        content,
        timestamp: null,
        element: el,
        hasImage,
      });
    });

    console.log(`[AI对话目录] 元宝: 找到 ${messages.length} 条消息 (用户: ${messages.filter(m => m.type === 'user').length}, AI: ${messages.filter(m => m.type === 'ai').length})`);
    return messages;
  }

  getConversationId() {
    // 从任意 list__item 的 data-conv-id 中提取对话 ID
    const firstItem = document.querySelector(this.selectors.messageItem);
    if (firstItem) {
      const convId = firstItem.getAttribute('data-conv-id');
      if (convId) {
        // 格式: "uuid_1", "uuid_2" — 取 uuid 部分
        const baseId = convId.replace(/_\d+$/, '');
        return `yuanbao_${baseId}`;
      }
    }

    // 备选：从 URL 提取
    const match = window.location.pathname.match(/\/chat\/(\w+)/);
    return match ? `yuanbao_${match[1]}` : null;
  }

  getConversationTitle() {
    const t = document.title;
    if (t && t !== '元宝' && t !== '腾讯元宝') {
      return t.replace(/ - 元宝$/, '').replace(/ - 腾讯元宝$/, '').trim();
    }
    return '腾讯元宝 对话';
  }

  getConversationUrl() {
    return window.location.href;
  }

  getMessageContainer() {
    // .agent-chat__container 不存在（已确认）
    // 使用 list__item 的父元素作为容器
    const firstItem = document.querySelector(this.selectors.messageItem);
    if (firstItem) {
      return firstItem.parentElement;
    }

    // 兜底：使用 data-conv-speaker 的父元素
    const firstMsg = document.querySelector('[data-conv-speaker]');
    if (firstMsg) {
      return firstMsg.parentElement;
    }

    return null;
  }

  getInputArea() {
    return this.querySelector(this.selectors.inputArea) ||
           this.querySelector('textarea') ||
           this.querySelector('[contenteditable="true"]');
  }

  isLazyLoading() {
    // 元宝使用虚拟滚动，DOM 中只有可见消息
    const listItems = document.querySelectorAll(this.selectors.messageItem);
    const humanCount = document.querySelectorAll('[data-conv-speaker="human"]').length;
    if (humanCount > 0 && humanCount <= 4) {
      const container = this.getMessageContainer();
      if (container) {
        return container.scrollHeight > container.clientHeight;
      }
    }
    return false;
  }

  getModel() {
    const modelEl = document.querySelector(
      '[class*="model-name"], [class*="ModelName"], [class*="model-selector"]'
    );
    if (modelEl) {
      const text = modelEl.textContent.trim();
      if (text && text.length < 50) return text;
    }
    return '腾讯元宝';
  }

  // ========== 私有方法 ==========

  /**
   * 提取用户消息内容
   * 用户消息结构: list__item--human > list__item__content > bubble--human > bubble__content > hyc-content-text
   */
  _extractUserContent(el) {
    // 精确提取：从 bubble__content 内的 hyc-content-text 获取
    const contentEl = el.querySelector(this.selectors.userContent);
    if (contentEl) {
      const text = AIC_Utils.safeText(contentEl).trim();
      if (text) return text;
    }

    // 备选：从 bubble__content 获取（排除工具栏）
    const bubbleEl = el.querySelector(this.selectors.bubbleContent);
    if (bubbleEl) {
      const text = AIC_Utils.safeText(bubbleEl).trim();
      if (text) return text;
    }

    return '';
  }

  /**
   * 提取 AI 消息内容
   * AI 消息结构: list__item--ai > list__item__content > bubble > bubble__content > hyc-content-md (可能多段)
   */
  _extractAIContent(el) {
    // AI 回复可能有多段 markdown（思考链、搜索结果、正文等）
    const mdElements = el.querySelectorAll(this.selectors.aiContent);
    if (mdElements.length > 0) {
      const texts = [];
      mdElements.forEach(md => {
        const text = AIC_Utils.safeText(md).trim();
        if (text) texts.push(text);
      });
      return texts.join('\n');
    }

    // 备选
    const bubbleEl = el.querySelector(this.selectors.bubbleContent);
    if (bubbleEl) {
      return AIC_Utils.safeText(bubbleEl).trim();
    }

    return '';
  }
}

// 注册到全局
window.__AICatalog_Adapters = window.__AICatalog_Adapters || {};
window.__AICatalog_Adapters.AIC_YuanbaoAdapter = AIC_YuanbaoAdapter;
