// AI对话目录插件 - Minimap 导航条组件
// 设计：右侧细条显示横线，悬停展开目录面板

console.log('[AI对话目录] ===== aic-catalog-ui.js 开始执行 =====');

const AIC_CatalogUI = {
  container: null,      // 外层容器（包含minimap + 面板）
  minimap: null,        // 右侧细条
  panel: null,          // 悬停显示的面板
  themeColor: '#4285f4',
  messageElements: [],  // [{ id, element, userIndex }]
  activeIndex: -1,
  userMessages: [],     // 缓存用户消息数据
  _lastRenderKey: '',   // 上次渲染的数据指纹，用于跳过无变化更新

  // ========== 初始化 ==========

  init(themeColor) {
    if (this.container) return;
    this.themeColor = themeColor || '#4285f4';
    this._injectStyles();
    this._createElements();
    document.body.appendChild(this.container);
    console.log('[AI对话目录] Minimap 导航条已创建, 主题色:', this.themeColor);
  },

  // ========== 更新目录 ==========

  /**
   * 生成数据指纹，用于快速判断数据是否有变化
   */
  _computeRenderKey(messages) {
    const userMsgs = messages.filter(m => {
      if (!m || m.type !== 'user') return false;
      return !!(m.content?.trim() || m.hasImage || m.hasFile);
    });
    // 用消息数量 + 每条消息ID/标题前20字符拼接做指纹
    return userMsgs.length + ':' + userMsgs.map(m =>
      (m.id || '') + '|' + (m.customTitle || m.content || '').substring(0, 20)
    ).join(',');
  },

  update(messages, themeColor, silent) {
    if (themeColor) {
      this.themeColor = themeColor;
      this.setThemeColor(themeColor);
    }

    if (!Array.isArray(messages)) {
      this.userMessages = [];
      this.messageElements = [];
      this._lastRenderKey = '';
      this._renderMinimap();
      this._renderPanel();
      return;
    }

    const newUserMessages = messages.filter(m => {
      if (!m || m.type !== 'user') return false;
      return !!(m.content?.trim() || m.hasImage || m.hasFile);
    });

    // 计算数据指纹，如果没变化就跳过渲染
    const newKey = this._computeRenderKey(messages);
    if (newKey === this._lastRenderKey && !silent) {
      return; // 数据完全没变，跳过渲染
    }
    this._lastRenderKey = newKey;

    this.userMessages = newUserMessages;
    this.messageElements = newUserMessages.map((msg, idx) => ({
      id: msg.id,
      element: msg.element,
      userIndex: idx,
    }));

    this._renderMinimap();
    this._renderPanel();
  },

  setActiveIndex(index) {
    if (this.activeIndex === index) return;
    this.activeIndex = index;

    // 更新 minimap 高亮
    const lines = this.minimap ? this.minimap.querySelectorAll('.aic-minimap-line') : [];
    lines.forEach((el, i) => el.classList.toggle('aic-active', i === index));

    // 更新面板高亮
    const items = this.panel ? this.panel.querySelectorAll('.aic-panel-item') : [];
    items.forEach((el, i) => {
      el.classList.toggle('aic-active', i === index);
      if (i === index) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  },

  setThemeColor(color) {
    this.themeColor = color;
    if (this.container) {
      this.container.style.setProperty('--aic-theme-color', color);
    }
  },

  destroy() {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.minimap = null;
      this.panel = null;
    }
    this.messageElements = [];
    this.userMessages = [];
    this.activeIndex = -1;
    const styleEl = document.getElementById('aic-minimap-styles');
    if (styleEl) styleEl.remove();
  },

  // ========== 私有方法 ==========

  _injectStyles() {
    const style = document.createElement('style');
    style.id = 'aic-minimap-styles';
    style.textContent = `
      /* ===== 外层容器 ===== */
      #aic-catalog-container {
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --aic-theme-color: ${this.themeColor};
      }

      /* ===== Minimap 导航条 ===== */
      #aic-minimap {
        width: 16px;
        min-height: 40px;
        max-height: 50vh;
        background: rgba(255, 255, 255, 0.9);
        border-left: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 6px 0 0 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 8px 2px;
        gap: 3px;
        user-select: none;
        transition: all 0.2s ease;
        box-shadow: -1px 0 4px rgba(0, 0, 0, 0.04);
        overflow-y: auto;
        overflow-x: hidden;
      }
      #aic-minimap::-webkit-scrollbar {
        width: 2px;
      }
      #aic-minimap::-webkit-scrollbar-thumb {
        background: transparent;
      }

      /* ===== 单条横线 ===== */
      .aic-minimap-line {
        width: 10px;
        height: 3px;
        border-radius: 2px;
        background: #d4d4d4;
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
      }
      .aic-minimap-line:hover {
        background: #a0a0a0;
        width: 12px;
      }
      .aic-minimap-line.aic-active {
        background: var(--aic-theme-color, #4d6bfe);
        width: 12px;
        height: 4px;
      }

      /* ===== 目录面板（悬停显示） ===== */
      #aic-panel {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        max-height: 70vh;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 8px 0 0 8px;
        box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
        opacity: 0;
        pointer-events: none;
        transition: width 0.2s ease, opacity 0.2s ease;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      /* 悬停时展开面板 */
      #aic-catalog-container:hover #aic-panel {
        width: 220px;
        opacity: 1;
        pointer-events: auto;
        padding: 12px 0;
      }

      /* 面板标题 */
      .aic-panel-header {
        padding: 0 12px 8px;
        font-size: 12px;
        font-weight: 600;
        color: #666;
        border-bottom: 1px solid #f0f0f0;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .aic-panel-count {
        font-size: 11px;
        color: #999;
        font-weight: normal;
      }

      /* 面板内容区 */
      .aic-panel-content {
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0 8px;
        flex: 1;
      }
      .aic-panel-content::-webkit-scrollbar {
        width: 4px;
      }
      .aic-panel-content::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 2px;
      }

      /* 面板条目 */
      .aic-panel-item {
        padding: 8px 10px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        transition: all 0.15s ease;
        margin-bottom: 4px;
      }
      .aic-panel-item:hover {
        background: rgba(0, 0, 0, 0.04);
      }
      .aic-panel-item.aic-active {
        background: rgba(77, 107, 254, 0.1);
      }
      .aic-panel-item.aic-active .aic-panel-index {
        background: var(--aic-theme-color, #4d6bfe);
        color: #fff;
      }

      .aic-panel-index {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #f0f0f0;
        color: #666;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 1px;
      }

      .aic-panel-text {
        flex: 1;
        font-size: 12px;
        color: #333;
        line-height: 1.5;
        word-break: break-all;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .aic-panel-rename {
        flex-shrink: 0;
        font-size: 11px;
        color: #999;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 3px;
        opacity: 0;
        transition: all 0.15s;
      }
      .aic-panel-item:hover .aic-panel-rename {
        opacity: 1;
      }
      .aic-panel-rename:hover {
        color: #666;
        background: rgba(0, 0, 0, 0.06);
      }

      /* 重命名输入框 */
      .aic-panel-input {
        flex: 1;
        border: 1px solid var(--aic-theme-color, #4d6bfe);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        outline: none;
        color: #333;
        width: 100%;
      }

      /* 空状态 */
      .aic-panel-empty {
        text-align: center;
        color: #bbb;
        font-size: 12px;
        padding: 20px 0;
      }

      /* ===== 高亮闪烁 ===== */
      @keyframes aic-flash {
        0%, 100% { background-color: transparent; }
        50% { background-color: rgba(66, 133, 244, 0.15); }
      }
      .aic-flash-highlight {
        animation: aic-flash 300ms ease 3 times;
        border-radius: 8px;
      }
    `;
    document.head.appendChild(style);
  },

  _createElements() {
    // 外层容器
    this.container = document.createElement('div');
    this.container.id = 'aic-catalog-container';
    this.container.style.setProperty('--aic-theme-color', this.themeColor);

    // Minimap 细条
    this.minimap = document.createElement('div');
    this.minimap.id = 'aic-minimap';

    // 目录面板
    this.panel = document.createElement('div');
    this.panel.id = 'aic-panel';

    this.container.appendChild(this.minimap);
    this.container.appendChild(this.panel);
  },

  _renderMinimap() {
    if (!this.minimap) return;
    this.minimap.innerHTML = '';

    if (this.userMessages.length === 0) {
      this.minimap.innerHTML = '<div style="color:#ccc;font-size:8px;writing-mode:vertical-lr;">等待</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    this.userMessages.forEach((msg, index) => {
      const line = document.createElement('div');
      line.className = 'aic-minimap-line';
      line.dataset.userIndex = index;

      if (index === this.activeIndex) {
        line.classList.add('aic-active');
      }

      line.addEventListener('click', () => {
        this._onItemClick(index);
      });

      fragment.appendChild(line);
    });

    this.minimap.appendChild(fragment);
  },

  _renderPanel() {
    if (!this.panel) return;
    this.panel.innerHTML = '';

    // 头部
    const header = document.createElement('div');
    header.className = 'aic-panel-header';
    const count = this.userMessages?.length || 0;
    header.innerHTML = `
      <span>对话目录</span>
      <span class="aic-panel-count">${count} 条</span>
    `;
    this.panel.appendChild(header);

    // 内容区
    const content = document.createElement('div');
    content.className = 'aic-panel-content';

    if (!this.userMessages || this.userMessages.length === 0) {
      content.innerHTML = '<div class="aic-panel-empty">暂无对话内容<br><small>请确保页面已加载完成</small></div>';
    } else {
      const fragment = document.createDocumentFragment();

      this.userMessages.forEach((msg, index) => {
        const fullText = msg.customTitle || msg.content || '';
        const displayText = fullText.length > 50 ? fullText.substring(0, 50) + '...' : fullText;
        const isImageOnly = !displayText.trim() && msg.hasImage;
        const isFileOnly = !displayText.trim() && msg.hasFile;

        // 跳过完全空的消息（但保留有图片或文件的）
        if (!displayText.trim() && !isImageOnly && !isFileOnly) {
          console.log('[AI对话目录] 跳过空消息 #', index);
          return;
        }

        // 确定图标
        let icon = '';
        if (isImageOnly || msg.hasImage) {
          icon = '🖼️ ';
        } else if (isFileOnly || msg.hasFile) {
          icon = '📎 ';
        }

        const item = document.createElement('div');
        item.className = 'aic-panel-item';
        item.dataset.userIndex = index;

        if (index === this.activeIndex) {
          item.classList.add('aic-active');
        }

        item.innerHTML = `
          <span class="aic-panel-index">${index + 1}</span>
          <span class="aic-panel-text">${icon}${this._escapeHtml(isImageOnly ? '[图片]' : isFileOnly ? '[文件]' : displayText)}</span>
          <span class="aic-panel-rename" title="重命名">✏️</span>
        `;

        // 点击跳转
        item.addEventListener('click', (e) => {
          if (e.target.closest('.aic-panel-rename')) return;
          this._onItemClick(index);
        });

        // 重命名
        const renameBtn = item.querySelector('.aic-panel-rename');
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._startRename(item, msg);
        });

        fragment.appendChild(item);
      });

      content.appendChild(fragment);
    }

    this.panel.appendChild(content);
  },

  _onItemClick(userIndex) {
    const msgInfo = this.messageElements[userIndex];
    if (!msgInfo) {
      console.warn('[AI对话目录] 找不到消息信息，索引:', userIndex);
      return;
    }

    let targetEl = msgInfo.element;

    // 检查元素是否还在 DOM 中
    if (!targetEl || !document.body.contains(targetEl)) {
      console.log('[AI对话目录] 元素不在 DOM 中，尝试重新查找');
      // 尝试重新查找
      if (window.__AICatalog && window.__AICatalog.findMessageElementByIndex) {
        targetEl = window.__AICatalog.findMessageElementByIndex(userIndex);
      }
    }

    if (!targetEl) {
      console.warn('[AI对话目录] 无法找到目标元素');
      return;
    }

    // 使用更可靠的方式滚动到元素
    try {
      // 先尝试 scrollIntoView
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 备用方案：如果 scrollIntoView 不工作，使用 scrollTo
      setTimeout(() => {
        const rect = targetEl.getBoundingClientRect();
        const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;

        if (!isInViewport) {
          const scrollTop = window.pageYOffset + rect.top - window.innerHeight / 2 + rect.height / 2;
          window.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }

        // 添加高亮效果
        targetEl.classList.add('aic-flash-highlight');
        setTimeout(() => targetEl.classList.remove('aic-flash-highlight'), 900);
      }, 350);
    } catch (err) {
      console.error('[AI对话目录] 滚动失败:', err);
    }
  },

  _startRename(itemEl, message) {
    const textEl = itemEl.querySelector('.aic-panel-text');
    const renameEl = itemEl.querySelector('.aic-panel-rename');
    const originalText = message.customTitle || message.content || '';

    // 隐藏原文本和重命名按钮
    textEl.style.display = 'none';
    renameEl.style.display = 'none';

    const input = document.createElement('input');
    input.className = 'aic-panel-input';
    input.type = 'text';
    input.value = originalText;
    input.maxLength = 50;

    itemEl.insertBefore(input, renameEl);
    input.focus();
    input.select();

    const confirm = () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== originalText) {
        message.customTitle = newTitle;
        textEl.textContent = newTitle.length > 50 ? newTitle.substring(0, 50) + '...' : newTitle;
        if (window.__AICatalog && window.__AICatalog.onRenameMessage) {
          window.__AICatalog.onRenameMessage(message.id, newTitle);
        }
      }
      cleanup();
    };

    const cleanup = () => {
      if (input.parentElement) input.remove();
      textEl.style.display = '';
      renameEl.style.display = '';
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirm(); }
      if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        // 检查焦点是否还在输入框或重命名按钮上
        const activeEl = document.activeElement;
        if (activeEl !== input && !itemEl.contains(activeEl)) {
          confirm();
        }
      }, 150);
    });
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// 挂载到全局
window.__AICatalog = window.__AICatalog || {};
window.__AICatalog.AIC_CatalogUI = AIC_CatalogUI;
