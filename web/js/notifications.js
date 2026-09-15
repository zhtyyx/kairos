import { t } from './i18n.js';

class NotificationManager {
  constructor() {
    this.permission = ('Notification' in globalThis) ? Notification.permission : 'denied';
    this.soundEnabled = true;
    this.notificationSound = null;
  }

  async init() {

    if (!('Notification' in window)) return false;

    this.permission = Notification.permission;

    if (this.permission === 'granted') return true;
    if (this.permission === 'denied') return false;

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return this.permission === 'granted';
    } catch {
      return false;
    }
  }

  async send(title, options = {}) {

    if (Notification.permission !== 'granted') return null;

    const defaultOptions = {
      body: '',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: !this.soundEnabled,
      tag: 'kairos-notification'
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, finalOptions);

        if (this.soundEnabled && this.notificationSound) {
          this.notificationSound.play().catch(() => {});
        }

        return { type: 'sw-notification' };
      }

      const notification = new Notification(title, finalOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      if (this.soundEnabled && this.notificationSound) {
        this.notificationSound.play().catch(() => {});
      }

      return notification;
    } catch {
      return null;
    }
  }

  sendPomodoroComplete() {
    return this.send('KAIROS', {
      body: t('notify.pomodoroComplete'),
      tag: 'pomodoro-complete',
      requireInteraction: true
    });
  }

  sendShortBreakComplete() {
    return this.send('KAIROS', {
      body: t('notify.shortBreakComplete'),
      tag: 'break-complete'
    });
  }

  sendLongBreakComplete() {
    return this.send('KAIROS', {
      body: t('notify.longBreakComplete'),
      tag: 'break-complete'
    });
  }

  sendTaskReminder(taskTitle) {
    return this.send('KAIROS', {
      body: t('notify.taskReminder', { title: taskTitle }),
      tag: 'task-reminder'
    });
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  setNotificationSound(audioElement) {
    this.notificationSound = audioElement;
  }

  hasPermission() {
    return Notification.permission === 'granted';
  }

  getPermissionStatus() {
    return Notification.permission;
  }
}

const notificationManager = new NotificationManager();

export default notificationManager;
export { NotificationManager };
