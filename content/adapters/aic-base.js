// AI对话目录插件 - 适配器基类
// 所有平台适配器的公共接口和基础逻辑

console.log('[AI对话目录] ===== aic-base.js 开始执行 =====');

class AIC_BaseAdapter {
  constructor() {
    this.platform = 'unknown';
    this.name = 'Unknown';
    this.themeColor = '#4285f4'; // 默认主题色，子类覆盖
    // 选择器配置 - 子类必须覆盖
    this.selectors = {
      messageContainer: '',     // 消息容器
      userMessage: '',          // 用户消息
      aiMessage: '',            // AI消息
      messageContent: '',       // 消息内容
      messageTimestamp: '',     // 消息时间戳
      conversationTitle: '',    // 对话标题
      modelInfo: '',            // 模型信息
      inputArea: '',            // 输入框（用于检测新消息）
    };
  }

  /**
   * 检查当前页面是否匹配此适配器
   */
  matches() {
    return false;
  }

  /**
   * 获取页面中所有消息
   * 返回: [{ id, type: 'user'|'ai', content, timestamp, element }]
   */
  getMessageList() {
    console.warn('[AI对话目录] getMessageList 未实现');
    return [];
  }

  /**
   * 获取当前对话ID
   */
  getConversationId() {
    return null;
  }

  /**
   * 获取对话标题
   */
  getConversationTitle() {
    return '';
  }

  /**
   * 获取使用的模型
   */
  getModel() {
    return '';
  }

  /**
   * 获取对话URL
   */
  getConversationUrl() {
    return window.location.href;
  }

  /**
   * 滚动到指定消息
   */
  scrollToMessage(element) {
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * 高亮闪烁指定消息
   */
  highlightMessage(element) {
    AIC_Utils.flashHighlight(element, AIC_CONSTANTS.HIGHLIGHT_FLASH_COUNT, AIC_CONSTANTS.HIGHLIGHT_FLASH_INTERVAL);
  }

  /**
   * 检测页面是否使用懒加载
   */
  isLazyLoading() {
    return false;
  }

  /**
   * 安全查询DOM
   */
  querySelector(selector) {
    return document.querySelector(selector);
  }

  querySelectorAll(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * 尝试多个选择器，返回第一个匹配的元素
   */
  queryFirst(selectors) {
    if (typeof selectors === 'string') {
      return this.querySelector(selectors);
    }
    for (const sel of selectors) {
      const el = this.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
}

// 挂载到全局
window.__AICatalog_Adapters = window.__AICatalog_Adapters || {};
window.__AICatalog_Adapters.AIC_BaseAdapter = AIC_BaseAdapter;
