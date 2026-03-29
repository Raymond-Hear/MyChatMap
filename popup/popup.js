// MyChatMap - Popup 面板逻辑
// 负责：显示当前对话目录、标签管理、导出功能、图谱预览

(async function () {
  'use strict';

  // ========== DOM 元素 ==========
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const convCount = document.getElementById('convCount');
  const convList = document.getElementById('convList');
  const convEmpty = document.getElementById('convEmpty');
  const btnExportCurrent = document.getElementById('btnExportCurrent');
  const btnExportAll = document.getElementById('btnExportAll');
  const btnClearAll = document.getElementById('btnClearAll');

  // 当前标签页信息
  let currentTab = null;
  let currentPlatform = null;
  let currentConversationId = null;

  // ========== 初始化 ==========

  async function init() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
      currentPlatform = detectPlatform(tab?.url);

      if (currentPlatform) {
        statusDot.classList.remove('inactive');
        statusText.textContent = `已连接 ${getPlatformName(currentPlatform)}`;
        // 从 content script 获取对话ID
        const resp = await sendTabMessage({ type: 'AIC_GET_CURRENT_CONVERSATION_ID' });
        if (resp && resp.success) {
          currentConversationId = resp.data;
        }
        btnExportCurrent.disabled = false;
      } else {
        statusDot.classList.add('inactive');
        statusText.textContent = '未检测到 AI 对话';
        btnExportCurrent.disabled = true;
      }

      await loadConversations();

      btnExportCurrent.addEventListener('click', exportCurrent);
      btnExportAll.addEventListener('click', exportAll);
      btnClearAll.addEventListener('click', clearAllData);

      // 标签管理
      await loadTags();
      document.getElementById('btnNewTag').addEventListener('click', showTagInput);
      document.getElementById('btnConfirmTag').addEventListener('click', createNewTag);
      document.getElementById('btnCancelTag').addEventListener('click', () => {
        document.getElementById('tagInputArea').style.display = 'none';
      });
      document.getElementById('newTagInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createNewTag();
        if (e.key === 'Escape') document.getElementById('tagInputArea').style.display = 'none';
      });

      // 图谱
      document.getElementById('btnOpenGraph').addEventListener('click', openFullGraph);
      document.getElementById('graphModalClose').addEventListener('click', () => {
        document.getElementById('graphModal').style.display = 'none';
      });
      document.getElementById('btnOpenFullGraph').addEventListener('click', openFullGraph);
    } catch (err) {
      console.error('[MyChatMap] Popup 初始化失败:', err);
      statusText.textContent = '初始化失败';
    }
  }

  // ========== 消息通信 ==========

  function sendTabMessage(msg) {
    return new Promise((resolve) => {
      if (!currentTab || !currentTab.id) {
        resolve(null);
        return;
      }
      chrome.tabs.sendMessage(currentTab.id, msg, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[AI对话目录] sendTabMessage 错误:', chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  // ========== 工具函数 ==========

  function detectPlatform(url) {
    if (!url) return null;
    if (url.includes('doubao.com')) return 'doubao';
    if (url.includes('yuanbao.tencent.com')) return 'yuanbao';
    return null;
  }

  function getPlatformName(platform) {
    const names = { kimi: 'Kimi', deepseek: 'DeepSeek', doubao: '豆包', yuanbao: '腾讯元宝' };
    return names[platform] || platform;
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function sanitizeFilename(str) {
    return (str || '未命名').replace(/[\/\\:*?"<>|]/g, '_').substring(0, 50);
  }

  function truncate(str, maxLen) {
    if (!str) return '';
    const cleaned = str.replace(/\s+/g, ' ').trim();
    return cleaned.length <= maxLen ? cleaned : cleaned.substring(0, maxLen) + '...';
  }

  // ========== 数据加载 ==========

  async function loadConversations() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_CONVERSATIONS' });
    const conversations = response?.data || [];

    // 同时加载标签数据用于显示
    const tagsResp = await chrome.runtime.sendMessage({ type: 'GET_ALL_TAGS' });
    const allTags = tagsResp?.data || [];
    const tagMap = {};
    allTags.forEach(t => { tagMap[t.id] = t; });

    convCount.textContent = `${conversations.length} 条对话`;

    if (conversations.length === 0) {
      convEmpty.style.display = '';
      btnExportAll.disabled = true;
      return;
    }

    convEmpty.style.display = 'none';
    btnExportAll.disabled = false;

    const fragment = document.createDocumentFragment();
    conversations.slice(0, 20).forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conv-item';
      item.style.cursor = 'pointer';
      item.title = `点击打开此对话 (${conv.url || ''})`;
      item.innerHTML = `
        <span class="conv-platform">${getPlatformName(conv.platform)}</span>
        <span class="conv-title">${truncate(conv.title, 20)}</span>
        <span class="conv-time">${formatDate(conv.updatedAt)}</span>
      `;

      // 标签行
      const convTags = (conv.tags || []).map(tid => tagMap[tid]).filter(Boolean);
      if (convTags.length > 0 || allTags.length > 0) {
        const tagRow = document.createElement('div');
        tagRow.className = 'conv-tag-row';
        let tagHtml = convTags.map(t =>
          `<span class="conv-tag" style="background:${t.color}">${escapeHtml(t.name)}</span>`
        ).join('');
        tagHtml += `<span class="conv-tag-add" data-conv-id="${conv.id}">+标签</span>`;
        tagRow.innerHTML = tagHtml;
        item.appendChild(tagRow);
      }

      // 点击跳转（排除点击标签区域）
      item.addEventListener('click', (e) => {
        if (e.target.closest('.conv-tag-add') || e.target.closest('.conv-tag')) return;
        if (conv.url) {
          chrome.tabs.update({ url: conv.url });
          window.close();
        }
      });

      // "+标签" 按钮事件
      const addBtn = item.querySelector('.conv-tag-add');
      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showTagDropdown(conv.id, conv.tags || [], addBtn);
        });
      }

      fragment.appendChild(item);
    });

    convList.innerHTML = '';
    convList.appendChild(fragment);
  }

  // ========== 导出功能 ==========

  async function exportCurrent() {
    // 优先从 content script 实时获取完整对话数据
    const response = await sendTabMessage({ type: 'AIC_GET_CONVERSATION_DATA' });

    if (response && response.success && response.data) {
      downloadMarkdown(response.data);
      return;
    }

    // 备选：从数据库获取
    if (currentConversationId) {
      const dbResp = await chrome.runtime.sendMessage({ type: 'GET_CONVERSATION', data: { id: currentConversationId } });
      const conv = dbResp?.data;
      if (conv) {
        downloadMarkdown(conv);
        return;
      }
    }

    alert('无法获取当前对话数据。请确保你在 AI 对话页面，且页面已加载完成。');
  }

  function conversationToMarkdown(conv) {
    const platformNames = { doubao: '豆包', yuanbao: '腾讯元宝' };

    let md = `# ${conv.title || '未命名对话'}\n\n`;
    md += `**平台**: ${platformNames[conv.platform] || conv.platform}\n`;
    md += `**时间**: ${conv.updatedAt ? formatDate(conv.updatedAt) : ''}\n`;
    md += `**URL**: ${conv.url || ''}\n`;
    if (conv.metadata?.model) {
      md += `**模型**: ${conv.metadata.model}\n`;
    }
    md += `\n---\n\n`;

    if (conv.messages && conv.messages.length > 0) {
      // 过滤掉无效消息（无内容、工具调用等）
      const validMessages = conv.messages.filter(msg => {
        const hasContent = msg.content && msg.content.trim().length > 0;
        const isToolCall = msg.content && (
          msg.content.includes('正在搜索') ||
          msg.content.includes('使用工具') ||
          msg.content.includes('思考中') ||
          msg.content.includes('调用')
        );
        return hasContent && !isToolCall;
      });

      validMessages.forEach((msg, idx) => {
        // 确保内容不为空
        const content = msg.content?.trim() || '(无内容)';
        const title = msg.customTitle || truncate(content, 8);
        const role = msg.type === 'user' ? '用户' : 'AI';
        
        md += `## ${idx + 1}. ${title}\n\n`;
        md += `**${role}**:\n\n`;
        md += `${content}\n\n`;
        md += `---\n\n`;
      });
    } else {
      md += '*暂无对话内容*\n\n';
    }

    return md;
  }

  function downloadMarkdown(conv) {
    const md = conversationToMarkdown(conv);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // 添加平台前缀到文件名 [平台名] 对话标题.md
    const platformNames = { doubao: '豆包', yuanbao: '腾讯元宝' };
    const platformName = platformNames[conv.platform] || conv.platform || 'Unknown';
    const sanitizedTitle = sanitizeFilename(conv.title) || '未命名对话';
    const filename = `[${platformName}] ${sanitizedTitle}.md`;
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function exportAll() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_CONVERSATIONS' });
    const conversations = response?.data || [];

    if (conversations.length === 0) {
      alert('没有可导出的对话');
      return;
    }

    // 单对话直接下载 markdown
    if (conversations.length === 1) {
      downloadMarkdown(conversations[0]);
      return;
    }

    // 多对话：打包成 ZIP
    try {
      // 尝试加载 JSZip（popup 中通过 script 标签加载）
      const script = document.createElement('script');
      script.src = '../lib/jszip.min.js';
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip 未加载');
      }

      const zip = new JSZip();
      const folder = zip.folder('AI对话目录');

      // 用于追踪文件名重复
      const usedNames = new Set();

      conversations.forEach((conv, index) => {
        let name = sanitizeFilename(conv.title);
        // 避免文件名重复
        let baseName = name;
        let counter = 1;
        while (usedNames.has(name + '.md')) {
          name = `${baseName}_${counter}`;
          counter++;
        }
        usedNames.add(name + '.md');

        const md = conversationToMarkdown(conv);
        folder.file(`${name}.md`, md);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI对话目录_${formatDate(new Date().toISOString())}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[AI对话目录] ZIP 导出失败:', err);
      // 降级：逐个下载
      alert('ZIP 打包失败，将逐个下载对话文件。');
      for (const conv of conversations) {
        downloadMarkdown(conv);
      }
    }
  }

  // ========== 标签管理 ==========

  const TAG_COLORS = [
    '#4285f4', '#ea4335', '#34a853', '#fbbc05',
    '#8e44ad', '#e67e22', '#1abc9c', '#e84393',
    '#2c3e50', '#795548',
  ];
  let selectedTagColor = TAG_COLORS[0];

  async function loadTags() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_TAGS' });
    const tags = response?.data || [];
    const tagList = document.getElementById('tagList');
    const tagEmpty = document.getElementById('tagEmpty');

    tagList.innerHTML = '';

    if (tags.length === 0) {
      tagEmpty.style.display = '';
      tagList.appendChild(tagEmpty);
      return;
    }

    tagEmpty.style.display = 'none';

    tags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.style.background = tag.color || '#4285f4';
      pill.innerHTML = `
        <span class="tag-pill-label" title="双击重命名">${escapeHtml(tag.name)}</span>
        <span class="tag-pill-close" title="删除标签">✕</span>
      `;

      pill.querySelector('.tag-pill-close').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`确定删除标签"${tag.name}"吗？相关对话将取消关联。`)) return;
        await chrome.runtime.sendMessage({ type: 'DELETE_TAG', data: { tagId: tag.id } });
        await loadTags();
        await loadConversations();
      });

      const labelEl = pill.querySelector('.tag-pill-label');
      labelEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startRenameTag(labelEl, tag);
      });

      tagList.appendChild(pill);
    });
  }

  async function startRenameTag(labelEl, tag) {
    const originalName = tag.name;
    labelEl.contentEditable = true;
    labelEl.focus();
    const range = document.createRange();
    range.selectNodeContents(labelEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finish = async (useNew) => {
      labelEl.contentEditable = false;
      const newName = labelEl.textContent.trim();
      if (useNew && newName && newName !== originalName) {
        await chrome.runtime.sendMessage({ type: 'RENAME_TAG', data: { tagId: tag.id, newName } });
      }
      await loadTags();
      await loadConversations();
    };

    const handler = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); labelEl.removeEventListener('keydown', handler); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); labelEl.removeEventListener('keydown', handler); labelEl.textContent = originalName; labelEl.contentEditable = false; }
    };
    labelEl.addEventListener('keydown', handler);
    labelEl.addEventListener('blur', () => { labelEl.removeEventListener('keydown', handler); finish(true); }, { once: true });
  }

  function showTagInput() {
    const area = document.getElementById('tagInputArea');
    const input = document.getElementById('newTagInput');
    const picker = document.getElementById('colorPicker');
    area.style.display = area.style.display === 'none' ? '' : 'none';
    if (area.style.display === 'none') return;
    input.value = '';
    input.focus();

    picker.innerHTML = '';
    TAG_COLORS.forEach(color => {
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch' + (color === selectedTagColor ? ' selected' : '');
      swatch.style.background = color;
      swatch.addEventListener('click', () => {
        selectedTagColor = color;
        picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
      picker.appendChild(swatch);
    });
  }

  async function createNewTag() {
    const input = document.getElementById('newTagInput');
    const name = input.value.trim();
    if (!name) return;
    await chrome.runtime.sendMessage({ type: 'CREATE_TAG', data: { name, color: selectedTagColor } });
    document.getElementById('tagInputArea').style.display = 'none';
    await loadTags();
    await loadConversations();
  }

  // ========== 对话标签下拉 ==========

  function showTagDropdown(convId, existingTagIds, anchorEl) {
    document.querySelectorAll('.tag-dropdown').forEach(el => el.remove());

    const dropdown = document.createElement('div');
    dropdown.className = 'tag-dropdown';

    chrome.runtime.sendMessage({ type: 'GET_ALL_TAGS' }).then(resp => {
      const allTags = resp?.data || [];
      if (allTags.length === 0) {
        dropdown.innerHTML = '<div style="color:#999;font-size:11px;padding:4px;">暂无标签，请先在上方创建</div>';
      } else {
        allTags.forEach(tag => {
          const isAssociated = existingTagIds.includes(tag.id);
          const item = document.createElement('div');
          item.className = 'tag-dropdown-item' + (isAssociated ? ' active' : '');
          item.innerHTML = `
            <span class="tag-dropdown-dot" style="background:${tag.color}"></span>
            <span style="flex:1;">${escapeHtml(tag.name)}</span>
            ${isAssociated ? '<span style="color:#4285f4;font-size:10px;">✓</span>' : ''}
          `;
          item.addEventListener('click', async () => {
            if (isAssociated) {
              await chrome.runtime.sendMessage({ type: 'REMOVE_TAG_FROM_CONVERSATION', data: { conversationId: convId, tagId: tag.id } });
            } else {
              await chrome.runtime.sendMessage({ type: 'ADD_TAG_TO_CONVERSATION', data: { conversationId: convId, tagId: tag.id } });
            }
            dropdown.remove();
            await loadConversations();
          });
          dropdown.appendChild(item);
        });
      }
    });

    const rect = anchorEl.getBoundingClientRect();
    dropdown.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
    dropdown.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(dropdown);

    setTimeout(() => {
      const close = (e) => {
        if (!dropdown.contains(e.target) && e.target !== anchorEl) {
          dropdown.remove();
          document.removeEventListener('mousedown', close);
        }
      };
      document.addEventListener('mousedown', close);
    }, 0);
  }

  // ========== 图谱 ==========

  function openFullGraph() {
    chrome.tabs.create({ url: chrome.runtime.getURL('mychatmap-graph.html') });
  }

  // ========== 工具函数补充 ==========

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ========== 数据清理 ==========

  async function clearAllData() {
    if (!confirm('确定要清理所有本地存储的对话数据吗？此操作不可恢复。')) return;

    await chrome.runtime.sendMessage({ type: 'DELETE_ALL_DATA' });
    convCount.textContent = '0 条对话';
    convList.innerHTML = '<div class="empty-hint">暂无保存的对话</div>';
    btnExportAll.disabled = true;
    btnExportCurrent.disabled = true;
  }

  // ========== 启动 ==========

  init();
})();
