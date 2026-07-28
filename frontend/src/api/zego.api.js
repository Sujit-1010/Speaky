import { post } from './client';

export const zego = {
  async getRoomToken({ roomId, user_id, user_name, canPublish = true }) {
    return post('/api/zego/token', { roomId, user_id, user_name, canPublish });
  },
};
