import { t } from './i18n.js';

export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${type === 'error' ? '#DC2626' : type === 'success' ? '#15803D' : '#57534E'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10001;
    font-family: Inter, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createModalOverlay(content) {
  const overlay = document.createElement('div');
  overlay.className = 'modal kairos-modal active';
  overlay.style.zIndex = '10000';
  overlay.innerHTML = `<div class="modal-content" style="max-width: 400px;">${content}</div>`;
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * 确认对话框（替代 confirm()）
 * 返回 Promise<boolean>
 */
export function showConfirm(message, { title = t('ui.confirm'), confirmText = t('ui.confirmBtn'), cancelText = t('ui.cancelBtn') } = {}) {
  return new Promise(resolve => {
    const overlay = createModalOverlay(`
      <div class="modal-header">
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="modal-body">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="modal-actions">
        <button class="modal-button-secondary" data-role="cancel">${escapeHtml(cancelText)}</button>
        <button class="modal-button-primary" data-role="confirm">${escapeHtml(confirmText)}</button>
      </div>
    `);

    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    overlay.querySelector('[data-role="confirm"]').addEventListener('click', () => close(true));
    overlay.querySelector('[data-role="cancel"]').addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);

    overlay.querySelector('[data-role="confirm"]').focus();
  });
}

/**
 * 提示对话框（替代 alert()）
 * 返回 Promise<void>
 */
export function showAlert(message, { title = t('ui.alert') } = {}) {
  return new Promise(resolve => {
    const overlay = createModalOverlay(`
      <div class="modal-header">
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="modal-body">
        <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
      </div>
      <div class="modal-actions">
        <button class="modal-button-primary" data-role="ok">${escapeHtml(t('ui.okBtn'))}</button>
      </div>
    `);

    const close = () => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
      resolve();
    };

    overlay.querySelector('[data-role="ok"]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
    document.addEventListener('keydown', onKey);

    overlay.querySelector('[data-role="ok"]').focus();
  });
}

/**
 * HTML 转义（防止 XSS）
 */
export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTime(dateString) {
  return `${formatDate(dateString)} ${formatTime(dateString)}`;
}

export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return t('ui.justNow');
  } else if (diffMinutes < 60) {
    return t('ui.minutesAgo', { n: diffMinutes });
  } else if (diffMinutes < 1440) {
    return t('ui.hoursAgo', { n: Math.floor(diffMinutes / 60) });
  } else if (diffMinutes < 10080) {
    return t('ui.daysAgo', { n: Math.floor(diffMinutes / 1440) });
  } else {
    return formatDate(dateString);
  }
}

export const PRIORITY_META = {
  'urgent-important': { label: '紧急重要', className: 'priority-urgent-important' },
  'not-urgent-important': { label: '重要不紧急', className: 'priority-not-urgent-important' },
  'urgent-not-important': { label: '紧急不重要', className: 'priority-urgent-not-important' },
  'not-urgent-not-important': { label: '不重要不紧急', className: 'priority-not-urgent-not-important' },
  default: { label: '未设置', className: 'priority-unknown' }
};

export const STATUS_META = {
  todo: { label: '待办', className: 'status-todo' },
  doing: { label: '进行中', className: 'status-doing' },
  review: { label: '评审', className: 'status-review' },
  done: { label: '已完成', className: 'status-done' }
};

export const ACTIVITY_TYPE_LABELS = {
  start: '开始专注',
  pause: '暂停专注',
  complete: '完成任务',
  update: '状态更新',
  comment: '添加备注',
  create: '创建任务',
  delete: '删除任务',
  create_board: '创建看板',
  update_board: '更新看板',
  delete_board: '删除看板',
  data_export: '导出数据',
  data_import: '导入数据'
};

export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((cb) => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach((callback) => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`[EventEmitter] Error in ${event} handler:`, err);
      }
    });
  }
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 可撤销 Toast — 带倒计时进度条和撤销按钮
 * @param {string} message 提示文本
 * @param {Function} onUndo 点击撤销时的回调
 * @param {number} duration 持续毫秒数
 * @returns {{ cancel: Function }} 可手动取消
 */
export function showUndoToast(message, onUndo, duration = 5000) {
  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.innerHTML = `
    <span class="undo-toast-msg">${escapeHtml(message)}</span>
    <button class="undo-toast-btn">${t('ui.undo')}</button>
    <div class="undo-toast-progress"><div class="undo-toast-bar"></div></div>
  `;
  document.body.appendChild(toast);

  const bar = toast.querySelector('.undo-toast-bar');
  requestAnimationFrame(() => {
    bar.style.transition = `width ${duration}ms linear`;
    bar.style.width = '0%';
  });

  let settled = false;
  const dismiss = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  };

  const timer = setTimeout(() => dismiss(), duration);

  toast.querySelector('.undo-toast-btn').addEventListener('click', () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    toast.remove();
    onUndo();
  });

  return { cancel: dismiss };
}

export default {
  showToast,
  showConfirm,
  showAlert,
  showUndoToast,
  escapeHtml,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  PRIORITY_META,
  STATUS_META,
  ACTIVITY_TYPE_LABELS,
  EventEmitter,
  debounce,
  throttle
};
