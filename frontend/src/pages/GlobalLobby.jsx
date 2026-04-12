import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Mic, Users, Clock, MessageSquare } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/apiClient';
import { createPageUrl } from '../utils';

// Global GD lobby only (auto-matching). Custom / tournament modes use other lobby components.
// TEAM_SIZE is fixed for global GD; used to determine when to auto-start the call.
const TEAM_SIZE = 3;

export default function GlobalLobby() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const initialTopic = location.state?.topic;
  const initialTeamSize = location.state?.teamSize || 3;
  const initialParticipants = location.state?.participants || [];

  const [topic, setTopic] = useState(initialTopic || 'Group discussion topic');
  const [teamSize, setTeamSize] = useState(initialTeamSize);
  const [participants, setParticipants] = useState(initialParticipants);
  const [joinedCount, setJoinedCount] = useState(initialParticipants.length || null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(null); // Countdown for auto-start in global mode

  useEffect(() => {
    // Best-effort fetch: if we lost state (e.g. refresh), try to recover topic & team size
    const load = async () => {
      try {
        if (!user) return;
        const userId = user.email || user.id;
        const resp = await api.globalGd.status({ userId });
        if (!resp || resp.status !== 'matched') return;

        if (!initialTopic && resp.topic) setTopic(resp.topic);
        const size = resp.teamSize || resp.groupSize;
        if (!initialTeamSize && size) setTeamSize(size);
        setParticipants(resp.participants || []);
        setJoinedCount((resp.participants || []).length || size || null);
      } catch (e) {
        // Silent failure is fine here; we can still show a basic lobby
        console.error('Failed to refresh global lobby info', e);
      }
    };

    load();
  }, [user, initialTopic, initialTeamSize]);

  // When all participants are present in the lobby, start a shared 10 second countdown.
  useEffect(() => {
    const currentJoined = (participants && participants.length) || 0;

    // Start countdown once we have TEAM_SIZE participants and it hasn't started yet
    if (currentJoined >= TEAM_SIZE && secondsLeft === null) {
      setSecondsLeft(10);
    }

    // If someone leaves before the countdown finishes, reset the timer
    if (currentJoined < TEAM_SIZE && secondsLeft !== null) {
      setSecondsLeft(null);
    }
  }, [participants, secondsLeft]);

  // Drive the countdown timer and automatically redirect everyone to the Zego call page.
  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft <= 0) {
      // NOTE: Global GD uses the existing /call route with a roomId query param.
      // We also pass mode/topic via state for future customisation.
      const url = createPageUrl('Call', { roomId });
      navigate(url, { state: { topic, mode: 'global' } });
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => (prev === null ? prev : prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, navigate, roomId, topic]);

  const handleLeaveRoom = async () => {
    if (!roomId) {
      navigate(createPageUrl('GDArena'));
      return;
    }

    try {
      const userId = user && (user.email || user.id);
      if (userId) {
        await api.globalGd.leaveRoom({ userId, roomId });
      }
    } catch (e) {
      console.error('Failed to leave global GD room', e);
    } finally {
      navigate(createPageUrl('GDArena'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Reuse top navigation but hide footer via AppFooter logic */}
      <TopNav activePage="Explore" />

      <div className="max-w-5xl mx-auto px-6 py-8 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold mb-2 gradient-text">Lobby</h1>
          <p className="text-gray-600 text-lg">Waiting for participants to join…</p>
        </motion.div>

        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Leave room
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Room Info */}
          <ClayCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Room Details</h2>
                <p className="text-xs text-gray-500">Room ID: {roomId}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="clay-card p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-gray-600">Team Size</p>
                <p className="text-xl font-bold">{teamSize}</p>
              </div>
              <div className="clay-card p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-xl font-bold">10–15 min</p>
              </div>
              <div className="clay-card p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-gray-600">Joined</p>
                <p className="text-xl font-bold">{joinedCount ?? '—'}</p>
              </div>
            </div>

            <div className="clay-card p-4 bg-gradient-to-r from-purple-50 to-blue-50">
              <p className="text-sm text-gray-600 mb-1">Topic</p>
              <p className="text-lg font-bold">{topic}</p>
            </div>
          </ClayCard>

          {/* Side panel placeholder (optional future content) */}
          <ClayCard className="bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-1">Get ready</h3>
              <p className="text-sm text-gray-600 mb-4">
                Check your mic and camera settings while others join.
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The call will start once you&apos;re ready. You&apos;ll all join the same Zego room for the GD.
            </p>
          </ClayCard>
        </div>

        {/* Participants & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClayCard>
            <h3 className="text-xl font-bold mb-4">Participants</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(participants || []).map((p, idx) => {
                const displayName = p.name || 'Participant';
                const initial = displayName?.charAt(0) || 'U';

                return (
                  <div key={p.userId || idx} className="clay-card p-4 text-center relative">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                      {initial}
                    </div>
                    <p className="font-semibold text-sm">{displayName}</p>
                  </div>
                );
              })}

              {/* Waiting slots */}
              {Array.from({ length: Math.max(0, teamSize - (participants?.length || 0)) }).map((_, idx) => (
                <div key={`empty-${idx}`} className="clay-card p-4 text-center bg-gray-50">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">Waiting…</p>
                </div>
              ))}
            </div>
          </ClayCard>

          <ClayCard>
            <h3 className="font-bold mb-4">Audio &amp; Video</h3>
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                  cameraOn
                    ? 'bg-gradient-to-r from-green-400 to-teal-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Camera className="w-6 h-6 mx-auto mb-1" />
                Camera {cameraOn ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => setMicOn(!micOn)}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                  micOn
                    ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Mic className="w-6 h-6 mx-auto mb-1" />
                Mic {micOn ? 'On' : 'Off'}
              </button>
            </div>
            {/* Global GD mode: no manual Start Call. Show countdown or waiting message instead. */}
            {((participants && participants.length) || 0) < TEAM_SIZE && (
              <p className="text-center text-sm text-gray-600 mt-3">
                Waiting for participants to join…
              </p>
            )}
            {((participants && participants.length) || 0) >= TEAM_SIZE && (
              <p className="text-center text-sm text-gray-700 mt-3 font-semibold">
                {secondsLeft !== null && secondsLeft > 0
                  ? `All participants joined. Starting call in ${secondsLeft} seconds…`
                  : 'All participants joined. Starting call…'}
              </p>
            )}
          </ClayCard>
        </div>
      </div>
    </div>
  );
}
