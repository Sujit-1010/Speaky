import { post, del } from './client';

export const rooms = {
  gd: {
    async start(id, args) {
      const a = args || {};
      const headers = {};
      if (a.accessToken) headers['x-access-token'] = a.accessToken;
      return post(`/api/gd-rooms/${id}/start`, {}, headers);
    },
    async stop(id, args) {
      const a = args || {};
      const headers = {};
      if (a.accessToken) headers['x-access-token'] = a.accessToken;
      return post(`/api/gd-rooms/${id}/stop`, {}, headers);
    },
    async restart(id, args) {
      const a = args || {};
      const headers = {};
      if (a.accessToken) headers['x-access-token'] = a.accessToken;
      return post(`/api/gd-rooms/${id}/restart`, {}, headers);
    },
    async forceClose(id, args) {
      const a = args || {};
      const headers = {};
      if (a.accessToken) headers['x-access-token'] = a.accessToken;
      return post(`/api/gd-rooms/${id}/force-close`, {}, headers);
    },
  },
};

export const gdParticipant = {
  async join(roomId, args) {
    const a = args || {};
    return post(`/api/gd-rooms/${roomId}/participant`, { user_name: a.user_name });
  },
  async leave(roomId) {
    return del(`/api/gd-rooms/${roomId}/participant`);
  },
};

export const aiInterviewParticipant = {
  async join(roomId, args) {
    const a = args || {};
    return post(`/api/ai-interviews/${roomId}/join`, { user_name: a.user_name });
  },
};
