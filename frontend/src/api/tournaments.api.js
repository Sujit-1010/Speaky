import { get, post, request } from './client';

export const tournaments = {
  async register(args) {
    const a = args || {};
    const { tournamentId, user_id, user_name, user_email, group_number, accepted_rules } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    return post(`/api/tournaments/${tournamentId}/register`, { user_id, user_name, user_email, group_number, accepted_rules });
  },
  async createOrganiserLink(args) {
    const a = args || {};
    const { tournamentId, organiser_email, organiser_name, expires_in_hours } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    return post(`/api/tournaments/${tournamentId}/organiser-link`, { organiser_email, organiser_name, expires_in_hours });
  },
  async validateAccess(args) {
    const a = args || {};
    const { tournamentId, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const params = new URLSearchParams();
    if (accessToken) params.set('accessToken', accessToken);
    return get(`/api/tournaments/${tournamentId}/validate-access${params.toString() ? `?${params.toString()}` : ''}`);
  },
  async validateOrganiserSession(tournamentId) {
    if (!tournamentId) throw new Error('Missing tournamentId');
    return get(`/api/tournaments/${tournamentId}/validate-organiser`);
  },
  async inviteJudge(args) {
    const a = args || {};
    const { tournamentId, email, name, host_email, expires_in_hours, frontendUrl, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const headers = {};
    if (accessToken) headers['x-access-token'] = accessToken;
    return post(`/api/tournaments/${tournamentId}/invite-judge`, { email, name, expires_in_hours, frontendUrl }, headers);
  },
  async sendTimeSlot(args) {
    const a = args || {};
    const { tournamentId, registration_id, user_email, group_number, room_code, time_slot, host_email, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const headers = {};
    if (accessToken) headers['x-access-token'] = accessToken;
    return post(`/api/tournaments/${tournamentId}/send-time-slot`, { registration_id, user_email, group_number, room_code, time_slot }, headers);
  },
  async start(args) {
    const a = args || {};
    const { tournamentId, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const headers = {};
    if (accessToken) headers['x-access-token'] = accessToken;
    return post(`/api/tournaments/${tournamentId}/start`, {}, headers);
  },
  async restart(args) {
    const a = args || {};
    const { tournamentId, accessToken } = a;
    if (!tournamentId) throw new Error('Missing tournamentId');
    const headers = {};
    if (accessToken) headers['x-access-token'] = accessToken;
    return post(`/api/tournaments/${tournamentId}/restart`, {}, headers);
  },
  async getPanelData({ tournamentId, accessToken }) {
    if (!tournamentId) throw new Error('Missing tournamentId');
    if (!accessToken) throw new Error('Missing accessToken');
    const params = new URLSearchParams();
    params.set('token', accessToken);
    return get(`/api/tournaments/${tournamentId}/panel-data?${params.toString()}`);
  },
};

export const tournamentRegistrations = {
  async hostUpdate(tournamentId, regId, patch) {
    if (!tournamentId || !regId) throw new Error('Missing ids');
    return request('PATCH', `/api/tournaments/${tournamentId}/registrations/${regId}`, patch);
  },
};
