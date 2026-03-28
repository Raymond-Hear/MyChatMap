// AI对话目录插件 - 主入口（多平台适配器模式）
// 负责：选择适配器、委托 UI 组件、监听DOM变化、数据持久化

// ===== 全局日志捕获（在所有脚本之前执行） =====
window.__CONSOLE_CAPTURE_LOGS = window.__CONSOLE_CAPTURE_LOGS || [];
window.__AIC_DIAG_LOGS = window.__AIC_DIAG_LOGS || [];

(function() {
  // 保存原始方法
  const _orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    clear: console.clear ? console.clear.bind(console) : null,
  };

  // 序列化参数
  function _ser(args) {
    return Array.from(args).map(a => {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (typeof a === 'string') return a;
      if (typeof a === 'number' || typeof a === 'boolean') return String(a);
      if (a instanceof Error) return `${a.name || 'Error'}: ${a.message}\n${a.stack || ''}`;
      try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); }
    }).join(' ');
  }

  function _capture(type, args) {
    const text = _ser(args);
    // 记录所有 AI对话目录 相关的日志
    if (text.includes('[AI对话目录]')) {
      const entry = {
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
        type: type,
        text: text,
      };
      window.__CONSOLE_CAPTURE_LOGS.push(entry);
      // 限制 10000 条
      if (window.__CONSOLE_CAPTURE_LOGS.length > 10000) {
        window.__CONSOLE_CAPTURE_LOGS.splice(0, 5000);
      }
      // 同时写入诊断日志数组
      const diagEntry = `[${entry.time}] ${text.replace('[AI对话目录] ', '')}`;
      window.__AIC_DIAG_LOGS.push(diagEntry);
    }
  }

  // 拦截 console 方法
  console.log = function() { _capture('log', arguments); _orig.log.apply(console, arguments); };
  console.warn = function() { _capture('warn', arguments); _orig.warn.apply(console, arguments); };
  console.error = function() { _capture('error', arguments); _orig.error.apply(console, arguments); };
  console.info = function() { _capture('info', arguments); _orig.info.apply(console, arguments); };

  // 拦截 clear —— 不执行清空
  if (_orig.clear) {
    console.clear = function() {
      _orig.log('[AI对话目录] console.clear 被拦截（日志已保留）');
    };
    if (console.constructor && console.constructor.prototype) {
      console.constructor.prototype.clear = function() {
        _orig.log('[AI对话目录] console.clear 被拦截');
      };
    }
  }
})();

// 便捷命令：控制台输入 __aicLog() 查看/复制日志
window.__aicLog = function() {
  const logs = window.__AIC_DIAG_LOGS;
  if (logs.length === 0) {
    console.log('[AI对话目录] 暂无诊断日志');
    return;
  }
  const text = logs.join('\n');
  console.log('========== AI对话目录 诊断日志 (' + logs.length + '条) ==========');
  console.log(text);
  console.log('========================================');
  navigator.clipboard?.writeText(text).then(() => {
    console.log('[AI对话目录] 日志已复制到剪贴板');
  }).catch(() => {});
};

console.log('[AI对话目录] ===== aic-main.js 开始加载 =====');

(function () {
  'use strict';

  console.log('[AI对话目录] IIFE 开始执行');

  // ========== 配置常量 ==========
  const AIC_CONFIG = {
    HIGHLIGHT_FLASH_COUNT: 3,
    HIGHLIGHT_FLASH_INTERVAL: 300,
    MUTATION_DEBOUNCE: 300,
    MSG_SAVE_CONVERSATION: 'SAVE_CONVERSATION',
    MSG_GET_CONVERSATION: 'GET_CONVERSATION',
    MSG_GET_ALL_CONVERSATIONS: 'GET_ALL_CONVERSATIONS',
    MSG_UPDATE_MESSAGE_TITLE: 'UPDATE_MESSAGE_TITLE',
    MSG_DELETE_CONVERSATION: 'DELETE_CONVERSATION',
    MSG_DELETE_ALL_DATA: 'DELETE_ALL_DATA',
    MSG_GET_SETTINGS: 'GET_SETTINGS',
    MSG_SAVE_SETTINGS: 'SAVE_SETTINGS',
    SETTING_PROCESS_HISTORY: 'processHistory',
  };

  // ========== 适配器选择 ==========
  // 通过 manifest 的 content_scripts 按顺序加载，
  // 各适配器类已挂载到 window.__AICatalog_Adapters

  function selectAdapter() {
    const adapters = window.__AICatalog_Adapters;
    if (!adapters) {
      console.error('[AI对话目录] 未找到适配器注册表');
      return null;
    }

    // 按优先级尝试各适配器
    const adapterClasses = [
      'AIC_DoubaoAdapter',
      'AIC_YuanbaoAdapter',
    ];

    console.log('[AI对话目录] 开始检测适配器...');

    for (const clsName of adapterClasses) {
      const AdapterClass = adapters[clsName];
      if (!AdapterClass) {
        console.log(`[AI对话目录] 适配器 ${clsName} 未注册`);
        continue;
      }

      try {
        const instance = new AdapterClass();
        const matches = instance.matches();
        console.log(`[AI对话目录] 适配器 ${clsName} (${instance.name}): ${matches ? '匹配' : '不匹配'}`);
        if (matches) {
          console.log(`[AI对话目录] 选择适配器: ${instance.name} (${clsName})`);
          return instance;
        }
      } catch (e) {
        console.warn(`[AI对话目录] 适配器 ${clsName} 初始化失败:`, e.message);
      }
    }

    console.log('[AI对话目录] 没有适配器匹配当前页面');
    return null;
  }

  // ========== 状态 ==========
  let adapter = null;
  let lastMessageCount = 0;
  let initialized = false;
  let mutationObserver = null;

  // ========== 提示 UI ==========

  function showToast(text) {
    document.querySelectorAll('.aic-toast').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = 'aic-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 2600);
  }

  // ========== 通过适配器代理的函数 ==========

  function isChatPage() {
    return adapter !== null;
  }

  function getMessageList() {
    if (!adapter) return [];
    return adapter.getMessageList();
  }

  function getConversationId() {
    if (!adapter) return null;
    return adapter.getConversationId();
  }

  function getConversationTitle() {
    if (!adapter) return '';
    return adapter.getConversationTitle();
  }

  function getConversationUrl() {
    if (!adapter) return '';
    return adapter.getConversationUrl();
  }

  function getModel() {
    if (!adapter) return '';
    return adapter.getModel ? adapter.getModel() : adapter.name;
  }

  function getPlatform() {
    if (!adapter) return '';
    return adapter.platform;
  }

  // ========== 数据持久化 ==========

  let cachedMessages = [];

  async function saveConversationToDB(messages) {
    const conversationId = getConversationId();
    if (!conversationId) {
      console.warn('[AI对话目录] 无法保存：对话ID为空');
      return;
    }

    console.log(`[AI对话目录] 准备保存对话: ${conversationId}, ${messages.length} 条消息`);

    cachedMessages = messages.map(m => ({
      id: m.id, type: m.type, content: m.content, customTitle: m.customTitle,
    }));

    const data = {
      id: conversationId,
      title: getConversationTitle(),
      platform: getPlatform(),
      url: getConversationUrl(),
      messages: messages.map(m => ({
        id: m.id, type: m.type, content: m.content,
        timestamp: new Date().toISOString(), customTitle: m.customTitle,
      })),
      metadata: { model: getModel() },
    };

    console.log('[AI对话目录] 保存数据:', { id: data.id, title: data.title, platform: data.platform, msgCount: data.messages.length });

    try {
      const result = await chrome.runtime.sendMessage({
        type: AIC_CONFIG.MSG_SAVE_CONVERSATION, data,
      });
      console.log('[AI对话目录] 保存结果:', result);

      if (result && result.success) {
        console.log('[AI对话目录] 数据保存成功');
      } else {
        console.warn('[AI对话目录] 数据保存失败:', result?.error);
      }
    } catch (e) {
      console.error('[AI对话目录] 数据保存异常:', e.message);
    }
  }

  async function loadConversationFromDB() {
    const conversationId = getConversationId();
    if (!conversationId) return null;
    try {
      const response = await chrome.runtime.sendMessage({
        type: AIC_CONFIG.MSG_GET_CONVERSATION, data: { id: conversationId },
      });
      if (response && response.success && response.data && response.data.messages) {
        return response.data.messages;
      }
    } catch (e) {
      console.warn('[AI对话目录] 从DB加载对话失败:', e.message);
    }
    return null;
  }

  async function saveMessageTitle(messageId, customTitle) {
    const conversationId = getConversationId();
    if (!conversationId) return;
    try {
      await chrome.runtime.sendMessage({
        type: AIC_CONFIG.MSG_UPDATE_MESSAGE_TITLE,
        data: { conversationId, messageId, customTitle },
      });
    } catch (e) {
      console.warn('[AI对话目录] 标题保存失败:', e.message);
    }
  }

  // ========== 暴露给 UI 组件的接口 ==========

  // 重命名回调桥接
  window.__AICatalog = window.__AICatalog || {};
  window.__AICatalog.onRenameMessage = function(messageId, customTitle) {
    saveMessageTitle(messageId, customTitle);
  };

  // 消息元素查找桥接
  window.__AICatalog.findMessageElementByIndex = function(userIndex) {
    return findMessageElementByIndex(userIndex);
  };

  // ========== Popup 消息处理 ==========

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;
    if (!message.type.startsWith('AIC_')) return;

    handleMessage(message).then(sendResponse).catch(err => {
      console.error('[AI对话目录] 消息处理失败:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true;
  });

  async function handleMessage(message) {
    if (!isChatPage()) return { success: false, error: '非聊天页面' };

    switch (message.type) {
      case 'AIC_GET_CURRENT_CONVERSATION_ID':
        return { success: true, data: getConversationId() };
      case 'AIC_GET_CURRENT_CATALOG': {
        const messages = getMessageList();
        return {
          success: true,
          data: {
            id: getConversationId(),
            title: getConversationTitle(),
            platform: getPlatform(),
            messages: messages.map(m => ({ id: m.id, type: m.type, content: m.content, customTitle: m.customTitle })),
          },
        };
      }
      case 'AIC_GET_CONVERSATION_DATA': {
        const messages = getMessageList();
        return {
          success: true,
          data: {
            id: getConversationId(), title: getConversationTitle(), platform: getPlatform(),
            url: getConversationUrl(),
            messages: messages.map(m => ({
              id: m.id, type: m.type, content: m.content,
              timestamp: m.timestamp || new Date().toISOString(), customTitle: m.customTitle,
            })),
            metadata: { model: getModel() },
          },
        };
      }
      default:
        return { success: false, error: `未知消息类型: ${message.type}` };
    }
  }

  // ========== 核心刷新 ==========

  let refreshTimer = null;
  let _isStreaming = false;      // AI 是否正在流式输出
  let _streamEndTimer = null;    // 流式输出结束检测定时器
  let _lastMutationTime = 0;     // 最后一次 DOM 变化的时间

  function debouncedRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshCatalog, AIC_CONFIG.MUTATION_DEBOUNCE);
  }

  /**
   * 延迟刷新（流式输出期间使用）
   * AI 流式输出时，DOM 变化非常频繁，使用更长的防抖时间
   */
  function debouncedRefreshStreaming() {
    _isStreaming = true;
    _lastMutationTime = Date.now();
    clearTimeout(_streamEndTimer);

    // 流式输出期间用 2 秒防抖，等输出稳定后再更新
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshCatalog();
    }, 2000);

    // 流式结束检测：如果 3 秒内没有新的 DOM 变化，认为流式输出结束
    _streamEndTimer = setTimeout(() => {
      if (Date.now() - _lastMutationTime > 2500) {
        _isStreaming = false;
        console.log('[AI对话目录] 检测到流式输出结束');
      }
    }, 3000);
  }

  // 用于跟踪当前对话ID，检测对话切换
  let currentConversationId = null;

  function refreshCatalog() {
    try {
      const messages = getMessageList();
      const conversationId = getConversationId();
      console.log(`[AI对话目录] refreshCatalog: 找到 ${messages.length} 条消息, 对话ID: ${conversationId}`);

      // 检测是否切换了对对话
      const isConversationChanged = conversationId !== currentConversationId;
      if (isConversationChanged) {
        console.log(`[AI对话目录] 检测到对话切换: ${currentConversationId} -> ${conversationId}`);
        currentConversationId = conversationId;
        lastMessageCount = 0; // 重置计数，确保新对话能保存
      }

      // 记录消息数量变化
      const hasNewMessages = messages.length > 0;
      const hasCountChanged = messages.length !== lastMessageCount;

      if (messages.length === 0 && lastMessageCount > 0) {
        console.log('[AI对话目录] refreshCatalog: 暂时扫描到 0 条，保留已有目录');
        return;
      }

      // 只要有消息就保存（包括首次加载、消息数量变化、对话切换）
      if (hasNewMessages && (hasCountChanged || lastMessageCount === 0 || isConversationChanged)) {
        lastMessageCount = messages.length;
        console.log('[AI对话目录] 检测到新消息，保存到数据库');
        saveConversationToDB(messages);
      }

      updateCatalog(messages);

      const userMessages = messages.filter(m => m.type === 'user');
      if (window.__AICatalog_ScrollTracker) {
        window.__AICatalog_ScrollTracker.update(userMessages, (index) => {
          setActiveIndex(index);
        });
      }
    } catch (err) {
      console.error('[AI对话目录] refreshCatalog 失败:', err);
    }
  }

  function updateCatalog(messages) {
    // 过滤出用户消息用于目录显示
    const userMessages = messages.filter(m => m.type === 'user');
    console.log(`[AI对话目录] updateCatalog: ${messages.length} 条总消息, ${userMessages.length} 条用户消息`);

    // 检测有多少条消息内容为空（可能是懒加载未完成）
    const emptyCount = userMessages.filter(m => !m.content || !m.content.trim()).length;

    // 委托给 AIC_CatalogUI 组件 - 传入所有消息，让 UI 自己过滤
    const ui2 = window.__AICatalog && window.__AICatalog.AIC_CatalogUI;
    if (ui2) {
      ui2.update(messages, adapter ? adapter.themeColor : null);
      console.log('[AI对话目录] UI 已更新');
    } else {
      console.warn('[AI对话目录] AIC_CatalogUI 未找到');
    }

    // 如果有大量空内容消息，提示用户可能存在懒加载
    if (emptyCount > 0 && emptyCount >= userMessages.length * 0.3) {
      showToast('滚动页面加载更多历史消息，以生成完整目录');
    }
  }

  function findMessageElementByIndex(userIndex) {
    if (!adapter) return null;
    const allMessages = adapter.getMessageList();
    const allUserMessages = allMessages.filter(m => m.type === 'user');
    if (allUserMessages.length > userIndex) {
      return allUserMessages[userIndex].element;
    }
    return null;
  }

  function setActiveIndex(index) {
    const ui3 = window.__AICatalog && window.__AICatalog.AIC_CatalogUI;
    if (ui3) {
      ui3.setActiveIndex(index);
    }
  }

  // ========== MutationObserver ==========

  function startMutationObserver() {
    if (mutationObserver) return;

    let target = document.body;
    if (adapter && adapter.getMessageContainer) {
      const container = adapter.getMessageContainer();
      if (container) target = container;
    }

    let _rapidMutationCount = 0;   // 快速连续变化计数
    let _rapidMutationWindow = 0;  // 上次重置计数的时间

    mutationObserver = new MutationObserver((mutations) => {
      // 过滤掉自身 UI 的变化
      const hasChange = mutations.some(mutation => {
        if (mutation.target && mutation.target.closest && mutation.target.closest('#aic-catalog-container')) return false;
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            // 排除自身 UI 元素
            if (node.id === 'aic-catalog-container' || node.closest?.('#aic-catalog-container')) continue;
            if (node.querySelector && (node.querySelector('img') || node.querySelector('.ds-markdown') || node.querySelector('[data-testid]'))) return true;
            if (node.textContent && node.textContent.length > 5) return true;
          }
        }
        if (mutation.type === 'characterData') return true;
        return false;
      });

      if (!hasChange) return;

      // 检测流式输出：如果短时间内频繁变化，说明 AI 正在生成内容
      const now = Date.now();
      if (now - _rapidMutationWindow > 1000) {
        _rapidMutationCount = 0;
        _rapidMutationWindow = now;
      }
      _rapidMutationCount++;

      // 1 秒内超过 5 次变化 = 流式输出中
      if (_rapidMutationCount > 5) {
        debouncedRefreshStreaming();
      } else {
        debouncedRefresh();
      }
    });
    mutationObserver.observe(target, { childList: true, subtree: true, characterData: true });
    console.log('[AI对话目录] MutationObserver 已启动（含流式输出检测）');
  }

  // ========== SPA 路由变化检测 ==========

  let lastUrl = window.location.href;
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[AI对话目录] URL 变化:', currentUrl);

      const newAdapter = selectAdapter();

      if (!newAdapter) {
        // 不在任何支持的聊天页面，清理
        if (initialized) {
          console.log('[AI对话目录] 离开支持的聊天页面，销毁导航条');
          if (window.__AICatalog && window.__AICatalog.AIC_CatalogUI) {
            window.__AICatalog.AICatalogUI.destroy();
          }
          if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
          initialized = false;
          lastMessageCount = 0;
          adapter = null;
        }
        return;
      }

      const platformChanged = !adapter || newAdapter.platform !== adapter.platform;

      if (currentUrl.includes('/chat')) {
        console.log('[AI对话目录] 对话切换/平台切换，重置状态并重新初始化');
        if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
        initialized = false;
        lastMessageCount = 0;
        if (platformChanged) {
          if (window.__AICatalog && window.__AICatalog.AIC_CatalogUI) {
            window.__AICatalog.AIC_CatalogUI.destroy();
          }
        }
        adapter = newAdapter;
        start();
      }
    }
  }, 1000);

  // ========== 初始化 ==========

  function start() {
    if (initialized) return;
    initialized = true;

    console.log('[AI对话目录] start() 开始执行');
    console.log('[AI对话目录] 当前适配器:', adapter ? adapter.name : '无');

    // 委托给 AIC_CatalogUI 组件创建 minimap 导航条
    if (!window.__AICatalog) window.__AICatalog = {};
    const UI = window.__AICatalog.AIC_CatalogUI;
    if (UI) {
      UI.init(adapter.themeColor);
      console.log('[AI对话目录] Minimap 导航条已创建');
    } else {
      console.error('[AI对话目录] AIC_CatalogUI 组件未加载');
    }

    setTimeout(async () => {
      try {
        const messages = getMessageList();
        console.log(`[AI对话目录] 延迟扫描: 找到 ${messages.length} 条消息`);

        if (messages.length > 0) {
          updateCatalog(messages);
          saveConversationToDB(messages);
          startMutationObserver();
          console.log('[AI对话目录] 插件初始化完成');
        } else {
          setTimeout(async () => {
            const msgs = getMessageList();
            console.log(`[AI对话目录] 重试扫描: 找到 ${msgs.length} 条消息`);
            if (msgs.length > 0) {
              updateCatalog(msgs);
              saveConversationToDB(msgs);
              startMutationObserver();
              console.log('[AI对话目录] 插件初始化完成（重试成功）');
            } else {
              setTimeout(async () => {
                const msgs2 = getMessageList();
                console.log(`[AI对话目录] 第三次扫描: 找到 ${msgs2.length} 条消息`);
                if (msgs2.length > 0) {
                  updateCatalog(msgs2);
                  saveConversationToDB(msgs2);
                  startMutationObserver();
                  console.log('[AI对话目录] 插件初始化完成（第三次扫描成功）');
                } else {
                  console.log('[AI对话目录] DOM 扫描全部失败，尝试从 IndexedDB 兜底加载...');
                  const savedMessages = await loadConversationFromDB();
                  if (savedMessages && savedMessages.length > 0) {
                    updateCatalog(savedMessages);
                    lastMessageCount = savedMessages.filter(m => m.type === 'user').length;
                    console.log(`[AI对话目录] 从 DB 兜底加载成功，显示 ${savedMessages.length} 条消息`);
                  } else {
                    console.warn('[AI对话目录] 多次尝试后仍无消息，导航条已创建但等待中...');
                  }
                  startMutationObserver();
                }
              }, 3000);
            }
          }, 1000);
        }
      } catch (err) {
        console.error('[AI对话目录] start() 失败:', err);
      }
    }, 500);
  }

  // ========== 启动 ==========

  console.log('[AI对话目录] 准备启动，当前URL:', window.location.href);
  console.log('[AI对话目录] 当前hostname:', window.location.hostname);
  console.log('[AI对话目录] 当前pathname:', window.location.pathname);

  // 检查适配器注册表
  const adapters = window.__AICatalog_Adapters;
  console.log('[AI对话目录] 适配器注册表:', adapters ? Object.keys(adapters) : '未找到');

  adapter = selectAdapter();

  if (adapter) {
    console.log(`[AI对话目录] 当前在 ${adapter.name} 聊天页面，直接启动`);
    start();
  } else {
    console.log('[AI对话目录] 当前不在支持的聊天页面，等待URL变化...');
    console.log('[AI对话目录] 支持的页面: 豆包(doubao.com), 腾讯元宝(yuanbao.tencent.com)');
  }

})();
