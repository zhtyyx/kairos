const KEY_STORAGE = 'kairos-ai-key';
const BASE_URL_STORAGE = 'kairos-ai-base-url';
const MODEL_STORAGE = 'kairos-ai-model';

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';

export const ai = {

  getLocalKey() {
    return localStorage.getItem(KEY_STORAGE) || '';
  },

  setLocalKey(key) {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  },

  getLocalBaseUrl() {
    return localStorage.getItem(BASE_URL_STORAGE) || DEFAULT_BASE_URL;
  },

  setLocalBaseUrl(url) {
    if (url) localStorage.setItem(BASE_URL_STORAGE, url);
    else localStorage.removeItem(BASE_URL_STORAGE);
  },

  getLocalModel() {
    return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
  },

  setLocalModel(model) {
    if (model) localStorage.setItem(MODEL_STORAGE, model);
    else localStorage.removeItem(MODEL_STORAGE);
  },

  getConfig() {
    return {
      ai_mode: this.getLocalKey() ? 'own_key' : 'none',
      base_url: this.getLocalBaseUrl(),
      model: this.getLocalModel(),
      has_key: !!this.getLocalKey(),
    };
  },

  saveConfig({ base_url, model, api_key }) {
    if (api_key != null) this.setLocalKey(api_key);
    if (base_url != null) this.setLocalBaseUrl(base_url);
    if (model != null) this.setLocalModel(model);
  },

  FREE_ADD_LIMIT: 3,

  _todayKey() {
    return 'kairos-ai-adds-' + new Date().toISOString().slice(0, 10);
  },

  getAddCount() {
    return parseInt(localStorage.getItem(this._todayKey()) || '0', 10);
  },

  incrementAddCount(n = 1) {
    const count = this.getAddCount() + n;
    localStorage.setItem(this._todayKey(), String(count));
    return count;
  },

  canAddTask() {
    if (this.getLocalKey()) return true;
    return this.getAddCount() < this.FREE_ADD_LIMIT;
  },

  remainingAdds() {
    if (this.getLocalKey()) return Infinity;
    return Math.max(0, this.FREE_ADD_LIMIT - this.getAddCount());
  },

  getStatus() {
    if (this.getLocalKey()) return { enabled: true, mode: 'own_key' };
    return { enabled: false, mode: 'none' };
  },

  async chat(messages, opts = {}) {
    if (this.getLocalKey()) {
      return this._chatOwnKey(messages, opts);
    }
    throw new Error('请先在设置中配置自己的 AI API Key。');
  },

  async _chatOwnKey(messages, opts) {
    const apiKey = this.getLocalKey();
    let baseUrl = this.getLocalBaseUrl().replace(/\/+$/, '');
    const model = opts.model || this.getLocalModel();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          ...(opts.temperature != null && { temperature: opts.temperature }),
          ...(opts.max_tokens && { max_tokens: opts.max_tokens }),
        })
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('AI request timed out (30s)');
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      if (res.status === 429) throw new Error('ai_rate_limited');
      if (res.status === 401 || res.status === 403) throw new Error('ai_auth_failed');
      throw new Error('ai_provider_error');
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
    };
  }
};
