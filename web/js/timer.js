import { database } from './db.js';
import notificationManager from './notifications.js';
import alternativeNotifications from './alternative-notifications.js';
import { showToast as uiShowToast } from './ui.js';
import { t } from './i18n.js';

class TimerManager {
  constructor(app) {
    this.app = app;
    this.timeLeft = 25 * 60;
    this.isRunning = false;
    this.interval = null;
    this.lastMinute = 25;
    this.defaultDuration = 25 * 60;
    this.breakDuration = 5 * 60;
    this.longBreakDuration = 15 * 60;
    this.currentSession = 'focus';
    this.sessionCount = 0;
    this.sessionDuration = this.defaultDuration;
    this.sessionStartTimestamp = null;

    this.intervals = [];
    this.listeners = new Map();
    this.disposed = false;

    this.start = this.start.bind(this);
    this.pause = this.pause.bind(this);
    this.stop = this.stop.bind(this);
    this.reset = this.reset.bind(this);
    this.setDuration = this.setDuration.bind(this);
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.app.updateStartPauseButton();
      this.app.updateMiniDisplay?.();

      if (this.sessionStartTimestamp === null) {
        const elapsed = Math.max(0, this.sessionDuration - this.timeLeft);
        this.sessionStartTimestamp = Date.now() - elapsed * 1000;
      }

      // 用真实时间戳驱动，后台标签页节流 setInterval 也不影响准确性
      this._endTimestamp = Date.now() + this.timeLeft * 1000;

      this.interval = setInterval(() => {
        const remaining = Math.round((this._endTimestamp - Date.now()) / 1000);
        if (remaining > 0) {
          this.timeLeft = remaining;
          this.app.updateTimerDisplay();
          this.app.updateMiniDisplay?.();
        } else {
          this.timeLeft = 0;
          this.stop();
          this.app.updateTimerDisplay();
          this.app.updateMiniDisplay?.();
          this.onComplete();
        }
      }, 1000);
    }
  }

  pause() {
    if (this.isRunning) {
      this.isRunning = false;
      clearInterval(this.interval);
      this.interval = null;
      this.app.updateStartPauseButton();
      this.app.updateMiniDisplay?.();
    }
  }

  stop() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.interval = null;
    this.app.updateStartPauseButton();
    this.app.updateMiniDisplay?.();
  }

  reset() {
    this.stop();
    this.timeLeft = this.defaultDuration;
    this.lastMinute = Math.floor(this.timeLeft / 60);
    this.sessionDuration = this.defaultDuration;
    this.sessionStartTimestamp = null;
    this.app.updateTimerDisplay();
    this.app.updateMiniDisplay?.();
  }

  setDuration(minutes) {
    if (minutes <= 0) {
      minutes = 25;
    }

    this.stop();
    this.defaultDuration = minutes * 60;
    this.timeLeft = this.defaultDuration;
    this.lastMinute = Math.floor(this.timeLeft / 60);
    this.sessionDuration = this.defaultDuration;
    this.sessionStartTimestamp = null;
    this.app.updateTimerDisplay();
    this.app.updateMiniDisplay?.();
  }

  getFormattedTime() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getProgress() {
    const duration = this.sessionDuration || this.defaultDuration || 1;
    return ((duration - this.timeLeft) / duration) * 100;
  }

  async onComplete() {
    this.sessionCount++;

    this.playCompletionSound();
    this.sendCompletionNotification();
    await this.recordTimeSession();

    const minutes = Math.round((this.sessionDuration || this.defaultDuration) / 60);
    const sessionText = this.getSessionTypeText();
    await database.logActivity({
      type: 'complete',
      content: t('timer.completeSession', { session: sessionText, minutes }),
      task_id: this.app.currentTask?.id || null
    });
    this.app.loadActivityLog?.();

    this.sessionStartTimestamp = null;

    if (this.currentSession === 'focus' && this.app.currentTask) {
      await this.promptTaskCompletion();
    }

    this.handleSessionTransition();
  }

  async promptTaskCompletion() {
    const task = this.app.currentTask;
    if (!task || task.status === 'done') {
      return;
    }

    try {
      const shouldComplete = await this.app.showTaskCompletionPrompt?.(task);
      if (shouldComplete) {
        await this.markTaskAsComplete(task);
      }
    } catch (e) {
      console.error('[timer] 获取任务完成确认失败:', e);
    }
  }

  async markTaskAsComplete(task) {
    try {
      await database.updateTask(task.id, {
        status: 'done',
        completed_at: new Date().toISOString()
      });

      task.status = 'done';
      task.completed_at = new Date().toISOString();

      this.app.refreshAllViews?.({ force: true });
      uiShowToast(t('timer.taskCompleted'), 'success');

      await database.logActivity({
        type: 'complete',
        content: t('timer.completeTask', { title: task.title }),
        task_id: task.id
      });

      this.app.currentTask = null;
      this.app.renderSelectedTask?.();
    } catch {
      uiShowToast(t('timer.taskCompleteFailed'), 'error');
    }
  }

  playCompletionSound() {
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    } catch (e) {
      console.error('[timer] 播放完成音效失败:', e);
    }
  }

  sendCompletionNotification() {
    const message = this.currentSession === 'focus'
      ? t('timer.pomodoroCompletToast')
      : t('timer.breakOverToast');

    uiShowToast(message, 'success');

    if (this.currentSession === 'focus') {
      alternativeNotifications.notifyPomodoroComplete();
    } else if (this.currentSession === 'longBreak') {
      alternativeNotifications.notifyBreakComplete();
    } else {
      alternativeNotifications.notifyBreakComplete();
    }
  }

  async recordTimeSession() {
    try {
      const plannedDurationSeconds = this.sessionDuration || this.defaultDuration;
      const durationSeconds = Math.max(0, Math.round(plannedDurationSeconds));
      const endTime = new Date();
      const startTime = this.sessionStartTimestamp
        ? new Date(this.sessionStartTimestamp)
        : new Date(endTime.getTime() - durationSeconds * 1000);

      const sessionData = {
        task_id: this.app.currentTask?.id || null,
        started_at: startTime.toISOString(),
        ended_at: endTime.toISOString(),
        duration_minutes: Math.max(1, Math.round(durationSeconds / 60)),
        session_type: this.currentSession
      };

    } catch (e) {
      console.error('[timer] 记录时间会话失败:', e);
    }
  }

  handleSessionTransition() {
    if (this.currentSession === 'focus') {
      if (this.sessionCount % 4 === 0) {
        this.startBreak('longBreak');
      } else {
        this.startBreak('break');
      }
    } else {
      this.startFocus();
    }
  }

  startFocus() {
    this.currentSession = 'focus';
    this.timeLeft = this.defaultDuration;
    this.lastMinute = Math.floor(this.timeLeft / 60);
    this.sessionDuration = this.defaultDuration;
    this.sessionStartTimestamp = null;
    this.app.updateTimerDisplay();
    this.app.updateTimerStatus?.(t('timer.readyForFocus'));
  }

  startBreak(type = 'break') {
    this.currentSession = type;
    const duration = type === 'longBreak' ? this.longBreakDuration : this.breakDuration;
    this.timeLeft = duration;
    this.lastMinute = Math.floor(this.timeLeft / 60);
    this.sessionDuration = duration;
    this.sessionStartTimestamp = null;
    this.app.updateTimerDisplay();

    const message = type === 'longBreak' ? t('timer.startLongBreak') : t('timer.startShortBreak');
    this.app.updateTimerStatus?.(message);
  }

  getSessionTypeText() {
    switch (this.currentSession) {
      case 'focus':
        return t('timer.focusSession');
      case 'break':
        return t('timer.shortBreak');
      case 'longBreak':
        return t('timer.longBreak');
      default:
        return t('timer.focusSession');
    }
  }

  getStatus() {
    return {
      timeLeft: this.timeLeft,
      isRunning: this.isRunning,
      currentSession: this.currentSession,
      sessionCount: this.sessionCount,
      formattedTime: this.getFormattedTime(),
      progress: this.getProgress(),
      sessionTypeText: this.getSessionTypeText()
    };
  }

  dispose() {
    if (this.disposed) return;

    this.stop();

    this.intervals.forEach((id) => {
      if (id) clearInterval(id);
    });
    this.intervals = [];

    this.listeners.forEach((listeners, element) => {
      if (element && listeners) {
        listeners.forEach(({ event, handler, options }) => {
          try {
            element.removeEventListener(event, handler, options);
          } catch (e) {

          }
        });
      }
    });
    this.listeners.clear();

    this.app = null;
    this.disposed = true;
  }

  addEventListener(element, event, handler, options) {
    if (this.disposed || !element) return;

    element.addEventListener(event, handler, options);

    if (!this.listeners.has(element)) {
      this.listeners.set(element, []);
    }

    this.listeners.get(element).push({ event, handler, options });
  }
}

export default TimerManager;
