// MyChatMap - 消息通信封装
// Content Script 与 Service Worker 之间的通信层

const AIC_MessageBus = {
  /**
   * 发送消息到 Service Worker
   */
  async send(type, data = {}) {
    try {
      const response = await chrome.runtime.sendMessage({ type, data });
      if (response && response.success) {
        return response.data;
      } else {
        console.error('[MyChatMap] 消息发送失败:', response?.error);
        return null;
      }
    } catch (err) {
      console.error('[MyChatMap] 通信错误:', err);
      return null;
    }
  },

  // ========== 对话操作 ==========

  async saveConversation(data) {
    return this.send(AIC_CONSTANTS.MSG_SAVE_CONVERSATION, data);
  },

  async getConversation(id) {
    return this.send(AIC_CONSTANTS.MSG_GET_CONVERSATION, { id });
  },

  async getAllConversations() {
    return this.send(AIC_CONSTANTS.MSG_GET_ALL_CONVERSATIONS);
  },

  async updateMessageTitle(conversationId, messageId, customTitle) {
    return this.send(AIC_CONSTANTS.MSG_UPDATE_MESSAGE_TITLE, { conversationId, messageId, customTitle });
  },

  async deleteConversation(id) {
    return this.send(AIC_CONSTANTS.MSG_DELETE_CONVERSATION, { id });
  },

  async deleteAllData() {
    return this.send(AIC_CONSTANTS.MSG_DELETE_ALL_DATA);
  },

  // ========== 标签操作 ==========

  async createTag(name, color) {
    return this.send(AIC_CONSTANTS.MSG_CREATE_TAG, { name, color });
  },

  async getAllTags() {
    return this.send(AIC_CONSTANTS.MSG_GET_ALL_TAGS);
  },

  async deleteTag(tagId) {
    return this.send(AIC_CONSTANTS.MSG_DELETE_TAG, { tagId });
  },

  async renameTag(tagId, newName) {
    return this.send(AIC_CONSTANTS.MSG_RENAME_TAG, { tagId, newName });
  },

  async updateTagColor(tagId, color) {
    return this.send(AIC_CONSTANTS.MSG_UPDATE_TAG_COLOR, { tagId, color });
  },

  // ========== 对话标签关联 ==========

  async addTagToConversation(conversationId, tagId) {
    return this.send(AIC_CONSTANTS.MSG_ADD_TAG_TO_CONVERSATION, { conversationId, tagId });
  },

  async removeTagFromConversation(conversationId, tagId) {
    return this.send(AIC_CONSTANTS.MSG_REMOVE_TAG_FROM_CONVERSATION, { conversationId, tagId });
  },

  async setConversationTags(conversationId, tagIds) {
    return this.send(AIC_CONSTANTS.MSG_SET_CONVERSATION_TAGS, { conversationId, tagIds });
  },

  // ========== 图谱 ==========

  async getGraphData() {
    return this.send(AIC_CONSTANTS.MSG_GET_GRAPH_DATA);
  },

  // ========== 设置 ==========

  async getSetting(key) {
    return this.send(AIC_CONSTANTS.MSG_GET_SETTINGS, { key });
  },

  async saveSetting(key, value) {
    return this.send(AIC_CONSTANTS.MSG_SAVE_SETTINGS, { key, value });
  }
};
