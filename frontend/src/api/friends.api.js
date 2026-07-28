import { post } from './client';

export const friendRequests = {
  async accept(id) {
    if (!id) throw new Error('Missing friend request id');
    return post(`/api/friend-requests/${id}/accept`, {});
  },
  async reject(id) {
    if (!id) throw new Error('Missing friend request id');
    return post(`/api/friend-requests/${id}/reject`, {});
  },
};
