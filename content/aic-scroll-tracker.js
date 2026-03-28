// AI对话目录插件 - 滚动追踪器
// 使用 IntersectionObserver 监听消息可见性，驱动目录高亮

const AIC_ScrollTracker = {
  observer: null,
  userMessages: [],
  onActiveChange: null,  // 回调: (index) => void
  _observedElements: new WeakSet(),  // 已观察的元素集合

  // ========== 初始化 ==========

  init(userMessages, onActiveChange) {
    this.destroy();
    this.userMessages = userMessages;
    this.onActiveChange = onActiveChange;

    if (userMessages.length === 0) return;

    this.observer = new IntersectionObserver(
      (entries) => this._handleIntersection(entries),
      {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    );

    userMessages.forEach(msg => {
      if (msg.element) {
        this.observer.observe(msg.element);
        this._observedElements.add(msg.element);
      }
    });

    console.log(`[AI对话目录] 滚动追踪已启动，监听 ${userMessages.length} 条消息`);
  },

  /**
   * 增量更新追踪的消息列表
   * 只观察新增的元素，不销毁已有的 Observer
   */
  update(userMessages, onActiveChange) {
    if (onActiveChange) this.onActiveChange = onActiveChange;
    this.userMessages = userMessages;

    if (!this.observer) {
      this.init(userMessages, this.onActiveChange);
      return;
    }

    // 增量观察：只对新增元素调用 observe
    let newCount = 0;
    userMessages.forEach(msg => {
      if (msg.element && !this._observedElements.has(msg.element)) {
        this.observer.observe(msg.element);
        this._observedElements.add(msg.element);
        newCount++;
      }
    });

    if (newCount > 0) {
      console.log(`[AI对话目录] 滚动追踪增量更新，新增 ${newCount} 条观察`);
    }
  },

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this._observedElements = new WeakSet();
    this.userMessages = [];
  },

  // ========== 私有方法 ==========

  /**
   * 处理交叉变化事件
   */
  _handleIntersection(entries) {
    // 找到当前视口中位置最高的可见消息
    let bestEntry = null;
    let bestRatio = 0;

    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 计算可见比例，结合位置权重
        // 越靠近视口顶部的消息权重越高
        const viewportHeight = window.innerHeight;
        const positionScore = 1 - (entry.boundingClientRect.top / viewportHeight);
        const score = entry.intersectionRatio * (1 + positionScore);

        if (score > bestRatio) {
          bestRatio = score;
          bestEntry = entry;
        }
      }
    });

    if (bestEntry) {
      // 找到对应的用户消息索引
      const targetEl = bestEntry.target;
      const index = this.userMessages.findIndex(msg => msg.element === targetEl);
      if (index >= 0 && this.onActiveChange) {
        this.onActiveChange(index);
      }
    }
  },
};

// 挂载到全局（aic-main.js 通过此全局变量访问）
window.__AICatalog_ScrollTracker = AIC_ScrollTracker;
