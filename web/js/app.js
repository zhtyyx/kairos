import { database } from './db.js';
import TimerManager from './timer.js';
import TaskManager from './tasks.js';
import BoardManager from './boards.js';
import HeatmapManager from './heatmap.js';
import MiniTimer from './mini-timer.js';
import notificationManager from './notifications.js';
import { initDataManagement } from './data-export.js';
import { escapeHtml, showToast as uiShowToast, showConfirm, showAlert, showUndoToast } from './ui.js';
import { t, getLang, toggleLang } from './i18n.js';
import { ai } from './ai.js';

class KairosApp {
  constructor() {
    this.timerManager = null;
    this.taskManager = null;
    this.boardManager = null;
    this.heatmapManager = null;
    this.miniTimer = null;
    this.currentTask = null;
    this.currentView = 'work';
    this.isActivityPanelOpen = false;
    this.activityPanelMediaQuery = '(max-width: 1024px) and (min-width: 769px)';
    this._refreshPending = false;
    this._refreshQueued = false;
    this._refreshForceQueued = false;
    this._dialogOpen = false;
    this.taskQuoteTimer = null;
    this.taskQuoteIndex = 0;
    this.taskQuotes = [
      { text: '人不是被事情本身困扰，而是被自己对事情的看法困扰。', author: 'Epictetus' },
      { text: '不要解释你的哲学，体现它。', author: 'Epictetus' },
      { text: '知道自己该做什么的人，少有焦虑。', author: 'Marcus Aurelius' },
      { text: '最小的行动，胜过最宏大的意图。', author: 'Oscar Wilde' },
      { text: '时间是最稀缺的资源，除非它被安排。', author: 'Peter Drucker' },
      { text: '伟大的事情，是由一系列小事聚合而成的。', author: 'Vincent van Gogh' },
    ];

    this.init();
  }

  async init() {
    await this.initializeApp();
    document.getElementById('app').classList.remove('hidden');
  }

  async initializeApp() {
    this.updateUserDisplay();
    await this.registerServiceWorker();
    await notificationManager.init();

    this.timerManager = new TimerManager(this);
    this.taskManager = new TaskManager(this);
    this.boardManager = new BoardManager(this);
    this.heatmapManager = new HeatmapManager(this);
    this.miniTimer = new MiniTimer(this.timerManager);

    this.setupEventListeners();

    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', () => toggleLang());
    }
    window.addEventListener('langchange', () => this.refreshAllViews());

    this.setupViewSwitcher();
    this.setupTaskQuotes();
    this.loadSettings();
    initDataManagement();
    await this.loadInitialData();
  }

  updateUserDisplay() {
    document.querySelectorAll('.avatar-circle, .avatar-circle-github').forEach(el => { el.textContent = '本'; });
    document.querySelectorAll('.user-name').forEach(el => { el.textContent = '本地模式'; });
    document.querySelectorAll('.user-username').forEach(el => { el.style.display = 'none'; });
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    const isDevMode = import.meta.env.DEV;

    // Dev 环境禁用 SW，避免缓存旧资源导致布局/样式与代码不一致。
    if (isDevMode) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      } catch {
      }
      return;
    }

    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.error('[sw] register failed:', e);
    }
  }

  setupEventListeners() {

    const logoSection = document.querySelector('.logo-section');
    if (logoSection) {
      logoSection.style.cursor = 'pointer';
      logoSection.addEventListener('click', () => this.showView('work'));
    }

    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');

    if (startPauseBtn) {
      startPauseBtn.addEventListener('click', async () => {
        if (this.timerManager.isRunning) {
          this.timerManager.pause();
          await database.logActivity({
            type: 'pause',
            content: t('timer.pauseFocus'),
            task_id: this.currentTask?.id || null
          });
          this.loadActivityLog();
        } else {
          const wasReset = this.timerManager.timeLeft === this.timerManager.sessionDuration;
          this.timerManager.start();
          if (wasReset) {
            const sessionText = this.timerManager.getSessionTypeText();
            const taskName = this.currentTask?.title || t('timer.personalFocus');
            await database.logActivity({
              type: 'start',
              content: t('timer.startSessionTask', { session: sessionText, task: taskName }),
              task_id: this.currentTask?.id || null
            });
            this.loadActivityLog();
          }
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (this.timerManager.isRunning) {
          const confirmed = await showConfirm(t('timer.resetConfirm'));
          if (!confirmed) return;
        }
        this.timerManager.reset();
      });
    }

    const miniToggleBtn = document.querySelector('.mini-panel-toggle');
    if (miniToggleBtn) {
      miniToggleBtn.addEventListener('click', () => {
        this.miniTimer.toggle();
      });
    }

    const backBtn = document.getElementById('back-to-main-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.showView('work');
      });
    }

    this.setupUserMenu();

    this.setupSettings();

    this.setupCreateBoardButtons();

    this.setupWorkViewControls();
    this.setupActivityPanelToggle();

    window.addEventListener('resize', () => {
      this.miniTimer?.handleResize?.();
      this.handleResponsiveLayout();
    });
  }

  setupCreateBoardButtons() {

    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action="create-project"], [data-action="create-board"], #create-board-btn, .create-board-btn');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        this.showCreateBoardDialog();
      }
    });
  }

  setupWorkViewControls() {

    this.setupCustomDropdown();

    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(this._workSearchDebounce);
        this._workSearchDebounce = setTimeout(() => this.filterWorkViewTasks(), 120);
      });

      const leftPanel = document.querySelector('.left-panel');
      if (leftPanel) {
        searchInput.addEventListener('focus', () => {
          if (window.innerWidth <= 768) leftPanel.classList.add('mobile-tasks-open');
        });
        searchInput.addEventListener('blur', () => {
          setTimeout(() => leftPanel.classList.remove('mobile-tasks-open'), 200);
        });
      }
    }

    const sendBtn = document.querySelector('.focus-compose-send');
    const aiBtn = document.querySelector('.focus-compose-ai');
    const noteInput = document.querySelector('.focus-compose-input');
    if (sendBtn && noteInput) {
      const sendNote = async () => {
        const content = noteInput.value.trim();
        if (!content) return;
        await database.logActivity({
          type: 'comment',
          content,
          task_id: this.currentTask?.id || null
        });
        noteInput.value = '';
        sendBtn.disabled = true;
        uiShowToast(t('focus.noteRecorded'), 'success');
        this.loadActivityLog();
      };

      sendBtn.addEventListener('click', sendNote);
      noteInput.addEventListener('input', () => {
        sendBtn.disabled = !noteInput.value.trim();
      });
      noteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          sendNote();
        }
      });
    }

    if (aiBtn) {
      aiBtn.addEventListener('click', () => this.handleAiBreakdown());
    }
  }

  _aiSystemPrompt() {
    return `你是任务拆解助手。用户会给你一个任务，你需要判断下一步。

情况1 - 信息足够，可以直接拆解：
输出以 TASKS: 开头，然后每行一个子任务。规则：
- 每个子任务是具体动作，有明确完成标准
- 动词开头，避免"了解、思考、考虑"等模糊词
- 按执行顺序排列，15字以内
- 不要编号、不要解释、不要前缀符号

情况2 - 信息不足，需要追问：
输出以 ASK: 开头，然后用一句简短的话向用户提问（不超过30字）。
只问最关键的一个问题，不要问多个。

示例：
用户：准备周五的产品演示
回复：ASK: 演示面向谁？需要准备哪些内容？

用户：做3组深蹲，每组15个
回复：TASKS:
热身拉伸5分钟
完成第一组15个深蹲
组间休息60秒
完成第二组15个深蹲
组间休息60秒
完成第三组15个深蹲
拉伸放松5分钟`;
  }

  async handleAiBreakdown() {
    const status = ai.getStatus();

    if (!status.enabled) {
      uiShowToast(t('focus.aiKeyRequired'), 'warning');
      return;
    }

    const noteInput = document.querySelector('.focus-compose-input');
    const input = noteInput?.value.trim() || this.currentTask?.title || '';
    if (!input) {
      uiShowToast(t('focus.aiEmpty'), 'warning');
      return;
    }

    this._aiMessages = [
      { role: 'system', content: this._aiSystemPrompt() },
      { role: 'user', content: input }
    ];
    this._aiOriginalInput = input;
    const ok = await this._aiCall();
    if (!ok) {

      document.querySelector('.ai-modal-overlay')?.remove();
    }
  }

  _ensureAiPanel() {
    let overlay = document.querySelector('.ai-modal-overlay');
    if (overlay) return overlay.querySelector('.ai-result');

    overlay = document.createElement('div');
    overlay.className = 'ai-modal-overlay';
    const panel = document.createElement('div');
    panel.className = 'ai-result';
    panel.innerHTML = `
      <div class="ai-result-header">
        <div class="ai-result-title-row">
          <svg class="ai-result-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 0C6 4 4 6 0 6C4 6 6 8 6 12C6 8 8 6 12 6C8 6 6 4 6 0Z"/><path d="M12 8C12 10 11 11 9 11C11 11 12 12 12 14C12 12 13 11 15 11C13 11 12 10 12 8Z"/></svg>
          <h3 class="ai-result-title">${escapeHtml(t('focus.aiResult'))}</h3>
        </div>
        <button class="ai-result-close" type="button">&times;</button>
      </div>
      <div class="ai-result-source">${escapeHtml(this._aiOriginalInput)}</div>
      <div class="ai-chat-area"></div>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    panel.querySelector('.ai-result-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    return panel;
  }

  async _aiCall() {
    const panel = this._ensureAiPanel();
    if (!panel) return;
    const chatArea = panel.querySelector('.ai-chat-area');

    const loadingEl = document.createElement('div');
    loadingEl.className = 'ai-chat-loading';
    loadingEl.textContent = t('focus.aiLoading');
    chatArea.appendChild(loadingEl);

    try {
      const result = await ai.chat(this._aiMessages, { temperature: 0.3 });
      const raw = result.content.trim();
      loadingEl.remove();

      if (raw.startsWith('ASK:')) {
        const question = raw.slice(4).trim();
        this._renderAiAsk(panel, question);
      } else {
        const content = raw.startsWith('TASKS:') ? raw.slice(6) : raw;
        const tasks = content.split('\n')
          .map(line => line.replace(/^[-*•]\s*/, '').trim())
          .filter(line => line.length > 0);
        if (tasks.length > 0) {
          this._renderAiTasks(panel, tasks);
        }
      }

      const rem = ai.remainingAdds();
      if (rem !== Infinity) {
        const hint = document.createElement('div');
        hint.className = 'ai-remaining-hint';
        hint.textContent = t('focus.aiDailyRemaining', { count: rem });
        panel.querySelector('.ai-chat-area').appendChild(hint);
      }
      return true;
    } catch (err) {
      loadingEl.remove();

      if (err.message.startsWith('daily_limit:')) {
        const limit = err.message.split(':')[1];
        uiShowToast(t('focus.aiLimitReached', { limit }), 'warning');
      } else if (err.message === 'ai_rate_limited') {
        uiShowToast(t('focus.aiRateLimited'), 'warning');
      } else {
        uiShowToast(t('focus.aiUnavailable'), 'error');
      }
      return false;
    }
  }

  _renderAiAsk(panel, question) {
    const chatArea = panel.querySelector('.ai-chat-area');

    const bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble ai-bubble';
    bubble.textContent = question;
    chatArea.appendChild(bubble);

    const row = document.createElement('div');
    row.className = 'ai-answer-row';
    row.innerHTML = `<input class="ai-answer-input" type="text" placeholder="${escapeHtml(t('focus.aiAnswerHint'))}" /><button class="ai-answer-send" type="button">${escapeHtml(t('focus.aiSend'))}</button>`;
    chatArea.appendChild(row);

    const inputEl = row.querySelector('.ai-answer-input');
    const sendBtn = row.querySelector('.ai-answer-send');

    const submit = async () => {
      const answer = inputEl.value.trim();
      if (!answer) return;

      row.remove();
      const userBubble = document.createElement('div');
      userBubble.className = 'ai-chat-bubble user-bubble';
      userBubble.textContent = answer;
      chatArea.appendChild(userBubble);

      this._aiMessages.push({ role: 'assistant', content: `ASK: ${question}` });
      this._aiMessages.push({ role: 'user', content: answer });

      const ok = await this._aiCall();
      if (!ok) {

        this._aiMessages.pop();
        this._aiMessages.pop();
        userBubble.remove();
        chatArea.appendChild(row);
        inputEl.focus();
      }
    };

    sendBtn.addEventListener('click', submit);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(); }
    });
    inputEl.focus();
  }

  _renderAiTasks(panel, tasks) {
    const chatArea = panel.querySelector('.ai-chat-area');
    const boards = this.cachedBoards || [];
    const defaultBoardId = this.currentTask?.board_id || '';
    const defaultPriority = this.currentTask?.priority || 'not-urgent-not-important';
    const boardOptions = [
      `<option value="">${escapeHtml(t('project.select'))}</option>`,
      ...boards.map(board => `<option value="${escapeHtml(board.id)}">${escapeHtml(board.name)}</option>`),
    ].join('');
    const priorityOptions = [
      ['urgent-important', t('priority.urgentImportant')],
      ['not-urgent-important', t('priority.notUrgentImportant')],
      ['urgent-not-important', t('priority.urgentNotImportant')],
      ['not-urgent-not-important', t('priority.notUrgentNotImportant')],
    ].map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('');
    const container = document.createElement('div');
    container.className = 'ai-task-list';
    container.innerHTML = tasks.map((task, i) => `
      <div class="ai-task-item" data-index="${i}">
        <div class="ai-task-main">
          <span class="ai-task-text">${escapeHtml(task)}</span>
          <div class="ai-task-meta">
            <select class="ai-task-board" aria-label="${escapeHtml(t('project.select'))}">${boardOptions}</select>
            <select class="ai-task-priority" aria-label="${escapeHtml(t('priority.label'))}">${priorityOptions}</select>
          </div>
        </div>
        <button class="ai-task-add" type="button" data-index="${i}">${escapeHtml(t('focus.aiAddTask'))}</button>
      </div>
    `).join('') + `<div class="ai-result-footer"><button class="ai-add-all" type="button">${escapeHtml(t('focus.aiAddAll'))}</button></div>`;
    chatArea.appendChild(container);
    container.querySelectorAll('.ai-task-board').forEach(select => { select.value = defaultBoardId; });
    container.querySelectorAll('.ai-task-priority').forEach(select => { select.value = defaultPriority; });

    const getTaskOptions = (item) => ({
      board_id: item.querySelector('.ai-task-board')?.value || null,
      priority: item.querySelector('.ai-task-priority')?.value || 'not-urgent-not-important',
    });
    const markTaskAdded = (item) => {
      item.classList.add('is-added');
      item.querySelector('.ai-task-add').disabled = true;
      item.querySelectorAll('select').forEach(select => { select.disabled = true; });
    };

    const disableAllAdds = () => {
      container.querySelectorAll('.ai-task-add:not(:disabled)').forEach(b => { b.disabled = true; });
      const allBtn = container.querySelector('.ai-add-all');
      if (allBtn) allBtn.disabled = true;
    };

    container.querySelectorAll('.ai-task-add').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.index);
        const title = tasks[idx];
        if (!title || btn.disabled) return;
        if (!ai.canAddTask()) {
          uiShowToast(t('focus.aiAddLimit', { limit: ai.FREE_ADD_LIMIT }), 'warning');
          disableAllAdds();
          return;
        }
        btn.disabled = true;
        const item = btn.closest('.ai-task-item');
        try {
          await this.taskManager.createTask({ title, ...getTaskOptions(item), status: 'todo' });
        } catch {
          btn.disabled = false;
          return;
        }
        btn.textContent = '✓';
        markTaskAdded(item);
        ai.incrementAddCount();
        uiShowToast(t('focus.aiAddedOne'), 'success');
        if (!ai.canAddTask()) disableAllAdds();
        this.refreshAllViews({ force: true });
        this.loadActivityLog();
      });
    });

    const addAllBtn = container.querySelector('.ai-add-all');
    addAllBtn.addEventListener('click', async () => {
      addAllBtn.disabled = true;
      const items = container.querySelectorAll('.ai-task-item:not(.is-added)');
      const remaining = ai.remainingAdds();
      let count = 0;
      for (const item of items) {
        if (count >= remaining) break;
        const idx = parseInt(item.dataset.index);
        const title = tasks[idx];
        if (!title) continue;
        await this.taskManager.createTask({ title, ...getTaskOptions(item), status: 'todo' });
        markTaskAdded(item);
        item.querySelector('.ai-task-add').textContent = '✓';
        count++;
      }
      if (count > 0) {
        ai.incrementAddCount(count);
        uiShowToast(t('focus.aiAddedAll', { count }), 'success');
        if (!ai.canAddTask()) disableAllAdds();
        this.refreshAllViews({ force: true });
        this.loadActivityLog();
      }
      if (remaining < items.length) {
        uiShowToast(t('focus.aiAddLimit', { limit: ai.FREE_ADD_LIMIT }), 'warning');
      }
    });
  }

  setupCustomDropdown() {
    const dropdown = document.getElementById('project-dropdown');
    if (!dropdown) return;

    const trigger = dropdown.querySelector('.custom-dropdown-trigger');
    const menu = dropdown.querySelector('.custom-dropdown-menu');
    const textEl = dropdown.querySelector('.custom-dropdown-text');
    dropdown.dataset.value = '';

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('is-open');
    });

    menu.addEventListener('click', (e) => {
      const option = e.target.closest('.custom-dropdown-option');
      if (!option) return;

      dropdown.dataset.value = option.dataset.value;
      textEl.textContent = option.textContent;

      menu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('is-selected'));
      option.classList.add('is-selected');

      dropdown.classList.remove('is-open');
      this.filterWorkViewTasks();
    });

    document.addEventListener('click', () => dropdown.classList.remove('is-open'));
  }

  filterWorkViewTasks() {
    const boardId = document.getElementById('project-dropdown')?.dataset.value || '';
    const keyword = document.querySelector('.search-input')?.value.trim().toLowerCase() || '';

    let tasks = this.cachedTasks || [];
    const boards = this.cachedBoards || [];

    if (boardId) tasks = tasks.filter(tk => tk.board_id === boardId);
    if (keyword) tasks = tasks.filter(tk => tk.title.toLowerCase().includes(keyword));

    this.renderWorkViewTaskList(tasks, boards);
  }

  loadActivityLog() {
    clearTimeout(this._activityLogDebounce);
    this._activityLogDebounce = setTimeout(() => this._doLoadActivityLog(), 100);
  }

  async _doLoadActivityLog() {
    const logList = document.querySelector('.activity-list.log-list');
    if (!logList) return;

    try {
      const logs = await database.getActivityLog(50);
      if (logs.length === 0) {
        logList.innerHTML = '<div class="empty-state"><p>' + t('focus.noRecords') + '</p></div>';
        return;
      }
      logList.innerHTML = logs.map(log => {
        const time = new Date(log.timestamp);
        const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = this.isToday(time) ? t('focus.today') : time.toLocaleDateString(getLang() === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
        return `<div class="activity-item"><span class="activity-time">${dateStr} ${timeStr}</span><span class="activity-content">${escapeHtml(log.content)}</span></div>`;
      }).join('');
    } catch {
      logList.innerHTML = '<div class="empty-state"><p>' + t('focus.loadFailed') + '</p></div>';
    }
  }

  isToday(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  }

  async showSummary() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      weekDates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    const [allTasks, logs] = await Promise.all([
      this.taskManager.getTasks(),
      database.getActivityLog(500),
    ]);

    const weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);
    const weekRecords = await database.getTimeRecords(weekStart, weekEnd);
    const todayRecords = weekRecords.filter(r => r.date === dateStr || (r.started_at && r.started_at.startsWith(dateStr)));

    const overlay = document.createElement('div');
    overlay.className = 'modal kairos-modal active';
    overlay.style.zIndex = '10000';

    const todayHTML = this._buildTodaySummaryHTML(todayRecords, allTasks, logs, dateStr);
    const weekHTML = this._buildWeekSummaryHTML(weekRecords, allTasks, weekDates);

    const h = escapeHtml;
    overlay.innerHTML = `<div class="modal-content" style="max-width:480px;">
      <div class="modal-header summary-header">
        <h2>${h(t('summary.heading'))}</h2>
        <div class="summary-header-right">
          <div class="summary-tabs">
            <button class="summary-tab active" data-tab="today">${h(t('summary.tabToday'))}</button>
            <button class="summary-tab" data-tab="week">${h(t('summary.tabWeek'))}</button>
          </div>
          <button class="summary-close" data-role="close" aria-label="Close">&times;</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="summary-pane active" data-pane="today">${todayHTML}</div>
        <div class="summary-pane" data-pane="week">${weekHTML}</div>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.summary-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.summary-tab').forEach(b => b.classList.remove('active'));
        overlay.querySelectorAll('.summary-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        overlay.querySelector(`[data-pane="${tab.dataset.tab}"]`).classList.add('active');
      });
    });

    const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('[data-role="close"]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  _fmtTime(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return (h > 0 ? t('summary.hours', { h }) : '') + t('summary.minutes', { m });
  }

  _buildTodaySummaryHTML(records, allTasks, logs, dateStr) {
    const locale = getLang() === 'zh' ? 'zh-CN' : 'en-US';
    const today = new Date();
    const h = escapeHtml;

    const focusRecords = records.filter(r => r.session_type === 'focus');
    const focusMinutes = focusRecords.reduce((s, r) => s + (r.duration_minutes || 0), 0);

    const completedToday = allTasks.filter(tk =>
      tk.status === 'done' && tk.completed_at && tk.completed_at.startsWith(dateStr)
    );
    const createdToday = allTasks.filter(tk =>
      tk.created_at && tk.created_at.startsWith(dateStr)
    );

    const taskTimeMap = {};
    for (const r of focusRecords) {
      if (!r.task_id) continue;
      taskTimeMap[r.task_id] = (taskTimeMap[r.task_id] || 0) + (r.duration_minutes || 0);
    }
    const taskIdToTitle = {};
    allTasks.forEach(tk => { taskIdToTitle[tk.id] = tk.title; });
    const taskTimeList = Object.entries(taskTimeMap)
      .map(([id, mins]) => ({ title: taskIdToTitle[id] || t('timer.personalFocus'), mins }))
      .sort((a, b) => b.mins - a.mins);

    const personalMins = focusRecords
      .filter(r => !r.task_id)
      .reduce((s, r) => s + (r.duration_minutes || 0), 0);

    let html = `<div class="summary-content">`;
    html += `<div class="summary-date">${today.toLocaleDateString(locale, { month: 'long', day: 'numeric', weekday: 'long' })}</div>`;

    html += `<div class="summary-stats">`;
    html += `<div class="summary-stat"><span class="summary-stat-num">${focusRecords.length}</span><span class="summary-stat-label">${h(t('stats.pomodoros'))}</span></div>`;
    html += `<div class="summary-stat"><span class="summary-stat-num">${this._fmtTime(focusMinutes)}</span><span class="summary-stat-label">${h(t('stats.focusTime'))}</span></div>`;
    html += `<div class="summary-stat"><span class="summary-stat-num">${completedToday.length}</span><span class="summary-stat-label">${h(t('summary.tasksCompleted'))}</span></div>`;
    html += `<div class="summary-stat"><span class="summary-stat-num">${createdToday.length}</span><span class="summary-stat-label">${h(t('summary.tasksCreated'))}</span></div>`;
    html += `</div>`;

    if (taskTimeList.length > 0 || personalMins > 0) {
      html += `<div class="summary-section"><div class="summary-section-title">${h(t('summary.focusBreakdown'))}</div>`;
      html += `<ul class="summary-list">`;
      for (const item of taskTimeList) {
        html += `<li><span class="summary-list-title">${h(item.title)}</span><span class="summary-list-value">${this._fmtTime(item.mins)}</span></li>`;
      }
      if (personalMins > 0) {
        html += `<li><span class="summary-list-title">${h(t('timer.personalFocus'))}</span><span class="summary-list-value">${this._fmtTime(personalMins)}</span></li>`;
      }
      html += `</ul></div>`;
    }

    if (completedToday.length > 0) {
      html += `<div class="summary-section"><div class="summary-section-title">${h(t('summary.completedList'))}</div>`;
      html += `<ul class="summary-list compact">`;
      for (const tk of completedToday) {
        html += `<li><span class="summary-check">✓</span> ${h(tk.title)}</li>`;
      }
      html += `</ul></div>`;
    }

    if (focusRecords.length === 0 && completedToday.length === 0 && createdToday.length === 0) {
      html += `<div class="summary-empty">${h(t('summary.noActivity'))}</div>`;
    }

    html += `</div>`;
    return html;
  }

  _buildWeekSummaryHTML(weekRecords, allTasks, weekDates) {
    const h = escapeHtml;
    const weekdayNames = t('summary.weekdays').split(',');

    const focusRecords = weekRecords.filter(r => r.session_type === 'focus');
    const totalPomodoros = focusRecords.length;
    const totalMinutes = focusRecords.reduce((s, r) => s + (r.duration_minutes || 0), 0);

    const weekCompleted = allTasks.filter(tk => {
      if (tk.status !== 'done' || !tk.completed_at) return false;
      const d = tk.completed_at.slice(0, 10);
      return d >= weekDates[0] && d <= weekDates[6];
    });

    const dailyData = weekDates.map(dateStr => {
      const dayRecords = focusRecords.filter(r => r.date === dateStr || (r.started_at && r.started_at.startsWith(dateStr)));
      const mins = dayRecords.reduce((s, r) => s + (r.duration_minutes || 0), 0);
      return { dateStr, mins };
    });
    const maxMins = Math.max(...dailyData.map(d => d.mins), 1);

    let html = `<div class="summary-content">`;

    const rangeStart = new Date(weekDates[0]);
    const rangeEnd = new Date(weekDates[6]);
    const locale = getLang() === 'zh' ? 'zh-CN' : 'en-US';
    const fmtShort = (d) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    html += `<div class="summary-date">${fmtShort(rangeStart)} – ${fmtShort(rangeEnd)}</div>`;

    html += `<div class="summary-stats cols-3">`;
    html += `<div class="summary-stat"><span class="summary-stat-num">${totalPomodoros}</span><span class="summary-stat-label">${h(t('summary.weekPomodoros'))}</span></div>`;
    html += `<div class="summary-stat"><span class="summary-stat-num">${this._fmtTime(totalMinutes)}</span><span class="summary-stat-label">${h(t('summary.weekFocusTime'))}</span></div>`;
    html += `<div class="summary-stat"><span class="summary-stat-num">${weekCompleted.length}</span><span class="summary-stat-label">${h(t('summary.weekCompleted'))}</span></div>`;
    html += `</div>`;

    html += `<div class="summary-section"><div class="summary-section-title">${h(t('summary.focusBreakdown'))}</div>`;
    html += `<div class="summary-bar-chart">`;
    for (const day of dailyData) {
      const d = new Date(day.dateStr);
      const wd = weekdayNames[d.getDay()];
      const dayNum = `${d.getMonth() + 1}/${d.getDate()}`;
      const pct = day.mins > 0 ? Math.max(Math.round((day.mins / maxMins) * 100), 6) : 0;
      const val = day.mins > 0 ? `${day.mins}m` : '';
      html += `<div class="summary-bar-col">
        <span class="summary-bar-val">${val}</span>
        <div class="summary-bar-track"><div class="summary-bar-fill${day.mins === 0 ? ' empty' : ''}" style="height:${pct}%"></div></div>
        <span class="summary-bar-label">${h(wd)}</span>
        <span class="summary-bar-date">${dayNum}</span>
      </div>`;
    }
    html += `</div></div>`;

    if (weekCompleted.length > 0) {
      html += `<div class="summary-section"><div class="summary-section-title">${h(t('summary.completedList'))}</div>`;
      html += `<ul class="summary-list compact">`;
      for (const tk of weekCompleted) {
        html += `<li><span class="summary-check">✓</span> ${h(tk.title)}</li>`;
      }
      html += `</ul></div>`;
    }

    if (totalPomodoros === 0 && weekCompleted.length === 0) {
      html += `<div class="summary-empty">${h(t('summary.weekNoActivity'))}</div>`;
    }

    html += `</div>`;
    return html;
  }

  setupActivityPanelToggle() {
    const toggleBtn = document.getElementById('activity-panel-toggle');
    const backdrop = document.getElementById('activity-panel-backdrop');
    const layout = document.querySelector('#work-view .three-column-layout');
    if (!toggleBtn || !backdrop || !layout) return;

    toggleBtn.addEventListener('click', () => {
      if (!window.matchMedia(this.activityPanelMediaQuery).matches) return;
      this.setActivityPanelOpen(!this.isActivityPanelOpen);
    });

    backdrop.addEventListener('click', () => this.setActivityPanelOpen(false));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.setActivityPanelOpen(false);
    });

    window.addEventListener('langchange', () => this.updateActivityPanelToggleLabel());
    this.updateActivityPanelToggleLabel();
  }

  setActivityPanelOpen(open) {
    const layout = document.querySelector('#work-view .three-column-layout');
    const backdrop = document.getElementById('activity-panel-backdrop');
    const toggleBtn = document.getElementById('activity-panel-toggle');
    if (!layout || !backdrop || !toggleBtn) return;

    const canOpen = window.matchMedia(this.activityPanelMediaQuery).matches;
    this.isActivityPanelOpen = !!open && canOpen;

    layout.classList.toggle('is-right-panel-open', this.isActivityPanelOpen);
    backdrop.classList.toggle('is-visible', this.isActivityPanelOpen);
    toggleBtn.setAttribute('aria-expanded', this.isActivityPanelOpen ? 'true' : 'false');
    this.updateActivityPanelToggleLabel();
  }

  updateActivityPanelToggleLabel() {
    const toggleBtn = document.getElementById('activity-panel-toggle');
    if (!toggleBtn) return;
    toggleBtn.textContent = this.isActivityPanelOpen ? t('focus.hideNotes') : t('focus.showNotes');
  }

  handleResponsiveLayout() {
    if (!window.matchMedia(this.activityPanelMediaQuery).matches) {
      this.setActivityPanelOpen(false);
    }

    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {

      if (this.currentView === 'task' && this.cachedTasks) {
        const tasks = this.cachedTasks;
        const boards = this.cachedBoards;
        const activeSubview = document.querySelector('.task-subview.active');
        if (activeSubview) {
          if (activeSubview.id === 'task-matrix-view') {
            this.renderTaskMatrixViewNY(tasks);
          } else if (activeSubview.id === 'task-kanban-view') {
            this.renderTaskKanbanViewNY(tasks);
          } else if (activeSubview.id === 'task-project-view') {
            this.renderProjectViewNY(tasks, boards);
          }
        }
      }
    }, 250);
  }

  setupUserMenu() {
    const container = document.querySelector('.user-center-container');
    const userDropdown = document.getElementById('user-dropdown');

    if (container && userDropdown) {
      container.addEventListener('mouseenter', () => {
        userDropdown.classList.add('show');
      });
      container.addEventListener('mouseleave', () => {
        userDropdown.classList.remove('show');
      });
    }

    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach((item) => {
      item.addEventListener('click', async () => {
        const action = item.dataset.action;
        if (action === 'summary') {
          this.showSummary();
        } else if (action === 'profile') {
          this.showView('user-profile');

        }
      });
    });
  }

  setupViewSwitcher() {
    const viewBtns = document.querySelectorAll('.view-switcher-btn');
    viewBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;

        if (view === 'task') {
          e.stopPropagation();
          this.toggleTaskDropdown();
        }

        this.showView(view);
      });
    });

    this.setupTaskViewDropdown();
  }

  setupTaskViewDropdown() {
    const taskDropdown = document.querySelector('.task-view-dropdown');
    const taskDropdownItems = document.querySelectorAll('.task-dropdown-item');

    taskDropdownItems.forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskView = item.dataset.taskView;
        await this.switchTaskSubView(taskView);

        taskDropdownItems.forEach((i) => i.classList.remove('active'));
        item.classList.add('active');

        this.closeTaskDropdown();
      });
    });

    document.addEventListener('click', (e) => {
      const taskNavWrapper = document.querySelector('.nav-tab-wrapper.has-dropdown');
      if (taskNavWrapper && !taskNavWrapper.contains(e.target)) {
        this.closeTaskDropdown();
      }
    });
  }

  toggleTaskDropdown() {
    const taskNavWrapper = document.querySelector('.nav-tab-wrapper.has-dropdown');
    const taskNavBtn = document.querySelector('.task-nav-btn');

    if (taskNavWrapper && taskNavBtn) {
      const isExpanded = taskNavBtn.getAttribute('aria-expanded') === 'true';
      taskNavBtn.setAttribute('aria-expanded', !isExpanded);
      taskNavWrapper.classList.toggle('is-open', !isExpanded);
    }
  }

  closeTaskDropdown() {
    const taskNavWrapper = document.querySelector('.nav-tab-wrapper.has-dropdown');
    const taskNavBtn = document.querySelector('.task-nav-btn');

    if (taskNavWrapper && taskNavBtn) {
      taskNavBtn.setAttribute('aria-expanded', 'false');
      taskNavWrapper.classList.remove('is-open');
    }
  }

  setupTaskQuotes() {
    this.taskQuoteIndex = Math.floor(Math.random() * this.taskQuotes.length);
    this.updateTaskQuote({ animate: false });
  }

  showTaskIdleState() {
    const taskIdleState = document.querySelector('.task-idle-state');
    if (!taskIdleState) return;

    taskIdleState.hidden = false;
    this.startTaskQuoteRotation();
  }

  hideTaskIdleState() {
    const taskIdleState = document.querySelector('.task-idle-state');
    if (taskIdleState) taskIdleState.hidden = true;
    this.stopTaskQuoteRotation();
  }

  startTaskQuoteRotation() {
    if (this.taskQuoteTimer) return;
    this.taskQuoteTimer = window.setInterval(() => {
      this.updateTaskQuote({ animate: true });
    }, 8000);
  }

  stopTaskQuoteRotation() {
    if (!this.taskQuoteTimer) return;
    window.clearInterval(this.taskQuoteTimer);
    this.taskQuoteTimer = null;
  }

  updateTaskQuote({ animate } = { animate: true }) {
    const quoteBox = document.querySelector('.task-quote');
    const quoteText = document.querySelector('.task-quote blockquote');
    const quoteAuthor = document.querySelector('.task-quote-author');
    if (!quoteBox || !quoteText || !quoteAuthor) return;

    const quote = this.taskQuotes[this.taskQuoteIndex % this.taskQuotes.length];
    this.taskQuoteIndex = (this.taskQuoteIndex + 1) % this.taskQuotes.length;

    const applyQuote = () => {
      quoteText.textContent = quote.text;
      quoteAuthor.textContent = quote.author;
      quoteBox.classList.remove('is-changing');
    };

    if (!animate) {
      applyQuote();
      return;
    }

    quoteBox.classList.add('is-changing');
    window.setTimeout(applyQuote, 180);
  }

  async switchTaskSubView(viewName) {
    this.hideTaskIdleState();

    const taskSubViews = document.querySelectorAll('.task-subview');
    taskSubViews.forEach((view) => {
      view.classList.remove('active');
      view.hidden = true;
    });

    const targetView = document.getElementById(`task-${viewName}-view`);
    if (targetView) {
      targetView.classList.add('active');
      targetView.hidden = false;

      await this.renderTaskSubView(viewName);
    }
  }

  async renderTaskSubView(viewName) {
    try {

      let tasks = this.cachedTasks;
      let boards = this.cachedBoards;
      if (!tasks || !boards) {
        [tasks, boards] = await Promise.all([
          tasks || this.taskManager.getTasks(),
          boards || this.boardManager.getBoards(),
        ]);
        this.cachedTasks = tasks;
        this.cachedBoards = boards;
      }

      switch (viewName) {
        case 'project':
          this.renderProjectViewNY(tasks, boards);
          break;
        case 'kanban':
          this.renderTaskKanbanViewNY(tasks);
          break;
        case 'matrix':
          this.renderTaskMatrixViewNY(tasks);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('[app] renderTaskView failed:', e);
    }
  }

  showView(viewName) {
    const allViews = document.querySelectorAll('.main-view');
    allViews.forEach((view) => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
      targetView.classList.add('active');
      this.currentView = viewName;
    }
    if (viewName !== 'work') this.setActivityPanelOpen(false);

    if (viewName === 'task') {
      const activeSubview = document.querySelector('.task-subview.active');
      if (activeSubview) this.hideTaskIdleState();
      else this.showTaskIdleState();
    } else {
      this.hideTaskIdleState();
    }

    const viewBtns = document.querySelectorAll('.view-switcher-btn');
    viewBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    if (viewName === 'user-profile') {
      this.heatmapManager.setupYearSelector();
      this.heatmapManager.renderHeatmap(this.heatmapManager.currentYear);
      this.heatmapManager.updateStats();
    }

    if (this._viewsDirty && this.cachedTasks) {
      this._viewsDirty = false;
      if (viewName === 'project') {
        this.renderProjectView(this.cachedBoards);
      } else if (viewName === 'task') {
        const activeSubview = document.querySelector('.task-subview.active');
        if (activeSubview) {
          if (activeSubview.id === 'task-matrix-view') this.renderTaskMatrixView(this.cachedTasks);
          else if (activeSubview.id === 'task-kanban-view') this.renderTaskKanbanView(this.cachedTasks);
          else if (activeSubview.id === 'task-project-view') this.renderTaskProjectView(this.cachedTasks, this.cachedBoards);
        }
      }
    }
  }

  setupSettings() {

    const focusDurationInput = document.getElementById('setting-focus-duration');
    if (focusDurationInput) {
      focusDurationInput.addEventListener('change', (e) => {
        const minutes = parseInt(e.target.value);
        if (minutes > 0) {
          this.timerManager.setDuration(minutes);
          database.setSetting('focusDuration', minutes);
        }
      });
    }

    const shortBreakInput = document.getElementById('setting-short-break');
    if (shortBreakInput) {
      shortBreakInput.addEventListener('change', (e) => {
        const minutes = parseInt(e.target.value);
        if (minutes > 0) {
          this.timerManager.breakDuration = minutes * 60;
          database.setSetting('shortBreak', minutes);
        }
      });
    }

    const longBreakInput = document.getElementById('setting-long-break');
    if (longBreakInput) {
      longBreakInput.addEventListener('change', (e) => {
        const minutes = parseInt(e.target.value);
        if (minutes > 0) {
          this.timerManager.longBreakDuration = minutes * 60;
          database.setSetting('longBreak', minutes);
        }
      });
    }

    const notificationToggle = document.getElementById('setting-notification');
    if (notificationToggle) {
      notificationToggle.addEventListener('change', (e) => {
        database.setSetting('notificationEnabled', e.target.checked);
      });
    }

    const soundToggle = document.getElementById('setting-sound');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        notificationManager.setSoundEnabled(e.target.checked);
        database.setSetting('soundEnabled', e.target.checked);
      });
    }

    const themeDropdown = document.getElementById('setting-theme');
    if (themeDropdown) {
      const trigger = themeDropdown.querySelector('.settings-dropdown-trigger');
      const textEl = themeDropdown.querySelector('.settings-dropdown-text');
      const options = themeDropdown.querySelectorAll('.settings-dropdown-option');

      trigger.addEventListener('click', () => {
        themeDropdown.classList.toggle('is-open');
      });

      options.forEach((opt) => {
        opt.addEventListener('click', () => {
          const value = opt.dataset.value;
          themeDropdown.dataset.value = value;
          textEl.textContent = opt.textContent;
          options.forEach((o) => o.classList.remove('is-selected'));
          opt.classList.add('is-selected');
          themeDropdown.classList.remove('is-open');
          this.applyTheme(value);
          database.setSetting('theme', value);
        });
      });

      document.addEventListener('click', (e) => {
        if (!themeDropdown.contains(e.target)) {
          themeDropdown.classList.remove('is-open');
        }
      });
    }

    const saveAiBtn = document.getElementById('btn-save-ai-config');
    if (saveAiBtn) {
      saveAiBtn.addEventListener('click', async () => {
        const base_url = document.getElementById('setting-ai-base-url').value.trim();
        const model = document.getElementById('setting-ai-model').value.trim();
        const api_key = document.getElementById('setting-ai-key').value.trim();
        const statusEl = document.getElementById('ai-key-status');
        try {
          ai.saveConfig({ base_url: base_url || '', model: model || '', api_key });
          document.getElementById('setting-ai-key').value = '';
          if (statusEl) statusEl.textContent = t(api_key ? 'settings.aiConfigSaved' : 'settings.aiConfigCleared');
        } catch (err) {
          if (statusEl) statusEl.textContent = t('settings.aiKeySaveFailed');
        }
      });
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const logo = document.querySelector('.logo-img');
    if (logo) logo.src = theme === 'dark' ? '/images/logo-dark.svg' : '/images/logo.svg';
  }

  async loadSettings() {
    try {
      const settings = await database.getAllSettings();

      if (settings.focusDuration) {
        this.timerManager.setDuration(settings.focusDuration);
        const input = document.getElementById('setting-focus-duration');
        if (input) input.value = settings.focusDuration;
      }

      if (settings.shortBreak) {
        this.timerManager.breakDuration = settings.shortBreak * 60;
        const input = document.getElementById('setting-short-break');
        if (input) input.value = settings.shortBreak;
      }

      if (settings.longBreak) {
        this.timerManager.longBreakDuration = settings.longBreak * 60;
        const input = document.getElementById('setting-long-break');
        if (input) input.value = settings.longBreak;
      }

      if (settings.soundEnabled !== undefined) {
        notificationManager.setSoundEnabled(settings.soundEnabled);
        const toggle = document.getElementById('setting-sound');
        if (toggle) toggle.checked = settings.soundEnabled;
      }

      if (settings.theme) {
        this.applyTheme(settings.theme);
        const dropdown = document.getElementById('setting-theme');
        if (dropdown) {
          dropdown.dataset.value = settings.theme;
          const opt = dropdown.querySelector(`.settings-dropdown-option[data-value="${settings.theme}"]`);
          if (opt) {
            dropdown.querySelectorAll('.settings-dropdown-option').forEach((o) => o.classList.remove('is-selected'));
            opt.classList.add('is-selected');
            const textEl = dropdown.querySelector('.settings-dropdown-text');
            if (textEl) textEl.textContent = opt.textContent;
          }
        }
      }

    } catch (e) {
      console.error('[app] loadSettings failed:', e);
    }

    try {
      const config = ai.getConfig();
      const urlInput = document.getElementById('setting-ai-base-url');
      if (urlInput) urlInput.value = config.base_url || '';
      const modelInput = document.getElementById('setting-ai-model');
      if (modelInput) modelInput.value = config.model || '';
      const statusEl = document.getElementById('ai-key-status');
      if (statusEl) statusEl.textContent = config.has_key ? t('settings.aiKeyConfigured') : '';
    } catch {

    }
  }

  async loadInitialData() {
    try {

      const [boards, tasks] = await Promise.all([
        this.boardManager.getBoards(),
        this.taskManager.getTasks(),
      ]);

      // 直接赋值缓存，避免 refreshAllViews 再请求一遍
      this.cachedBoards = boards;
      this.cachedTasks = tasks;

      this.refreshAllViews();

      this.loadActivityLog();
    } catch (e) {
      console.error('[app] loadInitialData failed:', e);
    }
  }

  updateTimerDisplay() {
    const display = document.querySelector('.timer-display');
    if (display) {
      display.textContent = this.timerManager.getFormattedTime();
    }

    const ringProgress = document.querySelector('.ring-progress');
    const ringBloom = document.querySelector('.ring-bloom');
    if (ringProgress) {
      const progress = this.timerManager.getProgress();
      const circumference = 691.15;
      const offset = circumference * (1 - progress / 100);
      ringProgress.style.strokeDashoffset = offset;
      if (ringBloom) ringBloom.style.strokeDashoffset = offset;
    }

    const label = document.querySelector('.timer-session-label');
    if (label) {
      label.textContent = this.timerManager.getSessionTypeText();
    }

    this.updateSessionDots();
  }

  updateSessionDots() {
    const dots = document.querySelectorAll('.session-dot');
    if (!dots.length) return;
    const count = this.timerManager.sessionCount;
    const currentSession = this.timerManager.currentSession;
    dots.forEach((dot, i) => {
      dot.classList.remove('completed', 'active');
      if (i < count % 4) {
        dot.classList.add('completed');
      } else if (i === count % 4 && currentSession === 'focus') {
        dot.classList.add('active');
      }
    });
  }

  updateStartPauseButton() {
    const btn = document.getElementById('start-pause-btn');
    if (!btn) return;

    if (this.timerManager.isRunning) {
      btn.textContent = t('timer.pause');
      btn.title = t('timer.pause');
      btn.classList.add('is-paused');
    } else {
      btn.textContent = t('timer.startFocus');
      btn.title = t('timer.startFocus');
      btn.classList.remove('is-paused');
    }
  }

  updateMiniDisplay() {
    this.miniTimer?.update();
  }

  updateTimerStatus(message) {
    const statusEl = document.querySelector('.timer-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  refreshAllViews(options = {}) {
    const { force = false } = options;
    if (force) this._refreshForceQueued = true;

    clearTimeout(this._refreshDebounce);
    this._refreshDebounce = setTimeout(() => this._doRefreshAllViews(), 100);
  }

  async _doRefreshAllViews() {

    if (this._refreshPending) {
      this._refreshQueued = true;
      return;
    }

    const forceRefresh = this._refreshForceQueued;
    this._refreshForceQueued = false;
    this._refreshPending = true;

    try {
      const [boards, tasks] = await Promise.all([
        this.boardManager.getBoards({ forceRefresh }),
        this.taskManager.getTasks(null, { forceRefresh }),
      ]);
      this.cachedTasks = tasks;
      this.cachedBoards = boards;

      this.renderWorkViewTaskList(tasks, boards);
      this.updateProjectFilter(boards);
      this.updateActivityPanelToggleLabel();

      if (this.currentView === 'project') {
        this.renderProjectView(boards);
      } else if (this.currentView === 'task') {
        const activeSubview = document.querySelector('.task-subview.active');
        if (activeSubview) {
          if (activeSubview.id === 'task-matrix-view') this.renderTaskMatrixView(tasks);
          else if (activeSubview.id === 'task-kanban-view') this.renderTaskKanbanView(tasks);
          else if (activeSubview.id === 'task-project-view') this.renderTaskProjectView(tasks, boards);
        }
      }

      this._viewsDirty = true;
    } finally {
      this._refreshPending = false;
      if (this._refreshQueued) {
        this._refreshQueued = false;
        this._doRefreshAllViews();
      }
    }
  }

  renderWorkViewTaskList(tasks, boards) {
    const taskList = document.querySelector('.left-panel .task-list');
    if (!taskList) return;

    if (tasks.length === 0) {
      taskList.innerHTML = `
        <div class="empty-state">
          <p>${t('task.noTasks')}</p>
          <p class="hint">${t('task.noTasksHint')}</p>
        </div>
      `;
      return;
    }

    const activeTasks = tasks.filter(tk => tk.status !== 'done');

    if (activeTasks.length === 0) {
      taskList.innerHTML = `
        <div class="empty-state">
          <p>${t('task.noTasks')}</p>
          <p class="hint">${t('task.noTasksHint')}</p>
        </div>
      `;
      return;
    }

    const priorityOrder = {
      'urgent-important': 0,
      'not-urgent-important': 1,
      'urgent-not-important': 2,
      'not-urgent-not-important': 3,
    };
    const sorted = [...activeTasks].sort((a, b) => {
      return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
    });

    const boardNameById = new Map(boards.map((board) => [board.id, board.name]));
    this._workViewTaskMap = new Map(sorted.map((task) => [task.id, task]));

    taskList.innerHTML = sorted.map(task => {
      const boardName = boardNameById.get(task.board_id);
      const isDone = task.status === 'done';
      return `
        <div class="task-item ${isDone ? 'is-done' : ''}" data-task-id="${task.id}" data-priority="${task.priority || 'not-urgent-not-important'}">
          <div class="task-content">
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${boardName ? `<div class="task-project">${escapeHtml(boardName)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // 点击选中任务（事件委托，避免每次重渲染重复绑定）
    if (!this._workTaskListBound) {
      taskList.addEventListener('click', (e) => {
        const item = e.target.closest('.task-item');
        if (!item || !taskList.contains(item)) return;

        const taskId = item.dataset.taskId;
        const task = this._workViewTaskMap?.get(taskId);
        if (!task) return;

        this.taskManager.selectTask(task);
        taskList.querySelectorAll('.task-item.selected').forEach((el) => el.classList.remove('selected'));
        item.classList.add('selected');

        const leftPanel = document.querySelector('.left-panel');
        if (leftPanel && window.innerWidth <= 768) {
          leftPanel.classList.remove('mobile-tasks-open');
        }
      });
      this._workTaskListBound = true;
    }
  }

  renderProjectView(boards) {
    const overview = document.querySelector('#project-view .project-overview');
    if (!overview) return;

    if (boards.length === 0) {
      overview.innerHTML = `
        <div class="project-empty-state">
          <div class="empty-line"></div>
          <p class="empty-title">${t('project.noProjects')}</p>
          <p class="empty-hint">${t('project.noProjectsHint')}</p>
          <button class="empty-create-btn" type="button" data-action="create-project">${t('project.createNew')}</button>
        </div>
      `;
      return;
    }

    const starredBoards = boards.filter(b => b.is_starred);
    const otherBoards = boards.filter(b => !b.is_starred);
    const boardStats = this.buildBoardStats(this.cachedTasks || []);

    overview.innerHTML = `
      ${starredBoards.length > 0 ? `
        <section class="starred-boards">
          <h2 class="section-title">${t('project.starred')}</h2>
          <div class="boards-grid starred">${starredBoards.map(board => this.renderBoardCard(board, boardStats)).join('')}</div>
        </section>
      ` : ''}
      <section class="all-boards">
        <h2 class="section-title">${t('project.all')}</h2>
        <div class="boards-grid">
          ${(otherBoards.length > 0 ? otherBoards : boards).map(board => this.renderBoardCard(board, boardStats)).join('')}
          <button class="board-card-new" type="button" data-action="create-project">
            <span class="new-card-icon">+</span>
            <span class="new-card-text">${t('project.createNew')}</span>
          </button>
        </div>
      </section>
    `;

    document.querySelectorAll('.board-card').forEach(card => {
      const boardId = card.dataset.boardId;

      card.addEventListener('click', async (e) => {
        if (e.target.closest('.board-star') || e.target.closest('.board-delete')) return;
        this.showView('task');
        await this.switchTaskSubView('project');

        const col = document.querySelector(`.kanban-column-ny[data-board-id="${boardId}"]`);
        if (col) col.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      });

      card.querySelector('.board-star')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.boardManager.toggleStar(boardId);
        this.refreshAllViews();
      });

      card.querySelector('.board-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const board = boards.find(b => b.id === boardId);
        if (!board) return;
        this.showDeleteBoardConfirm(board);
      });

      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const board = boards.find(b => b.id === boardId);
        if (!board) return;
        const nameEl = card.querySelector('.board-name');
        if (!nameEl || nameEl.contentEditable === 'true') return;
        const origName = board.name;
        nameEl.contentEditable = 'true';
        nameEl.focus();

        const range = document.createRange();
        range.selectNodeContents(nameEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const commit = async () => {
          nameEl.contentEditable = 'false';
          const newName = nameEl.textContent.trim();
          if (newName && newName !== origName) {
            await this.boardManager.updateBoard(boardId, { name: newName });
            this.refreshAllViews();
          } else {
            nameEl.textContent = origName;
          }
        };
        nameEl.addEventListener('blur', commit, { once: true });
        nameEl.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter') { ke.preventDefault(); nameEl.blur(); }
          if (ke.key === 'Escape') { nameEl.textContent = origName; nameEl.blur(); }
        });
      });
    });
  }

  buildBoardStats(tasks) {
    const stats = new Map();
    tasks.forEach((task) => {
      if (!task.board_id) return;
      const item = stats.get(task.board_id) || { taskCount: 0, doneCount: 0 };
      item.taskCount += 1;
      if (task.status === 'done') item.doneCount += 1;
      stats.set(task.board_id, item);
    });
    return stats;
  }

  renderBoardCard(board, boardStats = new Map()) {
    const stats = boardStats.get(board.id) || { taskCount: 0, doneCount: 0 };
    const { taskCount, doneCount } = stats;
    return `
      <div class="board-card ${board.is_starred ? 'starred' : ''}" data-board-id="${board.id}">
        <div class="board-card-top">
          <h3 class="board-name">${escapeHtml(board.name)}</h3>
        </div>
        ${board.description ? `<p class="board-desc">${escapeHtml(board.description)}</p>` : ''}
        <div class="board-card-footer">
          <button class="board-star ${board.is_starred ? 'active' : ''}" title="${t('project.toggleStar')}">${board.is_starred ? '★' : '☆'}</button>
          <span class="board-task-count">${doneCount > 0 ? t('project.taskCountDone', { count: taskCount, done: doneCount }) : t('project.taskCount', { count: taskCount })}</span>
          <button class="board-delete" title="${t('project.deleteProject')}">✕</button>
        </div>
      </div>
    `;
  }

  renderTaskProjectView(tasks, boards) {
    this.renderProjectViewNY(tasks, boards);
  }

  renderTaskKanbanView(tasks) {
    this.renderTaskKanbanViewNY(tasks);
  }

  renderTaskMatrixView(tasks) {
    this.renderTaskMatrixViewNY(tasks);
  }

  renderTaskCard(task) {
    return this.renderShardTask(task);
  }

  renderShardTask(task, options = {}) {
    const { showQuickActions = true, context = 'default' } = options;

    const priorityMap = {
      'urgent-important': { class: 'priority-q1', label: t('priority.short.urgentImportant') },
      'not-urgent-important': { class: 'priority-q2', label: t('priority.short.notUrgentImportant') },
      'urgent-not-important': { class: 'priority-q3', label: t('priority.short.urgentNotImportant') },
      'not-urgent-not-important': { class: 'priority-q4', label: t('priority.short.notUrgentNotImportant') }
    };

    const statusMap = {
      'todo': { class: 'status-todo', label: t('status.todo') },
      'doing': { class: 'status-doing', label: t('status.doing') },
      'review': { class: 'status-review', label: t('status.review') },
      'done': { class: 'status-done', label: t('status.done') }
    };

    const priority = priorityMap[task.priority] || priorityMap['not-urgent-not-important'];
    const status = statusMap[task.status] || statusMap['todo'];
    const isDone = task.status === 'done';

    const truncatedDesc = task.description
      ? escapeHtml(task.description).substring(0, 60) + (task.description.length > 60 ? '...' : '')
      : '';

    const isMatrix = context === 'matrix';
    const isKanban = context === 'kanban';
    const isProject = context === 'project';

    const metaTags = [];
    if (!isMatrix) {

      if (!isKanban && !isProject) {
        metaTags.push(`<span class="glaze-tag ${status.class}">${status.label}</span>`);
      }

      if (isKanban && task.board_id) {
        const boardName = this.cachedBoards?.find(b => b.id === task.board_id)?.name;
        if (boardName) metaTags.push(`<span class="meta-item meta-board">${escapeHtml(boardName)}</span>`);
      }
      if (task.due_date) metaTags.push(`<span class="meta-item">${this.formatDueDate(task.due_date)}</span>`);
    }

    const priorityColors = {
      'urgent-important': '#9B6356',
      'not-urgent-important': '#5B7A9E',
      'urgent-not-important': '#A8845C',
      'not-urgent-not-important': '#B0ADA8',
    };
    const titleColor = priorityColors[task.priority] || '';
    const titleStyle = titleColor ? ` style="color:${titleColor}"` : '';

    return `
      <article class="shard-task ${isDone ? 'is-done' : ''}"
               data-task-id="${task.id}"
               data-priority="${task.priority || 'not-urgent-not-important'}"
               draggable="true"
               tabindex="0"
               role="article"
               aria-label="${escapeHtml(task.title)}">
        <h4 class="shard-title"${titleStyle}>${escapeHtml(task.title)}</h4>
        ${!isMatrix && truncatedDesc ? `<p class="shard-description">${truncatedDesc}</p>` : ''}
        ${metaTags.length ? `<div class="shard-meta">${metaTags.join('')}</div>` : ''}
        ${showQuickActions ? `
          <div class="shard-actions">
            <button class="shard-action-btn" data-action="start" title="${t('timer.startFocus')}">▶</button>
            <button class="shard-action-btn" data-action="done" title="${t('task.completed')}">✓</button>
          </div>
        ` : ''}
      </article>
    `;
  }

  renderTaskMatrixViewNY(tasks) {
    const container = document.querySelector('#task-matrix-view .task-subview-content');
    if (!container) return;

    const quadrants = [
      { key: 'not-urgent-important', class: 'q2-not-urgent-important', title: t('matrix.q2.title'), subtitle: t('matrix.q2.subtitle') },
      { key: 'urgent-important', class: 'q1-urgent-important', title: t('matrix.q1.title'), subtitle: t('matrix.q1.subtitle') },
      { key: 'not-urgent-not-important', class: 'q4-not-urgent-not-important', title: t('matrix.q4.title'), subtitle: t('matrix.q4.subtitle') },
      { key: 'urgent-not-important', class: 'q3-urgent-not-important', title: t('matrix.q3.title'), subtitle: t('matrix.q3.subtitle') },
    ];

    const isMobile = window.innerWidth <= 768;

    container.innerHTML = `
      <div class="matrix-grid-ny" role="grid" aria-label="${t('matrix.title')}">
        ${quadrants.map((q, index) => {
          const qTasks = tasks.filter(tk => tk.priority === q.key && tk.status !== 'done');
          const isExpanded = index === 0;

          return `
            <section class="matrix-quadrant-ny ${q.class} ${isMobile ? (isExpanded ? 'is-expanded' : 'is-collapsed') : ''}"
                     data-priority="${q.key}"
                     role="region"
                     aria-label="${q.title}">
              <header class="quadrant-header-ny" ${isMobile ? 'role="button" tabindex="0" aria-expanded="' + isExpanded + '"' : ''}>
                <div class="quadrant-title-group">
                  <h3 class="quadrant-title-ny">${q.title}</h3>
                  <p class="quadrant-subtitle-ny">${q.subtitle}</p>
                </div>
                <span class="quadrant-count-ny" aria-label="${qTasks.length} 个任务">${qTasks.length}</span>
                ${isMobile ? '<span class="accordion-toggle" aria-hidden="true"></span>' : ''}
              </header>

              <div class="quadrant-tasks-ny" role="list">
                ${qTasks.length > 0
                  ? qTasks.map(task => this.renderShardTask(task, {
                      showQuickActions: true,
                      context: 'matrix'
                    })).join('')
                  : `<div class="quadrant-empty-ny" role="listitem">
                       <span>${t('matrix.noTasks')}</span>
                       <span>${t('task.dragHere')}</span>
                     </div>`
                }
              </div>

              <button class="matrix-add-task-ny" data-priority="${q.key}" aria-label="${t('matrix.addTaskIn', { title: q.title })}">
                <span aria-hidden="true">+</span> ${t('task.addTask')}
              </button>
            </section>
          `;
        }).join('')}
      </div>
    `;

    this.bindMatrixViewEvents(container);

    if (isMobile) {
      this.bindAccordionEvents(container);
    }
  }

  renderTaskKanbanViewNY(tasks) {
    const container = document.querySelector('#task-kanban-view .task-subview-content');
    if (!container) return;

    const statuses = [
      { key: 'todo', label: t('status.todo') },
      { key: 'doing', label: t('status.doing') },
      { key: 'review', label: t('status.review') },
      { key: 'done', label: t('status.done') }
    ];

    container.innerHTML = `
      <div class="kanban-container-ny" role="region" aria-label="${t('kanban.title')}">
        ${statuses.map(status => {
          const statusTasks = tasks.filter(tk => tk.status === status.key);

          return `
            <section class="kanban-column-ny" data-status="${status.key}" role="region" aria-label="${status.label}">
              <header class="kanban-column-header-ny">
                <div class="kanban-column-title-ny">
                  <h3 class="column-name-ny">${status.label}</h3>
                </div>
                <span class="column-count-ny" aria-label="${statusTasks.length} 个任务">${statusTasks.length}</span>
              </header>

              <div class="kanban-column-content-ny" role="list">
                ${statusTasks.map(task => this.renderShardTask(task, {
                    showQuickActions: true,
                    context: 'kanban'
                  })).join('')}
                <button class="project-add-task-text" data-status="${status.key}" aria-label="${t('kanban.addTaskIn', { label: status.label })}">+ ${t('task.addTask')}</button>
              </div>
            </section>
          `;
        }).join('')}
      </div>
    `;

    this.bindKanbanViewEvents(container);
  }

  renderProjectViewNY(tasks, boards) {
    const container = document.querySelector('#task-project-view .task-subview-content');
    if (!container) return;

    if (boards.length === 0) {
      container.innerHTML = `
        <div class="project-empty-state">
          <div class="empty-line"></div>
          <p class="empty-title">${t('project.noProjects')}</p>
          <p class="empty-hint">${t('project.noProjectsHint')}</p>
          <button class="empty-create-btn" type="button" data-action="create-project">${t('project.createNew')}</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="kanban-container-ny" role="region" aria-label="项目任务视图">
        ${boards.map(board => {
          const boardTasks = tasks.filter(tk => tk.board_id === board.id)
            .sort((a, b) => (a.status === 'done') - (b.status === 'done'));

          return `
            <section class="kanban-column-ny" data-board-id="${board.id}" role="region" aria-label="${escapeHtml(board.name)}">
              <header class="kanban-column-header-ny">
                <div class="kanban-column-title-ny">
                  <h3 class="column-name-ny">${escapeHtml(board.name)}</h3>
                </div>
                <span class="column-count-ny" aria-label="${boardTasks.length} 个任务">${boardTasks.length}</span>
              </header>

              <div class="kanban-column-content-ny" role="list">
                ${boardTasks.map(task => this.renderShardTask(task, {
                    showQuickActions: true,
                    context: 'project'
                  })).join('')}
                <button class="project-add-task-text" data-board-id="${board.id}">+ ${t('task.addTask')}</button>
              </div>
            </section>
          `;
        }).join('')}
      </div>
    `;

    this.bindProjectViewEvents(container, tasks, boards);
  }

  bindMatrixViewEvents(container) {
    this.bindShardEvents(container);

    container.querySelectorAll('.matrix-add-task-ny').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showCreateTaskDialog({ priority: btn.dataset.priority });
      });
    });

    this.setupDragAndDrop(container, '.matrix-quadrant-ny', 'priority');
  }

  bindKanbanViewEvents(container) {
    this.bindShardEvents(container);

    container.querySelectorAll('.project-add-task-text[data-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showCreateTaskDialog({ status: btn.dataset.status });
      });
    });

    this.setupDragAndDrop(container, '.kanban-column-ny', 'status');
  }

  bindProjectViewEvents(container, tasks, boards) {
    this.bindShardEvents(container);

    container.querySelectorAll('.project-add-task-text[data-board-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showCreateTaskDialog({ board_id: btn.dataset.boardId });
      });
    });
  }

  bindShardEvents(container) {
    container.querySelectorAll('.shard-task').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.shard-action-btn')) return;
        const taskId = card.dataset.taskId;
        this.openTaskDetail(taskId);
      });

      card.querySelectorAll('.shard-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const taskId = card.dataset.taskId;
          this.handleQuickAction(action, taskId);
        });
      });
    });
  }

  bindAccordionEvents(container) {
    const quadrants = container.querySelectorAll('.matrix-quadrant-ny');

    quadrants.forEach(quadrant => {
      const header = quadrant.querySelector('.quadrant-header-ny');

      header?.addEventListener('click', () => {
        const isExpanded = quadrant.classList.contains('is-expanded');

        quadrants.forEach(q => {
          q.classList.remove('is-expanded');
          q.classList.add('is-collapsed');
          const h = q.querySelector('.quadrant-header-ny');
          if (h) h.setAttribute('aria-expanded', 'false');
        });

        if (!isExpanded) {
          quadrant.classList.remove('is-collapsed');
          quadrant.classList.add('is-expanded');
          header.setAttribute('aria-expanded', 'true');
        }
      });

      header?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });
    });
  }

  setupDragAndDrop(container, dropZoneSelector, updateField) {
    const cards = container.querySelectorAll('.shard-task');
    const dropZones = container.querySelectorAll(dropZoneSelector);

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        card.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', card.dataset.taskId);
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        dropZones.forEach(zone => zone.classList.remove('is-drag-over'));
      });
    });

    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        zone.classList.add('is-drag-over');
      });

      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('is-drag-over');
        }
      });

      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.classList.remove('is-drag-over');

        const taskId = e.dataTransfer.getData('text/plain');
        const newValue = zone.dataset[updateField] || zone.dataset.status || zone.dataset.priority;

        if (taskId && newValue) {
          try {
            await this.taskManager.updateTask(taskId, { [updateField]: newValue });
            this.refreshAllViews();
            uiShowToast(t('task.moved'), 'success');
          } catch {
            uiShowToast(t('task.moveFailed'), 'error');
          }
        }
      });
    });
  }

  async handleQuickAction(action, taskId) {
    const task = await this.taskManager.getTask(taskId);
    if (!task) return;

    switch (action) {
      case 'start':
        this.taskManager.selectTask(task);
        this.timerManager.start();
        uiShowToast(t('task.startFocus', { title: task.title }), 'success');
        break;

      case 'done':
        this.showUndoableComplete(task);
        break;

      case 'edit':
        this.openTaskDetail(taskId);
        break;
    }
  }

  showUndoableComplete(task) {

    if (this._undoPending?.taskId === task.id) {
      clearTimeout(this._undoPending.timerId);
      this._undoPending.handle.cancel();
    }

    const card = document.querySelector(`.shard-task[data-task-id="${task.id}"], .task-item[data-task-id="${task.id}"]`);
    if (card) card.classList.add('is-done');

    const handle = showUndoToast(t('task.undoComplete'), () => {

      if (card) card.classList.remove('is-done');
      clearTimeout(this._undoPending?.timerId);
      this._undoPending = null;
    }, 5000);

    const timerId = setTimeout(async () => {
      if (this._undoPending?.taskId !== task.id) return;
      this._undoPending = null;
      await this.taskManager.updateTask(task.id, { status: 'done' });
      this.refreshAllViews();
    }, 5000);

    this._undoPending = { taskId: task.id, handle, timerId };
  }

  async openTaskDetail(taskId) {
    if (this._dialogOpen) return;
    this._dialogOpen = true;
    const task = await this.taskManager.getTask(taskId);
    if (!task) { this._dialogOpen = false; return; }

    const boards = this.cachedBoards || await this.boardManager.getBoards();
    const boardName = task.board_id
      ? (boards.find(b => b.id === task.board_id)?.name || t('task.unassigned'))
      : t('task.unassigned');

    document.querySelector('.cb-overlay')?.remove();

    const cs = getComputedStyle(document.documentElement);
    const pillBg = cs.getPropertyValue('--bg-secondary').trim() || '#F5F5F4';
    const pillColor = cs.getPropertyValue('--text-secondary').trim() || '#57534E';
    const pillBorder = cs.getPropertyValue('--border-color').trim() || '#E7E5E3';
    const pill = {
      height: '28px', padding: '0 10px', borderRadius: '6px',
      fontSize: '12px', fontWeight: '500', fontFamily: 'inherit',
      background: pillBg, color: pillColor, border: `1px solid ${pillBorder}`,
      cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%2378716C' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
      paddingRight: '24px', lineHeight: '1', boxSizing: 'border-box',
    };

    const overlay = document.createElement('div');
    overlay.className = 'cb-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '9999',
      background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '12vh',
    });

    const bgSurface = cs.getPropertyValue('--bg-surface').trim() || '#fff';
    const shadowColor = cs.getPropertyValue('--shadow-color').trim() || 'rgba(0,0,0,0.14)';
    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      width: '480px', maxWidth: 'calc(100vw - 32px)',
      background: bgSurface, borderRadius: '12px',
      boxShadow: `0 16px 48px ${shadowColor}`,
      maxHeight: 'calc(100vh - 24vh)', overflowY: 'auto',
      transform: 'scale(0.97) translateY(-8px)', opacity: '0',
      transition: 'transform 0.2s ease, opacity 0.15s ease',
    });

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = task.title;
    titleInput.maxLength = 100;
    const textPrimary = cs.getPropertyValue('--text-primary').trim() || '#1C1917';
    const textSecondary = cs.getPropertyValue('--text-secondary').trim() || '#78716C';
    const textMuted = cs.getPropertyValue('--text-muted').trim() || '#A8A29E';
    Object.assign(titleInput.style, {
      display: 'block', width: '100%', boxSizing: 'border-box',
      padding: '20px 22px 4px', border: 'none', outline: 'none',
      fontSize: '17px', fontWeight: '600', fontFamily: 'inherit',
      color: textPrimary, background: 'transparent',
    });

    const descInput = document.createElement('textarea');
    descInput.value = task.description || '';
    descInput.placeholder = t('task.addDescription');
    descInput.rows = 2;
    const autoResize = () => {
      descInput.style.height = 'auto';
      descInput.style.height = descInput.scrollHeight + 'px';
    };
    Object.assign(descInput.style, {
      display: 'block', width: '100%', boxSizing: 'border-box',
      padding: '6px 22px 12px', border: 'none', outline: 'none',
      fontSize: '13px', fontFamily: 'inherit',
      color: textSecondary, background: 'transparent',
      resize: 'none', lineHeight: '1.5', overflow: 'hidden',
    });
    descInput.addEventListener('input', autoResize);

    const metaRow = document.createElement('div');
    Object.assign(metaRow.style, {
      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
      padding: '0 22px 14px',
    });

    const projectSelect = document.createElement('select');
    projectSelect.innerHTML = `<option value="">${t('task.unassigned')}</option>` +
      boards.map(b => `<option value="${b.id}"${b.id === task.board_id ? ' selected' : ''}>${escapeHtml(b.name)}</option>`).join('');
    Object.assign(projectSelect.style, pill);

    const statusSelect = document.createElement('select');
    statusSelect.innerHTML = `
      <option value="todo">${t('status.todo')}</option>
      <option value="doing">${t('status.doing')}</option>
      <option value="review">${t('status.review')}</option>
      <option value="done">${t('status.done')}</option>
    `;
    statusSelect.value = task.status || 'todo';
    Object.assign(statusSelect.style, pill);

    const prioritySelect = document.createElement('select');
    prioritySelect.innerHTML = `
      <option value="not-urgent-not-important">${t('priority.notUrgentNotImportant')}</option>
      <option value="urgent-important">${t('priority.urgentImportant')}</option>
      <option value="not-urgent-important">${t('priority.notUrgentImportant')}</option>
      <option value="urgent-not-important">${t('priority.urgentNotImportant')}</option>
    `;
    prioritySelect.value = task.priority || 'not-urgent-not-important';
    Object.assign(prioritySelect.style, pill);

    metaRow.append(projectSelect, statusSelect, prioritySelect);

    const bgPrimary = cs.getPropertyValue('--bg-primary').trim() || '#FAFAF9';
    const bgInverse = cs.getPropertyValue('--bg-inverse').trim() || '#292524';
    const textInverse = cs.getPropertyValue('--text-inverse').trim() || '#fff';

    const footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
      borderTop: `1px solid ${pillBorder}`,
      background: bgPrimary,
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = t('task.delete');
    Object.assign(deleteBtn.style, {
      height: '28px', padding: '0 10px', borderRadius: '6px',
      fontSize: '12px', fontWeight: '500', fontFamily: 'inherit',
      background: 'transparent', color: textMuted, border: 'none', cursor: 'pointer',
    });

    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '6px' });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('task.close');
    Object.assign(cancelBtn.style, {
      height: '30px', padding: '0 12px', borderRadius: '6px',
      fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      background: 'transparent', color: textMuted, border: 'none', cursor: 'pointer',
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = t('task.save');
    Object.assign(saveBtn.style, {
      height: '30px', padding: '0 14px', borderRadius: '6px',
      fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      background: bgInverse, color: textInverse, border: 'none', cursor: 'pointer',
    });

    actions.append(cancelBtn, saveBtn);
    footer.append(deleteBtn, actions);
    dialog.append(titleInput, descInput, metaRow, footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      autoResize();
      requestAnimationFrame(() => {
        dialog.style.transform = 'scale(1) translateY(0)';
        dialog.style.opacity = '1';
      });
    });

    const escHandler = (e) => { if (e.key === 'Escape') close(); };
    const close = () => {
      this._dialogOpen = false;
      document.removeEventListener('keydown', escHandler);
      dialog.style.transform = 'scale(0.97) translateY(-8px)';
      dialog.style.opacity = '0';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.15s ease';
      setTimeout(() => overlay.remove(), 160);
    };
    document.addEventListener('keydown', escHandler);

    statusSelect.addEventListener('change', async () => {
      await this.taskManager.updateTask(taskId, { status: statusSelect.value });
      this.refreshAllViews();
    });
    prioritySelect.addEventListener('change', async () => {
      await this.taskManager.updateTask(taskId, { priority: prioritySelect.value });
      this.refreshAllViews();
    });
    projectSelect.addEventListener('change', async () => {
      await this.taskManager.updateTask(taskId, { board_id: projectSelect.value || null });
      this.refreshAllViews();
    });

    saveBtn.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      if (!title) {
        titleInput.style.background = '#FEF2F2';
        setTimeout(() => { titleInput.style.background = 'transparent'; }, 600);
        return;
      }
      await this.taskManager.updateTask(taskId, {
        title,
        description: descInput.value.trim() || null,
        status: statusSelect.value,
        priority: prioritySelect.value,
        board_id: projectSelect.value || null,
      });
      close();
      this.refreshAllViews();
      uiShowToast(t('task.updateSuccess'), 'success');
    });

    deleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        t('task.deleteConfirm', { title: task.title }),
        { title: t('task.deleteTitle'), confirmText: t('task.confirmDelete'), cancelText: t('task.cancel') }
      );
      if (confirmed) {
        await this.taskManager.deleteTask(taskId);
        close();
        this.refreshAllViews();
        uiShowToast(t('task.deleteSuccess'), 'success');
      }
    });

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  async showCreateTaskDialog(defaults = {}) {
    if (this._dialogOpen) return;
    this._dialogOpen = true;
    const boards = this.cachedBoards || await this.boardManager.getBoards();
    document.querySelector('.cb-overlay')?.remove();

    const pill = {
      height: '28px', padding: '0 10px', borderRadius: '6px',
      fontSize: '12px', fontWeight: '500', fontFamily: 'inherit',
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim() || '#F5F5F4', color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#57534E', border: `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#E7E5E3'}`,
      cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%2378716C' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
      paddingRight: '24px',
    };

    const overlay = document.createElement('div');
    overlay.className = 'cb-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '9999',
      background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '16vh',
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      width: '420px', maxWidth: 'calc(100vw - 32px)',
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim() || '#fff', borderRadius: '12px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transform: 'scale(0.97) translateY(-8px)', opacity: '0',
      transition: 'transform 0.2s ease, opacity 0.15s ease',
    });

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = t('task.taskTitle');
    titleInput.maxLength = 100;
    Object.assign(titleInput.style, {
      display: 'block', width: '100%', boxSizing: 'border-box',
      padding: '20px 22px 6px', border: 'none', outline: 'none',
      fontSize: '16px', fontWeight: '600', fontFamily: 'inherit',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1C1917', background: 'transparent',
    });

    const descInput = document.createElement('textarea');
    descInput.placeholder = t('task.addDescription');
    descInput.maxLength = 500;
    descInput.rows = 1;
    Object.assign(descInput.style, {
      display: 'block', width: '100%', boxSizing: 'border-box',
      padding: '6px 22px 14px', border: 'none', outline: 'none',
      fontSize: '13px', fontFamily: 'inherit',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#78716C', background: 'transparent',
      resize: 'none', lineHeight: '1.5',
    });

    const metaRow = document.createElement('div');
    Object.assign(metaRow.style, {
      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
      padding: '0 22px 16px',
    });

    const boardSelect = document.createElement('select');
    boardSelect.innerHTML = `<option value="">${t('project.select')}</option>${boards.map(b =>
      `<option value="${b.id}">${escapeHtml(b.name)}</option>`
    ).join('')}`;
    Object.assign(boardSelect.style, pill);

    const prioritySelect = document.createElement('select');
    prioritySelect.innerHTML = `
      <option value="urgent-important">${t('priority.urgentImportant')}</option>
      <option value="not-urgent-important">${t('priority.notUrgentImportant')}</option>
      <option value="urgent-not-important">${t('priority.urgentNotImportant')}</option>
      <option value="not-urgent-not-important">${t('priority.notUrgentNotImportant')}</option>
    `;
    Object.assign(prioritySelect.style, pill);

    const statusSelect = document.createElement('select');
    statusSelect.innerHTML = `
      <option value="todo">${t('status.todo')}</option>
      <option value="doing">${t('status.doing')}</option>
      <option value="review">${t('status.review')}</option>
      <option value="done">${t('status.done')}</option>
    `;
    Object.assign(statusSelect.style, pill);

    metaRow.append(boardSelect, prioritySelect, statusSelect);

    if (defaults.board_id) boardSelect.value = defaults.board_id;
    if (defaults.priority) prioritySelect.value = defaults.priority;
    if (defaults.status) statusSelect.value = defaults.status;

    const footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
      borderTop: `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#E7E5E4'}`,
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#FAFAF9',
    });

    const hint = document.createElement('span');
    hint.textContent = t('task.enterCreate');
    Object.assign(hint.style, { fontSize: '11px', color: '#D6D3D1', paddingLeft: '6px' });

    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '6px' });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('task.cancel');
    Object.assign(cancelBtn.style, {
      height: '30px', padding: '0 12px', borderRadius: '6px',
      fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      background: 'transparent', color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#A8A29E', border: 'none', cursor: 'pointer',
    });

    const submitBtn = document.createElement('button');
    submitBtn.textContent = t('task.create');
    Object.assign(submitBtn.style, {
      height: '30px', padding: '0 14px', borderRadius: '6px',
      fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-inverse').trim() || '#292524', color: getComputedStyle(document.documentElement).getPropertyValue('--text-inverse').trim() || '#fff', border: 'none', cursor: 'pointer',
    });

    actions.append(cancelBtn, submitBtn);
    footer.append(hint, actions);
    dialog.append(titleInput, descInput, metaRow, footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialog.style.transform = 'scale(1) translateY(0)';
        dialog.style.opacity = '1';
      });
    });
    setTimeout(() => titleInput.focus(), 50);

    const close = () => {
      this._dialogOpen = false;
      dialog.style.transform = 'scale(0.97) translateY(-8px)';
      dialog.style.opacity = '0';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.15s ease';
      setTimeout(() => overlay.remove(), 160);
    };

    const handleSubmit = async () => {
      const title = titleInput.value.trim();
      if (!title) {
        titleInput.style.background = '#FEF2F2';
        setTimeout(() => { titleInput.style.background = 'transparent'; }, 600);
        titleInput.focus();
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = t('task.creating');
      try {
        await this.taskManager.createTask({
          title,
          board_id: boardSelect.value || null,
          priority: prioritySelect.value,
          status: statusSelect.value,
          description: descInput.value.trim() || null,
        });
        close();
        this.refreshAllViews();
        uiShowToast(t('task.createSuccess'), 'success');
      } catch {
        submitBtn.disabled = false;
        submitBtn.textContent = t('task.create');
        uiShowToast(t('task.createFailed'), 'error');
      }
    };

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    cancelBtn.addEventListener('click', close);
    submitBtn.addEventListener('click', handleSubmit);
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
      if (e.key === 'Escape') close();
    });
    descInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  showDeleteBoardConfirm(board) {
    document.querySelector('.cb-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'cb-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '9999',
      background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '16vh',
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      width: '400px', maxWidth: 'calc(100vw - 32px)',
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim() || '#fff', borderRadius: '12px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transform: 'scale(0.97) translateY(-8px)', opacity: '0',
      transition: 'transform 0.2s ease, opacity 0.15s ease',
    });

    const body = document.createElement('div');
    Object.assign(body.style, { padding: '24px 22px 16px' });

    const title = document.createElement('h3');
    title.textContent = t('board.deleteTitle');
    Object.assign(title.style, {
      margin: '0 0 6px', fontSize: '16px', fontWeight: '600',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1C1917', fontFamily: 'inherit',
    });

    const hint = document.createElement('p');
    hint.innerHTML = t('board.deleteHint', { name: escapeHtml(board.name) });
    Object.assign(hint.style, {
      margin: '0 0 16px', fontSize: '13px', lineHeight: '1.6',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#78716C', fontFamily: 'inherit',
    });

    const label = document.createElement('p');
    label.textContent = t('board.deleteLabel', { name: board.name });
    Object.assign(label.style, {
      margin: '0 0 8px', fontSize: '12px', fontWeight: '500',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#A8A29E', fontFamily: 'inherit',
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = board.name;
    input.autocomplete = 'off';
    const cs = getComputedStyle(document.documentElement);
    const inputBg = cs.getPropertyValue('--bg-primary').trim() || '#FAFAF9';
    const inputBorder = cs.getPropertyValue('--border-color').trim() || '#E7E5E3';
    const inputBorderStrong = cs.getPropertyValue('--border-strong').trim() || '#A8A29E';
    Object.assign(input.style, {
      display: 'block', width: '100%', boxSizing: 'border-box',
      padding: '9px 12px', border: `1px solid ${inputBorder}`, borderRadius: '8px',
      fontSize: '14px', fontFamily: 'inherit', color: cs.getPropertyValue('--text-primary').trim() || '#1C1917',
      background: inputBg, outline: 'none',
      transition: 'border-color 0.15s',
    });
    input.addEventListener('focus', () => { input.style.borderColor = inputBorderStrong; });
    input.addEventListener('blur', () => { input.style.borderColor = inputBorder; });

    body.append(title, hint, label, input);

    const footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex', justifyContent: 'flex-end', gap: '8px',
      padding: '12px 16px', borderTop: `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#E7E5E4'}`, background: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#FAFAF9',
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('task.cancel');
    Object.assign(cancelBtn.style, {
      height: '32px', padding: '0 14px', borderRadius: '6px',
      fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      background: 'transparent', color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#78716C', border: 'none', cursor: 'pointer',
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = t('board.confirmDelete');
    deleteBtn.disabled = true;
    Object.assign(deleteBtn.style, {
      height: '32px', padding: '0 14px', borderRadius: '6px',
      fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      background: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#E7E5E3', color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#A8A29E', border: 'none',
      cursor: 'not-allowed', transition: 'all 0.15s',
    });

    input.addEventListener('input', () => {
      const match = input.value.trim() === board.name;
      deleteBtn.disabled = !match;
      Object.assign(deleteBtn.style, match
        ? { background: '#DC2626', color: '#fff', cursor: 'pointer' }
        : { background: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#E7E5E3', color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#A8A29E', cursor: 'not-allowed' }
      );
    });

    footer.append(cancelBtn, deleteBtn);
    dialog.append(body, footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialog.style.transform = 'scale(1) translateY(0)';
        dialog.style.opacity = '1';
      });
    });
    setTimeout(() => input.focus(), 120);

    const escHandler = (e) => { if (e.key === 'Escape') close(); };
    const close = () => {
      document.removeEventListener('keydown', escHandler);
      dialog.style.transform = 'scale(0.97) translateY(-8px)';
      dialog.style.opacity = '0';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.15s ease';
      setTimeout(() => overlay.remove(), 160);
    };
    document.addEventListener('keydown', escHandler);

    deleteBtn.addEventListener('click', async () => {
      if (deleteBtn.disabled) return;
      await this.boardManager.deleteBoard(board.id);
      close();
      this.refreshAllViews({ force: true });
      uiShowToast(t('project.deleteSuccess'), 'success');
    });

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  showCreateBoardDialog() {

    document.querySelector('.cb-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'cb-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '9999',
      background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '18vh',
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      width: '380px', maxWidth: 'calc(100vw - 32px)',
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim() || '#fff', borderRadius: '12px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transform: 'scale(0.97) translateY(-8px)', opacity: '0',
      transition: 'transform 0.2s ease, opacity 0.15s ease',
    });

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = t('project.projectName');
    nameInput.maxLength = 50;
    Object.assign(nameInput.style, {
      display: 'block', width: '100%', boxSizing: 'border-box',
      padding: '20px 22px 6px', border: 'none', outline: 'none',
      fontSize: '16px', fontWeight: '600', fontFamily: 'inherit',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1C1917', background: 'transparent',
    });

    const descInput = document.createElement('textarea');
    descInput.placeholder = t('task.addDescription');
    descInput.maxLength = 200;
    descInput.rows = 1;
    Object.assign(descInput.style, {
      display: 'block', width: '100%', boxSizing: 'border-box',
      padding: '6px 22px 16px', border: 'none', outline: 'none',
      fontSize: '13px', fontFamily: 'inherit',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#78716C', background: 'transparent',
      resize: 'none', lineHeight: '1.5',
    });

    const footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
      borderTop: `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#E7E5E4'}`,
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#FAFAF9',
    });

    const hint = document.createElement('span');
    hint.textContent = t('task.enterCreate');
    Object.assign(hint.style, {
      fontSize: '11px', color: '#D6D3D1', paddingLeft: '6px',
    });

    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '6px' });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('task.cancel');
    Object.assign(cancelBtn.style, {
      height: '30px', padding: '0 12px', borderRadius: '6px',
      fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      background: 'transparent', color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#A8A29E', border: 'none', cursor: 'pointer',
    });

    const submitBtn = document.createElement('button');
    submitBtn.textContent = t('task.create');
    Object.assign(submitBtn.style, {
      height: '30px', padding: '0 14px', borderRadius: '6px',
      fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-inverse').trim() || '#292524', color: getComputedStyle(document.documentElement).getPropertyValue('--text-inverse').trim() || '#fff', border: 'none', cursor: 'pointer',
    });

    actions.append(cancelBtn, submitBtn);
    footer.append(hint, actions);
    dialog.append(nameInput, descInput, footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialog.style.transform = 'scale(1) translateY(0)';
        dialog.style.opacity = '1';
      });
    });
    setTimeout(() => nameInput.focus(), 50);

    const close = () => {
      dialog.style.transform = 'scale(0.97) translateY(-8px)';
      dialog.style.opacity = '0';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.15s ease';
      setTimeout(() => overlay.remove(), 160);
    };

    const handleSubmit = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.style.background = '#FEF2F2';
        setTimeout(() => { nameInput.style.background = 'transparent'; }, 600);
        nameInput.focus();
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = t('task.creating');
      try {
        await this.boardManager.createBoard({
          name,
          description: descInput.value.trim() || null,
        });
        close();
        this.refreshAllViews();
        uiShowToast(t('project.createSuccess'), 'success');
      } catch {
        submitBtn.disabled = false;
        submitBtn.textContent = t('task.create');
        uiShowToast(t('project.createFailed'), 'error');
      }
    };

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    cancelBtn.addEventListener('click', close);
    submitBtn.addEventListener('click', handleSubmit);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
      if (e.key === 'Escape') close();
    });
    descInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  formatDueDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return t('due.expired');
    if (diffDays === 0) return t('due.today');
    if (diffDays === 1) return t('due.tomorrow');
    if (diffDays <= 7) return t('due.daysLater', { days: diffDays });

    return date.toLocaleDateString(getLang() === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  }

  updateProjectFilter(boards) {
    const dropdown = document.getElementById('project-dropdown');
    if (!dropdown) return;

    const menu = dropdown.querySelector('.custom-dropdown-menu');
    if (!menu) return;

    const currentValue = dropdown.dataset.value || '';
    menu.innerHTML = `
      <div class="custom-dropdown-option${currentValue === '' ? ' is-selected' : ''}" data-value="">${t('focus.allProjects')}</div>
      ${boards.map(b => `<div class="custom-dropdown-option${currentValue === b.id ? ' is-selected' : ''}" data-value="${b.id}">${escapeHtml(b.name)}</div>`).join('')}
    `;
  }

  renderSelectedTask() {
    const selectedTaskEl = document.querySelector('.focus-selected-task');
    if (!selectedTaskEl) return;

    if (this.currentTask) {
      selectedTaskEl.hidden = false;
      const nameEl = selectedTaskEl.querySelector('.focus-selected-name');
      if (nameEl) {
        nameEl.textContent = this.currentTask.title;
      }
    } else {
      selectedTaskEl.hidden = true;
    }

  }

  showTaskCompletionPrompt(task) {
    return new Promise(resolve => {

      document.querySelector('.task-completion-bar')?.remove();

      const bar = document.createElement('div');
      bar.className = 'task-completion-bar';
      bar.innerHTML = `
        <span class="tcb-text">${escapeHtml(t('timer.pomodoroComplete'))}：${escapeHtml(task.title)}</span>
        <div class="tcb-actions">
          <button class="tcb-btn tcb-btn-done">${escapeHtml(t('timer.markDone'))}</button>
          <button class="tcb-btn tcb-btn-continue">${escapeHtml(t('timer.continue'))}</button>
        </div>
      `;
      document.body.appendChild(bar);

      requestAnimationFrame(() => bar.classList.add('visible'));

      let settled = false;
      const dismiss = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(autoTimer);
        bar.classList.remove('visible');
        setTimeout(() => bar.remove(), 300);
        resolve(result);
      };

      bar.querySelector('.tcb-btn-done').addEventListener('click', () => dismiss(true));
      bar.querySelector('.tcb-btn-continue').addEventListener('click', () => dismiss(false));

      const autoTimer = setTimeout(() => dismiss(false), 10000);
    });
  }
}

let app;
document.addEventListener('DOMContentLoaded', async () => {
  try {
    app = new KairosApp();
  } catch (e) {
    console.error('[app] init failed:', e);
    showAlert(t('app.startFailed'));
  }
});

export default KairosApp;
