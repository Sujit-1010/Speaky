import { get, post } from './client';

export const push = {
  async subscribe(args) {
    const a = /** @type {any} */ (args || {});
    return post('/api/push/subscribe', { token: a.token, platform: a.platform || 'web', user_agent: a.user_agent });
  },
  async unsubscribe(args) {
    const a = /** @type {any} */ (args || {});
    return post('/api/push/unsubscribe', { token: a.token });
  },
  async status() {
    return get('/api/push/status');
  },
  async test(args) {
    const a = /** @type {any} */ (args || {});
    return post('/api/push/test', { title: a.title, body: a.body, url: a.url });
  },
};
