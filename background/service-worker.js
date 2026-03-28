// MyChatMap - Service Worker（数据访问层）
// 所有数据操作的唯一入口

import db from '../shared/db.js';

// 消息类型常量（内联定义，因为 content_scripts 不支持 ES module export）
const MSG_SAVE_CONVERSATION = 'SAVE_CONVERSATION';
const MSG_GET_CONVERSATION = 'GET_CONVERSATION';
const MSG_GET_ALL_CONVERSATIONS = 'GET_ALL_CONVERSATIONS';
const MSG_UPDATE_MESSAGE_TITLE = 'UPDATE_MESSAGE_TITLE';
const MSG_DELETE_CONVERSATION = 'DELETE_CONVERSATION';
const MSG_DELETE_ALL_DATA = 'DELETE_ALL_DATA';
const MSG_GET_SETTINGS = 'GET_SETTINGS';
const MSG_SAVE_SETTINGS = 'SAVE_SETTINGS';

// 标签操作
const MSG_CREATE_TAG = 'CREATE_TAG';
const MSG_GET_ALL_TAGS = 'GET_ALL_TAGS';
const MSG_DELETE_TAG = 'DELETE_TAG';
const MSG_RENAME_TAG = 'RENAME_TAG';
const MSG_UPDATE_TAG_COLOR = 'UPDATE_TAG_COLOR';

// 对话标签关联
const MSG_ADD_TAG_TO_CONVERSATION = 'ADD_TAG_TO_CONVERSATION';
const MSG_REMOVE_TAG_FROM_CONVERSATION = 'REMOVE_TAG_FROM_CONVERSATION';
const MSG_SET_CONVERSATION_TAGS = 'SET_CONVERSATION_TAGS';

// 图谱
const MSG_GET_GRAPH_DATA = 'GET_GRAPH_DATA';

const SETTING_PROCESS_HISTORY = 'processHistory';
const VERSION = '0.2.0';

// ========== 数据操作 ==========

/**
 * 保存或更新对话
 */
async function saveConversation(data) {
  const { id, title, platform, url, messages, metadata } = data;
  const now = new Date().toISOString();

  const existing = await db.conversations.get(id);
  const conversation = {
    id,
    title: title || '未命名对话',
    platform,
    url,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    messages: messages || [],
    metadata: metadata || {}
  };

  await db.conversations.put(conversation);
  return conversation;
}

/**
 * 追加消息到对话
 */
async function appendMessages(conversationId, newMessages) {
  const conversation = await db.conversations.get(conversationId);
  if (!conversation) return null;

  const existingIds = new Set(conversation.messages.map(m => m.id));
  const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));

  if (uniqueNew.length === 0) return conversation;

  conversation.messages = [...conversation.messages, ...uniqueNew];
  conversation.updatedAt = new Date().toISOString();

  await db.conversations.put(conversation);
  return conversation;
}

/**
 * 获取单个对话
 */
async function getConversation(id) {
  return await db.conversations.get(id);
}

/**
 * 获取所有对话
 */
async function getAllConversations() {
  return await db.conversations.orderBy('updatedAt').reverse().toArray();
}

/**
 * 获取指定平台的所有对话
 */
async function getConversationsByPlatform(platform) {
  return await db.conversations.where('platform').equals(platform).reverse().sortBy('updatedAt');
}

/**
 * 更新消息的自定义标题
 */
async function updateMessageTitle(conversationId, messageId, customTitle) {
  const conversation = await db.conversations.get(conversationId);
  if (!conversation) return null;

  const msg = conversation.messages.find(m => m.id === messageId);
  if (msg) {
    msg.customTitle = customTitle;
    conversation.updatedAt = new Date().toISOString();
    await db.conversations.put(conversation);
  }
  return conversation;
}

/**
 * 删除单个对话
 */
async function deleteConversation(id) {
  await db.conversations.delete(id);
}

/**
 * 清理所有数据
 */
async function deleteAllData() {
  await db.conversations.clear();
  await db.settings.clear();
  await db.tags.clear();
}

// ========== 标签操作 ==========

async function createTag(name, color) {
  const existing = await db.tags.where('name').equals(name).first();
  if (existing) return existing;

  const tag = {
    name,
    color: color || '#4285f4',
    createdAt: new Date().toISOString()
  };
  const id = await db.tags.add(tag);
  tag.id = id;
  return tag;
}

async function getAllTags() {
  return await db.tags.orderBy('createdAt').reverse().toArray();
}

async function deleteTag(tagId) {
  await db.tags.delete(tagId);
  const conversations = await db.conversations.toArray();
  const updates = conversations
    .filter(c => Array.isArray(c.tags) && c.tags.includes(tagId))
    .map(c => {
      c.tags = c.tags.filter(t => t !== tagId);
      return db.conversations.put(c);
    });
  await Promise.all(updates);
}

async function renameTag(tagId, newName) {
  const tag = await db.tags.get(tagId);
  if (!tag) return null;
  tag.name = newName;
  await db.tags.put(tag);
  return tag;
}

async function updateTagColor(tagId, color) {
  const tag = await db.tags.get(tagId);
  if (!tag) return null;
  tag.color = color;
  await db.tags.put(tag);
  return tag;
}

// ========== 对话标签关联 ==========

async function addTagToConversation(conversationId, tagId) {
  const conv = await db.conversations.get(conversationId);
  if (!conv) return null;
  if (!Array.isArray(conv.tags)) conv.tags = [];
  if (!conv.tags.includes(tagId)) {
    conv.tags.push(tagId);
    conv.updatedAt = new Date().toISOString();
    await db.conversations.put(conv);
  }
  return conv;
}

async function removeTagFromConversation(conversationId, tagId) {
  const conv = await db.conversations.get(conversationId);
  if (!conv) return null;
  if (Array.isArray(conv.tags)) {
    conv.tags = conv.tags.filter(t => t !== tagId);
    conv.updatedAt = new Date().toISOString();
    await db.conversations.put(conv);
  }
  return conv;
}

async function setConversationTags(conversationId, tagIds) {
  const conv = await db.conversations.get(conversationId);
  if (!conv) return null;
  conv.tags = tagIds || [];
  conv.updatedAt = new Date().toISOString();
  await db.conversations.put(conv);
  return conv;
}

// ========== 图谱数据聚合 ==========

async function getGraphData() {
  const [conversations, tags] = await Promise.all([
    db.conversations.toArray(),
    db.tags.toArray()
  ]);

  const tagMap = {};
  tags.forEach(t => { tagMap[t.id] = t; });

  // 构建节点
  const nodes = conversations.map(conv => ({
    id: conv.id,
    label: (conv.title || '未命名对话').substring(0, 12),
    title: conv.title || '未命名对话',
    platform: conv.platform,
    tagIds: conv.tags || [],
    tags: (conv.tags || []).map(tid => tagMap[tid]).filter(Boolean),
    messageCount: (conv.messages || []).length,
    updatedAt: conv.updatedAt
  }));

  // 构建边：基于同标签关联
  const edges = [];
  const edgeSet = new Set();

  const tagGroups = {};
  conversations.forEach(conv => {
    (conv.tags || []).forEach(tagId => {
      if (!tagGroups[tagId]) tagGroups[tagId] = [];
      tagGroups[tagId].push(conv.id);
    });
  });

  Object.entries(tagGroups).forEach(([tagId, convIds]) => {
    const tag = tagMap[tagId];
    for (let i = 0; i < convIds.length; i++) {
      for (let j = i + 1; j < convIds.length; j++) {
        const edgeKey = [convIds[i], convIds[j]].sort().join('||');
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            from: convIds[i],
            to: convIds[j],
            label: tag ? tag.name : '',
            color: { color: tag ? tag.color : '#cccccc' },
            width: 1.5,
            smooth: { type: 'continuous' }
          });
        }
      }
    }
  });

  return { nodes, edges, tags };
}

// ========== 设置操作 ==========

/**
 * 获取设置
 */
async function getSetting(key) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : null;
}

/**
 * 保存设置
 */
async function saveSetting(key, value) {
  await db.settings.put({ key, value });
}

// ========== 消息处理 ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('[MyChatMap] Service Worker error:', err);
    sendResponse({ success: false, error: err.message });
  });
  return true; // 保持异步响应通道
});

async function handleMessage(message, sender) {
  const { type, data } = message;

  switch (type) {
    case MSG_SAVE_CONVERSATION:
      return { success: true, data: await saveConversation(data) };

    case MSG_GET_CONVERSATION:
      return { success: true, data: await getConversation(data.id) };

    case MSG_GET_ALL_CONVERSATIONS:
      return { success: true, data: await getAllConversations() };

    case MSG_UPDATE_MESSAGE_TITLE: {
      const { conversationId, messageId, customTitle } = data;
      return { success: true, data: await updateMessageTitle(conversationId, messageId, customTitle) };
    }

    case MSG_DELETE_CONVERSATION:
      await deleteConversation(data.id);
      return { success: true };

    case MSG_DELETE_ALL_DATA:
      await deleteAllData();
      return { success: true };

    case MSG_GET_SETTINGS: {
      const value = await getSetting(data.key);
      return { success: true, data: value };
    }

    case MSG_SAVE_SETTINGS:
      await saveSetting(data.key, data.value);
      return { success: true };

    // 标签操作
    case MSG_CREATE_TAG:
      return { success: true, data: await createTag(data.name, data.color) };

    case MSG_GET_ALL_TAGS:
      return { success: true, data: await getAllTags() };

    case MSG_DELETE_TAG:
      await deleteTag(data.tagId);
      return { success: true };

    case MSG_RENAME_TAG:
      return { success: true, data: await renameTag(data.tagId, data.newName) };

    case MSG_UPDATE_TAG_COLOR:
      return { success: true, data: await updateTagColor(data.tagId, data.color) };

    // 对话标签关联
    case MSG_ADD_TAG_TO_CONVERSATION:
      return { success: true, data: await addTagToConversation(data.conversationId, data.tagId) };

    case MSG_REMOVE_TAG_FROM_CONVERSATION:
      return { success: true, data: await removeTagFromConversation(data.conversationId, data.tagId) };

    case MSG_SET_CONVERSATION_TAGS:
      return { success: true, data: await setConversationTags(data.conversationId, data.tagIds) };

    // 图谱
    case MSG_GET_GRAPH_DATA:
      return { success: true, data: await getGraphData() };

    default:
      return { success: false, error: `Unknown message type: ${type}` };
  }
}

// ========== 插件安装/更新 ==========

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // 首次安装，初始化默认设置
    await saveSetting(SETTING_PROCESS_HISTORY, false);
    console.log('[MyChatMap] 插件已安装');
  } else if (details.reason === 'update') {
    // 更新时保留数据，Dexie.js自动处理版本迁移
    console.log(`[MyChatMap] 插件已更新：${details.previousVersion} → ${VERSION}`);
  }
});
