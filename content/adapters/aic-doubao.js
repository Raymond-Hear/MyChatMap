// AI对话目录插件 - 豆包适配器
// 适配 www.doubao.com/chat/ 页面的DOM结构

console.log('[AI对话目录] ===== aic-doubao.js 开始执行 =====');

class AIC_DoubaoAdapter extends AIC_BaseAdapter {
  constructor() {
    super();
    this.platform = 'doubao';
    this.name = '豆包';
    this.themeColor = '#4e83fd';

    // 选择器配置
    // 注意：豆包使用 Tailwind CSS，hash类名会随版本变化，优先使用 data-* 属性
    // 2026-03 确认的最新选择器（参考 ChatOutline 项目）
    this.selectors = {
      // 消息元素 - send_message=用户消息, receive_message=AI消息
      messageItem: "[data-testid='send_message'], [data-testid='receive_message']",
      // 消息文本内容
      messageContent: "[data-testid='message_text_content']",
      // 对话标题区域
      conversationTitle: '[data-testid="chat-title"]',
      // 输入框
      inputArea: '[data-testid="chat-input"]',
      // 消息滚动容器
      messageContainer: '[data-testid="chat-messages-container"]',
    };
  }

  /**
   * 检查当前页面是否匹配豆包
   */
  matches() {
    return window.location.hostname.includes('doubao.com') &&
           window.location.pathname.includes('/chat');
  }

  /**
   * 获取页面中所有消息
   * 返回: [{ id, type: 'user'|'ai', content, timestamp, element }]
   */
  getMessageList() {
    const messages = [];
    const messageElements = this.querySelectorAll(this.selectors.messageItem);

    messageElements.forEach((el, idx) => {
      // 新版豆包用 data-testid 区分角色：send_message=用户, receive_message=AI
      const testId = el.getAttribute('data-testid') || '';
      const isUser = testId === 'send_message';

      // 生成稳定的消息ID：优先取 data-message-id，否则用 testId+索引
      const id = el.getAttribute('data-message-id') || `${testId}_${idx}`;

      // 提取消息文本内容
      const content = this._extractContent(el);

      messages.push({
        id,
        type: isUser ? 'user' : 'ai',
        content,
        timestamp: null, // 豆包页面不直接暴露时间戳
        element: el,
      });
    });

    return messages;
  }

  /**
   * 获取当前对话ID
   * 从URL中提取，格式如 /chat/xxxxx
   */
  getConversationId() {
    const match = window.location.pathname.match(/\/chat\/(\w+)/);
    return match ? `doubao_${match[1]}` : null;
  }

  /**
   * 获取对话标题
   */
  getConversationTitle() {
    // 优先从 data-testid="chat-title" 获取
    const titleEl = this.querySelector(this.selectors.conversationTitle);
    if (titleEl) return AIC_Utils.safeText(titleEl).trim();

    // 备选：从页面 title 提取
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== '豆包') {
      return pageTitle.replace(/ - 豆包$/, '').trim();
    }

    return '豆包对话';
  }

  /**
   * 获取对话URL
   */
  getConversationUrl() {
    return window.location.href;
  }

  /**
   * 检测页面是否使用懒加载（历史消息懒加载）
   */
  isLazyLoading() {
    // 豆包的历史消息需要向上滚动加载
    // 如果消息容器存在且第一条消息上方还有加载指示器，说明可能未完全加载
    const container = this.querySelector(this.selectors.messageContainer);
    if (!container) return false;

    // 检查是否有"加载更多"或加载指示器
    const loadingIndicators = container.querySelectorAll(
      '[class*="loading"], [class*="spinner"], [class*="skeleton"]'
    );
    return loadingIndicators.length > 0;
  }

  /**
   * 获取输入框元素（用于监听用户发送新消息）
   */
  getInputArea() {
    return this.querySelector(this.selectors.inputArea);
  }

  // ========== 私有方法 ==========

  /**
   * 判断消息是否为用户发送
   */
  _isUserMessage(messageEl) {
    // 方法1（新版）：通过 data-testid 直接判断
    const testId = (messageEl.getAttribute('data-testid') || '').toString();
    if (testId === 'send_message') return true;
    if (testId === 'receive_message') return false;

    // 方法2（旧版兜底）：检查消息元素自身是否在 justify-end 容器中
    if (messageEl.classList.contains('justify-end')) return true;

    // 方法3（旧版兜底）：检查最近的 flex 容器父级
    const parent = messageEl.closest('[class*="justify-end"]');
    if (parent) return true;

    // 方法4（旧版兜底）：向上查找包含 justify 相关类的祖先
    let current = messageEl.parentElement;
    while (current && current !== document.body) {
      if (current.classList) {
        for (const cls of current.classList) {
          if (cls.includes('justify-end') || cls.includes('items-end')) {
            return true;
          }
        }
      }
      current = current.parentElement;
    }

    return false;
  }

  /**
   * 提取消息的纯文本内容
   */
  _extractContent(messageEl) {
    // 优先从 .flow-markdown-body 获取格式化后的文本
    const contentEl = messageEl.querySelector(this.selectors.messageContent);
    if (contentEl) {
      return AIC_Utils.safeText(contentEl).trim();
    }

    // 备选：直接取消息元素的文本
    return AIC_Utils.safeText(messageEl).trim();
  }
}

// 注册到全局
window.__AICatalog_Adapters = window.__AICatalog_Adapters || {};
window.__AICatalog_Adapters.AIC_DoubaoAdapter = AIC_DoubaoAdapter;
