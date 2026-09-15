import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ai } from '../../web/js/ai.js';

test('AI without a user key stays disabled and sends no request', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousFetch = globalThis.fetch;
  let requests = 0;
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
    globalThis.fetch = async () => { requests++; throw new Error('Unexpected request'); };
    assert.deepEqual(ai.getStatus(), { enabled: false, mode: 'none' });
    await assert.rejects(ai.chat([]), /API Key/);
    assert.equal(requests, 0);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
    globalThis.fetch = previousFetch;
  }
});
