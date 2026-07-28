import { get, post } from './client';

export const globalGd = {
  async join({ userId, name }) {
    return post('/api/global-gd/join', { userId, name });
  },
  async status({ userId }) {
    const params = new URLSearchParams();
    params.set('userId', String(userId));
    return get(`/api/global-gd/status?${params.toString()}`);
  },
  async leave({ userId }) {
    return post('/api/global-gd/leave', { userId });
  },
  async leaveRoom({ userId, roomId }) {
    return post('/api/global-gd/leave-room', { userId, roomId });
  },
};
