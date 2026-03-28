// AI对话目录插件 - 工具函数

const AIC_Utils = {
  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /**
   * 截取字符串前N个字符
   */
  truncate(str, maxLen) {
    if (!str) return '';
    const cleaned = str.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) return cleaned;
    return cleaned.substring(0, maxLen) + '...';
  },

  /**
   * 防抖函数
   */
  debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * 节流函数
   */
  throttle(fn, interval) {
    let lastTime = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastTime >= interval) {
        lastTime = now;
        fn.apply(this, args);
      }
    };
  },

  /**
   * 安全获取DOM文本
   */
  safeText(el) {
    if (!el) return '';
    return el.textContent || el.innerText || '';
  },

  /**
   * 平滑滚动到元素
   */
  smoothScrollTo(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  /**
   * 高亮闪烁元素
   */
  flashHighlight(el, count, interval) {
    if (!el) return;
    const originalBg = el.style.backgroundColor || '';
    let i = 0;
    const flash = () => {
      el.style.backgroundColor = i % 2 === 0 ? 'rgba(66, 133, 244, 0.2)' : originalBg;
      el.style.transition = 'background-color 0.3s ease';
      i++;
      if (i < count * 2) {
        setTimeout(flash, interval);
      } else {
        el.style.backgroundColor = originalBg;
      }
    };
    flash();
  },

  /**
   * 格式化时间为可读字符串
   */
  formatTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  },

  /**
   * 格式化日期
   */
  formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  /**
   * 生成对话的Markdown文本
   */
  conversationToMarkdown(conversation) {
    if (!conversation) return '';

    const platformNames = {
      kimi: 'Kimi',
      deepseek: 'DeepSeek',
      doubao: '豆包',
      yuanbao: '腾讯元宝'
    };

    let md = `# ${conversation.title || '未命名对话'}\n\n`;
    md += `**平台**: ${platformNames[conversation.platform] || conversation.platform}\n`;
    md += `**时间**: ${AIC_Utils.formatDate(conversation.createdAt)}\n`;
    md += `**URL**: ${conversation.url}\n`;

    if (conversation.metadata?.model) {
      md += `**模型**: ${conversation.metadata.model}\n`;
    }

    md += `\n---\n\n`;

    if (conversation.messages && conversation.messages.length > 0) {
      conversation.messages.forEach((msg, idx) => {
        const title = msg.customTitle || AIC_Utils.truncate(msg.content, AIC_CONSTANTS.TITLE_MAX_LENGTH);
        md += `## ${idx + 1}. ${title}\n\n`;
        md += `**${msg.type === 'user' ? '用户' : 'AI'}** (${AIC_Utils.formatTime(msg.timestamp)}):\n\n`;
        md += `${msg.content}\n\n`;
        md += `---\n\n`;
      });
    }

    return md;
  },

  /**
   * 下载文件
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * 根据URL判断平台
   */
  detectPlatform(url) {
    if (url.includes('kimi.moonshot.cn')) return 'kimi';
    if (url.includes('chat.deepseek.com')) return 'deepseek';
    if (url.includes('doubao.com')) return 'doubao';
    if (url.includes('yuanbao.tencent.com')) return 'yuanbao';
    return null;
  }
};
