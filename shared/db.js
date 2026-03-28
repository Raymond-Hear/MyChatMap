// MyChatMap - 数据库定义（Dexie.js）
// 仅在 Service Worker 中使用

import Dexie from '../lib/dexie.mjs';

const db = new Dexie('AIChatCatalogDB');

db.version(1).stores({
  conversations: 'id, platform, createdAt, updatedAt',
  settings: 'key'
});

// version(2): 新增 tags 表 + conversations 增加 tags 索引
db.version(2).stores({
  conversations: 'id, platform, createdAt, updatedAt, tags',
  tags: '++id, name, createdAt'
});

export default db;
