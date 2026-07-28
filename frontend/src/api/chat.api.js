import { request, del } from './client';

export const chatMessages = {
  async markRead(id) {
    if (!id) throw new Error('Missing message id');
    return request('PATCH', `/api/chat-messages/${id}/read`, {});
  },
  async deleteMessage(id) {
    if (!id) throw new Error('Missing message id');
    return del(`/api/chat-messages/${id}/party-delete`);
  },
};
