// ChatMap - 知识图谱完整版（新 Tab 页）
(async function() {
  'use strict';

  let network = null;
  let allGraphData = null;
  let activeFilterTag = null;

  const platformColors = { doubao: '#4e83fd', yuanbao: '#6C5CE7' };
  const platformNames = { doubao: '豆包', yuanbao: '腾讯元宝' };

  // ========== 初始化 ==========

  async function init() {
    allGraphData = await fetchGraphData();

    if (!allGraphData || allGraphData.nodes.length === 0) {
      document.getElementById('graphContainer').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🗺️</div>
          <div>暂无对话数据</div>
          <div class="empty-state-sub">给对话添加标签后即可生成关联图谱</div>
        </div>
      `;
      document.getElementById('statsText').textContent = '0 个对话';
      return;
    }

    renderTagFilters();
    renderLegend();
    renderGraph(allGraphData.nodes, allGraphData.edges);
    updateStats(allGraphData.nodes.length, allGraphData.edges.length);
  }

  // ========== 数据获取 ==========

  function fetchGraphData() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_GRAPH_DATA' }, (response) => {
        resolve(response?.data || null);
      });
    });
  }

  // ========== 标签筛选 ==========

  function renderTagFilters() {
    const container = document.getElementById('tagFilter');
    const tags = allGraphData.tags || [];

    tags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-filter-pill active';
      pill.style.background = tag.color;
      pill.textContent = tag.name;
      pill.dataset.tagId = tag.id;
      pill.addEventListener('click', () => {
        activeFilterTag = activeFilterTag === tag.id ? null : tag.id;
        updateFilterUI();
        applyFilter();
      });
      container.appendChild(pill);
    });

    document.getElementById('filterAll').addEventListener('click', () => {
      activeFilterTag = null;
      updateFilterUI();
      applyFilter();
    });
  }

  function updateFilterUI() {
    document.getElementById('filterAll').classList.toggle('active', activeFilterTag === null);
    document.querySelectorAll('.tag-filter-pill').forEach(pill => {
      const isActive = activeFilterTag === null || parseInt(pill.dataset.tagId) === activeFilterTag;
      pill.classList.toggle('active', isActive);
    });
  }

  function applyFilter() {
    let nodes = allGraphData.nodes;
    let edges = allGraphData.edges;

    if (activeFilterTag !== null) {
      const filteredIds = new Set(
        nodes.filter(n => n.tagIds.includes(activeFilterTag)).map(n => n.id)
      );
      nodes = nodes.filter(n => filteredIds.has(n.id));
      edges = edges.filter(e => filteredIds.has(e.from) && filteredIds.has(e.to));
    }

    updateStats(nodes.length, edges.length);
    renderGraph(nodes, edges);
  }

  // ========== 图例 ==========

  function renderLegend() {
    const legend = document.getElementById('legend');
    let html = '<div class="legend-title">图例</div>';

    Object.entries(platformColors).forEach(([p, color]) => {
      html += `<div class="legend-item">
        <span class="legend-dot" style="background:${color}"></span>
        <span>${platformNames[p] || p}</span>
      </div>`;
    });

    (allGraphData.tags || []).forEach(tag => {
      html += `<div class="legend-item">
        <span class="legend-line" style="background:${tag.color}"></span>
        <span>${escapeHtml(tag.name)}</span>
      </div>`;
    });

    legend.innerHTML = html;
  }

  // ========== 图谱渲染 ==========

  function renderGraph(nodesData, edgesData) {
    const container = document.getElementById('graphContainer');
    container.innerHTML = '';

    if (nodesData.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div>该标签下暂无关联对话</div>
        </div>
      `;
      return;
    }

    const visNodes = new vis.DataSet(nodesData.map(n => ({
      id: n.id,
      label: n.label,
      title: buildTooltip(n),
      color: {
        background: n.tags.length > 0 ? n.tags[0].color : (platformColors[n.platform] || '#999'),
        border: '#fff',
        highlight: { background: '#ff6b6b', border: '#fff' },
        hover: { background: '#ff9f43', border: '#fff' }
      },
      font: { color: '#333', size: 13 },
      size: Math.min(35, 15 + (n.messageCount || 0) * 0.5),
      shape: 'dot',
      borderWidth: 2,
    })));

    const visEdges = new vis.DataSet(edgesData.map(e => ({
      from: e.from,
      to: e.to,
      label: e.label || '',
      color: { color: e.color?.color || '#cccccc', opacity: 0.6 },
      width: e.width || 1.5,
      font: { size: 10, color: '#999', strokeWidth: 0 },
      smooth: { type: 'continuous' },
      arrows: '',
    })));

    const options = {
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -100,
          centralGravity: 0.008,
          springLength: 140,
          springConstant: 0.06,
        },
        maxVelocity: 50,
        solver: 'forceAtlas2Based',
        stabilization: { iterations: 150 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        zoomView: true,
        dragView: true,
        dragNodes: true,
      },
      nodes: { scaling: { min: 12, max: 45 } },
      edges: { smooth: { type: 'continuous' } },
    };

    network = new vis.Network(container, { nodes: visNodes, edges: visEdges }, options);

    // 点击节点 -> 打开详情面板
    network.on('click', (params) => {
      if (params.nodes.length === 0) {
        document.getElementById('detailPanel').classList.remove('open');
        return;
      }
      showDetailPanel(params.nodes[0]);
    });

    // hover 高亮关联
    network.on('hoverNode', (params) => {
      highlightConnected(params.node);
    });
    network.on('blurNode', () => {
      unhighlightAll();
    });
  }

  function buildTooltip(node) {
    const tagNames = node.tags.map(t => t.name).join(', ');
    return `${node.title}\n平台: ${platformNames[node.platform] || node.platform}\n消息数: ${node.messageCount}${tagNames ? '\n标签: ' + tagNames : ''}`;
  }

  // ========== 高亮关联 ==========

  function highlightConnected(nodeId) {
    if (!network) return;
    const connectedNodes = network.getConnectedNodes(nodeId);
    const allNodeIds = allGraphData.nodes.map(n => n.id);

    allNodeIds.forEach(id => {
      const isHighlighted = id === nodeId || connectedNodes.includes(id);
      network.body.data.nodes.update({
        id: id,
        opacity: isHighlighted ? 1 : 0.15,
        font: { color: isHighlighted ? '#333' : '#ddd' }
      });
    });
  }

  function unhighlightAll() {
    if (!network) return;
    allGraphData.nodes.forEach(n => {
      network.body.data.nodes.update({
        id: n.id,
        opacity: 1,
        font: { color: '#333' }
      });
    });
  }

  // ========== 详情面板 ==========

  async function showDetailPanel(nodeId) {
    const panel = document.getElementById('detailPanel');
    const content = document.getElementById('detailContent');
    panel.classList.add('open');

    const resp = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_CONVERSATION', data: { id: nodeId } }, resolve);
    });
    const conv = resp?.data;

    if (!conv) {
      content.innerHTML = '<div style="color:#999;">对话数据不存在</div>';
      return;
    }

    const tagMap = {};
    (allGraphData.tags || []).forEach(t => { tagMap[t.id] = t; });
    const tags = (conv.tags || []).map(tid => tagMap[tid]).filter(Boolean);

    const messagesHtml = (conv.messages || []).slice(0, 10).map(msg => {
      const role = msg.type === 'user' ? '用户' : 'AI';
      const roleColor = msg.type === 'user' ? '#4285f4' : '#666';
      const content = (msg.content || '').trim();
      return `<div class="detail-msg-item">
        <div class="detail-msg-role" style="color:${roleColor}">${role}</div>
        <div class="detail-msg-content">${escapeHtml(content.substring(0, 120))}${content.length > 120 ? '...' : ''}</div>
      </div>`;
    }).join('');

    const moreHint = (conv.messages || []).length > 10
      ? '<div style="color:#bbb;text-align:center;padding:8px;">... 更多消息</div>'
      : '';

    content.innerHTML = `
      <div class="detail-title">${escapeHtml(conv.title || '未命名对话')}</div>
      <div class="detail-meta">
        平台：${platformNames[conv.platform] || conv.platform}<br>
        消息数：${(conv.messages || []).length}<br>
        更新：${formatDate(conv.updatedAt)}
      </div>
      <div class="detail-tags">
        ${tags.length > 0
          ? tags.map(t => `<span class="detail-tag" style="background:${t.color}">${escapeHtml(t.name)}</span>`).join('')
          : '<span style="color:#bbb;font-size:12px;">无标签</span>'}
      </div>
      <button class="detail-open-btn" id="btnOpenConv">打开对话</button>
      <div style="font-size:12px;font-weight:600;color:#666;margin-bottom:8px;">对话摘要</div>
      <div class="detail-messages">${messagesHtml}${moreHint}</div>
    `;

    document.getElementById('btnOpenConv')?.addEventListener('click', () => {
      if (conv.url) chrome.tabs.update({ url: conv.url });
    });
  }

  // ========== 工具函数 ==========

  function updateStats(nodeCount, edgeCount) {
    document.getElementById('statsText').textContent = `${nodeCount} 个对话 · ${edgeCount} 条关联`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ========== 事件绑定 ==========

  document.getElementById('detailClose').addEventListener('click', () => {
    document.getElementById('detailPanel').classList.remove('open');
  });

  // ========== 启动 ==========
  init();
})();
