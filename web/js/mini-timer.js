import { t } from './i18n.js';

class MiniTimer {
  constructor(timerManager) {
    this.timerManager = timerManager;
    this.element = document.getElementById('mini-timer');
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.isVisible = false;

    this.pipWindow = null;
    this.pipSupported = 'documentPictureInPicture' in window;
    this.pipUpdateInterval = null;

    // 存储 bound 引用，以便 removeEventListener
    this._boundDrag = this.drag.bind(this);
    this._boundStopDrag = this.stopDrag.bind(this);

    this.init();
  }

  init() {
    if (!this.element) return;

    const handle = this.element.querySelector('.mini-timer-handle');
    if (handle) {
      handle.addEventListener('mousedown', this.startDrag.bind(this));
      handle.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    }

    document.addEventListener('mousemove', this._boundDrag);
    document.addEventListener('mouseup', this._boundStopDrag);
    document.addEventListener('touchmove', this._boundDrag, { passive: false });
    document.addEventListener('touchend', this._boundStopDrag);

    const startPauseBtn = document.getElementById('mini-start-pause');
    const resetBtn = document.getElementById('mini-reset');
    const closeBtn = document.getElementById('mini-close');

    if (startPauseBtn) {
      startPauseBtn.addEventListener('click', () => {
        if (this.timerManager.isRunning) {
          this.timerManager.pause();
        } else {
          this.timerManager.start();
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.timerManager.reset();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    this.restorePosition();
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
      return;
    }

    if (this.pipSupported) {
      this.showPiP();
    } else {
      this.show();
    }
  }

  hide() {
    if (this.pipWindow) {
      this.isVisible = false;
      this.pipWindow.close();
      return;
    }

    if (!this.element) return;
    this.element.hidden = true;
    this.isVisible = false;
  }

  update() {
    // PiP 有自己的 interval，不需要外部驱动
    if (this.pipWindow) return;

    if (!this.element || !this.isVisible) return;

    const status = this.timerManager.getStatus();

    const timeDisplay = this.element.querySelector('.mini-time-display');
    if (timeDisplay) {
      timeDisplay.textContent = status.formattedTime;
    }

    const startPauseBtn = document.getElementById('mini-start-pause');
    if (startPauseBtn) {
      startPauseBtn.textContent = status.isRunning ? '⏸' : '▶';
    }

    this.element.classList.toggle('running', status.isRunning);
    this.element.classList.toggle('paused', !status.isRunning && status.timeLeft < status.sessionDuration);
    this.element.classList.toggle('break', status.currentSession !== 'focus');
  }

  show() {
    if (!this.element) return;
    this.element.hidden = false;
    this.isVisible = true;
    this.update();
  }

  async showPiP() {
    try {
      this.pipWindow = await documentPictureInPicture.requestWindow({
        width: 280,
        height: 140
      });

      this.isVisible = true;
      this.buildPiPContent(this.pipWindow);
      this.setupPiPEventListeners(this.pipWindow);
      this.startPiPUpdates();

      this.pipWindow.addEventListener('pagehide', () => {
        this.cleanupPiP();
      });

    } catch {
      this.pipWindow = null;
      this.show();
    }
  }

  buildPiPContent(pipWin) {
    const doc = pipWin.document;
    const status = this.timerManager.getStatus();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const style = doc.createElement('style');
    style.textContent = this.getPiPStyles(isDark);
    doc.head.appendChild(style);

    doc.body.innerHTML = `
      <div class="pip-container">
        <div class="pip-time" id="pip-time">${status.formattedTime}</div>
        <div class="pip-session" id="pip-session">${status.sessionTypeText}</div>
        <div class="pip-progress">
          <div class="pip-progress-bar" id="pip-progress" style="width: ${status.progress}%"></div>
        </div>
        <div class="pip-controls">
          <button class="pip-btn" id="pip-start-pause" title="${status.isRunning ? t('mini.pause') : t('mini.start')}">${status.isRunning ? '⏸' : '▶'}</button>
          <button class="pip-btn" id="pip-reset" title="${t('mini.reset')}">⟲</button>
          <button class="pip-btn pip-btn-close" id="pip-close" title="${t('mini.close')}">✕</button>
        </div>
      </div>
    `;

    this.updatePiPStateClass(doc, status);
  }

  getPiPStyles(isDark) {
    const bg = isDark ? '#1e1e1e' : '#faf8f5';
    const text = isDark ? '#e0dcd6' : '#3a3632';
    const textMuted = isDark ? '#a09a93' : '#8a857e';
    const border = isDark ? '#2e2e2e' : '#e8e4de';
    const btnBg = isDark ? '#2a2a2a' : '#f0ece6';
    const btnHover = isDark ? '#363636' : '#e8e4de';

    const focusColor = '#b8860b';
    const breakColor = '#5a8a6a';
    const pausedColor = '#a0937d';

    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: ${bg};
        color: ${text};
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
      }
      .pip-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        padding: 12px 16px;
        gap: 4px;
      }
      .pip-time {
        font-size: 42px;
        font-weight: 300;
        letter-spacing: 2px;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
        color: ${text};
        transition: color 0.3s;
      }
      .pip-session {
        font-size: 11px;
        color: ${textMuted};
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .pip-progress {
        width: 100%;
        height: 2px;
        background: ${border};
        border-radius: 1px;
        margin: 6px 0;
        overflow: hidden;
      }
      .pip-progress-bar {
        height: 100%;
        background: ${focusColor};
        border-radius: 1px;
        transition: width 1s linear;
      }
      .pip-controls {
        display: flex;
        gap: 8px;
      }
      .pip-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        background: ${btnBg};
        color: ${text};
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .pip-btn:hover { background: ${btnHover}; }
      .pip-btn:active { transform: scale(0.95); }
      .pip-btn-close { font-size: 12px; }

      /* 状态色 */
      .is-running .pip-time { color: ${focusColor}; }
      .is-running .pip-progress-bar { background: ${focusColor}; }
      .is-break .pip-time { color: ${breakColor}; }
      .is-break .pip-progress-bar { background: ${breakColor}; }
      .is-paused .pip-time { color: ${pausedColor}; }
      .is-paused .pip-progress-bar { background: ${pausedColor}; }
    `;
  }

  setupPiPEventListeners(pipWin) {
    const doc = pipWin.document;

    doc.getElementById('pip-start-pause')?.addEventListener('click', () => {
      if (this.timerManager.isRunning) {
        this.timerManager.pause();
      } else {
        this.timerManager.start();
      }
    });

    doc.getElementById('pip-reset')?.addEventListener('click', () => {
      this.timerManager.reset();
    });

    doc.getElementById('pip-close')?.addEventListener('click', () => {
      this.pipWindow.close();
    });
  }

  startPiPUpdates() {
    this.pipUpdateInterval = setInterval(() => {
      if (!this.pipWindow) return;

      const status = this.timerManager.getStatus();
      const doc = this.pipWindow.document;

      const timeEl = doc.getElementById('pip-time');
      if (timeEl) timeEl.textContent = status.formattedTime;

      const sessionEl = doc.getElementById('pip-session');
      if (sessionEl) sessionEl.textContent = status.sessionTypeText;

      const progressEl = doc.getElementById('pip-progress');
      if (progressEl) progressEl.style.width = `${status.progress}%`;

      const btn = doc.getElementById('pip-start-pause');
      if (btn) {
        btn.textContent = status.isRunning ? '⏸' : '▶';
        btn.title = status.isRunning ? t('mini.pause') : t('mini.start');
      }

      this.updatePiPStateClass(doc, status);
    }, 1000);
  }

  updatePiPStateClass(doc, status) {
    const container = doc.querySelector('.pip-container');
    if (!container) return;

    container.classList.toggle('is-running', status.isRunning);
    container.classList.toggle('is-paused', !status.isRunning && status.timeLeft < status.sessionDuration);
    container.classList.toggle('is-break', status.currentSession !== 'focus');
  }

  cleanupPiP() {
    if (this.pipUpdateInterval) {
      clearInterval(this.pipUpdateInterval);
      this.pipUpdateInterval = null;
    }
    this.pipWindow = null;
    this.isVisible = false;
  }

  startDrag(event) {
    event.preventDefault();
    this.isDragging = true;
    this.element.classList.add('dragging');

    const point = event.touches ? event.touches[0] : event;
    const rect = this.element.getBoundingClientRect();
    this.dragOffset.x = point.clientX - rect.left;
    this.dragOffset.y = point.clientY - rect.top;
  }

  drag(event) {
    if (!this.isDragging) return;

    event.preventDefault();

    const point = event.touches ? event.touches[0] : event;
    const x = point.clientX - this.dragOffset.x;
    const y = point.clientY - this.dragOffset.y;

    const maxX = window.innerWidth - this.element.offsetWidth;
    const maxY = window.innerHeight - this.element.offsetHeight;

    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));

    this.element.style.left = `${boundedX}px`;
    this.element.style.top = `${boundedY}px`;
    this.element.style.right = 'auto';
    this.element.style.bottom = 'auto';
  }

  stopDrag() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.element.classList.remove('dragging');
    this.savePosition();
  }

  savePosition() {
    const rect = this.element.getBoundingClientRect();
    localStorage.setItem('miniTimerPosition', JSON.stringify({
      left: rect.left,
      top: rect.top
    }));
  }

  restorePosition() {
    try {
      const savedPosition = localStorage.getItem('miniTimerPosition');
      if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);

        const maxX = window.innerWidth - this.element.offsetWidth;
        const maxY = window.innerHeight - this.element.offsetHeight;

        if (left >= 0 && left <= maxX && top >= 0 && top <= maxY) {
          this.element.style.left = `${left}px`;
          this.element.style.top = `${top}px`;
          this.element.style.right = 'auto';
          this.element.style.bottom = 'auto';
        }
      }
    } catch {
    }
  }

  handleResize() {
    if (!this.isVisible || this.pipWindow) return;

    const rect = this.element.getBoundingClientRect();
    const maxX = window.innerWidth - this.element.offsetWidth;
    const maxY = window.innerHeight - this.element.offsetHeight;

    if (rect.left > maxX || rect.top > maxY) {
      const newLeft = Math.min(rect.left, maxX);
      const newTop = Math.min(rect.top, maxY);
      this.element.style.left = `${newLeft}px`;
      this.element.style.top = `${newTop}px`;
      this.savePosition();
    }
  }
}

export default MiniTimer;
