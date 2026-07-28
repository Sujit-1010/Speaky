import { API_BASE_URL, entities } from './client';
import { auth, ensureGuest } from './auth.api';
import { tournaments, tournamentRegistrations } from './tournaments.api';
import { rooms, gdParticipant, aiInterviewParticipant } from './rooms.api';
import { analysis, interviewAnalysis, extemporeAnalysis } from './analysis.api';
import { friendRequests } from './friends.api';
import { chatMessages } from './chat.api';
import { globalGd } from './globalGd.api';
import { push } from './push.api';
import { zego } from './zego.api';
import { appLogs, integrations } from './appLogs.api';

const api = {
  auth,
  entities,
  appLogs,
  integrations,
  zego,
  push,
  globalGd,
  analysis,
  tournaments,
  rooms,
  interviewAnalysis,
  extemporeAnalysis,
  friendRequests,
  chatMessages,
  gdParticipant,
  aiInterviewParticipant,
  tournamentRegistrations,
};

export { API_BASE_URL, api, ensureGuest };
