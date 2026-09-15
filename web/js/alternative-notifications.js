import { t } from './i18n.js';

class AlternativeNotifications {
  constructor() {
    this.soundEnabled = true;
    this.audioContext = null;
    this.titleInterval = null;
    this.originalTitle = document.title;
  }

  playSound() {
    if (!this.soundEnabled) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const notes = [523.25, 659.25, 783.99];

      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, now + i * 0.2);
        gainNode.gain.linearRampToValueAtTime(0.3, now + i * 0.2 + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + i * 0.2 + 0.4);

        oscillator.start(now + i * 0.2);
        oscillator.stop(now + i * 0.2 + 0.4);
      });

    } catch {
    }
  }

  showModal(title, message, options = {}) {

    const existing = document.getElementById('kairos-notification-modal');
    if (existing) {
      existing.remove();
    }

    const esc = (str) => {
      const d = document.createElement('div');
      d.textContent = str || '';
      return d.innerHTML;
    };

    const modal = document.createElement('div');
    modal.id = 'kairos-notification-modal';
    modal.innerHTML = `
      <div class="notification-overlay">
        <div class="notification-content">
          <div class="notification-icon">${esc(options.icon || '🍅')}</div>
          <h2 class="notification-title">${esc(title)}</h2>
          <p class="notification-message">${esc(message)}</p>
          <button class="notification-button" onclick="this.closest('.notification-overlay').parentElement.remove()">
            ${esc(options.buttonText || t('ui.okBtn'))}
          </button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #kairos-notification-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999999;
      }

      .notification-overlay {
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
      }

      .notification-content {
        background: white;
        border-radius: 24px;
        padding: 48px;
        max-width: 480px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .notification-icon {
        font-size: 72px;
        margin-bottom: 24px;
        animation: bounce 0.6s ease;
      }

      .notification-title {
        font-size: 32px;
        font-weight: 700;
        color: #292524;
        margin: 0 0 16px 0;
      }

      .notification-message {
        font-size: 18px;
        color: #78716C;
        margin: 0 0 32px 0;
        line-height: 1.6;
      }

      .notification-button {
        background: #57534E;
        color: white;
        border: none;
        border-radius: 12px;
        padding: 16px 48px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .notification-button:hover {
        background: #44403C;
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      .notification-button:active {
        transform: translateY(0);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(60px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
    `;

    modal.appendChild(style);
    document.body.appendChild(modal);

    if (options.autoClose) {
      setTimeout(() => {
        modal.remove();
      }, options.autoClose);
    }

    return modal;
  }

  flashTitle(message, duration = 10000) {

    this.stopFlashTitle();

    let isOriginal = true;
    this.titleInterval = setInterval(() => {
      document.title = isOriginal ? message : this.originalTitle;
      isOriginal = !isOriginal;
    }, 1000);

    setTimeout(() => {
      this.stopFlashTitle();
    }, duration);

  }

  stopFlashTitle() {
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
      document.title = this.originalTitle;
    }
  }

  notify(title, message, options = {}) {

    this.playSound();

    const modal = this.showModal(title, message, options);

    this.flashTitle(`🔔 ${title}`);

    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('notification-button') ||
          e.target.classList.contains('notification-overlay')) {
        this.stopFlashTitle();
      }
    });

    return modal;
  }

  notifyPomodoroComplete() {
    return this.notify(
      t('altNotify.pomodoroTitle'),
      t('altNotify.pomodoroMsg'),
      {
        icon: '🍅',
        buttonText: t('altNotify.pomodoroBtn')
      }
    );
  }

  notifyBreakComplete() {
    return this.notify(
      t('altNotify.breakTitle'),
      t('altNotify.breakMsg'),
      {
        icon: '⚡',
        buttonText: t('altNotify.breakBtn')
      }
    );
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }
}

const alternativeNotifications = new AlternativeNotifications();

export default alternativeNotifications;
export { AlternativeNotifications };
